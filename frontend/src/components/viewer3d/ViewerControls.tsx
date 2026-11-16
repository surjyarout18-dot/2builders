import React from 'react';
import {
  Layers,
  Sun,
  Moon,
  Compass,
  Maximize,
  User,
  Eye,
  Home
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
    toggleFirstPerson,
    model,
    toggleRoofVisibility
  } = useFloorPlanStore();

  const isRoofVisible = model.building.roof?.visible ?? false;

  return (
    <div className="absolute right-4 top-[78px] z-20 flex items-center gap-1.5 rounded-xl border border-[#1F2942]/90 bg-[#070A14]/90 p-1.5 shadow-2xl backdrop-blur-xl">
      {/* Top View */}
      <button
        onClick={() => onSetCameraView('top')}
        title="Top-Down Plan View"
        className="flex h-8 items-center gap-1 rounded-lg px-2.5 text-xs font-mono font-medium text-[#94A3B8] hover:bg-[#1F2942] hover:text-[#F1F5F9] transition-colors"
      >
        <Eye className="h-3.5 w-3.5" />
        <span>Top</span>
      </button>

      {/* Isometric 3D View */}
      <button
        onClick={() => onSetCameraView('iso')}
        title="Isometric 3D View"
        className="flex h-8 items-center gap-1 rounded-lg px-2.5 text-xs font-mono font-medium text-[#94A3B8] hover:bg-[#1F2942] hover:text-[#F1F5F9] transition-colors"
      >
        <Compass className="h-3.5 w-3.5" />
        <span>Iso</span>
      </button>

      {/* Front Elevation View */}
      <button
        onClick={() => onSetCameraView('front')}
        title="Front Architectural Elevation"
        className="flex h-8 items-center gap-1 rounded-lg px-2.5 text-xs font-mono font-medium text-[#94A3B8] hover:bg-[#1F2942] hover:text-[#F1F5F9] transition-colors"
      >
        <span>Front</span>
      </button>

      <div className="mx-1 h-4 w-[1px] bg-[#1F2942]" />

      {/* Roof Toggle */}
      <button
        onClick={toggleRoofVisibility}
        title={isRoofVisible ? "Hide Roof (Interior Cutaway)" : "Show 3D Roof"}
        className={`flex h-8 items-center gap-1 rounded-lg px-2.5 text-xs font-mono font-medium transition-all ${
          isRoofVisible
            ? 'bg-[#10B981] text-[#0A0D14] font-bold shadow-md shadow-[#10B981]/25'
            : 'text-[#94A3B8] hover:bg-[#1F2942] hover:text-[#F1F5F9]'
        }`}
      >
        <Home className="h-3.5 w-3.5" />
        <span>Roof</span>
      </button>

      {/* Dollhouse Cutaway */}
      <button
        onClick={toggleDollhouseView}
        title={isDollhouseView ? "Full Height Walls" : "Dollhouse Cutaway Walls (PadSpan style)"}
        className={`flex h-8 items-center gap-1 rounded-lg px-2.5 text-xs font-mono font-medium transition-all ${
          isDollhouseView
            ? 'bg-[#00F0FF] text-[#0A0D14] font-bold shadow-md shadow-[#00F0FF]/25'
            : 'text-[#94A3B8] hover:bg-[#1F2942] hover:text-[#F1F5F9]'
        }`}
      >
        <Layers className="h-3.5 w-3.5" />
        <span>Walls: {isDollhouseView ? 'Cut' : 'Up'}</span>
      </button>

      {/* Day / Night Toggle */}
      <button
        onClick={toggleDayNight}
        title={dayNightMode === 'day' ? "Switch to Night Lighting" : "Switch to Day Lighting"}
        className="flex h-8 items-center gap-1 rounded-lg px-2 text-xs font-mono font-medium text-[#94A3B8] hover:bg-[#1F2942] hover:text-[#F1F5F9] transition-colors"
      >
        {dayNightMode === 'day' ? <Sun className="h-3.5 w-3.5 text-[#F59E0B]" /> : <Moon className="h-3.5 w-3.5 text-[#38BDF8]" />}
      </button>

      {/* First Person Walkthrough */}
      <button
        onClick={toggleFirstPerson}
        title={isFirstPerson ? "Exit First-Person Walkthrough" : "First-Person Walkthrough (WASD)"}
        className={`flex h-8 items-center gap-1 rounded-lg px-2.5 text-xs font-mono font-medium transition-all ${
          isFirstPerson
            ? 'bg-[#00F0FF] text-[#0A0D14] font-bold'
            : 'text-[#94A3B8] hover:bg-[#1F2942] hover:text-[#F1F5F9]'
        }`}
      >
        <User className="h-3.5 w-3.5" />
        <span>Walk</span>
      </button>

      <div className="mx-1 h-4 w-[1px] bg-[#1F2942]" />

      {/* Reset Camera Fit */}
      <button
        onClick={onResetCamera}
        title="Reset & Center View"
        className="flex h-8 w-8 items-center justify-center rounded-lg text-[#94A3B8] hover:bg-[#1F2942] hover:text-[#F1F5F9] transition-colors"
      >
        <Maximize className="h-3.5 w-3.5" />
      </button>
    </div>
  );
};
