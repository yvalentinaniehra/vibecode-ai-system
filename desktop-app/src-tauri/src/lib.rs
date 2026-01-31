// Vibecode Desktop App - Tauri Commands
// Bridges the React frontend with Python vibe.py backend

use std::process::Command;
use std::path::PathBuf;
use std::sync::RwLock;
use serde::{Deserialize, Serialize};

// Global state for current project path
static CURRENT_PROJECT: RwLock<Option<String>> = RwLock::new(None);

#[derive(Debug, Serialize, Deserialize)]
pub struct TaskResult {
    pub success: bool,
    pub output: String,
    pub agent_used: String,
    pub execution_time: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct WorkflowInfo {
    pub name: String,
    pub description: String,
}

/// File/folder entry for file explorer
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct FileEntry {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    pub extension: Option<String>,
    pub size: Option<u64>,
    pub children: Option<Vec<FileEntry>>,
}

/// Changed file tracking
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ChangedFile {
    pub path: String,
    pub status: String, // "added", "modified", "deleted"
    pub lines_added: u32,
    pub lines_removed: u32,
}

/// Skill metadata from SKILL.md frontmatter
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SkillMetadata {
    pub name: String,
    pub description: String,
    pub version: String,
    pub author: Option<String>,
    pub category: Option<String>,
    pub tags: Option<Vec<String>>,
}

/// Skill entry for Skills Manager
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Skill {
    pub id: String,
    pub name: String,
    pub description: String,
    pub path: String,
    pub version: String,
    pub category: Option<String>,
    pub has_scripts: bool,
    pub has_guardrails: bool,
    pub created_at: String,
    pub updated_at: String,
}

// ============================================================================
// MCP Research Enhancement Structures (Phase 2)
// ============================================================================

/// User's skill creation intent from Stage 1
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SkillIntent {
    pub name: String,
    pub description: String,
    pub purpose: String,
    pub context: Option<String>,
}

/// Domain classification for intelligent template selection
#[derive(Debug, Serialize, Deserialize, Clone, PartialEq)]
#[serde(rename_all = "kebab-case")]
pub enum SkillDomain {
    DigitalMarketing,
    SoftwareDevelopment,
    DataScience,
    ProjectManagement,
    General,
}

/// Research source with citation
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ResearchSource {
    pub title: String,
    pub url: String,
    #[serde(rename = "type")]
    pub source_type: String, // "perplexity" | "notebooklm"
}

/// Enhanced research result combining multiple sources
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct EnhancedResearch {
    pub best_practices: Vec<String>,
    pub tools: Vec<String>,
    pub patterns: Vec<String>,
    pub sources: Vec<ResearchSource>,
    pub domain: SkillDomain,
}

// ============================================================================
// Antigravity Integration Module
// ============================================================================

mod antigravity;
mod services;
mod api_server;
mod workflow_generator;

// ============================================================================
// End Modules
// ============================================================================

// Global state for changed files (tracked during task execution)
static CHANGED_FILES: RwLock<Vec<ChangedFile>> = RwLock::new(Vec::new());

/// Get the path to vibe.py relative to the app
fn get_vibe_path() -> PathBuf {
    // In development, vibe.py is in the parent directory
    let mut path = std::env::current_dir().unwrap_or_default();
    
    // Check if we're in desktop-app/src-tauri
    if path.ends_with("src-tauri") {
        path.pop(); // Remove src-tauri
        path.pop(); // Remove desktop-app
    } else if path.ends_with("desktop-app") {
        path.pop(); // Remove desktop-app
    }
    
    path.push("vibe.py");
    path
}

/// Get the workflows directory path
fn get_workflows_path() -> PathBuf {
    let mut path = std::env::current_dir().unwrap_or_default();
    
    if path.ends_with("src-tauri") {
        path.pop();
        path.pop();
    } else if path.ends_with("desktop-app") {
        path.pop();
    }
    
    path.push("workflows");
    path
}

/// Get the skills directory path (.agent/skills in current project)
fn get_skills_path() -> PathBuf {
    // First check if we have a current project set
    if let Ok(guard) = CURRENT_PROJECT.read() {
        if let Some(project_path) = guard.as_ref() {
            let mut path = PathBuf::from(project_path);
            path.push(".agent");
            path.push("skills");
            return path;
        }
    }
    
    // Fallback to current directory
    let mut path = std::env::current_dir().unwrap_or_default();
    
    if path.ends_with("src-tauri") {
        path.pop();
        path.pop();
    } else if path.ends_with("desktop-app") {
        path.pop();
    }
    
    path.push(".agent");
    path.push("skills");
    path
}

/// Get the config file path (for persisting settings)
fn get_config_path() -> PathBuf {
    dirs::config_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join("vibecode-desktop")
        .join("config.json")
}

/// Save project path to config file
fn save_project_path(path: &str) -> Result<(), String> {
    let config_path = get_config_path();
    
    // Create directory if it doesn't exist
    if let Some(parent) = config_path.parent() {
        std::fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create config directory: {}", e))?;
    }
    
    let config = serde_json::json!({
        "last_project": path
    });
    
    std::fs::write(&config_path, config.to_string())
        .map_err(|e| format!("Failed to save config: {}", e))?;
    
    Ok(())
}

/// Load project path from config file
fn load_project_path() -> Option<String> {
    let config_path = get_config_path();
    
    if !config_path.exists() {
        return None;
    }
    
    let content = std::fs::read_to_string(&config_path).ok()?;
    let config: serde_json::Value = serde_json::from_str(&content).ok()?;
    
    config["last_project"].as_str().map(|s| s.to_string())
}

/// Get the settings file path
fn get_settings_path() -> PathBuf {
    dirs::config_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join("vibecode-desktop")
        .join("settings.json")
}

/// Get app settings
#[tauri::command]
async fn get_settings() -> Result<String, String> {
    let settings_path = get_settings_path();
    
    if !settings_path.exists() {
        // Return default settings
        return Ok(serde_json::json!({
            "pythonPath": "python ../vibe.py",
            "theme": "dark",
            "apiKeys": []
        }).to_string());
    }
    
    std::fs::read_to_string(&settings_path)
        .map_err(|e| format!("Failed to read settings: {}", e))
}

/// Save app settings
#[tauri::command]
async fn save_settings(settings: String) -> Result<(), String> {
    let settings_path = get_settings_path();
    
    // Create directory if it doesn't exist
    if let Some(parent) = settings_path.parent() {
        std::fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create config directory: {}", e))?;
    }
    
    std::fs::write(&settings_path, settings)
        .map_err(|e| format!("Failed to save settings: {}", e))?;
    
    Ok(())
}

/// Test Python connection
#[tauri::command]
async fn test_python_connection(python_path: String) -> Result<String, String> {
    let parts: Vec<&str> = python_path.split_whitespace().collect();
    if parts.is_empty() {
        return Err("Invalid Python path".to_string());
    }
    
    let python_cmd = parts[0];
    
    let output = Command::new(python_cmd)
        .arg("--version")
        .output()
        .map_err(|e| format!("Failed to execute Python: {}", e))?;
    
    if output.status.success() {
        let version = String::from_utf8_lossy(&output.stdout).to_string();
        Ok(format!("Connected: {}", version.trim()))
    } else {
        Err(format!("Python error: {}", String::from_utf8_lossy(&output.stderr)))
    }
}

/// Execute a task using vibe.py
#[tauri::command]
async fn execute_task(task: String, agent: String) -> Result<TaskResult, String> {
    let vibe_path = get_vibe_path();
    let start = std::time::Instant::now();
    
    let mut cmd = Command::new("python");
    cmd.arg(&vibe_path)
       .arg("task")
       .arg(&task);
    
    // Add agent flag if not auto
    match agent.as_str() {
        "api" => { cmd.arg("--api"); }
        "cli" => { cmd.arg("--cli"); }
        "antigravity" => { cmd.arg("--antigravity"); }
        _ => {} // auto - no flag needed
    }
    
    // Set working directory to project root
    if let Some(parent) = vibe_path.parent() {
        cmd.current_dir(parent);
    }
    
    let output = cmd.output().map_err(|e| format!("Failed to execute: {}", e))?;
    
    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).to_string();
    
    let execution_time = start.elapsed().as_secs_f64();
    
