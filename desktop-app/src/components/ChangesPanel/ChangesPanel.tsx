import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import './ChangesPanel.css';

interface ChangedFile {
    path: string;
    status: string; // "added", "modified", "deleted"
    lines_added: number;
    lines_removed: number;
}

interface ChangesPanelProps {
    onFileSelect?: (path: string) => void;
}

const getStatusIcon = (status: string): string => {
    switch (status) {
        case 'added':
            return '+';
        case 'modified':
            return 'M';
        case 'deleted':
            return '-';
        default:
            return '?';
    }
};

const getStatusClass = (status: string): string => {
    switch (status) {
        case 'added':
            return 'status-added';
        case 'modified':
            return 'status-modified';
        case 'deleted':
            return 'status-deleted';
        default:
            return '';
    }
};

const getFileName = (path: string): string => {
    const parts = path.replace(/\\/g, '/').split('/');
    return parts[parts.length - 1] || path;
};

const ChangesPanel: React.FC<ChangesPanelProps> = ({ onFileSelect }) => {
    const [changedFiles, setChangedFiles] = useState<ChangedFile[]>([]);
    const [isCollapsed, setIsCollapsed] = useState(false);

    useEffect(() => {
        loadChangedFiles();
        // Poll for changes every 5 seconds
        const interval = setInterval(loadChangedFiles, 5000);
        return () => clearInterval(interval);
    }, []);

    const loadChangedFiles = async () => {
        try {
            const files = await invoke<ChangedFile[]>('get_changed_files');
            setChangedFiles(files);
        } catch (error) {
            console.error('Failed to load changed files:', error);
        }
    };

    const handleClearChanges = async () => {
        try {
            await invoke('clear_changed_files');
            setChangedFiles([]);
        } catch (error) {
            console.error('Failed to clear changes:', error);
        }
    };

    const totalAdded = changedFiles.reduce((sum, f) => sum + f.lines_added, 0);
    const totalRemoved = changedFiles.reduce((sum, f) => sum + f.lines_removed, 0);

    return (
        <div className={`changes-panel ${isCollapsed ? 'collapsed' : ''}`}>
            <div className="changes-header" onClick={() => setIsCollapsed(!isCollapsed)}>
                <span className={`collapse-arrow ${isCollapsed ? '' : 'expanded'}`}>▶</span>
                <span className="changes-title">CHANGES</span>
                <span className="changes-count">{changedFiles.length}</span>
                {changedFiles.length > 0 && (
                    <button
                        className="changes-clear"
                        onClick={(e) => { e.stopPropagation(); handleClearChanges(); }}
                        title="Clear all changes"
                    >
                        ✕
                    </button>
                )}
            </div>

            {!isCollapsed && (
                <div className="changes-content">
                    {changedFiles.length === 0 ? (
                        <div className="changes-empty">
                            <span>No pending changes</span>
                        </div>
                    ) : (
                        <>
                            <div className="changes-summary">
                                <span className="summary-added">+{totalAdded}</span>
                                <span className="summary-removed">-{totalRemoved}</span>
                            </div>
                            <div className="changes-list">
                                {changedFiles.map((file, index) => (
                                    <div
                                        key={index}
                                        className="change-item"
                                        onClick={() => onFileSelect?.(file.path)}
                                    >
                                        <span className={`change-status ${getStatusClass(file.status)}`}>
                                            {getStatusIcon(file.status)}
                                        </span>
                                        <span className="change-name" title={file.path}>
                                            {getFileName(file.path)}
                                        </span>
                                        <span className="change-stats">
                                            {file.lines_added > 0 && (
                                                <span className="stat-added">+{file.lines_added}</span>
                                            )}
                                            {file.lines_removed > 0 && (
                                                <span className="stat-removed">-{file.lines_removed}</span>
                                            )}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
};

export default ChangesPanel;
