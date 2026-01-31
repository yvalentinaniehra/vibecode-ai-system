/// OAuth HTTP Server - Local callback server for OAuth flow
///
/// Starts a temporary HTTP server on localhost to receive OAuth callbacks

use tiny_http::{Server, Response, Request};
use std::{sync::mpsc, thread, time::Duration};
use serde_urlencoded;

/// OAuth callback result
pub struct OAuthCallback {
    pub code: String,
    pub state: Option<String>,
}

/// Error during OAuth callback
#[derive(Debug)]
pub enum CallbackError {
    ServerError(String),
    NoCodeReceived,
    UserCancelled,
    Timeout,
}

impl std::fmt::Display for CallbackError {
    fn fmt(&self, f: &mut std::fmt::Formatter) -> std::fmt::Result {
        match self {
            CallbackError::ServerError(msg) => write!(f, "Server error: {}", msg),
            CallbackError::NoCodeReceived => write!(f, "No authorization code received"),
            CallbackError::UserCancelled => write!(f, "User cancelled authorization"),
            CallbackError::Timeout => write!(f, "OAuth callback timeout"),
        }
    }
}

pub struct OAuthServer;

impl OAuthServer {
    const SUCCESS_HTML: &'static str = r#"
        <!DOCTYPE html>
        <html>
        <head>
            <title>Authentication Successful</title>
            <style>
                body { font-family: -apple-system, system-ui, sans-serif; text-align: center; padding: 50px; }
                .success { color: #10b981; font-size: 24px; margin-bottom: 20px; }
                .message { color: #6b7280; }
            </style>
        </head>
        <body>
            <div class="success">✓ Authentication Successful!</div>
            <div class="message">You can close this window and return to the app.</div>
        </body>
        </html>
    "#;

    const ERROR_HTML: &'static str = r#"
        <!DOCTYPE html>
        <html>
        <head>
            <title>Authentication Failed</title>
            <style>
                body { font-family: -apple-system, system-ui, sans-serif; text-align: center; padding: 50px; }
                .error { color: #ef4444; font-size: 24px; margin-bottom: 20px; }
                .message { color: #6b7280; }
            </style>
        </head>
        <body>
            <div class="error">✗ Authentication Failed</div>
            <div class="message">Please try again or contact support.</div>
        </body>
        </html>
    "#;

    /// Start OAuth callback server and wait for authorization code
    ///
    /// # Arguments
    /// * `port` - Port to listen on (e.g., 3000)
    /// * `timeout_secs` - Maximum seconds to wait for callback
    ///
    /// # Returns
    /// Authorization code and optional state parameter
    pub fn start_and_wait(
        port: u16,
        timeout_secs: u64,
    ) -> Result<OAuthCallback, CallbackError> {
        // Create channel for communication
        let (tx, rx) = mpsc::channel();

        // Spawn server thread
        let server_handle = thread::spawn(move || {
            Self::run_server(port, tx)
        });

        // Wait for callback with timeout
        match rx.recv_timeout(Duration::from_secs(timeout_secs)) {
            Ok(result) => {
                // Server thread will finish after sending
                let _ = server_handle.join();
                result
            }
            Err(mpsc::RecvTimeoutError::Timeout) => {
                Err(CallbackError::Timeout)
            }
            Err(mpsc::RecvTimeoutError::Disconnected) => {
                Err(CallbackError::ServerError("Channel disconnected".to_string()))
            }
        }
    }

    /// Run the HTTP server
    fn run_server(
        port: u16,
        tx: mpsc::Sender<Result<OAuthCallback, CallbackError>>,
    ) {
        let server = match Server::http(format!("127.0.0.1:{}", port)) {
            Ok(s) => s,
            Err(e) => {
                let _ = tx.send(Err(CallbackError::ServerError(e.to_string())));
                return;
            }
        };

        // Wait for ONE request
        if let Ok(request) = server.recv() {
            let result = Self::handle_request(request);
            let _ = tx.send(result);
        } else {
            let _ = tx.send(Err(CallbackError::ServerError("No request received".to_string())));
        }
    }

    /// Handle incoming OAuth callback request
    fn handle_request(mut request: Request) -> Result<OAuthCallback, CallbackError> {
        let url = request.url();

        // Parse query parameters
        let query_start = url.find('?').map(|i| i + 1).unwrap_or(url.len());
        let query_str = &url[query_start..];

        // Parse as URL-encoded
        let params: Vec<(String, String)> = serde_urlencoded::from_str(query_str)
            .unwrap_or_default();

        // Extract code and state
        let code = params
            .iter()
            .find(|(k, _)| k == "code")
            .map(|(_, v)| v.clone());

        let state = params
            .iter()
            .find(|(k, _)| k == "state")
            .map(|(_, v)| v.clone());

        let error = params
            .iter()
            .find(|(k, _)| k == "error")
            .map(|(_, v)| v.clone());

        // Send response to browser
        if code.is_some() {
            let response = Response::from_string(Self::SUCCESS_HTML)
                .with_header(
                    tiny_http::Header::from_bytes(&b"Content-Type"[..], &b"text/html"[..]).unwrap()
                );
            let _ = request.respond(response);

            Ok(OAuthCallback {
                code: code.unwrap(),
                state,
            })
        } else if error.is_some() {
            let response = Response::from_string(Self::ERROR_HTML)
                .with_header(
                    tiny_http::Header::from_bytes(&b"Content-Type"[..], &b"text/html"[..]).unwrap()
                );
            let _ = request.respond(response);

            Err(CallbackError::UserCancelled)
        } else {
            Err(CallbackError::NoCodeReceived)
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_query_parsing() {
        // Simulated query string
        let query = "code=test_code&state=test_state";
        let params: Vec<(String, String)> = serde_urlencoded::from_str(query).unwrap();
        
        assert_eq!(params.len(), 2);
        assert!(params.iter().any(|(k, v)| k == "code" && v == "test_code"));
        assert!(params.iter().any(|(k, v)| k == "state" && v == "test_state"));
    }
}
