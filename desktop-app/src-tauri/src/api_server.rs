/// REST API Server for Vibecode Desktop App
/// 
/// Provides HTTP endpoints for VS Code Extension communication
/// Runs on localhost:7890 (configurable)
/// 
/// Endpoints:
/// - GET /api/health               → Health check
/// - GET /api/accounts             → List all accounts with quota
/// - GET /api/accounts/best        → Get best account for model
/// - GET /api/accounts/current     → Get current active account
/// - POST /api/accounts/switch     → Switch to different account
/// - POST /api/quota/sync          → Trigger quota sync from Antigravity

use std::sync::Arc;
use tokio::sync::RwLock;
use warp::Filter;
use serde::{Deserialize, Serialize};

use crate::services::{AccountService, SavedAccount};
use crate::antigravity::{ProcessFinder, QuotaService, DetectOptions};
use crate::antigravity::quota_service::QuotaSnapshot;

/// API Server configuration
pub const API_PORT: u16 = 7890;

/// Shared state containing Tauri AppHandle and cached quota
pub struct ApiState {
    pub app: tauri::AppHandle,
    pub cached_quota: Option<QuotaSnapshot>,
}

/// Account response with quota info
#[derive(Debug, Serialize, Clone)]
pub struct AccountResponse {
    pub id: String,
    pub email: String,
    pub tier: String,
    pub plan_name: Option<String>,
    pub last_seen: i64,
}

/// Accounts list response
#[derive(Debug, Serialize)]
pub struct AccountsResponse {
    pub accounts: Vec<AccountResponse>,
    pub current_account: Option<String>,
    pub total: usize,
}

/// Best account query params
#[derive(Debug, Deserialize)]
pub struct BestAccountQuery {
    pub model: Option<String>,
}

/// Best account response
#[derive(Debug, Serialize)]
pub struct BestAccountResponse {
    pub email: String,
    pub available_quota: i64,
    pub percentage: f64,
    pub model: String,
}

/// Sync response
#[derive(Debug, Serialize)]
pub struct SyncResponse {
    pub success: bool,
    pub synced_accounts: usize,
    pub current_account: Option<String>,
    pub message: String,
    pub quota: Option<QuotaSnapshot>,
}

/// Health check response
#[derive(Debug, Serialize)]
pub struct HealthResponse {
    pub status: String,
    pub version: String,
    pub port: u16,
    pub antigravity_detected: bool,
}

/// Switch account request
#[derive(Debug, Deserialize)]
pub struct SwitchAccountRequest {
    pub email: Option<String>,
}

/// Switch account response
#[derive(Debug, Serialize)]
pub struct SwitchAccountResponse {
    pub success: bool,
    pub action: String,
    pub url: String,
    pub message: String,
}

/// Google Account Chooser URL
const GOOGLE_ACCOUNT_CHOOSER_URL: &str = "https://accounts.google.com/AccountChooser";

