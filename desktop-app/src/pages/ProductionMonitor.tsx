import React, { useState, useEffect } from 'react';
import './ProductionMonitor.css';

interface CloudRunService {
    name: string;
    region: string;
    url: string;
    status: 'Running' | 'Deploying' | 'Failed' | 'Unknown';
    lastDeployed: string;
    memory: string;
    cpu: string;
}

interface LogEntry {
    timestamp: string;
    severity: 'INFO' | 'WARNING' | 'ERROR' | 'DEBUG';
    message: string;
}

const ProductionMonitor: React.FC = () => {
    const [projectId, setProjectId] = useState('');
    const [services, setServices] = useState<CloudRunService[]>([]);
    const [selectedService, setSelectedService] = useState<string | null>(null);
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingLogs, setIsLoadingLogs] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const loadServices = async () => {
        if (!projectId) {
            setError('Vui lòng nhập Project ID');
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const { invoke } = await import('@tauri-apps/api/core');

            const result = await invoke<{ services: CloudRunService[] }>('list_cloudrun_services', {
                projectId,
            });

            setServices(result.services || []);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load services');
            // Mock data for demo
            setServices([
                {
                    name: 'ai-backend-api',
                    region: 'asia-southeast1',
                    url: 'https://ai-backend-api-xxx.run.app',
                    status: 'Running',
                    lastDeployed: '2 hours ago',
                    memory: '512Mi',
                    cpu: '1',
                },
                {
                    name: 'webhook-handler',
                    region: 'asia-southeast1',
                    url: 'https://webhook-handler-xxx.run.app',
                    status: 'Running',
                    lastDeployed: '1 day ago',
                    memory: '256Mi',
                    cpu: '1',
                },
            ]);
        } finally {
            setIsLoading(false);
        }
    };

    const loadLogs = async (serviceName: string) => {
        setSelectedService(serviceName);
        setIsLoadingLogs(true);

        try {
            const { invoke } = await import('@tauri-apps/api/core');

            const result = await invoke<{ logs: LogEntry[] }>('get_service_logs', {
                projectId,
                service: serviceName,
            });

            setLogs(result.logs || []);
        } catch (err) {
            // Mock logs for demo
            setLogs([
                { timestamp: '16:20:00', severity: 'INFO', message: 'Server started on port 8080' },
                { timestamp: '16:20:01', severity: 'INFO', message: 'Connected to database' },
                { timestamp: '16:21:30', severity: 'INFO', message: 'Received request: POST /api/chat' },
                { timestamp: '16:21:31', severity: 'INFO', message: 'AI response generated in 1.2s' },
                { timestamp: '16:22:00', severity: 'WARNING', message: 'High memory usage: 85%' },
                { timestamp: '16:22:15', severity: 'INFO', message: 'Health check: OK' },
            ]);
        } finally {
            setIsLoadingLogs(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Running': return '#10b981';
            case 'Deploying': return '#f59e0b';
            case 'Failed': return '#ef4444';
            default: return '#888';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'Running': return '✅';
            case 'Deploying': return '🔄';
            case 'Failed': return '❌';
            default: return '❓';
        }
    };

    const getSeverityColor = (severity: string) => {
        switch (severity) {
            case 'ERROR': return '#ef4444';
            case 'WARNING': return '#f59e0b';
            case 'DEBUG': return '#888';
            default: return '#10b981';
        }
    };

    useEffect(() => {
        // Auto-refresh logs every 10 seconds
        const interval = setInterval(() => {
            if (selectedService) {
                loadLogs(selectedService);
            }
        }, 10000);

        return () => clearInterval(interval);
    }, [selectedService]);

    return (
        <div className="production-monitor">
            <header className="monitor-header">
                <h1>📊 Production Monitor</h1>
                <p>Phase 5.3 - Cloud Run Services Dashboard</p>
            </header>

            <div className="monitor-container">
                {/* Project Selection */}
                <section className="project-section">
                    <div className="project-input">
                        <input
                            type="text"
                            value={projectId}
                            onChange={(e) => setProjectId(e.target.value)}
                            placeholder="GCP Project ID"
                        />
                        <button onClick={loadServices} disabled={isLoading}>
                            {isLoading ? '🔄' : '🔍'} Load Services
                        </button>
                    </div>
                </section>

                {error && (
                    <div className="error-message">
                        ⚠️ {error}
                    </div>
                )}

                {/* Services Grid */}
                {services.length > 0 && (
                    <section className="services-section">
                        <h2>🚀 Deployed Services</h2>
                        <div className="services-grid">
                            {services.map(service => (
                                <div
                                    key={service.name}
                                    className={`service-card ${selectedService === service.name ? 'selected' : ''}`}
                                    onClick={() => loadLogs(service.name)}
                                >
                                    <div className="service-header">
                                        <span className="service-status" style={{ color: getStatusColor(service.status) }}>
                                            {getStatusIcon(service.status)}
                                        </span>
                                        <span className="service-name">{service.name}</span>
                                    </div>
                                    <div className="service-details">
                                        <div className="detail-row">
                                            <span className="label">Region:</span>
                                            <span className="value">{service.region}</span>
                                        </div>
                                        <div className="detail-row">
                                            <span className="label">Memory:</span>
                                            <span className="value">{service.memory}</span>
                                        </div>
                                        <div className="detail-row">
                                            <span className="label">Last Deploy:</span>
                                            <span className="value">{service.lastDeployed}</span>
                                        </div>
                                    </div>
                                    <div className="service-actions">
                                        <a href={service.url} target="_blank" rel="noopener noreferrer" className="action-btn">
                                            🔗 Open
                                        </a>
                                        <button className="action-btn">📋 Logs</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* Logs Panel */}
                {selectedService && (
                    <section className="logs-section">
                        <div className="logs-header">
                            <h2>📜 Logs: {selectedService}</h2>
                            <div className="logs-controls">
                                <button onClick={() => loadLogs(selectedService)} disabled={isLoadingLogs}>
                                    🔄 Refresh
                                </button>
                            </div>
                        </div>
                        <div className="logs-container">
                            {isLoadingLogs ? (
                                <div className="logs-loading">Loading logs...</div>
                            ) : (
                                logs.map((log, index) => (
                                    <div key={index} className="log-entry">
                                        <span className="log-time">{log.timestamp}</span>
                                        <span
                                            className="log-severity"
                                            style={{ color: getSeverityColor(log.severity) }}
                                        >
                                            [{log.severity}]
                                        </span>
                                        <span className="log-message">{log.message}</span>
                                    </div>
                                ))
                            )}
                        </div>
                    </section>
                )}

                {/* Quick Stats */}
                {services.length > 0 && (
                    <section className="stats-section">
                        <h2>📈 Quick Stats</h2>
                        <div className="stats-grid">
                            <div className="stat-card">
                                <div className="stat-value">{services.length}</div>
                                <div className="stat-label">Total Services</div>
                            </div>
                            <div className="stat-card healthy">
                                <div className="stat-value">
                                    {services.filter(s => s.status === 'Running').length}
                                </div>
                                <div className="stat-label">Healthy</div>
                            </div>
                            <div className="stat-card warning">
                                <div className="stat-value">
                                    {services.filter(s => s.status === 'Deploying').length}
                                </div>
                                <div className="stat-label">Deploying</div>
                            </div>
                            <div className="stat-card error">
                                <div className="stat-value">
                                    {services.filter(s => s.status === 'Failed').length}
                                </div>
                                <div className="stat-label">Failed</div>
                            </div>
                        </div>
                    </section>
                )}
            </div>
        </div>
    );
};

export default ProductionMonitor;
