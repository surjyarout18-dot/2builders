import React, { useMemo, useState } from 'react';
import { useFloorPlanStore } from '../../store/useFloorPlanStore';
import { Room } from '../../types/architectural';
import {
  Compass,
  Maximize2,
  Minimize2,
  MapPin,
  Eye,
  Layers,
  ChevronDown,
  Navigation,
  X
} from 'lucide-react';

// Point-in-polygon algorithm (Ray casting)
function isPointInPolygon(px: number, pz: number, polygon: { x: number; z: number }[]): boolean {
  if (!polygon || polygon.length < 3) return false;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x, zi = polygon[i].z;
    const xj = polygon[j].x, zj = polygon[j].z;
    const intersect = ((zi > pz) !== (zj > pz)) &&
      (px < ((xj - xi) * (pz - zi)) / (zj - zi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

export const WalkthroughMinimap: React.FC = () => {
  const {
    model,
    activeFloorIndex,
    setActiveFloorIndex,
    walkthroughPosition,
    isFirstPerson,
    navigateToPoint,
    navigateToRoom,
    showMinimap,
    toggleMinimap,
    viewMode
  } = useFloorPlanStore();

  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [clickRipple, setClickRipple] = useState<{ x: number; y: number } | null>(null);

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

  // Compute floor bounding box with comfortable padding
  const bounds = useMemo(() => {
    let minX = 0, maxX = 12, minZ = 0, maxZ = 10;
    const allPts: { x: number; z: number }[] = [];

    activeFloor.walls.forEach((w) => {
      allPts.push(w.start, w.end);
    });
    activeFloor.rooms.forEach((r) => {
      r.polygon.forEach((pt) => allPts.push(pt));
    });

    if (allPts.length > 0) {
      minX = Math.min(...allPts.map((p) => p.x));
      maxX = Math.max(...allPts.map((p) => p.x));
      minZ = Math.min(...allPts.map((p) => p.z));
      maxZ = Math.max(...allPts.map((p) => p.z));
    }

    const padding = 1.2;
    return {
      minX: minX - padding,
      maxX: maxX + padding,
      minZ: minZ - padding,
      maxZ: maxZ + padding,
      width: Math.max(1, maxX - minX + padding * 2),
      height: Math.max(1, maxZ - minZ + padding * 2)
    };
  }, [activeFloor]);

  // Dimension settings (adaptive for split vs full 3D viewport)
  const isSplit = viewMode === 'split';
  const defaultWidth = isSplit ? 190 : 220;
  const mapWidth = isExpanded ? (isSplit ? 280 : 360) : defaultWidth;
  const mapHeight = Math.round((mapWidth * bounds.height) / bounds.width);

  // Coordinate conversion: floor (x, z) to SVG (sx, sy)
  const toSvgX = (x: number) => ((x - bounds.minX) / bounds.width) * mapWidth;
  const toSvgY = (z: number) => ((z - bounds.minZ) / bounds.height) * mapHeight;

  // Inverse coordinate conversion: SVG (sx, sy) to floor (x, z)
  const toFloorX = (sx: number) => (sx / mapWidth) * bounds.width + bounds.minX;
  const toFloorZ = (sy: number) => (sy / mapHeight) * bounds.height + bounds.minZ;

  // Detect current room presence (PadSpan-style)
  const currentRoom = useMemo<Room | null>(() => {
    if (!walkthroughPosition) return null;
    const px = walkthroughPosition.x;
    const pz = walkthroughPosition.z;

    for (const room of activeFloor.rooms) {
      if (isPointInPolygon(px, pz, room.polygon)) {
        return room;
      }
    }
    return null;
  }, [walkthroughPosition, activeFloor.rooms]);

  // Player position in SVG coordinates
  const playerSvgX = toSvgX(walkthroughPosition.x);
  const playerSvgY = toSvgY(walkthroughPosition.z);

  // FOV vision cone polygon points
  // Heading angle: 0 = +Z (down in SVG), PI/2 = +X (right in SVG), PI = -Z (up in SVG)
  // Let's compute vision cone wedge (60 degrees, radius ~ 35px)
  const fovRadius = isExpanded ? 46 : 30;
  const halfFov = Math.PI / 6; // 30 deg each side = 60 deg total
  const angle = walkthroughPosition.angle;

  const coneLeftAngle = angle - halfFov;
  const coneRightAngle = angle + halfFov;

  // In SVG, dx = sin(angle) * r, dy = cos(angle) * r
  const coneLeftX = playerSvgX + Math.sin(coneLeftAngle) * fovRadius;
  const coneLeftY = playerSvgY + Math.cos(coneLeftAngle) * fovRadius;
  const coneRightX = playerSvgX + Math.sin(coneRightAngle) * fovRadius;
  const coneRightY = playerSvgY + Math.cos(coneRightAngle) * fovRadius;

  const fovPath = `M ${playerSvgX} ${playerSvgY} L ${coneLeftX} ${coneLeftY} A ${fovRadius} ${fovRadius} 0 0 1 ${coneRightX} ${coneRightY} Z`;

  // Click on minimap to navigate
  const handleMapClick = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;

    const floorX = Number(toFloorX(sx).toFixed(2));
    const floorZ = Number(toFloorZ(sy).toFixed(2));

    setClickRipple({ x: sx, y: sy });
    setTimeout(() => setClickRipple(null), 900);

    navigateToPoint(floorX, floorZ);
  };

  if (!showMinimap) {
    return (
      <button
        onClick={toggleMinimap}
        className="absolute bottom-4 right-4 z-20 flex items-center gap-2 rounded-xl border border-[#00F0FF]/40 bg-[#0A0D14]/90 px-3.5 py-2 text-xs font-mono font-medium text-[#00F0FF] shadow-2xl backdrop-blur-md hover:bg-[#00F0FF]/15 transition-all"
        title="Open Architectural Radar Minimap"
      >
        <Navigation className="h-4 w-4 rotate-45 text-[#00F0FF]" />
        <span>Minimap HUD</span>
      </button>
    );
  }

  return (
    <div
      className={`absolute bottom-4 right-4 z-20 flex flex-col overflow-hidden rounded-2xl border border-[#1F2942]/90 bg-[#070A14]/95 shadow-[0_12px_40px_rgba(0,0,0,0.8)] backdrop-blur-xl transition-all duration-300 font-mono`}
      style={{ width: mapWidth + 16 }}
    >
      {/* Top Header Bar */}
      <div className="flex items-center justify-between border-b border-[#1F2942]/80 bg-[#0C101D] px-3 py-2 text-[11px]">
        <div className="flex items-center gap-1.5 text-[#00F0FF] font-semibold">
          <Navigation className="h-3.5 w-3.5 rotate-45" />
          <span className="tracking-wider uppercase text-[10px]">RADAR HUD</span>
        </div>

        {/* Floor selector & controls */}
        <div className="flex items-center gap-1">
          {model.floors.length > 1 && (
            <select
              value={activeFloorIndex}
              onChange={(e) => setActiveFloorIndex(Number(e.target.value))}
              className="rounded bg-[#161F33] px-1.5 py-0.5 text-[10px] text-[#94A3B8] border border-[#1F2942] focus:outline-none"
            >
              {model.floors.map((fl, idx) => (
                <option key={fl.id} value={idx}>
                  {fl.name || `Floor ${idx + 1}`}
                </option>
              ))}
            </select>
          )}

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="rounded p-1 text-[#94A3B8] hover:bg-[#161F33] hover:text-[#F1F5F9] transition-colors"
            title={isExpanded ? 'Shrink Minimap' : 'Expand Minimap'}
          >
            {isExpanded ? <Minimize2 className="h-3 w-3" /> : <Maximize2 className="h-3 w-3" />}
          </button>

          <button
            onClick={toggleMinimap}
            className="rounded p-1 text-[#94A3B8] hover:bg-[#EF4444]/20 hover:text-[#EF4444] transition-colors"
            title="Close Minimap"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* Live Room Presence Banner (PadSpan style) */}
      <div className="flex items-center justify-between bg-[#0E1528] px-3 py-1.5 border-b border-[#1F2942]/60 text-[11px]">
        <div className="flex items-center gap-1.5 overflow-hidden text-ellipsis whitespace-nowrap">
          <span className="flex h-2 w-2 rounded-full bg-[#10B981] animate-pulse" />
          <span className="font-sans text-[11px] font-medium text-[#F1F5F9]">
            {currentRoom ? currentRoom.name : 'Hallway / Circulation'}
          </span>
        </div>
        {currentRoom && (
          <span className="text-[10px] font-mono text-[#00F0FF] bg-[#00F0FF]/10 px-1.5 py-0.2 rounded">
            {(currentRoom.area_sqm || 0).toFixed(1)} m²
          </span>
        )}
      </div>

      {/* Blueprint SVG Canvas */}
      <div className="relative p-2 flex items-center justify-center bg-[#070A14] select-none">
        <svg
          width={mapWidth}
          height={mapHeight}
          viewBox={`0 0 ${mapWidth} ${mapHeight}`}
          onClick={handleMapClick}
          className="cursor-crosshair rounded-lg bg-[#0A0E1A]/80 border border-[#1E293B]/70 overflow-hidden"
        >
          {/* Subtle architectural background grid */}
          <defs>
            <pattern id="cad-grid" width="16" height="16" patternUnits="userSpaceOnUse">
              <path d="M 16 0 L 0 0 0 16" fill="none" stroke="#162036" strokeWidth="0.5" />
            </pattern>
            {/* Player FOV gradient */}
            <radialGradient id="fovGradient" cx="0%" cy="0%" r="100%">
              <stop offset="0%" stopColor="#00F0FF" stopOpacity="0.45" />
              <stop offset="60%" stopColor="#00F0FF" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#00F0FF" stopOpacity="0" />
            </radialGradient>
            {/* Click ripple glow */}
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Grid background */}
          <rect width={mapWidth} height={mapHeight} fill="url(#cad-grid)" />

          {/* Room Polygons */}
          {activeFloor.rooms.map((room) => {
            if (!room.polygon || room.polygon.length < 3) return null;
            const isCurrent = currentRoom?.id === room.id;
            const pointsStr = room.polygon
              .map((p) => `${toSvgX(p.x)},${toSvgY(p.z)}`)
              .join(' ');

            // Centroid for room label
            const cx = room.polygon.reduce((a, b) => a + b.x, 0) / room.polygon.length;
            const cz = room.polygon.reduce((a, b) => a + b.z, 0) / room.polygon.length;
            const scx = toSvgX(cx);
            const scz = toSvgY(cz);

            return (
              <g key={room.id} className="transition-all duration-300">
                <polygon
                  points={pointsStr}
                  fill={isCurrent ? '#00F0FF' : '#1E293B'}
                  fillOpacity={isCurrent ? 0.22 : 0.12}
                  stroke={isCurrent ? '#00F0FF' : '#334155'}
                  strokeWidth={isCurrent ? 1.8 : 0.9}
                  strokeDasharray={isCurrent ? 'none' : '3 2'}
                  className="hover:fill-[#00F0FF]/30 transition-colors cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigateToRoom(room.id);
                  }}
                />
                {isExpanded && (
                  <text
                    x={scx}
                    y={scz}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill={isCurrent ? '#00F0FF' : '#94A3B8'}
                    fontSize="8"
                    fontWeight="600"
                    pointerEvents="none"
                    fontFamily="sans-serif"
                  >
                    {room.name.length > 12 ? room.name.slice(0, 10) + '…' : room.name}
                  </text>
                )}
              </g>
            );
          })}

          {/* Architectural Walls */}
          {activeFloor.walls.map((wall) => {
            const x1 = toSvgX(wall.start.x);
            const y1 = toSvgY(wall.start.z);
            const x2 = toSvgX(wall.end.x);
            const y2 = toSvgY(wall.end.z);
            const isExt = wall.wall_type === 'exterior' || wall.thickness >= 0.22;

            return (
              <line
                key={wall.id}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={isExt ? '#38BDF8' : '#64748B'}
                strokeWidth={isExt ? (isExpanded ? 3.5 : 2.5) : (isExpanded ? 2.0 : 1.4)}
                strokeLinecap="round"
              />
            );
          })}

          {/* Doors */}
          {activeFloor.doors.map((door) => {
            const dx = toSvgX(door.position.x);
            const dy = toSvgY(door.position.z);
            return (
              <circle
                key={door.id}
                cx={dx}
                cy={dy}
                r={isExpanded ? 2.5 : 1.8}
                fill="#F59E0B"
                opacity="0.9"
              />
            );
          })}

          {/* Windows */}
          {activeFloor.windows.map((win) => {
            const wx = toSvgX(win.position.x);
            const wy = toSvgY(win.position.z);
            return (
              <circle
                key={win.id}
                cx={wx}
                cy={wy}
                r={isExpanded ? 2.2 : 1.5}
                fill="#00F0FF"
                opacity="0.9"
              />
            );
          })}

          {/* Player Vision Cone (Radar FOV) */}
          <path
            d={fovPath}
            fill="url(#fovGradient)"
            stroke="#00F0FF"
            strokeWidth="0.75"
            strokeOpacity="0.4"
            pointerEvents="none"
          />

          {/* Click Ripple Indicator */}
          {clickRipple && (
            <circle
              cx={clickRipple.x}
              cy={clickRipple.y}
              r="14"
              fill="none"
              stroke="#00F0FF"
              strokeWidth="2"
              className="animate-ping"
            />
          )}

          {/* Player Avatar Beacon */}
          <g transform={`translate(${playerSvgX}, ${playerSvgY})`} pointerEvents="none">
            {/* Outer pulsating radar ring */}
            <circle
              r={isExpanded ? 10 : 8}
              fill="#00F0FF"
              fillOpacity="0.25"
              className="animate-ping"
            />
            {/* Middle beacon ring */}
            <circle
              r={isExpanded ? 5 : 4}
              fill="#00F0FF"
              stroke="#070A14"
              strokeWidth="1.5"
            />
            {/* Center dot */}
            <circle r={isExpanded ? 2.2 : 1.6} fill="#FFFFFF" />
          </g>

          {/* North Compass Rose in top-right corner of map */}
          <g transform={`translate(${mapWidth - 14}, 14)`} pointerEvents="none">
            <circle r="9" fill="#0A0E1A" stroke="#1F2942" strokeWidth="1" />
            <polygon points="0,-7 -2,-1 0,0 2,-1" fill="#EF4444" />
            <polygon points="0,7 -2,1 0,0 2,1" fill="#64748B" />
            <text x="0" y="-8.5" textAnchor="middle" fill="#EF4444" fontSize="6" fontWeight="bold">
              N
            </text>
          </g>
        </svg>
      </div>

      {/* Footer Info & Instructions */}
      <div className="flex items-center justify-between border-t border-[#1F2942]/60 bg-[#0A0D18] px-3 py-1.5 text-[10px] text-[#94A3B8]">
        <div className="flex items-center gap-1.5">
          <MapPin className="h-3 w-3 text-[#00F0FF]" />
          <span>Click blueprint to teleport</span>
        </div>
        <div className="font-mono text-[#64748B]">
          ({walkthroughPosition.x.toFixed(1)}, {walkthroughPosition.z.toFixed(1)})
        </div>
      </div>
    </div>
  );
};
