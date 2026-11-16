import React, { useMemo } from 'react';
import * as THREE from 'three';
import { Stair } from '../../types/architectural';

interface ParametricStairMeshProps {
  stair: Stair;
  elevation?: number;
}

export const ParametricStairMesh: React.FC<ParametricStairMeshProps> = ({ stair, elevation = 0 }) => {
  const risers = stair.risers_count || 14;
  const totalRise = stair.height || 2.8;
  const riserHeight = totalRise / risers;
  const stairWidth = stair.width || 0.9;

  const dx = stair.end.x - stair.start.x;
  const dz = stair.end.z - stair.start.z;
  const totalRun = Math.sqrt(dx * dx + dz * dz);
  const treadDepth = totalRun / risers;
  const angle = Math.atan2(dz, dx);

  const steps = useMemo(() => {
    const list = [];
    for (let i = 0; i < risers; i++) {
      const stepElevation = elevation + (i + 1) * riserHeight;
      const stepRun = i * treadDepth + treadDepth / 2;
      list.push({
        x: stepRun,
        y: stepElevation - riserHeight / 2,
        height: (i + 1) * riserHeight
      });
    }
    return list;
  }, [risers, riserHeight, treadDepth, elevation]);

  return (
    <group
      position={[stair.start.x, 0, stair.start.z]}
      rotation={[0, -angle, 0]}
    >
      {steps.map((st, idx) => (
        <mesh
          key={idx}
          position={[st.x, elevation + (idx * riserHeight) + riserHeight / 2, 0]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[treadDepth, riserHeight, stairWidth]} />
          <meshStandardMaterial
            color="#E2E8F0"
            roughness={0.6}
            metalness={0.1}
          />
        </mesh>
      ))}

      {/* Handrail Stringer */}
      <mesh
        position={[totalRun / 2, elevation + totalRise / 2 + 0.9, stairWidth / 2]}
        rotation={[0, 0, -Math.atan2(totalRise, totalRun)]}
        castShadow
      >
        <cylinderGeometry args={[0.025, 0.025, Math.sqrt(totalRun * totalRun + totalRise * totalRise), 8]} />
        <meshStandardMaterial color="#00F0FF" metalness={0.8} roughness={0.2} />
      </mesh>
    </group>
  );
};
