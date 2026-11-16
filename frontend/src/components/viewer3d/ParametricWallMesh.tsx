import React, { useMemo } from 'react';
import * as THREE from 'three';
import { Wall, Door, Window } from '../../types/architectural';
import { useFloorPlanStore } from '../../store/useFloorPlanStore';

interface ParametricWallMeshProps {
  wall: Wall;
  doors: Door[];
  windows: Window[];
  isDollhouse: boolean;
  allWalls?: Wall[];
}

export const ParametricWallMesh: React.FC<ParametricWallMeshProps> = ({
  wall,
  doors,
  windows,
  isDollhouse,
  allWalls = []
}) => {
  const { selectedEntity, setSelectedEntity } = useFloorPlanStore();
  const isSelected = selectedEntity.type === 'wall' && selectedEntity.id === wall.id;

  const wallHeight = isDollhouse ? Math.min(1.2, wall.height * 0.45) : wall.height;

  // Generate 3D box blocks for solid segments, lintels, and sills with ZERO block overlap
  const blocks = useMemo(() => {
    const x1 = wall.start.x;
    const z1 = wall.start.z;
    const x2 = wall.end.x;
    const z2 = wall.end.z;
    const dx = x2 - x1;
    const dz = z2 - z1;
    const wallLen = Math.hypot(dx, dz);
    if (wallLen < 0.05) return [];

    const ux = dx / wallLen;
    const uz = dz / wallLen;

    // 1. Calculate non-overlapping corner and T-junction trimming (Planova style)
    let trimStart = 0;
    let trimEnd = 0;

    if (allWalls && allWalls.length > 1) {
      for (const other of allWalls) {
        if (other.id === wall.id) continue;

        const ox1 = other.start.x, oz1 = other.start.z;
        const ox2 = other.end.x, oz2 = other.end.z;
        const odx = ox2 - ox1, odz = oz2 - oz1;
        const otherLen = Math.hypot(odx, odz);
        if (otherLen < 0.05) continue;

        const halfOtherT = other.thickness / 2;

        // Check Start Endpoint (x1, z1)
        const distS_O1 = Math.hypot(x1 - ox1, z1 - oz1);
        const distS_O2 = Math.hypot(x1 - ox2, z1 - oz2);

        if (distS_O1 < 0.08 || distS_O2 < 0.08) {
          // Corner junction: subordinate wall trims by other's half-thickness
          const isOtherDominant =
            (wall.wall_type === 'interior' && other.wall_type === 'exterior') ||
            (wall.wall_type === other.wall_type && (
              otherLen > wallLen + 0.05 ||
              (Math.abs(otherLen - wallLen) <= 0.05 && wall.id > other.id)
            ));

          if (isOtherDominant) {
            trimStart = Math.max(trimStart, halfOtherT);
          }
        } else {
          // Check T-junction: start terminates into other wall
          const distToOther = pointToSegmentDist(x1, z1, ox1, oz1, ox2, oz2);
          if (distToOther < halfOtherT + 0.04) {
            trimStart = Math.max(trimStart, halfOtherT);
          }
        }

        // Check End Endpoint (x2, z2)
        const distE_O1 = Math.hypot(x2 - ox1, z2 - oz1);
        const distE_O2 = Math.hypot(x2 - ox2, z2 - oz2);

        if (distE_O1 < 0.08 || distE_O2 < 0.08) {
          // Corner junction: subordinate wall trims by other's half-thickness
          const isOtherDominant =
            (wall.wall_type === 'interior' && other.wall_type === 'exterior') ||
            (wall.wall_type === other.wall_type && (
              otherLen > wallLen + 0.05 ||
              (Math.abs(otherLen - wallLen) <= 0.05 && wall.id > other.id)
            ));

          if (isOtherDominant) {
            trimEnd = Math.max(trimEnd, halfOtherT);
          }
        } else {
          // Check T-junction: end terminates into other wall
          const distToOther = pointToSegmentDist(x2, z2, ox1, oz1, ox2, oz2);
          if (distToOther < halfOtherT + 0.04) {
            trimEnd = Math.max(trimEnd, halfOtherT);
          }
        }
      }
    }

    // Safety clamp: never trim more than 35% of length
    trimStart = Math.min(trimStart, wallLen * 0.35);
    trimEnd = Math.min(trimEnd, wallLen * 0.35);

    const sMin = trimStart;
    const sMax = Math.max(sMin + 0.05, wallLen - trimEnd);

    // Openings along this wall
    const openings: { start: number; end: number; bottom: number; top: number }[] = [];

    // Doors
    doors.forEach((d) => {
      if (d.wall_id === wall.id || isPointCloseToWall(d.position.x, d.position.z, x1, z1, x2, z2)) {
        const s = (d.position.x - x1) * ux + (d.position.z - z1) * uz;
        const halfW = d.width / 2;
        const sStart = Math.max(sMin, Math.min(sMax, s - halfW));
        const sEnd = Math.max(sMin, Math.min(sMax, s + halfW));
        if (sEnd > sStart) {
          openings.push({
            start: sStart,
            end: sEnd,
            bottom: 0,
            top: Math.min(wallHeight, d.height),
          });
        }
      }
    });

    // Windows
    windows.forEach((w) => {
      if (w.wall_id === wall.id || isPointCloseToWall(w.position.x, w.position.z, x1, z1, x2, z2)) {
        const s = (w.position.x - x1) * ux + (w.position.z - z1) * uz;
        const halfW = w.width / 2;
        const sStart = Math.max(sMin, Math.min(sMax, s - halfW));
        const sEnd = Math.max(sMin, Math.min(sMax, s + halfW));
        if (sEnd > sStart) {
          openings.push({
            start: sStart,
            end: sEnd,
            bottom: Math.min(wallHeight, w.sill_height),
            top: Math.min(wallHeight, w.sill_height + w.height),
          });
        }
      }
    });

    openings.sort((a, b) => a.start - b.start);

    const resultBlocks: { s0: number; s1: number; y0: number; y1: number }[] = [];
    let currentS = sMin;

    openings.forEach((op) => {
      // Solid segment before opening
      if (op.start > currentS + 0.01) {
        resultBlocks.push({ s0: currentS, s1: op.start, y0: 0, y1: wallHeight });
      }
      // Window sill below opening
      if (op.bottom > 0.01 && !isDollhouse) {
        resultBlocks.push({ s0: op.start, s1: op.end, y0: 0, y1: Math.min(wallHeight, op.bottom) });
      }
      // Lintel segment above opening
      if (wallHeight > op.top + 0.01 && !isDollhouse) {
        resultBlocks.push({ s0: op.start, s1: op.end, y0: op.top, y1: wallHeight });
      }
      currentS = Math.max(currentS, op.end);
    });

    // Segment after last opening
    if (currentS < sMax - 0.01) {
      resultBlocks.push({ s0: currentS, s1: sMax, y0: 0, y1: wallHeight });
    }

    if (resultBlocks.length === 0) {
      resultBlocks.push({ s0: sMin, s1: sMax, y0: 0, y1: wallHeight });
    }

    return resultBlocks.map((b, idx) => {
      const segLen = b.s1 - b.s0;
      const segHeight = b.y1 - b.y0;
      const midS = (b.s0 + b.s1) / 2;
      const midY = (b.y0 + b.y1) / 2;

      // Position in world coordinates
      const posX = x1 + midS * ux;
      const posZ = z1 + midS * uz;

      const angleY = Math.atan2(dx, dz);

      return {
        key: `${wall.id}_blk_${idx}_${b.s0.toFixed(3)}_${b.y0.toFixed(3)}`,
        position: [posX, midY, posZ] as [number, number, number],
        rotation: [0, angleY, 0] as [number, number, number],
        size: [wall.thickness, segHeight, segLen] as [number, number, number],
      };
    });
  }, [wall, doors, windows, wallHeight, isDollhouse, allWalls]);

  const handleClick = (e: any) => {
    e.stopPropagation();
    setSelectedEntity({ type: 'wall', id: wall.id });
  };

  const wallColor = isSelected
    ? '#00F0FF'
    : wall.wall_type === 'exterior'
    ? '#E2E8F0'
    : '#CBD5E1';

  return (
    <group onClick={handleClick}>
      {blocks.map((blk) => (
        <mesh
          key={blk.key}
          position={blk.position}
          rotation={blk.rotation}
          castShadow
          receiveShadow
        >
          <boxGeometry args={blk.size} />
          <meshStandardMaterial
            color={wallColor}
            roughness={0.7}
            metalness={0.05}
            emissive={isSelected ? '#00F0FF' : '#000000'}
            emissiveIntensity={isSelected ? 0.25 : 0}
          />
        </mesh>
      ))}
    </group>
  );
};

function pointToSegmentDist(px: number, pz: number, x1: number, z1: number, x2: number, z2: number): number {
  const dx = x2 - x1;
  const dz = z2 - z1;
  const lenSq = dx * dx + dz * dz;
  if (lenSq === 0) return Math.hypot(px - x1, pz - z1);
  const u = Math.max(0, Math.min(1, ((px - x1) * dx + (pz - z1) * dz) / lenSq));
  const nx = x1 + u * dx;
  const nz = z1 + u * dz;
  return Math.hypot(px - nx, pz - nz);
}

function isPointCloseToWall(px: number, pz: number, x1: number, z1: number, x2: number, z2: number): boolean {
  return pointToSegmentDist(px, pz, x1, z1, x2, z2) < 0.3;
}
