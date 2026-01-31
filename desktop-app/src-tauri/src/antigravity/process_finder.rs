// ProcessFinder: Detects Antigravity Language Server process across platforms
// Ported from Antigravity Toolkit (TypeScript → Rust)

use std::process::Command;
use std::time::Duration;
use tokio::time::sleep;
use crate::antigravity::types::*;

pub struct ProcessFinder {
    process_name: String,
    platform: String,
    
    // Diagnostic fields
    pub failure_reason: Option<FailureReason>,
    pub candidate_count: usize,
    pub attempt_details: Vec<CommunicationAttempt>,
    pub token_preview: String,
    pub ports_from_cmdline: usize,
    pub ports_from_netstat: usize,
    pub retry_count: u32,
    pub protocol_used: String,
}

impl ProcessFinder {
    pub fn new() -> Self {
        let platform = std::env::consts::OS.to_string();
        let arch = std::env::consts::ARCH;
        
        let process_name = match platform.as_str() {
            "windows" => "language_server_windows_x64.exe".to_string(),
            "macos" => format!("language_server_macos{}", if arch == "aarch64" { "_arm" } else { "" }),
            "linux" => format!("language_server_linux{}", if arch == "aarch64" { "_arm" } else { "_x64" }),
            _ => "language_server".to_string(),
        };
        
        Self {
            process_name,
            platform,
            failure_reason: None,
            candidate_count: 0,
            attempt_details: Vec::new(),
            token_preview: String::new(),
            ports_from_cmdline: 0,
            ports_from_netstat: 0,
            retry_count: 0,
            protocol_used: "none".to_string(),
        }
    }
    
    pub fn get_process_name(&self) -> &str {
        &self.process_name
    }
    
    /// Detect Antigravity Language Server with exponential backoff retry
    pub async fn detect(&mut self, options: DetectOptions) -> Result<LanguageServerInfo, String> {
        let mut last_error = String::from("No server found");
        
        for attempt in 0..options.attempts {
            self.retry_count = attempt;
            
            match self.try_detect().await {
                Ok(info) => return Ok(info),
                Err(e) => {
                    last_error = e.clone();
                    if options.verbose {
                        eprintln!("ProcessFinder: Attempt {} failed: {}", attempt + 1, e);
                    }
                    
                    // Exponential backoff delay
                    if attempt < options.attempts - 1 {
                        let delay = options.base_delay * 2_u64.pow(attempt);
                        let delay = delay.min(10000); // Max 10s
                        if options.verbose {
                            eprintln!("Retrying in {}ms...", delay);
                        }
                        sleep(Duration::from_millis(delay)).await;
                    }
                }
            }
        }
        
        Err(last_error)
    }
    
    /// Single detection attempt without retry
    async fn try_detect(&mut self) -> Result<LanguageServerInfo, String> {
        // Reset diagnostic fields
        self.failure_reason = None;
        self.candidate_count = 0;
        self.attempt_details.clear();
        self.token_preview.clear();
        self.ports_from_cmdline = 0;
        self.ports_from_netstat = 0;
        self.protocol_used = "none".to_string();
        
        // Step 1: Get process list
        let candidates = self.get_process_candidates()?;
        
        if candidates.is_empty() {
            self.failure_reason = Some(FailureReason::NoProcess);
            return Err("No process found".to_string());
        }
        
        self.candidate_count = candidates.len();
        
        // Step 2: Select best candidate
        let best_candidate = self.select_best_candidate(candidates).await?;
        
        // Step 3: Get listening ports
        let mut ports = self.get_listening_ports(best_candidate.pid)?;
        self.ports_from_netstat = ports.len();
        
        // Store token preview (first 8 chars)
        self.token_preview = best_candidate.csrf_token.chars().take(8).collect();
        
        // Add cmdline port if not in netstat results
        if let Some(ext_port) = best_candidate.extension_port {
            if !ports.contains(&ext_port) {
                ports.insert(0, ext_port);
                self.ports_from_cmdline = 1;
            }
        }
        
        // Step 4: Find working port
        let working_port = self.find_working_port(best_candidate.pid, &ports, &best_candidate.csrf_token).await?;
        
        Ok(LanguageServerInfo {
            port: working_port,
            csrf_token: best_candidate.csrf_token,
        })
    }
    
