// Antigravity Backend Types (matches Rust backend)
// Source: desktop-app/src-tauri/src/antigravity/*

export interface LanguageServerInfo {
    port: number;
    csrf_token: string;
}

export interface DetectOptions {
    attempts: number;
    base_delay: number;
    verbose: boolean;
}

// Quota Response Types
export interface PromptCreditsInfo {
    available: number;
    monthly: number;
    used_percentage: number;
    remaining_percentage: number;
}

export interface FlowCreditsInfo {
    available: number;
    monthly: number;
    used_percentage: number;
    remaining_percentage: number;
}

export interface TokenUsageInfo {
    prompt_credits: PromptCreditsInfo | null;
    flow_credits: FlowCreditsInfo | null;
    total_available: number;
    total_monthly: number;
    overall_remaining_percentage: number;
}

export interface UserInfo {
    name: string | null;
    email: string | null;
    tier: string | null;
    tier_id: string | null;
    tier_description: string | null;
    plan_name: string | null;
    teams_tier: string | null;
    upgrade_uri: string | null;
    upgrade_text: string | null;
    browser_enabled: boolean | null;
    knowledge_base_enabled: boolean | null;
    can_buy_more_credits: boolean | null;
    monthly_prompt_credits: number | null;
    available_prompt_credits: number | null;
}

export interface ModelQuotaInfo {
    label: string;
    model_id: string;
    remaining_percentage: number;
    is_exhausted: boolean;
    reset_time: string; // ISO 8601
    time_until_reset: string; // "45m", "2h 30m"
}

export interface QuotaSnapshot {
    timestamp: string;
    prompt_credits: PromptCreditsInfo | null;
    flow_credits: FlowCreditsInfo | null;
    token_usage: TokenUsageInfo | null;
    user_info: UserInfo | null;
    models: ModelQuotaInfo[];
}
