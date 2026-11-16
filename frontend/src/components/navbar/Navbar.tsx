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
  Wand2
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
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenUpload,
  onOpenExport,
  onOpenFurniture,
  onOpenAssistant,
  onOpenGenerator,
  onOpenTakeoffs,
  onOpenReview
}) => {
  const {
    viewMode,
    setViewMode,
    model,
    unitSystem,
    toggleUnitSystem,
    createCheckpoint
  } = useFloorPlanStore();

  const [isCheckpointsOpen, setIsCheckpointsOpen] = useState(false);

  const viewModes: { id: ViewMode; label: string; icon: React.ReactNode }[] = [
    { id: 'split', label: 'Split CAD', icon: <Split className="h-4 w-4" /> },
    { id: '2d', label: '2D Plan', icon: <Square className="h-4 w-4" /> },
    { id: '3d', label: '3D Scene', icon: <Box className="h-4 w-4" /> },
    { id: 'walkthrough', label: 'Walk (FPS)', icon: <User className="h-4 w-4" /> },
  ];

  return (
    <header className="flex h-14 w-full items-center justify-between border-b border-[#1F2942] bg-[#0A0D14] px-4 select-none z-30">
      {/* Brand & Project Info */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#00F0FF]/15 text-[#00F0FF] shadow-md shadow-[#00F0FF]/10 ring-1 ring-[#00F0FF]/30">
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
            <div className="font-mono text-[10px] text-[#94A3B8] leading-none line-clamp-1">
              {model.name}
            </div>
          </div>
        </div>

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
          onClick={onOpenTakeoffs}
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
          className="flex items-center gap-1.5 rounded-lg border border-[#1F2942] bg-[#161F33] px-2.5 py-1.5 text-xs font-semibold text-[#94A3B8] hover:border-[#00F0FF] hover:text-[#00F0FF] transition-colors"
        >
          <Sparkles className="h-4 w-4 text-[#00F0FF]" />
        </button>

        {/* Version Checkpoints Dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsCheckpointsOpen(!isCheckpointsOpen)}
            title="Version Checkpoints"
            className="flex items-center gap-1.5 rounded-lg border border-[#1F2942] bg-[#161F33] px-2.5 py-1.5 text-xs font-semibold text-[#94A3B8] hover:border-[#00F0FF] hover:text-[#00F0FF] transition-colors"
          >
            <History className="h-4 w-4" />
            <span className="font-mono text-[11px] text-[#00F0FF]">
              {(model.checkpoints || []).length}
            </span>
          </button>

          {isCheckpointsOpen && (
            <div className="absolute right-0 top-12 w-64 rounded-xl border border-[#1F2942] bg-[#111726] p-3 shadow-2xl z-50 animate-in fade-in">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-[#F1F5F9]">Version Checkpoints</span>
                <button
                  onClick={() => {
                    createCheckpoint(`Checkpoint ${(model.checkpoints || []).length + 1}`);
                  }}
                  className="rounded bg-[#00F0FF]/15 px-2 py-0.5 text-[10px] font-bold text-[#00F0FF] hover:bg-[#00F0FF]/25"
                >
                  + Save Now
                </button>
              </div>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {(model.checkpoints || []).map((cp) => (
                  <div key={cp.id} className="rounded-lg bg-[#161F33] p-2 text-xs">
                    <div className="font-semibold text-[#F1F5F9]">{cp.name}</div>
                    <div className="font-mono text-[10px] text-[#94A3B8]">
                      {new Date(cp.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {cp.change_summary}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

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
