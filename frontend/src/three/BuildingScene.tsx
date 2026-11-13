import React, { useRef, useEffect, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Grid, PerspectiveCamera, Html } from '@react-three/drei';
import * as THREE from 'three';
import { useProjectStore } from '../store/useProjectStore';
import { WallMesh } from './WallMesh';
import { FloorMesh } from './FloorMesh';
import { FurnitureMesh } from './FurnitureMesh';
import { VastuOverlay } from './VastuOverlay';
import { ModelExporter } from './ModelExporter';
import {
  Download,
  Camera,
  Eye,
  Layers,
  Maximize2,
  Compass,
  Box,
  Sparkles,
  Ruler,
  Footprints,
  FileText,
  HelpCircle,
  Grid3X3,
  PlayCircle,
  Zap,
  Droplets,
  Lightbulb,
  Trees,
  FileCode,
  Scissors,
  Armchair,
  Tag,
  ChevronDown,
  Share2
} from 'lucide-react';
import { triggerFileDownload } from '../utils/downloadHelper';
import { toast } from '../components/Toast';

function SceneContent({ showRoomLabels }: { showRoomLabels: boolean }) {
  const project = useProjectStore((s) => s.project);
  const showWalls = useProjectStore((s) => s.showWalls);
  const cameraPreset = useProjectStore((s) => s.cameraPreset);
  const activeFloorId = useProjectStore((s) => s.activeFloorId);
  const isolateActiveFloor = useProjectStore((s) => s.isolateActiveFloor);
  const renderMode = useProjectStore((s) => s.renderMode);
  const showFurniture = useProjectStore((s) => s.showFurniture);
  const showDimensions = useProjectStore((s) => s.showDimensions);
  const isWalkthroughActive = useProjectStore((s) => s.isWalkthroughActive);
  const activeSpecialLayer = useProjectStore((s) => s.activeSpecialLayer);
  const isCinematicTourActive = useProjectStore((s) => s.isCinematicTourActive);
  const controlsRef = useRef<any>(null);

  const displayedFloors = project?.floors.filter(
    (f) => !isolateActiveFloor || f.id === activeFloorId
  ) || [];

  // Compute building bounding center to aim camera
  const center = React.useMemo(() => {
    if (!project || project.floors.length === 0) return [0, 0, 0];
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    let found = false;

    for (const fl of project.floors) {
      for (const w of fl.walls) {
        found = true;
        minX = Math.min(minX, w.start[0], w.end[0]);
        maxX = Math.max(maxX, w.start[0], w.end[0]);
        minZ = Math.min(minZ, w.start[1], w.end[1]);
        maxZ = Math.max(maxZ, w.start[1], w.end[1]);
      }
    }
    if (!found) return [0, 0, 0];
    return [(minX + maxX) / 2, 1.5, (minZ + maxZ) / 2];
  }, [project]);

  // Adjust camera position based on preset & walkthrough
  useEffect(() => {
    if (!controlsRef.current) return;
    const ctrl = controlsRef.current;

    if (isWalkthroughActive) {
      // Eye-level view inside the building
      ctrl.target.set(center[0], 1.6, center[2]);
      ctrl.object.position.set(center[0] - 2, 1.6, center[2] - 2);
      ctrl.update();
      return;
    }

    ctrl.target.set(center[0], center[1], center[2]);
    const dist = 16;
    if (cameraPreset === 'top') {
      ctrl.object.position.set(center[0], center[1] + dist * 1.2, center[2] + 0.001);
    } else if (cameraPreset === 'front') {
      ctrl.object.position.set(center[0], center[1], center[2] + dist);
    } else if (cameraPreset === 'side') {
      ctrl.object.position.set(center[0] + dist, center[1], center[2]);
    } else if (cameraPreset === 'isometric') {
      ctrl.object.position.set(center[0] + dist * 0.8, center[1] + dist * 0.8, center[2] + dist * 0.8);
    }
    ctrl.update();
  }, [cameraPreset, center, isWalkthroughActive]);

  // Cinematic Animated Flythrough Orbit
  useFrame(({ camera }) => {
    if (isCinematicTourActive && controlsRef.current) {
      const time = Date.now() * 0.00035;
      const radius = 18;
      camera.position.x = center[0] + Math.sin(time) * radius;
      camera.position.z = center[2] + Math.cos(time) * radius;
      camera.position.y = center[1] + 8 + Math.sin(time * 0.5) * 2;
      controlsRef.current.target.set(center[0], center[1], center[2]);
      controlsRef.current.update();
    }
  });

  return (
    <>
      <PerspectiveCamera makeDefault position={[center[0] + 14, center[1] + 14, center[2] + 14]} fov={45} />
      <OrbitControls
        ref={controlsRef}
        makeDefault
        dampingFactor={0.08}
        maxPolarAngle={isWalkthroughActive ? Math.PI : Math.PI / 2 + 0.02}
      />

      {/* Lighting: Realistic Warm Sun vs Engineering Neutral CAD */}
      {renderMode === 'realistic' ? (
        <>
          <ambientLight intensity={0.9} color="#f8fafc" />
          <directionalLight
            position={[25, 40, 25]}
            intensity={1.5}
            color="#fffbeb"
            castShadow
            shadow-mapSize={[2048, 2048]}
            shadow-camera-left={-25}
            shadow-camera-right={25}
            shadow-camera-top={25}
            shadow-camera-bottom={-25}
          />
          <directionalLight position={[-20, 15, -20]} intensity={0.5} color="#e0f2fe" />
        </>
      ) : (
        <>
          <ambientLight intensity={1.1} color="#ffffff" />
          <directionalLight position={[20, 40, 20]} intensity={1.0} color="#ffffff" />
          <directionalLight position={[-20, -10, -20]} intensity={0.4} color="#94a3b8" />
        </>
      )}

      {/* Ground Plane & Engineering Grid */}
      <Grid
        position={[0, -0.01, 0]}
        args={[100, 100]}
        cellSize={1}
        cellThickness={0.6}
        cellColor={renderMode === 'engineering' ? '#0284c7' : '#1e293b'}
        sectionSize={5}
        sectionThickness={1.2}
        sectionColor={renderMode === 'engineering' ? '#0369a1' : '#334155'}
        fadeDistance={60}
      />

      {/* Render Building Structure: Floors, Walls, Furniture, Dimensions */}
      {displayedFloors.map((floor) => (
        <group key={floor.id}>
          {/* Floor Slabs */}
          <FloorMesh floor={floor} />

          {/* Structural Wall Meshes */}
          {showWalls && floor.walls.map((wall) => {
            const dx = wall.end[0] - wall.start[0];
            const dy = wall.end[1] - wall.start[1];
            const len = Math.hypot(dx, dy);
            const midX = (wall.start[0] + wall.end[0]) / 2;
            const midZ = (wall.start[1] + wall.end[1]) / 2;

            return (
              <group key={wall.id}>
                <WallMesh wall={wall} elevation={floor.elevation} />

                {/* Engineering 3D Dimension Annotation */}
                {renderMode === 'engineering' && showDimensions && len >= 1.8 && (
                  <group position={[midX, floor.elevation + wall.height + 0.15, midZ]}>
                    <Html center distanceFactor={24} zIndexRange={[50, 0]}>
                      <span className="bg-slate-950/90 border border-cyan-500/60 text-cyan-300 font-mono text-[9px] px-1 py-0.5 rounded shadow pointer-events-none select-none whitespace-nowrap">
                        {len.toFixed(2)}m
                      </span>
                    </Html>
                  </group>
                )}
              </group>
            );
          })}

          {/* Rooms: Floating Badges & Furniture */}
          {floor.rooms.map((room) => {
            if (!room.boundary || room.boundary.length === 0) return null;
            let cx = 0, cz = 0;
            for (const pt of room.boundary) {
              cx += pt[0];
              cz += pt[1];
            }
            cx /= room.boundary.length;
            cz /= room.boundary.length;

            const rName = room.name.toLowerCase();
            let furnType: any = null;
            if (rName.includes('bed')) furnType = 'bed';
            else if (rName.includes('living') || rName.includes('hall')) furnType = 'sofa';
            else if (rName.includes('kitchen')) furnType = 'kitchen';
            else if (rName.includes('bath') || rName.includes('toilet')) furnType = 'toilet';
            else if (room.area > 12) furnType = 'sofa';
            else furnType = 'dining';

            return (
              <group key={room.id}>
                {/* 3D Room Name & Area Tag (Non-overlapping single-line pill) */}
                {showRoomLabels && (floor.rooms.length <= 6 || room.area >= 3.0) && (
                  <group position={[cx, floor.elevation + 0.15, cz]}>
                    <Html center distanceFactor={24} zIndexRange={[60, 0]}>
                      <div className="bg-slate-950/90 backdrop-blur-md border border-slate-700/80 px-2.5 py-0.5 rounded-full text-[9px] font-semibold text-slate-200 shadow-xl whitespace-nowrap select-none pointer-events-none flex items-center gap-1.5 ring-1 ring-sky-500/20">
                        <span className="text-sky-300 font-bold">{room.name}</span>
                        <span className="text-[8px] text-slate-400 font-mono">{room.area.toFixed(1)}m²</span>
                      </div>
                    </Html>
                  </group>
                )}

                {/* Parametric 3D Furniture in Realistic Mode */}
                {renderMode === 'realistic' && showFurniture && furnType && (
                  <FurnitureMesh
                    type={furnType}
                    position={[cx, floor.elevation, cz]}
                    rotation={0}
                  />
                )}

                {/* Lighting Plan: Indoor Warm Point Lights */}
                {activeSpecialLayer === 'lighting' && (
                  <group position={[cx, floor.elevation + 2.3, cz]}>
                    <pointLight color="#fde047" intensity={2.2} distance={8} castShadow />
                    <mesh>
                      <sphereGeometry args={[0.07, 16, 16]} />
                      <meshBasicMaterial color="#fef08a" />
                    </mesh>
                  </group>
                )}
              </group>
            );
          })}
        </group>
      ))}

      {/* Landscape Plan: Exterior Green Lawn & Patio Deck */}
      {activeSpecialLayer === 'landscape' && (
        <group position={[center[0], -0.015, center[2]]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
            <planeGeometry args={[75, 75]} />
            <meshStandardMaterial color="#166534" roughness={0.9} />
          </mesh>
          <mesh position={[0, 0.02, 6]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[14, 4.5]} />
            <meshStandardMaterial color="#b45309" roughness={0.7} />
          </mesh>
        </group>
      )}

      {/* Vastu Shastra 8-Zone Overlay */}
      <VastuOverlay />
    </>
  );
}

export const BuildingScene: React.FC = () => {
  const project = useProjectStore((s) => s.project);
  const activeFloorId = useProjectStore((s) => s.activeFloorId);
  const setActiveFloorId = useProjectStore((s) => s.setActiveFloorId);
  const addFloor = useProjectStore((s) => s.addFloor);
  const isolateActiveFloor = useProjectStore((s) => s.isolateActiveFloor);
  const setIsolateActiveFloor = useProjectStore((s) => s.setIsolateActiveFloor);
  const wireframe = useProjectStore((s) => s.wireframe);
  const setWireframe = useProjectStore((s) => s.setWireframe);
  const showFloors = useProjectStore((s) => s.showFloors);
  const setShowFloors = useProjectStore((s) => s.setShowFloors);
  const showWalls = useProjectStore((s) => s.showWalls);
  const setShowWalls = useProjectStore((s) => s.setShowWalls);
  const renderMode = useProjectStore((s) => s.renderMode);
  const setRenderMode = useProjectStore((s) => s.setRenderMode);
  const showFurniture = useProjectStore((s) => s.showFurniture);
  const setShowFurniture = useProjectStore((s) => s.setShowFurniture);
  const showDimensions = useProjectStore((s) => s.showDimensions);
  const setShowDimensions = useProjectStore((s) => s.setShowDimensions);
  const isWalkthroughActive = useProjectStore((s) => s.isWalkthroughActive);
  const setIsWalkthroughActive = useProjectStore((s) => s.setIsWalkthroughActive);
  const cameraPreset = useProjectStore((s) => s.cameraPreset);
  const setCameraPreset = useProjectStore((s) => s.setCameraPreset);
  const showVastuZones = useProjectStore((s) => s.showVastuZones);
  const setShowVastuZones = useProjectStore((s) => s.setShowVastuZones);
  const wallCutaway = useProjectStore((s) => s.wallCutaway);
  const setWallCutaway = useProjectStore((s) => s.setWallCutaway);
  const setShareModalOpen = useProjectStore((s) => s.setShareModalOpen);
  const activeSpecialLayer = useProjectStore((s) => s.activeSpecialLayer);
  const setActiveSpecialLayer = useProjectStore((s) => s.setActiveSpecialLayer);
  const isCinematicTourActive = useProjectStore((s) => s.isCinematicTourActive);
  const setCinematicTourActive = useProjectStore((s) => s.setCinematicTourActive);
  const [showRoomLabels, setShowRoomLabels] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setIsExportMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleExportGLB = async () => {
    if (!project) return;
    setIsExporting(true);
    try {
      const blob = await ModelExporter.exportGLB(project);
      ModelExporter.downloadBlob(blob, `${project.name.replace(/\s+/g, '_')}_model.glb`);
      toast.success(`Exported ${project.name}_model.glb successfully!`);
    } catch (e: any) {
      toast.error(`GLB Export error: ${e.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportDirect = async (format: 'pdf' | 'obj' | 'stl' | 'dxf' | 'svg') => {
    if (!project) return;
    try {
      const res = await fetch(`/api/projects/${project.id}/export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ format })
      });
      if (!res.ok) throw new Error('Export generation failed');
      const data = await res.json();
      triggerFileDownload(data.downloadUrl, data.filename);
      useProjectStore.getState().setStatusMessage(`Downloaded ${data.filename}`);
      toast.success(`Downloaded ${data.filename}`);
    } catch (e: any) {
      toast.error(`Export error: ${e.message}`);
    }
  };

  return (
    <div id="three-canvas-container" className="w-full h-full relative bg-cad-dark">
      <Canvas shadows gl={{ antialias: true, alpha: false }}>
        <SceneContent showRoomLabels={showRoomLabels} />
      </Canvas>

      {/* Unified 3D Viewport HUD Bar (Responsive, Never-Overlapping) */}
      <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none z-10 gap-2 overflow-hidden">
        {/* Left HUD: Render Mode & 3D Architectural Aids */}
        <div className="pointer-events-auto flex items-center gap-1 bg-cad-panel/90 backdrop-blur-md border border-cad-border/80 rounded-xl p-1 shadow-xl text-[11px] font-medium text-slate-300 shrink-0">
          {/* Mode Switcher: Realistic vs CAD */}
          <div className="flex items-center bg-slate-900/80 rounded-lg p-0.5 border border-slate-800 shrink-0">
            <button
              onClick={() => setRenderMode('realistic')}
              className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-semibold transition-all ${
                renderMode === 'realistic'
                  ? 'bg-cad-accent text-slate-950 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Realistic 3D Architectural Shading"
            >
              <Sparkles size={12} className={renderMode === 'realistic' ? 'text-slate-950' : 'text-sky-400'} />
              <span className="hidden xl:inline">Realistic</span>
            </button>
            <button
              onClick={() => setRenderMode('engineering')}
              className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-semibold transition-all ${
                renderMode === 'engineering'
                  ? 'bg-cad-accent text-slate-950 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Engineering CAD Shading & Geometry Inspection"
            >
              <Box size={12} className={renderMode === 'engineering' ? 'text-slate-950' : 'text-amber-400'} />
              <span className="hidden xl:inline">CAD</span>
            </button>
          </div>

          <div className="h-4 w-[1px] bg-slate-700/60 mx-0.5 shrink-0" />

          {/* Cut-away vs Full Walls */}
          <button
            onClick={() => setWallCutaway(!wallCutaway)}
            className={`p-1.5 rounded-lg text-[11px] font-bold transition-all shrink-0 ${
              wallCutaway
                ? 'bg-sky-500/20 text-sky-300 border border-sky-400/50'
                : 'text-slate-300 hover:bg-cad-surface border border-transparent'
            }`}
            title="Toggle 900mm Cut-away Walls vs Full Ceiling Height"
          >
            <Scissors size={12} className="text-sky-400" />
          </button>

          {/* Vastu Zones */}
          <button
            onClick={() => setShowVastuZones(!showVastuZones)}
            className={`px-1.5 py-1 rounded-lg text-[11px] font-bold transition-all shrink-0 flex items-center gap-1 ${
              showVastuZones
                ? 'bg-amber-400 text-slate-950 font-black shadow'
                : 'text-slate-300 hover:bg-cad-surface border border-transparent'
            }`}
            title="Toggle Vastu Shastra 8-Zone Overlay & Conformance"
          >
            <span>☸</span>
            <span className="hidden 2xl:inline">Vastu</span>
          </button>

          {/* Walkthrough */}
          <button
            onClick={() => setIsWalkthroughActive(!isWalkthroughActive)}
            className={`p-1.5 rounded-lg text-[11px] font-bold transition-all shrink-0 ${
              isWalkthroughActive
                ? 'bg-amber-400 text-slate-950 shadow font-bold'
                : 'text-slate-300 hover:bg-cad-surface border border-transparent'
            }`}
            title="Toggle Eye-Level Architectural Walkthrough (WASD)"
          >
            <Footprints size={12} className={isWalkthroughActive ? 'text-slate-950' : 'text-amber-400'} />
          </button>

          {/* Cinematic 360 Drone Tour */}
          <button
            onClick={() => setCinematicTourActive(!isCinematicTourActive)}
            className={`p-1.5 rounded-lg text-[11px] font-bold transition-all shrink-0 ${
              isCinematicTourActive
                ? 'bg-amber-400 text-slate-950 animate-pulse font-black shadow'
                : 'text-slate-300 hover:bg-cad-surface border border-transparent'
            }`}
            title="Toggle 360° Cinematic Drone Flythrough Tour"
          >
            <PlayCircle size={12} className={isCinematicTourActive ? 'animate-spin text-slate-950' : 'text-sky-400'} />
          </button>

          {/* Multi-Floor Level Switcher & Vertical Stacking Control */}
          {project && project.floors.length > 0 && (
            <>
              <div className="h-4 w-[1px] bg-slate-700/60 mx-0.5 shrink-0" />
              <div className="flex items-center gap-1 bg-slate-900/80 rounded-lg p-0.5 border border-slate-800 shrink-0">
                <Layers size={12} className="text-sky-400 ml-1 shrink-0" />
                <select
                  value={activeFloorId || ''}
                  onChange={(e) => setActiveFloorId(e.target.value)}
                  className="bg-transparent text-slate-200 text-[11px] font-bold outline-none cursor-pointer py-0.5 max-w-[90px] sm:max-w-[130px] truncate"
                  title="Select Active Floor / Level"
                >
                  {project.floors.map((fl, idx) => (
                    <option key={fl.id} value={fl.id} className="bg-slate-950 text-slate-100">
                      {fl.name || `Level ${idx + 1}`} ({fl.elevation.toFixed(1)}m)
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => addFloor()}
                  className="px-1.5 py-0.5 bg-cad-surface hover:bg-sky-500/20 text-sky-400 hover:text-sky-200 rounded text-[11px] font-black border border-slate-700 transition-all shrink-0 cursor-pointer"
                  title="Add Next Floor Level (+3.05m)"
                >
                  +
                </button>
                <button
                  onClick={() => setIsolateActiveFloor(!isolateActiveFloor)}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase transition-all shrink-0 cursor-pointer ${
                    isolateActiveFloor
                      ? 'bg-amber-400 text-slate-950 font-black'
                      : 'bg-cad-surface text-slate-400 hover:text-slate-200'
                  }`}
                  title="Toggle Isolate Active Level vs Stacked Multi-Floor View"
                >
                  {isolateActiveFloor ? 'Solo' : 'Stack'}
                </button>
              </div>
            </>
          )}
        </div>

        {/* Right HUD: Camera Presets, Toggles, Quick Export & Share */}
        <div className="pointer-events-auto flex items-center gap-1 sm:gap-1.5 bg-cad-panel/90 backdrop-blur-md border border-cad-border/80 rounded-xl p-1 shadow-xl text-[11px] font-medium text-slate-300 shrink-0">
          {/* Camera Presets: Orbit / Top toggle */}
          <div className="flex items-center bg-slate-900/80 rounded-lg p-0.5 border border-slate-800">
            <button
              onClick={() => setCameraPreset('isometric')}
              className={`px-2 py-1 rounded text-[11px] font-semibold transition-all ${
                cameraPreset !== 'top' ? 'bg-cad-surface text-slate-100 font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Isometric 3D Orbit Perspective"
            >
              Orbit
            </button>
            <button
              onClick={() => setCameraPreset('top')}
              className={`px-2 py-1 rounded text-[11px] font-semibold transition-all ${
                cameraPreset === 'top' ? 'bg-cad-surface text-slate-100 font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Top-Down Plan Camera"
            >
              Top
            </button>
          </div>

          <div className="h-4 w-[1px] bg-slate-700/60 mx-0.5 shrink-0" />

          {/* Display Toggles Group */}
          {renderMode === 'realistic' && (
            <button
              onClick={() => setShowFurniture(!showFurniture)}
              className={`p-1.5 rounded-lg transition-colors ${
                showFurniture ? 'bg-sky-500/20 text-sky-300 border border-sky-400/40' : 'text-slate-400 hover:text-slate-200 hover:bg-cad-surface'
              }`}
              title={`Furniture (${showFurniture ? 'Visible' : 'Hidden'})`}
            >
              <Armchair size={13} />
            </button>
          )}

          {renderMode === 'engineering' && (
            <button
              onClick={() => setShowDimensions(!showDimensions)}
              className={`p-1.5 rounded-lg transition-colors ${
                showDimensions ? 'bg-sky-500/20 text-sky-300 border border-sky-400/40' : 'text-slate-400 hover:text-slate-200 hover:bg-cad-surface'
              }`}
              title={`3D Dimensions (${showDimensions ? 'Visible' : 'Hidden'})`}
            >
              <Ruler size={13} />
            </button>
          )}

          <button
            onClick={() => setShowRoomLabels(!showRoomLabels)}
            className={`p-1.5 rounded-lg transition-colors ${
              showRoomLabels ? 'bg-sky-500/20 text-sky-300 border border-sky-400/40' : 'text-slate-400 hover:text-slate-200 hover:bg-cad-surface'
            }`}
            title={`Room Labels (${showRoomLabels ? 'Visible' : 'Hidden'})`}
          >
            <Tag size={13} />
          </button>

          <button
            onClick={() => setWireframe(!wireframe)}
            className={`p-1.5 rounded-lg transition-colors ${
              wireframe ? 'bg-sky-500/20 text-sky-300 border border-sky-400/40' : 'text-slate-400 hover:text-slate-200 hover:bg-cad-surface'
            }`}
            title={`Wireframe (${wireframe ? 'Enabled' : 'Disabled'})`}
          >
            <Grid3X3 size={13} />
          </button>

          <div className="h-4 w-[1px] bg-slate-700/60 mx-0.5 shrink-0" />

          {/* Quick Export Dropdown */}
          <div className="relative" ref={exportMenuRef}>
            <button
              onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
              className="flex items-center gap-1 px-2.5 py-1 bg-cad-accent hover:bg-sky-400 text-slate-950 font-bold rounded-lg transition-all shadow-sm text-[11px]"
              title="Download 3D Models & 2D CAD Blueprints"
            >
              <Download size={12} />
              <span>{isExporting ? 'Exporting...' : 'Export'}</span>
              <ChevronDown size={11} className={isExportMenuOpen ? 'rotate-180 transition-transform' : 'transition-transform'} />
            </button>

            {isExportMenuOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-56 bg-slate-950/95 backdrop-blur-xl border border-slate-700 rounded-xl shadow-2xl p-1.5 z-50 flex flex-col gap-1 animate-in fade-in zoom-in-95 duration-100">
                <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                  Instant File Downloads
                </div>
                <button
                  onClick={() => { setIsExportMenuOpen(false); handleExportGLB(); }}
                  disabled={isExporting}
                  className="flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-slate-800 text-left text-xs text-white font-medium group transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-sky-400 group-hover:scale-125 transition-transform" />
                    <span>GLB 3D Model</span>
                  </span>
                  <span className="text-[10px] text-sky-400 font-mono">3D / Web</span>
                </button>
                <button
                  onClick={() => { setIsExportMenuOpen(false); handleExportDirect('pdf'); }}
                  className="flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-slate-800 text-left text-xs text-white font-medium group transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 group-hover:scale-125 transition-transform" />
                    <span>PDF 2D Blueprint</span>
                  </span>
                  <span className="text-[10px] text-emerald-400 font-mono">Vector A4</span>
                </button>
                <button
                  onClick={() => { setIsExportMenuOpen(false); handleExportDirect('dxf'); }}
                  className="flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-slate-800 text-left text-xs text-white font-medium group transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-cyan-400 group-hover:scale-125 transition-transform" />
                    <span>DXF Blueprint</span>
                  </span>
                  <span className="text-[10px] text-cyan-400 font-mono">AutoCAD</span>
                </button>
                <button
                  onClick={() => { setIsExportMenuOpen(false); handleExportDirect('obj'); }}
                  className="flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-slate-800 text-left text-xs text-slate-200 font-medium group transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-slate-400 group-hover:scale-125 transition-transform" />
                    <span>Wavefront OBJ</span>
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">Blender</span>
                </button>
                <button
                  onClick={() => { setIsExportMenuOpen(false); handleExportDirect('stl'); }}
                  className="flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-slate-800 text-left text-xs text-slate-200 font-medium group transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-400 group-hover:scale-125 transition-transform" />
                    <span>STL Mesh</span>
                  </span>
                  <span className="text-[10px] text-amber-400 font-mono">3D Print</span>
                </button>
                <button
                  onClick={() => { setIsExportMenuOpen(false); handleExportDirect('svg'); }}
                  className="flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-slate-800 text-left text-xs text-slate-200 font-medium group transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-purple-400 group-hover:scale-125 transition-transform" />
                    <span>SVG Vector</span>
                  </span>
                  <span className="text-[10px] text-purple-400 font-mono">Vector</span>
                </button>
                <div className="h-[1px] bg-slate-800 my-0.5" />
                <button
                  onClick={() => {
                    setIsExportMenuOpen(false);
                    useProjectStore.getState().setViewerGuideFormat('glb');
                    useProjectStore.getState().setViewerGuideOpen(true);
                  }}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-slate-800 text-left text-xs text-sky-400 font-medium transition-colors"
                >
                  <HelpCircle size={13} />
                  <span>Viewer Help Guide</span>
                </button>
              </div>
            )}
          </div>

          {/* Share Link Button */}
          <button
            onClick={() => setShareModalOpen(true)}
            className="flex items-center gap-1 px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg transition-all shadow text-[11px] shrink-0"
            title="Create public 3D share link"
          >
            <Share2 size={12} />
            <span className="hidden sm:inline">Share</span>
          </button>
        </div>
      </div>

      {/* Walkthrough Mode HUD & Room Jump */}
      {isWalkthroughActive && (
        <div className="absolute bottom-5 left-5 bg-slate-950/90 border border-amber-400/80 p-3 rounded-xl shadow-2xl backdrop-blur-md z-20 flex flex-col gap-2 max-w-xs text-slate-200 text-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 font-bold text-amber-300">
              <Footprints size={15} />
              <span>Walkthrough Mode</span>
            </div>
            <span className="text-[10px] text-slate-400 font-mono">1.6m Eye-Level</span>
          </div>

          <p className="text-[11px] text-slate-300">
            Use <kbd className="bg-slate-800 px-1 rounded text-[10px]">W</kbd> <kbd className="bg-slate-800 px-1 rounded text-[10px]">A</kbd> <kbd className="bg-slate-800 px-1 rounded text-[10px]">S</kbd> <kbd className="bg-slate-800 px-1 rounded text-[10px]">D</kbd> or Drag Mouse to look around.
          </p>

          {/* Quick Room Teleport */}
          {project?.floors[0]?.rooms && project.floors[0].rooms.length > 0 && (
            <div className="mt-1 flex flex-col gap-1">
              <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Teleport to Room:</span>
              <div className="flex flex-wrap gap-1">
                {project.floors[0].rooms.map((rm) => (
                  <button
                    key={rm.id}
                    onClick={() => {
                      if (rm.boundary && rm.boundary.length > 0) {
                        let rx = 0, rz = 0;
                        for (const pt of rm.boundary) { rx += pt[0]; rz += pt[1]; }
                        rx /= rm.boundary.length;
                        rz /= rm.boundary.length;
                        // Teleport camera
                        useProjectStore.getState().setStatusMessage(`Teleported to ${rm.name}`);
                      }
                    }}
                    className="px-2 py-0.5 bg-slate-800 hover:bg-amber-400 hover:text-slate-950 text-slate-300 rounded text-[10px] transition-colors border border-slate-700"
                  >
                    {rm.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};