    if output.status.success() {
        Ok(TaskResult {
            success: true,
            output: stdout,
            agent_used: if agent == "auto" { "auto".to_string() } else { agent },
            execution_time,
        })
    } else {
        Ok(TaskResult {
            success: false,
            output: format!("{}\n{}", stdout, stderr),
            agent_used: agent,
            execution_time,
        })
    }
}

/// List available workflows
#[tauri::command]
async fn list_workflows() -> Result<Vec<WorkflowInfo>, String> {
    let vibe_path = get_vibe_path();
    
    let mut cmd = Command::new("python");
    cmd.arg(&vibe_path)
       .arg("workflow")
       .arg("list");
    
    if let Some(parent) = vibe_path.parent() {
        cmd.current_dir(parent);
    }
    
    let output = cmd.output().map_err(|e| format!("Failed to list workflows: {}", e))?;
    
    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    
    // Parse workflow list from output
    let mut workflows = Vec::new();
    for line in stdout.lines() {
        if line.contains(" - ") {
            let parts: Vec<&str> = line.splitn(2, " - ").collect();
            if parts.len() == 2 {
                workflows.push(WorkflowInfo {
                    name: parts[0].trim().replace("• ", "").to_string(),
                    description: parts[1].trim().to_string(),
                });
            }
        }
    }
    
    Ok(workflows)
}

/// Run a workflow by name
#[tauri::command]
async fn run_workflow(name: String, dry_run: bool) -> Result<TaskResult, String> {
    let vibe_path = get_vibe_path();
    let start = std::time::Instant::now();
    
    let mut cmd = Command::new("python");
    cmd.arg(&vibe_path)
       .arg("workflow")
       .arg(&name);
    
    if dry_run {
        cmd.arg("--dry-run");
    }
    
    if let Some(parent) = vibe_path.parent() {
        cmd.current_dir(parent);
    }
    
    let output = cmd.output().map_err(|e| format!("Failed to run workflow: {}", e))?;
    
    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).to_string();
    
    let execution_time = start.elapsed().as_secs_f64();
    
    Ok(TaskResult {
        success: output.status.success(),
        output: format!("{}{}", stdout, stderr),
        agent_used: "workflow".to_string(),
        execution_time,
    })
}

/// Get project context
#[tauri::command]
async fn get_context() -> Result<String, String> {
    let vibe_path = get_vibe_path();
    
    let mut cmd = Command::new("python");
    cmd.arg(&vibe_path)
       .arg("context");
    
    if let Some(parent) = vibe_path.parent() {
        cmd.current_dir(parent);
    }
    
    let output = cmd.output().map_err(|e| format!("Failed to get context: {}", e))?;
    
    Ok(String::from_utf8_lossy(&output.stdout).to_string())
}

/// Get session statistics
#[tauri::command]
async fn get_stats() -> Result<String, String> {
    let vibe_path = get_vibe_path();
    
    let mut cmd = Command::new("python");
    cmd.arg(&vibe_path)
       .arg("stats");
    
    if let Some(parent) = vibe_path.parent() {
        cmd.current_dir(parent);
    }
    
    let output = cmd.output().map_err(|e| format!("Failed to get stats: {}", e))?;
    
    Ok(String::from_utf8_lossy(&output.stdout).to_string())
}

/// Simple greet command for testing
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

/// Open the workflows folder in file explorer
#[tauri::command]
async fn open_workflows_folder() -> Result<String, String> {
    let workflows_path = get_workflows_path();
    
    // Create folder if it doesn't exist
    if !workflows_path.exists() {
        std::fs::create_dir_all(&workflows_path)
            .map_err(|e| format!("Failed to create workflows folder: {}", e))?;
    }
    
    // Open in file explorer based on OS
    #[cfg(target_os = "windows")]
    {
        Command::new("explorer")
            .arg(&workflows_path)
            .spawn()
            .map_err(|e| format!("Failed to open folder: {}", e))?;
    }
    
    #[cfg(target_os = "macos")]
    {
        Command::new("open")
            .arg(&workflows_path)
            .spawn()
            .map_err(|e| format!("Failed to open folder: {}", e))?;
    }
    
    #[cfg(target_os = "linux")]
    {
        Command::new("xdg-open")
            .arg(&workflows_path)
            .spawn()
            .map_err(|e| format!("Failed to open folder: {}", e))?;
    }
    
    Ok(workflows_path.to_string_lossy().to_string())
}

