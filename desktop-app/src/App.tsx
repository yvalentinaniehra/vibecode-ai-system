import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import './App.css';
import Sidebar from './components/Sidebar/Sidebar';
import FileExplorer from './components/FileExplorer/FileExplorer';
import ChangesPanel from './components/ChangesPanel/ChangesPanel';
import Dashboard from './pages/Dashboard';
import TaskExecutor from './pages/TaskExecutor';
import WorkflowRunner from './pages/WorkflowRunner';
import WorkflowGenerator from './pages/WorkflowGenerator';
import MarketResearch from './pages/MarketResearch';
import FeasibilityChecker from './pages/FeasibilityChecker';
import ProductionMonitor from './pages/ProductionMonitor';
import Settings from './pages/Settings';
import SkillsManager from './pages/SkillsManager';
import SkillFactory from './pages/SkillFactory/SkillFactory';

// Shared data type for passing between pages
interface SharedBRDData {
  productIdea: string;
  industry: string;
  targetAudience: string;
  geography: string;
  brdSummary: string;
}

function App() {
  const [activePage, setActivePage] = useState('tasks'); // Default to Tasks/Chat
  const [currentProject, setCurrentProject] = useState<string | null>(null);
  const [showExplorer, setShowExplorer] = useState(true);
  const [sharedBRD, setSharedBRD] = useState<SharedBRDData | null>(null);

  // Handler for navigating with data
  const handleNavigateWithData = (page: string, data?: SharedBRDData) => {
    if (data) {
      setSharedBRD(data);
    }
    setActivePage(page);
  };

  useEffect(() => {
    loadSavedProject();
  }, []);

  const loadSavedProject = async () => {
    try {
      const path = await invoke<string | null>('load_saved_project');
      setCurrentProject(path);
    } catch (error) {
      console.error('Failed to load saved project:', error);
    }
  };

  // Listen for project changes from Sidebar
  useEffect(() => {
    const checkProject = async () => {
      try {
        const path = await invoke<string | null>('get_project_path');
        if (path !== currentProject) {
          setCurrentProject(path);
        }
      } catch (error) {
        // Ignore errors
      }
    };

    const interval = setInterval(checkProject, 2000);
    return () => clearInterval(interval);
  }, [currentProject]);

  const handleFileSelect = (path: string) => {
    // Log selected file - future: open in editor or send to TaskExecutor
    console.log('Selected file:', path);
  };

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard':
        return <Dashboard />;
      case 'agents':
        return <Dashboard />;
      case 'workflows':
        return <WorkflowRunner />;
      case 'workflow-generator':
        return <WorkflowGenerator />;
      case 'tasks':
        return <TaskExecutor />;
      case 'skills':
        return <SkillsManager />;
      case 'factory':
        return <SkillFactory />;
      case 'settings':
        return <Settings />;
      case 'market-research':
        return <MarketResearch onNavigate={setActivePage} onProceedWithData={handleNavigateWithData} />;
      case 'feasibility':
        return <FeasibilityChecker initialData={sharedBRD} />;
      case 'production-monitor':
        return <ProductionMonitor />;
      default:
        return <TaskExecutor />;
    }
  };

  return (
    <div className="app-container">
      <Sidebar
        activeItem={activePage}
        onItemClick={setActivePage}
        onProjectChange={setCurrentProject}
      />

      {/* File Explorer Panel (collapsible) */}
      {showExplorer && (
        <div className="explorer-panel">
          <FileExplorer
            projectPath={currentProject}
            onFileSelect={handleFileSelect}
          />
          <ChangesPanel onFileSelect={handleFileSelect} />
        </div>
      )}

      <main className="main-content">
        {/* Explorer Toggle */}
        <button
          className="explorer-toggle"
          onClick={() => setShowExplorer(!showExplorer)}
          title={showExplorer ? 'Hide Explorer' : 'Show Explorer'}
        >
          {showExplorer ? '◀' : '▶'}
        </button>

        {renderPage()}
      </main>
    </div>
  );
}

export default App;
