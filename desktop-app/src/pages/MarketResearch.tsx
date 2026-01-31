import React, { useState } from 'react';
import './MarketResearch.css';

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

const MarketResearch: React.FC = () => {
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
            const marketQuery = `Analyze market size for ${input.industry} in ${input.geography}:
        - TAM (Total Addressable Market)
        - SAM (Serviceable Addressable Market)
        - SOM (Serviceable Obtainable Market)
        - Growth rate and trends
        Provide specific numbers with sources.`;

            const { invoke } = await import('@tauri-apps/api/core');

            const marketResult = await invoke<{ content: string }>('perplexity_ask', {
                query: marketQuery,
            });

            // Step 2: Competitor Analysis
            setActiveStep(2);
            const competitorQuery = `List top 5 competitors in ${input.industry} for ${input.productIdea}:
        - Company name
        - Key features/products
        - Pricing model
        - Strengths and weaknesses`;

            const competitorResult = await invoke<{ content: string }>('perplexity_ask', {
                query: competitorQuery,
            });

            // Step 3: Pain Point Discovery
            setActiveStep(3);
            const painQuery = `What are the top pain points for ${input.targetAudience} regarding ${input.productIdea}?
        Search Reddit, forums, app reviews for real user complaints.`;

            const painResult = await invoke<{ content: string }>('perplexity_ask', {
                query: painQuery,
            });

            // Step 4: Synthesize
            setActiveStep(4);

            // Parse and combine results
            const brd: BRDOutput = {
                executiveSummary: `Market analysis for ${input.productIdea} in ${input.industry} targeting ${input.targetAudience} in ${input.geography}.`,
                marketAnalysis: {
                    tam: 'Extracted from research',
                    sam: 'Extracted from research',
                    som: 'Extracted from research',
                    growthRate: 'Extracted from research',
                },
                painPoints: [
                    { pain: 'Pain point 1', severity: 'high', affectedUsers: input.targetAudience },
                ],
                competitors: [
                    { name: 'Competitor 1', strengths: ['Strong brand'], weaknesses: ['High price'], pricing: '$' },
                ],
                opportunities: ['Market gap identified'],
                threats: ['Strong competition'],
                sources: ['perplexity.ai'],
                confidenceScore: 75,
            };

            // Store raw results for display
            setOutput({
                ...brd,
                executiveSummary: `## Market Research Results\n\n### Market Analysis\n${marketResult.content}\n\n### Competitors\n${competitorResult.content}\n\n### Pain Points\n${painResult.content}`,
            });

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
        a.click();
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
                            <button className="next-btn">
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