    /// Get all candidate processes matching the server name
    fn get_process_candidates(&self) -> Result<Vec<ProcessInfo>, String> {
        match self.platform.as_str() {
            "windows" => self.get_windows_processes(),
            "macos" | "linux" => self.get_unix_processes(),
            _ => Err("Unsupported platform".to_string()),
        }
    }
    
    /// Get processes on Windows using tasklist and wmic
    fn get_windows_processes(&self) -> Result<Vec<ProcessInfo>, String> {
        // Use tasklist to find PIDs
        let output = Command::new("tasklist")
            .args(&["/FI", &format!("IMAGENAME eq {}", self.process_name), "/FO", "CSV", "/NH"])
            .output()
            .map_err(|e| format!("Failed to run tasklist: {}", e))?;
        
        let stdout = String::from_utf8_lossy(&output.stdout);
        let mut candidates = Vec::new();
        
        for line in stdout.lines() {
            let parts: Vec<&str> = line.split(',').map(|s| s.trim_matches('"')).collect();
            if parts.len() >= 2 {
                if let Ok(pid) = parts[1].parse::<u32>() {
                    // Get command line to extract CSRF token and port
                    if let Ok(info) = self.get_windows_process_info(pid) {
                        candidates.push(info);
                    }
                }
            }
        }
        
        Ok(candidates)
    }
    
    /// Get detailed info for a Windows process using PowerShell
    fn get_windows_process_info(&self, pid: u32) -> Result<ProcessInfo, String> {
        // Use PowerShell Get-CimInstance instead of deprecated wmic
        let ps_script = format!(
            "Get-CimInstance -ClassName Win32_Process -Filter 'ProcessId={}' | Select-Object ProcessId, ParentProcessId, CommandLine | ConvertTo-Csv -NoTypeInformation",
            pid
        );
        
        let output = Command::new("powershell")
            .args(&["-NoProfile", "-Command", &ps_script])
            .output()
            .map_err(|e| format!("Failed to run PowerShell: {}", e))?;
        
        let stdout = String::from_utf8_lossy(&output.stdout);
        let lines: Vec<&str> = stdout.lines().collect();
        
        // Skip header, get data line
        if lines.len() < 2 {
            return Err("No PowerShell data".to_string());
        }
        
        let data_line = lines[1];
        // CSV format: "ProcessId","ParentProcessId","CommandLine"
        let parts: Vec<&str> = data_line.split(',').collect();
        
        if parts.len() < 3 {
            return Err("Invalid PowerShell CSV format".to_string());
        }
        
        // Parse PPID (second column)
        let ppid = parts[1].trim_matches('"').trim().parse::<u32>().ok();
        
        // CommandLine is third column (may contain commas, so join remaining parts)
        let cmdline = parts[2..].join(",").trim_matches('"').to_string();
        
        // Extract CSRF token from command line (--csrf_token TOKEN)
        let csrf_token = self.extract_csrf_token(&cmdline)?;
        let extension_port = self.extract_port(&cmdline);
        
        Ok(ProcessInfo {
            pid,
            ppid,
            csrf_token,
            extension_port,
        })
    }
    
    /// Get processes on Unix (macOS/Linux) using ps
    fn get_unix_processes(&self) -> Result<Vec<ProcessInfo>, String> {
        let output = Command::new("ps")
            .args(&["aux"])
            .output()
            .map_err(|e| format!("Failed to run ps: {}", e))?;
        
        let stdout = String::from_utf8_lossy(&output.stdout);
        let mut candidates = Vec::new();
        
        for line in stdout.lines() {
            if line.contains(&self.process_name) {
                if let Ok(info) = self.parse_unix_process_line(line) {
                    candidates.push(info);
                }
            }
        }
        
        Ok(candidates)
    }
    
    /// Parse a Unix ps output line
    fn parse_unix_process_line(&self, line: &str) -> Result<ProcessInfo, String> {
        let parts: Vec<&str> = line.split_whitespace().collect();
        if parts.len() < 11 {
            return Err("Invalid ps format".to_string());
        }
        
        let pid = parts[1].parse::<u32>().map_err(|_| "Invalid PID")?;
        
        // Command is from index 10 onwards
        let cmdline = parts[10..].join(" ");
        
        // Get PPID using separate ps command
        let ppid = self.get_parent_pid_unix(pid).ok();
        
        let csrf_token = self.extract_csrf_token(&cmdline)?;
        let extension_port = self.extract_port(&cmdline);
        
        Ok(ProcessInfo {
            pid,
            ppid,
            csrf_token,
            extension_port,
        })
    }
    
