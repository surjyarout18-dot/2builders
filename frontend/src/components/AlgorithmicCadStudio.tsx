import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  X,
  Cpu,
  Layers,
  Sparkles,
  Sliders,
  RefreshCw,
  Box,
  Download,
  ArrowRight,
  Eye,
  CheckCircle2,
  FileCode,
  ShieldAlert,
  Maximize2
} from 'lucide-react';
import { useProjectStore } from '../store/useProjectStore';
import { Project, Wall, Room, Opening } from '../types';
import { toast } from './Toast';

interface AlgorithmicCadStudioProps {
  onOpenEditor?: () => void;
}

interface RoomNode {
  name: string;
  type: string;
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  area: number;
}

export const AlgorithmicCadStudio: React.FC<AlgorithmicCadStudioProps> = ({ onOpenEditor }) => {
  const isCadStudioOpen = useProjectStore((s) => s.isCadStudioOpen);
  const setCadStudioOpen = useProjectStore((s) => s.setCadStudioOpen);
  const setProject = useProjectStore((s) => s.setProject);
  const setActiveFloorId = useProjectStore((s) => s.setActiveFloorId);

  // Studio tabs
  const [activeTab, setActiveTab] = useState<'parametric' | 'cv_filter'>('parametric');

  // Parametric Generator Controls
  const [roomCount, setRoomCount] = useState<number>(5);
  const [aspectRatio, setAspectRatio] = useState<'1:1' | '4:3' | '16:9' | '3:2'>('4:3');
  const [wallThicknessM, setWallThicknessM] = useState<number>(0.20);
  const [seed, setSeed] = useState<number>(42);
  const [stylePalette, setStylePalette] = useState<'modern' | 'minimal' | 'vastu'>('modern');

  // CV Filter Lab Controls
  const [thresholdMode, setThresholdMode] = useState<'otsu' | 'adaptive' | 'band_stacking'>('band_stacking');
  const [kernelSize, setKernelSize] = useState<number>(7);
  const [denoiseLevel, setDenoiseLevel] = useState<number>(3);
  const [showSkeleton, setShowSkeleton] = useState<boolean>(true);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Simple pseudo-random generator with seed
  const seededRandom = (s: number) => {
    const x = Math.sin(s) * 10000;
    return x - Math.floor(x);
  };

  // Generate deterministic architectural layout based on seed and roomCount
  const layoutData = useMemo(() => {
    let w = 12.0;
    let h = 9.0;
    if (aspectRatio === '1:1') { w = 10.0; h = 10.0; }
    else if (aspectRatio === '16:9') { w = 14.0; h = 8.0; }
    else if (aspectRatio === '3:2') { w = 12.0; h = 8.0; }

    const rooms: RoomNode[] = [];
    let currentSeed = seed;

    // Room archetype catalog
    const archetypes = [
      { name: 'Great Living Hall', type: 'living', color: 'rgba(56, 189, 248, 0.25)' },
      { name: 'Master Suite', type: 'bedroom', color: 'rgba(99, 102, 241, 0.25)' },
      { name: 'Chef Kitchen', type: 'kitchen', color: 'rgba(245, 158, 11, 0.25)' },
      { name: 'Dining Salon', type: 'dining', color: 'rgba(16, 185, 129, 0.25)' },
      { name: 'Primary Bath', type: 'bathroom', color: 'rgba(14, 165, 233, 0.25)' },
      { name: 'Guest Bedroom', type: 'bedroom', color: 'rgba(168, 85, 247, 0.25)' },
      { name: 'Flex Studio / Office', type: 'office', color: 'rgba(236, 72, 153, 0.25)' },
      { name: 'Veranda Balcony', type: 'balcony', color: 'rgba(20, 184, 166, 0.25)' },
    ];

    // Orthogonal Space Partitioning
    if (roomCount <= 4) {
      // 4-quadrant layout with central hallway
      const splitX = w * (0.45 + seededRandom(currentSeed++) * 0.1);
      const splitY = h * (0.45 + seededRandom(currentSeed++) * 0.1);

      rooms.push({ ...archetypes[0], x: 0, y: 0, w: splitX, h: splitY, area: splitX * splitY });
      rooms.push({ ...archetypes[1], x: splitX, y: 0, w: w - splitX, h: splitY, area: (w - splitX) * splitY });
      rooms.push({ ...archetypes[2], x: 0, y: splitY, w: splitX, h: h - splitY, area: splitX * (h - splitY) });
      rooms.push({ ...archetypes[3], x: splitX, y: splitY, w: w - splitX, h: h - splitY, area: (w - splitX) * (h - splitY) });
    } else {
      // 5 to 8 room division
      const splitX1 = w * 0.55;
      const splitY1 = h * 0.55;

      rooms.push({ ...archetypes[0], x: 0, y: 0, w: splitX1, h: splitY1, area: splitX1 * splitY1 });
      rooms.push({ ...archetypes[1], x: splitX1, y: 0, w: w - splitX1, h: splitY1 * 0.65, area: (w - splitX1) * (splitY1 * 0.65) });
      rooms.push({ ...archetypes[4], x: splitX1, y: splitY1 * 0.65, w: w - splitX1, h: splitY1 * 0.35, area: (w - splitX1) * (splitY1 * 0.35) });
      rooms.push({ ...archetypes[2], x: 0, y: splitY1, w: splitX1 * 0.5, h: h - splitY1, area: (splitX1 * 0.5) * (h - splitY1) });
      rooms.push({ ...archetypes[3], x: splitX1 * 0.5, y: splitY1, w: splitX1 * 0.5, h: h - splitY1, area: (splitX1 * 0.5) * (h - splitY1) });

      if (roomCount >= 6) {
        rooms.push({ ...archetypes[5], x: splitX1, y: splitY1, w: (w - splitX1) * 0.65, h: h - splitY1, area: ((w - splitX1) * 0.65) * (h - splitY1) });
      }
      if (roomCount >= 7) {
        rooms.push({ ...archetypes[6], x: splitX1 + (w - splitX1) * 0.65, y: splitY1, w: (w - splitX1) * 0.35, h: (h - splitY1) * 0.6, area: ((w - splitX1) * 0.35) * ((h - splitY1) * 0.6) });
      }
      if (roomCount >= 8) {
        rooms.push({ ...archetypes[7], x: splitX1 + (w - splitX1) * 0.65, y: splitY1 + (h - splitY1) * 0.6, w: (w - splitX1) * 0.35, h: (h - splitY1) * 0.4, area: ((w - splitX1) * 0.35) * ((h - splitY1) * 0.4) });
      }
    }

    return { totalW: w, totalH: h, rooms };
  }, [roomCount, aspectRatio, seed]);

  // Draw on Canvas (Parametric or CV Filter Mode)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    // Dark CAD background grid
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    const gridSize = 25;
    for (let x = 0; x < width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    const pad = 40;
    const availW = width - pad * 2;
    const availH = height - pad * 2;
    const scale = Math.min(availW / layoutData.totalW, availH / layoutData.totalH);
    const originX = (width - layoutData.totalW * scale) / 2;
    const originY = (height - layoutData.totalH * scale) / 2;

    if (activeTab === 'parametric') {
      // 1. Draw Room Polygons & Fills
      for (const r of layoutData.rooms) {
        const rx = originX + r.x * scale;
        const ry = originY + r.y * scale;
        const rw = r.w * scale;
        const rh = r.h * scale;

        ctx.fillStyle = r.color;
        ctx.fillRect(rx, ry, rw, rh);

        // Room Name and Area Tag
        ctx.fillStyle = '#f8fafc';
        ctx.font = 'bold 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(r.name, rx + rw / 2, ry + rh / 2 - 7);

        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 9px monospace';
        ctx.fillText(`${r.area.toFixed(1)} m²`, rx + rw / 2, ry + rh / 2 + 8);
      }

      // 2. Draw Walls with Wall Thickness
      const wtPx = Math.max(2, wallThicknessM * scale);
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = wtPx;
      ctx.strokeRect(originX, originY, layoutData.totalW * scale, layoutData.totalH * scale);

      // Internal dividing walls
      ctx.strokeStyle = '#64748b';
      for (const r of layoutData.rooms) {
        const rx = originX + r.x * scale;
        const ry = originY + r.y * scale;
        const rw = r.w * scale;
        const rh = r.h * scale;
        ctx.strokeRect(rx, ry, rw, rh);
      }

      // 3. Draw Doorway Cutouts
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = wtPx + 1;
      for (let i = 0; i < layoutData.rooms.length - 1; i++) {
        const r = layoutData.rooms[i];
        const dx = originX + (r.x + r.w * 0.4) * scale;
        const dy = originY + (r.y + r.h) * scale;
        ctx.beginPath();
        ctx.moveTo(dx, dy);
        ctx.lineTo(dx + 0.9 * scale, dy);
        ctx.stroke();

        // Swing Arc
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(245, 158, 11, 0.4)';
        ctx.lineWidth = 1;
        ctx.arc(dx, dy, 0.9 * scale, 0, Math.PI / 2);
        ctx.stroke();
      }
    } else {
      // CV Filter & Line-Clearing Simulation
      ctx.save();
      // Draw simulated raster blueprint mask
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(originX - 10, originY - 10, layoutData.totalW * scale + 20, layoutData.totalH * scale + 20);

      // Simulated noisy hatching / dimension lines
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.15)';
      ctx.lineWidth = 1;
      for (let i = 0; i < 30; i++) {
        const lx = originX + seededRandom(i * 12) * layoutData.totalW * scale;
        const ly = originY + seededRandom(i * 15) * layoutData.totalH * scale;
        ctx.beginPath();
        ctx.moveTo(lx, ly);
        ctx.lineTo(lx + 30, ly + 15);
        ctx.stroke();
      }

      // Filtered Walls
      ctx.strokeStyle = thresholdMode === 'band_stacking' ? '#38bdf8' : (thresholdMode === 'otsu' ? '#ffffff' : '#10b981');
      ctx.lineWidth = Math.max(3, kernelSize * 0.8);
      ctx.strokeRect(originX, originY, layoutData.totalW * scale, layoutData.totalH * scale);

      for (const r of layoutData.rooms) {
        const rx = originX + r.x * scale;
        const ry = originY + r.y * scale;
        const rw = r.w * scale;
        const rh = r.h * scale;
        ctx.strokeRect(rx, ry, rw, rh);
      }

      // Skeletonized Centerlines
      if (showSkeleton) {
        ctx.setLineDash([4, 4]);
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 1.5;
        for (const r of layoutData.rooms) {
          const rx = originX + r.x * scale;
          const ry = originY + r.y * scale;
          const rw = r.w * scale;
          const rh = r.h * scale;
          ctx.beginPath();
          ctx.moveTo(rx, ry + rh / 2);
          ctx.lineTo(rx + rw, ry + rh / 2);
          ctx.stroke();
        }
        ctx.setLineDash([]);
      }

      ctx.restore();
    }
  }, [layoutData, activeTab, wallThicknessM, thresholdMode, kernelSize, denoiseLevel, showSkeleton]);

  // Convert layout to Project & Launch in Editor
  const handleLaunchEditor = () => {
    const floorId = `fl_${Date.now()}`;
    const walls: Wall[] = [];
    const rooms: Room[] = [];

    // Outer Perimeter Walls
    const W = layoutData.totalW;
    const H = layoutData.totalH;
    const outerCoords = [
      [[0, 0], [W, 0]],
      [[W, 0], [W, H]],
      [[W, H], [0, H]],
      [[0, H], [0, 0]]
    ];

    outerCoords.forEach((pts, i) => {
      walls.push({
        id: `wall_ext_${i}`,
        start: pts[0] as [number, number],
        end: pts[1] as [number, number],
        thickness: wallThicknessM,
        height: 3.05,
        type: 'external',
        openings: []
      });
    });

    // Interior partitions from room layout
    layoutData.rooms.forEach((r, idx) => {
      if (idx > 0) {
        walls.push({
          id: `wall_int_${idx}`,
          start: [r.x, r.y],
          end: [r.x + r.w, r.y],
          thickness: wallThicknessM * 0.75,
          height: 3.05,
          type: 'internal',
          openings: [
            {
              id: `op_${idx}`,
              wallId: `wall_int_${idx}`,
              type: 'door',
              offset: r.w * 0.2,
              width: 0.9,
              height: 2.1,
              sillHeight: 0
            }
          ]
        });
      }

      rooms.push({
        id: `room_${idx}`,
        name: r.name,
        area: r.area,
        boundary: [
          [r.x, r.y],
          [r.x + r.w, r.y],
          [r.x + r.w, r.y + r.h],
          [r.x, r.y + r.h]
        ]
      });
    });

    const newProject: Project = {
      id: `proj_algo_${Date.now()}`,
      name: `Algorithmic Plan (${roomCount} Rooms, ${layoutData.totalW * layoutData.totalH} m²)`,
      unit: 'meters',
      scale: 0.0336,
      floors: [
        {
          id: floorId,
          name: 'Ground Floor',
          elevation: 0,
          wallHeight: 3.05,
          order_index: 0,
          walls,
          rooms,
          structuralObjects: []
        }
      ],
      sourceFiles: [],
      settings: {
        twobuilders_plan: null,
        raster_path: ''
      }
    };

    setProject(newProject);
    setActiveFloorId(floorId);
    setCadStudioOpen(false);
    toast.success(`Generated ${roomCount}-Room Algorithmic CAD Model!`);
    if (onOpenEditor) onOpenEditor();
  };

  if (!isCadStudioOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Studio Modal Header */}
        <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
              <Cpu size={18} className="animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-white tracking-tight">Algorithmic CAD Studio</h2>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-mono">
                  Deterministic CV & Geometry
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Parametric space synthesis, line-clearing, and OpenCV threshold lab
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCadStudioOpen(false)}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              title="Close CAD Studio"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Tab Controls Bar */}
        <div className="px-5 py-2 border-b border-slate-800/80 bg-slate-950/30 flex items-center justify-between">
          <div className="flex items-center gap-1.5 bg-slate-950/80 p-0.5 rounded-lg border border-slate-800 text-xs">
            <button
              onClick={() => setActiveTab('parametric')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-semibold transition-all ${
                activeTab === 'parametric'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sparkles size={13} />
              <span>Parametric Synthesizer</span>
            </button>
            <button
              onClick={() => setActiveTab('cv_filter')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-semibold transition-all ${
                activeTab === 'cv_filter'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sliders size={13} />
              <span>OpenCV Threshold & Line-Clearing Lab</span>
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-3 text-xs text-slate-400 font-mono">
            <span>Area: <strong className="text-white">{(layoutData.totalW * layoutData.totalH).toFixed(0)} m²</strong></span>
            <span>Rooms: <strong className="text-cyan-400">{layoutData.rooms.length}</strong></span>
          </div>
        </div>

        {/* Main Split Layout: Viewport on Left, Control Rack on Right */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          {/* Interactive Canvas Viewport */}
          <div className="flex-1 p-4 flex flex-col items-center justify-center relative bg-slate-950/60 overflow-hidden">
            <canvas
              ref={canvasRef}
              width={640}
              height={440}
              className="max-w-full max-h-[50vh] lg:max-h-[65vh] rounded-xl border border-slate-700/80 shadow-2xl bg-cad-dark object-contain"
            />
            <div className="absolute bottom-6 left-6 text-[10px] font-mono text-slate-500 bg-slate-950/80 px-2 py-1 rounded border border-slate-800">
              Interactive 2D Preview • Sub-millimeter Snapping Active
            </div>
          </div>

          {/* Right Parameter Controls Panel */}
          <div className="w-full lg:w-80 border-t lg:border-t-0 lg:border-l border-slate-800 p-4 bg-slate-900/40 overflow-y-auto no-scrollbar space-y-4">
            {activeTab === 'parametric' ? (
              <>
                {/* Room Count Slider */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-300 font-medium">Room Allocation</span>
                    <span className="font-mono text-cyan-400 font-bold">{roomCount} Rooms</span>
                  </div>
                  <input
                    type="range"
                    min={3}
                    max={8}
                    value={roomCount}
                    onChange={(e) => setRoomCount(parseInt(e.target.value))}
                    className="w-full accent-cyan-400 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                    <span>3 (Compact)</span>
                    <span>5 (Standard)</span>
                    <span>8 (Villa)</span>
                  </div>
                </div>

                {/* Aspect Ratio Selector */}
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-300 font-medium block">Building Footprint Aspect</label>
                  <div className="grid grid-cols-4 gap-1.5 text-xs">
                    {(['1:1', '4:3', '16:9', '3:2'] as const).map((ratio) => (
                      <button
                        key={ratio}
                        onClick={() => setAspectRatio(ratio)}
                        className={`py-1.5 rounded-lg border text-center font-mono font-semibold transition-all ${
                          aspectRatio === ratio
                            ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300'
                            : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {ratio}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Wall Thickness */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-300 font-medium">Wall Thickness</span>
                    <span className="font-mono text-slate-200 font-bold">{wallThicknessM.toFixed(2)} m</span>
                  </div>
                  <input
                    type="range"
                    min={0.15}
                    max={0.30}
                    step={0.05}
                    value={wallThicknessM}
                    onChange={(e) => setWallThicknessM(parseFloat(e.target.value))}
                    className="w-full accent-cyan-400 cursor-pointer"
                  />
                </div>

                {/* Randomize Seed */}
                <div className="pt-2">
                  <button
                    onClick={() => setSeed(Math.floor(Math.random() * 10000))}
                    className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors"
                  >
                    <RefreshCw size={13} className="text-cyan-400" />
                    <span>Regenerate Layout (Seed: {seed})</span>
                  </button>
                </div>
              </>
            ) : (
              <>
                {/* Threshold Mode Selector */}
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-300 font-medium block">Line Extraction Algorithm</label>
                  <div className="flex flex-col gap-1.5 text-xs">
                    {[
                      { id: 'band_stacking', label: 'Band Stacking & Clustering', desc: 'Watertight wall graph vectorization' },
                      { id: 'adaptive', label: 'Adaptive Gaussian Threshold', desc: 'Compensates uneven scan lighting' },
                      { id: 'otsu', label: 'Otsu Bimodal Separation', desc: 'Clean high-contrast digital CAD' },
                    ].map((m) => (
                      <button
                        key={m.id}
                        onClick={() => setThresholdMode(m.id as any)}
                        className={`p-2 rounded-xl border text-left transition-all ${
                          thresholdMode === m.id
                            ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300'
                            : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <div className="font-bold text-slate-200 text-xs">{m.label}</div>
                        <div className="text-[10px] text-slate-500">{m.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Morphological Kernel Size */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-300 font-medium">Morphology Line Clearing</span>
                    <span className="font-mono text-cyan-400 font-bold">{kernelSize}px Kernel</span>
                  </div>
                  <input
                    type="range"
                    min={3}
                    max={15}
                    step={2}
                    value={kernelSize}
                    onChange={(e) => setKernelSize(parseInt(e.target.value))}
                    className="w-full accent-cyan-400 cursor-pointer"
                  />
                  <span className="text-[10px] text-slate-500 block">
                    Strips text ticks, dimension arrows, and cross-hatching.
                  </span>
                </div>

                {/* Skeleton Toggle */}
                <div className="pt-2">
                  <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showSkeleton}
                      onChange={(e) => setShowSkeleton(e.target.checked)}
                      className="accent-cyan-400 rounded"
                    />
                    <span>Show Medial Axis Skeleton Centerlines</span>
                  </label>
                </div>
              </>
            )}

            {/* Launch CTA */}
            <div className="pt-4 border-t border-slate-800 space-y-2">
              <button
                onClick={handleLaunchEditor}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs transition-all shadow-lg hover:shadow-cyan-500/20 cursor-pointer"
              >
                <Box size={14} />
                <span>Launch in 3D CAD Editor</span>
                <ArrowRight size={13} />
              </button>
              <div className="text-[10px] text-slate-400 text-center">
                100% Free • Direct WebGL Extrusion • Universal Exports
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
