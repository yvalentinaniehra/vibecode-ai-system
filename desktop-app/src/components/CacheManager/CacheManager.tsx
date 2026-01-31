import React, { useState } from 'react';
import './CacheManager.css';
import { TreeSectionState, FolderItem } from '../../types';

interface CacheManagerProps {
    brainTasks: TreeSectionState;
    codeTracker: TreeSectionState;
    onDeleteTask?: (taskId: string) => void;
    onDeleteFile?: (path: string) => void;
    onOpenFile?: (path: string) => void;
    onToggleSection?: (section: 'brain' | 'code') => void;
}

const CacheManager: React.FC<CacheManagerProps> = ({
    brainTasks,
    codeTracker,
    onDeleteTask,
    onDeleteFile,
    onOpenFile,
    onToggleSection,
}) => {
    const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

    const toggleFolder = (folderId: string) => {
        setExpandedFolders((prev) => {
            const next = new Set(prev);
            if (next.has(folderId)) {
                next.delete(folderId);
            } else {
                next.add(folderId);
            }
            return next;
        });
    };

    const renderFileIcon = (fileName: string) => {
        const ext = fileName.split('.').pop()?.toLowerCase();
        switch (ext) {
            case 'md':
                return <span className="file-icon md">📝</span>;
            case 'ts':
            case 'tsx':
                return <span className="file-icon ts">📘</span>;
            case 'js':
            case 'jsx':
                return <span className="file-icon js">📒</span>;
            case 'json':
                return <span className="file-icon json">📋</span>;
            case 'png':
            case 'jpg':
            case 'jpeg':
            case 'gif':
            case 'webp':
                return <span className="file-icon img">🖼️</span>;
            default:
                return <span className="file-icon">📄</span>;
        }
    };

    const renderFolder = (folder: FolderItem) => {
        const isExpanded = expandedFolders.has(folder.id);

        return (
            <div key={folder.id} className="folder-item">
                <div className="folder-header" onClick={() => toggleFolder(folder.id)}>
                    <span className={`folder-chevron ${isExpanded ? 'expanded' : ''}`}>
                        <ChevronIcon />
                    </span>
                    <span className="folder-icon">📁</span>
                    <span className="folder-label">{folder.label}</span>
                    <span className="folder-size">{folder.size}</span>
                    <button
                        className="folder-delete"
                        onClick={(e) => {
                            e.stopPropagation();
                            onDeleteTask?.(folder.id);
                        }}
                        title="Xóa"
                    >
                        <DeleteIcon />
                    </button>
                </div>

                {isExpanded && folder.files.length > 0 && (
                    <div className="folder-files">
                        {folder.files.map((file) => (
                            <div
                                key={file.path}
                                className="file-item"
                                onClick={() => onOpenFile?.(file.path)}
                            >
                                {renderFileIcon(file.name)}
                                <span className="file-name">{file.name}</span>
                                <button
                                    className="file-delete"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onDeleteFile?.(file.path);
                                    }}
                                    title="Xóa file"
                                >
                                    <DeleteIcon />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    const renderSection = (section: TreeSectionState, type: 'brain' | 'code') => (
        <div className="cache-section">
            <div
                className="section-header"
                onClick={() => onToggleSection?.(type)}
            >
                <span className={`section-chevron ${!section.collapsed ? 'expanded' : ''}`}>
                    <ChevronIcon />
                </span>
                <span className="section-title">{section.title}</span>
                <span className="section-stats">{section.stats}</span>
            </div>

            {!section.collapsed && (
                <div className="section-content">
                    {section.loading ? (
                        <div className="section-loading">Đang tải...</div>
                    ) : section.folders.length === 0 ? (
                        <div className="section-empty">
                            {type === 'brain' ? 'Không có task nào' : 'Không có cache nào'}
                        </div>
                    ) : (
                        section.folders.map((folder) => renderFolder(folder))
                    )}
                </div>
            )}
        </div>
    );

    return (
        <div className="cache-manager">
            {renderSection(brainTasks, 'brain')}
            {renderSection(codeTracker, 'code')}
        </div>
    );
};

// Icons
const ChevronIcon = () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="9 18 15 12 9 6" />
    </svg>
);

const DeleteIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="3 6 5 6 21 6" />
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
);

export default CacheManager;
