// Antigravity Integration Module
// Ports ProcessFinder and QuotaService from Antigravity Toolkit (TypeScript → Rust)

pub mod process_finder;
pub mod quota_service;
pub mod types;

// Re-export main types for Tauri commands
pub use process_finder::ProcessFinder;
pub use quota_service::QuotaService;
pub use types::{LanguageServerInfo, DetectOptions};
