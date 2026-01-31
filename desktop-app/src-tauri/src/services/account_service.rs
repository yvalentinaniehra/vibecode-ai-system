/// Account Service - Business logic for account management
/// 
/// Implements CRUD operations for SavedAccount entities.
/// Uses Tauri Store for persistent key-value storage.

use serde::{Deserialize, Serialize};
use uuid::Uuid;

const ACCOUNTS_KEY: &str = "saved_accounts";

/// SavedAccount data model (matches AntiGravitytool architecture)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SavedAccount {
    pub id: String,
    pub email: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub picture: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub name: Option<String>,
    pub tier: String, // "FREE" | "PRO" | "UNLIMITED"
    #[serde(skip_serializing_if = "Option::is_none")]
    pub plan_name: Option<String>,
    pub last_seen: i64, // Unix timestamp (ms)
}

/// Account Service for managing saved accounts
/// Uses a simple key for accessing the store instead of holding Store reference
pub struct AccountService;

impl AccountService {
    /// Create new AccountService instance
    pub fn new() -> Self {
        Self
    }
    
    /// Get store instance from app handle
    fn get_store(app: &tauri::AppHandle) -> Result<std::sync::Arc<tauri_plugin_store::Store<tauri::Wry>>, String> {
        use tauri_plugin_store::StoreExt;
        app.store("store.json")
            .map_err(|e| format!("Failed to get store: {}", e))
    }

    /// Get all saved accounts, sorted by lastSeen (most recent first)
    pub fn get_accounts(app: &tauri::AppHandle) -> Result<Vec<SavedAccount>, String> {
        let store = Self::get_store(app)?;
        
        // Load accounts from store
        let accounts: Vec<SavedAccount> = store
            .get(ACCOUNTS_KEY)
            .and_then(|v| serde_json::from_value(v.clone()).ok())
            .unwrap_or_default();

        // Sort by lastSeen descending
        let mut sorted = accounts;
        sorted.sort_by(|a, b| b.last_seen.cmp(&a.last_seen));

        Ok(sorted)
    }

    /// Add or update a saved account
    /// Uses email as unique key for upsert logic
    pub fn add_account(app: &tauri::AppHandle, mut account: SavedAccount) -> Result<(), String> {
        let mut accounts = Self::get_accounts(app)?;

        // Generate UUID if not provided
        if account.id.is_empty() {
            account.id = Uuid::new_v4().to_string();
        }

        // Update lastSeen to current time
        account.last_seen = chrono::Utc::now().timestamp_millis();

        // Find existing account by email
        if let Some(index) = accounts.iter().position(|a| a.email == account.email) {
            // Update existing account (preserve id, merge data)
            let existing = &accounts[index];
            accounts[index] = SavedAccount {
                id: existing.id.clone(), // Preserve original ID
                email: account.email,
                picture: account.picture.or_else(|| existing.picture.clone()),
                name: account.name.or_else(|| existing.name.clone()),
                tier: account.tier,
                plan_name: account.plan_name.or_else(|| existing.plan_name.clone()),
                last_seen: account.last_seen,
            };
        } else {
            // Add new account
            accounts.push(account);
        }

        // Save to store
        Self::save_accounts(app, &accounts)?;

        Ok(())
    }

    /// Remove a saved account by ID
    pub fn remove_account(app: &tauri::AppHandle, account_id: &str) -> Result<(), String> {
        let mut accounts = Self::get_accounts(app)?;
        accounts.retain(|a| a.id != account_id);
        Self::save_accounts(app, &accounts)?;
        Ok(())
    }

    /// Sync the currently active account
    /// Updates tier, planName, lastSeen; adds if doesn't exist
    pub fn sync_current_account(app: &tauri::AppHandle, account: SavedAccount) -> Result<(), String> {
        let mut accounts = Self::get_accounts(app)?;

        if let Some(index) = accounts.iter().position(|a| a.email == account.email) {
            // Update existing account
            let existing = &accounts[index];
            accounts[index] = SavedAccount {
                id: existing.id.clone(), // Preserve ID
                email: account.email,
                picture: account.picture.or(existing.picture.clone()),
                name: account.name.or(existing.name.clone()),
                tier: account.tier,
                plan_name: account.plan_name,
                last_seen: chrono::Utc::now().timestamp_millis(),
            };
        } else {
            // Add new account with generated UUID
            let new_account = SavedAccount {
                id: if account.id.is_empty() {
                    Uuid::new_v4().to_string()
                } else {
                    account.id
                },
                email: account.email,
                picture: account.picture,
                name: account.name,
                tier: account.tier,
                plan_name: account.plan_name,
                last_seen: chrono::Utc::now().timestamp_millis(),
            };
            accounts.push(new_account);
        }

        Self::save_accounts(app, &accounts)?;
        Ok(())
    }

    /// Internal: Save accounts to store
    fn save_accounts(app: &tauri::AppHandle, accounts: &[SavedAccount]) -> Result<(), String> {
        let store: std::sync::Arc<tauri_plugin_store::Store<tauri::Wry>> = Self::get_store(app)?;
        let json_value = serde_json::to_value(accounts).map_err(|e| e.to_string())?;
        store.set(ACCOUNTS_KEY.to_string(), json_value);
        store.save().map_err(|e| e.to_string())?;
        Ok(())
    }
}
