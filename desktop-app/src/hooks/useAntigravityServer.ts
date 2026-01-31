// React hook for Antigravity server detection
import { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { LanguageServerInfo } from '../types/antigravity';

interface UseAntigravityServerResult {
    serverInfo: LanguageServerInfo | null;
    isDetecting: boolean;
    error: string | null;
    detect: () => Promise<void>;
}

/**
 * Hook to manage Antigravity IDE server detection
 * Automatically detects on mount, can be manually triggered
 */
export function useAntigravityServer(): UseAntigravityServerResult {
    const [serverInfo, setServerInfo] = useState<LanguageServerInfo | null>(null);
    const [isDetecting, setIsDetecting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const detect = useCallback(async () => {
        setIsDetecting(true);
        setError(null);

        try {
            const info = await invoke<LanguageServerInfo>('detect_antigravity_server');
            setServerInfo(info);
            console.log('✅ Antigravity server detected:', info);
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : String(err);
            setError(errorMsg);
            setServerInfo(null);
            console.error('❌ Failed to detect Antigravity server:', errorMsg);
        } finally {
            setIsDetecting(false);
        }
    }, []);

    // Auto-detect on mount
    useEffect(() => {
        detect();
    }, [detect]);

    return {
        serverInfo,
        isDetecting,
        error,
        detect,
    };
}
