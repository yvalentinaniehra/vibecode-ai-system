// React hook for quota data fetching and auto-refresh
import { useState, useEffect, useCallback, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { QuotaSnapshot, LanguageServerInfo } from '../types/antigravity';

interface UseQuotaDataOptions {
    serverInfo: LanguageServerInfo | null;
    autoRefresh?: boolean;
    refreshInterval?: number; // milliseconds
}

interface UseQuotaDataResult {
    quotaData: QuotaSnapshot | null;
    isLoading: boolean;
    error: string | null;
    fetchQuota: () => Promise<void>;
    lastUpdate: Date | null;
}

/**
 * Hook to manage quota data fetching with auto-refresh
 * @param serverInfo - Detected server info from useAntigravityServer
 * @param autoRefresh - Enable automatic polling (default: true)
 * @param refreshInterval - Polling interval in ms (default: 60000 = 1 minute)
 */
export function useQuotaData({
    serverInfo,
    autoRefresh = true,
    refreshInterval = 60000, // 1 minute default
}: UseQuotaDataOptions): UseQuotaDataResult {
    const [quotaData, setQuotaData] = useState<QuotaSnapshot | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
    const intervalRef = useRef<number | null>(null);

    const fetchQuota = useCallback(async () => {
        if (!serverInfo) {
            setError('Server not detected');
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const data = await invoke<QuotaSnapshot>('fetch_quota', { serverInfo });
            setQuotaData(data);
            setLastUpdate(new Date());
            console.log('✅ Quota data fetched:', data);
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : String(err);
            setError(errorMsg);
            console.error('❌ Failed to fetch quota:', errorMsg);
        } finally {
            setIsLoading(false);
        }
    }, [serverInfo]);

    // Initial fetch when serverInfo becomes available (only once)
    useEffect(() => {
        if (serverInfo) {
            fetchQuota();
        }
        // Only run when serverInfo changes, not on every quotaData update
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [serverInfo]);

    // Auto-refresh polling
    useEffect(() => {
        if (!autoRefresh || !serverInfo) {
            // Clear existing interval if auto-refresh is disabled
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
            return;
        }

        // Set up polling interval
        intervalRef.current = setInterval(() => {
            fetchQuota();
        }, refreshInterval);

        // Cleanup on unmount or when dependencies change
        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        };
    }, [autoRefresh, serverInfo, refreshInterval, fetchQuota]);

    return {
        quotaData,
        isLoading,
        error,
        fetchQuota,
        lastUpdate,
    };
}
