import React, { useState, useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import './TaskExecutor.css';

interface TaskResult {
    id: string;
    task: string;
    agent: string;
    status: 'pending' | 'running' | 'completed' | 'failed';
    result?: string;
    executionTime?: number;
    timestamp: string;
    cost?: string;
}

interface TauriTaskResult {
    success: boolean;
    output: string;
    agent_used: string;
    execution_time: number;
}

const TaskExecutor: React.FC = () => {
    const [taskInput, setTaskInput] = useState('');
    const [selectedAgent, setSelectedAgent] = useState('auto');
    const [isExecuting, setIsExecuting] = useState(false);
    const [taskHistory, setTaskHistory] = useState<TaskResult[]>([]);
    const [projectContext, setProjectContext] = useState<string>('');
    const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
    const chatEndRef = useRef<HTMLDivElement>(null);

    const agents = [
        { id: 'auto', name: 'Tự động', icon: '🤖', description: 'Hệ thống tự chọn agent phù hợp', color: '#6366f1' },
        { id: 'api', name: 'API Agent', icon: '🧠', description: 'Phân tích, sáng tạo, tư vấn', color: '#8b5cf6' },
        { id: 'cli', name: 'CLI Agent', icon: '💻', description: 'Thực thi lệnh shell', color: '#22c55e' },
        { id: 'antigravity', name: 'Antigravity', icon: '🚀', description: 'Batch operations', color: '#f59e0b' },
    ];

    useEffect(() => {
        loadContext();
    }, []);

    useEffect(() => {
        // Auto scroll to bottom when new message added
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [taskHistory]);

    const loadContext = async () => {
        try {
            const context = await invoke<string>('get_context');
            setProjectContext(context);
        } catch (error) {
            console.error('Failed to load context:', error);
        }
    };

    const handleExecuteTask = async () => {
        if (!taskInput.trim() || isExecuting) return;

        const newTask: TaskResult = {
            id: Date.now().toString(),
            task: taskInput,
            agent: selectedAgent,
            status: 'running',
            timestamp: new Date().toLocaleString('vi-VN'),
        };

        setTaskHistory(prev => [...prev, newTask]);
        setIsExecuting(true);
        setExpandedTasks(prev => new Set(prev).add(newTask.id));

        const taskDescription = taskInput;
        setTaskInput('');

        try {
            const result = await invoke<TauriTaskResult>('execute_task', {
                task: taskDescription,
                agent: selectedAgent,
            });

            setTaskHistory(prev =>
                prev.map(t =>
                    t.id === newTask.id
                        ? {
                            ...t,
                            status: result.success ? 'completed' : 'failed',
                            result: result.output,
                            executionTime: result.execution_time,
                        }
                        : t
                )
            );
        } catch (error) {
            setTaskHistory(prev =>
                prev.map(t =>
                    t.id === newTask.id
                        ? {
                            ...t,
                            status: 'failed',
                            result: `Error: ${error}`,
                        }
                        : t
                )
            );
        } finally {
            setIsExecuting(false);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleExecuteTask();
        }
    };

    const toggleTaskExpand = (taskId: string) => {
        setExpandedTasks(prev => {
            const newSet = new Set(prev);
            if (newSet.has(taskId)) {
                newSet.delete(taskId);
            } else {
                newSet.add(taskId);
            }
            return newSet;
        });
    };

    const getAgentInfo = (agentId: string) => {
        return agents.find(a => a.id === agentId) || agents[0];
    };

    return (
        <div className="task-executor-v2">
            {/* Header */}
            <div className="executor-header-v2">
                <div className="header-left">
                    <h2>💬 AI Task Chat</h2>
                    <p>Giao tiếp với AI agents để thực thi các tác vụ</p>
                </div>
                {projectContext && (
                    <div className="context-badge-v2">
                        <span className="badge-dot" />
                        Context loaded
                    </div>
                )}
            </div>

            {/* Chat Container */}
            <div className="chat-container">
                {/* Empty State */}
                {taskHistory.length === 0 && (
                    <div className="chat-empty-state">
                        <div className="empty-icon">🤖</div>
                        <h3>Chào mừng đến với Vibecode AI</h3>
                        <p>Nhập task bên dưới để bắt đầu làm việc với AI agents</p>

                        <div className="quick-actions-grid">
                            <button onClick={() => setTaskInput('Phân tích cấu trúc project và đề xuất cải tiến')}>
                                <span className="action-icon">📊</span>
                                <span className="action-text">Phân tích Project</span>
                            </button>
                            <button onClick={() => setTaskInput('Chạy build và kiểm tra lỗi')}>
                                <span className="action-icon">🔨</span>
                                <span className="action-text">Build Project</span>
                            </button>
                            <button onClick={() => setTaskInput('Tạo unit tests cho các functions')}>
                                <span className="action-icon">🧪</span>
                                <span className="action-text">Tạo Tests</span>
                            </button>
                            <button onClick={() => setTaskInput('Refactor code theo best practices')}>
                                <span className="action-icon">♻️</span>
                                <span className="action-text">Refactor Code</span>
                            </button>
                        </div>
                    </div>
                )}

                {/* Chat Messages */}
                {taskHistory.map(task => (
                    <div key={task.id} className="chat-message-group">
                        {/* User Message */}
                        <div className="message user-message">
                            <div className="message-avatar user">
                                <span>👤</span>
                            </div>
                            <div className="message-content">
                                <div className="message-header">
                                    <span className="message-author">Bạn</span>
                                    <span className="message-time">{task.timestamp}</span>
                                </div>
                                <div className="message-text">{task.task}</div>
                                <div className="message-agent-tag" style={{ backgroundColor: getAgentInfo(task.agent).color }}>
                                    {getAgentInfo(task.agent).icon} {getAgentInfo(task.agent).name}
                                </div>
                            </div>
                        </div>

                        {/* AI Response */}
                        <div className={`message ai-message ${task.status}`}>
                            <div className="message-avatar ai">
                                <span>{getAgentInfo(task.agent).icon}</span>
                            </div>
                            <div className="message-content">
                                <div className="message-header">
                                    <span className="message-author">{getAgentInfo(task.agent).name}</span>
                                    {task.executionTime && (
                                        <span className="message-time">{task.executionTime.toFixed(1)}s</span>
                                    )}
                                    <span className={`status-indicator ${task.status}`}>
                                        {task.status === 'running' && <><span className="spinner-mini" /> Đang xử lý...</>}
                                        {task.status === 'completed' && '✅ Hoàn thành'}
                                        {task.status === 'failed' && '❌ Thất bại'}
                                    </span>
                                </div>

                                {task.status === 'running' ? (
                                    <div className="message-loading">
                                        <div className="typing-indicator">
                                            <span></span>
                                            <span></span>
                                            <span></span>
                                        </div>
                                        <span className="loading-text">AI đang suy nghĩ...</span>
                                    </div>
                                ) : task.result ? (
                                    <div className="message-result">
                                        <div
                                            className={`result-content ${expandedTasks.has(task.id) ? 'expanded' : 'collapsed'}`}
                                            onClick={() => toggleTaskExpand(task.id)}
                                        >
                                            <pre>{task.result}</pre>
                                        </div>
                                        {task.result.split('\n').length > 10 && (
                                            <button
                                                className="expand-btn"
                                                onClick={() => toggleTaskExpand(task.id)}
                                            >
                                                {expandedTasks.has(task.id) ? '▲ Thu gọn' : '▼ Xem thêm'}
                                            </button>
                                        )}
                                    </div>
                                ) : null}

                                {/* Action Buttons */}
                                {task.status === 'completed' && (
                                    <div className="message-actions">
                                        <button onClick={() => navigator.clipboard.writeText(task.result || '')}>
                                            📋 Copy
                                        </button>
                                        <button onClick={() => setTaskInput(`Tiếp tục với: ${task.task}`)}>
                                            🔄 Tiếp tục
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ))}

                <div ref={chatEndRef} />
            </div>

            {/* Input Area - Sticky at bottom */}
            <div className="chat-input-area">
                {/* Agent Selector */}
                <div className="agent-selector-v2">
                    {agents.map(agent => (
                        <button
                            key={agent.id}
                            className={`agent-chip ${selectedAgent === agent.id ? 'active' : ''}`}
                            onClick={() => setSelectedAgent(agent.id)}
                            style={{ '--agent-color': agent.color } as React.CSSProperties}
                            title={agent.description}
                        >
                            <span className="chip-icon">{agent.icon}</span>
                            <span className="chip-name">{agent.name}</span>
                        </button>
                    ))}
                </div>

                {/* Input Box */}
                <div className="input-box">
                    <textarea
                        placeholder="Nhập task của bạn... (Shift+Enter để xuống dòng)"
                        value={taskInput}
                        onChange={(e) => setTaskInput(e.target.value)}
                        onKeyPress={handleKeyPress}
                        rows={1}
                        disabled={isExecuting}
                    />
                    <button
                        className="send-btn"
                        onClick={handleExecuteTask}
                        disabled={isExecuting || !taskInput.trim()}
                    >
                        {isExecuting ? (
                            <span className="spinner-btn" />
                        ) : (
                            <SendIcon />
                        )}
                    </button>
                </div>

                <div className="input-hint">
                    Nhấn <kbd>Enter</kbd> để gửi • <kbd>Shift+Enter</kbd> để xuống dòng
                </div>
            </div>
        </div>
    );
};

const SendIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
    </svg>
);

export default TaskExecutor;
