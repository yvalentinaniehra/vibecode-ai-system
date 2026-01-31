// src/pages/WorkflowGenerator.tsx

import { useState } from 'react';
import { generateWorkflow, saveWorkflow, type WorkflowResult } from '../services/workflowGenerator';
import './WorkflowGenerator.css';

export default function WorkflowGenerator() {
    const [userStory, setUserStory] = useState('');
    const [result, setResult] = useState<WorkflowResult | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [saveSuccess, setSaveSuccess] = useState(false);

    const handleGenerate = async () => {
        if (!userStory.trim()) {
            setError('Please enter a user story');
            return;
        }

        setIsGenerating(true);
        setError(null);
        setSaveSuccess(false);

        try {
            const workflowResult = await generateWorkflow(userStory);

            if (workflowResult.success) {
                setResult(workflowResult);
            } else {
                setError(workflowResult.errors.join(', ') || 'Failed to generate workflow');
            }
        } catch (err) {
            setError(String(err));
        } finally {
            setIsGenerating(false);
        }
    };

    const handleSave = async () => {
        if (!result) return;

        setIsSaving(true);
        setError(null);

        try {
            const saveResult = await saveWorkflow(result.content, result.filename);

            if (saveResult.success) {
                setSaveSuccess(true);
                setTimeout(() => setSaveSuccess(false), 3000);
            } else {
                setError(saveResult.error || 'Failed to save workflow');
            }
        } catch (err) {
            setError(String(err));
        } finally {
            setIsSaving(false);
        }
    };

    const handleReset = () => {
        setUserStory('');
        setResult(null);
        setError(null);
        setSaveSuccess(false);
    };

    return (
        <div className="workflow-generator">
            <header className="generator-header">
                <h1>✨ Workflow Generator</h1>
                <p>Auto-generate workflow files from user stories</p>
            </header>

            <div className="generator-content">
                {/* Input Section */}
                <section className="input-section">
                    <label htmlFor="user-story">
                        <strong>User Story / Feature Description</strong>
                    </label>
                    <textarea
                        id="user-story"
                        className="user-story-input"
                        placeholder="Describe your feature or task...&#10;&#10;Example: Deploy backend API to Google Cloud Run with CI/CD pipeline"
                        value={userStory}
                        onChange={(e) => setUserStory(e.target.value)}
                        disabled={isGenerating}
                        rows={6}
                    />

                    <div className="button-group">
                        <button
                            className="btn btn-primary"
                            onClick={handleGenerate}
                            disabled={isGenerating || !userStory.trim()}
                        >
                            {isGenerating ? '🔄 Generating...' : '🚀 Generate Workflow'}
                        </button>

                        {result && (
                            <button
                                className="btn btn-secondary"
                                onClick={handleReset}
                                disabled={isGenerating}
                            >
                                🔄 Reset
                            </button>
                        )}
                    </div>

                    {error && (
                        <div className="alert alert-error">
                            ⚠️ {error}
                        </div>
                    )}

                    {saveSuccess && (
                        <div className="alert alert-success">
                            ✅ Workflow saved successfully!
                        </div>
                    )}
                </section>

                {/* Preview Section */}
                {result && (
                    <section className="preview-section">
                        <div className="preview-header">
                            <h2>📄 Preview</h2>
                            <div className="preview-meta">
                                <span className="filename">📁 {result.filename}</span>
                            </div>
                        </div>

                        <div className="preview-content">
                            <pre>{result.content}</pre>
                        </div>

                        <div className="preview-actions">
                            <button
                                className="btn btn-success"
                                onClick={handleSave}
                                disabled={isSaving}
                            >
                                {isSaving ? '💾 Saving...' : '💾 Save to .agent/workflows/'}
                            </button>
                        </div>
                    </section>
                )}

                {/* Help Section */}
                {!result && (
                    <section className="help-section">
                        <h3>💡 How to use</h3>
                        <ol>
                            <li>Describe your feature or task in natural language</li>
                            <li>Click "Generate Workflow" to create the workflow file</li>
                            <li>Review the generated content in the preview</li>
                            <li>Click "Save" to add it to your workflows directory</li>
                        </ol>

                        <h3>📝 Example User Stories</h3>
                        <ul>
                            <li>"Deploy backend API to Google Cloud Run"</li>
                            <li>"Create database schema for user authentication"</li>
                            <li>"Build React component for dashboard"</li>
                            <li>"Setup CI/CD pipeline with GitHub Actions"</li>
                        </ul>
                    </section>
                )}
            </div>
        </div>
    );
}
