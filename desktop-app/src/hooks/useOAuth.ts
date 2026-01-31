import { invoke } from '@tauri-apps/api/core';
import { useState } from 'react';
import type { SavedAccount } from '../types';

/**
 * OAuth Hook - Google authentication integration
 * 
 * Provides methods to sign in with Google, refresh tokens, and revoke accounts
 */
export function useOAuth() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    /**
     * Start Google OAuth flow
     * Opens browser, waits for user authorization, returns SavedAccount
     */
    const signInWithGoogle = async (): Promise<SavedAccount | null> => {
        setLoading(true);
        setError(null);

        try {
            const account = await invoke<SavedAccount>('start_google_oauth');
            return account;
        } catch (err) {
            const errorMessage = err as string;
            setError(errorMessage);
            console.error('OAuth error:', errorMessage);
            return null;
        } finally {
            setLoading(false);
        }
    };

    /**
     * Refresh OAuth token for account
     * Auto-called when token is about to expire
     */
    const refreshToken = async (email: string): Promise<boolean> => {
        try {
            await invoke('refresh_google_token', { email });
            return true;
        } catch (err) {
            console.error('Token refresh error:', err);
            return false;
        }
    };

    /**
     * Revoke Google account and remove from app
     * Deletes tokens from Google and local storage
     */
    const revokeAccount = async (email: string): Promise<boolean> => {
        setLoading(true);
        setError(null);

        try {
            await invoke('revoke_google_account', { email });
            return true;
        } catch (err) {
            const errorMessage = err as string;
            setError(errorMessage);
            console.error('Revoke error:', errorMessage);
            return false;
        } finally {
            setLoading(false);
        }
    };

    return {
        signInWithGoogle,
        refreshToken,
        revokeAccount,
        loading,
        error,
    };
}
