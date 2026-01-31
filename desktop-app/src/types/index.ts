// Types for AntiGravitytool integration
// Adapted from AntiGravitytool/src/view/webview/types.ts

export interface QuotaDisplayItem {
    id: string;
    label: string;
    type: 'group' | 'model';
    remaining: number; // 0-100 percentage
    resetTime: string;
    hasData: boolean;
    themeColor: string;
    subLabel?: string;
}

export interface BucketItem {
    groupId: string;
    usage: number;
    color: string;
}

export interface UsageBucket {
    startTime: number;
    endTime: number;
    items: BucketItem[];
}

export interface UsageChartData {
    buckets: UsageBucket[];
    maxUsage: number;
    displayMinutes: number;
    interval: number;
    prediction?: {
        groupId: string;
        groupLabel: string;
        usageRate: number;
        runway: string;
        remaining: number;
    };
}

export interface FileItem {
    name: string;
    path: string;
}

export interface FolderItem {
    id: string;
    label: string;
    size: string;
    files: FileItem[];
    expanded?: boolean;
}

export interface TreeSectionState {
    title: string;
    stats: string;
    collapsed: boolean;
    folders: FolderItem[];
    loading?: boolean;
}

export interface UserInfoData {
    name?: string;
    email?: string;
    tier?: string;
    tierDescription?: string;
    planName?: string;
    browserEnabled?: boolean;
    knowledgeBaseEnabled?: boolean;
    upgradeUri?: string;
    upgradeText?: string;
}

// Account Management Types (Phase 3.1)
export interface SavedAccount {
    id: string; // UUID
    email: string;
    picture?: string; // Avatar URL
    name?: string; // Display name
    tier: string; // "FREE" | "PRO" | "UNLIMITED"
    planName?: string; // e.g. "Gemini Advanced"
    lastSeen: number; // Unix timestamp (ms)
}

export interface TokenUsageData {
    promptCredits?: {
        available: number;
        monthly: number;
        usedPercentage: number;
        remainingPercentage: number;
    };
    flowCredits?: {
        available: number;
        monthly: number;
        usedPercentage: number;
        remainingPercentage: number;
    };
    totalAvailable: number;
    totalMonthly: number;
    overallRemainingPercentage: number;
    formatted: {
        promptAvailable: string;
        promptMonthly: string;
        flowAvailable: string;
        flowMonthly: string;
        totalAvailable: string;
        totalMonthly: string;
    };
}

export interface CacheData {
    totalSize: number;
    brainSize: number;
    conversationsSize: number;
    brainCount: number;
    formattedTotal: string;
    formattedBrain: string;
    formattedConversations: string;
}

export interface SavedAccount {
    id: string;
    email: string;
    tier: string;
    avatarUrl?: string;
    lastUsed?: number;
}

// Vibecode specific types
export interface AgentData {
    id: string;
    email: string;
    isPro: boolean;
    isActive: boolean;
    models: {
        name: string;
        usage: number;
    }[];
    lastUpdated: string;
}

export interface WorkflowData {
    id: string;
    name: string;
    description: string;
    status: 'idle' | 'running' | 'completed' | 'error';
    lastRun?: string;
}

export interface TaskData {
    id: string;
    description: string;
    agent: string;
    status: 'pending' | 'running' | 'completed' | 'failed';
    result?: string;
    timestamp: string;
}

// Re-export Antigravity backend types
export * from './antigravity';
