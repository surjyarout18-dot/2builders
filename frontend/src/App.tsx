import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { Canvas2D } from './components/Canvas2D';
import { BuildingScene } from './three/BuildingScene';
import { PropertiesPanel } from './components/PropertiesPanel';
import { Toolbar2D } from './components/Toolbar2D';
import { ImportModal } from './components/ImportModal';
import { CalibrationModal } from './components/CalibrationModal';
import { ValidationReportModal } from './components/ValidationReportModal';
import { ExportModal } from './components/ExportModal';
import { ReviewModal } from './components/ReviewModal';
import { ShareModal } from './components/ShareModal';
import { FileViewerGuideModal } from './components/FileViewerGuideModal';
import { Dashboard } from './components/Dashboard';
import { ToastContainer } from './components/Toast';
import { useProjectStore } from './store/useProjectStore';

export function App() {
  const [currentView, setCurrentView] = useState<'dashboard' | 'editor'>('dashboard');
  const project = useProjectStore((s) => s.project);
  const viewMode = useProjectStore((s) => s.viewMode);
  const loadProject = useProjectStore((s) => s.loadProject);
  const statusMessage = useProjectStore((s) => s.statusMessage);

  const handleSelectProject = async (id: string) => {
    await loadProject(id);
    setCurrentView('editor');
  };

  // Keyboard shortcut listener for global actions
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+S: Save
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        useProjectStore.getState().saveToBackend();
      }
      // Ctrl+Z: Undo
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault();
        useProjectStore.getState().undo();
      }
      // Ctrl+Y or Ctrl+Shift+Z: Redo
      if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'y' || (e.shiftKey && e.key.toLowerCase() === 'z'))) {
        e.preventDefault();
        useProjectStore.getState().redo();
      }
      // Tool shortcuts
      if (!['INPUT', 'SELECT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        if (e.key.toLowerCase() === 'v') useProjectStore.getState().setActiveTool('select');
        if (e.key.toLowerCase() === 'h') useProjectStore.getState().setActiveTool('pan');
        if (e.key.toLowerCase() === 'w') useProjectStore.getState().setActiveTool('wall');
        if (e.key.toLowerCase() === 'd') useProjectStore.getState().setActiveTool('door');
        if (e.key.toLowerCase() === 'n') useProjectStore.getState().setActiveTool('window');
        if (e.key.toLowerCase() === 'r') useProjectStore.getState().setActiveTool('room');
        if (e.key.toLowerCase() === 'm') useProjectStore.getState().setActiveTool('measure');
        if (e.key.toLowerCase() === 'x') useProjectStore.getState().setActiveTool('delete');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (currentView === 'dashboard' || !project) {
    return <Dashboard onSelectProject={handleSelectProject} />;
  }

  return (
    <div className="flex flex-col w-screen h-screen overflow-hidden bg-cad-dark">
      {/* Top Architectural Navigation Bar */}
      <Navbar onOpenDashboard={() => setCurrentView('dashboard')} />

      {/* Main CAD Workspace */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Floating Toolbar (active in 2D or split mode) */}
        {viewMode !== '3d' && <Toolbar2D />}

        {/* Viewport Container */}
        <div className={`flex-1 flex overflow-hidden ${viewMode === 'split' ? 'flex-col md:flex-row' : ''}`}>
          {/* 2D Plan Canvas */}
          {(viewMode === '2d' || viewMode === 'split') && (
            <div className={`relative ${
              viewMode === 'split' 
                ? 'h-1/2 md:h-full w-full md:w-1/2 border-b md:border-b-0 md:border-r border-cad-border' 
                : 'h-full w-full'
            }`}>
              <Canvas2D />
            </div>
          )}

          {/* 3D Model Viewport */}
          {(viewMode === '3d' || viewMode === 'split') && (
            <div className={`relative ${
              viewMode === 'split' 
                ? 'h-1/2 md:h-full w-full md:w-1/2' 
                : 'h-full w-full'
            }`}>
              <BuildingScene />
            </div>
          )}
        </div>

        {/* Right Properties Panel */}
        <PropertiesPanel />
      </div>

      {/* Bottom Status Bar */}
      <footer className="h-6 bg-cad-panel border-t border-cad-border px-3 flex items-center justify-between text-[10px] sm:text-[11px] text-slate-400 font-mono z-20 select-none">
        <div className="flex items-center gap-2 truncate">
          <span className="flex items-center gap-1.5 truncate">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            <span className="text-slate-200 truncate">{statusMessage}</span>
          </span>
        </div>

        <div className="hidden md:flex items-center gap-4 text-slate-500 shrink-0">
          <span>Engine: <strong className="text-slate-300">Deterministic Geometry</strong></span>
          <span>Units: <strong className="text-slate-300">{project.unit.toUpperCase()}</strong></span>
          <span>Scale: <strong className="text-slate-300">1px = {project.scale.toFixed(4)}m</strong></span>
          <span className="hidden lg:inline">Shortcuts: <strong>[W]all [D]oor [N]Window [R]oom [M]easure [V]Select</strong></span>
        </div>
      </footer>

      {/* Modals */}
      <ImportModal />
      <CalibrationModal />
      <ValidationReportModal />
      <ExportModal />
      <ReviewModal />
      <ShareModal />
      <FileViewerGuideModal />
      <ToastContainer />
    </div>
  );
}

export default App;

