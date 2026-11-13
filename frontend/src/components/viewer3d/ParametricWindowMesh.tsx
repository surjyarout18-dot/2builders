import React from 'react';
import { Window } from '../../types/architectural';
import { useFloorPlanStore } from '../../store/useFloorPlanStore';

interface ParametricWindowMeshProps {
  window: Window;
}

export const ParametricWindowMesh: React.FC<ParametricWindowMeshProps> = ({ window: win }) => {
  const { selectedEntity, setSelectedEntity } = useFloorPlanStore();
  const isSelected = selectedEntity.type === 'window' && selectedEntity.id === win.id;

  const handleClick = (e: any) => {
    e.stopPropagation();
    setSelectedEntity({ type: 'window', id: win.id });
  };

  const posY = win.sill_height + win.height / 2;
  const frameThickness = 0.08;

  return (
    <group
      position={[win.position.x, posY, win.position.z]}
      onClick={handleClick}
    >
      {/* Outer Aluminum Window Frame */}
      <mesh castShadow>
        <boxGeometry args={[win.width, win.height, frameThickness]} />
        <meshStandardMaterial
          color="#1E293B"
          metalness={0.7}
          roughness={0.3}
          wireframe={false}
        />
      </mesh>

      {/* Architectural Reflective Glass Pane */}
      <mesh>
        <boxGeometry args={[win.width - 0.08, win.height - 0.08, 0.015]} />
        <meshPhysicalMaterial
          color={isSelected ? '#00F0FF' : '#93C5FD'}
          transmission={0.88}
          opacity={0.65}
          transparent={true}
          roughness={0.08}
          ior={1.5}
          emissive={isSelected ? '#00F0FF' : '#000000'}
          emissiveIntensity={isSelected ? 0.3 : 0}
        />
      </mesh>

      {/* Window Sill */}
      <mesh position={[0, -win.height / 2, 0.02]}>
        <boxGeometry args={[win.width + 0.1, 0.04, 0.14]} />
        <meshStandardMaterial color="#E2E8F0" roughness={0.4} />
      </mesh>
    </group>
  );
};
