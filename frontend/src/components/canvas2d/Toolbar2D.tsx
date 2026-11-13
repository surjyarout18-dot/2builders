import React from 'react';
import {
  MousePointer,
  Square,
  DoorOpen,
  Maximize2,
  Ruler,
  Undo2,
  Redo2,
  Eye,
  EyeOff,
  Magnet,
  Maximize,
  Sparkles
} from 'lucide-react';
import { useFloorPlanStore } from '../../store/useFloorPlanStore';
import { CADTool } from '../../types/architectural';

interface Toolbar2DProps {
  onOpenCalibration: () => void;
  onResetView: () => void;
  snapToGrid: boolean;
  onToggleSnap: () => void;
}

export const Toolbar2D: React.FC<Toolbar2DProps> = ({
  onOpenCalibration,
  onResetView,
  snapToGrid,
  onToggleSnap
}) => {
  const {
    activeTool,
    setActiveTool,
    undo,
    redo,
    showDetectionOverlay,
    toggleDetectionOverlay,
    historyIndex,
    history
  } = useFloorPlanStore();

  const tools: { id: CADTool; label: string; icon: React.ReactNode }[] = [
    { id: 'select', label: 'Select (V)', icon: <MousePointer className="h-4 w-4" /> },
    { id: 'wall', label: 'Draw Wall (W)', icon: <Square className="h-4 w-4" /> },
    { id: 'door', label: 'Add Door (D)', icon: <DoorOpen className="h-4 w-4" /> },
    { id: 'window', label: 'Add Window (N)', icon: <Maximize2 className="h-4 w-4" /> },
    { id: 'measure', label: 'Measure (M)', icon: <Ruler className="h-4 w-4" /> },
  ];

  return (
    <div className="absolute left-4 top-4 z-20 flex flex-col gap-2">
      {/* Primary CAD tools dock */}
      <div className="flex items-center gap-1 rounded-xl border border-[#1F2942] bg-[#111726]/90 p-1.5 shadow-xl backdrop-blur-md">
        {tools.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTool(t.id)}
            title={t.label}
            className={`flex h-9 w-9 items-center justify-center rounded-lg transition-all ${
              activeTool === t.id
                ? 'bg-[#00F0FF] text-[#0A0D14] shadow-md shadow-[#00F0FF]/20 font-medium'
                : 'text-[#94A3B8] hover:bg-[#1F2942] hover:text-[#F1F5F9]'
            }`}
          >
            {t.icon}
          </button>
        ))}

        <div className="mx-1 h-5 w-[1px] bg-[#1F2942]" />

        {/* Calibrate action button */}
        <button
          onClick={onOpenCalibration}
          title="Calibrate Scale"
          className="flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold text-[#00F0FF] hover:bg-[#00F0FF]/10 transition-colors"
        >
          <Sparkles className="h-3.5 w-3.5" />
          <span>Calibrate</span>
        </button>

        <div className="mx-1 h-5 w-[1px] bg-[#1F2942]" />

        {/* Snap to Grid */}
        <button
          onClick={onToggleSnap}
          title={snapToGrid ? "Snap to Grid ON" : "Snap to Grid OFF"}
          className={`flex h-9 w-9 items-center justify-center rounded-lg transition-all ${
            snapToGrid
              ? 'text-[#00F0FF] bg-[#00F0FF]/10'
              : 'text-[#94A3B8] hover:bg-[#1F2942] hover:text-[#F1F5F9]'
          }`}
        >
          <Magnet className="h-4 w-4" />
        </button>

        {/* AI Detection Overlay Toggle */}
        <button
          onClick={toggleDetectionOverlay}
          title={showDetectionOverlay ? "Hide AI Detection Overlay" : "Show AI Detection Overlay"}
          className={`flex h-9 w-9 items-center justify-center rounded-lg transition-all ${
            showDetectionOverlay
              ? 'text-[#00F0FF] bg-[#00F0FF]/10'
              : 'text-[#94A3B8] hover:bg-[#1F2942] hover:text-[#F1F5F9]'
          }`}
        >
          {showDetectionOverlay ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
        </button>

        {/* Fit to View */}
        <button
          onClick={onResetView}
          title="Reset View"
          className="flex h-9 w-9 items-center justify-center rounded-lg text-[#94A3B8] hover:bg-[#1F2942] hover:text-[#F1F5F9]"
        >
          <Maximize className="h-4 w-4" />
        </button>

        <div className="mx-1 h-5 w-[1px] bg-[#1F2942]" />

        {/* Undo / Redo */}
        <button
          onClick={undo}
          disabled={historyIndex <= 0}
          title="Undo (Ctrl+Z)"
          className="flex h-9 w-9 items-center justify-center rounded-lg text-[#94A3B8] hover:bg-[#1F2942] hover:text-[#F1F5F9] disabled:opacity-30 disabled:hover:bg-transparent"
        >
          <Undo2 className="h-4 w-4" />
        </button>
        <button
          onClick={redo}
          disabled={historyIndex >= history.length - 1}
          title="Redo (Ctrl+Y)"
          className="flex h-9 w-9 items-center justify-center rounded-lg text-[#94A3B8] hover:bg-[#1F2942] hover:text-[#F1F5F9] disabled:opacity-30 disabled:hover:bg-transparent"
        >
          <Redo2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};
