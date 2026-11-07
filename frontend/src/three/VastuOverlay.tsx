import React, { useMemo } from 'react';
import * as THREE from 'three';
import { Html } from '@react-three/drei';
import { useProjectStore } from '../store/useProjectStore';

const VASTU_COLORS: Record<string, string> = {
  N: '#38bdf8',   // Water - Sky Blue
  NE: '#818cf8',  // Water/Ether - Indigo
  E: '#34d399',   // Air/Sun - Emerald
  SE: '#f87171',  // Fire - Coral Red
  S: '#fb923c',   // Fire/Earth - Orange
  SW: '#fbbf24',  // Earth - Amber/Gold
  W: '#94a3b8',   // Space/Water - Slate
  NW: '#c084fc',  // Air - Violet
};

export const VastuOverlay: React.FC = () => {
  const project = useProjectStore((s) => s.project);
  const showVastu = useProjectStore((s) => s.showVastuZones);
  const activeFloorId = useProjectStore((s) => s.activeFloorId);

  const floor = project?.floors.find((f) => f.id === activeFloorId) || project?.floors[0];

  // Calculate Brahmasthan (Centroid of building) and building radius
  const { center, radius, rooms } = useMemo(() => {
    if (!floor || floor.walls.length === 0) {
      return { center: [0, 0, 0] as [number, number, number], radius: 10, rooms: [] };
    }
    let minX = Infinity, maxX = -Infinity;
    let minZ = Infinity, maxZ = -Infinity;

    for (const w of floor.walls) {
      minX = Math.min(minX, w.start[0], w.end[0]);
      maxX = Math.max(maxX, w.start[0], w.end[0]);
      minZ = Math.min(minZ, w.start[1], w.end[1]);
      maxZ = Math.max(maxZ, w.start[1], w.end[1]);
    }

    const cx = (minX + maxX) / 2.0;
    const cz = (minZ + maxZ) / 2.0;
    const r = Math.max(6, Math.hypot(maxX - minX, maxZ - minZ) / 2.0 + 1.5);

    // Calculate room centroids and assign Vastu zone
    const analyzedRooms = (floor.rooms || []).map((rm) => {
      let rcx = 0, rcz = 0;
      if (rm.boundary && rm.boundary.length > 0) {
        for (const pt of rm.boundary) {
          rcx += pt[0];
          rcz += pt[1];
        }
        rcx /= rm.boundary.length;
        rcz /= rm.boundary.length;
      } else {
        rcx = cx;
        rcz = cz;
      }

      const dx = rcx - cx;
      const dz = rcz - cz;
      // In Three.js: -Z is North, +X is East, +Z is South, -X is West
      const bearing = (Math.atan2(dx, -dz) * (180 / Math.PI) + 360) % 360;

      let zoneCode = 'N';
      let zoneName = 'North';
      if (bearing >= 22.5 && bearing < 67.5) { zoneCode = 'NE'; zoneName = 'North-East (Ishan)'; }
      else if (bearing >= 67.5 && bearing < 112.5) { zoneCode = 'E'; zoneName = 'East (Indra)'; }
      else if (bearing >= 112.5 && bearing < 157.5) { zoneCode = 'SE'; zoneName = 'South-East (Agni)'; }
      else if (bearing >= 157.5 && bearing < 202.5) { zoneCode = 'S'; zoneName = 'South (Yama)'; }
      else if (bearing >= 202.5 && bearing < 247.5) { zoneCode = 'SW'; zoneName = 'South-West (Niruthi)'; }
      else if (bearing >= 247.5 && bearing < 292.5) { zoneCode = 'W'; zoneName = 'West (Varuna)'; }
      else if (bearing >= 292.5 && bearing < 337.5) { zoneCode = 'NW'; zoneName = 'North-West (Vayu)'; }
      else { zoneCode = 'N'; zoneName = 'North (Kubera)'; }

      const nameLower = rm.name.toLowerCase();
      let status: 'ideal' | 'acceptable' | 'dosha' | 'neutral' = 'neutral';
      if (nameLower.includes('kitchen')) {
        status = zoneCode === 'SE' ? 'ideal' : zoneCode === 'NW' ? 'acceptable' : zoneCode === 'NE' ? 'dosha' : 'neutral';
      } else if (nameLower.includes('master') || (nameLower.includes('bed') && nameLower.includes('1'))) {
        status = zoneCode === 'SW' ? 'ideal' : zoneCode === 'NE' ? 'dosha' : 'acceptable';
      } else if (nameLower.includes('bath') || nameLower.includes('toilet')) {
        status = (zoneCode === 'W' || zoneCode === 'NW' || zoneCode === 'S') ? 'ideal' : zoneCode === 'NE' ? 'dosha' : 'acceptable';
      } else if (nameLower.includes('living') || nameLower.includes('hall')) {
        status = (zoneCode === 'N' || zoneCode === 'E' || zoneCode === 'NE') ? 'ideal' : 'acceptable';
      }

      return {
        id: rm.id,
        name: rm.name,
        area: rm.area,
        x: rcx,
        z: rcz,
        zoneCode,
        zoneName,
        status
      };
    });

    return {
      center: [cx, (floor.elevation || 0) + 0.05, cz] as [number, number, number],
      radius: r,
      rooms: analyzedRooms
    };
  }, [floor]);

  if (!showVastu || !floor) return null;

  // 8 Sectors wedges (45 degrees each)
  const sectors = [
    { code: 'N', name: 'NORTH', startAngle: -22.5, endAngle: 22.5, color: VASTU_COLORS.N },
    { code: 'NE', name: 'NORTH-EAST', startAngle: 22.5, endAngle: 67.5, color: VASTU_COLORS.NE },
    { code: 'E', name: 'EAST', startAngle: 67.5, endAngle: 112.5, color: VASTU_COLORS.E },
    { code: 'SE', name: 'SOUTH-EAST', startAngle: 112.5, endAngle: 157.5, color: VASTU_COLORS.SE },
    { code: 'S', name: 'SOUTH', startAngle: 157.5, endAngle: 202.5, color: VASTU_COLORS.S },
    { code: 'SW', name: 'SOUTH-WEST', startAngle: 202.5, endAngle: 247.5, color: VASTU_COLORS.SW },
    { code: 'W', name: 'WEST', startAngle: 247.5, endAngle: 292.5, color: VASTU_COLORS.W },
    { code: 'NW', name: 'NORTH-WEST', startAngle: 292.5, endAngle: 337.5, color: VASTU_COLORS.NW },
  ];

  return (
    <group position={center}>
      {/* 1. Brahmasthan Central Marker */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1.2, 32]} />
        <meshBasicMaterial color="#fbbf24" opacity={0.35} transparent depthWrite={false} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <ringGeometry args={[1.15, 1.25, 32]} />
        <meshBasicMaterial color="#f59e0b" opacity={0.8} transparent depthWrite={false} />
      </mesh>

      <Html position={[0, 0.1, 0]} center distanceFactor={14}>
        <div className="bg-amber-950/90 border border-amber-400/80 text-amber-300 px-2 py-0.5 rounded text-[10px] font-bold shadow-lg pointer-events-none select-none whitespace-nowrap flex items-center gap-1">
          <span>☸</span>
          <span>Brahmasthan</span>
        </div>
      </Html>

      {/* 2. 8 Directional Vastu Wedges */}
      {sectors.map((sec) => {
        // In Three.js: -Z is 0° (North), +X is 90° (East), +Z is 180° (South), -X is 270° (West)
        // Three.js RingGeometry theta is measured from positive X counterclockwise
        // Convert compass bearing angle: theta = (90 - compass_deg) * rad
        const radStart = ((90 - sec.endAngle) * Math.PI) / 180;
        const radLength = (45 * Math.PI) / 180;

        const midDeg = (sec.startAngle + sec.endAngle) / 2.0;
        const midRad = ((midDeg) * Math.PI) / 180;
        // Direction vector for zone label
        const lx = Math.sin(midRad) * (radius * 0.85);
        const lz = -Math.cos(midRad) * (radius * 0.85);

        return (
          <group key={sec.code}>
            {/* Sector Polygon Wedge */}
            <mesh rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[1.25, radius, 24, 1, radStart, radLength]} />
              <meshBasicMaterial
                color={sec.color}
                opacity={0.12}
                transparent
                depthWrite={false}
                side={THREE.DoubleSide}
              />
            </mesh>

            {/* Zone Perimeter Label */}
            <Html position={[lx, 0.1, lz]} center distanceFactor={18}>
              <div
                className="px-2 py-0.5 rounded-full text-[9px] font-bold shadow pointer-events-none select-none whitespace-nowrap border backdrop-blur-sm"
                style={{
                  backgroundColor: `${sec.color}22`,
                  borderColor: `${sec.color}88`,
                  color: sec.color
                }}
              >
                {sec.code} · {sec.name}
              </div>
            </Html>
          </group>
        );
      })}

      {/* 3. North Arrow Pointer */}
      <group position={[0, 0.05, -radius - 0.8]}>
        <Html center distanceFactor={16}>
          <div className="flex flex-col items-center pointer-events-none select-none">
            <div className="w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-b-[16px] border-b-sky-400" />
            <span className="text-[12px] font-black text-sky-400 bg-slate-950/80 px-1.5 py-0.5 rounded shadow mt-0.5">N</span>
          </div>
        </Html>
      </group>

      {/* 4. Room Vastu Conformance Badges */}
      {rooms.map((rm) => {
        const rx = rm.x - center[0];
        const rz = rm.z - center[2];

        const statusBadge =
          rm.status === 'ideal' ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300' :
          rm.status === 'dosha' ? 'bg-rose-500/20 border-rose-400 text-rose-300 animate-pulse' :
          rm.status === 'acceptable' ? 'bg-amber-500/20 border-amber-400 text-amber-300' :
          'bg-slate-800/80 border-slate-600 text-slate-300';

        const statusText =
          rm.status === 'ideal' ? 'Ideal' :
          rm.status === 'dosha' ? 'Dosha' :
          rm.status === 'acceptable' ? 'Favorable' : 'Neutral';

        return (
          <group key={rm.id} position={[rx, 0.4, rz]}>
            <Html center distanceFactor={14}>
              <div className={`px-2 py-1 rounded-md border text-[9px] font-medium shadow-xl pointer-events-none select-none whitespace-nowrap backdrop-blur-md flex flex-col items-center gap-0.5 ${statusBadge}`}>
                <span className="font-bold">{rm.name}</span>
                <span className="text-[8px] opacity-90">{rm.zoneCode} ({statusText})</span>
              </div>
            </Html>
          </group>
        );
      })}
    </group>
  );
};

