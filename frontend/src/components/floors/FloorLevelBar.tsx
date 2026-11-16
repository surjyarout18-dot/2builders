import React from 'react';
import {
  Layers,
  Plus,
  Copy,
  Trash2,
  ChevronUp,
  Building2
} from 'lucide-react';
import { useFloorPlanStore } from '../../store/useFloorPlanStore';

export const FloorLevelBar: React.FC = () => {
  const {
    model,
    activeFloorIndex,
    setActiveFloorIndex,
    addFloor,
    duplicateFloor,
    deleteFloor
  } = useFloorPlanStore();

  const floors = model.floors || [];

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 rounded-xl border border-[#1F2942] bg-[#111726]/95 p-1.5 shadow-2xl backdrop-blur-md select-none font-sans">
      <div className="flex items-center gap-1.5 px-2 text-[11px] font-mono text-[#00F0FF]">
        <Layers className="h-3.5 w-3.5" />
        <span className="font-bold">LEVELS</span>
      </div>

      <div className="h-4 w-[1px] bg-[#1F2942]" />

      {/* Floor buttons */}
      <div className="flex items-center gap-1">
        {floors.map((fl, idx) => {
          const isActive = activeFloorIndex === idx;
          return (
            <button
              key={fl.id || idx}
              onClick={() => setActiveFloorIndex(idx)}
              className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                isActive
                  ? 'bg-[#00F0FF] text-[#0A0D14] shadow-md shadow-[#00F0FF]/20 font-bold'
                  : 'text-[#94A3B8] hover:bg-[#161F33] hover:text-[#F1F5F9]'
              }`}
            >
              <span>{fl.name}</span>
              <span className={`font-mono text-[10px] ${isActive ? 'text-[#0A0D14]/80' : 'text-[#64748B]'}`}>
                +{fl.elevation.toFixed(1)}m
              </span>
            </button>
          );
        })}
      </div>

      <div className="h-4 w-[1px] bg-[#1F2942]" />

      {/* Level Actions */}
      <div className="flex items-center gap-0.5">
        <button
          onClick={() => addFloor()}
          title="Add Story / Floor"
          className="flex h-7 w-7 items-center justify-center rounded-lg text-[#00F0FF] hover:bg-[#00F0FF]/15 transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>

        <button
          onClick={() => duplicateFloor(activeFloorIndex)}
          title="Duplicate Current Floor"
          className="flex h-7 w-7 items-center justify-center rounded-lg text-[#94A3B8] hover:bg-[#1F2942] hover:text-[#F1F5F9] transition-colors"
        >
          <Copy className="h-3.5 w-3.5" />
        </button>

        {floors.length > 1 && (
          <button
            onClick={() => deleteFloor(activeFloorIndex)}
            title="Delete Current Level"
            className="flex h-7 w-7 items-center justify-center rounded-lg text-[#EF4444] hover:bg-[#EF4444]/15 transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};
