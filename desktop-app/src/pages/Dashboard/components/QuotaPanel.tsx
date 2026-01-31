/**
 * QuotaPanel - AI Quota monitoring panel
 * Extracted from Dashboard.tsx with all quota-related UI
 */
import React from 'react';
import QuotaGauge from '../../../components/QuotaGauge/QuotaGauge';
import UsageChart from '../../../components/UsageChart/UsageChart';
import CreditsBar from '../../../components/CreditsBar/CreditsBar';
import { useGaugeStyle, useDashboardActions } from '../../../stores';
import { QuotaDisplayItem, TokenUsageData, UsageChartData } from '../../../types';

interface QuotaPanelProps {
    quotaItems: QuotaDisplayItem[];
    tokenData: TokenUsageData;
    chartData: UsageChartData;
    isLoading: boolean;
    isDetecting: boolean;
    serverPort: number | null;
    lastUpdate: Date | null;
    onRefresh: () => void;
}

const QuotaPanel: React.FC<QuotaPanelProps> = ({
    quotaItems,
    tokenData,
    chartData,
    isLoading,
    isDetecting,
    serverPort,
    lastUpdate,
    onRefresh,
}) => {
    const gaugeStyle = useGaugeStyle();
    const { toggleGaugeStyle } = useDashboardActions();

    return (
        <div className="card">
            {/* Header */}
            <div className="card-header flex justify-between items-center p-4 border-b border-border-subtle">
                <h2 className="text-lg font-bold">Hạn mức AI</h2>
                <div className="flex items-center gap-3">
                    {/* Connection Status */}
                    <div className="flex items-center gap-2 text-xs">
                        <span className={`w-2 h-2 rounded-full ${isDetecting ? 'animate-pulse bg-warning'
                                : serverPort ? 'bg-success'
                                    : 'bg-error'
                            }`} />
                        <span className="text-text-secondary">
                            {isDetecting ? 'Detecting...'
                                : serverPort ? `Port ${serverPort}`
                                    : 'Disconnected'}
                        </span>
                    </div>

                    {/* Last Update */}
                    {lastUpdate && (
                        <span className="text-[10px] text-text-muted">
                            Updated: {lastUpdate.toLocaleTimeString('vi-VN')}
                        </span>
                    )}

                    {/* Action Buttons */}
                    <div className="flex border border-border-default rounded overflow-hidden">
                        <button
                            className="px-2 py-1 bg-bg-elevated hover:bg-bg-hover text-text-secondary text-xs transition-colors border-r border-border-default"
                            onClick={onRefresh}
                            disabled={isLoading || isDetecting}
                            title="Refresh"
                        >
                            🔄
                        </button>
                        <button
                            className="px-2 py-1 bg-bg-elevated hover:bg-bg-hover text-text-secondary text-xs transition-colors"
                            onClick={toggleGaugeStyle}
                            title="Toggle Style"
                        >
                            {gaugeStyle === 'semi-arc' ? '◐' : '◯'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Body */}
            <div className="card-body p-6">
                {/* Quota Gauges */}
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

                {/* Loading State */}
                {isLoading && quotaItems.length === 0 && (
                    <div className="text-center py-4 text-text-muted animate-pulse">
                        🔄 Loading quota data...
                    </div>
                )}

                {/* Charts */}
                <div className="space-y-6">
                    <UsageChart data={chartData} />
                    <CreditsBar tokenUsage={tokenData} />
                </div>
            </div>
        </div>
    );
};

export default QuotaPanel;
