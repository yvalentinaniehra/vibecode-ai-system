/**
 * useDashboardData - Custom hook for Dashboard data fetching and transformations
 * Consolidates all data-related logic from Dashboard.tsx
 */
import { useMemo, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useAntigravityServer, useQuotaData, useAccounts, useOAuth } from '../../../hooks';
import { useDashboardStore, useDashboardActions } from '../../../stores';
import {
    AgentData,
    QuotaDisplayItem,
    TokenUsageData,
} from '../../../types';
import { mockQuotas, mockTokenUsage, mockChartData } from '../mockData';

// Helper functions
const getModelColor = (modelId: string): string => {
    if (modelId.includes('gemini') || modelId.includes('g3')) return '#4285f4';
    if (modelId.includes('claude')) return '#8b5cf6';
    if (modelId.includes('gpt')) return '#22c55e';
    return '#6b7280';
};

const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
};

export function useDashboardData() {
    const { setStats, showNotification } = useDashboardActions();
    const stats = useDashboardStore((s) => s.stats);

    // Server & Quota hooks
    const { serverInfo, isDetecting, error: serverError, detect } = useAntigravityServer();
    const { quotaData, isLoading: quotaLoading, error: quotaError, fetchQuota, lastUpdate } = useQuotaData({
        serverInfo,
        autoRefresh: true,
        refreshInterval: 60000,
    });

    // Account hooks
    const { accounts, addAccount, removeAccount, fetchAccounts } = useAccounts();
    const { signInWithGoogle, loading: oauthLoading, error: oauthError } = useOAuth();

    // Load stats
    const loadStats = useCallback(async () => {
        try {
            const result = await invoke<string>('get_stats');
            setStats(result);
        } catch (error) {
            console.error('Failed to load stats:', error);
        }
    }, [setStats]);

    // Transform accounts to AgentData
    const agents: AgentData[] = useMemo(() => {
        const serverEmail = quotaData?.user_info?.email;
        const modelQuotas = quotaData?.models?.map(model => ({
            name: model.label,
            usage: Math.round(model.remaining_percentage),
        })) || [];

        return accounts.map(account => ({
            id: account.id,
            email: account.email,
            isPro: account.tier !== 'FREE',
            isActive: serverEmail ? account.email.toLowerCase() === serverEmail.toLowerCase() : false,
            models: serverEmail && account.email.toLowerCase() === serverEmail.toLowerCase()
                ? modelQuotas
                : [],
            lastUpdated: account.lastSeen
                ? new Date(account.lastSeen).toLocaleString('vi-VN')
                : 'Chưa cập nhật',
        }));
    }, [accounts, quotaData]);

    // Transform quota data
    const quotaItems: QuotaDisplayItem[] = useMemo(() => {
        if (!quotaData || !quotaData.models || quotaData.models.length === 0) {
            return mockQuotas;
        }
        return quotaData.models.map(model => ({
            id: model.model_id,
            label: model.label,
            type: 'model' as const,
            remaining: model.remaining_percentage,
            resetTime: model.time_until_reset,
            hasData: true,
            themeColor: getModelColor(model.model_id),
        }));
    }, [quotaData]);

    // Transform token data
    const tokenData: TokenUsageData = useMemo(() => {
        if (!quotaData || !quotaData.token_usage) {
            return mockTokenUsage;
        }
        const usage = quotaData.token_usage;
        return {
            promptCredits: usage.prompt_credits ? {
                available: usage.prompt_credits.available,
                monthly: usage.prompt_credits.monthly,
                usedPercentage: usage.prompt_credits.used_percentage,
                remainingPercentage: usage.prompt_credits.remaining_percentage,
            } : undefined,
            flowCredits: usage.flow_credits ? {
                available: usage.flow_credits.available,
                monthly: usage.flow_credits.monthly,
                usedPercentage: usage.flow_credits.used_percentage,
                remainingPercentage: usage.flow_credits.remaining_percentage,
            } : undefined,
            totalAvailable: usage.total_available,
            totalMonthly: usage.total_monthly,
            overallRemainingPercentage: usage.overall_remaining_percentage,
            formatted: {
                promptAvailable: formatNumber(usage.prompt_credits?.available ?? 0),
                promptMonthly: formatNumber(usage.prompt_credits?.monthly ?? 0),
                flowAvailable: formatNumber(usage.flow_credits?.available ?? 0),
                flowMonthly: formatNumber(usage.flow_credits?.monthly ?? 0),
                totalAvailable: formatNumber(usage.total_available),
                totalMonthly: formatNumber(usage.total_monthly),
            },
        };
    }, [quotaData]);

    // Show error notifications
    useEffect(() => {
        if (serverError) showNotification(`⚠️ Server failed: ${serverError}`, 'error');
    }, [serverError, showNotification]);

    useEffect(() => {
        if (quotaError) showNotification(`⚠️ Quota failed: ${quotaError}`, 'error');
    }, [quotaError, showNotification]);

    // Load on mount
    useEffect(() => {
        loadStats();
    }, [loadStats]);

    return {
        // Stats
        stats,
        loadStats,

        // Server
        serverInfo,
        isDetecting,
        serverError,
        detect,

        // Quota
        quotaData,
        quotaLoading,
        quotaError,
        fetchQuota,
        lastUpdate,
        quotaItems,
        tokenData,
        chartData: mockChartData,

        // Accounts
        accounts,
        agents,
        addAccount,
        removeAccount,
        fetchAccounts,

        // OAuth
        signInWithGoogle,
        oauthLoading,
        oauthError,

        // Notification helper
        showNotification,
    };
}
