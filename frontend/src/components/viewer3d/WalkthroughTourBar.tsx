import React, { useMemo } from 'react';
import { useFloorPlanStore } from '../../store/useFloorPlanStore';
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Navigation,
  Compass,
  Footprints,
  Eye,
  Sliders
} from 'lucide-react';

export const WalkthroughTourBar: React.FC = () => {
  const {
    model,
    activeFloorIndex,
    isFirstPerson,
    toggleFirstPerson,
    isAutoTouring,
    autoTourRoomIndex,
    startAutoTour,
    pauseAutoTour,
    resumeAutoTour,
    nextTourRoom,
    prevTourRoom,
    navigateToRoom,
    walkthroughPosition,
    walkthroughSpeed,
    viewMode
  } = useFloorPlanStore();

  const activeFloor = model.floors[activeFloorIndex] || model.floors[0] || {
    rooms: []
  };

  const rawRooms = activeFloor.rooms || [];
  // If no explicit room polygons exist yet, provide dynamic architectural waypoint
  const rooms = rawRooms.length > 0 ? rawRooms : [
    {
      id: 'zone_center',
      floor_id: (activeFloor as any).id || 'floor_0',
      name: 'Central Living Space',
      room_type: 'living',
      area_sqm: 38.5,
      area_sqft: 414.0,
      polygon: [{ x: 2, z: 2 }, { x: 6, z: 2 }, { x: 6, z: 6 }, { x: 2, z: 6 }],
      floor_material: 'hardwood',
      wall_color: '#F8FAFC'
    }
  ];
  const currentTourRoom = rooms[autoTourRoomIndex] || rooms[0];

  const isSplit = viewMode === 'split';
  const containerPosition = isSplit
    ? 'bottom-4 left-4 max-w-[calc(100%-250px)] items-start'
    : 'bottom-5 left-1/2 -translate-x-1/2 max-w-[65vw] items-center';

  return (
    <div className={`absolute ${containerPosition} z-20 flex flex-col gap-2 pointer-events-auto transition-all duration-300`}>
      {/* Quick-Jump Room Pills Carousel */}
      <div className="flex items-center gap-1.5 overflow-x-auto max-w-full rounded-2xl border border-[#1F2942]/80 bg-[#070A14]/90 p-1.5 backdrop-blur-xl shadow-2xl scrollbar-none">
        {rooms.map((room, idx) => {
          const isSelected = autoTourRoomIndex === idx;
          return (
            <button
              key={room.id}
              onClick={() => navigateToRoom(room.id)}
              className={`flex items-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-1.5 text-xs font-mono transition-all ${
                isSelected
                  ? 'bg-[#00F0FF] text-[#0A0D14] font-bold shadow-[0_0_15px_rgba(0,240,255,0.4)]'
                  : 'text-[#94A3B8] hover:bg-[#161F33] hover:text-[#F1F5F9]'
              }`}
            >
              {isSelected && <span className="h-2 w-2 rounded-full bg-[#0A0D14] animate-ping" />}
              <span>{room.name}</span>
              <span className={`text-[10px] ${isSelected ? 'text-[#0A0D14]/75' : 'text-[#64748B]'}`}>
                {(room.area_sqm || 0).toFixed(1)}m²
              </span>
            </button>
          );
        })}
      </div>

      {/* Guided Tour Control Bar */}
      <div className="flex items-center gap-3 rounded-2xl border border-[#1F2942]/90 bg-[#0B0F19]/95 px-4 py-2 text-xs font-mono shadow-2xl backdrop-blur-xl">
        {/* Walkthrough Mode Toggle / Exit */}
        <button
          onClick={toggleFirstPerson}
          className={`flex items-center gap-1.5 rounded-xl px-2.5 py-1 text-xs font-semibold transition-all ${
            isFirstPerson
              ? 'bg-[#00F0FF]/15 text-[#00F0FF] border border-[#00F0FF]/40'
              : 'bg-[#161F33] text-[#94A3B8] hover:text-[#F1F5F9]'
          }`}
          title={isFirstPerson ? 'Exit Walkthrough Mode' : 'Enter First-Person Walkthrough'}
        >
          <Footprints className="h-3.5 w-3.5" />
          <span>{isFirstPerson ? 'First-Person' : 'Orbit 3D'}</span>
        </button>

        <div className="h-4 w-px bg-[#1F2942]" />

        {/* Previous Room */}
        <button
          onClick={prevTourRoom}
          className="rounded-lg p-1.5 text-[#94A3B8] hover:bg-[#161F33] hover:text-[#F1F5F9] transition-colors"
          title="Previous Room"
        >
          <SkipBack className="h-4 w-4" />
        </button>

        {/* Play / Pause Tour Button */}
        {isAutoTouring ? (
          <button
            onClick={pauseAutoTour}
            className="flex items-center gap-2 rounded-xl bg-[#F59E0B] px-3.5 py-1.5 font-bold text-[#0A0D14] shadow-[0_0_12px_rgba(245,158,11,0.4)] hover:bg-[#F59E0B]/90 transition-all"
            title="Pause Auto-Tour"
          >
            <Pause className="h-3.5 w-3.5 fill-current" />
            <span>Pause Tour</span>
          </button>
        ) : (
          <button
            onClick={startAutoTour}
            className="flex items-center gap-2 rounded-xl bg-[#10B981] px-3.5 py-1.5 font-bold text-[#0A0D14] shadow-[0_0_12px_rgba(16,185,129,0.4)] hover:bg-[#10B981]/90 transition-all"
            title="Start Auto-Guided Tour"
          >
            <Play className="h-3.5 w-3.5 fill-current" />
            <span>Auto-Tour</span>
          </button>
        )}

        {/* Next Room */}
        <button
          onClick={nextTourRoom}
          className="rounded-lg p-1.5 text-[#94A3B8] hover:bg-[#161F33] hover:text-[#F1F5F9] transition-colors"
          title="Next Room"
        >
          <SkipForward className="h-4 w-4" />
        </button>

        {/* Tour Status Text */}
        <div className="h-4 w-px bg-[#1F2942]" />
        <div className="flex items-center gap-2 text-[11px] text-[#94A3B8]">
          {isAutoTouring ? (
            <span className="flex items-center gap-1.5 text-[#10B981] font-semibold">
              <span className="h-2 w-2 rounded-full bg-[#10B981] animate-ping" />
              Auto-Touring ({autoTourRoomIndex + 1}/{rooms.length})
            </span>
          ) : (
            <span className="text-[#64748B]">
              Room {autoTourRoomIndex + 1} of {rooms.length}
            </span>
          )}
          {currentTourRoom && (
            <span className="max-w-[140px] truncate text-[#F1F5F9] font-medium font-sans">
              • {currentTourRoom.name}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
