/// Google API Service - Interact with Google OAuth and User Info APIs
///
/// Handles user profile fetching and token refresh operations

use reqwest::Client;
use serde::{Deserialize, Serialize};
use super::oauth_service::OAuthTokens;

const GOOGLE_USERINFO_ENDPOINT: &str = "https://www.googleapis.com/oauth2/v2/userinfo";
const GOOGLE_TOKEN_ENDPOINT: &str = "https://oauth2.googleapis.com/token";
const GOOGLE_REVOKE_ENDPOINT: &str = "https://oauth2.googleapis.com/revoke";

/// Google user profile information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GoogleUserInfo {
    pub email: String,
    pub name: Option<String>,
    pub picture: Option<String>,
    pub verified_email: bool,
    #[serde(default)]
    pub given_name: Option<String>,
    #[serde(default)]
    pub family_name: Option<String>,
}

/// Token response from Google's token endpoint
#[derive(Debug, Deserialize)]
struct TokenResponse {
    access_token: String,
    expires_in: i64,
    #[serde(default)]
    refresh_token: Option<String>,
    #[serde(default)]
    id_token: Option<String>,
    #[serde(default)]
    scope: Option<String>,
}

pub struct GoogleApiService {
    client: Client,
}

impl GoogleApiService {
    /// Create new Google API service instance
    pub fn new() -> Self {
        Self {
            client: Client::new(),
        }
    }

    /// Fetch user profile information from Google
    ///
    /// # Arguments
    /// * `access_token` - Valid OAuth access token
    ///
    /// # Returns
    /// User profile including email, name, and picture URL
    pub async fn get_user_info(&self, access_token: &str) -> Result<GoogleUserInfo, String> {
        let response = self
            .client
            .get(GOOGLE_USERINFO_ENDPOINT)
            .bearer_auth(access_token)
            .send()
            .await
            .map_err(|e| format!("Failed to fetch user info: {}", e))?;

        if !response.status().is_success() {
            let status = response.status();
            let error_text = response
                .text()
                .await
                .unwrap_or_else(|_| "Unknown error".to_string());
            return Err(format!("Google API error {}: {}", status, error_text));
        }

        response
            .json::<GoogleUserInfo>()
            .await
            .map_err(|e| format!("Failed to parse user info: {}", e))
    }

    /// Refresh OAuth access token using refresh token
    ///
    /// # Arguments
    /// * `client_id` - Google OAuth client ID
    /// * `client_secret` - Google OAuth client secret
    /// * `refresh_token` - Valid refresh token
    ///
    /// # Returns
    /// New OAuth tokens (may include new refresh token if rotated)
    pub async fn refresh_access_token(
        &self,
        client_id: &str,
        client_secret: &str,
        refresh_token: &str,
    ) -> Result<OAuthTokens, String> {
        let params = [
            ("client_id", client_id),
            ("client_secret", client_secret),
            ("refresh_token", refresh_token),
            ("grant_type", "refresh_token"),
        ];

        let response = self
            .client
            .post(GOOGLE_TOKEN_ENDPOINT)
            .form(&params)
            .send()
            .await
            .map_err(|e| format!("Failed to refresh token: {}", e))?;

        if !response.status().is_success() {
            let status = response.status();
            let error_text = response
                .text()
                .await
                .unwrap_or_else(|_| "Unknown error".to_string());
            return Err(format!("Token refresh failed {}: {}", status, error_text));
        }

        let token_resp: TokenResponse = response
            .json()
            .await
            .map_err(|e| format!("Failed to parse token response: {}", e))?;

        // Calculate expiry timestamp
        let expires_at = chrono::Utc::now().timestamp() + token_resp.expires_in;

        Ok(OAuthTokens {
            access_token: token_resp.access_token,
            refresh_token: token_resp.refresh_token.or_else(|| Some(refresh_token.to_string())),
            expires_at,
            id_token: token_resp.id_token,
            scope: token_resp.scope,
        })
    }

    /// Revoke an OAuth token (logout)
    ///
    /// # Arguments
    /// * `token` - Access or refresh token to revoke
    pub async fn revoke_token(&self, token: &str) -> Result<(), String> {
        let params = [("token", token)];

        let response = self
            .client
            .post(GOOGLE_REVOKE_ENDPOINT)
            .form(&params)
            .send()
            .await
            .map_err(|e| format!("Failed to revoke token: {}", e))?;

        if !response.status().is_success() {
            let status = response.status();
            return Err(format!("Token revocation failed: {}", status));
        }

        Ok(())
    }

    /// Detect user tier from OAuth scopes
    ///
    /// # Returns
    /// "FREE", "PRO", or "UNLIMITED" based on detected scopes
    pub fn detect_tier_from_scopes(scopes: Option<&str>) -> String {
        let scopes_str = scopes.unwrap_or("");

        // Check for premium indicators in scopes
        // This is placeholder logic - actual detection depends on your API
        if scopes_str.contains("premium") || scopes_str.contains("pro") {
            "PRO".to_string()
        } else if scopes_str.contains("unlimited") || scopes_str.contains("enterprise") {
            "UNLIMITED".to_string()
        } else {
            "FREE".to_string()
        }
    }
}

impl Default for GoogleApiService {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_tier_detection() {
        assert_eq!(
            GoogleApiService::detect_tier_from_scopes(Some("email profile")),
            "FREE"
        );
        assert_eq!(
            GoogleApiService::detect_tier_from_scopes(Some("email profile premium")),
            "PRO"
        );
        assert_eq!(
            GoogleApiService::detect_tier_from_scopes(Some("unlimited drive")),
            "UNLIMITED"
        );
        assert_eq!(GoogleApiService::detect_tier_from_scopes(None), "FREE");
    }
}