    /// Extract CSRF token from command line
    fn extract_csrf_token(&self, cmdline: &str) -> Result<String, String> {
        // Look for --csrf_token TOKEN or --csrf_token=TOKEN pattern
        let parts: Vec<&str> = cmdline.split_whitespace().collect();
        for (i, part) in parts.iter().enumerate() {
            // Handle --csrf_token=TOKEN format
            if part.starts_with("--csrf_token=") {
                return Ok(part.trim_start_matches("--csrf_token=").to_string());
            }
            // Handle --csrf_token TOKEN format (space delimiter)
            if *part == "--csrf_token" && i + 1 < parts.len() {
                return Ok(parts[i + 1].to_string());
            }
        }
        Err("No CSRF token found".to_string())
    }
    
    /// Extract port from command line (--extension_server_port PORT or --extension_server_port=PORT)
    fn extract_port(&self, cmdline: &str) -> Option<u16> {
        let parts: Vec<&str> = cmdline.split_whitespace().collect();
        for (i, part) in parts.iter().enumerate() {
            // Handle --extension_server_port=PORT format
            if part.starts_with("--extension_server_port=") {
                if let Ok(port) = part.trim_start_matches("--extension_server_port=").parse::<u16>() {
                    return Some(port);
                }
            }
            // Handle --extension_server_port PORT format (space delimiter)
            if *part == "--extension_server_port" && i + 1 < parts.len() {
                if let Ok(port) = parts[i + 1].parse::<u16>() {
                    return Some(port);
                }
            }
            // Also check legacy --port= format
            if part.starts_with("--port=") {
                if let Ok(port) = part.trim_start_matches("--port=").parse::<u16>() {
                    return Some(port);
                }
            }
        }
        None
    }
    
    /// Get parent PID on Unix
    fn get_parent_pid_unix(&self, pid: u32) -> Result<u32, String> {
        let output = Command::new("ps")
            .args(&["-o", "ppid=", "-p", &pid.to_string()])
            .output()
            .map_err(|e| format!("Failed to get PPID: {}", e))?;
        
        let stdout = String::from_utf8_lossy(&output.stdout);
        stdout.trim().parse::<u32>().map_err(|_| "Invalid PPID".to_string())
    }
    
    /// Select best candidate from multiple processes
    async fn select_best_candidate(&mut self, mut candidates: Vec<ProcessInfo>) -> Result<ProcessInfo, String> {
        if candidates.len() == 1 {
            return Ok(candidates.remove(0));
        }
        
        // Try to match by process ancestry (sibling or nephew)
        let my_ppid = std::process::id();
        
        // Try sibling (same parent)
        for candidate in &candidates {
            if let Some(ppid) = candidate.ppid {
                if ppid == my_ppid {
                    return Ok(candidate.clone());
                }
            }
        }
        
        // Try nephew (server's grandparent == my parent)
        // This logic is complex, simplified for now
        
        // Fallback: ambiguous
        self.failure_reason = Some(FailureReason::Ambiguous);
        Err("Multiple servers found, cannot determine which one".to_string())
    }
    
    /// Get listening ports for a process
    fn get_listening_ports(&self, pid: u32) -> Result<Vec<u16>, String> {
        match self.platform.as_str() {
            "windows" => self.get_windows_ports(pid),
            "macos" | "linux" => self.get_unix_ports(pid),
            _ => Ok(Vec::new()),
        }
    }
    
    /// Get listening ports on Windows using netstat
    fn get_windows_ports(&self, pid: u32) -> Result<Vec<u16>, String> {
        let output = Command::new("netstat")
            .args(&["-ano"])
            .output()
            .map_err(|e| format!("Failed to run netstat: {}", e))?;
        
        let stdout = String::from_utf8_lossy(&output.stdout);
        let mut ports = Vec::new();
        
        for line in stdout.lines() {
            if line.contains(&pid.to_string()) && line.contains("LISTENING") {
                let parts: Vec<&str> = line.split_whitespace().collect();
                if parts.len() >= 2 {
                    // Extract port from "127.0.0.1:PORT" or "[::]:PORT"
                    if let Some(port_str) = parts[1].rsplit(':').next() {
                        if let Ok(port) = port_str.parse::<u16>() {
                            if !ports.contains(&port) {
                                ports.push(port);
                            }
                        }
                    }
                }
            }
        }
        
        Ok(ports)
    }
    
