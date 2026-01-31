/**
 * ViewTabs - Navigation tabs for Dashboard views
 * Extracted from Dashboard.tsx for better modularity
 */
import React from 'react';
import { useActiveView, useDashboardActions, ViewMode } from '../../../stores';

interface TabConfig {
    id: ViewMode;
    icon: string;
    label: string;
}

const TABS: TabConfig[] = [
    { id: 'overview', icon: '📊', label: 'Tổng quan' },
    { id: 'accounts', icon: '👥', label: 'Tài khoản' },
    { id: 'cache', icon: '📁', label: 'Cache' },
];

const ViewTabs: React.FC = () => {
    const activeView = useActiveView();
    const { setActiveView } = useDashboardActions();

    return (
        <div className="flex px-6 border-b border-border-default bg-bg-surface sticky top-0 z-10">
            {TABS.map((tab) => (
                <button
                    key={tab.id}
                    className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeView === tab.id
                        ? 'border-accent-primary text-accent-primary'
                        : 'border-transparent text-text-secondary hover:text-text-primary'
                        }`}
                    onClick={() => setActiveView(tab.id)}
                >
                    <span>{tab.icon}</span> {tab.label}
                </button>
            ))}
        </div>
    );
};

export default ViewTabs;
