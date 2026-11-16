import React from 'react';
import { Column } from '../../types/architectural';

interface ParametricColumnMeshProps {
  column: Column;
  elevation?: number;
}

export const ParametricColumnMesh: React.FC<ParametricColumnMeshProps> = ({ column, elevation = 0 }) => {
  const size = column.radius_or_size || 0.3;
  const height = column.height || 2.8;
  const yPos = elevation + height / 2;

  if (column.shape === 'round') {
    return (
      <mesh
        position={[column.position.x, yPos, column.position.z]}
        castShadow
        receiveShadow
      >
        <cylinderGeometry args={[size / 2, size / 2, height, 24]} />
        <meshStandardMaterial
          color="#F1F5F9"
          roughness={0.5}
          metalness={0.1}
        />
      </mesh>
    );
  }

  return (
    <mesh
      position={[column.position.x, yPos, column.position.z]}
      castShadow
      receiveShadow
    >
      <boxGeometry args={[size, height, size]} />
      <meshStandardMaterial
        color="#F1F5F9"
        roughness={0.5}
        metalness={0.1}
      />
    </mesh>
  );
};
