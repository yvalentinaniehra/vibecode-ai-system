import React from 'react';
import './CreditsBar.css';
import { TokenUsageData } from '../../types';

interface CreditsBarProps {
    tokenUsage: TokenUsageData | null;
}

const CreditsBar: React.FC<CreditsBarProps> = ({ tokenUsage }) => {
    if (!tokenUsage) {
        return null;
    }

    const { promptCredits, flowCredits, formatted } = tokenUsage;

    return (
        <div className="credits-bar">
            <h3>Token Credits</h3>

            <div className="credits-grid">
                {promptCredits && (
                    <div className="credit-item">
                        <div className="credit-header">
                            <span className="credit-icon">💬</span>
                            <span className="credit-label">Prompt Credits</span>
                        </div>
                        <div className="credit-bar-container">
                            <div
                                className="credit-bar-fill prompt"
                                style={{ width: `${promptCredits.remainingPercentage}%` }}
                            />
                        </div>
                        <div className="credit-stats">
                            <span>{formatted.promptAvailable}</span>
                            <span className="credit-divider">/</span>
                            <span className="credit-total">{formatted.promptMonthly}</span>
                        </div>
                    </div>
                )}

                {flowCredits && (
                    <div className="credit-item">
                        <div className="credit-header">
                            <span className="credit-icon">⚡</span>
                            <span className="credit-label">Flow Credits</span>
                        </div>
                        <div className="credit-bar-container">
                            <div
                                className="credit-bar-fill flow"
                                style={{ width: `${flowCredits.remainingPercentage}%` }}
                            />
                        </div>
                        <div className="credit-stats">
                            <span>{formatted.flowAvailable}</span>
                            <span className="credit-divider">/</span>
                            <span className="credit-total">{formatted.flowMonthly}</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CreditsBar;
