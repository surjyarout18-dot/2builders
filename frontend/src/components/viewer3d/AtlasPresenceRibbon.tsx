import React from 'react';
import { useFloorPlanStore } from '../../store/useFloorPlanStore';
import { Users, Activity, Sparkles, Thermometer, Radio, Eye, EyeOff } from 'lucide-react';

export const AtlasPresenceRibbon: React.FC = () => {
  const {
    inhabitants,
    showInhabitants,
    toggleShowInhabitants,
    floorPerimeterGlow,
    toggleFloorPerimeterGlow,
    showClimateBadges,
    toggleShowClimateBadges,
    navigateToRoom,
    isFirstPerson,
    model,
    activeFloorIndex
  } = useFloorPlanStore();

  if (isFirstPerson) return null;

  const homeInhabitants = inhabitants.filter((inh) => inh.status === 'home' || inh.status === 'motion_active');
  const activeFloor = model.floors[activeFloorIndex] || model.floors[0];

  return (
    <div className="absolute top-3 left-4 right-4 z-20 flex flex-col gap-2 pointer-events-none select-none">
      {/* 1. Main Atlas Status Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#1F2942]/90 bg-[#070A14]/92 px-4 py-2.5 shadow-2xl backdrop-blur-xl pointer-events-auto">
        {/* Left: Engine brand & Inhabitant stats */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#10B981] opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#10B981]" />
            </span>
            <span className="font-mono text-xs font-bold tracking-wide text-[#F1F5F9]">Atlas 3D</span>
            <span className="rounded bg-[#1E293B] px-1.5 py-0.5 text-[10px] font-mono text-[#94A3B8]">v1.0 Live</span>
          </div>

          <div className="h-4 w-[1px] bg-[#1F2942]" />

          {/* Active Space Count Badge */}
          <div className="flex items-center gap-1.5 rounded-full border border-[#00F0FF]/30 bg-[#00F0FF]/10 px-2.5 py-0.5 text-xs font-mono font-medium text-[#00F0FF]">
            <Activity className="h-3 w-3" />
            <span>Spaces: <strong>{activeFloor?.rooms?.length || 4} Zones</strong></span>
          </div>

          {/* Motion Activity Indicators */}
          <div className="hidden lg:flex items-center gap-1.5 text-xs font-mono text-[#94A3B8]">
            <Activity className="h-3.5 w-3.5 text-[#F59E0B] animate-pulse" />
            <span>Active:</span>
            <span className="rounded bg-[#F59E0B]/15 px-2 py-0.5 text-[11px] text-[#F59E0B] font-semibold">Living Room</span>
            <span className="rounded bg-[#10B981]/15 px-2 py-0.5 text-[11px] text-[#10B981]">Master Suite</span>
          </div>
        </div>

        {/* Center: Architectural Room Status Summary (Zero people names) */}
        <div className="hidden xl:flex items-center gap-2 text-xs font-mono text-[#E2E8F0] bg-[#111726]/80 px-3 py-1 rounded-xl border border-[#1F2942]">
          <span className="text-[#94A3B8]">Live Spaces:</span>
          {activeFloor?.rooms?.slice(0, 4).map((r, idx) => (
            <button
              key={r.id}
              onClick={() => navigateToRoom(r.id)}
              className="hover:underline flex items-center gap-1 text-[#F1F5F9] hover:text-[#00F0FF] transition-colors"
              title={`Jump to ${r.name}`}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-[#10B981]" />
              <span className="font-semibold">{r.name}</span>
              <span className="text-[#64748B]">({(r.area_sqm || 0).toFixed(0)}m²)</span>
              {idx < Math.min(3, (activeFloor?.rooms?.length || 1) - 1) && <span className="text-[#475569] mx-1">•</span>}
            </button>
          ))}
        </div>

        {/* Right: Quick Teleport Pills & Visual Layer Toggles */}
        <div className="flex items-center gap-2">
          {/* Quick Teleport Jump Pills */}
          <div className="hidden sm:flex items-center gap-1.5">
            {activeFloor?.rooms?.slice(0, 3).map((r) => (
              <button
                key={r.id}
                onClick={() => navigateToRoom(r.id)}
                className="rounded-lg border border-[#1F2942] bg-[#161F33]/80 px-2.5 py-1 text-[11px] font-mono text-[#94A3B8] hover:border-[#00F0FF] hover:bg-[#00F0FF]/15 hover:text-[#00F0FF] transition-all"
              >
                📍 {r.name.split(' ')[0]}
              </button>
            ))}
          </div>

          <div className="h-4 w-[1px] bg-[#1F2942]" />

          {/* Toggle Human Scale Figures */}
          <button
            onClick={toggleShowInhabitants}
            title={showInhabitants ? "Hide Scale Figures" : "Show Scale Figures"}
            className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-mono font-medium transition-all ${
              showInhabitants
                ? 'bg-[#00F0FF]/20 text-[#00F0FF] border border-[#00F0FF]/40'
                : 'text-[#94A3B8] hover:bg-[#1E293B] hover:text-[#F1F5F9]'
            }`}
          >
            <Users className="h-3.5 w-3.5" />
            <span className="hidden md:inline">Figures</span>
          </button>

          {/* Toggle Perimeter Glow */}
          <button
            onClick={toggleFloorPerimeterGlow}
            title={floorPerimeterGlow ? "Disable Floor Perimeter Glow" : "Enable Floor Perimeter Glow"}
            className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-mono font-medium transition-all ${
              floorPerimeterGlow
                ? 'bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/40'
                : 'text-[#94A3B8] hover:bg-[#1E293B] hover:text-[#F1F5F9]'
            }`}
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span className="hidden md:inline">Glow</span>
          </button>

          {/* Toggle Climate Badges */}
          <button
            onClick={toggleShowClimateBadges}
            title={showClimateBadges ? "Hide Room Badges" : "Show Room Badges"}
            className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-mono font-medium transition-all ${
              showClimateBadges
                ? 'bg-[#F59E0B]/20 text-[#F59E0B] border border-[#F59E0B]/40'
                : 'text-[#94A3B8] hover:bg-[#1E293B] hover:text-[#F1F5F9]'
            }`}
          >
            <Thermometer className="h-3.5 w-3.5" />
            <span className="hidden md:inline">Badges</span>
          </button>
        </div>
      </div>

      {/* 2. Atlas Navigation Sub-hint (PadSpan Atlas style) */}
      <div className="flex items-center justify-center">
        <div className="rounded-full border border-[#1F2942]/60 bg-[#070A14]/75 px-4 py-1 text-[11px] font-mono text-[#94A3B8] shadow-md backdrop-blur-md">
          Drag to orbit • Pinch/wheel to zoom • Click any room badge to fly there • Walk (WASD) for first-person
        </div>
      </div>
    </div>
  );
};
