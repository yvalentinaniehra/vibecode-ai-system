import React from 'react';

export interface AgentData {
    id: string;
    email: string;
    isPro: boolean;
    isActive: boolean;
    models: {
        name: string;
        usage: number; // 0-100
    }[];
    lastUpdated: string;
}

interface AgentCardProps {
    agent: AgentData;
    onRefresh?: (id: string) => void;
    onPlay?: (id: string) => void;
    onSettings?: (id: string) => void;
    onDownload?: (id: string) => void;
    onDelete?: (id: string) => void;
}

const AgentCard: React.FC<AgentCardProps> = ({
    agent,
    onRefresh,
    onPlay,
    onSettings,
    onDownload,
    onDelete
}) => {
    const getProgressColor = (value: number): string => {
        if (value >= 100) return 'bg-success';
        if (value >= 60) return 'bg-warning';
        return 'bg-accent-primary';
    };

    const getProgressTextColor = (value: number): string => {
        if (value >= 100) return 'text-success';
        if (value >= 60) return 'text-warning';
        return 'text-accent-primary';
    };

    return (
        <div className="card hover:shadow-lg hover:border-accent-primary/50 transition-all duration-200 group animate-scale-in">
            <div className="card-header p-4 border-b border-border-subtle flex justify-between items-center bg-bg-surface">
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white ${agent.isPro ? 'bg-gradient-to-br from-violet-500 to-fuchsia-500' : 'bg-gray-500'}`}>
                            {agent.email[0].toUpperCase()}
                        </div>
                        {agent.isActive && (
                            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-success border-2 border-bg-surface" />
                        )}
                    </div>
                    <div className="flex flex-col min-w-0">
                        <span className="font-medium text-text-primary text-sm truncate max-w-[140px]" title={agent.email}>
                            {agent.email}
                        </span>
                        <div className="flex items-center gap-1">
                            <span className={`text-[10px] uppercase font-bold px-1.5 rounded ${agent.isPro ? 'bg-violet-500/10 text-violet-500' : 'bg-bg-elevated text-text-muted'}`}>
                                {agent.isPro ? 'PRO' : 'FREE'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="p-4 space-y-3">
                <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                    {agent.models.slice(0, 4).map((model) => (
                        <div key={model.name} className="flex flex-col gap-1">
                            <div className="flex justify-between text-[10px] font-medium uppercase">
                                <span className="text-text-secondary truncate pr-1">{model.name}</span>
                                <span className={getProgressTextColor(model.usage)}>
                                    {model.usage}%
                                </span>
                            </div>
                            <div className="h-1.5 w-full bg-bg-elevated rounded-full overflow-hidden">
                                <div
                                    className={`h-full rounded-full transition-all duration-500 ${getProgressColor(model.usage)}`}
                                    style={{ width: `${Math.min(model.usage, 100)}%` }}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="px-4 py-3 bg-bg-surface/50 border-t border-border-subtle flex justify-between items-center">
                <span className="text-[10px] text-text-muted font-mono truncate max-w-[80px]">
                    {agent.lastUpdated}
                </span>
                <div className="flex gap-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                    {[
                        { icon: <RefreshIcon />, action: () => onRefresh?.(agent.id), title: 'Refresh' },
                        { icon: <PlayIcon />, action: () => onPlay?.(agent.id), title: 'Switch Acount' },
                        { icon: <SettingsIcon />, action: () => onSettings?.(agent.id), title: 'Settings' },
                        { icon: <DownloadIcon />, action: () => onDownload?.(agent.id), title: 'Export' },
                        { icon: <DeleteIcon />, action: () => onDelete?.(agent.id), title: 'Delete', danger: true },
                    ].map((btn, i) => (
                        <button
                            key={i}
                            className={`p-1.5 rounded transition-colors ${btn.danger
                                ? 'text-text-muted hover:text-error hover:bg-error/10'
                                : 'text-text-muted hover:text-accent-primary hover:bg-accent-primary/10'}`}
                            onClick={(e) => { e.stopPropagation(); btn.action(); }}
                            title={btn.title}
                        >
                            {btn.icon}
                        </button>
                    ))}
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

const PlayIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
);

const SettingsIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
);

const DownloadIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
);

const DeleteIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="3 6 5 6 21 6" />
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
);

export default AgentCard;
