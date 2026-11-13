import React, { useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import { useFloorPlanStore } from '../../store/useFloorPlanStore';
import { ParametricWallMesh } from './ParametricWallMesh';
import { RoomFloorMesh } from './RoomFloorMesh';
import { ParametricDoorMesh } from './ParametricDoorMesh';
import { ParametricWindowMesh } from './ParametricWindowMesh';
import { LightingEnvironment } from './LightingEnvironment';
import { ViewerControls } from './ViewerControls';
import { ParametricFurnitureMesh } from '../furniture/ParametricFurnitureMesh';

export const BuildingScene: React.FC = () => {
  const { model, isDollhouseView, isFirstPerson, setSelectedEntity } = useFloorPlanStore();
  const controlsRef = useRef<any>(null);

  const floor = model.floors[0] || {
    walls: [],
    doors: [],
    windows: [],
    rooms: [],
    furniture: [],
  };

  const handleSetCameraView = (view: 'top' | 'iso' | 'front') => {
    if (!controlsRef.current) return;
    const controls = controlsRef.current;

    // Centroid of building
    let cx = 5, cz = 4;
    if (floor.walls.length > 0) {
      let sx = 0, sz = 0;
      floor.walls.forEach((w) => {
        sx += w.start.x + w.end.x;
        sz += w.start.z + w.end.z;
      });
      cx = sx / (floor.walls.length * 2);
      cz = sz / (floor.walls.length * 2);
    }

    controls.target.set(cx, 0, cz);

    if (view === 'top') {
      controls.object.position.set(cx, 22, cz + 0.01);
    } else if (view === 'iso') {
      controls.object.position.set(cx + 14, 15, cz + 14);
    } else if (view === 'front') {
      controls.object.position.set(cx, 4, cz + 18);
    }
    controls.update();
  };

  const handleResetCamera = () => {
    handleSetCameraView('iso');
  };

  const handlePointerMissed = () => {
    setSelectedEntity({ type: null, id: null });
  };

  return (
    <div className="relative h-full w-full select-none overflow-hidden bg-[#0A0D14]">
      {/* 3D Floating Action Controls */}
      <ViewerControls
        onSetCameraView={handleSetCameraView}
        onResetCamera={handleResetCamera}
      />

      {/* Main 3D WebGL Canvas */}
      <Canvas
        shadows
        camera={{ position: [14, 12, 14], fov: 42 }}
        onPointerMissed={handlePointerMissed}
        className="h-full w-full"
      >
        <LightingEnvironment />

        {/* Orbit Controls */}
        <OrbitControls
          ref={controlsRef}
          makeDefault
          enableDamping
          dampingFactor={0.08}
          minDistance={2}
          maxDistance={60}
          maxPolarAngle={Math.PI / 2 - 0.02}
        />

        {/* Architectural 3D Elements */}
        <group position={[0, 0, 0]}>
          {/* Floors */}
          {floor.rooms.map((room) => (
            <RoomFloorMesh key={room.id} room={room} />
          ))}

          {/* Walls */}
          {floor.walls.map((wall) => (
            <ParametricWallMesh
              key={wall.id}
              wall={wall}
              doors={floor.doors}
              windows={floor.windows}
              isDollhouse={isDollhouseView}
            />
          ))}

          {/* Doors */}
          {floor.doors.map((door) => (
            <ParametricDoorMesh key={door.id} door={door} />
          ))}

          {/* Windows */}
          {floor.windows.map((win) => (
            <ParametricWindowMesh key={win.id} window={win} />
          ))}

          {/* Furniture */}
          {floor.furniture.map((item) => (
            <ParametricFurnitureMesh key={item.id} item={item} />
          ))}
        </group>

        {/* Subtle Contact Ambient Occlusion Shadows */}
        <ContactShadows
          position={[5, 0, 4]}
          opacity={0.45}
          scale={25}
          blur={1.8}
          far={10}
        />
      </Canvas>

      {/* 3D Mode HUD Indicator */}
      <div className="absolute bottom-4 left-4 z-20 flex items-center gap-2 rounded-lg border border-[#1F2942] bg-[#111726]/90 px-3 py-1.5 text-xs text-[#94A3B8] backdrop-blur-md font-mono">
        <span className="flex h-2 w-2 rounded-full bg-[#10B981] animate-pulse" />
        <span className="text-[#F1F5F9]">Three.js 3D PBR Engine</span>
        <span>•</span>
        <span>{floor.walls.length} Walls</span>
        <span>•</span>
        <span>{floor.rooms.length} Rooms</span>
        {isDollhouseView && (
          <span className="rounded bg-[#00F0FF]/10 px-1.5 py-0.5 text-[#00F0FF]">Dollhouse</span>
        )}
      </div>
    </div>
  );
};
