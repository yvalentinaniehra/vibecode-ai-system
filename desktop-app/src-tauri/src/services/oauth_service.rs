/// OAuth Service - Handles Google OAuth 2.0 authentication
/// 
/// Implements PKCE flow, token encryption, and token lifecycle management

use serde::{Deserialize, Serialize};
use ring::aead::{Aad, LessSafeKey, Nonce, UnboundKey, AES_256_GCM};
use ring::rand::{SecureRandom, SystemRandom};
use base64::{engine::general_purpose::URL_SAFE_NO_PAD, Engine as _};
use rand::Rng;
use sha2::{Digest, Sha256};

/// OAuth tokens received from Google
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OAuthTokens {
    pub access_token: String,
    pub refresh_token: Option<String>,
    pub expires_at: i64, // Unix timestamp (seconds)
    pub id_token: Option<String>,
    pub scope: Option<String>,
}

/// PKCE challenge pair
#[derive(Debug, Clone)]
pub struct PkceChallenge {
    pub verifier: String,
    pub challenge: String,
}

pub struct OAuthService;

impl OAuthService {
    /// Generate PKCE code verifier and challenge
    /// 
    /// Verifier: 128 random chars (A-Za-z0-9-._~)
    /// Challenge: base64url(sha256(verifier))
    pub fn generate_pkce() -> PkceChallenge {
        // Generate random 128-char verifier
        let verifier: String = rand::thread_rng()
            .sample_iter(&rand::distributions::Alphanumeric)
            .take(128)
            .map(char::from)
            .collect();

        // Create SHA256 hash
        let mut hasher = Sha256::new();
        hasher.update(verifier.as_bytes());
        let hash = hasher.finalize();

        // Base64url encode (no padding)
        let challenge = URL_SAFE_NO_PAD.encode(hash);

        PkceChallenge { verifier, challenge }
    }

    /// Encrypt tokens using AES-256-GCM
    /// 
    /// # Arguments
    /// * `tokens` - The OAuth tokens to encrypt
    /// * `key` - 32-byte encryption key
    /// 
    /// # Returns
    /// Encrypted data: [nonce (12 bytes) | ciphertext | tag (16 bytes)]
    pub fn encrypt_tokens(tokens: &OAuthTokens, key: &[u8; 32]) -> Result<Vec<u8>, String> {
        let rng = SystemRandom::new();
        
        // Generate random nonce (12 bytes for GCM)
        let mut nonce_bytes = [0u8; 12];
        rng.fill(&mut nonce_bytes)
            .map_err(|_| "Failed to generate nonce")?;
        
        let nonce = Nonce::assume_unique_for_key(nonce_bytes);
        
        // Serialize tokens to JSON
        let plaintext = serde_json::to_vec(tokens)
            .map_err(|e| format!("Failed to serialize tokens: {}", e))?;
        
        // Create encryption key
        let unbound_key = UnboundKey::new(&AES_256_GCM, key)
            .map_err(|_| "Failed to create encryption key")?;
        let sealing_key = LessSafeKey::new(unbound_key);
        
        // Encrypt
        let mut in_out = plaintext;
        let tag = sealing_key
            .seal_in_place_separate_tag(nonce, Aad::empty(), &mut in_out)
            .map_err(|_| "Encryption failed")?;
        
        // Combine: nonce + ciphertext + tag
        let mut result = Vec::new();
        result.extend_from_slice(&nonce_bytes);
        result.extend_from_slice(&in_out);
        result.extend_from_slice(tag.as_ref());
        
        Ok(result)
    }

    /// Decrypt tokens from encrypted data
    /// 
    /// # Arguments
    /// * `encrypted` - Encrypted data from encrypt_tokens
    /// * `key` - 32-byte encryption key
    pub fn decrypt_tokens(encrypted: &[u8], key: &[u8; 32]) -> Result<OAuthTokens, String> {
        if encrypted.len() < 28 {
            return Err("Invalid encrypted data".to_string());
        }
        
        // Extract components
        let nonce_bytes: [u8; 12] = encrypted[0..12]
            .try_into()
            .map_err(|_| "Invalid nonce")?;
        let nonce = Nonce::assume_unique_for_key(nonce_bytes);
        
        let ciphertext = &encrypted[12..];
        
        // Create decryption key
        let unbound_key = UnboundKey::new(&AES_256_GCM, key)
            .map_err(|_| "Failed to create decryption key")?;
        let opening_key = LessSafeKey::new(unbound_key);
        
        // Decrypt
        let mut in_out = ciphertext.to_vec();
        let plaintext = opening_key
            .open_in_place(nonce, Aad::empty(), &mut in_out)
            .map_err(|_| "Decryption failed")?;
        
        // Deserialize
        serde_json::from_slice(plaintext)
            .map_err(|e| format!("Failed to deserialize tokens: {}", e))
    }

    /// Check if access token is expired
    pub fn is_token_expired(tokens: &OAuthTokens) -> bool {
        let now = chrono::Utc::now().timestamp();
        now >= tokens.expires_at
    }

    /// Check if token will expire within given seconds
    pub fn will_expire_soon(tokens: &OAuthTokens, within_seconds: i64) -> bool {
        let now = chrono::Utc::now().timestamp();
        (tokens.expires_at - now) <= within_seconds
    }

    /// Generate a device-specific encryption key
    /// 
    /// Uses machine ID + app name to create deterministic key
    pub fn generate_device_key() -> Result<[u8; 32], String> {
        let machine_id = machine_uid::get()
            .map_err(|e| format!("Failed to get machine ID: {}", e))?;
        
        let mut hasher = Sha256::new();
        hasher.update(machine_id.as_bytes());
        hasher.update(b"vibecode-oauth-v1");
        
        let hash = hasher.finalize();
        let key: [u8; 32] = hash.as_slice()
            .try_into()
            .map_err(|_| "Key generation failed")?;
        
        Ok(key)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_pkce_generation() {
        let pkce = OAuthService::generate_pkce();
        assert_eq!(pkce.verifier.len(), 128);
        assert!(!pkce.challenge.is_empty());
    }

    #[test]
    fn test_encryption_decryption() {
        let key = [0u8; 32]; // Test key
        let tokens = OAuthTokens {
            access_token: "test_access".to_string(),
            refresh_token: Some("test_refresh".to_string()),
            expires_at: 1234567890,
            id_token: None,
            scope: Some("email profile".to_string()),
        };

        let encrypted = OAuthService::encrypt_tokens(&tokens, &key).unwrap();
        let decrypted = OAuthService::decrypt_tokens(&encrypted, &key).unwrap();

        assert_eq!(decrypted.access_token, tokens.access_token);
        assert_eq!(decrypted.refresh_token, tokens.refresh_token);
        assert_eq!(decrypted.expires_at, tokens.expires_at);
    }

    #[test]
    fn test_token_expiry() {
        let expired = OAuthTokens {
            access_token: "test".to_string(),
            refresh_token: None,
            expires_at: 946684800, // Year 2000
            id_token: None,
            scope: None,
        };
        assert!(OAuthService::is_token_expired(&expired));

        let valid = OAuthTokens {
            access_token: "test".to_string(),
            refresh_token: None,
            expires_at: chrono::Utc::now().timestamp() + 3600,
            id_token: None,
            scope: None,
        };
        assert!(!OAuthService::is_token_expired(&valid));
    }
}
