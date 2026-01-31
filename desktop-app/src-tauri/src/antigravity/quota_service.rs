// QuotaService: Fetches quota data from Antigravity Language Server
// Ported from Antigravity Toolkit (TypeScript → Rust)

use serde::{Deserialize, Serialize};
use std::time::Duration;
use crate::antigravity::types::LanguageServerInfo;

// ============================================================================
// Response Structures (from server API)
// ============================================================================

#[derive(Debug, Deserialize)]
struct ServerUserStatusResponse {
    #[serde(rename = "userStatus")]
    user_status: UserStatus,
}

#[derive(Debug, Deserialize)]
struct UserStatus {
    name: Option<String>,
    email: Option<String>,
    #[serde(rename = "userTier")]
    user_tier: Option<UserTier>,
    #[serde(rename = "planStatus")]
    plan_status: Option<PlanStatus>,
    #[serde(rename = "cascadeModelConfigData")]
    cascade_model_config_data: Option<CascadeModelConfigData>,
}

#[derive(Debug, Deserialize)]
struct UserTier {
    id: Option<String>,
    name: Option<String>,
    description: Option<String>,
    #[serde(rename = "upgradeSubscriptionUri")]
    upgrade_subscription_uri: Option<String>,
    #[serde(rename = "upgradeSubscriptionText")]
    upgrade_subscription_text: Option<String>,
}

#[derive(Debug, Deserialize)]
struct PlanStatus {
    #[serde(rename = "planInfo")]
    plan_info: PlanInfo,
    #[serde(rename = "availablePromptCredits")]
    available_prompt_credits: i64,
    #[serde(rename = "availableFlowCredits")]
    available_flow_credits: Option<i64>,
}

#[derive(Debug, Deserialize)]
struct PlanInfo {
    #[serde(rename = "monthlyPromptCredits")]
    monthly_prompt_credits: i64,
    #[serde(rename = "monthlyFlowCredits")]
    monthly_flow_credits: Option<i64>,
    #[serde(rename = "planName")]
    plan_name: Option<String>,
    #[serde(rename = "teamsTier")]
    teams_tier: Option<String>,
    #[serde(rename = "browserEnabled")]
    browser_enabled: Option<bool>,
    #[serde(rename = "knowledgeBaseEnabled")]
    knowledge_base_enabled: Option<bool>,
    #[serde(rename = "canBuyMoreCredits")]
    can_buy_more_credits: Option<bool>,
}

#[derive(Debug, Deserialize)]
struct CascadeModelConfigData {
    #[serde(rename = "clientModelConfigs")]
    client_model_configs: Vec<RawModelConfig>,
}

#[derive(Debug, Deserialize)]
struct RawModelConfig {
    label: String,
    #[serde(rename = "modelOrAlias")]
    model_or_alias: Option<ModelOrAlias>,
    #[serde(rename = "quotaInfo")]
    quota_info: Option<QuotaInfo>,
}

#[derive(Debug, Deserialize)]
struct ModelOrAlias {
    model: String,
}

#[derive(Debug, Deserialize)]
struct QuotaInfo {
    #[serde(rename = "remainingFraction")]
    remaining_fraction: Option<f64>,
    #[serde(rename = "resetTime")]
    reset_time: String,
}

