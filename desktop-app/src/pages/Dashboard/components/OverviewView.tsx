/**
 * OverviewView - Main dashboard overview
 * Contains quota panel, stats terminal, service tools, and cache manager
 */
import React from 'react';
import StatsTerminal from './StatsTerminal';
import QuotaPanel from './QuotaPanel';
import ServiceTools from '../../../components/ServiceTools/ServiceTools';
import CacheManager from '../../../components/CacheManager/CacheManager';
import { useDashboardStore, useDashboardActions } from '../../../stores';
import { QuotaDisplayItem, TokenUsageData, UsageChartData, TreeSectionState } from '../../../types';

interface OverviewViewProps {
    // Stats
    stats: string;

    // Quota data
    quotaItems: QuotaDisplayItem[];
    tokenData: TokenUsageData;
    chartData: UsageChartData;

    // Server state
    isLoading: boolean;
    isDetecting: boolean;
    serverPort: number | null;
    lastUpdate: Date | null;

    // Cache data
    brainTasks: TreeSectionState;
    codeTracker: TreeSectionState;

    // Callbacks
    onRefresh: () => void;
    onToggleSection: (section: 'brain' | 'code') => void;
    onDeleteTask: (id: string) => void;
    onDeleteFile: (path: string) => void;
    onOpenFile: (path: string) => void;
    onRestartServer: () => void;
    onResetStatus: () => void;
    onReloadWindow: () => void;
    onRunDiagnostics: () => void;
    onOpenGlobalRules: () => void;
    onOpenMCPSettings: () => void;
}

const OverviewView: React.FC<OverviewViewProps> = ({
    stats,
    quotaItems,
    tokenData,
    chartData,
    isLoading,
    isDetecting,
    serverPort,
    lastUpdate,
    brainTasks,
    codeTracker,
    onRefresh,
    onToggleSection,
    onDeleteTask,
    onDeleteFile,
    onOpenFile,
    onRestartServer,
    onResetStatus,
    onReloadWindow,
    onRunDiagnostics,
    onOpenGlobalRules,
    onOpenMCPSettings,
}) => {
    const { autoAcceptEnabled } = useDashboardStore();
    const { toggleAutoAccept, showNotification } = useDashboardActions();

    return (
        <div className="grid grid-cols-12 gap-6">
            {/* Left Column - Quota Monitoring */}
            <div className="col-span-12 lg:col-span-8 flex flex-col gap-6">
                {/* Stats Terminal */}
                <StatsTerminal stats={stats} />

                {/* Quota Panel */}
                <QuotaPanel
                    quotaItems={quotaItems}
                    tokenData={tokenData}
                    chartData={chartData}
                    isLoading={isLoading}
                    isDetecting={isDetecting}
                    serverPort={serverPort}
                    lastUpdate={lastUpdate}
                    onRefresh={onRefresh}
                />
            </div>

            {/* Right Column - Tools & Quick Actions */}
            <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">
                {/* Service Tools */}
                <div className="card p-0 overflow-hidden">
                    <ServiceTools
                        autoAcceptEnabled={autoAcceptEnabled}
                        onToggleAutoAccept={() => {
                            toggleAutoAccept();
                            showNotification(
                                autoAcceptEnabled ? '🔴 Auto-Accept đã tắt' : '🟢 Auto-Accept đã bật',
                                'info'
                            );
                        }}
                        onRestartServer={onRestartServer}
                        onResetStatus={onResetStatus}
                        onReloadWindow={onReloadWindow}
                        onRunDiagnostics={onRunDiagnostics}
                        onOpenGlobalRules={onOpenGlobalRules}
                        onOpenMCPSettings={onOpenMCPSettings}
                    />
                </div>

                {/* Cache Manager */}
                <div className="card p-0 overflow-hidden flex-1">
                    <CacheManager
                        brainTasks={brainTasks}
                        codeTracker={codeTracker}
                        onToggleSection={onToggleSection}
                        onDeleteTask={onDeleteTask}
                        onDeleteFile={onDeleteFile}
                        onOpenFile={onOpenFile}
                    />
                </div>
            </div>
        </div>
    );
};

export default OverviewView;
