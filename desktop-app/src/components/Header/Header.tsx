import React from 'react';

interface HeaderProps {
    title: string;
    subtitle?: string;
    totalAgents?: number;
    userEmail?: string;
}

const Header: React.FC<HeaderProps> = ({
    title,
    subtitle,
    totalAgents = 0,
    userEmail = 'user@vibecode.ai'
}) => {
    return (
        <header className="px-6 py-5 bg-bg-base border-b border-border-default flex justify-between items-center z-20">
            <div>
                <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-accent-primary to-blue-500 tracking-tight leading-normal">
                    {title}
                </h1>
                {subtitle && <p className="text-sm text-text-secondary mt-1 font-medium">{subtitle}</p>}
            </div>

            <div className="flex items-center gap-4">
                <div className="px-3 py-1.5 rounded-full bg-bg-elevated border border-border-default flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-success/80 animate-pulse"></span>
                    <span className="text-xs font-medium text-text-secondary">{totalAgents} agents active</span>
                </div>

                <div className="flex items-center gap-2 pl-4 border-l border-border-default">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent-primary to-indigo-600 flex items-center justify-center text-white shadow-lg ring-2 ring-bg-base">
                        <UserIcon />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-xs text-text-muted">Signed in as</span>
                        <span className="text-xs font-bold text-text-primary" title={userEmail}>
                            {userEmail.split('@')[0]}
                        </span>
                    </div>
                </div>
            </div>
        </header>
    );
};

const UserIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
    </svg>
);

export default Header;
