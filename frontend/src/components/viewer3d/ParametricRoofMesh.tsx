import React, { useMemo } from 'react';
import * as THREE from 'three';
import { useFloorPlanStore } from '../../store/useFloorPlanStore';
import { Roof, Floor } from '../../types/architectural';

interface ParametricRoofMeshProps {
  roof: Roof;
  topFloor: Floor;
}

export const ParametricRoofMesh: React.FC<ParametricRoofMeshProps> = ({ roof, topFloor }) => {
  if (!roof.visible) return null;

  const walls = topFloor.walls || [];
  if (walls.length === 0) return null;

  // Compute building footprint bounding box
  const { minX, maxX, minZ, maxZ } = useMemo(() => {
    let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
    walls.forEach((w) => {
      x0 = Math.min(x0, w.start.x, w.end.x);
      x1 = Math.max(x1, w.start.x, w.end.x);
      z0 = Math.min(z0, w.start.z, w.end.z);
      z1 = Math.max(z1, w.start.z, w.end.z);
    });
    return { minX: x0, maxX: x1, minZ: z0, maxZ: z1 };
  }, [walls]);

  const overhang = roof.overhang || 0.45;
  const x0 = minX - overhang;
  const x1 = maxX + overhang;
  const z0 = minZ - overhang;
  const z1 = maxZ + overhang;
  const w = x1 - x0;
  const d = z1 - z0;
  const baseElevation = topFloor.elevation + topFloor.height;

  // Material color
  const materialColor = useMemo(() => {
    switch (roof.material) {
      case 'terracotta_tile': return '#9A3412';
      case 'slate_shingle': return '#1E293B';
      case 'zinc_standing_seam':
      default: return '#334155';
    }
  }, [roof.material]);

  // Generate parametric roof geometry
  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const pitchRad = ((roof.pitch || 25) * Math.PI) / 180;
    const rise = (w / 2) * Math.tan(pitchRad);

    const positions: number[] = [];
    const uvs: number[] = [];

    if (roof.roof_type === 'gable') {
      const midX = (x0 + x1) / 2;
      const ridgeY = baseElevation + rise;

      // Left Slope (2 triangles)
      // v1: (x0, baseElevation, z0), v2: (midX, ridgeY, z0), v3: (x0, baseElevation, z1)
      // v4: (midX, ridgeY, z0), v5: (midX, ridgeY, z1), v6: (x0, baseElevation, z1)
      positions.push(
        x0, baseElevation, z0,
        midX, ridgeY, z0,
        x0, baseElevation, z1,

        midX, ridgeY, z0,
        midX, ridgeY, z1,
        x0, baseElevation, z1,

        // Right Slope (2 triangles)
        midX, ridgeY, z0,
        x1, baseElevation, z0,
        midX, ridgeY, z1,

        x1, baseElevation, z0,
        x1, baseElevation, z1,
        midX, ridgeY, z1,

        // Front Gable Wall (z0)
        x0, baseElevation, z0,
        x1, baseElevation, z0,
        midX, ridgeY, z0,

        // Rear Gable Wall (z1)
        x0, baseElevation, z1,
        midX, ridgeY, z1,
        x1, baseElevation, z1
      );
    } else if (roof.roof_type === 'hip') {
      const midX = (x0 + x1) / 2;
      const midZ = (z0 + z1) / 2;
      const ridgeY = baseElevation + rise;

      positions.push(
        // Front face
        x0, baseElevation, z0,
        x1, baseElevation, z0,
        midX, ridgeY, midZ,

        // Right face
        x1, baseElevation, z0,
        x1, baseElevation, z1,
        midX, ridgeY, midZ,

        // Rear face
        x1, baseElevation, z1,
        x0, baseElevation, z1,
        midX, ridgeY, midZ,

        // Left face
        x0, baseElevation, z1,
        x0, baseElevation, z0,
        midX, ridgeY, midZ
      );
    } else if (roof.roof_type === 'shed') {
      // Mono-pitch sloping from z0 (high) to z1 (low)
      const highY = baseElevation + rise;
      const lowY = baseElevation;

      positions.push(
        x0, highY, z0,
        x1, highY, z0,
        x0, lowY, z1,

        x1, highY, z0,
        x1, lowY, z1,
        x0, lowY, z1
      );
    } else {
      // Flat roof with subtle parapet border
      const flatY = baseElevation + 0.15;
      positions.push(
        x0, flatY, z0,
        x1, flatY, z0,
        x0, flatY, z1,

        x1, flatY, z0,
        x1, flatY, z1,
        x0, flatY, z1
      );
    }

    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.computeVertexNormals();
    return geo;
  }, [roof, x0, x1, z0, z1, w, baseElevation]);

  return (
    <mesh geometry={geometry} castShadow receiveShadow>
      <meshStandardMaterial
        color={materialColor}
        roughness={0.4}
        metalness={0.2}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
};