    /// Get listening ports on Unix using lsof or netstat
    fn get_unix_ports(&self, pid: u32) -> Result<Vec<u16>, String> {
        // Try lsof first (more reliable)
        let result = Command::new("lsof")
            .args(&["-iTCP", "-sTCP:LISTEN", "-n", "-P", "-p", &pid.to_string()])
            .output();
        
        if let Ok(output) = result {
            let stdout = String::from_utf8_lossy(&output.stdout);
            let mut ports = Vec::new();
            
            for line in stdout.lines().skip(1) { // Skip header
                let parts: Vec<&str> = line.split_whitespace().collect();
                if parts.len() >= 9 {
                    // Port is in parts[8], format: *:PORT or 127.0.0.1:PORT
                    if let Some(port_str) = parts[8].rsplit(':').next() {
                        if let Ok(port) = port_str.parse::<u16>() {
                            if !ports.contains(&port) {
                                ports.push(port);
                            }
                        }
                    }
                }
            }
            
            return Ok(ports);
        }
        
        // Fallback to netstat if lsof not available
        Ok(Vec::new())
    }
    
    /// Find working port by testing each one
    async fn find_working_port(&mut self, pid: u32, ports: &[u16], csrf_token: &str) -> Result<u16, String> {
        for &port in ports {
            let test_result = self.test_port(port, csrf_token).await;
            
            let attempt = CommunicationAttempt {
                pid,
                port,
                status_code: test_result.status_code,
                error: test_result.error.clone(),
                protocol: test_result.protocol.clone(),
                port_source: if self.ports_from_cmdline > 0 && port == ports[0] {
                    "cmdline".to_string()
                } else {
                    "netstat".to_string()
                },
            };
            
            self.attempt_details.push(attempt);
            
            if test_result.success {
                self.protocol_used = test_result.protocol;
                return Ok(port);
            }
        }
        
        // Check if auth failure
        let has_auth_failure = self.attempt_details.iter().any(|a| {
            if let Some(code) = a.status_code {
                code == 401 || code == 403
            } else {
                false
            }
        });
        
        self.failure_reason = Some(if has_auth_failure {
            FailureReason::AuthFailed
        } else {
            FailureReason::NoPort
        });
        
        Err("No working port found".to_string())
    }
    
    /// Test if port is accessible (HTTP/HTTPS with fallback)
    async fn test_port(&self, port: u16, csrf_token: &str) -> TestPortResult {
        // Try HTTPS first
        let https_result = self.test_port_with_protocol(port, csrf_token, "https").await;
        if https_result.success {
            return https_result;
        }
        
        // Fallback to HTTP
        self.test_port_with_protocol(port, csrf_token, "http").await
    }
    
    /// Test port with specific protocol
    async fn test_port_with_protocol(&self, port: u16, csrf_token: &str, protocol: &str) -> TestPortResult {
        let url = format!("{}://127.0.0.1:{}/exa.language_server_pb.LanguageServerService/GetUnleashData", protocol, port);
        
        let client = reqwest::Client::builder()
            .danger_accept_invalid_certs(true) // Accept self-signed certs
            .timeout(Duration::from_secs(3))
            .build()
            .unwrap();
        
        let body = serde_json::json!({ "wrapper_data": {} });
        
        match client
            .post(&url)
            .header("X-Codeium-Csrf-Token", csrf_token)
            .header("Connect-Protocol-Version", "1")
            .json(&body)
            .send()
            .await
        {
            Ok(response) => {
                let status = response.status().as_u16();
                TestPortResult {
                    success: status == 200,
                    status_code: Some(status),
                    protocol: protocol.to_string(),
                    error: None,
                }
            }
            Err(e) => TestPortResult {
                success: false,
                status_code: None,
                protocol: protocol.to_string(),
                error: Some(e.to_string()),
            },
        }
    }
}

impl Default for ProcessFinder {
    fn default() -> Self {
        Self::new()
    }
}

struct TestPortResult {
    success: bool,
    status_code: Option<u16>,
    protocol: String,
    error: Option<String>,
}
