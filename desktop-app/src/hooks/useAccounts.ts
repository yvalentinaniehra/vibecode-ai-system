/**
 * Account Management Hook
 * 
 * Provides account CRUD operations via Tauri commands.
 * Accounts persist across app restarts using Tauri Store.
 */

import { useState, useCallback, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import type { SavedAccount } from '../types';

interface UseAccountsReturn {
    accounts: SavedAccount[];
    loading: boolean;
    error: string | null;
    fetchAccounts: () => Promise<void>;
    addAccount: (account: SavedAccount) => Promise<void>;
    removeAccount: (accountId: string) => Promise<void>;
    syncAccount: (account: SavedAccount) => Promise<void>;
}

export function useAccounts(): UseAccountsReturn {
    const [accounts, setAccounts] = useState<SavedAccount[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchAccounts = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await invoke<SavedAccount[]>('get_saved_accounts');
            setAccounts(data);
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : String(err);
            setError(`Failed to fetch accounts: ${errorMsg}`);
            console.error('Failed to fetch accounts:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    const addAccount = useCallback(async (account: SavedAccount) => {
        try {
            await invoke('add_saved_account', { account });
            await fetchAccounts(); // Refresh list
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : String(err);
            setError(`Failed to add account: ${errorMsg}`);
            throw err; // Re-throw for caller to handle
        }
    }, [fetchAccounts]);

    const removeAccount = useCallback(async (accountId: string) => {
        try {
            await invoke('remove_saved_account', { accountId });
            await fetchAccounts(); // Refresh list
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : String(err);
            setError(`Failed to remove account: ${errorMsg}`);
            throw err;
        }
    }, [fetchAccounts]);

    const syncAccount = useCallback(async (account: SavedAccount) => {
        try {
            await invoke('sync_current_account', { account });
            await fetchAccounts(); // Refresh list
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : String(err);
            setError(`Failed to sync account: ${errorMsg}`);
            throw err;
        }
    }, [fetchAccounts]);

    // Auto-fetch on mount
    useEffect(() => {
        fetchAccounts();
    }, [fetchAccounts]);

    return {
        accounts,
        loading,
        error,
        fetchAccounts,
        addAccount,
        removeAccount,
        syncAccount,
    };
}
