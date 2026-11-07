import React, { useMemo } from 'react';
import * as THREE from 'three';
import { Floor } from '../types';
import { useProjectStore } from '../store/useProjectStore';

interface FloorMeshProps {
  floor: Floor;
}

export const FloorMesh: React.FC<FloorMeshProps> = ({ floor }) => {
  const wireframe = useProjectStore((s) => s.wireframe);
  const showFloors = useProjectStore((s) => s.showFloors);
  const renderMode = useProjectStore((s) => s.renderMode);

  // Compute bounding box from walls
  const bounds = useMemo(() => {
    if (!floor.walls || floor.walls.length === 0) {
      return { minX: -5, maxX: 5, minZ: -5, maxZ: 5, hasWalls: false };
    }
    let minX = Infinity;
    let maxX = -Infinity;
    let minZ = Infinity;
    let maxZ = -Infinity;

    for (const w of floor.walls) {
      minX = Math.min(minX, w.start[0], w.end[0]);
      maxX = Math.max(maxX, w.start[0], w.end[0]);
      minZ = Math.min(minZ, w.start[1], w.end[1]);
      maxZ = Math.max(maxZ, w.start[1], w.end[1]);
    }

    return {
      minX: minX - 0.4,
      maxX: maxX + 0.4,
      minZ: minZ - 0.4,
      maxZ: maxZ + 0.4,
      hasWalls: true
    };
  }, [floor.walls]);

  if (!showFloors || !bounds.hasWalls) return null;

  const width = Math.max(1, bounds.maxX - bounds.minX);
  const depth = Math.max(1, bounds.maxZ - bounds.minZ);
  const centerX = (bounds.minX + bounds.maxX) / 2.0;
  const centerZ = (bounds.minZ + bounds.maxZ) / 2.0;
  const slabThickness = 0.2;
  const posY = floor.elevation - slabThickness / 2.0;

  return (
    <group position={[centerX, posY, centerZ]}>
      {/* Foundation concrete slab */}
      <mesh receiveShadow castShadow>
        <boxGeometry args={[width, slabThickness, depth]} />
        <meshStandardMaterial
          color={renderMode === 'engineering' ? '#1e293b' : '#0f172a'}
          roughness={0.9}
          metalness={0.1}
          wireframe={wireframe}
        />
      </mesh>

      {/* Elegant finished architectural floor top */}
      <mesh position={[0, slabThickness / 2 + 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[width - 0.05, depth - 0.05]} />
        <meshStandardMaterial
          color={renderMode === 'engineering' ? '#334155' : '#e2d9cc'}
          roughness={renderMode === 'engineering' ? 0.9 : 0.6}
          metalness={0.05}
          wireframe={wireframe}
        />
      </mesh>
    </group>
  );
};


