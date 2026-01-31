import React, { useState, useEffect, useMemo } from 'react';
import { invoke } from '@tauri-apps/api/core';
import Header from '../components/Header/Header';
import Toolbar from '../components/common/Toolbar';
import AgentCard from '../components/AgentCard/AgentCard';
import QuotaGauge from '../components/QuotaGauge/QuotaGauge';
import UsageChart from '../components/UsageChart/UsageChart';
import CreditsBar from '../components/CreditsBar/CreditsBar';
import CacheManager from '../components/CacheManager/CacheManager';
import ServiceTools from '../components/ServiceTools/ServiceTools';
import AddAccountModal from '../components/AddAccountModal/AddAccountModal';
import { useAntigravityServer, useQuotaData, useAccounts, useOAuth } from '../hooks';
import {
    AgentData,
    QuotaDisplayItem,
    UsageChartData,
    TokenUsageData,
    TreeSectionState,
    SavedAccount
} from '../types';


// Mock data - AntiGravitytool quotas
const mockQuotas: QuotaDisplayItem[] = [
    { id: 'gemini', label: 'Gemini 3', type: 'group', remaining: 85, resetTime: '2h 15m', hasData: true, themeColor: '#4285f4' },
    { id: 'claude', label: 'Claude 4.5', type: 'group', remaining: 62, resetTime: '5h 30m', hasData: true, themeColor: '#8b5cf6' },
    { id: 'gpt', label: 'GPT-4o', type: 'group', remaining: 100, resetTime: '23h', hasData: true, themeColor: '#22c55e' },
];

// Mock chart data
const mockChartData: UsageChartData = {
    buckets: [
        {
            startTime: Date.now() - 90 * 60000, endTime: Date.now() - 80 * 60000, items: [
                { groupId: 'Gemini', usage: 5, color: '#4285f4' },
                { groupId: 'Claude', usage: 8, color: '#8b5cf6' },
            ]
        },
        {
            startTime: Date.now() - 80 * 60000, endTime: Date.now() - 70 * 60000, items: [
                { groupId: 'Gemini', usage: 12, color: '#4285f4' },
                { groupId: 'Claude', usage: 6, color: '#8b5cf6' },
            ]
        },
        {
            startTime: Date.now() - 70 * 60000, endTime: Date.now() - 60 * 60000, items: [
                { groupId: 'Gemini', usage: 8, color: '#4285f4' },
                { groupId: 'Claude', usage: 15, color: '#8b5cf6' },
            ]
        },
        {
            startTime: Date.now() - 60 * 60000, endTime: Date.now() - 50 * 60000, items: [
                { groupId: 'Gemini', usage: 18, color: '#4285f4' },
                { groupId: 'Claude', usage: 10, color: '#8b5cf6' },
            ]
        },
        {
            startTime: Date.now() - 50 * 60000, endTime: Date.now() - 40 * 60000, items: [
                { groupId: 'Gemini', usage: 22, color: '#4285f4' },
                { groupId: 'Claude', usage: 12, color: '#8b5cf6' },
            ]
        },
    ],
    maxUsage: 25,
    displayMinutes: 90,
    interval: 10,
    prediction: {
        groupId: 'claude',
        groupLabel: 'Claude 4.5',
        usageRate: 12.5,
        runway: '~5h',
        remaining: 62,
    },
};

// Mock token usage
const mockTokenUsage: TokenUsageData = {
    promptCredits: { available: 45000, monthly: 100000, usedPercentage: 55, remainingPercentage: 45 },
    flowCredits: { available: 8000, monthly: 20000, usedPercentage: 60, remainingPercentage: 40 },
    totalAvailable: 53000,
    totalMonthly: 120000,
    overallRemainingPercentage: 44,
    formatted: {
        promptAvailable: '45K',
        promptMonthly: '100K',
        flowAvailable: '8K',
        flowMonthly: '20K',
        totalAvailable: '53K',
        totalMonthly: '120K',
    },
};

// Mock cache data
const mockBrainTasks: TreeSectionState = {
    title: 'Brain',
    stats: '3 Tasks • 45MB',
    collapsed: true,
    folders: [
        {
            id: '1', label: 'vibecode-desktop-app', size: '25MB', files: [
                { name: 'implementation_plan.md', path: '/brain/1/implementation_plan.md' },
                { name: 'task.md', path: '/brain/1/task.md' },
                { name: 'walkthrough.md', path: '/brain/1/walkthrough.md' },
            ]
        },
        {
            id: '2', label: 'api-integration', size: '15MB', files: [
                { name: 'research.md', path: '/brain/2/research.md' },
            ]
        },
        { id: '3', label: 'bug-fix-session', size: '5MB', files: [] },
    ],
};

