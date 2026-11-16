import React, { useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { Inhabitant } from '../../types/presence';
import { useFloorPlanStore } from '../../store/useFloorPlanStore';

interface ParametricInhabitantAvatarProps {
  inhabitant: Inhabitant;
  roomCentroid: [number, number, number];
}

export const ParametricInhabitantAvatar: React.FC<ParametricInhabitantAvatarProps> = ({
  inhabitant,
  roomCentroid
}) => {
  const { selectedInhabitantId, setSelectedInhabitantId, navigateToRoom } = useFloorPlanStore();
  const groupRef = useRef<THREE.Group>(null);
  const ringRef = useRef<THREE.Mesh>(null);

  const isSelected = selectedInhabitantId === inhabitant.id;

  const posX = roomCentroid[0] + (inhabitant.positionOffset?.[0] || 0);
  const posY = roomCentroid[1];
  const posZ = roomCentroid[2] + (inhabitant.positionOffset?.[1] || 0);

  // Subtle breathing/floating idle animation
  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (groupRef.current) {
      groupRef.current.position.y = posY + Math.sin(t * 2 + posX) * 0.02;
    }
    if (ringRef.current) {
      const scale = 1 + Math.sin(t * 3) * 0.08;
      ringRef.current.scale.set(scale, scale, 1);
    }
  });

  const handleClick = (e: any) => {
    e.stopPropagation();
    setSelectedInhabitantId(inhabitant.id);
    navigateToRoom(inhabitant.roomId);
  };

  const shirtColor = inhabitant.id === 'inh_jordan'
    ? '#EC4899' // Pink sweater like screenshot
    : inhabitant.id === 'inh_alex'
    ? '#0284C7' // Sky blue
    : inhabitant.id === 'inh_sam'
    ? '#10B981' // Emerald
    : '#8B5CF6'; // Violet

  return (
    <group ref={groupRef} position={[posX, posY, posZ]} onClick={handleClick}>
      {/* Floor Presence Beacon Glow Disk */}
      <mesh
        ref={ringRef}
        position={[0, 0.02, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <ringGeometry args={[0.25, 0.38, 32]} />
        <meshBasicMaterial
          color={inhabitant.color}
          transparent
          opacity={isSelected ? 0.9 : 0.65}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Stylized Humanoid 3D Character (PadSpan Atlas style) */}
      {inhabitant.role !== 'Device' ? (
        <group>
          {/* Shoes / Feet */}
          <mesh position={[-0.08, 0.05, 0]} castShadow>
            <boxGeometry args={[0.08, 0.08, 0.16]} />
            <meshStandardMaterial color="#0F172A" roughness={0.8} />
          </mesh>
          <mesh position={[0.08, 0.05, 0]} castShadow>
            <boxGeometry args={[0.08, 0.08, 0.16]} />
            <meshStandardMaterial color="#0F172A" roughness={0.8} />
          </mesh>

          {/* Legs (Trousers) */}
          <mesh position={[-0.08, 0.45, 0]} castShadow>
            <cylinderGeometry args={[0.05, 0.055, 0.72, 16]} />
            <meshStandardMaterial color="#334155" roughness={0.7} />
          </mesh>
          <mesh position={[0.08, 0.45, 0]} castShadow>
            <cylinderGeometry args={[0.05, 0.055, 0.72, 16]} />
            <meshStandardMaterial color="#334155" roughness={0.7} />
          </mesh>

          {/* Torso / Jacket */}
          <mesh position={[0, 1.12, 0]} castShadow>
            <boxGeometry args={[0.32, 0.58, 0.18]} />
            <meshStandardMaterial
              color={shirtColor}
              roughness={0.6}
              emissive={isSelected ? inhabitant.color : '#000000'}
              emissiveIntensity={isSelected ? 0.2 : 0}
            />
          </mesh>

          {/* Arms */}
          <mesh position={[-0.2, 1.05, 0]} castShadow>
            <cylinderGeometry args={[0.04, 0.045, 0.52, 12]} />
            <meshStandardMaterial color={shirtColor} roughness={0.6} />
          </mesh>
          <mesh position={[0.2, 1.05, 0]} castShadow>
            <cylinderGeometry args={[0.04, 0.045, 0.52, 12]} />
            <meshStandardMaterial color={shirtColor} roughness={0.6} />
          </mesh>

          {/* Head */}
          <mesh position={[0, 1.55, 0]} castShadow>
            <sphereGeometry args={[0.11, 24, 24]} />
            <meshStandardMaterial color="#FBD5BD" roughness={0.5} />
          </mesh>

          {/* Hair / Stylized Trim */}
          <mesh position={[0, 1.62, -0.02]} castShadow>
            <sphereGeometry args={[0.115, 16, 16]} />
            <meshStandardMaterial color="#451A03" roughness={0.8} />
          </mesh>
        </group>
      ) : (
        // Device / Tag Pin (Keys, AirTag)
        <group position={[0, 0.5, 0]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.08, 0.08, 0.04, 24]} />
            <meshStandardMaterial color="#E2E8F0" metalness={0.8} roughness={0.2} />
          </mesh>
          <pointLight color="#8B5CF6" intensity={0.8} distance={2} decay={2} />
        </group>
      )}

      {/* Floating PadSpan Atlas Inhabitant Tag Pill */}
      <Html position={[0, 1.95, 0]} center distanceFactor={14}>
        <div
          onClick={handleClick}
          className={`cursor-pointer select-none whitespace-nowrap rounded-full border px-2.5 py-1 text-center font-mono shadow-2xl backdrop-blur-xl transition-all hover:scale-105 ${
            isSelected
              ? 'border-[#00F0FF] bg-[#00F0FF] text-[#0A0D14] font-bold shadow-[0_0_20px_rgba(0,240,255,0.6)]'
              : 'border-[#334155]/80 bg-[#070A14]/90 text-[#F1F5F9]'
          }`}
        >
          <div className="flex items-center gap-1.5 text-xs font-semibold">
            <span
              className="h-2 w-2 rounded-full animate-ping"
              style={{ backgroundColor: inhabitant.color }}
            />
            <span>{inhabitant.name}</span>
            <span className={`text-[10px] font-normal ${isSelected ? 'text-[#0A0D14]/80' : 'text-[#94A3B8]'}`}>
              • {inhabitant.role}
            </span>
          </div>
          {inhabitant.device && (
            <div className={`text-[9px] ${isSelected ? 'text-[#0A0D14]/80' : 'text-[#64748B]'}`}>
              {inhabitant.device}
            </div>
          )}
        </div>
      </Html>
    </group>
  );
};
