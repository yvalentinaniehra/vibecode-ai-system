import React from 'react';
import './ServiceTools.css';

interface ServiceToolsProps {
    autoAcceptEnabled: boolean;
    onToggleAutoAccept: () => void;
    onRestartServer: () => void;
    onResetStatus: () => void;
    onReloadWindow: () => void;
    onRunDiagnostics: () => void;
    onOpenGlobalRules: () => void;
    onOpenMCPSettings: () => void;
}

const ServiceTools: React.FC<ServiceToolsProps> = ({
    autoAcceptEnabled,
    onToggleAutoAccept,
    onRestartServer,
    onResetStatus,
    onReloadWindow,
    onRunDiagnostics,
    onOpenGlobalRules,
    onOpenMCPSettings,
}) => {
    return (
        <div className="service-tools">
            <h3>Công cụ dịch vụ</h3>

            {/* Auto-Accept Toggle */}
            <div className="tool-section">
                <div className="auto-accept-toggle">
                    <div className="toggle-info">
                        <span className="toggle-icon">🚀</span>
                        <div className="toggle-text">
                            <span className="toggle-label">Auto-Accept</span>
                            <span className="toggle-desc">Tự động chấp nhận các lệnh AI</span>
                        </div>
                    </div>
                    <button
                        className={`toggle-switch ${autoAcceptEnabled ? 'active' : ''}`}
                        onClick={onToggleAutoAccept}
                    >
                        <span className="toggle-knob" />
                    </button>
                </div>
            </div>

            {/* Recovery Tools */}
            <div className="tool-section">
                <h4>Khôi phục dịch vụ</h4>
                <div className="tool-buttons">
                    <button className="tool-btn" onClick={onRestartServer} title="Khởi động lại Language Server">
                        <RefreshIcon />
                        <span>Restart</span>
                    </button>
                    <button className="tool-btn" onClick={onResetStatus} title="Reset cache trạng thái người dùng">
                        <ResetIcon />
                        <span>Reset</span>
                    </button>
                    <button className="tool-btn" onClick={onReloadWindow} title="Tải lại cửa sổ">
                        <ReloadIcon />
                        <span>Reload</span>
                    </button>
                    <button className="tool-btn" onClick={onRunDiagnostics} title="Chạy chẩn đoán">
                        <DiagnosticsIcon />
                        <span>Diagnostics</span>
                    </button>
                </div>
            </div>

            {/* Quick Config */}
            <div className="tool-section">
                <h4>Cấu hình nhanh</h4>
                <div className="config-links">
                    <button className="config-link" onClick={onOpenGlobalRules}>
                        <span className="config-icon">📜</span>
                        <span>Global Rules</span>
                        <ChevronIcon />
                    </button>
                    <button className="config-link" onClick={onOpenMCPSettings}>
                        <span className="config-icon">🔌</span>
                        <span>MCP Settings</span>
                        <ChevronIcon />
                    </button>
                </div>
            </div>
        </div>
    );
};

// Icons
const RefreshIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M23 4v6h-6M1 20v-6h6" />
        <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </svg>
);

const ResetIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 6v6l4 2" />
    </svg>
);

const ReloadIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
);

const DiagnosticsIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
);

const ChevronIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="9 18 15 12 9 6" />
    </svg>
);

export default ServiceTools;
