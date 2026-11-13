import React, { useState } from 'react';
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
  FolderOpen,
  HelpCircle,
  Menu,
  X,
  Sliders,
  Sparkles,
  FileCode,
  Crown
} from 'lucide-react';
import { useProjectStore } from '../store/useProjectStore';
import { triggerFileDownload } from '../utils/downloadHelper';
import { toast } from './Toast';
import { ViewMode, CameraPreset } from '../types';

interface NavbarProps {
  onOpenDashboard: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenDashboard }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
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
  const isPropertiesPanelOpen = useProjectStore((s) => s.isPropertiesPanelOpen);
  const setIsPropertiesPanelOpen = useProjectStore((s) => s.setIsPropertiesPanelOpen);
  const statusMessage = useProjectStore((s) => s.statusMessage);
  const isLoading = useProjectStore((s) => s.isLoading);
  const setMegaMenuOpen = useProjectStore((s) => s.setMegaMenuOpen);
  const setGeneratorModalOpen = useProjectStore((s) => s.setGeneratorModalOpen);
  const setPremiumModalOpen = useProjectStore((s) => s.setPremiumModalOpen);
  const userTier = useProjectStore((s) => s.userTier);
  const dxfBannerDismissed = useProjectStore((s) => s.dxfBannerDismissed);
  const setDxfBannerDismissed = useProjectStore((s) => s.setDxfBannerDismissed);

  const handleExportDXFDirect = async () => {
    if (!project) {
      setExportModalOpen(true);
      return;
    }
    try {
      const res = await fetch(`/api/projects/${project.id}/export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ format: 'dxf' })
      });
      if (!res.ok) throw new Error('DXF generation failed');
      const data = await res.json();
      triggerFileDownload(data.downloadUrl, data.filename);
      toast.success(`Downloaded ${data.filename}`);
    } catch (e: any) {
      toast.error(`DXF export error: ${e.message}`);
    }
  };

  return (
    <header className="relative bg-cad-panel border-b border-cad-border z-30 select-none">
      {/* Top Announcement Banner from floor-plan.ai */}
      {!dxfBannerDismissed && (
        <div className="bg-gradient-to-r from-teal-700 via-emerald-600 to-teal-700 text-white text-[11px] sm:text-xs py-1.5 px-3 flex items-center justify-between font-medium shadow-inner border-b border-emerald-500/30">
          <div className="flex items-center gap-2 mx-auto truncate">
            <span className="bg-white/20 text-white px-1.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
              <FileCode size={11} />
              DXF
            </span>
            <span className="truncate">Convert floor plan images into DXF files for CAD software.</span>
            <button
              onClick={handleExportDXFDirect}
              className="underline font-bold text-white hover:text-emerald-200 ml-1 shrink-0 cursor-pointer"
            >
              Export DXF
            </button>
          </div>
          <button
            onClick={() => setDxfBannerDismissed(true)}
            className="p-1 text-white/80 hover:text-white hover:bg-white/10 rounded transition-colors shrink-0"
            title="Dismiss announcement"
          >
            <X size={13} />
          </button>
        </div>
      )}

      <div className="h-14 px-3 sm:px-4 flex items-center justify-between">
        {/* Left: Brand, Products Mega Menu, Generator & Project Name */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={onOpenDashboard}
            title="All 2builders Projects"
            className="p-1 rounded hover:bg-cad-surface text-sky-400 transition-colors flex items-center gap-1.5"
          >
            <Box size={20} className="animate-pulse text-sky-400 shrink-0" />
            <span className="font-black text-sm tracking-wider text-slate-100 flex items-center gap-1">
              <span>2BUILDERS</span>
              <span className="text-[9px] bg-sky-500/20 text-sky-300 border border-sky-400/40 px-1 py-0.2 rounded font-bold">3D</span>
            </span>
          </button>

          {/* Products Mega Menu Button (matching floor-plan.ai Products dropdown) */}
          <button
            onClick={() => setMegaMenuOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 bg-cad-surface hover:bg-cad-border border border-cad-border hover:border-sky-500/40 text-slate-200 text-xs rounded-md font-semibold transition-all shadow-sm"
            title="Browse All 19 Floor-Plan.AI Architectural Tools"
          >
            <Grid size={13} className="text-sky-400" />
            <span className="hidden sm:inline">Products</span>
            <span className="text-[10px] text-slate-400">▾</span>
          </button>

          {/* Instant AI Generator Button */}
          <button
            onClick={() => setGeneratorModalOpen(true)}
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs rounded-md font-bold transition-all shadow-md border border-indigo-400/40"
            title="Instant AI Floor Plan Generator (Room / House / Custom)"
          >
            <Sparkles size={13} className="text-amber-300" />
            <span>Generator</span>
          </button>

          <div className="hidden sm:block h-4 w-[1px] bg-cad-border" />

          <div className="hidden md:flex items-center gap-2">
            <span className="text-xs text-slate-400 font-medium">Project:</span>
            <span className="text-xs font-bold text-slate-200 bg-cad-surface px-2.5 py-1 rounded border border-cad-border max-w-[120px] lg:max-w-xs truncate">
              {project?.name || 'Untitled Project'}
            </span>
          </div>

          {/* Floor selector (Desktop) */}
          {project && (
            <div className="hidden xl:flex items-center gap-1 ml-1">
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

        {/* Center: View Mode Tabs */}
        <div className="flex items-center bg-cad-dark border border-cad-border rounded-lg p-0.5">
          {(['split', '2d', '3d'] as ViewMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`px-2.5 sm:px-3 py-1 rounded text-[11px] sm:text-xs font-semibold capitalize transition-all ${
                viewMode === mode
                  ? 'bg-cad-accent text-slate-950 shadow-sm font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {mode === 'split' ? 'Split' : mode === '2d' ? '2D' : '3D'}
            </button>
          ))}
        </div>

        {/* Right: Desktop Actions & Tools */}
        <div className="hidden lg:flex items-center gap-1.5">
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

          {/* Import Floor Plan */}
          <button
            onClick={() => setImportModalOpen(true)}
            className="flex items-center gap-1 px-2 sm:px-2.5 py-1.5 bg-cad-surface hover:bg-cad-border border border-cad-border text-slate-200 text-xs rounded font-medium transition-colors"
            title="Import Floor Plan (PNG, JPG, PDF, SVG, DXF)"
          >
            <Upload size={14} className="text-cad-accent" />
            <span className="hidden xl:inline">Import</span>
          </button>

          {/* Calibrate Scale */}
          <button
            onClick={() => setCalibrateModalOpen(true)}
            className="flex items-center gap-1 px-2 sm:px-2.5 py-1.5 bg-cad-surface hover:bg-cad-border border border-cad-border text-slate-200 text-xs rounded font-medium transition-colors"
            title="Calibrate Floor Plan Scale"
          >
            <Ruler size={14} className="text-yellow-400" />
            <span className="hidden xl:inline">Calibrate</span>
          </button>

          {/* 2builders Review Questions */}
          <button
            onClick={() => useProjectStore.getState().setReviewModalOpen(true)}
            className="flex items-center gap-1 px-2 sm:px-2.5 py-1.5 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-400/40 text-sky-300 text-xs rounded font-medium transition-colors"
            title="Open Plan Verification Review"
          >
            <CheckCircle2 size={14} className="text-sky-400" />
            <span className="hidden xl:inline">Review</span>
          </button>

          {/* Validate Geometry */}
          <button
            onClick={() => validateCurrentGeometry()}
            className="flex items-center gap-1 px-2 sm:px-2.5 py-1.5 bg-cad-surface hover:bg-cad-border border border-cad-border text-slate-200 text-xs rounded font-medium transition-colors"
            title="Validate geometric watertightness and wall junctions"
          >
            <CheckCircle2 size={14} className="text-emerald-400" />
            <span className="hidden xl:inline">Validate</span>
          </button>

          {/* Viewer Help Guide */}
          <button
            onClick={() => {
              useProjectStore.getState().setViewerGuideFormat('glb');
              useProjectStore.getState().setViewerGuideOpen(true);
            }}
            className="flex items-center gap-1 px-2 sm:px-2.5 py-1.5 bg-cad-surface hover:bg-cad-border border border-cad-border text-sky-400 text-xs rounded font-medium transition-colors"
            title="Guide on how to open 3D models and CAD blueprints locally"
          >
            <HelpCircle size={14} />
            <span className="hidden 2xl:inline">Guide</span>
          </button>

          {/* Save to Backend */}
          <button
            onClick={() => saveToBackend()}
            disabled={isLoading}
            className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs rounded font-semibold shadow transition-colors"
            title="Save Project (Ctrl+S)"
          >
            <Save size={14} />
            <span>Save</span>
          </button>

          {/* Share & Export 3D */}
          <button
            onClick={() => useProjectStore.getState().setShareModalOpen(true)}
            className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs rounded font-semibold shadow transition-colors"
            title="Download Universal CAD & 3D Exports"
          >
            <Download size={14} />
            <span className="hidden sm:inline">Export</span>
          </button>

          {/* 100% Free & Unlimited Badge */}
          <button
            onClick={() => setPremiumModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-400/40 text-emerald-300 font-bold text-xs rounded transition-all shadow-sm"
            title="All 2builders tools are 100% Free & Unlimited"
          >
            <Sparkles size={14} className="text-emerald-400" />
            <span className="hidden xl:inline">Free & Unlimited</span>
            <span className="text-[10px] bg-emerald-500/30 text-emerald-200 px-1.5 py-0.2 rounded font-black">
              100% FREE
            </span>
          </button>
        </div>

        {/* Right: Mobile Compact Controls */}
        <div className="flex lg:hidden items-center gap-1.5">
          {/* Mobile Inspector Toggle */}
          <button
            onClick={() => setIsPropertiesPanelOpen(!isPropertiesPanelOpen)}
            className={`p-2 rounded-lg border text-xs transition-colors flex items-center justify-center ${
              isPropertiesPanelOpen 
                ? 'bg-sky-500/20 text-sky-300 border-sky-400' 
                : 'bg-cad-surface text-slate-300 border-cad-border hover:bg-cad-border'
            }`}
            title="Properties Inspector"
          >
            <Sliders size={16} />
          </button>

          {/* Mobile Share Button */}
          <button
            onClick={() => useProjectStore.getState().setShareModalOpen(true)}
            className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs rounded-lg font-bold shadow transition-colors flex items-center gap-1"
            title="Share & Export"
          >
            <Download size={14} />
            <span>Share</span>
          </button>

          {/* Mobile Menu Hamburger */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 rounded-lg bg-cad-surface border border-cad-border text-slate-200 hover:bg-cad-border transition-colors"
            title="More Options"
          >
            {isMobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Dropdown */}
      {isMobileMenuOpen && (
        <div className="lg:hidden border-t border-cad-border bg-slate-900/98 backdrop-blur-md p-4 space-y-3.5 shadow-2xl animate-in slide-in-from-top-2 duration-150 text-xs">
          {/* Top Products & Generator for Mobile */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => {
                setMegaMenuOpen(true);
                setIsMobileMenuOpen(false);
              }}
              className="p-2.5 rounded-xl bg-slate-800 border border-sky-400/30 text-sky-300 font-bold flex items-center justify-center gap-1.5 shadow"
            >
              <Grid size={15} className="text-sky-400" />
              <span>All 19 Tools</span>
            </button>
            <button
              onClick={() => {
                setGeneratorModalOpen(true);
                setIsMobileMenuOpen(false);
              }}
              className="p-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold flex items-center justify-center gap-1.5 shadow"
            >
              <Sparkles size={15} className="text-amber-300" />
              <span>AI Generator</span>
            </button>
          </div>

          {/* Floor selection on mobile */}
          {project && (
            <div className="flex items-center justify-between p-2.5 bg-cad-surface rounded-xl border border-cad-border">
              <div className="flex items-center gap-2 text-slate-300 font-semibold">
                <Layers size={16} className="text-cad-accent" />
                <span>Floor:</span>
              </div>
              <div className="flex items-center gap-1.5">
                <select
                  value={activeFloorId || ''}
                  onChange={(e) => setActiveFloorId(e.target.value)}
                  className="bg-slate-900 border border-cad-border text-xs rounded-lg px-2 py-1 text-slate-200 outline-none"
                >
                  {project.floors.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name} (Elev: {f.elevation.toFixed(1)}m)
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => addFloor()}
                  className="px-2 py-1 bg-slate-800 text-cad-accent rounded-lg border border-cad-border font-bold"
                >
                  +
                </button>
              </div>
            </div>
          )}

          {/* Quick Tools Grid on mobile */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => {
                undo();
                setIsMobileMenuOpen(false);
              }}
              disabled={undoStack.length === 0}
              className="p-2.5 rounded-xl bg-cad-surface border border-cad-border text-slate-300 hover:text-white flex items-center justify-center gap-2 font-medium disabled:opacity-30"
            >
              <Undo2 size={16} />
              <span>Undo</span>
            </button>
            <button
              onClick={() => {
                redo();
                setIsMobileMenuOpen(false);
              }}
              disabled={redoStack.length === 0}
              className="p-2.5 rounded-xl bg-cad-surface border border-cad-border text-slate-300 hover:text-white flex items-center justify-center gap-2 font-medium disabled:opacity-30"
            >
              <Redo2 size={16} />
              <span>Redo</span>
            </button>
          </div>

          {/* Camera presets in mobile menu */}
          {viewMode !== '2d' && (
            <div className="p-2.5 bg-cad-surface rounded-xl border border-cad-border space-y-2">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">3D Camera Preset</span>
              <div className="grid grid-cols-3 gap-1.5">
                {(['orbit', 'isometric', 'top'] as CameraPreset[]).map((preset) => (
                  <button
                    key={preset}
                    onClick={() => {
                      setCameraPreset(preset);
                      setIsMobileMenuOpen(false);
                    }}
                    className={`py-1.5 rounded-lg text-[11px] font-semibold capitalize border ${
                      cameraPreset === preset
                        ? 'bg-cad-accent text-slate-950 border-cad-accent'
                        : 'bg-slate-900 border-cad-border text-slate-300'
                    }`}
                  >
                    {preset === 'orbit' ? 'Orbit' : preset === 'isometric' ? 'Isometric' : 'Top View'}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Modal Actions */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              onClick={() => {
                useProjectStore.getState().setReviewModalOpen(true);
                setIsMobileMenuOpen(false);
              }}
              className="p-2.5 rounded-xl bg-sky-500/10 border border-sky-400/40 text-sky-300 flex items-center gap-2 font-medium"
            >
              <CheckCircle2 size={16} className="text-sky-400" />
              <span>Review Plan</span>
            </button>
            <button
              onClick={() => {
                setCalibrateModalOpen(true);
                setIsMobileMenuOpen(false);
              }}
              className="p-2.5 rounded-xl bg-cad-surface border border-cad-border text-slate-200 flex items-center gap-2 font-medium"
            >
              <Ruler size={16} className="text-yellow-400" />
              <span>Calibrate</span>
            </button>
            <button
              onClick={() => {
                setImportModalOpen(true);
                setIsMobileMenuOpen(false);
              }}
              className="p-2.5 rounded-xl bg-cad-surface border border-cad-border text-slate-200 flex items-center gap-2 font-medium"
            >
              <Upload size={16} className="text-cad-accent" />
              <span>Import Plan</span>
            </button>
            <button
              onClick={() => {
                validateCurrentGeometry();
                setIsMobileMenuOpen(false);
              }}
              className="p-2.5 rounded-xl bg-cad-surface border border-cad-border text-slate-200 flex items-center gap-2 font-medium"
            >
              <CheckCircle2 size={16} className="text-emerald-400" />
              <span>Validate</span>
            </button>
          </div>

          {/* 100% Free on mobile */}
          <button
            onClick={() => {
              setPremiumModalOpen(true);
              setIsMobileMenuOpen(false);
            }}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-sky-500 text-slate-950 font-black flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
          >
            <Sparkles size={16} className="fill-slate-950" />
            <span>All Features 100% Free & Unlimited (No Paywalls)</span>
          </button>

          {/* Viewer Guide & Save */}
          <div className="flex items-center gap-2 pt-1 border-t border-cad-border">
            <button
              onClick={() => {
                useProjectStore.getState().setViewerGuideFormat('glb');
                useProjectStore.getState().setViewerGuideOpen(true);
                setIsMobileMenuOpen(false);
              }}
              className="flex-1 py-2 rounded-xl bg-cad-surface border border-cad-border text-sky-400 font-medium flex items-center justify-center gap-1.5"
            >
              <HelpCircle size={15} />
              <span>Viewer Guide</span>
            </button>
            <button
              onClick={() => {
                saveToBackend();
                setIsMobileMenuOpen(false);
              }}
              disabled={isLoading}
              className="flex-1 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold flex items-center justify-center gap-1.5 shadow"
            >
              <Save size={15} />
              <span>Save Project</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
};

