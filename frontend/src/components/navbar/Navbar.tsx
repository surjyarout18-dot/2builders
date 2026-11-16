import React, { useState } from 'react';
import {
  Boxes,
  Split,
  Square,
  Box,
  UploadCloud,
  Download,
  Armchair,
  Sparkles,
  ShieldCheck,
  FileSpreadsheet,
  History,
  User,
  Wand2,
  Home
} from 'lucide-react';
import { useFloorPlanStore } from '../../store/useFloorPlanStore';
import { ViewMode } from '../../types/architectural';

interface NavbarProps {
  onOpenUpload: () => void;
  onOpenExport: () => void;
  onOpenFurniture: () => void;
  onOpenAssistant: () => void;
  onOpenGenerator: () => void;
  onOpenTakeoffs: () => void;
  onOpenReview: () => void;
  onOpenRealism: () => void;
  onOpenHistory: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenUpload,
  onOpenExport,
  onOpenFurniture,
  onOpenAssistant,
  onOpenGenerator,
  onOpenTakeoffs,
  onOpenReview,
  onOpenRealism,
  onOpenHistory
}) => {
  const {
    viewMode,
    setViewMode,
    model,
    unitSystem,
    toggleUnitSystem,
    createCheckpoint,
    setCurrentPage
  } = useFloorPlanStore();

  const [isCheckpointsOpen, setIsCheckpointsOpen] = useState(false);

  const viewModes: { id: ViewMode; label: string; icon: React.ReactNode }[] = [
    { id: '2d', label: 'Edit (2D)', icon: <Square className="h-4 w-4" /> },
    { id: 'split', label: 'Split CAD', icon: <Split className="h-4 w-4" /> },
    { id: '3d', label: '3D Scene', icon: <Box className="h-4 w-4" /> },
    { id: 'walkthrough', label: 'Walk (FPS)', icon: <User className="h-4 w-4" /> },
  ];

  return (
    <header className="flex h-14 w-full items-center justify-between border-b border-[#1F2942] bg-[#0A0D14] px-4 select-none z-30">
      {/* Brand & Project Info */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setCurrentPage('landing')}
          title="Return to Hero Landing Page (Preserves Session)"
          className="flex items-center gap-2.5 group text-left hover:opacity-90 transition-opacity"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#00F0FF]/15 text-[#00F0FF] shadow-md shadow-[#00F0FF]/10 ring-1 ring-[#00F0FF]/30 group-hover:ring-[#00F0FF]/60 transition-all">
            <Boxes className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-extrabold tracking-tight text-[#F1F5F9]">
                2<span className="text-[#00F0FF]">builders</span>
              </span>
              <span className="rounded-full bg-[#10B981]/15 px-2 py-0.5 text-[9px] font-bold text-[#10B981] flex items-center gap-1 border border-[#10B981]/30">
                <ShieldCheck className="h-2.5 w-2.5" />
                100% Free Forever
              </span>
            </div>
            <div className="font-mono text-[10px] text-[#94A3B8] leading-none line-clamp-1 group-hover:text-[#00F0FF] transition-colors">
              {model.name}
            </div>
          </div>
        </button>

        {/* Back to Home Button */}
        <button
          onClick={() => setCurrentPage('landing')}
          title="Return to Landing Page"
          className="hidden lg:flex items-center gap-1.5 rounded-lg border border-[#1F2942] bg-[#111726] px-2.5 py-1 text-[11px] font-semibold text-[#94A3B8] hover:border-[#00F0FF] hover:text-[#00F0FF] transition-all"
        >
          <Home className="h-3 w-3" />
          <span>Home</span>
        </button>

        {/* Unit Toggle Pill */}
        <button
          onClick={toggleUnitSystem}
          title="Toggle Unit System (Metric / Imperial)"
          className="hidden md:flex items-center gap-1.5 rounded-lg border border-[#1F2942] bg-[#111726] px-2.5 py-1 text-[11px] font-mono font-bold text-[#CBD5E1] hover:border-[#00F0FF] hover:text-[#00F0FF] transition-colors"
        >
          <span className={unitSystem === 'metric' ? 'text-[#00F0FF]' : 'text-[#64748B]'}>m</span>
          <span className="text-[#64748B]">/</span>
          <span className={unitSystem === 'imperial' ? 'text-[#00F0FF]' : 'text-[#64748B]'}>ft</span>
        </button>
      </div>

      {/* Center View Mode Switcher */}
      <div className="flex items-center rounded-xl border border-[#1F2942] bg-[#111726] p-1">
        {viewModes.map((mode) => (
          <button
            key={mode.id}
            onClick={() => setViewMode(mode.id)}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
              viewMode === mode.id
                ? 'bg-[#00F0FF] text-[#0A0D14] shadow-md shadow-[#00F0FF]/20 font-bold'
                : 'text-[#94A3B8] hover:text-[#F1F5F9]'
            }`}
          >
            {mode.icon}
            <span className="hidden sm:inline">{mode.label}</span>
          </button>
        ))}
      </div>

      {/* Primary Actions */}
      <div className="flex items-center gap-2">
        {/* Realism Agent CTA */}
        <button
          id="btn-nav-realism"
          onClick={onOpenRealism}
          title="AI Realism & PBR Material Agent"
          className="flex items-center gap-1.5 rounded-lg border border-[#F59E0B]/40 bg-[#F59E0B]/15 px-3 py-1.5 text-xs font-bold text-[#F59E0B] shadow-md shadow-[#F59E0B]/10 hover:bg-[#F59E0B]/25 transition-all"
        >
          <Sparkles className="h-4 w-4" />
          <span className="hidden sm:inline">Realism Agent</span>
        </button>

        {/* Prompt-to-Design Generator CTA */}
        <button
          onClick={onOpenGenerator}
          className="flex items-center gap-1.5 rounded-lg border border-[#00F0FF]/40 bg-[#00F0FF]/15 px-3 py-1.5 text-xs font-bold text-[#00F0FF] shadow-md shadow-[#00F0FF]/10 hover:bg-[#00F0FF]/25 transition-all"
        >
          <Wand2 className="h-4 w-4" />
          <span className="hidden sm:inline">AI Generator</span>
        </button>

        {/* Upload Plan CTA */}
        <button
          onClick={onOpenUpload}
          className="flex items-center gap-1.5 rounded-lg border border-[#1F2942] bg-[#161F33] px-3 py-1.5 text-xs font-semibold text-[#F1F5F9] hover:border-[#00F0FF] hover:text-[#00F0FF] transition-colors"
        >
          <UploadCloud className="h-4 w-4" />
          <span className="hidden md:inline">Upload Plan</span>
        </button>

        {/* Schedules & Takeoffs */}
        <button
          id="btn-nav-takeoffs"
          onClick={onOpenTakeoffs}
          title="BIM Schedules & Quantity Takeoffs"
          className="flex items-center gap-1.5 rounded-lg border border-[#1F2942] bg-[#161F33] px-3 py-1.5 text-xs font-semibold text-[#F1F5F9] hover:border-[#10B981] hover:text-[#10B981] transition-colors"
        >
          <FileSpreadsheet className="h-4 w-4" />
          <span className="hidden lg:inline">Takeoffs</span>
        </button>

        {/* Furniture Catalog */}
        <button
          onClick={onOpenFurniture}
          className="flex items-center gap-1.5 rounded-lg border border-[#1F2942] bg-[#161F33] px-3 py-1.5 text-xs font-semibold text-[#F1F5F9] hover:border-[#00F0FF] hover:text-[#00F0FF] transition-colors"
        >
          <Armchair className="h-4 w-4" />
          <span className="hidden xl:inline">Furniture</span>
        </button>

        {/* AI Assistant */}
        <button
          onClick={onOpenAssistant}
          title="AI Architectural Assistant"
          className="flex items-center gap-1.5 rounded-lg border border-[#1F2942] bg-[#161F33] px-2.5 py-1.5 text-xs font-semibold text-[#94A3B8] hover:border-[#00F0FF] hover:text-[#00F0FF] transition-colors"
        >
          <Sparkles className="h-4 w-4 text-[#00F0FF]" />
        </button>

        {/* Dedicated /history Navigation Button */}
        <button
          id="btn-nav-history"
          onClick={onOpenHistory}
          title="Architectural Revision History & Checkpoints (/history, Ctrl+H)"
          className="flex items-center gap-1.5 rounded-lg border border-[#1F2942] bg-[#161F33] px-3 py-1.5 text-xs font-semibold text-[#F1F5F9] hover:border-[#00F0FF] hover:text-[#00F0FF] transition-all"
        >
          <History className="h-4 w-4 text-[#00F0FF]" />
          <span className="hidden md:inline font-mono text-[11px]">/history</span>
          <span className="rounded-full bg-[#00F0FF]/15 px-1.5 py-0.2 font-mono text-[10px] font-bold text-[#00F0FF]">
            {(model.checkpoints || []).length}
          </span>
        </button>

        {/* Export CTA */}
        <button
          onClick={onOpenExport}
          className="flex items-center gap-1.5 rounded-lg bg-[#00F0FF] px-3.5 py-1.5 text-xs font-bold text-[#0A0D14] shadow-md shadow-[#00F0FF]/20 hover:bg-[#00D1DF] transition-all"
        >
          <Download className="h-4 w-4" />
          <span>Export</span>
        </button>
      </div>
    </header>
  );
};
