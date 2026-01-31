import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import './Sidebar.css';

interface SidebarProps {
    activeItem: string;
    onItemClick: (item: string) => void;
    onProjectChange?: (path: string | null) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeItem, onItemClick, onProjectChange }) => {
    const [currentProject, setCurrentProject] = useState<string | null>(null);
    const [isSelectingProject, setIsSelectingProject] = useState(false);

    useEffect(() => {
        loadCurrentProject();
    }, []);

    const loadCurrentProject = async () => {
        try {
            // Load saved project from config file
            const path = await invoke<string | null>('load_saved_project');
            setCurrentProject(path);
            onProjectChange?.(path);
        } catch (error) {
            console.error('Failed to load project path:', error);
        }
    };

    const handleOpenProject = async () => {
        setIsSelectingProject(true);
        try {
            const path = await invoke<string | null>('open_project_dialog');
            if (path) {
                setCurrentProject(path);
                onProjectChange?.(path);
            }
        } catch (error) {
            console.error('Failed to open project:', error);
        } finally {
            setIsSelectingProject(false);
        }
    };

    const getProjectName = (path: string | null) => {
        if (!path) return null;
        const parts = path.replace(/\\/g, '/').split('/');
        return parts[parts.length - 1] || parts[parts.length - 2];
    };

    const menuItems = [
        { id: 'dashboard', icon: <DashboardIcon />, label: 'Dashboard' },
        { id: 'agents', icon: <AgentsIcon />, label: 'Agents' },
        { id: 'workflows', icon: <WorkflowsIcon />, label: 'Workflows' },
        { id: 'workflow-generator', icon: <GeneratorIcon />, label: 'Generator' },
        { id: 'skills', icon: <SkillsIcon />, label: 'Skills' },
        { id: 'factory', icon: <FactoryIcon />, label: 'Factory' },
        { id: 'tasks', icon: <TasksIcon />, label: 'Tasks' },
        { id: 'settings', icon: <SettingsIcon />, label: 'Settings' },
    ];

    return (
        <aside className="sidebar">
            <div className="sidebar-logo">
                <LogoIcon />
            </div>

            {/* Open Project Button */}
            <div className="sidebar-project">
                <button
                    className="open-project-btn"
                    onClick={handleOpenProject}
                    disabled={isSelectingProject}
                    title={currentProject || 'Mở Project'}
                >
                    <FolderOpenIcon />
                </button>
                {currentProject && (
                    <div className="project-indicator" title={currentProject}>
                        <span className="project-dot" />
                        <span className="project-name">{getProjectName(currentProject)}</span>
                    </div>
                )}
            </div>

            <nav className="sidebar-nav">
                {menuItems.map((item) => (
                    <button
                        key={item.id}
                        className={`sidebar-item ${activeItem === item.id ? 'active' : ''}`}
                        onClick={() => onItemClick(item.id)}
                        title={item.label}
                    >
                        {item.icon}
                    </button>
                ))}
            </nav>

            <div className="sidebar-footer">
                <button className="sidebar-item" title="Help">
                    <HelpIcon />
                </button>
                <div className="sidebar-author" title="Created by Valentina Nie">
                    <span className="author-text">V</span>
                </div>
            </div>
        </aside>
    );
};

// Icons
const LogoIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
    </svg>
);

const FolderOpenIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
        <path d="M2 10h20" />
    </svg>
);

const DashboardIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 6v6l4 2" />
    </svg>
);

const AgentsIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
    </svg>
);

const WorkflowsIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
);

const TasksIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
        <circle cx="12" cy="17" r="0.5" fill="currentColor" />
    </svg>
);

const SettingsIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="3" />
        <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83" />
    </svg>
);

const SkillsIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 2L2 7l10 5 10-5-10-5z" />
        <path d="M2 17l10 5 10-5" />
        <path d="M2 12l10 5 10-5" />
    </svg>
);

const FactoryIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M2 20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8l-7 5V8l-7 5V4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2z" />
        <path d="M17 18h1" />
        <path d="M12 18h1" />
        <path d="M7 18h1" />
    </svg>
);

const HelpIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
        <circle cx="12" cy="17" r="0.5" fill="currentColor" />
    </svg>
);

const GeneratorIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 2L2 7l10 5 10-5-10-5z" />
        <path d="M2 17l10 5 10-5M2 12l10 5 10-5" />
        <circle cx="12" cy="12" r="2" fill="currentColor" />
    </svg>
);

export default Sidebar;
