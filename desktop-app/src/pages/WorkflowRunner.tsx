import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import './WorkflowRunner.css';

interface Workflow {
    id: string;
    name: string;
    description: string;
    icon: string;
    steps: string[];
    lastRun?: string;
    status: 'idle' | 'running' | 'completed' | 'error';
}

interface WorkflowInfo {
    name: string;
    description: string;
}

interface TauriTaskResult {
    success: boolean;
    output: string;
    agent_used: string;
    execution_time: number;
}

const WorkflowRunner: React.FC = () => {
    const [workflows, setWorkflows] = useState<Workflow[]>([]);
    const [selectedWorkflow, setSelectedWorkflow] = useState<string | null>(null);
    const [runningWorkflow, setRunningWorkflow] = useState<string | null>(null);
    const [workflowLogs, setWorkflowLogs] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newWorkflowName, setNewWorkflowName] = useState('');

    // Load workflows on mount
    useEffect(() => {
        loadWorkflows();
    }, []);

    const loadWorkflows = async () => {
        setIsLoading(true);
        try {
            const workflowList = await invoke<WorkflowInfo[]>('list_workflows');

            // Map workflow names to icons and steps
            const workflowIcons: Record<string, string> = {
                'feature': '🚀',
                'bugfix': '🐛',
                'code-review': '🔍',
                'ocean-edu-feature': '🌊',
                'quick-task': '⚡',
            };

            const workflowSteps: Record<string, string[]> = {
                'feature': ['PRD Review', 'Technical Design', 'Implementation', 'Code Review', 'Testing', 'Deploy'],
                'bugfix': ['Diagnose', 'Root Cause Analysis', 'Fix Implementation', 'Testing', 'Verify'],
                'code-review': ['Code Analysis', 'Style Check', 'Logic Review', 'Security Scan', 'Report'],
                'ocean-edu-feature': ['Requirements', 'Design', 'Implement', 'Test', 'Deploy'],
                'quick-task': ['Analyze', 'Execute', 'Verify'],
            };

            const mappedWorkflows: Workflow[] = workflowList.map((w) => ({
                id: w.name,
                name: w.name,
                description: w.description,
                icon: workflowIcons[w.name] || '📋',
                steps: workflowSteps[w.name] || ['Step 1', 'Step 2', 'Step 3'],
                status: 'idle' as const,
            }));

            setWorkflows(mappedWorkflows);

            // If no workflows from backend, show default ones
            if (mappedWorkflows.length === 0) {
                setWorkflows(getDefaultWorkflows());
            }
        } catch (error) {
            console.error('Failed to load workflows:', error);
            // Fallback to default workflows
            setWorkflows(getDefaultWorkflows());
        } finally {
            setIsLoading(false);
        }
    };

    const getDefaultWorkflows = (): Workflow[] => [
        {
            id: 'feature',
            name: 'feature',
            description: 'Develop a new feature from start to finish',
            icon: '🚀',
            steps: ['PRD Review', 'Technical Design', 'Implementation', 'Code Review', 'Testing', 'Deploy'],
            status: 'idle',
        },
        {
            id: 'bugfix',
            name: 'bugfix',
            description: 'Diagnose and fix bugs systematically',
            icon: '🐛',
            steps: ['Diagnose', 'Root Cause Analysis', 'Fix Implementation', 'Testing', 'Verify'],
            status: 'idle',
        },
        {
            id: 'code-review',
            name: 'code-review',
            description: 'Comprehensive code review process',
            icon: '🔍',
            steps: ['Code Analysis', 'Style Check', 'Logic Review', 'Security Scan', 'Report'],
            status: 'idle',
        },
        {
            id: 'quick-task',
            name: 'quick-task',
            description: 'Fast execution for simple tasks',
            icon: '⚡',
            steps: ['Analyze', 'Execute', 'Verify'],
            status: 'idle',
        },
    ];

    const handleRunWorkflow = async (workflowId: string) => {
        const workflow = workflows.find(w => w.id === workflowId);
        if (!workflow) return;

        setRunningWorkflow(workflowId);
        setSelectedWorkflow(workflowId);
        setWorkflowLogs([`▶️ Bắt đầu workflow: ${workflow.name}`]);

        try {
            // Call real Tauri command
            const result = await invoke<TauriTaskResult>('run_workflow', {
                name: workflow.name,
                dryRun: false,
            });

            // Parse and display output line by line
            const lines = result.output.split('\n').filter(line => line.trim());
            lines.forEach(line => {
                setWorkflowLogs(prev => [...prev, line]);
            });

            if (result.success) {
                setWorkflowLogs(prev => [...prev, `✅ Workflow hoàn thành thành công! (${result.execution_time.toFixed(1)}s)`]);
            } else {
                setWorkflowLogs(prev => [...prev, `❌ Workflow thất bại`]);
            }
        } catch (error) {
            setWorkflowLogs(prev => [...prev, `❌ Error: ${error}`]);
        } finally {
            setRunningWorkflow(null);
        }
    };

    const handleDryRun = async (workflowId: string) => {
        const workflow = workflows.find(w => w.id === workflowId);
        if (!workflow) return;

        setSelectedWorkflow(workflowId);
        setWorkflowLogs([`🔍 Preview workflow: ${workflow.name} (dry-run)`]);

        try {
            const result = await invoke<TauriTaskResult>('run_workflow', {
                name: workflow.name,
                dryRun: true,
            });

            const lines = result.output.split('\n').filter(line => line.trim());
            lines.forEach(line => {
                setWorkflowLogs(prev => [...prev, line]);
            });
        } catch (error) {
            setWorkflowLogs(prev => [...prev, `❌ Error: ${error}`]);
        }
    };

    const showNotification = (message: string, type: 'success' | 'error' | 'info') => {
        setNotification({ message, type });
        setTimeout(() => setNotification(null), 3000);
    };

    const handleOpenWorkflowsFolder = async () => {
        try {
            const path = await invoke<string>('open_workflows_folder');
            showNotification(`📂 Đã mở thư mục: ${path}`, 'success');
        } catch (error) {
            showNotification(`❌ Lỗi: ${error}`, 'error');
        }
    };

    const handleCreateWorkflow = async () => {
        if (!newWorkflowName.trim()) {
            showNotification('⚠️ Vui lòng nhập tên workflow', 'error');
            return;
        }

        try {
            const path = await invoke<string>('create_workflow', { name: newWorkflowName });
            showNotification(`✅ Đã tạo workflow: ${path}`, 'success');
            setShowCreateModal(false);
            setNewWorkflowName('');
            // Reload workflows
            loadWorkflows();
        } catch (error) {
            showNotification(`❌ Lỗi: ${error}`, 'error');
        }
    };

    return (
        <div className="workflow-runner">
            <div className="runner-header">
                <h2>⚡ Workflow Runner</h2>
                <p>Chọn và chạy các workflow được định nghĩa trong Vibecode</p>
                <button className="refresh-btn" onClick={loadWorkflows} disabled={isLoading}>
                    {isLoading ? '⏳' : '🔄'} Refresh
                </button>
            </div>

            <div className="runner-layout">
                {/* Workflow List */}
                <div className="workflow-list">
                    <h3>Workflows có sẵn ({workflows.length})</h3>

                    {isLoading ? (
                        <div className="loading-state">
                            <span className="spinner-large" />
                            <p>Đang tải workflows...</p>
                        </div>
                    ) : (
                        <div className="workflows-grid">
                            {workflows.map(workflow => (
                                <div
                                    key={workflow.id}
                                    className={`workflow-card ${selectedWorkflow === workflow.id ? 'selected' : ''} ${runningWorkflow === workflow.id ? 'running' : ''}`}
                                    onClick={() => setSelectedWorkflow(workflow.id)}
                                >
                                    <div className="workflow-icon">{workflow.icon}</div>
                                    <div className="workflow-info">
                                        <h4>{workflow.name}</h4>
                                        <p>{workflow.description}</p>
                                    </div>
                                    <div className="workflow-meta">
                                        <span className="step-count">{workflow.steps.length} bước</span>
                                    </div>
                                    <div className="workflow-actions">
                                        <button
                                            className="run-btn"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleRunWorkflow(workflow.id);
                                            }}
                                            disabled={runningWorkflow !== null}
                                            title="Chạy workflow"
                                        >
                                            {runningWorkflow === workflow.id ? (
                                                <span className="spinner-small" />
                                            ) : (
                                                <PlayIcon />
                                            )}
                                        </button>
                                        <button
                                            className="preview-btn"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDryRun(workflow.id);
                                            }}
                                            disabled={runningWorkflow !== null}
                                            title="Preview (dry-run)"
                                        >
                                            👁️
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Workflow Details & Logs */}
                <div className="workflow-details">
                    {selectedWorkflow ? (
                        <>
                            <div className="details-section">
                                <h3>Chi tiết Workflow</h3>
                                <div className="workflow-steps">
                                    {workflows.find(w => w.id === selectedWorkflow)?.steps.map((step, index) => (
                                        <div key={index} className="step-item">
                                            <span className="step-number">{index + 1}</span>
                                            <span className="step-name">{step}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {workflowLogs.length > 0 && (
                                <div className="logs-section">
                                    <div className="logs-header">
                                        <h3>Execution Logs</h3>
                                        <button
                                            className="clear-logs-btn"
                                            onClick={() => setWorkflowLogs([])}
                                        >
                                            Clear
                                        </button>
                                    </div>
                                    <div className="logs-container">
                                        {workflowLogs.map((log, index) => (
                                            <div key={index} className="log-line">{log}</div>
                                        ))}
                                        {runningWorkflow && (
                                            <div className="log-line running">
                                                <span className="spinner-small inline" /> Đang thực thi...
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="no-selection">
                            <span className="no-selection-icon">📋</span>
                            <p>Chọn một workflow để xem chi tiết</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Custom Workflow */}
            <div className="custom-workflow-section">
                <h3>🛠️ Tạo Workflow mới</h3>
                <p>Tạo workflow bằng cách thêm file YAML vào <code>workflows/</code></p>
                <div className="custom-workflow-buttons">
                    <button className="create-workflow-btn" onClick={() => setShowCreateModal(true)}>
                        <PlusIcon /> Tạo mới
                    </button>
                    <button className="open-folder-btn" onClick={handleOpenWorkflowsFolder}>
                        <FolderIcon /> Mở thư mục
                    </button>
                </div>
            </div>

            {/* Create Workflow Modal */}
            {showCreateModal && (
                <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <h3>📝 Tạo Workflow Mới</h3>
                        <p>Nhập tên cho workflow mới:</p>
                        <input
                            type="text"
                            value={newWorkflowName}
                            onChange={(e) => setNewWorkflowName(e.target.value)}
                            placeholder="Ví dụ: my-feature-workflow"
                            onKeyPress={(e) => e.key === 'Enter' && handleCreateWorkflow()}
                            autoFocus
                        />
                        <div className="modal-actions">
                            <button className="cancel-btn" onClick={() => setShowCreateModal(false)}>Hủy</button>
                            <button className="confirm-btn" onClick={handleCreateWorkflow}>Tạo</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Notification Toast */}
            {notification && (
                <div className={`notification-toast ${notification.type}`}>
                    {notification.message}
                </div>
            )}
        </div>
    );
};

const PlayIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
        <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
);

const PlusIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <line x1="12" y1="5" x2="12" y2="19" />
        <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
);

const FolderIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
);

export default WorkflowRunner;
