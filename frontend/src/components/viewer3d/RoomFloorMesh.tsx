import React, { useMemo } from 'react';
import * as THREE from 'three';
import { Html } from '@react-three/drei';
import { Room } from '../../types/architectural';
import { useFloorPlanStore } from '../../store/useFloorPlanStore';

interface RoomFloorMeshProps {
  room: Room;
}

export const RoomFloorMesh: React.FC<RoomFloorMeshProps> = ({ room }) => {
  const { selectedEntity, setSelectedEntity } = useFloorPlanStore();
  const isSelected = selectedEntity.type === 'room' && selectedEntity.id === room.id;

  const { shape, centroid } = useMemo(() => {
    if (room.polygon.length < 3) {
      return { shape: null, centroid: [0, 0, 0] as [number, number, number] };
    }

    const s = new THREE.Shape();
    s.moveTo(room.polygon[0].x, room.polygon[0].z);
    let sumX = room.polygon[0].x;
    let sumZ = room.polygon[0].z;

    for (let i = 1; i < room.polygon.length; i++) {
      s.lineTo(room.polygon[i].x, room.polygon[i].z);
      sumX += room.polygon[i].x;
      sumZ += room.polygon[i].z;
    }
    s.closePath();

    const cx = sumX / room.polygon.length;
    const cz = sumZ / room.polygon.length;

    return { shape: s, centroid: [cx, 0.05, cz] as [number, number, number] };
  }, [room.polygon]);

  if (!shape) return null;

  // Floor materials
  const materialProps = useMemo(() => {
    switch (room.floor_material) {
      case 'parquet_herringbone':
        return { color: '#9A6B43', roughness: 0.45, metalness: 0.05 };
      case 'tile_marble':
        return { color: '#F1F5F9', roughness: 0.15, metalness: 0.2 };
      case 'tile_slate':
        return { color: '#334155', roughness: 0.6, metalness: 0.1 };
      case 'concrete_polished':
        return { color: '#64748B', roughness: 0.35, metalness: 0.1 };
      case 'carpet_plush':
        return { color: '#475569', roughness: 0.95, metalness: 0.0 };
      case 'hardwood_oak':
      default:
        return { color: '#B5885C', roughness: 0.4, metalness: 0.05 };
    }
  }, [room.floor_material]);

  const handleClick = (e: any) => {
    e.stopPropagation();
    setSelectedEntity({ type: 'room', id: room.id });
  };

  return (
    <group onClick={handleClick}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]} receiveShadow>
        <shapeGeometry args={[shape]} />
        <meshStandardMaterial
          {...materialProps}
          color={isSelected ? '#00F0FF' : materialProps.color}
          emissive={isSelected ? '#00F0FF' : '#000000'}
          emissiveIntensity={isSelected ? 0.2 : 0}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Floating 3D Room Badge */}
      <Html position={centroid} center distanceFactor={15}>
        <div className="pointer-events-none rounded-lg border border-[#1F2942]/80 bg-[#111726]/85 px-2.5 py-1 text-center shadow-lg backdrop-blur-md">
          <div className="text-[11px] font-semibold text-[#F1F5F9] whitespace-nowrap">{room.name}</div>
          <div className="font-mono text-[9px] text-[#00F0FF]">{room.area_sqm} m²</div>
        </div>
      </Html>
    </group>
  );
};
