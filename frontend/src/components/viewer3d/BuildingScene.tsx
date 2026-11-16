import React, { useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, ContactShadows, SoftShadows } from '@react-three/drei';
import * as THREE from 'three';
import { useFloorPlanStore } from '../../store/useFloorPlanStore';
import { ParametricWallMesh } from './ParametricWallMesh';
import { RoomFloorMesh } from './RoomFloorMesh';
import { ParametricDoorMesh } from './ParametricDoorMesh';
import { ParametricWindowMesh } from './ParametricWindowMesh';
import { ParametricStairMesh } from './ParametricStairMesh';
import { ParametricColumnMesh } from './ParametricColumnMesh';
import { ParametricRoofMesh } from './ParametricRoofMesh';
import { SiteGroundMesh } from './SiteGroundMesh';
import { FirstPersonWalkthrough } from './FirstPersonWalkthrough';
import { LightingEnvironment } from './LightingEnvironment';
import { ViewerControls } from './ViewerControls';
import { ParametricFurnitureMesh } from '../furniture/ParametricFurnitureMesh';
import { WalkthroughMinimap } from './WalkthroughMinimap';
import { WalkthroughTourBar } from './WalkthroughTourBar';

export const BuildingScene: React.FC = () => {
  const {
    model,
    isDollhouseView,
    isFirstPerson,
    setSelectedEntity,
    activeFloorIndex,
    walkthroughEyeHeight,
    walkthroughSpeed,
    toggleFirstPerson
  } = useFloorPlanStore();
  const controlsRef = useRef<any>(null);

  const activeFloor = model.floors[activeFloorIndex] || model.floors[0] || {
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

  const topFloor = model.floors[model.floors.length - 1];

  const handleSetCameraView = (view: 'top' | 'iso' | 'front') => {
    if (!controlsRef.current) return;
    const controls = controlsRef.current;

    // Centroid of building
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

    controls.target.set(cx, activeFloor.elevation, cz);

    if (view === 'top') {
      controls.object.position.set(cx, activeFloor.elevation + 24, cz + 0.01);
    } else if (view === 'iso') {
      controls.object.position.set(cx + 14, activeFloor.elevation + 15, cz + 14);
    } else if (view === 'front') {
      controls.object.position.set(cx, activeFloor.elevation + 4, cz + 18);
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

      {/* Main 3D WebGL Canvas with ACES Filmic Tone Mapping */}
      <Canvas
        shadows
        gl={{
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.15
        }}
        camera={{ position: [14, 12, 14], fov: 42 }}
        onPointerMissed={handlePointerMissed}
        className="h-full w-full"
      >
        {/* Real-time Soft Shadow Penumbra (D5 / Ray-tracing grade) */}
        <SoftShadows size={14} samples={16} focus={0.5} />
        <LightingEnvironment />

        {/* Orbit Controls (Disabled when Walkthrough is active) */}
        {!isFirstPerson ? (
          <OrbitControls
            ref={controlsRef}
            makeDefault
            enableDamping
            dampingFactor={0.08}
            minDistance={2}
            maxDistance={80}
            maxPolarAngle={Math.PI / 2 - 0.02}
          />
        ) : (
          <FirstPersonWalkthrough
            walls={activeFloor.walls || []}
            eyeHeight={activeFloor.elevation + walkthroughEyeHeight}
            speed={walkthroughSpeed}
          />
        )}

        {/* Site & Plot Geometry */}
        <SiteGroundMesh site={model.building.site} />

        {/* Architectural 3D Elements across all floors */}
        {model.floors.map((fl) => (
          <group key={fl.id} position={[0, fl.elevation, 0]}>
            {/* Rooms Floor Slab */}
            {(fl.rooms || []).map((room) => (
              <RoomFloorMesh key={room.id} room={room} />
            ))}

            {/* Walls */}
            {(fl.walls || []).map((wall) => (
              <ParametricWallMesh
                key={wall.id}
                wall={wall}
                doors={fl.doors || []}
                windows={fl.windows || []}
                isDollhouse={isDollhouseView}
              />
            ))}

            {/* Doors */}
            {(fl.doors || []).map((door) => (
              <ParametricDoorMesh key={door.id} door={door} />
            ))}

            {/* Windows */}
            {(fl.windows || []).map((win) => (
              <ParametricWindowMesh key={win.id} window={win} />
            ))}

            {/* Stairs */}
            {(fl.stairs || []).map((stair) => (
              <ParametricStairMesh key={stair.id} stair={stair} />
            ))}

            {/* Columns */}
            {(fl.columns || []).map((col) => (
              <ParametricColumnMesh key={col.id} column={col} />
            ))}

            {/* Furniture */}
            {(fl.furniture || []).map((item) => (
              <ParametricFurnitureMesh key={item.id} item={item} />
            ))}
          </group>
        ))}

        {/* Parametric Roof on top floor */}
        {model.building.roof && topFloor && (
          <ParametricRoofMesh roof={model.building.roof} topFloor={topFloor} />
        )}

        {/* Subtle Contact Ambient Occlusion Shadows */}
        <ContactShadows
          position={[5, -0.01, 4]}
          opacity={0.45}
          scale={30}
          blur={1.8}
          far={15}
        />
      </Canvas>

      {/* 3D Mode HUD Indicator */}
      <div className="absolute bottom-4 left-4 z-20 flex items-center gap-2 rounded-lg border border-[#1F2942] bg-[#111726]/90 px-3 py-1.5 text-xs text-[#94A3B8] backdrop-blur-md font-mono">
        <span className="flex h-2 w-2 rounded-full bg-[#10B981] animate-pulse" />
        <span className="text-[#F1F5F9]">2builders 3D Engine</span>
        <span>•</span>
        <span>{model.floors.length} Levels</span>
        <span>•</span>
        <span>{activeFloor.walls.length} Walls</span>
        {isDollhouseView && (
          <span className="rounded bg-[#00F0FF]/10 px-1.5 py-0.5 text-[#00F0FF]">Dollhouse</span>
        )}
        {model.building.roof?.visible && (
          <span className="rounded bg-[#10B981]/10 px-1.5 py-0.5 text-[#10B981]">Roof ON</span>
        )}
      </div>

      {/* Walkthrough Instructions Overlay */}
      {isFirstPerson && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-3 rounded-xl border border-[#00F0FF]/40 bg-[#0A0D14]/90 px-4 py-2 text-xs backdrop-blur-md shadow-2xl">
          <span className="flex h-2 w-2 rounded-full bg-[#00F0FF] animate-ping" />
          <span className="font-bold text-[#00F0FF]">First-Person Walkthrough</span>
          <span className="text-[#94A3B8]">Use <strong className="text-[#F1F5F9]">W A S D</strong> or arrows to walk • Drag mouse to look • Wall collision active</span>
          <button
            onClick={toggleFirstPerson}
            className="rounded-lg bg-[#1F2942] px-2.5 py-1 text-[11px] font-bold text-[#F1F5F9] hover:bg-[#00F0FF] hover:text-[#0A0D14] transition-colors"
          >
            Exit (ESC)
          </button>
        </div>
      )}

      {/* Interactive Architectural Minimap HUD (PadSpan style with radar vision cone & room presence) */}
      <WalkthroughMinimap />

      {/* Guided Tour & Room Jump Controller (Planova style) */}
      <WalkthroughTourBar />
    </div>
  );
};
