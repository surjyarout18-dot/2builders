import React, { useMemo } from 'react';
import * as THREE from 'three';
import { Html } from '@react-three/drei';
import { Room } from '../../types/architectural';
import { useFloorPlanStore } from '../../store/useFloorPlanStore';
import { Thermometer, Droplets, Bed, Armchair, Bath, Laptop, Coffee } from 'lucide-react';

interface RoomFloorMeshProps {
  room: Room;
}

export const RoomFloorMesh: React.FC<RoomFloorMeshProps> = ({ room }) => {
  const {
    selectedEntity,
    setSelectedEntity,
    navigateToRoom,
    inhabitants,
    roomClimates,
    floorPerimeterGlow,
    showClimateBadges
  } = useFloorPlanStore();

  const isSelected = selectedEntity.type === 'room' && selectedEntity.id === room.id;
  const climate = roomClimates[room.id] || {
    roomId: room.id,
    temperature: 21.5,
    humidity: 50,
    motionDetected: false
  };

  const roomInhabitants = inhabitants.filter((inh) => inh.roomId === room.id);
  const hasInhabitants = roomInhabitants.length > 0;

  const { shape, centroid, perimeterPoints } = useMemo(() => {
    if (room.polygon.length < 3) {
      return { shape: null, centroid: [0, 0, 0] as [number, number, number], perimeterPoints: [] };
    }

    const s = new THREE.Shape();
    s.moveTo(room.polygon[0].x, room.polygon[0].z);
    let sumX = room.polygon[0].x;
    let sumZ = room.polygon[0].z;

    const pts: THREE.Vector3[] = [];
    pts.push(new THREE.Vector3(room.polygon[0].x, 0.02, room.polygon[0].z));

    for (let i = 1; i < room.polygon.length; i++) {
      s.lineTo(room.polygon[i].x, room.polygon[i].z);
      sumX += room.polygon[i].x;
      sumZ += room.polygon[i].z;
      pts.push(new THREE.Vector3(room.polygon[i].x, 0.02, room.polygon[i].z));
    }
    s.closePath();
    pts.push(new THREE.Vector3(room.polygon[0].x, 0.02, room.polygon[0].z));

    const cx = sumX / room.polygon.length;
    const cz = sumZ / room.polygon.length;

    return { shape: s, centroid: [cx, 0.05, cz] as [number, number, number], perimeterPoints: pts };
  }, [room.polygon]);

  // Floor materials
  const materialProps = useMemo(() => {
    switch (room.floor_material) {
      case 'parquet_herringbone':
        return { color: '#8D5B34', roughness: 0.45, metalness: 0.05 };
      case 'tile_marble':
        return { color: '#F1F5F9', roughness: 0.18, metalness: 0.15 };
      case 'tile_slate':
        return { color: '#334155', roughness: 0.65, metalness: 0.1 };
      case 'concrete_polished':
        return { color: '#64748B', roughness: 0.35, metalness: 0.1 };
      case 'carpet_plush':
        return { color: '#3E4C5E', roughness: 0.95, metalness: 0.0 };
      case 'hardwood_oak':
      default:
        return { color: '#9E7448', roughness: 0.42, metalness: 0.05 };
    }
  }, [room.floor_material]);

  // Floor perimeter outline color (Atlas styling)
  const perimeterColor = useMemo(() => {
    if (isSelected) return '#00F0FF';
    if (hasInhabitants) {
      return roomInhabitants[0].color || '#10B981';
    }
    if (room.room_type.includes('living')) return '#F59E0B'; // Amber
    if (room.room_type.includes('bed')) return '#06B6D4';    // Cyan
    if (room.room_type.includes('bath')) return '#38BDF8';   // Sky
    if (room.room_type.includes('office')) return '#8B5CF6'; // Violet
    return '#10B981'; // Emerald
  }, [isSelected, hasInhabitants, roomInhabitants, room.room_type]);

  const perimeterLineGeom = useMemo(() => {
    if (perimeterPoints.length < 2) return null;
    return new THREE.BufferGeometry().setFromPoints(perimeterPoints);
  }, [perimeterPoints]);

  if (!shape) return null;

  const handleClick = (e: any) => {
    e.stopPropagation();
    setSelectedEntity({ type: 'room', id: room.id });
    navigateToRoom(room.id);
  };

  const getRoomIcon = () => {
    const t = room.room_type.toLowerCase();
    if (t.includes('bed')) return <Bed className="h-3 w-3 text-[#38BDF8]" />;
    if (t.includes('living')) return <Armchair className="h-3 w-3 text-[#F59E0B]" />;
    if (t.includes('bath')) return <Bath className="h-3 w-3 text-[#38BDF8]" />;
    if (t.includes('office')) return <Laptop className="h-3 w-3 text-[#8B5CF6]" />;
    return <Coffee className="h-3 w-3 text-[#10B981]" />;
  };

  return (
    <group onClick={handleClick}>
      {/* 1. Floor Slab Surface */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]} receiveShadow>
        <shapeGeometry args={[shape]} />
        <meshStandardMaterial
          {...materialProps}
          color={isSelected ? '#00F0FF' : materialProps.color}
          emissive={isSelected ? '#00F0FF' : '#000000'}
          emissiveIntensity={isSelected ? 0.25 : 0}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* 2. Floor Slab Edge Skirt (Adds 0.15m architectural slab thickness) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.07, 0]} receiveShadow>
        <extrudeGeometry
          args={[
            shape,
            { depth: 0.14, bevelEnabled: false }
          ]}
        />
        <meshStandardMaterial color="#1E293B" roughness={0.8} />
      </mesh>

      {/* 3. Glowing Floor Perimeter Outline (Atlas Style) */}
      {floorPerimeterGlow && perimeterLineGeom && (
        <primitive object={new THREE.Line(
          perimeterLineGeom,
          new THREE.LineBasicMaterial({
            color: perimeterColor,
            linewidth: 2,
            transparent: true,
            opacity: isSelected ? 0.95 : hasInhabitants ? 0.85 : 0.45
          })
        )} />
      )}

      {/* 4. Warm Architectural Ceiling Light & Proxy Scanner Dome */}
      <group position={[centroid[0], 2.4, centroid[2]]}>
        {/* Warm interior ceiling point light */}
        <pointLight
          color="#FFE8D0"
          intensity={0.95}
          distance={7.5}
          decay={2}
          castShadow
        />
        {/* Ceiling Proxy / Bluetooth Scanner Dome (PadSpan style) */}
        <mesh position={[0, 0, 0]}>
          <sphereGeometry args={[0.07, 16, 16]} />
          <meshStandardMaterial
            color={hasInhabitants ? perimeterColor : "#E2E8F0"}
            emissive={hasInhabitants ? perimeterColor : "#FFE8D0"}
            emissiveIntensity={hasInhabitants ? 0.8 : 0.2}
          />
        </mesh>
      </group>

      {/* 5. Interactive PadSpan Atlas Floating 3D Room Presence Badge */}
      {showClimateBadges && (
        <Html position={[centroid[0], 1.45, centroid[2]]} center distanceFactor={18}>
          <div
            onClick={handleClick}
            className={`group pointer-events-auto cursor-pointer select-none rounded-xl border p-2 text-center shadow-2xl backdrop-blur-xl transition-all duration-200 hover:scale-105 ${
              isSelected
                ? 'border-[#00F0FF] bg-[#0A0E1A]/95 shadow-[0_0_25px_rgba(0,240,255,0.45)]'
                : 'border-[#1F2942]/90 bg-[#070A14]/90 hover:border-[#38BDF8]/60 hover:bg-[#0B1020]/95'
            }`}
          >
            {/* Top Row: Room Icon + Name */}
            <div className="flex items-center justify-center gap-1.5 whitespace-nowrap text-xs font-semibold text-[#F1F5F9]">
              {getRoomIcon()}
              <span>{room.name}</span>
            </div>

            {/* Middle Row: Climate Readout & Motion */}
            <div className="mt-1 flex items-center justify-center gap-2 font-mono text-[10px]">
              <span className="flex items-center gap-0.5 text-[#F59E0B]">
                <Thermometer className="h-2.5 w-2.5" />
                <span>{climate.temperature.toFixed(1)}°</span>
              </span>
              <span className="flex items-center gap-0.5 text-[#38BDF8]">
                <Droplets className="h-2.5 w-2.5" />
                <span>{climate.humidity}%</span>
              </span>
              <span className="text-[#64748B]">•</span>
              <span className="text-[#94A3B8]">{(room.area_sqm || 0).toFixed(1)}m²</span>
            </div>

            {/* Bottom Row: Inhabitant Badges if present */}
            {hasInhabitants && (
              <div className="mt-1.5 flex flex-wrap items-center justify-center gap-1 pt-1 border-t border-[#1F2942]/70">
                {roomInhabitants.map((inh) => (
                  <span
                    key={inh.id}
                    className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-mono font-medium shadow-sm"
                    style={{
                      backgroundColor: `${inh.color}22`,
                      color: inh.color,
                      border: `1px solid ${inh.color}55`
                    }}
                  >
                    <span className="h-1.5 w-1.5 rounded-full animate-ping" style={{ backgroundColor: inh.color }} />
                    <span>{inh.name}</span>
                    <span className="opacity-75">({inh.role})</span>
                  </span>
                ))}
              </div>
            )}
          </div>
        </Html>
      )}
    </group>
  );
};
