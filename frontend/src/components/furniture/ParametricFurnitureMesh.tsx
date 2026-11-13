import React from 'react';
import { FurnitureItem } from '../../types/architectural';
import { useFloorPlanStore } from '../../store/useFloorPlanStore';

interface ParametricFurnitureMeshProps {
  item: FurnitureItem;
}

export const ParametricFurnitureMesh: React.FC<ParametricFurnitureMeshProps> = ({ item }) => {
  const { selectedEntity, setSelectedEntity } = useFloorPlanStore();
  const isSelected = selectedEntity.type === 'furniture' && selectedEntity.id === item.id;

  const handleClick = (e: any) => {
    e.stopPropagation();
    setSelectedEntity({ type: 'furniture', id: item.id });
  };

  const { x: w, y: h, z: d } = item.dimensions;
  const color = item.color || '#334155';

  return (
    <group
      position={[item.position.x, item.position.y, item.position.z]}
      rotation={[0, item.rotation_y, 0]}
      onClick={handleClick}
    >
      {/* Category-specific procedural 3D details */}
      {item.category === 'bedroom' ? (
        // Bed: Mattress + Headboard
        <group>
          {/* Headboard */}
          <mesh position={[0, h * 0.5, -d * 0.45]} castShadow>
            <boxGeometry args={[w, h, 0.1]} />
            <meshStandardMaterial color="#1E293B" roughness={0.7} />
          </mesh>
          {/* Mattress */}
          <mesh position={[0, h * 0.3, 0.05]} castShadow receiveShadow>
            <boxGeometry args={[w * 0.95, h * 0.45, d * 0.88]} />
            <meshStandardMaterial
              color={isSelected ? '#00F0FF' : color}
              roughness={0.6}
              emissive={isSelected ? '#00F0FF' : '#000000'}
              emissiveIntensity={isSelected ? 0.3 : 0}
            />
          </mesh>
          {/* Pillows */}
          <mesh position={[-w * 0.25, h * 0.58, -d * 0.25]}>
            <boxGeometry args={[w * 0.38, 0.12, 0.35]} />
            <meshStandardMaterial color="#F8FAFC" roughness={0.8} />
          </mesh>
          <mesh position={[w * 0.25, h * 0.58, -d * 0.25]}>
            <boxGeometry args={[w * 0.38, 0.12, 0.35]} />
            <meshStandardMaterial color="#F8FAFC" roughness={0.8} />
          </mesh>
        </group>
      ) : item.category === 'living' && item.asset_id.includes('sofa') ? (
        // Sofa: Seat base + Backrest + Armrests
        <group>
          {/* Seat Cushion */}
          <mesh position={[0, h * 0.25, 0]} castShadow receiveShadow>
            <boxGeometry args={[w, h * 0.4, d]} />
            <meshStandardMaterial
              color={isSelected ? '#00F0FF' : color}
              roughness={0.7}
              emissive={isSelected ? '#00F0FF' : '#000000'}
              emissiveIntensity={isSelected ? 0.3 : 0}
            />
          </mesh>
          {/* Backrest */}
          <mesh position={[0, h * 0.65, -d * 0.38]} castShadow>
            <boxGeometry args={[w, h * 0.55, d * 0.24]} />
            <meshStandardMaterial color={isSelected ? '#00F0FF' : color} roughness={0.7} />
          </mesh>
          {/* Armrests */}
          <mesh position={[-w * 0.48, h * 0.45, 0]} castShadow>
            <boxGeometry args={[w * 0.12, h * 0.45, d]} />
            <meshStandardMaterial color={isSelected ? '#00F0FF' : color} roughness={0.7} />
          </mesh>
          <mesh position={[w * 0.48, h * 0.45, 0]} castShadow>
            <boxGeometry args={[w * 0.12, h * 0.45, d]} />
            <meshStandardMaterial color={isSelected ? '#00F0FF' : color} roughness={0.7} />
          </mesh>
        </group>
      ) : item.category === 'dining' || item.asset_id.includes('table') ? (
        // Table: Top + 4 Legs
        <group>
          {/* Table Top */}
          <mesh position={[0, h * 0.95, 0]} castShadow receiveShadow>
            <boxGeometry args={[w, 0.05, d]} />
            <meshStandardMaterial
              color={isSelected ? '#00F0FF' : color}
              roughness={0.4}
              emissive={isSelected ? '#00F0FF' : '#000000'}
              emissiveIntensity={isSelected ? 0.3 : 0}
            />
          </mesh>
          {/* 4 Legs */}
          {[-1, 1].map((sx) =>
            [-1, 1].map((sz) => (
              <mesh
                key={`leg_${sx}_${sz}`}
                position={[sx * (w * 0.44), h * 0.45, sz * (d * 0.44)]}
                castShadow
              >
                <boxGeometry args={[0.06, h * 0.9, 0.06]} />
                <meshStandardMaterial color="#1E293B" metalness={0.7} roughness={0.3} />
              </mesh>
            ))
          )}
        </group>
      ) : (
        // Generic Parametric Bounding Volume
        <mesh castShadow receiveShadow>
          <boxGeometry args={[w, h, d]} />
          <meshStandardMaterial
            color={isSelected ? '#00F0FF' : color}
            roughness={0.5}
            metalness={0.1}
            emissive={isSelected ? '#00F0FF' : '#000000'}
            emissiveIntensity={isSelected ? 0.3 : 0}
          />
        </mesh>
      )}

      {/* Selected Indicator Outline Ring */}
      {isSelected && (
        <mesh position={[0, -0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[Math.max(w, d) * 0.55, Math.max(w, d) * 0.6, 32]} />
          <meshBasicMaterial color="#00F0FF" />
        </mesh>
      )}
    </group>
  );
};
