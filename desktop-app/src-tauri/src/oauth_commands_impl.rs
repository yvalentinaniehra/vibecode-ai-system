// NOTE: This file contains OAuth command implementations
// It should be inserted into lib.rs after the Account Management Commands section

//============================================================================
// OAuth Commands - Google Sign In
// ============================================================================

use services::{OAuthService, GoogleApiService, OAuthServer, OAuthTokens};

const GOOGLE_CLIENT_ID: &str = "YOUR_CLIENT_ID_HERE"; // TODO: Move to config
const GOOGLE_CLIENT_SECRET: &str = "YOUR_CLIENT_SECRET_HERE"; // TODO: Move to config
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
    tauri::api::shell::open(&app.shell_scope(), &auth_url, None)
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
