import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import './FileExplorer.css';

interface FileEntry {
    name: string;
    path: string;
    is_dir: boolean;
    extension: string | null;
    size: number | null;
    children: FileEntry[] | null;
}

interface FileExplorerProps {
    projectPath: string | null;
    onFileSelect?: (path: string) => void;
}

// File type icons mapping
const getFileIcon = (entry: FileEntry): string => {
    if (entry.is_dir) {
        return '📁';
    }

    const ext = entry.extension?.toLowerCase();
    switch (ext) {
        case 'ts':
        case 'tsx':
            return '🔷';
        case 'js':
        case 'jsx':
            return '🟨';
        case 'py':
            return '🐍';
        case 'rs':
            return '🦀';
        case 'css':
            return '🎨';
        case 'html':
            return '🌐';
        case 'json':
            return '📋';
        case 'md':
            return '📝';
        case 'yaml':
        case 'yml':
            return '⚙️';
        case 'env':
            return '🔐';
        case 'toml':
            return '📦';
        default:
            return '📄';
    }
};

const FileTreeNode: React.FC<{
    entry: FileEntry;
    level: number;
    onFileSelect?: (path: string) => void;
    expandedDirs: Set<string>;
    onToggleDir: (path: string) => void;
}> = ({ entry, level, onFileSelect, expandedDirs, onToggleDir }) => {
    const [children, setChildren] = useState<FileEntry[] | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const isExpanded = expandedDirs.has(entry.path);

    const loadChildren = async () => {
        if (!entry.is_dir || children !== null) return;

        setIsLoading(true);
        try {
            const result = await invoke<FileEntry[]>('list_directory', { path: entry.path });
            setChildren(result);
        } catch (error) {
            console.error('Failed to load directory:', error);
            setChildren([]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleClick = async () => {
        if (entry.is_dir) {
            onToggleDir(entry.path);
            if (!children) {
                await loadChildren();
            }
        } else {
            onFileSelect?.(entry.path);
        }
    };

    return (
        <div className="tree-node">
            <div
                className={`tree-item ${entry.is_dir ? 'folder' : 'file'}`}
                style={{ paddingLeft: `${level * 16 + 8}px` }}
                onClick={handleClick}
            >
                {entry.is_dir && (
                    <span className={`tree-arrow ${isExpanded ? 'expanded' : ''}`}>
                        {isLoading ? '⏳' : (isExpanded ? '▼' : '▶')}
                    </span>
                )}
                <span className="tree-icon">{getFileIcon(entry)}</span>
                <span className="tree-name">{entry.name}</span>
            </div>

            {entry.is_dir && isExpanded && children && (
                <div className="tree-children">
                    {children.map((child) => (
                        <FileTreeNode
                            key={child.path}
                            entry={child}
                            level={level + 1}
                            onFileSelect={onFileSelect}
                            expandedDirs={expandedDirs}
                            onToggleDir={onToggleDir}
                        />
                    ))}
                    {children.length === 0 && (
                        <div className="tree-empty" style={{ paddingLeft: `${(level + 1) * 16 + 8}px` }}>
                            (empty)
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

const FileExplorer: React.FC<FileExplorerProps> = ({ projectPath, onFileSelect }) => {
    const [rootEntries, setRootEntries] = useState<FileEntry[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set());
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (projectPath) {
            loadRootDirectory();
        } else {
            setRootEntries([]);
        }
    }, [projectPath]);

    const loadRootDirectory = async () => {
        if (!projectPath) return;

        setIsLoading(true);
        setError(null);
        try {
            const entries = await invoke<FileEntry[]>('list_directory', { path: projectPath });
            setRootEntries(entries);
        } catch (err) {
            console.error('Failed to load project directory:', err);
            setError(String(err));
        } finally {
            setIsLoading(false);
        }
    };

    const handleToggleDir = (path: string) => {
        setExpandedDirs(prev => {
            const next = new Set(prev);
            if (next.has(path)) {
                next.delete(path);
            } else {
                next.add(path);
            }
            return next;
        });
    };

    const getProjectName = () => {
        if (!projectPath) return 'No Project';
        const parts = projectPath.replace(/\\/g, '/').split('/');
        return parts[parts.length - 1] || 'Project';
    };

    if (!projectPath) {
        return (
            <div className="file-explorer">
                <div className="explorer-header">
                    <span className="explorer-title">EXPLORER</span>
                </div>
                <div className="explorer-empty">
                    <div className="empty-icon">📂</div>
                    <p>No project opened</p>
                    <p className="empty-hint">Click the folder icon in sidebar to open a project</p>
                </div>
            </div>
        );
    }

    return (
        <div className="file-explorer">
            <div className="explorer-header">
                <span className="explorer-title">EXPLORER</span>
                <button className="explorer-refresh" onClick={loadRootDirectory} title="Refresh">
                    🔄
                </button>
            </div>

            <div className="explorer-project">
                <span className="project-icon">📁</span>
                <span className="project-title">{getProjectName()}</span>
            </div>

            <div className="explorer-tree">
                {isLoading ? (
                    <div className="explorer-loading">
                        <span className="loading-spinner" />
                        Loading...
                    </div>
                ) : error ? (
                    <div className="explorer-error">
                        <span>❌</span> {error}
                    </div>
                ) : (
                    rootEntries.map((entry) => (
                        <FileTreeNode
                            key={entry.path}
                            entry={entry}
                            level={0}
                            onFileSelect={onFileSelect}
                            expandedDirs={expandedDirs}
                            onToggleDir={handleToggleDir}
                        />
                    ))
                )}
            </div>
        </div>
    );
};

export default FileExplorer;
