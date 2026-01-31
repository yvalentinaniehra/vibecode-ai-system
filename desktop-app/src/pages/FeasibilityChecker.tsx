import React, { useState } from 'react';
import './FeasibilityChecker.css';

interface FeasibilityInput {
    productIdea: string;
    brdSummary: string;
    budget: number;
    budgetCurrency: 'VND' | 'USD';
    timeline: string;
    teamSize: number;
    techStack: string[];
}

interface FeasibilityScores {
    technical: number;
    financial: number;
    legal: number;
    resource: number;
    total: number;
}

interface FeasibilityOutput {
    scores: FeasibilityScores;
    verdict: 'GO' | 'NO-GO' | 'CONDITIONAL-GO';
    conditions: string[];
    risks: string[];
    nextSteps: string[];
    analysis: string;
}

const FeasibilityChecker: React.FC = () => {
    const [input, setInput] = useState<FeasibilityInput>({
        productIdea: '',
        brdSummary: '',
        budget: 50000000,
        budgetCurrency: 'VND',
        timeline: '3 months',
        teamSize: 2,
        techStack: ['React', 'Node.js', 'PostgreSQL'],
    });
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [output, setOutput] = useState<FeasibilityOutput | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [techStackInput, setTechStackInput] = useState('');

    const handleInputChange = (field: keyof FeasibilityInput, value: unknown) => {
        setInput(prev => ({ ...prev, [field]: value }));
    };

    const addTechStack = () => {
        if (techStackInput.trim() && !input.techStack.includes(techStackInput.trim())) {
            setInput(prev => ({
                ...prev,
                techStack: [...prev.techStack, techStackInput.trim()],
            }));
            setTechStackInput('');
        }
    };

    const removeTechStack = (tech: string) => {
        setInput(prev => ({
            ...prev,
            techStack: prev.techStack.filter(t => t !== tech),
        }));
    };

    const runFeasibilityCheck = async () => {
        if (!input.productIdea) {
            setError('Vui lòng nhập ý tưởng sản phẩm');
            return;
        }

        setIsAnalyzing(true);
        setError(null);
        setOutput(null);

        try {
            // Simulate analysis time
            await new Promise(resolve => setTimeout(resolve, 1500));

            // Calculate scores based on input (mock scoring logic)
            const budgetInUSD = input.budgetCurrency === 'VND'
                ? input.budget / 25000
                : input.budget;

            const scores: FeasibilityScores = {
                technical: input.techStack.length >= 3 ? 80 : 65,
                financial: budgetInUSD >= 2000 ? 85 : budgetInUSD >= 1000 ? 70 : 50,
                legal: 85, // Default high for typical projects
                resource: input.teamSize >= 3 ? 80 : input.teamSize >= 2 ? 70 : 50,
                total: 0,
            };

            scores.total = Math.round(
                (scores.technical * 0.3) +
                (scores.financial * 0.25) +
                (scores.legal * 0.2) +
                (scores.resource * 0.25)
            );

            const verdict = scores.total >= 70 ? 'GO' : scores.total >= 50 ? 'CONDITIONAL-GO' : 'NO-GO';

            setOutput({
                scores,
                verdict,
                conditions: verdict === 'CONDITIONAL-GO' ? [
                    'Tăng ngân sách thêm 20%',
                    'Thêm 1 developer nữa',
                    'Xem xét lại timeline',
                ] : [],
                risks: [
                    'Timeline có thể bị trễ',
                    'Learning curve của tech stack mới',
                    'Phụ thuộc vào third-party APIs',
                ],
                nextSteps: verdict !== 'NO-GO' ? [
                    '→ PM Agent: Tạo PRD chi tiết',
                    '→ UX Agent: Thiết kế mockups',
                    '→ Architect Agent: System design',
                ] : [
                    '→ Xem xét lại phạm vi dự án',
                    '→ Tăng ngân sách',
                    '→ Chạy lại Feasibility Check',
                ],
                analysis: `Phân tích Feasibility cho: ${input.productIdea}\n\nKết quả: ${verdict}\n- Technical: ${scores.technical}/100\n- Financial: ${scores.financial}/100\n- Legal: ${scores.legal}/100\n- Resource: ${scores.resource}/100\n\n*Ghi chú: Đây là kết quả mock. Integrate Perplexity MCP để có phân tích thực.*`,
            });

        } catch (err) {
            setError(err instanceof Error ? err.message : 'Analysis failed');
        } finally {
            setIsAnalyzing(false);
        }
    };

    const getVerdictColor = (verdict: string) => {
        switch (verdict) {
            case 'GO': return '#10b981';
            case 'CONDITIONAL-GO': return '#f59e0b';
            case 'NO-GO': return '#ef4444';
            default: return '#888';
        }
    };

    const getScoreColor = (score: number) => {
        if (score >= 70) return '#10b981';
        if (score >= 50) return '#f59e0b';
        return '#ef4444';
    };

    const exportReport = () => {
        if (!output) return;

        const report = `# Feasibility Report
## ${input.productIdea}

### Verdict: ${output.verdict}
Total Score: ${output.scores.total}/100

### Scores
| Criterion | Score | Weight | Weighted |
|-----------|-------|--------|----------|
| Technical | ${output.scores.technical} | 30% | ${(output.scores.technical * 0.3).toFixed(1)} |
| Financial | ${output.scores.financial} | 25% | ${(output.scores.financial * 0.25).toFixed(1)} |
| Legal | ${output.scores.legal} | 20% | ${(output.scores.legal * 0.2).toFixed(1)} |
| Resource | ${output.scores.resource} | 25% | ${(output.scores.resource * 0.25).toFixed(1)} |

### Constraints
- Budget: ${input.budget.toLocaleString()} ${input.budgetCurrency}
- Timeline: ${input.timeline}
- Team: ${input.teamSize} developers
- Stack: ${input.techStack.join(', ')}

${output.conditions.length > 0 ? `### Conditions\n${output.conditions.map(c => `- ${c}`).join('\n')}` : ''}

### Risks
${output.risks.map(r => `- ${r}`).join('\n')}

### Next Steps
${output.nextSteps.map(s => `- ${s}`).join('\n')}

---
*Generated by Strategy Agent*
`;

        const blob = new Blob([report], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Feasibility-${input.productIdea.replace(/\s+/g, '-')}.md`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        alert('✅ Report exported successfully!');
    };

    return (
        <div className="feasibility-checker">
            <header className="feasibility-header">
                <h1>📈 Feasibility Checker</h1>
                <p>Phase 1.2 - GO/NO-GO Decision</p>
            </header>

            <div className="feasibility-container">
                {/* Input Form */}
                <section className="input-section">
                    <h2>⚙️ Project Constraints</h2>

                    <div className="form-group">
                        <label>Ý tưởng sản phẩm *</label>
                        <input
                            type="text"
                            value={input.productIdea}
                            onChange={(e) => handleInputChange('productIdea', e.target.value)}
                            placeholder="VD: AI-powered CRM for SMEs"
                        />
                    </div>

                    <div className="form-group">
                        <label>BRD Summary (từ Market Research)</label>
                        <textarea
                            value={input.brdSummary}
                            onChange={(e) => handleInputChange('brdSummary', e.target.value)}
                            placeholder="Dán kết quả từ Market Research hoặc để trống"
                            rows={3}
                        />
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label>Budget</label>
                            <input
                                type="number"
                                value={input.budget}
                                onChange={(e) => handleInputChange('budget', parseInt(e.target.value))}
                            />
                        </div>
                        <div className="form-group" style={{ flex: '0 0 100px' }}>
                            <label>&nbsp;</label>
                            <select
                                value={input.budgetCurrency}
                                onChange={(e) => handleInputChange('budgetCurrency', e.target.value)}
                            >
                                <option value="VND">VND</option>
                                <option value="USD">USD</option>
                            </select>
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label>Timeline</label>
                            <select
                                value={input.timeline}
                                onChange={(e) => handleInputChange('timeline', e.target.value)}
                            >
                                <option value="1 month">1 tháng</option>
                                <option value="2 months">2 tháng</option>
                                <option value="3 months">3 tháng</option>
                                <option value="6 months">6 tháng</option>
                                <option value="12 months">12 tháng</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Team Size</label>
                            <input
                                type="number"
                                min={1}
                                max={20}
                                value={input.teamSize}
                                onChange={(e) => handleInputChange('teamSize', parseInt(e.target.value))}
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label>Tech Stack</label>
                        <div className="tech-stack-input">
                            <input
                                type="text"
                                value={techStackInput}
                                onChange={(e) => setTechStackInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && addTechStack()}
                                placeholder="Enter to add"
                            />
                            <button onClick={addTechStack}>+</button>
                        </div>
                        <div className="tech-stack-tags">
                            {input.techStack.map(tech => (
                                <span key={tech} className="tag">
                                    {tech}
                                    <button onClick={() => removeTechStack(tech)}>×</button>
                                </span>
                            ))}
                        </div>
                    </div>

                    <button
                        className="analyze-btn"
                        onClick={runFeasibilityCheck}
                        disabled={isAnalyzing}
                    >
                        {isAnalyzing ? '🔄 Đang phân tích...' : '🎯 Check Feasibility'}
                    </button>
                </section>

                {/* Error Display */}
                {error && (
                    <div className="error-message">
                        ⚠️ {error}
                    </div>
                )}

                {/* Output Display */}
                {output && (
                    <section className="output-section">
                        {/* Verdict Banner */}
                        <div
                            className="verdict-banner"
                            style={{ borderColor: getVerdictColor(output.verdict) }}
                        >
                            <div className="verdict-label">Verdict</div>
                            <div
                                className="verdict-value"
                                style={{ color: getVerdictColor(output.verdict) }}
                            >
                                {output.verdict}
                            </div>
                            <div className="total-score">
                                Total: <strong>{output.scores.total}/100</strong>
                            </div>
                        </div>

                        {/* Scores Grid */}
                        <div className="scores-grid">
                            {[
                                { key: 'technical', label: 'Technical', icon: '⚙️' },
                                { key: 'financial', label: 'Financial', icon: '💰' },
                                { key: 'legal', label: 'Legal', icon: '⚖️' },
                                { key: 'resource', label: 'Resource', icon: '👥' },
                            ].map(item => (
                                <div key={item.key} className="score-card">
                                    <div className="score-icon">{item.icon}</div>
                                    <div className="score-label">{item.label}</div>
                                    <div
                                        className="score-value"
                                        style={{ color: getScoreColor(output.scores[item.key as keyof FeasibilityScores] as number) }}
                                    >
                                        {output.scores[item.key as keyof FeasibilityScores]}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Conditions */}
                        {output.conditions.length > 0 && (
                            <div className="section-block conditions">
                                <h3>⚠️ Conditions for GO</h3>
                                <ul>
                                    {output.conditions.map((c, i) => (
                                        <li key={i}>{c}</li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* Risks */}
                        <div className="section-block risks">
                            <h3>⛔ Key Risks</h3>
                            <ul>
                                {output.risks.map((r, i) => (
                                    <li key={i}>{r}</li>
                                ))}
                            </ul>
                        </div>

                        {/* Next Steps */}
                        <div className="section-block next-steps">
                            <h3>➡️ Next Steps</h3>
                            <ul>
                                {output.nextSteps.map((s, i) => (
                                    <li key={i}>{s}</li>
                                ))}
                            </ul>
                        </div>

                        {/* Actions */}
                        <div className="output-actions">
                            <button className="export-btn" onClick={exportReport}>
                                📥 Export Report
                            </button>
                        </div>
                    </section>
                )}
            </div>
        </div>
    );
};

export default FeasibilityChecker;
