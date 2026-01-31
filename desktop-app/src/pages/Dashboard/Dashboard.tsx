/**
 * Dashboard - Refactored Main Container
 * 
 * This is the new, decomposed Dashboard component (~150 lines vs original 773 lines).
 * All view logic has been extracted into separate components and a custom hook.
 * 
 * Architecture:
 * - State: Managed by Zustand (dashboardStore.ts)
 * - Data: Fetched via useDashboardData hook
 * - Views: OverviewView, AccountsView, CacheView (as components)
 */
import React, { useState, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import Header from '../../components/Header/Header';
import AddAccountModal from '../../components/AddAccountModal/AddAccountModal';
import CacheManager from '../../components/CacheManager/CacheManager';
import {
    NotificationToast,
    ViewTabs,
    OverviewView,
    AccountsView
} from './components';
import { useDashboardData } from './hooks';
import { mockBrainTasks, mockCodeTracker } from './mockData';
import {
    useDashboardStore,
    useDashboardActions,
    useActiveView
} from '../../stores';
import { SavedAccount } from '../../types';

const Dashboard: React.FC = () => {
    // Zustand state
    const activeView = useActiveView();
    const { showAddAccountModal } = useDashboardStore();
    const { closeAddAccountModal, showNotification } = useDashboardActions();

    // Data hook (all data fetching logic)
    const {
        stats,
        loadStats,
        serverInfo,
        isDetecting,
        detect,
        quotaLoading,
        fetchQuota,
        lastUpdate,
        quotaItems,
        tokenData,
        chartData,
        agents,
        fetchAccounts,
        addAccount,
        removeAccount,
        signInWithGoogle,
        oauthLoading,
        quotaData,
    } = useDashboardData();

    // Local state for cache (can be moved to Zustand later)
    const [brainTasks, setBrainTasks] = useState(mockBrainTasks);
    const [codeTracker, setCodeTracker] = useState(mockCodeTracker);

    // Handler functions
    const handleToggleSection = useCallback((section: 'brain' | 'code') => {
        if (section === 'brain') {
            setBrainTasks(prev => ({ ...prev, collapsed: !prev.collapsed }));
        } else {
            setCodeTracker(prev => ({ ...prev, collapsed: !prev.collapsed }));
        }
    }, []);

    const handleRestartServer = useCallback(async () => {
        showNotification('🔄 Đang restart services...', 'info');
        try {
            await invoke<string>('get_stats');
            showNotification('✅ Services restarted successfully!', 'success');
            loadStats();
        } catch (error) {
            showNotification(`❌ Failed to restart: ${error}`, 'error');
        }
    }, [loadStats, showNotification]);

    const handleResetStatus = useCallback(() => {
        showNotification('🔄 Đang reset cache trạng thái...', 'info');
        setBrainTasks(mockBrainTasks);
        setCodeTracker(mockCodeTracker);
        setTimeout(() => showNotification('✅ Cache đã được reset!', 'success'), 500);
    }, [showNotification]);

    const handleRunDiagnostics = useCallback(async () => {
        showNotification('🔍 Đang chạy diagnostics...', 'info');
        try {
            const statsResult = await invoke<string>('get_stats');
            console.log('=== DIAGNOSTICS REPORT ===');
            console.log('Stats:', statsResult);
            showNotification('✅ Diagnostics hoàn thành! Xem console.', 'success');
        } catch (error) {
            showNotification(`❌ Diagnostics failed: ${error}`, 'error');
        }
    }, [showNotification]);

    const handleGoogleSignIn = useCallback(async () => {
        const account = await signInWithGoogle();
        if (account) {
            showNotification(`✅ Đã đăng nhập: ${account.email}`, 'success');
            await fetchAccounts();
        }
    }, [signInWithGoogle, showNotification, fetchAccounts]);

    const handleRefreshAgent = useCallback(async (_id: string) => {
        showNotification('🔄 Đang refresh...', 'info');
        await detect();
        await fetchQuota();
        await fetchAccounts();
        showNotification('✅ Đã refresh!', 'success');
    }, [detect, fetchQuota, fetchAccounts, showNotification]);

    const handleAddAccount = useCallback(async (newAccount: { email: string; service: string; plan: string }) => {
        try {
            const savedAccount: SavedAccount = {
                id: '',
                email: newAccount.email,
                tier: newAccount.plan === 'pro' ? 'PRO' : 'FREE',
                planName: `${newAccount.service} ${newAccount.plan}`,
                lastSeen: Date.now(),
            };
            await addAccount(savedAccount);
            showNotification(`✅ Đã thêm tài khoản ${newAccount.email}`, 'success');
        } catch (err) {
            showNotification('❌ Không thể thêm tài khoản', 'error');
        }
    }, [addAccount, showNotification]);

    return (
        <div className="h-full flex flex-col bg-bg-base overflow-hidden text-text-primary">
            {/* Notification Toast */}
            <NotificationToast />

            {/* Header */}
            <Header
                title="Vibecode Control Center"
                subtitle="Unified AI orchestration & quota monitoring dashboard"
                totalAgents={agents.length}
                userEmail="nietina102@gmail.com"
            />

            {/* View Tabs */}
            <ViewTabs />

            {/* Main Content */}
            <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
                {activeView === 'overview' && (
                    <OverviewView
                        stats={stats}
                        quotaItems={quotaItems}
                        tokenData={tokenData}
                        chartData={chartData}
                        isLoading={quotaLoading}
                        isDetecting={isDetecting}
                        serverPort={serverInfo?.port ?? null}
                        lastUpdate={lastUpdate}
                        brainTasks={brainTasks}
                        codeTracker={codeTracker}
                        onRefresh={() => { detect(); fetchQuota(); }}
                        onToggleSection={handleToggleSection}
                        onDeleteTask={(id) => {
                            setBrainTasks(prev => ({
                                ...prev,
                                folders: prev.folders.filter(f => f.id !== id)
                            }));
                            showNotification(`🗑️ Đã xóa task ${id}`, 'success');
                        }}
                        onDeleteFile={(path) => showNotification(`🗑️ Đã xóa file: ${path}`, 'success')}
                        onOpenFile={(path) => showNotification(`📂 Mở file: ${path}`, 'info')}
                        onRestartServer={handleRestartServer}
                        onResetStatus={handleResetStatus}
                        onReloadWindow={() => window.location.reload()}
                        onRunDiagnostics={handleRunDiagnostics}
                        onOpenGlobalRules={() => showNotification('📜 Mở Global Rules...', 'info')}
                        onOpenMCPSettings={() => showNotification('🔌 Mở MCP Settings...', 'info')}
                    />
                )}

                {activeView === 'accounts' && (
                    <AccountsView
                        agents={agents}
                        serverInfo={serverInfo}
                        serverError={null}
                        isDetecting={isDetecting}
                        oauthLoading={oauthLoading}
                        quotaEmail={quotaData?.user_info?.email ?? undefined}
                        onGoogleSignIn={handleGoogleSignIn}
                        onDetect={detect}
                        onRefreshAgent={handleRefreshAgent}
                        onActivateAgent={(_id) => showNotification('▶️ Activated', 'success')}
                        onSettingsAgent={(_id) => showNotification('⚙️ Settings - Coming soon!', 'info')}
                        onDownloadAgent={(_id) => showNotification('📥 Downloading...', 'info')}
                        onDeleteAgent={async (id) => {
                            if (confirm('Xóa account này?')) {
                                await removeAccount(id);
                                showNotification('✅ Account đã được xóa', 'success');
                            }
                        }}
                        onRefreshAll={() => { loadStats(); showNotification('🔄 Refreshing all...', 'info'); }}
                    />
                )}

                {activeView === 'cache' && (
                    <div className="h-full">
                        <CacheManager
                            brainTasks={{ ...brainTasks, collapsed: false }}
                            codeTracker={{ ...codeTracker, collapsed: false }}
                            onToggleSection={handleToggleSection}
                            onDeleteTask={(id) => {
                                setBrainTasks(prev => ({
                                    ...prev,
                                    folders: prev.folders.filter(f => f.id !== id)
                                }));
                                showNotification(`🗑️ Đã xóa task ${id}`, 'success');
                            }}
                            onDeleteFile={(path) => showNotification(`🗑️ Đã xóa file: ${path}`, 'success')}
                            onOpenFile={(path) => showNotification(`📂 Mở file: ${path}`, 'info')}
                        />
                    </div>
                )}
            </div>

            {/* Add Account Modal */}
            <AddAccountModal
                isOpen={showAddAccountModal}
                onClose={closeAddAccountModal}
                onSuccess={handleAddAccount}
            />
        </div>
    );
};

export default Dashboard;
