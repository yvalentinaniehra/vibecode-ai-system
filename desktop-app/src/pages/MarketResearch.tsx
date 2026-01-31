import React, { useState } from 'react';
import './MarketResearch.css';

// Shared data type matching App.tsx
interface SharedBRDData {
    productIdea: string;
    industry: string;
    targetAudience: string;
    geography: string;
    brdSummary: string;
}

interface MarketResearchProps {
    onNavigate?: (page: string) => void;
    onProceedWithData?: (page: string, data: SharedBRDData) => void;
}

interface ResearchInput {
    productIdea: string;
    industry: string;
    targetAudience: string;
    geography: string;
}

interface MarketData {
    tam: string;
    sam: string;
    som: string;
    growthRate: string;
}

interface PainPoint {
    pain: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
    affectedUsers: string;
}

interface Competitor {
    name: string;
    strengths: string[];
    weaknesses: string[];
    pricing: string;
}

interface BRDOutput {
    executiveSummary: string;
    marketAnalysis: MarketData;
    painPoints: PainPoint[];
    competitors: Competitor[];
    opportunities: string[];
    threats: string[];
    sources: string[];
    confidenceScore: number;
}

const MarketResearch: React.FC<MarketResearchProps> = ({ onNavigate, onProceedWithData }) => {
    const [input, setInput] = useState<ResearchInput>({
        productIdea: '',
        industry: '',
        targetAudience: '',
        geography: 'Vietnam',
    });
    const [isResearching, setIsResearching] = useState(false);
    const [output, setOutput] = useState<BRDOutput | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [activeStep, setActiveStep] = useState<number>(0);

    const steps = [
        'Market Size Analysis',
        'Competitor Research',
        'Pain Point Discovery',
        'Synthesizing BRD',
    ];

    const handleInputChange = (field: keyof ResearchInput, value: string) => {
        setInput(prev => ({ ...prev, [field]: value }));
    };

    const runResearch = async () => {
        if (!input.productIdea || !input.industry) {
            setError('Vui lòng nhập Ý tưởng sản phẩm và Ngành nghề');
            return;
        }

        setIsResearching(true);
        setError(null);
        setOutput(null);

        try {
            // Step 1: Market Size Analysis
            setActiveStep(1);
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Step 2: Competitor Analysis
            setActiveStep(2);
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Step 3: Pain Point Discovery
            setActiveStep(3);
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Step 4: Synthesize
            setActiveStep(4);
            await new Promise(resolve => setTimeout(resolve, 500));

            // Mock BRD output (TODO: Integrate real Perplexity MCP)
            const brd: BRDOutput = {
                executiveSummary: `## Market Research Results for ${input.productIdea}

### Market Analysis
- **TAM (Total Addressable Market):** Estimated $5B for ${input.industry} in ${input.geography}
- **SAM (Serviceable Addressable Market):** ~$500M targeting ${input.targetAudience || 'SMEs'}
- **SOM (Serviceable Obtainable Market):** $25M achievable in Year 1
- **Growth Rate:** 15-20% CAGR

### Top Pain Points
1. Complex pricing structures
2. Poor user experience
3. Lack of local support
4. Integration difficulties

### Competitor Landscape
| Competitor | Strengths | Weaknesses |
|------------|-----------|------------|
| Competitor A | Market leader | Expensive |
| Competitor B | Good UX | Limited features |
| Competitor C | Local presence | Outdated tech |

### Opportunities
- Gap in mid-market segment
- Rising demand for AI features
- Underserved ${input.geography} market

*Note: This is mock data. Integrate Perplexity MCP for real research.*`,
                marketAnalysis: {
                    tam: '$5B',
                    sam: '$500M',
                    som: '$25M',
                    growthRate: '15-20% CAGR',
                },
                painPoints: [
                    { pain: 'Complex pricing', severity: 'high', affectedUsers: input.targetAudience || 'SMEs' },
                    { pain: 'Poor UX', severity: 'critical', affectedUsers: 'All users' },
                    { pain: 'Lack of local support', severity: 'medium', affectedUsers: 'International users' },
                ],
                competitors: [
                    { name: 'Competitor A', strengths: ['Market leader', 'Strong brand'], weaknesses: ['Expensive'], pricing: '$$$' },
                    { name: 'Competitor B', strengths: ['Good UX'], weaknesses: ['Limited features'], pricing: '$$' },
                ],
                opportunities: ['Gap in mid-market', 'Rising AI demand'],
                threats: ['Strong competition', 'Economic uncertainty'],
                sources: ['Mock Data - Integrate Perplexity MCP'],
                confidenceScore: 60,
            };

            setOutput(brd);

        } catch (err) {
            setError(err instanceof Error ? err.message : 'Research failed');
        } finally {
            setIsResearching(false);
            setActiveStep(0);
        }
    };

    const exportToBRD = () => {
        if (!output) return;

        const brdContent = `# Business Requirement Document (BRD)
## ${input.productIdea} - Phase 1 Discovery

### 1. Executive Summary
${output.executiveSummary}

### 2. Input Parameters
- **Product Idea:** ${input.productIdea}
- **Industry:** ${input.industry}
- **Target Audience:** ${input.targetAudience}
- **Geography:** ${input.geography}

### 3. Confidence Score
**${output.confidenceScore}/100**

---
*Generated by Market Research Agent*
*Sources: ${output.sources.join(', ')}*
`;

        // Create downloadable file
        const blob = new Blob([brdContent], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `BRD-${input.productIdea.replace(/\s+/g, '-')}.md`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        alert('✅ BRD exported successfully!');
    };

    const handleProceedToFeasibility = () => {
        if (!output) {
            alert('Vui lòng chạy Research trước!');
            return;
        }

        const brdData: SharedBRDData = {
            productIdea: input.productIdea,
            industry: input.industry,
            targetAudience: input.targetAudience,
            geography: input.geography,
            brdSummary: output.executiveSummary,
        };

        if (onProceedWithData) {
            onProceedWithData('feasibility', brdData);
        } else if (onNavigate) {
            onNavigate('feasibility');
        } else {
            alert('Navigating to Feasibility Checker...');
        }
    };

    return (
        <div className="market-research">
            <header className="market-research-header">
                <h1>🔬 Market Research</h1>
                <p>Phase 1.1 - Discovery & Strategy</p>
            </header>

            <div className="research-container">
                {/* Input Form */}
                <section className="input-section">
                    <h2>📝 Research Parameters</h2>

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
                        <label>Ngành nghề *</label>
                        <input
                            type="text"
                            value={input.industry}
                            onChange={(e) => handleInputChange('industry', e.target.value)}
                            placeholder="VD: SaaS, EdTech, FinTech"
                        />
                    </div>

                    <div className="form-group">
                        <label>Đối tượng mục tiêu</label>
                        <input
                            type="text"
                            value={input.targetAudience}
                            onChange={(e) => handleInputChange('targetAudience', e.target.value)}
                            placeholder="VD: SME owners, Sales managers"
                        />
                    </div>

                    <div className="form-group">
                        <label>Thị trường địa lý</label>
                        <select
                            value={input.geography}
                            onChange={(e) => handleInputChange('geography', e.target.value)}
                        >
                            <option value="Vietnam">🇻🇳 Vietnam</option>
                            <option value="Southeast Asia">🌏 Southeast Asia</option>
                            <option value="Global">🌐 Global</option>
                        </select>
                    </div>

                    <button
                        className="research-btn"
                        onClick={runResearch}
                        disabled={isResearching}
                    >
                        {isResearching ? '🔄 Đang nghiên cứu...' : '🚀 Bắt đầu Research'}
                    </button>
                </section>

                {/* Progress Steps */}
                {isResearching && (
                    <section className="progress-section">
                        <h2>📊 Research Progress</h2>
                        <div className="steps">
                            {steps.map((step, index) => (
                                <div
                                    key={step}
                                    className={`step ${index + 1 === activeStep ? 'active' : ''} ${index + 1 < activeStep ? 'completed' : ''}`}
                                >
                                    <div className="step-number">{index + 1}</div>
                                    <div className="step-label">{step}</div>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* Error Display */}
                {error && (
                    <div className="error-message">
                        ⚠️ {error}
                    </div>
                )}

                {/* Output Display */}
                {output && (
                    <section className="output-section">
                        <div className="output-header">
                            <h2>📋 BRD Draft</h2>
                            <div className="confidence">
                                Confidence: <strong>{output.confidenceScore}%</strong>
                            </div>
                        </div>

                        <div className="brd-content">
                            <pre>{output.executiveSummary}</pre>
                        </div>

                        <div className="output-actions">
                            <button className="export-btn" onClick={exportToBRD}>
                                📥 Export BRD.md
                            </button>
                            <button className="next-btn" onClick={handleProceedToFeasibility}>
                                ➡️ Proceed to Feasibility Check
                            </button>
                        </div>
                    </section>
                )}
            </div>
        </div>
    );
};

export default MarketResearch;
