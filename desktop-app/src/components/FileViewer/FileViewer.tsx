import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import './FileViewer.css';

interface FileViewerProps {
    filePath: string | null;
    onClose: () => void;
}

// Determine language from file extension
const getLanguage = (path: string): string => {
    const ext = path.split('.').pop()?.toLowerCase() || '';
    const langMap: Record<string, string> = {
        'ts': 'typescript',
        'tsx': 'typescript',
        'js': 'javascript',
        'jsx': 'javascript',
        'py': 'python',
        'rs': 'rust',
        'css': 'css',
        'html': 'html',
        'json': 'json',
        'md': 'markdown',
        'yaml': 'yaml',
        'yml': 'yaml',
        'toml': 'toml',
        'sql': 'sql',
        'sh': 'bash',
        'env': 'plaintext',
    };
    return langMap[ext] || 'plaintext';
};

// Get file name from path
const getFileName = (path: string): string => {
    const parts = path.replace(/\\/g, '/').split('/');
    return parts[parts.length - 1] || 'File';
};

// Get file icon
const getFileIcon = (path: string): string => {
    const ext = path.split('.').pop()?.toLowerCase() || '';
    const iconMap: Record<string, string> = {
        'ts': '🔷',
        'tsx': '🔷',
        'js': '🟨',
        'jsx': '🟨',
        'py': '🐍',
        'rs': '🦀',
        'css': '🎨',
        'html': '🌐',
        'json': '📋',
        'md': '📝',
        'yaml': '⚙️',
        'yml': '⚙️',
        'toml': '📦',
    };
    return iconMap[ext] || '📄';
};

const FileViewer: React.FC<FileViewerProps> = ({ filePath, onClose }) => {
    const [content, setContent] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [lineNumbers, setLineNumbers] = useState<number[]>([]);

    useEffect(() => {
        if (filePath) {
            loadFileContent();
        }
    }, [filePath]);

    const loadFileContent = async () => {
        if (!filePath) return;

        setIsLoading(true);
        setError(null);
        try {
            const fileContent = await invoke<string>('read_file_content', { path: filePath });
            setContent(fileContent);
            // Generate line numbers
            const lines = fileContent.split('\n');
            setLineNumbers(Array.from({ length: lines.length }, (_, i) => i + 1));
        } catch (err) {
            console.error('Failed to read file:', err);
            setError(String(err));
            setContent('');
            setLineNumbers([]);
        } finally {
            setIsLoading(false);
        }
    };

    if (!filePath) {
        return (
            <div className="file-viewer empty">
                <div className="empty-state">
                    <span className="empty-icon">📄</span>
                    <p>Select a file to view</p>
                    <p className="empty-hint">Click on any file in the Explorer</p>
                </div>
            </div>
        );
    }

    const language = getLanguage(filePath);

    return (
        <div className="file-viewer">
            {/* Tab Bar */}
            <div className="viewer-tabs">
                <div className="tab active">
                    <span className="tab-icon">{getFileIcon(filePath)}</span>
                    <span className="tab-name">{getFileName(filePath)}</span>
                    <button className="tab-close" onClick={onClose} title="Close">×</button>
                </div>
            </div>

            {/* Breadcrumb */}
            <div className="viewer-breadcrumb">
                <span className="breadcrumb-path">{filePath}</span>
                <span className="breadcrumb-lang">{language}</span>
            </div>

            {/* Content Area */}
            <div className="viewer-content">
                {isLoading ? (
                    <div className="viewer-loading">
                        <span className="loading-spinner" />
                        Loading file...
                    </div>
                ) : error ? (
                    <div className="viewer-error">
                        <span className="error-icon">❌</span>
                        <p>Failed to load file</p>
                        <p className="error-message">{error}</p>
                    </div>
                ) : (
                    <div className="code-container">
                        {/* Line Numbers */}
                        <div className="line-numbers">
                            {lineNumbers.map((num) => (
                                <div key={num} className="line-number">{num}</div>
                            ))}
                        </div>
                        {/* Code Content */}
                        <pre className={`code-content language-${language}`}>
                            <code>{content}</code>
                        </pre>
                    </div>
                )}
            </div>
        </div>
    );
};

export default FileViewer;
