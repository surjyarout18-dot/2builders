import React from 'react';
import { Door } from '../../types/architectural';
import { useFloorPlanStore } from '../../store/useFloorPlanStore';

interface ParametricDoorMeshProps {
  door: Door;
}

export const ParametricDoorMesh: React.FC<ParametricDoorMeshProps> = ({ door }) => {
  const { selectedEntity, setSelectedEntity } = useFloorPlanStore();
  const isSelected = selectedEntity.type === 'door' && selectedEntity.id === door.id;

  const handleClick = (e: any) => {
    e.stopPropagation();
    setSelectedEntity({ type: 'door', id: door.id });
  };

  const doorThickness = 0.045; // 45mm architectural door leaf
  const frameThickness = 0.08;

  return (
    <group
      position={[door.position.x, 0, door.position.z]}
      onClick={handleClick}
    >
      {/* Outer Door Frame */}
      <mesh position={[0, door.height / 2, 0]} castShadow>
        <boxGeometry args={[door.width + 0.06, door.height + 0.04, frameThickness]} />
        <meshStandardMaterial color="#475569" roughness={0.6} />
      </mesh>

      {/* Door Leaf (rotated open ~35 degrees) */}
      <group position={[-door.width / 2 + 0.02, 0, 0]} rotation={[0, Math.PI / 5, 0]}>
        <mesh position={[door.width / 2, door.height / 2, 0]} castShadow>
          <boxGeometry args={[door.width - 0.04, door.height - 0.02, doorThickness]} />
          <meshStandardMaterial
            color={isSelected ? '#00F0FF' : '#78350F'} // Warm timber
            roughness={0.5}
            emissive={isSelected ? '#00F0FF' : '#000000'}
            emissiveIntensity={isSelected ? 0.3 : 0}
          />
        </mesh>

        {/* Brass Door Handle */}
        <mesh position={[door.width - 0.08, 1.0, 0.04]}>
          <cylinderGeometry args={[0.015, 0.015, 0.12, 12]} />
          <meshStandardMaterial color="#F59E0B" metalness={0.8} roughness={0.2} />
        </mesh>
      </group>
    </group>
  );
};
