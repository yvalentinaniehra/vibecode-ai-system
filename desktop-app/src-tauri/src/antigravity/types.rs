// Data types for Antigravity integration
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LanguageServerInfo {
    pub port: u16,
    pub csrf_token: String,
}

#[derive(Debug, Clone)]
pub struct DetectOptions {
    pub attempts: u32,
    pub base_delay: u64, // milliseconds
    pub verbose: bool,
}

impl Default for DetectOptions {
    fn default() -> Self {
        Self {
            attempts: 3,
            base_delay: 1500,
            verbose: false,
        }
    }
}

#[derive(Debug, Clone)]
pub struct ProcessInfo {
    pub pid: u32,
    pub ppid: Option<u32>,
    pub csrf_token: String,
    pub extension_port: Option<u16>,
}

#[derive(Debug, Clone)]
pub struct CommunicationAttempt {
    pub pid: u32,
    pub port: u16,
    pub status_code: Option<u16>,
    pub error: Option<String>,
    pub protocol: String,
    pub port_source: String,
}

#[derive(Debug, Clone, PartialEq)]
pub enum FailureReason {
    NoProcess,
    Ambiguous,
    NoPort,
    AuthFailed,
}
