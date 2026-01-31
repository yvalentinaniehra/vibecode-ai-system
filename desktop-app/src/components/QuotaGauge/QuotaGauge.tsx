import React from 'react';
import { QuotaDisplayItem } from '../../types';

interface QuotaGaugeProps {
    quota: QuotaDisplayItem;
    style?: 'semi-arc' | 'classic-donut';
    size?: number;
}

const QuotaGauge: React.FC<QuotaGaugeProps> = ({
    quota,
    style = 'semi-arc',
    size = 120
}) => {
    const remaining = quota.remaining;
    const strokeWidth = 8; // Slighly thinner for elegance
    const radius = (size - strokeWidth) / 2;
    const center = size / 2;

    // Calculate color based on remaining percentage
    const getColor = (value: number) => {
        if (value >= 70) return '#22c55e'; // Green
        if (value >= 30) return '#f59e0b'; // Orange
        return '#ef4444'; // Red
    };

    const color = quota.themeColor || getColor(remaining);

    if (style === 'semi-arc') {
        // Semi-arc gauge (180 degree arc)
        const circumference = Math.PI * radius;
        const offset = circumference - (remaining / 100) * circumference;

        return (
            <div className="relative flex flex-col items-center" style={{ width: size, height: size / 2 + 30 }}>
                <svg width={size} height={size / 2 + 10} viewBox={`0 0 ${size} ${size / 2 + 10}`} className="drop-shadow-sm">
                    {/* Background arc */}
                    <path
                        d={`M ${strokeWidth / 2} ${size / 2} A ${radius} ${radius} 0 0 1 ${size - strokeWidth / 2} ${size / 2}`}
                        fill="none"
                        stroke="var(--color-bg-elevated)"
                        strokeWidth={strokeWidth}
                        strokeLinecap="round"
                    />
                    {/* Progress arc */}
                    <path
                        d={`M ${strokeWidth / 2} ${size / 2} A ${radius} ${radius} 0 0 1 ${size - strokeWidth / 2} ${size / 2}`}
                        fill="none"
                        stroke={color}
                        strokeWidth={strokeWidth}
                        strokeLinecap="round"
                        strokeDasharray={circumference}
                        strokeDashoffset={offset}
                        className="transition-all duration-1000 ease-out"
                    />
                </svg>

                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-0.5 pointer-events-none">
                    <span
                        className="text-xl font-bold leading-none"
                        style={{ color }}
                    >
                        {remaining}%
                    </span>
                    <span className="text-[10px] font-medium text-text-secondary uppercase tracking-wide truncate max-w-[100px] text-center">
                        {quota.label}
                    </span>
                </div>

                <div className="flex flex-col items-center mt-1">
                    {quota.subLabel && (
                        <span className="text-[10px] text-text-muted">{quota.subLabel}</span>
                    )}
                    <span className="text-[9px] text-text-muted opacity-80">{quota.resetTime}</span>
                </div>
            </div>
        );
    }

    // Classic donut gauge
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (remaining / 100) * circumference;

    return (
        <div className="relative flex flex-col items-center" style={{ width: size, height: size }}>
            <svg width={size} height={size} className="drop-shadow-sm">
                {/* Background circle */}
                <circle
                    cx={center}
                    cy={center}
                    r={radius}
                    fill="none"
                    stroke="var(--color-bg-elevated)"
                    strokeWidth={strokeWidth}
                />
                {/* Progress circle */}
                <circle
                    cx={center}
                    cy={center}
                    r={radius}
                    fill="none"
                    stroke={color}
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    transform={`rotate(-90 ${center} ${center})`}
                    className="transition-all duration-1000 ease-out"
                />
            </svg>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-1 pointer-events-none">
                <span className="text-xl font-bold leading-none" style={{ color }}>{remaining}%</span>
                <span className="text-[10px] font-medium text-text-secondary text-center max-w-[80px] leading-tight">
                    {quota.label}
                </span>
            </div>
        </div>
    );
};

export default QuotaGauge;
