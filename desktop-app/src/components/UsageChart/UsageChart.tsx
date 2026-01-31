import React from 'react';
import './UsageChart.css';
import { UsageChartData } from '../../types';

interface UsageChartProps {
    data: UsageChartData | null;
}

const UsageChart: React.FC<UsageChartProps> = ({ data }) => {
    if (!data || !data.buckets.length) {
        return (
            <div className="usage-chart empty">
                <span>Không có dữ liệu sử dụng</span>
            </div>
        );
    }

    const { buckets, maxUsage, prediction } = data;
    // Normalize max to at least 10 for better visualization
    const normalizedMax = Math.max(maxUsage, 10);

    return (
        <div className="usage-chart">
            <div className="chart-header">
                <h3>Xu hướng sử dụng</h3>
                {prediction && (
                    <div className="prediction-info">
                        <span className="prediction-rate">
                            🔥 {prediction.usageRate.toFixed(1)}%/h
                        </span>
                        <span className="prediction-runway">
                            ⏱️ {prediction.runway}
                        </span>
                    </div>
                )}
            </div>

            <div className="chart-container">
                <div className="chart-bars">
                    {buckets.map((bucket, index) => (
                        <div key={index} className="bar-group">
                            {bucket.items.map((item, itemIndex) => {
                                const height = (item.usage / normalizedMax) * 100;
                                return (
                                    <div
                                        key={itemIndex}
                                        className="bar"
                                        style={{
                                            height: `${Math.max(height, 2)}%`,
                                            backgroundColor: item.color,
                                        }}
                                        title={`${item.groupId}: ${item.usage}%`}
                                    />
                                );
                            })}
                        </div>
                    ))}
                </div>

                <div className="chart-y-axis">
                    <span>{normalizedMax}%</span>
                    <span>{Math.round(normalizedMax / 2)}%</span>
                    <span>0%</span>
                </div>
            </div>

            <div className="chart-legend">
                {buckets[0]?.items.map((item, index) => (
                    <div key={index} className="legend-item">
                        <span
                            className="legend-color"
                            style={{ backgroundColor: item.color }}
                        />
                        <span className="legend-label">{item.groupId}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default UsageChart;
