import React, { useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import { useFloorPlanStore } from '../../store/useFloorPlanStore';
import { ParametricWallMesh } from '../viewer3d/ParametricWallMesh';
import { RoomFloorMesh } from '../viewer3d/RoomFloorMesh';
import { ParametricDoorMesh } from '../viewer3d/ParametricDoorMesh';
import { ParametricWindowMesh } from '../viewer3d/ParametricWindowMesh';
import { ParametricStairMesh } from '../viewer3d/ParametricStairMesh';
import { ParametricColumnMesh } from '../viewer3d/ParametricColumnMesh';
import { ParametricRoofMesh } from '../viewer3d/ParametricRoofMesh';
import { LightingEnvironment } from '../viewer3d/LightingEnvironment';
import { Sun, Moon, Eye, Box, Compass } from 'lucide-react';

export const Hero3DPreview: React.FC = () => {
  const {
    model,
    dayNightMode,
    toggleDayNight,
    toggleRoofVisibility
  } = useFloorPlanStore();

  const [isRotating, setIsRotating] = useState(true);
  const activeFloor = model.floors[0] || {
    walls: [],
    doors: [],
    windows: [],
    rooms: [],
    furniture: [],
    stairs: [],
    columns: [],
    elevation: 0,
    height: 2.8
  };

  // Centroid
  let cx = 5, cz = 4;
  if (activeFloor.walls.length > 0) {
    let sx = 0, sz = 0;
    activeFloor.walls.forEach((w) => {
      sx += w.start.x + w.end.x;
      sz += w.start.z + w.end.z;
    });
    cx = sx / (activeFloor.walls.length * 2);
    cz = sz / (activeFloor.walls.length * 2);
  }

  const topFloor = model.floors[model.floors.length - 1] || activeFloor;

  return (
    <div className="relative h-full w-full select-none overflow-hidden rounded-2xl border border-[#1F2942] bg-[#070A11] shadow-2xl">
      {/* 3D Canvas */}
      <Canvas
        camera={{ position: [cx + 12, 10, cz + 14], fov: 42 }}
        shadows
        gl={{ antialias: true, alpha: false, preserveDrawingBuffer: true }}
      >
        <color attach="background" args={[dayNightMode === 'night' ? '#070A12' : '#0B111E']} />
        
        {/* Soft Fog for atmospheric depth */}
        <fog
          attach="fog"
          args={[dayNightMode === 'night' ? '#070A12' : '#0B111E', 25, 60]}
        />

        <LightingEnvironment />

        {/* Blueprint Floor Grid */}
        <gridHelper
          args={[30, 30, '#00F0FF', '#1E293B']}
          position={[cx, -0.01, cz]}
        />

        <group position={[0, 0, 0]}>
          {/* Walls */}
          {activeFloor.walls.map((wall) => (
            <ParametricWallMesh
              key={wall.id}
              wall={wall}
              doors={activeFloor.doors || []}
              windows={activeFloor.windows || []}
              isDollhouse={false}
            />
          ))}

          {/* Rooms */}
          {activeFloor.rooms.map((room) => (
            <RoomFloorMesh
              key={room.id}
              room={room}
            />
          ))}

          {/* Openings */}
          {activeFloor.doors.map((door) => (
            <ParametricDoorMesh
              key={door.id}
              door={door}
            />
          ))}

          {activeFloor.windows.map((win) => (
            <ParametricWindowMesh
              key={win.id}
              window={win}
            />
          ))}

          {/* Stairs & Columns */}
          {activeFloor.stairs?.map((stair) => (
            <ParametricStairMesh
              key={stair.id}
              stair={stair}
            />
          ))}

          {activeFloor.columns?.map((col) => (
            <ParametricColumnMesh
              key={col.id}
              column={col}
            />
          ))}

          {/* Roof */}
          {model.building.roof?.visible && (
            <ParametricRoofMesh
              roof={model.building.roof}
              topFloor={topFloor}
            />
          )}

          {/* Architectural Contact Shadow */}
          <ContactShadows
            position={[cx, 0.01, cz]}
            opacity={0.65}
            scale={28}
            blur={1.8}
            far={12}
          />
        </group>

        <OrbitControls
          target={[cx, 1.4, cz]}
          enableDamping
          dampingFactor={0.06}
          autoRotate={isRotating}
          autoRotateSpeed={0.9}
          maxPolarAngle={Math.PI / 2 - 0.05}
          minDistance={6}
          maxDistance={32}
        />
      </Canvas>

      {/* Floating Viewport HUD Badges */}
      <div className="absolute top-3 left-3 flex items-center gap-2 pointer-events-none">
        <div className="flex items-center gap-1.5 rounded-lg border border-[#00F0FF]/30 bg-[#0A0D14]/80 px-2.5 py-1 backdrop-blur-md">
          <span className="h-2 w-2 rounded-full bg-[#00F0FF] animate-pulse" />
          <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#00F0FF]">
            Live 3D Viewport
          </span>
        </div>
        <span className="hidden sm:inline font-mono text-[10px] text-[#64748B] bg-[#0A0D14]/70 px-2 py-1 rounded border border-[#1F2942]">
          Orbit: Click & Drag
        </span>
      </div>

      {/* Floating HUD Controls */}
      <div className="absolute top-3 right-3 flex items-center gap-1.5">
        <button
          onClick={() => setIsRotating(!isRotating)}
          title={isRotating ? 'Pause Rotation' : 'Auto-Rotate'}
          className={`flex h-8 w-8 items-center justify-center rounded-lg border text-xs transition-all ${
            isRotating
              ? 'border-[#00F0FF]/50 bg-[#00F0FF]/15 text-[#00F0FF]'
              : 'border-[#1F2942] bg-[#0A0D14]/80 text-[#94A3B8] hover:text-[#F1F5F9]'
          }`}
        >
          <Compass className={`h-4 w-4 ${isRotating ? 'animate-spin' : ''}`} style={{ animationDuration: '8s' }} />
        </button>

        <button
          onClick={toggleDayNight}
          title="Toggle Day/Night"
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#1F2942] bg-[#0A0D14]/80 text-[#94A3B8] hover:border-[#00F0FF] hover:text-[#00F0FF] transition-all"
        >
          {dayNightMode === 'night' ? <Moon className="h-4 w-4 text-[#F59E0B]" /> : <Sun className="h-4 w-4 text-[#F59E0B]" />}
        </button>

        <button
          onClick={toggleRoofVisibility}
          title="Toggle Roof"
          className={`flex h-8 w-8 items-center justify-center rounded-lg border text-xs transition-all ${
            model.building.roof?.visible
              ? 'border-[#00F0FF]/50 bg-[#00F0FF]/15 text-[#00F0FF]'
              : 'border-[#1F2942] bg-[#0A0D14]/80 text-[#94A3B8] hover:text-[#F1F5F9]'
          }`}
        >
          <Box className="h-4 w-4" />
        </button>
      </div>

      {/* Bottom Architectural Spec Strip */}
      <div className="absolute bottom-3 inset-x-3 flex items-center justify-between rounded-xl border border-[#1F2942]/80 bg-[#0A0D14]/85 px-3 py-2 backdrop-blur-md text-[11px] font-mono">
        <div className="flex items-center gap-3 text-[#CBD5E1]">
          <span className="font-bold text-[#00F0FF]">{model.name}</span>
          <span className="text-[#64748B]">|</span>
          <span>{activeFloor.walls.length} Walls</span>
          <span className="text-[#64748B]">|</span>
          <span>{activeFloor.rooms.length} Rooms</span>
        </div>
        <div className="text-[#94A3B8] hidden sm:block">
          Height: <span className="text-[#F1F5F9]">{activeFloor.height}m</span>
        </div>
      </div>
    </div>
  );
};
