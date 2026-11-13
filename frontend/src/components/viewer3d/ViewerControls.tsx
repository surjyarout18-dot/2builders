import React from 'react';
import {
  Layers,
  Sun,
  Moon,
  Compass,
  Maximize,
  User,
  Eye
} from 'lucide-react';
import { useFloorPlanStore } from '../../store/useFloorPlanStore';

interface ViewerControlsProps {
  onSetCameraView: (view: 'top' | 'iso' | 'front') => void;
  onResetCamera: () => void;
}

export const ViewerControls: React.FC<ViewerControlsProps> = ({
  onSetCameraView,
  onResetCamera,
}) => {
  const {
    isDollhouseView,
    toggleDollhouseView,
    dayNightMode,
    toggleDayNight,
    isFirstPerson,
    toggleFirstPerson
  } = useFloorPlanStore();

  return (
    <div className="absolute right-4 top-4 z-20 flex items-center gap-1.5 rounded-xl border border-[#1F2942] bg-[#111726]/90 p-1.5 shadow-xl backdrop-blur-md">
      {/* Top View */}
      <button
        onClick={() => onSetCameraView('top')}
        title="Top-Down Plan View"
        className="flex h-8 items-center gap-1 rounded-lg px-2 text-xs font-medium text-[#94A3B8] hover:bg-[#1F2942] hover:text-[#F1F5F9] transition-colors"
      >
        <Eye className="h-3.5 w-3.5" />
        <span>Top</span>
      </button>

      {/* Isometric 3D View */}
      <button
        onClick={() => onSetCameraView('iso')}
        title="Isometric 3D View"
        className="flex h-8 items-center gap-1 rounded-lg px-2 text-xs font-medium text-[#94A3B8] hover:bg-[#1F2942] hover:text-[#F1F5F9] transition-colors"
      >
        <Compass className="h-3.5 w-3.5" />
        <span>Isometric</span>
      </button>

      <div className="mx-1 h-4 w-[1px] bg-[#1F2942]" />

      {/* Dollhouse Cutaway */}
      <button
        onClick={toggleDollhouseView}
        title={isDollhouseView ? "Disable Dollhouse View" : "Enable Dollhouse Cutaway"}
        className={`flex h-8 items-center gap-1 rounded-lg px-2.5 text-xs font-medium transition-all ${
          isDollhouseView
            ? 'bg-[#00F0FF] text-[#0A0D14] font-semibold shadow-md shadow-[#00F0FF]/20'
            : 'text-[#94A3B8] hover:bg-[#1F2942] hover:text-[#F1F5F9]'
        }`}
      >
        <Layers className="h-3.5 w-3.5" />
        <span>Dollhouse</span>
      </button>

      {/* First Person Walkthrough */}
      <button
        onClick={toggleFirstPerson}
        title={isFirstPerson ? "Exit First-Person Walkthrough" : "First-Person Walkthrough (WASD)"}
        className={`flex h-8 items-center gap-1 rounded-lg px-2.5 text-xs font-medium transition-all ${
          isFirstPerson
            ? 'bg-[#00F0FF] text-[#0A0D14] font-semibold'
            : 'text-[#94A3B8] hover:bg-[#1F2942] hover:text-[#F1F5F9]'
        }`}
      >
        <User className="h-3.5 w-3.5" />
        <span>Walk</span>
      </button>

      <div className="mx-1 h-4 w-[1px] bg-[#1F2942]" />

      {/* Day / Night toggle */}
      <button
        onClick={toggleDayNight}
        title={dayNightMode === 'day' ? "Switch to Night Lighting" : "Switch to Day Lighting"}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-[#94A3B8] hover:bg-[#1F2942] hover:text-[#F1F5F9] transition-colors"
      >
        {dayNightMode === 'day' ? <Moon className="h-3.5 w-3.5" /> : <Sun className="h-3.5 w-3.5 text-[#F59E0B]" />}
      </button>

      {/* Reset Camera */}
      <button
        onClick={onResetCamera}
        title="Reset Camera Center"
        className="flex h-8 w-8 items-center justify-center rounded-lg text-[#94A3B8] hover:bg-[#1F2942] hover:text-[#F1F5F9] transition-colors"
      >
        <Maximize className="h-3.5 w-3.5" />
      </button>
    </div>
  );
};
