import React from 'react';
import * as THREE from 'three';

interface FurnitureMeshProps {
  type: 'bed' | 'sofa' | 'dining' | 'table' | 'chair' | 'kitchen' | 'toilet' | 'tv_unit';
  position: [number, number, number];
  rotation?: number;
}

export const FurnitureMesh: React.FC<FurnitureMeshProps> = ({ type, position, rotation = 0 }) => {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {type === 'bed' && (
        <group>
          {/* Wooden Bed Base */}
          <mesh position={[0, 0.15, 0]} castShadow receiveShadow>
            <boxGeometry args={[1.8, 0.3, 2.0]} />
            <meshStandardMaterial color="#78350f" roughness={0.7} />
          </mesh>
          {/* Mattress */}
          <mesh position={[0, 0.38, 0.05]} castShadow receiveShadow>
            <boxGeometry args={[1.65, 0.22, 1.85]} />
            <meshStandardMaterial color="#f8fafc" roughness={0.9} />
          </mesh>
          {/* Headboard */}
          <mesh position={[0, 0.6, -0.95]} castShadow receiveShadow>
            <boxGeometry args={[1.8, 0.9, 0.1]} />
            <meshStandardMaterial color="#451a03" roughness={0.6} />
          </mesh>
          {/* Pillows */}
          <mesh position={[-0.45, 0.52, -0.7]} castShadow>
            <boxGeometry args={[0.55, 0.1, 0.35]} />
            <meshStandardMaterial color="#e2e8f0" roughness={0.8} />
          </mesh>
          <mesh position={[0.45, 0.52, -0.7]} castShadow>
            <boxGeometry args={[0.55, 0.1, 0.35]} />
            <meshStandardMaterial color="#e2e8f0" roughness={0.8} />
          </mesh>
        </group>
      )}

      {type === 'sofa' && (
        <group>
          {/* Main Seat */}
          <mesh position={[0, 0.22, 0]} castShadow receiveShadow>
            <boxGeometry args={[2.0, 0.35, 0.85]} />
            <meshStandardMaterial color="#334155" roughness={0.85} />
          </mesh>
          {/* Backrest */}
          <mesh position={[0, 0.55, -0.35]} castShadow receiveShadow>
            <boxGeometry args={[2.0, 0.45, 0.2]} />
            <meshStandardMaterial color="#1e293b" roughness={0.85} />
          </mesh>
          {/* Armrests */}
          <mesh position={[-0.95, 0.4, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.18, 0.35, 0.85]} />
            <meshStandardMaterial color="#1e293b" roughness={0.85} />
          </mesh>
          <mesh position={[0.95, 0.4, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.18, 0.35, 0.85]} />
            <meshStandardMaterial color="#1e293b" roughness={0.85} />
          </mesh>
        </group>
      )}

      {type === 'dining' && (
        <group>
          {/* Tabletop */}
          <mesh position={[0, 0.75, 0]} castShadow receiveShadow>
            <boxGeometry args={[1.4, 0.05, 0.9]} />
            <meshStandardMaterial color="#92400e" roughness={0.5} />
          </mesh>
          {/* Legs */}
          <mesh position={[-0.6, 0.375, -0.38]} castShadow>
            <boxGeometry args={[0.06, 0.75, 0.06]} />
            <meshStandardMaterial color="#1e293b" />
          </mesh>
          <mesh position={[0.6, 0.375, -0.38]} castShadow>
            <boxGeometry args={[0.06, 0.75, 0.06]} />
            <meshStandardMaterial color="#1e293b" />
          </mesh>
          <mesh position={[-0.6, 0.375, 0.38]} castShadow>
            <boxGeometry args={[0.06, 0.75, 0.06]} />
            <meshStandardMaterial color="#1e293b" />
          </mesh>
          <mesh position={[0.6, 0.375, 0.38]} castShadow>
            <boxGeometry args={[0.06, 0.75, 0.06]} />
            <meshStandardMaterial color="#1e293b" />
          </mesh>
          {/* Chairs */}
          <mesh position={[0, 0.45, -0.55]} castShadow>
            <boxGeometry args={[0.4, 0.45, 0.4]} />
            <meshStandardMaterial color="#475569" roughness={0.7} />
          </mesh>
          <mesh position={[0, 0.45, 0.55]} castShadow>
            <boxGeometry args={[0.4, 0.45, 0.4]} />
            <meshStandardMaterial color="#475569" roughness={0.7} />
          </mesh>
        </group>
      )}

      {type === 'kitchen' && (
        <group>
          {/* Counter base */}
          <mesh position={[0, 0.45, 0]} castShadow receiveShadow>
            <boxGeometry args={[2.2, 0.9, 0.65]} />
            <meshStandardMaterial color="#f1f5f9" roughness={0.4} />
          </mesh>
          {/* Granite countertop */}
          <mesh position={[0, 0.92, 0]} castShadow receiveShadow>
            <boxGeometry args={[2.24, 0.04, 0.68]} />
            <meshStandardMaterial color="#0f172a" roughness={0.2} metalness={0.1} />
          </mesh>
          {/* Sink basin */}
          <mesh position={[-0.5, 0.93, 0]}>
            <boxGeometry args={[0.5, 0.02, 0.4]} />
            <meshStandardMaterial color="#94a3b8" metalness={0.9} roughness={0.2} />
          </mesh>
          {/* Cooktop */}
          <mesh position={[0.5, 0.93, 0]}>
            <boxGeometry args={[0.55, 0.015, 0.45]} />
            <meshStandardMaterial color="#020617" roughness={0.1} metalness={0.8} />
          </mesh>
        </group>
      )}

      {type === 'toilet' && (
        <group>
          {/* Bowl */}
          <mesh position={[0, 0.22, 0.1]} castShadow receiveShadow>
            <cylinderGeometry args={[0.2, 0.18, 0.42, 16]} />
            <meshStandardMaterial color="#ffffff" roughness={0.15} />
          </mesh>
          {/* Cistern tank */}
          <mesh position={[0, 0.5, -0.15]} castShadow receiveShadow>
            <boxGeometry args={[0.42, 0.5, 0.2]} />
            <meshStandardMaterial color="#ffffff" roughness={0.15} />
          </mesh>
        </group>
      )}
    </group>
  );
};

