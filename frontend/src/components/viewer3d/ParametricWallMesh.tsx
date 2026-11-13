import React, { useMemo } from 'react';
import * as THREE from 'three';
import { Wall, Door, Window } from '../../types/architectural';
import { useFloorPlanStore } from '../../store/useFloorPlanStore';

interface ParametricWallMeshProps {
  wall: Wall;
  doors: Door[];
  windows: Window[];
  isDollhouse: boolean;
}

export const ParametricWallMesh: React.FC<ParametricWallMeshProps> = ({
  wall,
  doors,
  windows,
  isDollhouse,
}) => {
  const { selectedEntity, setSelectedEntity } = useFloorPlanStore();
  const isSelected = selectedEntity.type === 'wall' && selectedEntity.id === wall.id;

  const wallHeight = isDollhouse ? Math.min(1.2, wall.height * 0.45) : wall.height;

  // Generate 3D box blocks for solid segments, lintels, and sills
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

    // Openings along this wall
    const openings: { start: number; end: number; bottom: number; top: number }[] = [];

    // Doors
    doors.forEach((d) => {
      if (d.wall_id === wall.id || isPointCloseToWall(d.position.x, d.position.z, x1, z1, x2, z2)) {
        const s = (d.position.x - x1) * ux + (d.position.z - z1) * uz;
        const halfW = d.width / 2;
        const sStart = Math.max(0, s - halfW);
        const sEnd = Math.min(wallLen, s + halfW);
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
        const sStart = Math.max(0, s - halfW);
        const sEnd = Math.min(wallLen, s + halfW);
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
    let currentS = 0;

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
    if (currentS < wallLen - 0.01) {
      resultBlocks.push({ s0: currentS, s1: wallLen, y0: 0, y1: wallHeight });
    }

    if (resultBlocks.length === 0) {
      resultBlocks.push({ s0: 0, s1: wallLen, y0: 0, y1: wallHeight });
    }

    return resultBlocks.map((b) => {
      const segLen = b.s1 - b.s0;
      const segHeight = b.y1 - b.y0;
      const midS = (b.s0 + b.s1) / 2;
      const midY = (b.y0 + b.y1) / 2;

      // Position in world coordinates
      const posX = x1 + midS * ux;
      const posZ = z1 + midS * uz;

      const angleY = Math.atan2(dx, dz);

      return {
        key: `${b.s0}-${b.s1}-${b.y0}-${b.y1}`,
        position: [posX, midY, posZ] as [number, number, number],
        rotation: [0, angleY, 0] as [number, number, number],
        size: [wall.thickness, segHeight, segLen] as [number, number, number],
      };
    });
  }, [wall, doors, windows, wallHeight, isDollhouse]);

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

function isPointCloseToWall(px: number, pz: number, x1: number, z1: number, x2: number, z2: number): boolean {
  const dx = x2 - x1;
  const dz = z2 - z1;
  const lenSq = dx * dx + dz * dz;
  if (lenSq === 0) return false;
  const u = Math.max(0, Math.min(1, ((px - x1) * dx + (pz - z1) * dz) / lenSq));
  const nx = x1 + u * dx;
  const nz = z1 + u * dz;
  return Math.hypot(px - nx, pz - nz) < 0.3;
}