/// Start the REST API server
pub async fn start_server(app: tauri::AppHandle) {
    let state = Arc::new(RwLock::new(ApiState { 
        app,
        cached_quota: None,
    }));
    
    // CORS configuration for localhost
    let cors = warp::cors()
        .allow_any_origin()
        .allow_methods(vec!["GET", "POST", "OPTIONS"])
        .allow_headers(vec!["Content-Type"]);
    
    // Health check
    let state_health = state.clone();
    let health = warp::path!("api" / "health")
        .and(warp::get())
        .and_then(move || {
            let state = state_health.clone();
            async move {
                health_handler(state).await
            }
        });
    
    // GET /api/accounts
    let state_accounts = state.clone();
    let accounts = warp::path!("api" / "accounts")
        .and(warp::get())
        .and_then(move || {
            let state = state_accounts.clone();
            async move {
                get_accounts_handler(state).await
            }
        });
    
    // GET /api/accounts/best?model=gemini-flash
    let state_best = state.clone();
    let best_account = warp::path!("api" / "accounts" / "best")
        .and(warp::get())
        .and(warp::query::<BestAccountQuery>())
        .and_then(move |query: BestAccountQuery| {
            let state = state_best.clone();
            async move {
                get_best_account_handler(state, query).await
            }
        });
    
    // GET /api/accounts/current
    let state_current = state.clone();
    let current_account = warp::path!("api" / "accounts" / "current")
        .and(warp::get())
        .and_then(move || {
            let state = state_current.clone();
            async move {
                get_current_account_handler(state).await
            }
        });
    
    // POST /api/quota/sync
    let state_sync = state.clone();
    let sync_quota = warp::path!("api" / "quota" / "sync")
        .and(warp::post())
        .and_then(move || {
            let state = state_sync.clone();
            async move {
                sync_quota_handler(state).await
            }
        });
    
    // POST /api/accounts/switch
    let switch_account = warp::path!("api" / "accounts" / "switch")
        .and(warp::post())
        .and(warp::body::json())
        .and_then(move |body: SwitchAccountRequest| {
            async move {
                switch_account_handler(body).await
            }
        });
    
    let routes = health
        .or(accounts)
        .or(best_account)
        .or(current_account)
        .or(sync_quota)
        .or(switch_account)
        .with(cors);
    
    println!("🚀 Vibecode API Server starting on http://localhost:{}", API_PORT);
    
    warp::serve(routes)
        .run(([127, 0, 0, 1], API_PORT))
        .await;
}

/// Handler: Health check with Antigravity detection
async fn health_handler(
    _state: Arc<RwLock<ApiState>>,
) -> Result<impl warp::Reply, warp::Rejection> {
    // Quick Antigravity detection (sync call)
    let mut finder = ProcessFinder::new();
    let antigravity_detected = finder.detect(DetectOptions::default()).await.is_ok();
    
    Ok(warp::reply::json(&HealthResponse {
        status: "ok".to_string(),
        version: env!("CARGO_PKG_VERSION").to_string(),
        port: API_PORT,
        antigravity_detected,
    }))
}

/// Handler: Get all accounts
async fn get_accounts_handler(
    state: Arc<RwLock<ApiState>>,
) -> Result<impl warp::Reply, warp::Rejection> {
    let state = state.read().await;
    
    match AccountService::get_accounts(&state.app) {
        Ok(accounts) => {
            let account_responses: Vec<AccountResponse> = accounts
                .iter()
                .map(|acc| AccountResponse {
                    id: acc.id.clone(),
                    email: acc.email.clone(),
                    tier: acc.tier.clone(),
                    plan_name: acc.plan_name.clone(),
                    last_seen: acc.last_seen,
                })
                .collect();
            
            let current = accounts.first().map(|a| a.email.clone());
            let total = account_responses.len();
            
            Ok(warp::reply::json(&AccountsResponse {
                accounts: account_responses,
                current_account: current,
                total,
            }))
        }
        Err(e) => {
            Ok(warp::reply::json(&serde_json::json!({
                "error": e,
                "accounts": [],
                "total": 0
            })))
        }
    }
}

/// Handler: Get best account for a model
async fn get_best_account_handler(
    state: Arc<RwLock<ApiState>>,
    query: BestAccountQuery,
) -> Result<impl warp::Reply, warp::Rejection> {
    let state = state.read().await;
    let model = query.model.unwrap_or_else(|| "gemini-flash".to_string());
    
    match AccountService::get_accounts(&state.app) {
        Ok(accounts) => {
            // TODO: Implement actual quota comparison using cached_quota
            // For now, return the most recently used account (sorted by last_seen)
            if let Some(best) = accounts.first() {
                // Calculate quota from cached data if available
                let (available_quota, percentage) = if let Some(ref quota) = state.cached_quota {
                    // Use cached quota data
                    if let Some(ref pc) = quota.prompt_credits {
                        let available = pc.available;
                        let pct = pc.used_percentage;
                        (available, pct)
                    } else {
                        (1000, 0.0) // Default
                    }
                } else {
                    (1000, 0.0) // Default placeholder
                };
                
                Ok(warp::reply::json(&BestAccountResponse {
                    email: best.email.clone(),
                    available_quota,
                    percentage,
                    model,
                }))
            } else {
                Ok(warp::reply::json(&serde_json::json!({
                    "error": "No accounts available",
                    "email": null
                })))
            }
        }
        Err(e) => {
            Ok(warp::reply::json(&serde_json::json!({
                "error": e,
                "email": null
            })))
        }
    }
}

