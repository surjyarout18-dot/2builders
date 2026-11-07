import React from 'react';
import {
  Layers,
  Save,
  Download,
  Upload,
  Ruler,
  CheckCircle2,
  Undo2,
  Redo2,
  Box,
  Eye,
  Grid,
  Camera,
  FolderOpen
} from 'lucide-react';
import { useProjectStore } from '../store/useProjectStore';
import { ViewMode, CameraPreset } from '../types';

interface NavbarProps {
  onOpenDashboard: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenDashboard }) => {
  const project = useProjectStore((s) => s.project);
  const activeFloorId = useProjectStore((s) => s.activeFloorId);
  const setActiveFloorId = useProjectStore((s) => s.setActiveFloorId);
  const addFloor = useProjectStore((s) => s.addFloor);
  const viewMode = useProjectStore((s) => s.viewMode);
  const setViewMode = useProjectStore((s) => s.setViewMode);
  const cameraPreset = useProjectStore((s) => s.cameraPreset);
  const setCameraPreset = useProjectStore((s) => s.setCameraPreset);
  const wireframe = useProjectStore((s) => s.wireframe);
  const setWireframe = useProjectStore((s) => s.setWireframe);
  const undo = useProjectStore((s) => s.undo);
  const redo = useProjectStore((s) => s.redo);
  const undoStack = useProjectStore((s) => s.undoStack);
  const redoStack = useProjectStore((s) => s.redoStack);
  const saveToBackend = useProjectStore((s) => s.saveToBackend);
  const setImportModalOpen = useProjectStore((s) => s.setImportModalOpen);
  const setCalibrateModalOpen = useProjectStore((s) => s.setCalibrateModalOpen);
  const validateCurrentGeometry = useProjectStore((s) => s.validateCurrentGeometry);
  const setExportModalOpen = useProjectStore((s) => s.setExportModalOpen);
  const statusMessage = useProjectStore((s) => s.statusMessage);
  const isLoading = useProjectStore((s) => s.isLoading);

  return (
    <header className="h-14 bg-cad-panel border-b border-cad-border px-4 flex items-center justify-between z-20 select-none">
      {/* Left: Brand & Project Name */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenDashboard}
          title="All 2builders Projects"
          className="p-1.5 rounded hover:bg-cad-surface text-sky-400 transition-colors flex items-center gap-2"
        >
          <Box size={20} className="animate-pulse text-sky-400" />
          <span className="font-black text-sm tracking-wider text-slate-100 flex items-center gap-1.5">
            <span>2BUILDERS</span>
            <span className="text-[10px] bg-sky-500/20 text-sky-300 border border-sky-400/40 px-1.5 py-0.5 rounded font-bold">3D</span>
          </span>
        </button>

        <div className="h-4 w-[1px] bg-cad-border" />

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-medium">Project:</span>
          <span className="text-xs font-bold text-slate-200 bg-cad-surface px-2.5 py-1 rounded border border-cad-border">
            {project?.name || 'Untitled Project'}
          </span>
        </div>

        {/* Floor selector */}
        {project && (
          <div className="flex items-center gap-1 ml-2">
            <Layers size={14} className="text-slate-400" />
            <select
              value={activeFloorId || ''}
              onChange={(e) => setActiveFloorId(e.target.value)}
              className="bg-cad-surface border border-cad-border text-xs rounded px-2 py-1 text-slate-200 outline-none focus:border-cad-accent font-semibold"
            >
              {project.floors.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name} (Elev: {f.elevation.toFixed(1)}m)
                </option>
              ))}
            </select>
            <button
              onClick={() => addFloor()}
              title="Add Next Floor"
              className="px-2 py-1 bg-cad-surface hover:bg-cad-border text-cad-accent text-xs rounded font-bold border border-cad-border"
            >
              +
            </button>
          </div>
        )}
      </div>

      {/* Middle: View Mode Tabs */}
      <div className="flex items-center bg-cad-dark border border-cad-border rounded-lg p-0.5">
        {(['split', '2d', '3d'] as ViewMode[]).map((mode) => (
          <button
            key={mode}
            onClick={() => setViewMode(mode)}
            className={`px-3 py-1 rounded text-xs font-semibold capitalize transition-all ${
              viewMode === mode
                ? 'bg-cad-accent text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {mode === 'split' ? 'Split 2D/3D' : mode === '2d' ? '2D Plan' : '3D Model'}
          </button>
        ))}
      </div>

      {/* Right: Actions & Tools */}
      <div className="flex items-center gap-1.5">
        {/* Undo / Redo */}
        <button
          onClick={undo}
          disabled={undoStack.length === 0}
          title="Undo (Ctrl+Z)"
          className="p-1.5 rounded hover:bg-cad-surface text-slate-400 disabled:opacity-30 disabled:hover:bg-transparent"
        >
          <Undo2 size={16} />
        </button>
        <button
          onClick={redo}
          disabled={redoStack.length === 0}
          title="Redo (Ctrl+Y)"
          className="p-1.5 rounded hover:bg-cad-surface text-slate-400 disabled:opacity-30 disabled:hover:bg-transparent"
        >
          <Redo2 size={16} />
        </button>

        <div className="h-4 w-[1px] bg-cad-border mx-1" />

        {/* 3D View Presets (when 3D or split view is active) */}
        {viewMode !== '2d' && (
          <div className="flex items-center gap-1">
            <select
              value={cameraPreset}
              onChange={(e) => setCameraPreset(e.target.value as CameraPreset)}
              className="bg-cad-surface border border-cad-border text-[11px] rounded px-2 py-1 text-slate-300 outline-none"
              title="Camera Preset"
            >
              <option value="orbit">Orbit Camera</option>
              <option value="isometric">Isometric View</option>
              <option value="top">Top View</option>
              <option value="front">Front View</option>
              <option value="side">Side View</option>
            </select>

            <button
              onClick={() => setWireframe(!wireframe)}
              title="Toggle Wireframe"
              className={`p-1.5 rounded border border-cad-border text-xs ${
                wireframe ? 'bg-cad-accent text-slate-950 font-bold' : 'bg-cad-surface text-slate-300'
              }`}
            >
              <Grid size={14} />
            </button>
          </div>
        )}

        <div className="h-4 w-[1px] bg-cad-border mx-1" />

        {/* Import Floor Plan */}
        <button
          onClick={() => setImportModalOpen(true)}
          className="flex items-center gap-1 px-2.5 py-1.5 bg-cad-surface hover:bg-cad-border border border-cad-border text-slate-200 text-xs rounded font-medium transition-colors"
        >
          <Upload size={14} className="text-cad-accent" />
          <span>Import</span>
        </button>

        {/* Calibrate Scale */}
        <button
          onClick={() => setCalibrateModalOpen(true)}
          className="flex items-center gap-1 px-2.5 py-1.5 bg-cad-surface hover:bg-cad-border border border-cad-border text-slate-200 text-xs rounded font-medium transition-colors"
        >
          <Ruler size={14} className="text-yellow-400" />
          <span>Calibrate</span>
        </button>

        {/* Propli Review Questions */}
        <button
          onClick={() => useProjectStore.getState().setReviewModalOpen(true)}
          className="flex items-center gap-1 px-2.5 py-1.5 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-400/40 text-sky-300 text-xs rounded font-medium transition-colors"
          title="Open Plan Verification Review"
        >
          <CheckCircle2 size={14} className="text-sky-400" />
          <span>Review</span>
        </button>

        {/* Validate Geometry */}
        <button
          onClick={() => validateCurrentGeometry()}
          className="flex items-center gap-1 px-2.5 py-1.5 bg-cad-surface hover:bg-cad-border border border-cad-border text-slate-200 text-xs rounded font-medium transition-colors"
        >
          <CheckCircle2 size={14} className="text-emerald-400" />
          <span>Validate</span>
        </button>

        {/* Save to Backend */}
        <button
          onClick={() => saveToBackend()}
          disabled={isLoading}
          className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs rounded font-semibold shadow transition-colors"
        >
          <Save size={14} />
          <span>Save</span>
        </button>

        {/* Share & Export 3D */}
        <button
          onClick={() => useProjectStore.getState().setShareModalOpen(true)}
          className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs rounded font-semibold shadow transition-colors"
        >
          <Download size={14} />
          <span>Share / Export</span>
        </button>
      </div>
    </header>
  );
};