const mockCodeTracker: TreeSectionState = {
    title: 'Code Tracker',
    stats: '2 Projects • 120MB',
    collapsed: true,
    folders: [
        { id: 'proj1', label: 'control-agent-full', size: '80MB', files: [] },
        { id: 'proj2', label: 'educrm-frontend', size: '40MB', files: [] },
    ],
};

// Removed mockAgents - now using real accounts from useAccounts hook

type ViewMode = 'overview' | 'accounts' | 'cache';

// Helper functions for data formatting
const getModelColor = (modelId: string): string => {
    if (modelId.includes('gemini') || modelId.includes('g3')) return '#4285f4';
    if (modelId.includes('claude')) return '#8b5cf6';
    if (modelId.includes('gpt')) return '#22c55e';
    return '#6b7280'; // default gray
};

const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
};

const Dashboard: React.FC = () => {
    // Antigravity Integration
    const { serverInfo, isDetecting, error: serverError, detect } = useAntigravityServer();
    const { quotaData, isLoading: quotaLoading, error: quotaError, fetchQuota, lastUpdate } = useQuotaData({
        serverInfo,
        autoRefresh: true,
        refreshInterval: 60000, // 1 minute
    });

    const [searchValue, setSearchValue] = useState('');
    const [filter, setFilter] = useState('15');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [activeView, setActiveView] = useState<ViewMode>('overview');
    const [autoAcceptEnabled, setAutoAcceptEnabled] = useState(false);
    const [gaugeStyle, setGaugeStyle] = useState<'semi-arc' | 'classic-donut'>('semi-arc');
    const [brainTasks, setBrainTasks] = useState(mockBrainTasks);
    const [codeTracker, setCodeTracker] = useState(mockCodeTracker);
    const [stats, setStats] = useState<string>('');
    const [_context, _setContext] = useState<string>(''); // Future feature
    const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
    const [showAddAccountModal, setShowAddAccountModal] = useState(false);

    // Account Management (Phase 3.1)
    const { accounts, addAccount, removeAccount, fetchAccounts } = useAccounts();

    // OAuth Integration (Phase 3.2)
    const { signInWithGoogle, loading: oauthLoading, error: oauthError } = useOAuth();

    // Handle Google OAuth sign-in
    const handleGoogleSignIn = async () => {
        try {
            const account = await signInWithGoogle();
            if (account) {
                showNotification(`✅ Đã đăng nhập: ${account.email}`, 'success');
                // Refresh accounts list to show new account
                await fetchAccounts();
            } else if (oauthError) {
                showNotification(`❌ Đăng nhập thất bại: ${oauthError}`, 'error');
            }
        } catch (err) {
            console.error('OAuth error:', err);
            showNotification(`❌ Lỗi OAuth: ${err}`, 'error');
        }
    };

    // Transform SavedAccount[] to AgentData[] with real quota data
    const agents: AgentData[] = useMemo(() => {
        // Extract email from server if available (from user_info)
        const serverEmail = quotaData?.user_info?.email;

        // Transform quota models to AgentCard format
        const modelQuotas = quotaData?.models?.map(model => ({
            name: model.label,
            usage: Math.round(model.remaining_percentage),
        })) || [];

        return accounts.map(account => ({
            id: account.id,
            email: account.email,
            isPro: account.tier !== 'FREE',
            // Account is active if it matches the server's logged-in email
            isActive: serverEmail ? account.email.toLowerCase() === serverEmail.toLowerCase() : false,
            // Only show quota for active account (quota is per-session, not per-account)
            models: serverEmail && account.email.toLowerCase() === serverEmail.toLowerCase()
                ? modelQuotas
                : [],
            lastUpdated: account.lastSeen
                ? new Date(account.lastSeen).toLocaleString('vi-VN')
                : 'Chưa cập nhật',
        }));
    }, [accounts, quotaData]);

    // Transform backend quota data to UI format
    const quotaItems: QuotaDisplayItem[] = useMemo(() => {
        if (!quotaData || !quotaData.models || quotaData.models.length === 0) {
            return mockQuotas; // Fallback to mock if no real data
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

    // Transform backend token usage to UI format
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

    // Helper function for notifications (MUST be defined before useEffects that use it)
    const showNotification = (message: string, type: 'success' | 'error' | 'info') => {
        setNotification({ message, type });
        setTimeout(() => setNotification(null), 3000);
    };

    // Load stats and context on mount
    useEffect(() => {
        loadStats();
        loadContext();
    }, []);

    // Show notifications for server/quota errors
    useEffect(() => {
        if (serverError) {
            showNotification(`⚠️ Server failed: ${serverError}`, 'error');
        }
    }, [serverError, showNotification]);

    useEffect(() => {
        if (quotaError) {
            showNotification(`⚠️ Quota failed: ${quotaError}`, 'error');
        }
    }, [quotaError, showNotification]);

    const loadStats = async () => {
        try {
            const result = await invoke<string>('get_stats');
            setStats(result);
        } catch (error) {
            console.error('Failed to load stats:', error);
        }
    };

    const loadContext = async () => {
        try {
            const result = await invoke<string>('get_context');
            _setContext(result);
        } catch (error) {
            console.error('Failed to load context:', error);
        }
    };

    const filteredAgents = agents.filter((agent) =>
        agent.email.toLowerCase().includes(searchValue.toLowerCase())
    );

    const handleToggleSection = (section: 'brain' | 'code') => {
        if (section === 'brain') {
            setBrainTasks(prev => ({ ...prev, collapsed: !prev.collapsed }));
        } else {
            setCodeTracker(prev => ({ ...prev, collapsed: !prev.collapsed }));
        }
    };

    // Service Tools handlers with real functionality
    const handleRestartServer = async () => {
        showNotification('🔄 Đang restart services...', 'info');
        try {
            await invoke<string>('get_stats');
            showNotification('✅ Services restarted successfully!', 'success');
            loadStats();
        } catch (error) {
            showNotification(`❌ Failed to restart: ${error}`, 'error');
        }
    };

    const handleResetStatus = () => {
        showNotification('🔄 Đang reset cache trạng thái...', 'info');
        // Clear local state
        setBrainTasks(mockBrainTasks);
        setCodeTracker(mockCodeTracker);
        setTimeout(() => {
            showNotification('✅ Cache đã được reset!', 'success');
        }, 500);
    };

    const handleReloadWindow = () => {
        window.location.reload();
    };

    const handleRunDiagnostics = async () => {
        showNotification('🔍 Đang chạy diagnostics...', 'info');
        try {
            const statsResult = await invoke<string>('get_stats');
            const contextResult = await invoke<string>('get_context');

            console.log('=== DIAGNOSTICS REPORT ===');
            console.log('Stats:', statsResult);
            console.log('Context:', contextResult);

            setStats(statsResult);
            _setContext(contextResult);
            showNotification('✅ Diagnostics hoàn thành! Xem console.', 'success');
        } catch (error) {
            showNotification(`❌ Diagnostics failed: ${error}`, 'error');
        }
    };

    const handleOpenGlobalRules = () => {
        showNotification('📜 Mở Global Rules...', 'info');
        // In future: integrate with file opener
    };

    const handleOpenMCPSettings = () => {
        showNotification('🔌 Mở MCP Settings...', 'info');
        // In future: integrate with settings page
    };

    // Agent Action Handlers
    const handleRefreshAgent = async (id: string) => {
        const account = accounts.find(a => a.id === id);
        if (!account) return;

        showNotification(`🔄 Đang refresh ${account.email}...`, 'info');

        try {
            // Re-detect server and fetch fresh quota
            await detect();
            await fetchQuota();
            await fetchAccounts();
            showNotification(`✅ Đã refresh ${account.email}`, 'success');
        } catch (error) {
            showNotification(`❌ Lỗi refresh: ${error}`, 'error');
        }
    };

    const handleActivateAgent = (id: string) => {
        const account = accounts.find(a => a.id === id);
        if (!account) return;

        // TODO: Implement account switching (set as current/active)
        showNotification(`▶️ Activated ${account.email}`, 'success');
    };

    const handleAgentSettings = (id: string) => {
        const agent = agents.find(a => a.id === id);
        if (!agent) return;

        // TODO: Open agent-specific settings modal
        showNotification(`⚙️ Settings cho ${agent.email} - Coming soon!`, 'info');
    };

    const handleDownloadAgentData = async (id: string) => {
        const agent = agents.find(a => a.id === id);
        if (!agent) return;

        showNotification(`📥 Đang export dữ liệu ${agent.email}...`, 'info');

        // Create export data
        const exportData = {
            agent: {
                id: agent.id,
                email: agent.email,
                isPro: agent.isPro,
                models: agent.models,
                lastUpdated: agent.lastUpdated
            },
            exportedAt: new Date().toISOString()
        };

        // Create and download JSON file
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `agent-${agent.email.split('@')[0]}-export.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        showNotification(`✅ Đã export dữ liệu ${agent.email}`, 'success');
    };

    const handleDeleteAgent = async (id: string) => {
        if (confirm('Xóa account này khỏi danh sách?')) {
            try {
                // Assuming `removeAccount` is an imported function or defined elsewhere
                // For example: `import { removeAccount } from '../api';`
                await removeAccount(id);
                showNotification('✅ Account đã được xóa', 'success');
            } catch (err) {
                showNotification('❌ Không thể xóa account', 'error');
                console.error('Failed to remove account:', err);
            }
        }
    };

    return (
        <div className="h-full flex flex-col bg-bg-base overflow-hidden text-text-primary">
            {/* Notification Toast */}
            {notification && (
                <div className={`fixed top-4 right-4 p-4 rounded-lg shadow-xl z-50 animate-fade-in ${notification.type === 'success' ? 'bg-success/10 text-success border border-success/30' :
                    notification.type === 'error' ? 'bg-error/10 text-error border border-error/30' :
                        'bg-info/10 text-info border border-info/30'
                    }`}>
                    <div className="flex items-center gap-2">
                        <span>{notification.type === 'success' ? '✓' : notification.type === 'error' ? '❌' : 'ℹ️'}</span>
                        <span className="font-medium">{notification.message}</span>
                    </div>
                </div>
            )}

            <Header
                title="Vibecode Control Center"
                subtitle="Unified AI orchestration & quota monitoring dashboard"
                totalAgents={agents.length}
                userEmail="nietina102@gmail.com"
            />

            {/* View Tabs */}
            <div className="flex px-6 border-b border-border-default bg-bg-surface sticky top-0 z-10">
                <button
                    className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeView === 'overview' ? 'border-accent-primary text-accent-primary' : 'border-transparent text-text-secondary hover:text-text-primary'}`}
                    onClick={() => setActiveView('overview')}
                >
                    <span>📊</span> Tổng quan
                </button>
                <button
                    className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeView === 'accounts' ? 'border-accent-primary text-accent-primary' : 'border-transparent text-text-secondary hover:text-text-primary'}`}
                    onClick={() => setActiveView('accounts')}
                >
                    <span>👥</span> Tài khoản
                </button>
                <button
                    className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeView === 'cache' ? 'border-accent-primary text-accent-primary' : 'border-transparent text-text-secondary hover:text-text-primary'}`}
                    onClick={() => setActiveView('cache')}
                >
                    <span>📁</span> Cache
                </button>
            </div>

            {activeView === 'accounts' && (
                <div className="p-4 border-b border-border-subtle bg-bg-surface/50">
                    <Toolbar
                        searchValue={searchValue}
                        onSearchChange={setSearchValue}
                        filter={filter}
                        onFilterChange={setFilter}
                        viewMode={viewMode}
                        onViewModeChange={setViewMode}
                        onAdd={() => setShowAddAccountModal(true)}
                        onRefreshAll={() => {
                            showNotification('🔄 Đang refresh tất cả agents...', 'info');
                            loadStats();
                        }}
                        onSettings={() => showNotification('⚙️ Mở settings...', 'info')}
                        onExport={() => showNotification('📤 Đang export dữ liệu...', 'info')}
                    />
                </div>
            )}

            <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
                {activeView === 'overview' && (
                    <div className="grid grid-cols-12 gap-6">
                        {/* Left Column - Quota Monitoring */}
                        <div className="col-span-12 lg:col-span-8 flex flex-col gap-6">
                            {/* Stats Info - Terminal Style */}
                            {stats && (
                                <div className="rounded-lg bg-[#0d1117] border border-border-default/50 overflow-hidden font-mono text-xs shadow-xl ring-1 ring-white/5 group transition-all hover:ring-accent-primary/20">
                                    <div className="flex items-center justify-between px-3 py-2 bg-[#161b22] border-b border-white/5">
                                        <div className="flex items-center gap-2">
                                            <div className="flex gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                                                <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                                                <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
                                                <div className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
                                            </div>
                                            <span className="ml-2 text-[10px] text-text-muted font-sans uppercase tracking-wider font-semibold opacity-60">session_stats.log</span>
                                        </div>
                                        <div className="text-[10px] text-text-muted opacity-40">bash</div>
                                    </div>
                                    <div className="p-4 text-emerald-400 whitespace-pre-wrap leading-relaxed overflow-x-auto custom-scrollbar bg-opacity-50">
                                        <span className="text-pink-500 mr-2">$</span>
                                        {stats}
                                        <span className="animate-pulse inline-block w-1.5 h-3 bg-emerald-500 ml-1 align-middle"></span>
                                    </div>
                                </div>
                            )}

                            <div className="card">
                                <div className="card-header flex justify-between items-center p-4 border-b border-border-subtle">
                                    <h2 className="text-lg font-bold">Hạn mức AI</h2>
                                    <div className="flex items-center gap-3">
                                        <div className="flex items-center gap-2 text-xs">
                                            <span className={`w-2 h-2 rounded-full ${isDetecting ? 'animate-pulse bg-warning' : serverInfo ? 'bg-success' : 'bg-error'}`} />
                                            <span className="text-text-secondary">
                                                {isDetecting ? 'Detecting...' : serverInfo ? `Port ${serverInfo.port}` : 'Disconnected'}
                                            </span>
                                        </div>
                                        {lastUpdate && <span className="text-[10px] text-text-muted">Updated: {lastUpdate.toLocaleTimeString('vi-VN')}</span>}

                                        <div className="flex border border-border-default rounded overflow-hidden">
                                            <button
                                                className="px-2 py-1 bg-bg-elevated hover:bg-bg-hover text-text-secondary text-xs transition-colors border-r border-border-default"
                                                onClick={() => {
                                                    detect();
                                                    fetchQuota();
                                                }}
                                                disabled={quotaLoading || isDetecting}
                                                title="Refresh"
                                            >
                                                🔄
                                            </button>
                                            <button
                                                className="px-2 py-1 bg-bg-elevated hover:bg-bg-hover text-text-secondary text-xs transition-colors"
                                                onClick={() => setGaugeStyle(prev => prev === 'semi-arc' ? 'classic-donut' : 'semi-arc')}
                                                title="Toggle Style"
                                            >
                                                {gaugeStyle === 'semi-arc' ? '◐' : '◯'}
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <div className="card-body p-6">
                                    <div className="flex flex-wrap justify-center gap-8 mb-8">
                                        {quotaItems.map((quota) => (
                                            <QuotaGauge
                                                key={quota.id}
                                                quota={quota}
                                                style={gaugeStyle}
                                                size={gaugeStyle === 'semi-arc' ? 140 : 100}
                                            />
                                        ))}
                                    </div>

                                    {quotaLoading && !quotaData && (
                                        <div className="text-center py-4 text-text-muted animate-pulse">
                                            🔄 Loading quota data...
                                        </div>
                                    )}

                                    <div className="space-y-6">
                                        <UsageChart data={mockChartData} />
                                        <CreditsBar tokenUsage={tokenData} />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Right Column - Tools & Quick Actions */}
                        <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">
                            <div className="card p-0 overflow-hidden">
                                <ServiceTools
                                    autoAcceptEnabled={autoAcceptEnabled}
                                    onToggleAutoAccept={() => {
                                        setAutoAcceptEnabled(!autoAcceptEnabled);
                                        showNotification(
                                            autoAcceptEnabled ? '🔴 Auto-Accept đã tắt' : '🟢 Auto-Accept đã bật',
                                            'info'
                                        );
                                    }}
                                    onRestartServer={handleRestartServer}
                                    onResetStatus={handleResetStatus}
                                    onReloadWindow={handleReloadWindow}
                                    onRunDiagnostics={handleRunDiagnostics}
                                    onOpenGlobalRules={handleOpenGlobalRules}
                                    onOpenMCPSettings={handleOpenMCPSettings}
                                />
                            </div>

                            <div className="card p-0 overflow-hidden flex-1">
                                <CacheManager
                                    brainTasks={brainTasks}
                                    codeTracker={codeTracker}
                                    onToggleSection={handleToggleSection}
                                    onDeleteTask={(id) => {
                                        setBrainTasks(prev => ({
                                            ...prev,
                                            folders: prev.folders.filter(f => f.id !== id)
                                        }));
                                        showNotification(`🗑️ Đã xóa task ${id}`, 'success');
                                    }}
                                    onDeleteFile={(path) => {
                                        showNotification(`🗑️ Đã xóa file: ${path}`, 'success');
                                    }}
                                    onOpenFile={(path) => {
                                        showNotification(`📂 Mở file: ${path}`, 'info');
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                )}

                {activeView === 'accounts' && (
                    <div className="space-y-6">
                        {/* Google OAuth Sign-in Button */}
                        <div className="text-center py-4">
                            <button
                                onClick={handleGoogleSignIn}
                                disabled={oauthLoading}
                                className={`px-6 py-3 rounded-lg text-white font-medium shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all flex items-center gap-3 mx-auto ${oauthLoading ? 'opacity-70 cursor-not-allowed' : 'opacity-100'
                                    }`}
                                style={{ background: 'linear-gradient(135deg, #4285f4, #34a853)' }}
                            >
                                {oauthLoading ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        <span>Đang đăng nhập...</span>
                                    </>
                                ) : (
                                    <>
                                        <span>🔐</span> Sign in with Google
                                    </>
                                )}
                            </button>
                        </div>

                        {/* Server Connection Status */}
                        <div className={`flex items-center justify-between p-4 rounded-lg border ${serverInfo ? 'bg-success/5 border-success/20' : 'bg-error/5 border-error/20'
                            }`}>
                            <div className="flex items-center gap-3">
                                <div className={`w-2.5 h-2.5 rounded-full ${serverInfo ? 'bg-success' : 'bg-error animate-pulse'}`} />
                                <span className="text-sm font-medium">
                                    {isDetecting ? '🔍 Đang tìm Language Server...' :
                                        serverInfo ? `✅ Đã kết nối (Port ${serverInfo.port})` :
                                            serverError ? `❌ ${serverError}` :
                                                '⚠️ Không tìm thấy Language Server'}
                                </span>
                            </div>

                            <div className="flex items-center gap-4">
                                {quotaData?.user_info?.email && (
                                    <span className="text-xs px-2 py-1 bg-bg-elevated rounded border border-border-default text-text-secondary">
                                        📧 {quotaData.user_info.email}
                                    </span>
                                )}
                                {!serverInfo && !isDetecting && (
                                    <button
                                        onClick={detect}
                                        className="btn btn-sm btn-primary"
                                    >
                                        🔄 Thử lại
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {filteredAgents.map((agent) => (
                                <AgentCard
                                    key={agent.id}
                                    agent={agent}
                                    onRefresh={handleRefreshAgent}
                                    onPlay={handleActivateAgent}
                                    onSettings={handleAgentSettings}
                                    onDownload={handleDownloadAgentData}
                                    onDelete={handleDeleteAgent}
                                />
                            ))}
                        </div>
                    </div>
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
                            onDeleteFile={(path) => {
                                showNotification(`🗑️ Đã xóa file: ${path}`, 'success');
                            }}
                            onOpenFile={(path) => {
                                showNotification(`📂 Mở file: ${path}`, 'info');
                            }}
                        />
                    </div>
                )}
            </div>

            {/* Add Account Modal */}
            <AddAccountModal
                isOpen={showAddAccountModal}
                onClose={() => setShowAddAccountModal(false)}
                onSuccess={async (newAccount) => {
                    try {
                        const savedAccount: SavedAccount = {
                            id: '', //  Auto-generated by backend
                            email: newAccount.email,
                            tier: newAccount.plan === 'pro' ? 'PRO' : 'FREE',
                            planName: `${newAccount.service} ${newAccount.plan}`,
                            lastSeen: Date.now(),
                        };

                        await addAccount(savedAccount);
                        showNotification(`✅ Đã thêm tài khoản ${newAccount.email}`, 'success');
                    } catch (err) {
                        showNotification('❌ Không thể thêm tài khoản', 'error');
                        console.error('Add account error:', err);
                    }
                }}
            />
        </div>
    );
};

export default Dashboard;
