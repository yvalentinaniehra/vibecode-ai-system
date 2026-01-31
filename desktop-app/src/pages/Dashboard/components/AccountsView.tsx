/**
 * AccountsView - Account management view
 * Extracted from Dashboard.tsx
 */
import React from 'react';
import AgentCard from '../../../components/AgentCard/AgentCard';
import Toolbar from '../../../components/common/Toolbar';
import { useDashboardStore, useDashboardActions } from '../../../stores';
import { AgentData } from '../../../types';

interface ServerInfo {
    port: number;
    email?: string;
}

interface AccountsViewProps {
    agents: AgentData[];
    serverInfo: ServerInfo | null;
    serverError: string | null;
    isDetecting: boolean;
    oauthLoading: boolean;
    quotaEmail?: string;
    onGoogleSignIn: () => void;
    onDetect: () => void;
    onRefreshAgent: (id: string) => void;
    onActivateAgent: (id: string) => void;
    onSettingsAgent: (id: string) => void;
    onDownloadAgent: (id: string) => void;
    onDeleteAgent: (id: string) => void;
    onRefreshAll: () => void;
}

const AccountsView: React.FC<AccountsViewProps> = ({
    agents,
    serverInfo,
    serverError,
    isDetecting,
    oauthLoading,
    quotaEmail,
    onGoogleSignIn,
    onDetect,
    onRefreshAgent,
    onActivateAgent,
    onSettingsAgent,
    onDownloadAgent,
    onDeleteAgent,
    onRefreshAll,
}) => {
    const { searchValue, viewMode } = useDashboardStore();
    const { setSearchValue, setViewMode, openAddAccountModal, showNotification, setFilter } = useDashboardActions();
    const filter = useDashboardStore((s) => s.filter);

    // Filter agents by search
    const filteredAgents = agents.filter((agent) =>
        agent.email.toLowerCase().includes(searchValue.toLowerCase())
    );

    return (
        <div className="space-y-6">
            {/* Toolbar */}
            <div className="p-4 border-b border-border-subtle bg-bg-surface/50 -mx-6 -mt-6 mb-6">
                <Toolbar
                    searchValue={searchValue}
                    onSearchChange={setSearchValue}
                    filter={filter}
                    onFilterChange={setFilter}
                    viewMode={viewMode}
                    onViewModeChange={setViewMode}
                    onAdd={openAddAccountModal}
                    onRefreshAll={onRefreshAll}
                    onSettings={() => showNotification('⚙️ Mở settings...', 'info')}
                    onExport={() => showNotification('📤 Đang export dữ liệu...', 'info')}
                />
            </div>

            {/* Google OAuth Sign-in Button */}
            <div className="text-center py-4">
                <button
                    onClick={onGoogleSignIn}
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
                    <div className={`w-2.5 h-2.5 rounded-full ${serverInfo ? 'bg-success' : 'bg-error animate-pulse'
                        }`} />
                    <span className="text-sm font-medium">
                        {isDetecting ? '🔍 Đang tìm Language Server...' :
                            serverInfo ? `✅ Đã kết nối (Port ${serverInfo.port})` :
                                serverError ? `❌ ${serverError}` :
                                    '⚠️ Không tìm thấy Language Server'}
                    </span>
                </div>

                <div className="flex items-center gap-4">
                    {quotaEmail && (
                        <span className="text-xs px-2 py-1 bg-bg-elevated rounded border border-border-default text-text-secondary">
                            📧 {quotaEmail}
                        </span>
                    )}
                    {!serverInfo && !isDetecting && (
                        <button onClick={onDetect} className="btn btn-sm btn-primary">
                            🔄 Thử lại
                        </button>
                    )}
                </div>
            </div>

            {/* Agent Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredAgents.map((agent) => (
                    <AgentCard
                        key={agent.id}
                        agent={agent}
                        onRefresh={onRefreshAgent}
                        onPlay={onActivateAgent}
                        onSettings={onSettingsAgent}
                        onDownload={onDownloadAgent}
                        onDelete={onDeleteAgent}
                    />
                ))}
            </div>

            {/* Empty State */}
            {filteredAgents.length === 0 && (
                <div className="text-center py-12 text-text-muted">
                    <div className="text-4xl mb-4">👥</div>
                    <p className="text-lg font-medium">Chưa có tài khoản nào</p>
                    <p className="text-sm mt-2">Đăng nhập với Google để bắt đầu</p>
                </div>
            )}
        </div>
    );
};

export default AccountsView;
