// src-tauri/src/workflow_generator.rs

use serde::{Deserialize, Serialize};
use std::process::Command;
use tauri::State;

#[derive(Debug, Serialize, Deserialize)]
pub struct WorkflowResult {
    success: bool,
    content: String,
    filename: String,
    errors: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SaveResult {
    success: bool,
    path: Option<String>,
    error: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AgentInfo {
    name: String,
    phase: String,
    model: String,
    keywords: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AgentsResult {
    success: bool,
    agents: Option<Vec<AgentInfo>>,
    error: Option<String>,
}

/// Generate workflow from user story
#[tauri::command]
pub async fn generate_workflow(user_story: String) -> Result<WorkflowResult, String> {
    // Get current working directory (should be desktop-app in dev mode)
    let current_dir = std::env::current_dir()
        .map_err(|e| format!("Failed to get current directory: {}", e))?;
    
    // Try to find src-tauri/scripts/generate_workflow.js
    // First check if we're in desktop-app directory
    let script_path = current_dir.join("src-tauri").join("scripts").join("generate_workflow.js");
    
    // If not found, maybe we're already in src-tauri
    let script_path = if !script_path.exists() {
        let alt_path = current_dir.join("scripts").join("generate_workflow.js");
        if alt_path.exists() {
            alt_path
        } else {
            // Last resort: try parent directory
            let parent_path = current_dir.parent()
                .ok_or("No parent directory")?
                .join("desktop-app")
                .join("src-tauri")
                .join("scripts")
                .join("generate_workflow.js");
            if !parent_path.exists() {
                return Err(format!(
                    "Script not found. Tried:\n  1. {}\n  2. {}\n  3. {}",
                    script_path.display(),
                    alt_path.display(),
                    parent_path.display()
                ));
            }
            parent_path
        }
    } else {
        script_path
    };
    
    // Execute Node.js script
    let output = Command::new("node")
        .arg(&script_path)
        .arg("generate")
        .arg(&user_story)
        .output()
        .map_err(|e| format!("Failed to execute script: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Script failed: {}", stderr));
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let result: WorkflowResult = serde_json::from_str(&stdout)
        .map_err(|e| format!("Failed to parse result: {}", e))?;

    Ok(result)
}

/// Save workflow to file
#[tauri::command]
pub async fn save_workflow(content: String, filename: String) -> Result<SaveResult, String> {
    let current_dir = std::env::current_dir()
        .map_err(|e| format!("Failed to get current directory: {}", e))?;
    
    let script_path = current_dir.join("src-tauri").join("scripts").join("generate_workflow.js");
    let script_path = if !script_path.exists() {
        let alt_path = current_dir.join("scripts").join("generate_workflow.js");
        if alt_path.exists() {
            alt_path
        } else {
            current_dir.parent()
                .ok_or("No parent directory")?
                .join("desktop-app")
                .join("src-tauri")
                .join("scripts")
                .join("generate_workflow.js")
        }
    } else {
        script_path
    };
    
    let output = Command::new("node")
        .arg(&script_path)
        .arg("save")
        .arg(&content)
        .arg(&filename)
        .output()
        .map_err(|e| format!("Failed to execute script: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Script failed: {}", stderr));
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let result: SaveResult = serde_json::from_str(&stdout)
        .map_err(|e| format!("Failed to parse result: {}", e))?;

    Ok(result)
}

/// List all available agents
#[tauri::command]
pub async fn list_agents() -> Result<AgentsResult, String> {
    let current_dir = std::env::current_dir()
        .map_err(|e| format!("Failed to get current directory: {}", e))?;
    
    let script_path = current_dir.join("src-tauri").join("scripts").join("generate_workflow.js");
    let script_path = if !script_path.exists() {
        let alt_path = current_dir.join("scripts").join("generate_workflow.js");
        if alt_path.exists() {
            alt_path
        } else {
            current_dir.parent()
                .ok_or("No parent directory")?
                .join("desktop-app")
                .join("src-tauri")
                .join("scripts")
                .join("generate_workflow.js")
        }
    } else {
        script_path
    };
    
    let output = Command::new("node")
        .arg(&script_path)
        .arg("list-agents")
        .output()
        .map_err(|e| format!("Failed to execute script: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Script failed: {}", stderr));
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let result: AgentsResult = serde_json::from_str(&stdout)
        .map_err(|e| format!("Failed to parse result: {}", e))?;

    Ok(result)
}