/// Handler: Get current active account
async fn get_current_account_handler(
    state: Arc<RwLock<ApiState>>,
) -> Result<impl warp::Reply, warp::Rejection> {
    let state = state.read().await;
    
    match AccountService::get_accounts(&state.app) {
        Ok(accounts) => {
            if let Some(current) = accounts.first() {
                Ok(warp::reply::json(&AccountResponse {
                    id: current.id.clone(),
                    email: current.email.clone(),
                    tier: current.tier.clone(),
                    plan_name: current.plan_name.clone(),
                    last_seen: current.last_seen,
                }))
            } else {
                Ok(warp::reply::json(&serde_json::json!({
                    "error": "No current account"
                })))
            }
        }
        Err(e) => {
            Ok(warp::reply::json(&serde_json::json!({
                "error": e
            })))
        }
    }
}

/// Handler: Sync quota from Antigravity
async fn sync_quota_handler(
    state: Arc<RwLock<ApiState>>,
) -> Result<impl warp::Reply, warp::Rejection> {
    // Step 1: Detect Antigravity Language Server
    let mut finder = ProcessFinder::new();
    let detect_options = DetectOptions {
        attempts: 3,
        base_delay: 1500,
        verbose: true,
    };
    
    let server_info = match finder.detect(detect_options).await {
        Ok(info) => info,
        Err(e) => {
            return Ok(warp::reply::json(&SyncResponse {
                success: false,
                synced_accounts: 0,
                current_account: None,
                message: format!("Antigravity not detected: {}", e),
                quota: None,
            }));
        }
    };
    
    // Step 2: Fetch quota data
    let quota_service = QuotaService::new();
    let quota = match quota_service.fetch_quota(&server_info).await {
        Ok(snapshot) => snapshot,
        Err(e) => {
            return Ok(warp::reply::json(&SyncResponse {
                success: false,
                synced_accounts: 0,
                current_account: None,
                message: format!("Failed to fetch quota: {}", e),
                quota: None,
            }));
        }
    };
    
    // Step 3: Extract current email from user_info
    let current_email = quota.user_info.as_ref()
        .and_then(|u| u.email.clone());
    
    {
        let mut state = state.write().await;
        state.cached_quota = Some(quota.clone());
        
        // Step 4: Sync account to database if user info available
        if let Some(ref user) = quota.user_info {
            if let Some(ref email) = user.email {
                let account = SavedAccount {
                    id: String::new(), // Will be generated
                    email: email.clone(),
                    picture: None,
                    name: user.name.clone(),
                    tier: user.tier.clone().unwrap_or_else(|| "FREE".to_string()),
                    plan_name: user.plan_name.clone(),
                    last_seen: chrono::Utc::now().timestamp_millis(),
                };
                
                if let Err(e) = AccountService::sync_current_account(&state.app, account) {
                    eprintln!("Failed to sync account: {}", e);
                }
            }
        }
    }
    
    Ok(warp::reply::json(&SyncResponse {
        success: true,
        synced_accounts: 1,
        current_account: current_email,
        message: "Quota synced successfully".to_string(),
        quota: Some(quota),
    }))
}

/// Handler: Switch to a different account
/// Opens Google Account Chooser URL for manual switching
async fn switch_account_handler(
    request: SwitchAccountRequest,
) -> Result<impl warp::Reply, warp::Rejection> {
    let target_email = request.email.unwrap_or_default();
    
    let message = if target_email.is_empty() {
        "Please select an account in the browser".to_string()
    } else {
        format!("Please switch to {} in the browser", target_email)
    };
    
    Ok(warp::reply::json(&SwitchAccountResponse {
        success: true,
        action: "open_browser".to_string(),
        url: GOOGLE_ACCOUNT_CHOOSER_URL.to_string(),
        message,
    }))
}

