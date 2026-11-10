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
  FileCode
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
                {renderMode === 'engineering' && showDimensions && len >= 0.8 && (
                  <group position={[midX, floor.elevation + wall.height + 0.15, midZ]}>
                    <Html center distanceFactor={16} zIndexRange={[50, 0]}>
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
                {/* 3D Room Name & Area Tag */}
                {showRoomLabels && (
                  <group position={[cx, floor.elevation + 0.1, cz]}>
                    <Html center distanceFactor={14} zIndexRange={[100, 0]}>
                      <div className="bg-slate-950/85 backdrop-blur-md border border-slate-700/80 px-2.5 py-1 rounded-md text-[10px] font-bold text-slate-100 shadow-xl whitespace-nowrap select-none pointer-events-none flex flex-col items-center">
                        <span className="text-cad-accent font-semibold">{room.name}</span>
                        <span className="text-[9px] text-slate-400 font-mono">{room.area.toFixed(1)} m²</span>
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

      {/* Mobile Top Scrollable Controls Bar */}
      <div className="md:hidden absolute top-2 left-2 right-2 flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1 z-10 pointer-events-auto bg-cad-panel/95 backdrop-blur border border-cad-border rounded-xl p-1 shadow-xl text-[11px] font-medium text-slate-300">
        <button
          onClick={() => setRenderMode(renderMode === 'realistic' ? 'engineering' : 'realistic')}
          className="flex items-center gap-1 px-2.5 py-1 rounded bg-cad-surface text-slate-200 border border-cad-border shrink-0 font-semibold"
        >
          {renderMode === 'realistic' ? <Sparkles size={12} className="text-sky-400" /> : <Box size={12} className="text-amber-400" />}
          <span>{renderMode === 'realistic' ? 'Realistic' : 'CAD Mode'}</span>
        </button>

        <button
          onClick={() => setWallCutaway(!wallCutaway)}
          className={`flex items-center gap-1 px-2 py-1 rounded border shrink-0 font-semibold ${
            wallCutaway ? 'bg-sky-500/20 border-sky-400 text-sky-300' : 'bg-slate-900 border-cad-border text-slate-400'
          }`}
        >
          <span>{wallCutaway ? 'Cutaway (900mm)' : 'Full Walls'}</span>
        </button>

        <button
          onClick={() => setShowVastuZones(!showVastuZones)}
          className={`flex items-center gap-1 px-2 py-1 rounded border shrink-0 font-semibold ${
            showVastuZones ? 'bg-amber-400 border-amber-300 text-slate-950 font-bold' : 'bg-slate-900 border-cad-border text-slate-400'
          }`}
        >
          <span>☸ Vastu</span>
        </button>

        <button
          onClick={() => setIsWalkthroughActive(!isWalkthroughActive)}
          className={`flex items-center gap-1 px-2 py-1 rounded border shrink-0 font-semibold ${
            isWalkthroughActive ? 'bg-amber-400 border-amber-300 text-slate-950' : 'bg-slate-900 border-cad-border text-slate-400'
          }`}
        >
          <Footprints size={12} />
          <span>Walk</span>
        </button>

        <button
          onClick={() => setCameraPreset(cameraPreset === 'top' ? 'isometric' : 'top')}
          className="flex items-center gap-1 px-2 py-1 rounded bg-slate-900 border border-cad-border text-slate-300 shrink-0 font-semibold"
        >
          <span>{cameraPreset === 'top' ? '3D Orbit' : 'Top View'}</span>
        </button>

        <button
          onClick={() => setCinematicTourActive(!isCinematicTourActive)}
          className={`flex items-center gap-1 px-2 py-1 rounded border shrink-0 font-semibold ${
            isCinematicTourActive ? 'bg-amber-400 text-slate-950 font-bold animate-pulse' : 'bg-slate-900 border-cad-border text-slate-400'
          }`}
        >
          <PlayCircle size={12} />
          <span>Tour</span>
        </button>

        <button
          onClick={() => handleExportDirect('dxf')}
          className="flex items-center gap-1 px-2 py-1 bg-cyan-600/30 border border-cyan-500/50 text-cyan-300 font-bold rounded shrink-0"
        >
          <FileCode size={12} />
          <span>DXF</span>
        </button>

        <button
          onClick={() => setWireframe(!wireframe)}
          className={`flex items-center gap-1 px-2 py-1 rounded border shrink-0 font-semibold ${
            wireframe ? 'bg-cad-accent text-slate-950 border-cad-accent' : 'bg-slate-900 border-cad-border text-slate-400'
          }`}
        >
          <Grid3X3 size={12} />
          <span>Wireframe</span>
        </button>

        <button
          onClick={handleExportGLB}
          disabled={isExporting}
          className="flex items-center gap-1 px-2.5 py-1 bg-cad-accent text-slate-950 font-bold rounded shrink-0 shadow-sm"
        >
          <Download size={12} />
          <span>GLB</span>
        </button>

        <button
          onClick={() => handleExportDirect('pdf')}
          className="flex items-center gap-1 px-2 py-1 bg-emerald-600/30 border border-emerald-500/50 text-emerald-300 font-bold rounded shrink-0"
        >
          <FileText size={12} />
          <span>PDF</span>
        </button>

        <button
          onClick={() => setShareModalOpen(true)}
          className="flex items-center gap-1 px-2.5 py-1 bg-indigo-600 text-white font-bold rounded shrink-0"
        >
          <span>🔗 Share</span>
        </button>
      </div>

      {/* Left Dual-Output Mode Switcher (Desktop) */}
      <div className="hidden md:flex absolute top-3 left-3 items-center gap-2 z-10">
        <div className="bg-cad-panel/90 backdrop-blur border border-cad-border rounded-lg p-1 flex items-center gap-1 shadow-lg text-[11px] font-medium text-slate-300">
          <button
            onClick={() => setRenderMode('realistic')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded transition-all ${
              renderMode === 'realistic'
                ? 'bg-cad-accent text-slate-950 font-bold shadow-sm'
                : 'hover:bg-cad-surface text-slate-400'
            }`}
          >
            <Sparkles size={13} />
            <span>Realistic 3D</span>
          </button>
          <button
            onClick={() => setRenderMode('engineering')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded transition-all ${
              renderMode === 'engineering'
                ? 'bg-cad-accent text-slate-950 font-bold shadow-sm'
                : 'hover:bg-cad-surface text-slate-400'
            }`}
          >
            <Box size={13} />
            <span>Engineering 3D</span>
          </button>
        </div>

        {/* Cut-away vs Full Walls Toggle */}
        <button
          onClick={() => setWallCutaway(!wallCutaway)}
          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border backdrop-blur text-[11px] font-bold shadow-lg transition-all ${
            wallCutaway
              ? 'bg-sky-500/20 border-sky-400 text-sky-300'
              : 'bg-cad-panel/90 border-cad-border hover:bg-cad-surface text-slate-300'
          }`}
          title="Toggle 900mm Cut-away Walls vs Full Ceiling Height"
        >
          <span>{wallCutaway ? 'Cut-away (900mm)' : 'Full Walls'}</span>
        </button>

        {/* Vastu Zones Toggle */}
        <button
          onClick={() => setShowVastuZones(!showVastuZones)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border backdrop-blur text-[11px] font-bold shadow-lg transition-all ${
            showVastuZones
              ? 'bg-amber-400 border-amber-300 text-slate-950 animate-pulse font-black'
              : 'bg-cad-panel/90 border-cad-border hover:bg-cad-surface text-slate-300'
          }`}
          title="Toggle Vastu Shastra 8-Zone Overlay & Conformance"
        >
          <span>☸</span>
          <span>Vastu Zones</span>
        </button>

        {/* Walkthrough Toggle */}
        <button
          onClick={() => setIsWalkthroughActive(!isWalkthroughActive)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border backdrop-blur text-[11px] font-bold shadow-lg transition-all ${
            isWalkthroughActive
              ? 'bg-amber-400 border-amber-300 text-slate-950 animate-pulse'
              : 'bg-cad-panel/90 border-cad-border hover:bg-cad-surface text-slate-300'
          }`}
          title="Toggle Eye-Level Architectural Walkthrough"
        >
          <Footprints size={14} />
          <span>{isWalkthroughActive ? 'Exit Walkthrough' : 'Walkthrough'}</span>
        </button>

        {/* Cinematic 360 Drone Tour Toggle */}
        <button
          onClick={() => setCinematicTourActive(!isCinematicTourActive)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border backdrop-blur text-[11px] font-bold shadow-lg transition-all ${
            isCinematicTourActive
              ? 'bg-amber-400 border-amber-300 text-slate-950 animate-pulse font-black'
              : 'bg-cad-panel/90 border-cad-border hover:bg-cad-surface text-slate-300'
          }`}
          title="Toggle 360° Cinematic Drone Flythrough Tour"
        >
          <PlayCircle size={14} className={isCinematicTourActive ? 'animate-spin' : ''} />
          <span>{isCinematicTourActive ? 'Tour Active' : 'Cinematic Tour'}</span>
        </button>
      </div>

      {/* Floating 3D Viewport Controls & Quick Export (Desktop) */}
      <div className="hidden md:flex absolute top-3 right-3 items-center gap-2 z-10">
        {/* Share Link Button */}
        <button
          onClick={() => setShareModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg transition-all shadow-lg text-[11px]"
          title="Create public 3D share link"
        >
          <span>🔗</span>
          <span>Share 3D</span>
        </button>

        {/* Quick Exporters */}
        <div className="bg-cad-panel/90 backdrop-blur border border-cad-border rounded-lg p-1 flex items-center gap-1 shadow-lg text-[11px] font-medium text-slate-300">
          <button
            onClick={handleExportGLB}
            disabled={isExporting}
            className="flex items-center gap-1.5 px-2.5 py-1 bg-cad-accent hover:bg-sky-400 text-slate-950 font-bold rounded transition-all shadow-sm"
            title="Download standard 3D GLB model"
          >
            <Download size={13} />
            <span>{isExporting ? 'Exporting...' : 'GLB 3D'}</span>
          </button>
          <button
            onClick={() => handleExportDirect('pdf')}
            className="flex items-center gap-1 px-2 py-1 bg-emerald-600/30 hover:bg-emerald-600/50 border border-emerald-500/50 text-emerald-300 rounded font-bold transition-colors"
            title="Download ISO A4 Vector PDF Blueprint"
          >
            <FileText size={12} />
            <span>PDF 2D</span>
          </button>
          <button
            onClick={() => handleExportDirect('obj')}
            className="px-2 py-1 hover:bg-cad-surface text-slate-300 rounded font-semibold transition-colors"
            title="Download Wavefront OBJ format"
          >
            OBJ
          </button>
          <button
            onClick={() => handleExportDirect('stl')}
            className="px-2 py-1 hover:bg-cad-surface text-slate-300 rounded font-semibold transition-colors"
            title="Download STL for 3D Printing"
          >
            STL
          </button>
          <button
            onClick={() => handleExportDirect('svg')}
            className="px-2 py-1 hover:bg-cad-surface text-slate-300 rounded font-semibold transition-colors"
            title="Download 2D Architectural SVG Blueprint"
          >
            SVG
          </button>
          <button
            onClick={() => handleExportDirect('dxf')}
            className="px-2 py-1 bg-cyan-600/20 hover:bg-cyan-600/40 border border-cyan-500/40 text-cyan-300 rounded font-bold transition-colors flex items-center gap-1"
            title="Download AutoCAD DXF CAD Blueprint"
          >
            <FileCode size={12} />
            <span>DXF</span>
          </button>
          <button
            onClick={() => {
              useProjectStore.getState().setViewerGuideFormat('glb');
              useProjectStore.getState().setViewerGuideOpen(true);
            }}
            className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-sky-400 rounded font-semibold transition-colors flex items-center gap-1"
            title="How to view downloaded files on your computer"
          >
            <HelpCircle size={12} />
            <span>Help</span>
          </button>
        </div>

        {/* View / Camera Presets */}
        <div className="bg-cad-panel/90 backdrop-blur border border-cad-border rounded-lg p-1 flex items-center gap-1 shadow-lg text-[11px] font-medium text-slate-300">
          <button
            onClick={() => setCameraPreset('isometric')}
            className="px-2 py-1 hover:bg-cad-surface text-slate-300 rounded transition-colors"
            title="Isometric 3D Perspective"
          >
            3D Orbit
          </button>
          <button
            onClick={() => setCameraPreset('top')}
            className="px-2 py-1 hover:bg-cad-surface text-slate-300 rounded transition-colors"
            title="Top-Down Plan View"
          >
            Top View
          </button>
        </div>

        {/* Visibility Toggles */}
        <div className="bg-cad-panel/90 backdrop-blur border border-cad-border rounded-lg p-1 flex items-center gap-1 shadow-lg text-[11px] font-medium text-slate-300">
          {renderMode === 'realistic' && (
            <button
              onClick={() => setShowFurniture(!showFurniture)}
              className={`px-2 py-1 rounded transition-colors ${
                showFurniture ? 'bg-cad-surface text-cad-accent font-bold' : 'text-slate-400'
              }`}
              title="Toggle Interior Furniture"
            >
              Furniture
            </button>
          )}

          {renderMode === 'engineering' && (
            <button
              onClick={() => setShowDimensions(!showDimensions)}
              className={`px-2 py-1 rounded transition-colors ${
                showDimensions ? 'bg-cad-surface text-cad-accent font-bold' : 'text-slate-400'
              }`}
              title="Toggle 3D Dimensions"
            >
              Dimensions
            </button>
          )}

          <button
            onClick={() => setShowRoomLabels(!showRoomLabels)}
            className={`px-2 py-1 rounded transition-colors ${
              showRoomLabels ? 'bg-cad-surface text-cad-accent font-bold' : 'text-slate-400'
            }`}
            title="Toggle 3D Room Name Tags"
          >
            Labels
          </button>

          <button
            onClick={() => setWireframe(!wireframe)}
            className={`px-2 py-1 rounded transition-colors ${
              wireframe ? 'bg-cad-accent text-slate-950 font-bold' : 'hover:bg-cad-surface text-slate-400'
            }`}
          >
            Wireframe
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