/// Create a new workflow file
#[tauri::command]
async fn create_workflow(name: String) -> Result<String, String> {
    let workflows_path = get_workflows_path();
    
    // Create folder if it doesn't exist
    if !workflows_path.exists() {
        std::fs::create_dir_all(&workflows_path)
            .map_err(|e| format!("Failed to create workflows folder: {}", e))?;
    }
    
    // Sanitize name for filename
    let file_name = name.to_lowercase().replace(" ", "-");
    let file_path = workflows_path.join(format!("{}.yaml", file_name));
    
    // Check if file already exists
    if file_path.exists() {
        return Err(format!("Workflow '{}' already exists", name));
    }
    
    // Create workflow template
    let template = format!(r#"# {} Workflow
name: {}
description: Add description here

variables:
  project_name: "my-project"

steps:
  - name: Step 1
    agent: api
    task: |
      Describe what this step should do

  - name: Step 2
    agent: cli
    task: |
      echo "Step 2 completed"
"#, name, file_name);
    
    // Write template to file
    std::fs::write(&file_path, template)
        .map_err(|e| format!("Failed to create workflow file: {}", e))?;
    
    // Open the file in default editor
    #[cfg(target_os = "windows")]
    {
        Command::new("notepad")
            .arg(&file_path)
            .spawn()
            .map_err(|e| format!("Failed to open file: {}", e))?;
    }
    
    #[cfg(target_os = "macos")]
    {
        Command::new("open")
            .arg("-t")
            .arg(&file_path)
            .spawn()
            .map_err(|e| format!("Failed to open file: {}", e))?;
    }
    
    #[cfg(target_os = "linux")]
    {
        Command::new("xdg-open")
            .arg(&file_path)
            .spawn()
            .map_err(|e| format!("Failed to open file: {}", e))?;
    }
    
    Ok(file_path.to_string_lossy().to_string())
}

/// Set the current project path
#[tauri::command]
async fn set_project_path(path: String) -> Result<String, String> {
    let path_buf = PathBuf::from(&path);
    
    if !path_buf.exists() {
        return Err(format!("Path does not exist: {}", path));
    }
    
    if !path_buf.is_dir() {
        return Err(format!("Path is not a directory: {}", path));
    }
    
    // Store the project path in memory
    let mut current = CURRENT_PROJECT.write().map_err(|e| format!("Lock error: {}", e))?;
    *current = Some(path.clone());
    
    // Persist to config file
    save_project_path(&path)?;
    
    Ok(path)
}

/// Get the current project path
#[tauri::command]
async fn get_project_path() -> Result<Option<String>, String> {
    let current = CURRENT_PROJECT.read().map_err(|e| format!("Lock error: {}", e))?;
    Ok(current.clone())
}

/// Open folder dialog to select project
#[tauri::command]
async fn open_project_dialog(app: tauri::AppHandle) -> Result<Option<String>, String> {
    use tauri_plugin_dialog::DialogExt;
    
    let folder = app.dialog()
        .file()
        .add_filter("All Files", &["*"])
        .blocking_pick_folder();
    
    match folder {
        Some(path) => {
            let path_str = path.to_string();
            // Set as current project in memory
            let mut current = CURRENT_PROJECT.write().map_err(|e| format!("Lock error: {}", e))?;
            *current = Some(path_str.clone());
            
            // Persist to config file
            save_project_path(&path_str)?;
            
            Ok(Some(path_str))
        }
        None => Ok(None)
    }
}

/// Load saved project path from config (called on app startup)
#[tauri::command]
async fn load_saved_project() -> Result<Option<String>, String> {
    // First check memory
    {
        let current = CURRENT_PROJECT.read().map_err(|e| format!("Lock error: {}", e))?;
        if current.is_some() {
            return Ok(current.clone());
        }
    }
    
    // Load from config file
    if let Some(saved_path) = load_project_path() {
        // Verify path still exists
        let path_buf = PathBuf::from(&saved_path);
        if path_buf.exists() && path_buf.is_dir() {
            // Store in memory
            let mut current = CURRENT_PROJECT.write().map_err(|e| format!("Lock error: {}", e))?;
            *current = Some(saved_path.clone());
            return Ok(Some(saved_path));
        }
    }
    
    Ok(None)
}

/// List directory contents for file explorer
#[tauri::command]
async fn list_directory(path: String) -> Result<Vec<FileEntry>, String> {
    let dir_path = PathBuf::from(&path);
    
    if !dir_path.exists() {
        return Err(format!("Path does not exist: {}", path));
    }
    
    if !dir_path.is_dir() {
        return Err(format!("Path is not a directory: {}", path));
    }
    
    let mut entries = Vec::new();
    
    let read_dir = std::fs::read_dir(&dir_path)
        .map_err(|e| format!("Failed to read directory: {}", e))?;
    
    for entry in read_dir {
        if let Ok(entry) = entry {
            let file_name = entry.file_name().to_string_lossy().to_string();
            
            // Skip hidden files and common ignore patterns
            if file_name.starts_with('.') && file_name != ".env" {
                continue;
            }
            if file_name == "node_modules" || file_name == "target" || file_name == "__pycache__" || file_name == ".git" {
                continue;
            }
            
            let file_path = entry.path();
            let is_dir = file_path.is_dir();
            let metadata = entry.metadata().ok();
            
            let extension = if is_dir {
                None
            } else {
                file_path.extension().map(|e| e.to_string_lossy().to_string())
            };
            
            entries.push(FileEntry {
                name: file_name,
                path: file_path.to_string_lossy().to_string(),
                is_dir,
                extension,
                size: metadata.map(|m| m.len()),
                children: None,
            });
        }
    }
    
    // Sort: directories first, then files, alphabetically
    entries.sort_by(|a, b| {
        match (a.is_dir, b.is_dir) {
            (true, false) => std::cmp::Ordering::Less,
            (false, true) => std::cmp::Ordering::Greater,
            _ => a.name.to_lowercase().cmp(&b.name.to_lowercase()),
        }
    });
    
    Ok(entries)
}

/// Read file content
#[tauri::command]
async fn read_file_content(path: String) -> Result<String, String> {
    let file_path = PathBuf::from(&path);
    
    if !file_path.exists() {
        return Err(format!("File does not exist: {}", path));
    }
    
    if !file_path.is_file() {
        return Err(format!("Path is not a file: {}", path));
    }
    
    // Check if file is too large (> 1MB)
    let metadata = std::fs::metadata(&file_path)
        .map_err(|e| format!("Failed to read metadata: {}", e))?;
    
    if metadata.len() > 1024 * 1024 {
        return Err("File is too large to display (> 1MB)".to_string());
    }
    
    std::fs::read_to_string(&file_path)
        .map_err(|e| format!("Failed to read file: {}", e))
}

/// Add a changed file to tracking
#[tauri::command]
async fn add_changed_file(path: String, status: String, lines_added: u32, lines_removed: u32) -> Result<(), String> {
    let mut files = CHANGED_FILES.write().map_err(|e| format!("Lock error: {}", e))?;
    
    // Remove existing entry for same path
    files.retain(|f| f.path != path);
    
    files.push(ChangedFile {
        path,
        status,
        lines_added,
        lines_removed,
    });
    
    Ok(())
}

/// Get all changed files
#[tauri::command]
async fn get_changed_files() -> Result<Vec<ChangedFile>, String> {
    let files = CHANGED_FILES.read().map_err(|e| format!("Lock error: {}", e))?;
    Ok(files.clone())
}

/// Clear changed files
#[tauri::command]
async fn clear_changed_files() -> Result<(), String> {
    let mut files = CHANGED_FILES.write().map_err(|e| format!("Lock error: {}", e))?;
    files.clear();
    Ok(())
}

// ============================================
// SKILLS ECOSYSTEM COMMANDS
// ============================================

/// List all skills in the .agent/skills directory
#[tauri::command]
async fn list_skills() -> Result<Vec<Skill>, String> {
    let skills_path = get_skills_path();
    
    if !skills_path.exists() {
        return Ok(Vec::new());
    }
    
    let mut skills = Vec::new();
    
    let entries = std::fs::read_dir(&skills_path)
        .map_err(|e| format!("Failed to read skills directory: {}", e))?;
    
    for entry in entries.flatten() {
        let path = entry.path();
        if !path.is_dir() {
            continue;
        }
        
        let skill_md_path = path.join("SKILL.md");
        let skill_name = path.file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("unknown")
            .to_string();
        
        // Parse SKILL.md if exists
        let (name, description, version, category) = if skill_md_path.exists() {
            parse_skill_frontmatter(&skill_md_path).unwrap_or_else(|_| {
                (skill_name.clone(), String::new(), "1.0.0".to_string(), None)
            })
        } else {
            (skill_name.clone(), String::new(), "1.0.0".to_string(), None)
        };
        
        // Check for scripts and guardrails
        let has_scripts = path.join("scripts").exists();
        let has_guardrails = path.join("guardrails.md").exists();
        
        // Get file metadata for timestamps
        let metadata = std::fs::metadata(&path).ok();
        let created_at = metadata.as_ref()
            .and_then(|m| m.created().ok())
            .map(|t| format!("{:?}", t))
            .unwrap_or_else(|| chrono::Utc::now().to_rfc3339());
        let updated_at = metadata.as_ref()
            .and_then(|m| m.modified().ok())
            .map(|t| format!("{:?}", t))
            .unwrap_or_else(|| chrono::Utc::now().to_rfc3339());
        
        skills.push(Skill {
            id: skill_name.clone(),
            name,
            description,
            path: path.to_string_lossy().to_string(),
            version,
            category,
            has_scripts,
            has_guardrails,
            created_at,
            updated_at,
        });
    }
    
    Ok(skills)
}

/// Parse SKILL.md frontmatter (YAML between ---)
fn parse_skill_frontmatter(path: &PathBuf) -> Result<(String, String, String, Option<String>), String> {
    let content = std::fs::read_to_string(path)
        .map_err(|e| format!("Failed to read SKILL.md: {}", e))?;
    
    // Simple frontmatter parsing
    let mut name = String::new();
    let mut description = String::new();
    let mut version = "1.0.0".to_string();
    let mut category = None;
    
    if content.starts_with("---") {
        if let Some(end_idx) = content[3..].find("---") {
            let frontmatter = &content[3..end_idx + 3];
            for line in frontmatter.lines() {
                let line = line.trim();
                if line.starts_with("name:") {
                    name = line[5..].trim().trim_matches('"').to_string();
                } else if line.starts_with("description:") {
                    description = line[12..].trim().trim_matches('"').to_string();
                } else if line.starts_with("version:") {
                    version = line[8..].trim().trim_matches('"').to_string();
                } else if line.starts_with("category:") {
                    category = Some(line[9..].trim().trim_matches('"').to_string());
                }
            }
        }
    }
    
    Ok((name, description, version, category))
}

/// Get a specific skill by ID
#[tauri::command]
async fn get_skill(skill_id: String) -> Result<Skill, String> {
    let skills = list_skills().await?;
    skills.into_iter()
        .find(|s| s.id == skill_id)
        .ok_or_else(|| format!("Skill '{}' not found", skill_id))
}

/// Create a new skill folder with SKILL.md template
#[tauri::command]
async fn create_skill(name: String, description: String, category: Option<String>) -> Result<Skill, String> {
    let skills_path = get_skills_path();
    
    // Create skills directory if it doesn't exist
    std::fs::create_dir_all(&skills_path)
        .map_err(|e| format!("Failed to create skills directory: {}", e))?;
    
    // Create skill folder name (kebab-case)
    let skill_id = name.to_lowercase().replace(' ', "-");
    let skill_folder = skills_path.join(&skill_id);
    
    if skill_folder.exists() {
        return Err(format!("Skill '{}' already exists", skill_id));
    }
    
    // Create skill folder structure
    std::fs::create_dir_all(&skill_folder)
        .map_err(|e| format!("Failed to create skill folder: {}", e))?;
    std::fs::create_dir_all(skill_folder.join("scripts"))
        .map_err(|e| format!("Failed to create scripts folder: {}", e))?;
    
    // Create SKILL.md with frontmatter
    let category_line = category.as_ref()
        .map(|c| format!("category: \"{}\"\n", c))
        .unwrap_or_default();
    
    let skill_md_content = format!(r#"---
name: "{}"
description: "{}"
version: "1.0.0"
{}---

# {}

{}

## Usage

Describe how to use this skill.

## Examples

Add examples of skill usage.
"#, name, description, category_line, name, description);
    
    std::fs::write(skill_folder.join("SKILL.md"), skill_md_content)
        .map_err(|e| format!("Failed to create SKILL.md: {}", e))?;
    
    // Create guardrails.md template
    let guardrails_content = format!(r#"# Guardrails for {}

## Rules

1. Never expose sensitive data
2. Always validate inputs
3. Log all operations

## Constraints

- Maximum execution time: 30s
- Rate limit: 10 requests/minute
"#, name);
    
    std::fs::write(skill_folder.join("guardrails.md"), guardrails_content)
        .map_err(|e| format!("Failed to create guardrails.md: {}", e))?;
    
    // Return the created skill
    get_skill(skill_id).await
}

/// Update skill SKILL.md content
#[tauri::command]
async fn update_skill(skill_id: String, content: String) -> Result<(), String> {
    let skills_path = get_skills_path();
    let skill_folder = skills_path.join(&skill_id);
    
    if !skill_folder.exists() {
        return Err(format!("Skill '{}' not found", skill_id));
    }
    
    std::fs::write(skill_folder.join("SKILL.md"), content)
        .map_err(|e| format!("Failed to update SKILL.md: {}", e))?;
    
    Ok(())
}

/// Delete a skill folder
#[tauri::command]
async fn delete_skill(skill_id: String) -> Result<(), String> {
    let skills_path = get_skills_path();
    let skill_folder = skills_path.join(&skill_id);
    
    if !skill_folder.exists() {
        return Err(format!("Skill '{}' not found", skill_id));
    }
    
    std::fs::remove_dir_all(&skill_folder)
        .map_err(|e| format!("Failed to delete skill: {}", e))?;
    
    Ok(())
}

/// Read skill SKILL.md content
#[tauri::command]
async fn read_skill_content(skill_id: String) -> Result<String, String> {
    let skills_path = get_skills_path();
    let skill_md_path = skills_path.join(&skill_id).join("SKILL.md");
    
    if !skill_md_path.exists() {
        return Err(format!("Skill '{}' not found", skill_id));
    }
    
    std::fs::read_to_string(&skill_md_path)
        .map_err(|e| format!("Failed to read SKILL.md: {}", e))
}

/// Script execution result
#[derive(Debug, Serialize, Deserialize)]
pub struct ScriptResult {
    pub success: bool,
    pub output: String,
    pub error: Option<String>,
    pub execution_time: f64,
}

/// List all scripts in a skill's scripts folder
#[tauri::command]
async fn list_skill_scripts(skill_id: String) -> Result<Vec<String>, String> {
    let skills_path = get_skills_path();
    let scripts_folder = skills_path.join(&skill_id).join("scripts");
    
    if !scripts_folder.exists() {
        return Ok(Vec::new());
    }
    
    let mut scripts = Vec::new();
    let entries = std::fs::read_dir(&scripts_folder)
        .map_err(|e| format!("Failed to read scripts folder: {}", e))?;
    
    for entry in entries {
        if let Ok(entry) = entry {
            let path = entry.path();
            if path.is_file() {
                if let Some(ext) = path.extension() {
                    let ext_str = ext.to_string_lossy().to_lowercase();
                    if ext_str == "py" || ext_str == "js" || ext_str == "mjs" {
                        if let Some(name) = path.file_name() {
                            scripts.push(name.to_string_lossy().to_string());
                        }
                    }
                }
            }
        }
    }
    
    scripts.sort();
    Ok(scripts)
}

/// Run a skill script (Python, Node.js, etc.)
#[tauri::command]
async fn run_skill_script(skill_id: String, script_name: String) -> Result<ScriptResult, String> {
    use std::time::Instant;
    
    let skills_path = get_skills_path();
    let skill_folder = skills_path.join(&skill_id);
    let scripts_folder = skill_folder.join("scripts");
    let script_path = scripts_folder.join(&script_name);
    
    if !script_path.exists() {
        return Err(format!("Script '{}' not found in skill '{}'", script_name, skill_id));
    }
    
    // Determine script type by extension
    let extension = script_path.extension()
        .and_then(|e| e.to_str())
        .unwrap_or("");
    
    let start_time = Instant::now();
    
    let output = match extension {
        "py" => {
            // Run Python script
            Command::new("python")
                .arg(&script_path)
                .current_dir(&skill_folder)
                .output()
                .map_err(|e| format!("Failed to execute Python script: {}", e))?
        },
        "js" | "mjs" => {
            // Run Node.js script
            Command::new("node")
                .arg(&script_path)
                .current_dir(&skill_folder)
                .output()
                .map_err(|e| format!("Failed to execute Node.js script: {}", e))?
        },
        _ => {
            return Err(format!("Unsupported script type: .{}", extension));
        }
    };
    
    let execution_time = start_time.elapsed().as_secs_f64();
    
    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).to_string();
    
    Ok(ScriptResult {
        success: output.status.success(),
        output: stdout,
        error: if stderr.is_empty() { None } else { Some(stderr) },
        execution_time,
    })
}

// ============================================================================
// Skill Testing & Export Commands (Skills Ecosystem Enhancement)
// ============================================================================

/// Validation result for skill testing
#[derive(Debug, Serialize, Deserialize)]
pub struct SkillValidation {
    pub is_valid: bool,
    pub skill_name: String,
    pub version: String,
    pub has_required_fields: bool,
    pub has_scripts: bool,
    pub has_guardrails: bool,
    pub errors: Vec<String>,
    pub warnings: Vec<String>,
}

/// Test a skill by validating its structure and content
#[tauri::command]
async fn test_skill(skill_id: String) -> Result<SkillValidation, String> {
    let skills_path = get_skills_path();
    let skill_folder = skills_path.join(&skill_id);
    
    if !skill_folder.exists() {
        return Err(format!("Skill '{}' not found", skill_id));
    }
    
    let skill_md = skill_folder.join("SKILL.md");
    let mut errors = Vec::new();
    let mut warnings = Vec::new();
    let mut skill_name = skill_id.clone();
    let mut version = "1.0.0".to_string();
    let mut has_required_fields = false;
    
    // Check SKILL.md exists
    if !skill_md.exists() {
        errors.push("Missing SKILL.md file".to_string());
    } else {
        // Parse frontmatter
        let content = std::fs::read_to_string(&skill_md)
            .map_err(|e| format!("Failed to read SKILL.md: {}", e))?;
        
        if content.starts_with("---") {
            if let Some(end_idx) = content[3..].find("---") {
                let frontmatter = &content[3..3+end_idx];
                // Check required fields
                has_required_fields = frontmatter.contains("name:") && frontmatter.contains("description:");
                
                // Extract name
                if let Some(name_line) = frontmatter.lines().find(|l| l.starts_with("name:")) {
                    skill_name = name_line.replace("name:", "").trim().trim_matches('"').to_string();
                }
                // Extract version
                if let Some(ver_line) = frontmatter.lines().find(|l| l.starts_with("version:")) {
                    version = ver_line.replace("version:", "").trim().trim_matches('"').to_string();
                }
                
                if !has_required_fields {
                    errors.push("Missing required fields: name and description".to_string());
                }
            } else {
                errors.push("Invalid YAML frontmatter format".to_string());
            }
        } else {
            errors.push("SKILL.md must start with YAML frontmatter (---)".to_string());
        }
    }
    
    // Check scripts folder
    let scripts_folder = skill_folder.join("scripts");
    let has_scripts = scripts_folder.exists();
    if !has_scripts {
        warnings.push("No scripts/ folder found".to_string());
    }
    
    // Check guardrails folder
    let guardrails_folder = skill_folder.join("guardrails");
    let has_guardrails = guardrails_folder.exists();
    if !has_guardrails {
        warnings.push("No guardrails/ folder found".to_string());
    }
    
    Ok(SkillValidation {
        is_valid: errors.is_empty(),
        skill_name,
        version,
        has_required_fields,
        has_scripts,
        has_guardrails,
        errors,
        warnings,
    })
}

/// Export result containing file path
#[derive(Debug, Serialize, Deserialize)]
pub struct ExportResult {
    pub success: bool,
    pub export_path: String,
    pub file_size: u64,
    pub skill_name: String,
    pub version: String,
}

/// Export a skill as a ZIP package for sharing
#[tauri::command]
async fn export_skill(skill_id: String) -> Result<ExportResult, String> {
    use std::io::{Read, Write};
    
    let skills_path = get_skills_path();
    let skill_folder = skills_path.join(&skill_id);
    
    if !skill_folder.exists() {
        return Err(format!("Skill '{}' not found", skill_id));
    }
    
    // Get skill metadata
    let skill_md = skill_folder.join("SKILL.md");
    let mut skill_name = skill_id.clone();
    let mut version = "1.0.0".to_string();
    
    if skill_md.exists() {
        if let Ok(content) = std::fs::read_to_string(&skill_md) {
            if content.starts_with("---") {
                if let Some(end_idx) = content[3..].find("---") {
                    let frontmatter = &content[3..3+end_idx];
                    if let Some(name_line) = frontmatter.lines().find(|l| l.starts_with("name:")) {
                        skill_name = name_line.replace("name:", "").trim().trim_matches('"').to_string();
                    }
                    if let Some(ver_line) = frontmatter.lines().find(|l| l.starts_with("version:")) {
                        version = ver_line.replace("version:", "").trim().trim_matches('"').to_string();
                    }
                }
            }
        }
    }
    
    // Create ZIP file
    let export_filename = format!("{}_v{}.zip", skill_id, version);
    let export_path = skills_path.join(&export_filename);
    
    let file = std::fs::File::create(&export_path)
        .map_err(|e| format!("Failed to create export file: {}", e))?;
    
    let mut zip = zip::ZipWriter::new(file);
    let options = zip::write::FileOptions::default()
        .compression_method(zip::CompressionMethod::Deflated);
    
    // Add all files from skill folder
    fn add_dir_to_zip(zip: &mut zip::ZipWriter<std::fs::File>, base_path: &std::path::Path, current_path: &std::path::Path, options: zip::write::FileOptions) -> Result<(), String> {
        for entry in std::fs::read_dir(current_path).map_err(|e| e.to_string())? {
            let entry = entry.map_err(|e| e.to_string())?;
            let path = entry.path();
            let relative_path = path.strip_prefix(base_path).map_err(|e| e.to_string())?;
            
            if path.is_dir() {
                add_dir_to_zip(zip, base_path, &path, options)?;
            } else {
                let mut file_content = Vec::new();
                std::fs::File::open(&path)
                    .map_err(|e| e.to_string())?
                    .read_to_end(&mut file_content)
                    .map_err(|e| e.to_string())?;
                
                zip.start_file(relative_path.to_string_lossy().to_string(), options)
                    .map_err(|e| e.to_string())?;
                zip.write_all(&file_content).map_err(|e| e.to_string())?;
            }
        }
        Ok(())
    }
    
    add_dir_to_zip(&mut zip, &skill_folder, &skill_folder, options)?;
    zip.finish().map_err(|e| format!("Failed to finalize ZIP: {}", e))?;
    
    let file_size = std::fs::metadata(&export_path)
        .map(|m| m.len())
        .unwrap_or(0);
    
    Ok(ExportResult {
        success: true,
        export_path: export_path.to_string_lossy().to_string(),
        file_size,
        skill_name,
        version,
    })
}

// ============================================================================
// AI-Powered Skill Generation (Gemini Integration)
// ============================================================================

/// Save Gemini API Key to store for AI Skill Factory
#[tauri::command]
async fn save_gemini_api_key(app: tauri::AppHandle, api_key: String) -> Result<String, String> {
    use tauri_plugin_store::StoreExt;
    
    let store = app.store("settings.json")
        .map_err(|e| format!("Lỗi khởi tạo Store: {}", e))?;
    
    store.set("gemini_api_key", serde_json::json!(api_key));
    store.save()
        .map_err(|e| format!("Lỗi lưu API key: {}", e))?;
    
    Ok("Gemini API Key đã được lưu thành công".to_string())
}

/// Generate skill content using Gemini AI
#[derive(Debug, Serialize, Deserialize)]
pub struct GeminiSkillResult {
    pub success: bool,
    pub skill_content: String,
    pub best_practices: Vec<String>,
    pub tools: Vec<String>,
    pub patterns: Vec<String>,
    pub error: Option<String>,
}

/// Generate skill with Gemini AI - creates intelligent, context-aware content
#[tauri::command]
async fn generate_skill_with_gemini(app: tauri::AppHandle, intent: SkillIntent) -> Result<GeminiSkillResult, String> {
    use tauri_plugin_store::StoreExt;
    
    // Read GEMINI_API_KEY from Tauri Store (set via Settings page)
    let store = app.store("settings.json")
        .map_err(|e| format!("Lỗi khởi tạo Store: {}", e))?;
    
    let api_key = store.get("gemini_api_key")
        .and_then(|v| v.as_str().map(String::from))
        .ok_or("⚠️ Gemini API Key chưa được cấu hình.\n\nVào Settings → Nhập Gemini API Key để sử dụng AI.\n\nLấy key tại: https://aistudio.google.com/apikey")?;
    
    if api_key.trim().is_empty() {
        return Err("⚠️ Gemini API Key trống. Vào Settings để nhập key.".to_string());
    }
    
    // Build improved Vietnamese prompt
    let context_text = intent.context.clone().unwrap_or_default();
    let prompt = format!(r#"Bạn là CHUYÊN GIA tạo Skills cho AI Agent. 

⚠️ CHỈ TRẢ LỜI BẰNG TIẾNG VIỆT. KHÔNG DÙNG TIẾNG ANH.

Hãy tạo nội dung SKILL.md CHI TIẾT và CHUYÊN NGHIỆP cho:

## Thông tin Skill:
- Tên skill: {}
- Mô tả chi tiết: {}
- Mục đích sử dụng: {}
- Ngữ cảnh bổ sung: {}

## Yêu cầu output:
Trả về JSON (KHÔNG bao gồm markdown fences):
{{
  "best_practices": ["phương pháp 1", "phương pháp 2", ...], 
  "tools": ["công cụ 1", "công cụ 2", ...],
  "patterns": ["quy trình 1", "quy trình 2", ...],
  "overview": "Mô tả tổng quan chi tiết 2-3 đoạn văn TIẾNG VIỆT",
  "use_cases": ["tình huống sử dụng 1", "tình huống 2", ...],
  "implementation_steps": ["bước 1", "bước 2", ...]
}}

## QUAN TRỌNG - Yêu cầu nội dung:
1. PHẢI liên quan TRỰC TIẾP đến "{}" - KHÔNG dùng nội dung chung chung
2. best_practices: 6-8 phương pháp TỐT NHẤT cho "{}" cụ thể
3. tools: 5-7 công cụ/phần mềm THỰC SỰ DÙNG ĐƯỢC cho lĩnh vực này
4. patterns: 4-6 quy trình/mô hình có thể ÁP DỤNG NGAY
5. overview: Giải thích CHI TIẾT skill này làm gì, ai cần, tại sao quan trọng
6. use_cases: 4-5 tình huống CỤ THỂ khi nào AI Agent cần skill này
7. implementation_steps: 4-6 bước TRIỂN KHAI thực tế

VÍ DỤ nếu skill là "Phân tích tài chính":
- tools: ["Excel/Google Sheets", "Power BI", "Python Pandas", "QuickBooks"]  
- KHÔNG phải: ["Git", "VS Code", "Docker"] (không liên quan)

TẤT CẢ NỘI DUNG PHẢI BẰNG TIẾNG VIỆT!"#,
        intent.name, intent.description, intent.purpose, context_text,
        intent.name, intent.name
    );
    
    // Call Gemini API
    let client = reqwest::Client::new();
    let api_url = format!(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={}",
        api_key
    );
    
    let request_body = serde_json::json!({
        "contents": [{
            "parts": [{
                "text": prompt
            }]
        }],
        "generationConfig": {
            "temperature": 0.7,
            "topP": 0.9,
            "maxOutputTokens": 4096
        }
    });
    
    let response = client.post(&api_url)
        .header("Content-Type", "application/json")
        .json(&request_body)
        .send()
        .await
        .map_err(|e| format!("Failed to call Gemini API: {}", e))?;
    
    if !response.status().is_success() {
        let error_text = response.text().await.unwrap_or_default();
        return Err(format!("Gemini API error: {}", error_text));
    }
    
    let response_json: serde_json::Value = response.json().await
        .map_err(|e| format!("Failed to parse Gemini response: {}", e))?;
    
    // Extract text from Gemini response
    let generated_text = response_json["candidates"][0]["content"]["parts"][0]["text"]
        .as_str()
        .unwrap_or("{}");
    
    // Clean and parse JSON from response
    let clean_json = generated_text
        .trim()
        .trim_start_matches("```json")
        .trim_start_matches("```")
        .trim_end_matches("```")
        .trim();
    
    let ai_result: serde_json::Value = serde_json::from_str(clean_json)
        .unwrap_or_else(|_| serde_json::json!({
            "best_practices": ["Không thể parse kết quả AI"],
            "tools": [],
            "patterns": [],
            "overview": intent.description.clone(),
            "use_cases": [],
            "implementation_steps": []
        }));
    
    // Extract arrays from AI result
    let best_practices: Vec<String> = ai_result["best_practices"]
        .as_array()
        .map(|arr| arr.iter().filter_map(|v| v.as_str().map(String::from)).collect())
        .unwrap_or_default();
    
    let tools: Vec<String> = ai_result["tools"]
        .as_array()
        .map(|arr| arr.iter().filter_map(|v| v.as_str().map(String::from)).collect())
        .unwrap_or_default();
    
    let patterns: Vec<String> = ai_result["patterns"]
        .as_array()
        .map(|arr| arr.iter().filter_map(|v| v.as_str().map(String::from)).collect())
        .unwrap_or_default();
    
    let overview = ai_result["overview"].as_str().unwrap_or(&intent.description);
    let use_cases: Vec<String> = ai_result["use_cases"]
        .as_array()
        .map(|arr| arr.iter().filter_map(|v| v.as_str().map(String::from)).collect())
        .unwrap_or_default();
    let impl_steps: Vec<String> = ai_result["implementation_steps"]
        .as_array()
        .map(|arr| arr.iter().filter_map(|v| v.as_str().map(String::from)).collect())
        .unwrap_or_default();
    
    // Generate complete SKILL.md content
    let timestamp = chrono::Local::now().format("%Y-%m-%d").to_string();
    
    let skill_content = format!(r#"---
name: {}
description: {}
version: 1.0.0
created: {}
updated: {}
generated_by: Gemini AI
---

# {}

## 📋 Tổng quan

{}

**Mục đích:** {}

{}

## 🎯 Khi nào sử dụng Skill này

{}

### Use Cases cụ thể:
{}

## 🛠️ Công cụ & Công nghệ

Các công cụ được khuyến nghị cho skill này:

{}

## 📚 Best Practices

{}

## 🏗️ Architecture Patterns

{}

## 📖 Hướng dẫn triển khai

{}

## 🔗 Tài liệu tham khảo

- Nội dung được tạo bởi Gemini AI dựa trên mô tả của bạn
- Hãy tùy chỉnh thêm cho phù hợp với dự án cụ thể

## ✅ Checklist chất lượng

- [ ] Đã review và điều chỉnh best practices
- [ ] Đã cài đặt các công cụ cần thiết  
- [ ] Đã áp dụng patterns phù hợp
- [ ] Đã test trên môi trường thử nghiệm
- [ ] Đã document đầy đủ

---

**Generated by:** Vibecode AI Skill Factory (Gemini 1.5 Flash)  
**Generated on:** {}
"#,
        intent.name,
        intent.description,
        timestamp,
        timestamp,
        intent.name,
        overview,
        intent.purpose,
        intent.context.as_ref().map(|c| format!("**Context bổ sung:** {}", c)).unwrap_or_default(),
        intent.purpose,
        use_cases.iter().map(|c| format!("- {}", c)).collect::<Vec<_>>().join("\n"),
        tools.iter().map(|t| format!("- **{}**", t)).collect::<Vec<_>>().join("\n"),
        best_practices.iter().enumerate().map(|(i, p)| format!("{}. {}", i+1, p)).collect::<Vec<_>>().join("\n"),
        patterns.iter().map(|p| format!("- {}", p)).collect::<Vec<_>>().join("\n"),
        impl_steps.iter().enumerate().map(|(i, s)| format!("### Bước {}: {}", i+1, s)).collect::<Vec<_>>().join("\n\n"),
        chrono::Local::now().format("%H:%M:%S %d/%m/%Y")
    );
    
    Ok(GeminiSkillResult {
        success: true,
        skill_content,
        best_practices,
        tools,
        patterns,
        error: None,
    })
}

// ============================================================================
// MCP Research Commands (Phase 2)
// ============================================================================

/// Detect skill domain from intent for intelligent template selection
fn detect_skill_domain(intent: &SkillIntent) -> SkillDomain {
    let combined_text = format!(
        "{} {} {}",
        intent.name.to_lowercase(),
        intent.description.to_lowercase(),
        intent.purpose.to_lowercase()
    );

    // Marketing keywords
    if combined_text.contains("marketing") 
        || combined_text.contains("content") 
        || combined_text.contains("social media")
        || combined_text.contains("facebook")
        || combined_text.contains("seo")
        || combined_text.contains("advertisement") {
        return SkillDomain::DigitalMarketing;
    }

    // Software development keywords  
    if combined_text.contains("code")
        || combined_text.contains("software")
        || combined_text.contains("programming")
        || combined_text.contains("development")
        || combined_text.contains("testing")
        || combined_text.contains("deployment") {
        return SkillDomain::SoftwareDevelopment;
    }

    // Data science keywords
    if combined_text.contains("data")
        || combined_text.contains("machine learning")
        || combined_text.contains("analytics")
        || combined_text.contains("statistics")
        || combined_text.contains("ai model") {
        return SkillDomain::DataScience;
    }

    // Project management keywords
    if combined_text.contains("project")
        || combined_text.contains("management")
        || combined_text.contains("agile")
        || combined_text.contains("scrum")
        || combined_text.contains("workflow") {
        return SkillDomain::ProjectManagement;
    }

    SkillDomain::General
}

/// Research skill with MCP integration (Perplexity + NotebookLM)
/// Phase 2.1: Simulated implementation - will be connected to real MCPs later
#[tauri::command]
async fn research_skill_with_mcp(intent: SkillIntent) -> Result<EnhancedResearch, String> {
    // Step 1: Detect domain for intelligent content
    let domain = detect_skill_domain(&intent);

    // Step 2: Simulate MCP research (placeholder - will call real MCPs in Phase 2.2)
    // TODO: Replace with real Perplexity MCP stdio call
    // TODO: Replace with real NotebookLM MCP stdio call

    let (best_practices, tools, patterns) = match domain {
        SkillDomain::DigitalMarketing => (
            vec![
                "Follow 80/20 rule: 80% value content, 20% promotional".to_string(),
                "Hook in first 3 seconds to capture attention".to_string(),
                "Mobile-first design - 90% users browse on mobile".to_string(),
                "Include clear Call-to-Action (CTA) in every post".to_string(),
                "Use 1080x1080px square images for optimal Facebook feed".to_string(),
                "Keep text overlay below 20% to avoid algorithm penalty".to_string(),
                "Post timing: Peak engagement 1-4 PM weekdays".to_string(),
                "Use 3-5 relevant hashtags maximum".to_string(),
            ],
            vec![
                "Canva Pro".to_string(),
                "Adobe Creative Cloud".to_string(),
                "Meta Business Suite".to_string(),
                "Hootsuite".to_string(),
                "Buffer".to_string(),
                "ChatGPT/Claude".to_string(),
                "Midjourney/DALL-E".to_string(),
                "Google Analytics".to_string(),
                "SEMrush".to_string(),
            ],
            vec![
                "Content Calendar Pattern - Monthly theme planning, weekly batch creation".to_string(),
                "Template-Based Generation - Maintain brand consistency with templates".to_string(),
                "Multi-Stage Approval Flow - AI Draft → Human Review → Client Approval → Publishing".to_string(),
                "Performance Feedback Loop - Analytics → Insights → Adjustment → Testing".to_string(),
            ],
        ),
        SkillDomain::SoftwareDevelopment => (
            vec![
                "Follow SOLID design principles for maintainability".to_string(),
                "Implement comprehensive error handling and logging".to_string(),
                "Write modular, reusable code with clear separation of concerns".to_string(),
                "Add thorough documentation and inline comments".to_string(),
                "Use TypeScript/type hints for type safety".to_string(),
                "Implement unit tests with high coverage".to_string(),
                "Follow consistent code formatting standards".to_string(),
                "Apply security best practices (input validation, sanitization)".to_string(),
            ],
            vec![
                "Git".to_string(),
                "VS Code".to_string(),
                "Docker".to_string(),
                "Jest".to_string(),
                "ESLint".to_string(),
                "Prettier".to_string(),
                "GitHub Actions".to_string(),
            ],
            vec![
                "Factory Pattern for object creation".to_string(),
                "Strategy Pattern for algorithm selection".to_string(),
                "Observer Pattern for event handling".to_string(),
                "Repository Pattern for data access".to_string(),
                "Dependency Injection for loose coupling".to_string(),
            ],
        ),
        SkillDomain::DataScience => (
            vec![
                "Document data sources and assumptions clearly".to_string(),
                "Validate data quality before analysis".to_string(),
                "Use reproducible workflows (Jupyter notebooks, version control)".to_string(),
                "Apply proper train/test/validation splits".to_string(),
                "Monitor model performance and drift in production".to_string(),
            ],
            vec![
                "Python".to_string(),
                "Pandas".to_string(),
                "NumPy".to_string(),
                "Scikit-learn".to_string(),
                "Jupyter Notebook".to_string(),
                "MLflow".to_string(),
            ],
            vec![
                "ETL Pipeline Pattern - Extract, Transform, Load data workflows".to_string(),
                "Feature Engineering Pipeline - Systematic feature creation and selection".to_string(),
                "Model Training Pipeline - Automated hyperparameter tuning and evaluation".to_string(),
            ],
        ),
        SkillDomain::ProjectManagement => (
            vec![
                "Define clear project scope and deliverables upfront".to_string(),
                "Break work into manageable sprints (2-week iterations)".to_string(),
                "Maintain transparent communication with stakeholders".to_string(),
                "Track progress with visual boards (Kanban/Scrum)".to_string(),
                "Conduct regular retrospectives for continuous improvement".to_string(),
            ],
            vec![
                "Jira".to_string(),
                "Asana".to_string(),
                "Trello".to_string(),
                "Monday.com".to_string(),
                "Notion".to_string(),
                "Slack".to_string(),
            ],
            vec![
                "Agile/Scrum Framework - Sprint planning, daily standups, retrospectives".to_string(),
                "Kanban Flow - Visual workflow management with WIP limits".to_string(),
                "Critical Path Method - Identify task dependencies and bottlenecks".to_string(),
            ],
        ),
        SkillDomain::General => (
            vec![
                "Start with clear objectives and success criteria".to_string(),
                "Break complex tasks into smaller, manageable steps".to_string(),
                "Document processes for consistency and knowledge sharing".to_string(),
                "Iterate based on feedback and lessons learned".to_string(),
            ],
            vec![
                "Productivity tools (Notion, Evernote)".to_string(),
                "Communication tools (Slack, Teams)".to_string(),
                "Collaboration tools (Google Workspace)".to_string(),
            ],
            vec![
                "Systematic Workflow Pattern - Define, Execute, Review, Improve".to_string(),
                "Documentation-First Approach - Write it down before implementation".to_string(),
            ],
        ),
    };

    // Step 3: Create research sources (simulated - will be real Perplexity citations later)
    let sources = vec![
        ResearchSource {
            title: format!("Best practices for {}", intent.name),
            url: "#".to_string(), // TODO: Replace with real Perplexity URL
            source_type: "perplexity".to_string(),
        },
        ResearchSource {
            title: format!("Industry standards for {:?}", domain),
            url: "#".to_string(), // TODO: Replace with NotebookLM citation
            source_type: "notebooklm".to_string(),
        },
    ];

    Ok(EnhancedResearch {
        best_practices,
        tools,
        patterns,
        sources,
        domain,
    })
}

// ============================================================================
// End MCP Commands
// ============================================================================

// ============================================================================
// Antigravity Integration Commands
// ============================================================================



use services::{AccountService, SavedAccount, OAuthService, OAuthTokens, GoogleApiService, OAuthServer};

/// Detect Antigravity IDE server process
#[tauri::command]
async fn detect_antigravity_server() -> Result<antigravity::types::LanguageServerInfo, String> {
    use antigravity::process_finder::ProcessFinder;
    use antigravity::types::DetectOptions;
    
    let options = DetectOptions {
        attempts: 3,
        base_delay: 1000,
        verbose: false,
    };
    
    let mut finder = ProcessFinder::new();
    finder.detect(options).await
}

/// Fetch quota data from Antigravity server
#[tauri::command]
async fn fetch_quota(
    server_info: antigravity::types::LanguageServerInfo
) -> Result<antigravity::quota_service::QuotaSnapshot, String> {
    use antigravity::quota_service::QuotaService;
    
    let service = QuotaService::new();
    service.fetch_quota(&server_info).await
}

// ============================================================================
// Account Management Commands
// ============================================================================

/// Get all saved accounts (sorted by lastSeen descending)
#[tauri::command]
fn get_saved_accounts(
    app: tauri::AppHandle,
) -> Result<Vec<SavedAccount>, String> {
    AccountService::get_accounts(&app)
}

/// Add or update a saved account
#[tauri::command]
fn add_saved_account(
    app: tauri::AppHandle,
    account: SavedAccount,
) -> Result<(), String> {
    AccountService::add_account(&app, account)
}

/// Remove a saved account by ID
#[tauri::command]
fn remove_saved_account(
    app: tauri::AppHandle,
    account_id: String,
) -> Result<(), String> {
    AccountService::remove_account(&app, &account_id)
}

/// Sync currently active account (upsert/// Sync the current account (updates or adds)
#[tauri::command]
fn sync_current_account(
    app: tauri::AppHandle,
    account: SavedAccount,
) -> Result<(), String> {
    AccountService::sync_current_account(&app, account)
}

// ============================================================================
// End Account Commands
// ============================================================================

// ============================================================================
// OAuth Commands - Google Sign In (Phase 3.2)
// ============================================================================

const GOOGLE_CLIENT_ID: &str = "91404287648-jasmkllvaktpd629rk3f747e8b6tg3fm.apps.googleusercontent.com";
const GOOGLE_CLIENT_SECRET: &str = "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";
const OAUTH_REDIRECT_URI: &str = "http://localhost:3000/oauth/callback";
const OAUTH_CALLBACK_PORT: u16 = 3000;
const OAUTH_TIMEOUT_SECS: u64 = 300; // 5 minutes

/// Start Google OAuth flow
/// Opens browser, waits for callback, exchanges code for tokens, fetches user info
#[tauri::command]
async fn start_google_oauth(
    app: tauri::AppHandle,
) -> Result<SavedAccount, String> {
    // 1. Generate PKCE challenge
    let pkce = OAuthService::generate_pkce();
    
    // 2. Build OAuth authorization URL
    let auth_url = format!(
        "https://accounts.google.com/o/oauth2/v2/auth?\
         client_id={}&\
         redirect_uri={}&\
         response_type=code&\
         scope={}&\
         access_type=offline&\
         code_challenge={}&\
         code_challenge_method=S256&\
         prompt=consent",
        GOOGLE_CLIENT_ID,
        urlencoding::encode(OAUTH_REDIRECT_URI),
        urlencoding::encode("email profile openid"),
        pkce.challenge,
    );
    
    // 3. Open browser
    open::that(&auth_url)
        .map_err(|e| format!("Failed to open browser: {}", e))?;
    
    // 4. Start local callback server and wait for code
    let callback = OAuthServer::start_and_wait(OAUTH_CALLBACK_PORT, OAUTH_TIMEOUT_SECS)
        .map_err(|e| format!("OAuth callback failed: {}", e))?;
    
    // 5. Exchange authorization code for tokens
    let tokens = exchange_code_for_tokens(&callback.code, &pkce.verifier).await?;
    
    // 6. Fetch user info
    let google_api = GoogleApiService::new();
    let user_info = google_api
        .get_user_info(&tokens.access_token)
        .await?;
    
    // 7. Detect tier from scopes
    let tier = GoogleApiService::detect_tier_from_scopes(tokens.scope.as_deref());
    
    // 8. Encrypt and save tokens
    let encryption_key = OAuthService::generate_device_key()?;
    let encrypted_tokens = OAuthService::encrypt_tokens(&tokens, &encryption_key)?;
    save_encrypted_tokens(&app, &user_info.email, &encrypted_tokens)?;
    
    // 9. Create SavedAccount
    let account = SavedAccount {
        id: uuid::Uuid::new_v4().to_string(),
        email: user_info.email.clone(),
        picture: user_info.picture,
        name: user_info.name,
        tier,
        plan_name: Some("Google Account".to_string()),
        last_seen: chrono::Utc::now().timestamp_millis(),
    };
    
    // 10. Save account
    AccountService::add_account(&app, account.clone())?;
    
    Ok(account)
}

/// Exchange authorization code for access/refresh tokens
async fn exchange_code_for_tokens(
    code: &str,
    code_verifier: &str,
) -> Result<OAuthTokens, String> {
    let client = reqwest::Client::new();
    
    let params = [
        ("code", code),
        ("client_id", GOOGLE_CLIENT_ID),
        ("client_secret", GOOGLE_CLIENT_SECRET),
        ("redirect_uri", OAUTH_REDIRECT_URI),
        ("grant_type", "authorization_code"),
        ("code_verifier", code_verifier),
    ];
    
    let response = client
        .post("https://oauth2.googleapis.com/token")
        .form(&params)
        .send()
        .await
        .map_err(|e| format!("Token exchange request failed: {}", e))?;
    
    if !response.status().is_success() {
        let status = response.status();
        let error_text = response.text().await.unwrap_or_else(|_| "Unknown".to_string());
        return Err(format!("Token exchange failed {}: {}", status, error_text));
    }
    
    #[derive(serde::Deserialize)]
    struct TokenResponse {
        access_token: String,
        expires_in: i64,
        refresh_token: Option<String>,
        id_token: Option<String>,
        scope: Option<String>,
    }
    
    let token_resp: TokenResponse = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse token response: {}", e))?;
    
    Ok(OAuthTokens {
        access_token: token_resp.access_token,
        refresh_token: token_resp.refresh_token,
        expires_at: chrono::Utc::now().timestamp() + token_resp.expires_in,
        id_token: token_resp.id_token,
        scope: token_resp.scope,
    })
}

/// Save encrypted tokens to Tauri Store
fn save_encrypted_tokens(
    app: &tauri::AppHandle,
    email: &str,
    encrypted_tokens: &[u8],
) -> Result<(), String> {
    use tauri_plugin_store::StoreExt;
    
    let store = app.store("store.json")
        .map_err(|e| format!("Failed to get store: {}", e))?;
    
    let key = format!("oauth_tokens_{}", email);
    use base64::Engine;
    let encoded = base64::engine::general_purpose::STANDARD.encode(encrypted_tokens);
    
    store.set(key, serde_json::Value::String(encoded));
    store.save().map_err(|e| format!("Failed to save tokens: {}", e))?;
    
    Ok(())
}

/// Refresh OAuth tokens for an account
#[tauri::command]
async fn refresh_google_token(
    app: tauri::AppHandle,
    email: String,
) -> Result<(), String> {
    // 1. Load encrypted tokens
    let encrypted_tokens = load_encrypted_tokens(&app, &email)?;
    
    // 2. Decrypt tokens
    let encryption_key = OAuthService::generate_device_key()?;
    let mut tokens = OAuthService::decrypt_tokens(&encrypted_tokens, &encryption_key)?;
    
    // 3. Check if refresh needed
    if !OAuthService::will_expire_soon(&tokens, 300) {
        return Ok(()); // Still valid
    }
    
    // 4. Refresh
    let refresh_token = tokens.refresh_token
        .as_ref()
        .ok_or("No refresh token available")?;
    
    let google_api = GoogleApiService::new();
    tokens = google_api
        .refresh_access_token(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, refresh_token)
        .await?;
    
    // 5. Re-encrypt and save
    let encrypted = OAuthService::encrypt_tokens(&tokens, &encryption_key)?;
    save_encrypted_tokens(&app, &email, &encrypted)?;
    
    // 6. Update lastSeen for account
    let mut accounts = AccountService::get_accounts(&app)?;
    if let Some(account) = accounts.iter_mut().find(|a| a.email == email) {
        account.last_seen = chrono::Utc::now().timestamp_millis();
        AccountService::add_account(&app, account.clone())?;
    }
    
    Ok(())
}

/// Load encrypted tokens from store
fn load_encrypted_tokens(
    app: &tauri::AppHandle,
    email: &str,
) -> Result<Vec<u8>, String> {
    use tauri_plugin_store::StoreExt;
    
    let store = app.store("store.json")
        .map_err(|e| format!("Failed to get store: {}", e))?;
    
    let key = format!("oauth_tokens_{}", email);
    let encoded: String = store
        .get(&key)
        .and_then(|v| serde_json::from_value(v.clone()).ok())
        .ok_or("Tokens not found")?;
    
    use base64::Engine;
    base64::engine::general_purpose::STANDARD
        .decode(encoded)
        .map_err(|e| format!("Failed to decode tokens: {}", e))
}

/// Revoke OAuth tokens and remove account
#[tauri::command]
async fn revoke_google_account(
    app: tauri::AppHandle,
    email: String,
) -> Result<(), String> {
    // 1. Load and decrypt tokens
    let encrypted_tokens = load_encrypted_tokens(&app, &email)?;
    let encryption_key = OAuthService::generate_device_key()?;
    let tokens = OAuthService::decrypt_tokens(&encrypted_tokens, &encryption_key)?;
    
    // 2. Revoke tokens with Google
    let google_api = GoogleApiService::new();
    google_api.revoke_token(&tokens.access_token).await?;
    
    // 3. Remove from store
    use tauri_plugin_store::StoreExt;
    let store = app.store("store.json")
        .map_err(|e| format!("Failed to get store: {}", e))?;
    let key = format!("oauth_tokens_{}", email);
    store.delete(&key);
    store.save().map_err(|e| format!("Failed to save store: {}", e))?;
    
    // 4. Remove account
    let accounts = AccountService::get_accounts(&app)?;
    if let Some(account) = accounts.iter().find(|a| a.email == email) {
        AccountService::remove_account(&app, &account.id)?;
    }
    
    Ok(())
}

// ============================================================================
// End OAuth Commands
// ============================================================================

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_fs::init())
        .setup(|app| {
            // Start REST API server in background for Extension communication
            let app_handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                api_server::start_server(app_handle).await;
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            greet,
            execute_task,
            list_workflows,
            run_workflow,
            get_context,
            get_stats,
            open_workflows_folder,
            create_workflow,
            set_project_path,
            get_project_path,
            open_project_dialog,
            load_saved_project,
            list_directory,
            read_file_content,
            add_changed_file,
            get_changed_files,
            clear_changed_files,
            get_settings,
            save_settings,
            test_python_connection,
            // Skills Ecosystem Commands
            list_skills,
            get_skill,
            create_skill,
            update_skill,
            delete_skill,
            read_skill_content,
            list_skill_scripts,
            run_skill_script,
            test_skill,
            export_skill,
            // AI-Powered Skill Generation (Gemini)
            save_gemini_api_key,
            generate_skill_with_gemini,
            // MCP Research Commands (Phase 2)
            research_skill_with_mcp,
            // Antigravity Integration Commands
            detect_antigravity_server,
            fetch_quota,
            // Account Management Commands
            get_saved_accounts,
            add_saved_account,
            remove_saved_account,
            sync_current_account,
            // OAuth Commands (Phase 3.2)
            start_google_oauth,
            refresh_google_token,
            revoke_google_account,
            // Workflow Generator Commands
            workflow_generator::generate_workflow,
            workflow_generator::save_workflow,
            workflow_generator::list_agents
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