// ============================================================================
// Public Output Structures (for Tauri frontend)
// ============================================================================

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct QuotaSnapshot {
    pub timestamp: String, // ISO 8601
    pub prompt_credits: Option<PromptCreditsInfo>,
    pub flow_credits: Option<FlowCreditsInfo>,
    pub token_usage: Option<TokenUsageInfo>,
    pub user_info: Option<UserInfo>,
    pub models: Vec<ModelQuotaInfo>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PromptCreditsInfo {
    pub available: i64,
    pub monthly: i64,
    pub used_percentage: f64,
    pub remaining_percentage: f64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct FlowCreditsInfo {
    pub available: i64,
    pub monthly: i64,
    pub used_percentage: f64,
    pub remaining_percentage: f64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TokenUsageInfo {
    pub prompt_credits: Option<PromptCreditsInfo>,
    pub flow_credits: Option<FlowCreditsInfo>,
    pub total_available: i64,
    pub total_monthly: i64,
    pub overall_remaining_percentage: f64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct UserInfo {
    pub name: Option<String>,
    pub email: Option<String>,
    pub tier: Option<String>,
    pub tier_id: Option<String>,
    pub tier_description: Option<String>,
    pub plan_name: Option<String>,
    pub teams_tier: Option<String>,
    pub upgrade_uri: Option<String>,
    pub upgrade_text: Option<String>,
    pub browser_enabled: Option<bool>,
    pub knowledge_base_enabled: Option<bool>,
    pub can_buy_more_credits: Option<bool>,
    pub monthly_prompt_credits: Option<i64>,
    pub available_prompt_credits: Option<i64>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ModelQuotaInfo {
    pub label: String,
    pub model_id: String,
    pub remaining_percentage: f64,
    pub is_exhausted: bool,
    pub reset_time: String, // ISO 8601
    pub time_until_reset: String, // Human-readable (e.g., "45m", "2h 30m")
}

// ============================================================================
// QuotaService Implementation
// ============================================================================

pub struct QuotaService {
    api_path: String,
}

impl QuotaService {
    pub fn new() -> Self {
        Self {
            api_path: "/exa.language_server_pb.LanguageServerService/GetUserStatus".to_string(),
        }
    }
    
    /// Fetch quota with retry (2 attempts)
    pub async fn fetch_quota(&self, server_info: &LanguageServerInfo) -> Result<QuotaSnapshot, String> {
        // Try once, if fails try again after 1s delay
        match self.do_fetch_quota(server_info).await {
            Ok(snapshot) => Ok(snapshot),
            Err(e) => {
                eprintln!("QuotaService: First attempt failed ({}), retrying...", e);
                tokio::time::sleep(Duration::from_secs(1)).await;
                self.do_fetch_quota(server_info).await
            }
        }
    }
    
    /// Single fetch attempt
    async fn do_fetch_quota(&self, server_info: &LanguageServerInfo) -> Result<QuotaSnapshot, String> {
        let response = self.request::<ServerUserStatusResponse>(
            server_info,
            serde_json::json!({
                "metadata": {
                    "ideName": "antigravity",
                    "extensionName": "antigravity",
                    "locale": "en"
                }
            })
        ).await?;
        
        // Check for auth errors
        if response.status_code == 401 || response.status_code == 403 {
            return Err(format!("AUTH_FAILED_{}", response.status_code));
        }
        
        if response.status_code != 200 {
            return Err(format!("HTTP_ERROR_{}", response.status_code));
        }
        
        let data = response.data.ok_or("No response data")?;
        
        self.parse_response(data)
    }
    
    /// Send HTTP request with HTTPS → HTTP fallback
    async fn request<T: for<'de> Deserialize<'de>>(
        &self,
        server_info: &LanguageServerInfo,
        body: serde_json::Value
    ) -> Result<HttpResponse<T>, String> {
        let host = "127.0.0.1";
        let port = server_info.port;
        
        // Try HTTPS first
        let https_url = format!("https://{}:{}{}", host, port, self.api_path);
        let https_result = self.send_request::<T>(&https_url, &server_info.csrf_token, &body).await;
        
        if https_result.is_ok() {
            return https_result;
        }
        
        // Fallback to HTTP
        let http_url = format!("http://{}:{}{}", host, port, self.api_path);
        self.send_request::<T>(&http_url, &server_info.csrf_token, &body).await
    }
    
    /// Actually send HTTP request
    async fn send_request<T: for<'de> Deserialize<'de>>(
        &self,
        url: &str,
        csrf_token: &str,
        body: &serde_json::Value
    ) -> Result<HttpResponse<T>, String> {
        let client = reqwest::Client::builder()
            .danger_accept_invalid_certs(true)
            .timeout(Duration::from_secs(5))
            .build()
            .map_err(|e| format!("Failed to create HTTP client: {}", e))?;
        
        let response = client
            .post(url)
            .header("Connect-Protocol-Version", "1")
            .header("X-Codeium-Csrf-Token", csrf_token)
            .header("Content-Type", "application/json")
            .json(body)
            .send()
            .await
            .map_err(|e| format!("Request failed: {}", e))?;
        
        let status_code = response.status().as_u16();
        
        if status_code == 200 {
            let data: T = response.json().await
                .map_err(|e| format!("Failed to parse JSON: {}", e))?;
            
            Ok(HttpResponse {
                status_code,
                data: Some(data),
            })
        } else {
            Ok(HttpResponse {
                status_code,
                data: None,
            })
        }
    }
    
    /// Parse server response into QuotaSnapshot
    fn parse_response(&self, data: ServerUserStatusResponse) -> Result<QuotaSnapshot, String> {
        let user_status = data.user_status;
        
        // Parse prompt credits
        let mut prompt_credits = None;
        if let Some(plan_status) = &user_status.plan_status {
            let monthly = plan_status.plan_info.monthly_prompt_credits;
            let available = plan_status.available_prompt_credits;
            
            if monthly > 0 {
                let used_percentage = ((monthly - available) as f64 / monthly as f64) * 100.0;
                let remaining_percentage = (available as f64 / monthly as f64) * 100.0;
                
                prompt_credits = Some(PromptCreditsInfo {
                    available,
                    monthly,
                    used_percentage,
                    remaining_percentage,
                });
            }
        }
        
        // Parse flow credits
        let mut flow_credits = None;
        if let Some(plan_status) = &user_status.plan_status {
            if let (Some(monthly), Some(available)) = (
                plan_status.plan_info.monthly_flow_credits,
                plan_status.available_flow_credits
            ) {
                if monthly > 0 {
                    let used_percentage = ((monthly - available) as f64 / monthly as f64) * 100.0;
                    let remaining_percentage = (available as f64 / monthly as f64) * 100.0;
                    
                    flow_credits = Some(FlowCreditsInfo {
                        available,
                        monthly,
                        used_percentage,
                        remaining_percentage,
                    });
                }
            }
        }
        
        // Build token usage
        let token_usage = if prompt_credits.is_some() || flow_credits.is_some() {
            let total_available = prompt_credits.as_ref().map(|c| c.available).unwrap_or(0)
                + flow_credits.as_ref().map(|c| c.available).unwrap_or(0);
            let total_monthly = prompt_credits.as_ref().map(|c| c.monthly).unwrap_or(0)
                + flow_credits.as_ref().map(|c| c.monthly).unwrap_or(0);
            
            let overall_remaining_percentage = if total_monthly > 0 {
                (total_available as f64 / total_monthly as f64) * 100.0
            } else {
                0.0
            };
            
            Some(TokenUsageInfo {
                prompt_credits: prompt_credits.clone(),
                flow_credits: flow_credits.clone(),
                total_available,
                total_monthly,
                overall_remaining_percentage,
            })
        } else {
            None
        };
        
        // Extract user info
        let user_info = if user_status.name.is_some() || user_status.user_tier.is_some() {
            let tier_name = user_status.user_tier.as_ref()
                .and_then(|t| t.name.clone())
                .or_else(|| user_status.plan_status.as_ref()
                    .and_then(|ps| ps.plan_info.teams_tier.clone()));
            
            Some(UserInfo {
                name: user_status.name.clone(),
                email: user_status.email.clone(),
                tier: tier_name,
                tier_id: user_status.user_tier.as_ref().and_then(|t| t.id.clone()),
                tier_description: user_status.user_tier.as_ref().and_then(|t| t.description.clone()),
                plan_name: user_status.plan_status.as_ref().map(|ps| ps.plan_info.plan_name.clone()).flatten(),
                teams_tier: user_status.plan_status.as_ref().map(|ps| ps.plan_info.teams_tier.clone()).flatten(),
                upgrade_uri: user_status.user_tier.as_ref().and_then(|t| t.upgrade_subscription_uri.clone()),
                upgrade_text: user_status.user_tier.as_ref().and_then(|t| t.upgrade_subscription_text.clone()),
                browser_enabled: user_status.plan_status.as_ref().and_then(|ps| ps.plan_info.browser_enabled),
                knowledge_base_enabled: user_status.plan_status.as_ref().and_then(|ps| ps.plan_info.knowledge_base_enabled),
                can_buy_more_credits: user_status.plan_status.as_ref().and_then(|ps| ps.plan_info.can_buy_more_credits),
                monthly_prompt_credits: user_status.plan_status.as_ref().map(|ps| ps.plan_info.monthly_prompt_credits),
                available_prompt_credits: user_status.plan_status.as_ref().map(|ps| ps.available_prompt_credits),
            })
        } else {
            None
        };
        
        // Parse model quotas
        let models = if let Some(cascade_data) = user_status.cascade_model_config_data {
            cascade_data.client_model_configs.iter()
                .filter(|m| m.quota_info.is_some())
                .map(|m| {
                    let quota_info = m.quota_info.as_ref().unwrap();
                    let remaining_fraction = quota_info.remaining_fraction.unwrap_or(0.0);
                    let remaining_percentage = remaining_fraction * 100.0;
                    let is_exhausted = remaining_fraction == 0.0;
                    
                    // Parse reset time
                    let reset_time = quota_info.reset_time.clone();
                    let time_until_reset = self.calculate_time_until_reset(&reset_time);
                    
                    ModelQuotaInfo {
                        label: m.label.clone(),
                        model_id: m.model_or_alias.as_ref()
                            .map(|ma| ma.model.clone())
                            .unwrap_or_else(|| "unknown".to_string()),
                        remaining_percentage,
                        is_exhausted,
                        reset_time,
                        time_until_reset,
                    }
                })
                .collect()
        } else {
            Vec::new()
        };
        
        Ok(QuotaSnapshot {
            timestamp: chrono::Utc::now().to_rfc3339(),
            prompt_credits,
            flow_credits,
            token_usage,
            user_info,
            models,
        })
    }
    
    /// Calculate human-readable time until reset
    fn calculate_time_until_reset(&self, reset_time_str: &str) -> String {
        use chrono::{DateTime, Utc};
        
        let reset_time = match DateTime::parse_from_rfc3339(reset_time_str) {
            Ok(dt) => dt.with_timezone(&Utc),
            Err(_) => return "Unknown".to_string(),
        };
        
        let now = Utc::now();
        let diff = reset_time.signed_duration_since(now);
        
        if diff.num_milliseconds() <= 0 {
            return "Ready".to_string();
        }
        
        let mins = diff.num_minutes();
        if mins < 60 {
            return format!("{}m", mins);
        }
        
        let hours = mins / 60;
        let remaining_mins = mins % 60;
        format!("{}h {}m", hours, remaining_mins)
    }
}

impl Default for QuotaService {
    fn default() -> Self {
        Self::new()
    }
}

// ============================================================================
// Helper Structures
// ============================================================================

struct HttpResponse<T> {
    status_code: u16,
    data: Option<T>,
}
