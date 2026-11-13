import React from 'react';
import {
  Boxes,
  Split,
  Square,
  Box,
  UploadCloud,
  Download,
  Armchair,
  Sparkles,
  ShieldCheck
} from 'lucide-react';
import { useFloorPlanStore } from '../../store/useFloorPlanStore';
import { ViewMode } from '../../types/architectural';

interface NavbarProps {
  onOpenUpload: () => void;
  onOpenExport: () => void;
  onOpenFurniture: () => void;
  onOpenAssistant: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenUpload,
  onOpenExport,
  onOpenFurniture,
  onOpenAssistant
}) => {
  const { viewMode, setViewMode, model } = useFloorPlanStore();

  const viewModes: { id: ViewMode; label: string; icon: React.ReactNode }[] = [
    { id: 'split', label: 'Split 2D/3D', icon: <Split className="h-4 w-4" /> },
    { id: '2d', label: '2D Plan', icon: <Square className="h-4 w-4" /> },
    { id: '3d', label: '3D Scene', icon: <Box className="h-4 w-4" /> },
  ];

  return (
    <header className="flex h-14 w-full items-center justify-between border-b border-[#1F2942] bg-[#0A0D14] px-4 select-none z-30">
      {/* Brand & Project Info */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#00F0FF]/15 text-[#00F0FF] shadow-md shadow-[#00F0FF]/10">
            <Boxes className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-extrabold tracking-tight text-[#F1F5F9]">
                Sketch<span className="text-[#00F0FF]">2</span>Space
              </span>
              <span className="rounded-full bg-[#10B981]/15 px-2 py-0.5 text-[9px] font-bold text-[#10B981] flex items-center gap-1">
                <ShieldCheck className="h-2.5 w-2.5" />
                100% Free
              </span>
            </div>
            <div className="font-mono text-[10px] text-[#94A3B8] leading-none line-clamp-1">
              {model.name}
            </div>
          </div>
        </div>
      </div>

      {/* View Mode Switcher */}
      <div className="flex items-center rounded-xl border border-[#1F2942] bg-[#111726] p-1">
        {viewModes.map((mode) => (
          <button
            key={mode.id}
            onClick={() => setViewMode(mode.id)}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
              viewMode === mode.id
                ? 'bg-[#00F0FF] text-[#0A0D14] shadow-md shadow-[#00F0FF]/20'
                : 'text-[#94A3B8] hover:text-[#F1F5F9]'
            }`}
          >
            {mode.icon}
            <span>{mode.label}</span>
          </button>
        ))}
      </div>

      {/* Primary Actions */}
      <div className="flex items-center gap-2">
        {/* Upload Button */}
        <button
          onClick={onOpenUpload}
          className="flex items-center gap-1.5 rounded-lg border border-[#1F2942] bg-[#161F33] px-3 py-1.5 text-xs font-semibold text-[#F1F5F9] hover:border-[#00F0FF] hover:text-[#00F0FF] transition-colors"
        >
          <UploadCloud className="h-4 w-4" />
          <span className="hidden sm:inline">Upload Plan</span>
        </button>

        {/* Furniture Catalog */}
        <button
          onClick={onOpenFurniture}
          className="flex items-center gap-1.5 rounded-lg border border-[#1F2942] bg-[#161F33] px-3 py-1.5 text-xs font-semibold text-[#F1F5F9] hover:border-[#00F0FF] hover:text-[#00F0FF] transition-colors"
        >
          <Armchair className="h-4 w-4" />
          <span className="hidden sm:inline">Furniture</span>
        </button>

        {/* AI Assistant */}
        <button
          onClick={onOpenAssistant}
          className="flex items-center gap-1.5 rounded-lg border border-[#00F0FF]/30 bg-[#00F0FF]/10 px-3 py-1.5 text-xs font-semibold text-[#00F0FF] hover:bg-[#00F0FF]/20 transition-colors"
        >
          <Sparkles className="h-4 w-4" />
          <span className="hidden sm:inline">AI Assistant</span>
        </button>

        {/* Export Modal CTA */}
        <button
          onClick={onOpenExport}
          className="flex items-center gap-1.5 rounded-lg bg-[#00F0FF] px-3.5 py-1.5 text-xs font-bold text-[#0A0D14] shadow-md shadow-[#00F0FF]/20 hover:bg-[#00D1DF] transition-all"
        >
          <Download className="h-4 w-4" />
          <span>Export 3D / CAD</span>
        </button>
      </div>
    </header>
  );
};
