import React, { useMemo } from 'react';
import * as THREE from 'three';
import { Wall, Opening } from '../types';
import { WallBuilder } from '../geometry/WallBuilder';
import { useProjectStore } from '../store/useProjectStore';

interface WallMeshProps {
  wall: Wall;
  elevation: number;
}

export const WallMesh: React.FC<WallMeshProps> = ({ wall, elevation }) => {
  const selectedEntity = useProjectStore((s) => s.selectedEntity);
  const setSelectedEntity = useProjectStore((s) => s.setSelectedEntity);
  const wireframe = useProjectStore((s) => s.wireframe);
  const renderMode = useProjectStore((s) => s.renderMode);
  const wallCutaway = useProjectStore((s) => s.wallCutaway);

  const isSelected = selectedEntity?.type === 'wall' && selectedEntity.id === wall.id;

  const dx = wall.end[0] - wall.start[0];
  const dy = wall.end[1] - wall.start[1];
  const len = Math.hypot(dx, dy);

  // Angle in horizontal X-Z plane (in Three.js: X is right, Y is up, Z is depth/forward)
  // Mapping 2D (x, y) -> 3D (x, z)
  const angle = Math.atan2(dy, dx);
  const dirX = len > 0 ? dx / len : 1;
  const dirZ = len > 0 ? dy / len : 0;

  // Solid subsegments around openings
  const segments = useMemo(() => {
    return WallBuilder.decomposeWallAroundOpenings(wall);
  }, [wall]);

  if (len < 0.05) return null;

  return (
    <group
      onClick={(e) => {
        e.stopPropagation();
        setSelectedEntity({ type: 'wall', id: wall.id });
      }}
    >
      {/* Solid wall pieces */}
      {segments.map((seg, idx) => {
        const segLen = seg.endOffset - seg.startOffset;
        // In dollhouse cutaway mode, skip lintels above doors/windows so doorways remain open walkthroughs
        if (wallCutaway && seg.bottomElevation > 1.0) return null;

        const rawH = seg.topElevation - seg.bottomElevation;
        const isSill = seg.bottomElevation === 0 && seg.topElevation < 1.0;
        const segH = wallCutaway ? (isSill ? 0.55 : 1.15) : rawH;
        if (segLen < 1e-3 || segH < 1e-3) return null;

        const midOffset = (seg.startOffset + seg.endOffset) / 2.0;
        const posX = wall.start[0] + dirX * midOffset;
        const posY = elevation + (wallCutaway ? 0 : seg.bottomElevation) + segH / 2.0;
        const posZ = wall.start[1] + dirZ * midOffset;

        return (
          <mesh
            key={`seg-${idx}`}
            position={[posX, posY, posZ]}
            rotation={[0, -angle, 0]}
            castShadow
            receiveShadow
          >
            <boxGeometry args={[segLen, segH, wall.thickness]} />
            <meshStandardMaterial
              color={
                isSelected
                  ? '#38bdf8'
                  : renderMode === 'engineering'
                  ? '#ffffff'
                  : wall.type === 'external'
                  ? '#f8fafc'
                  : '#f1f5f9'
              }
              roughness={renderMode === 'engineering' ? 0.95 : 0.6}
              metalness={0.05}
              wireframe={wireframe}
            />
          </mesh>
        );
      })}

      {/* Opening details: Door frames and Window glass (only in full height view) */}
      {!wallCutaway && (wall.openings || []).map((op) => {
        const isOpSelected = selectedEntity?.type === 'opening' && selectedEntity.id === op.id;
        const midOffset = op.offset + op.width / 2.0;
        const posX = wall.start[0] + dirX * midOffset;
        const posY = elevation + op.sillHeight + op.height / 2.0;
        const posZ = wall.start[1] + dirZ * midOffset;

        return (
          <group
            key={op.id}
            position={[posX, posY, posZ]}
            rotation={[0, -angle, 0]}
            onClick={(e) => {
              e.stopPropagation();
              setSelectedEntity({ type: 'opening', id: op.id });
            }}
          >
            {op.type === 'door' ? (
              // Door leaf & frame
              <group>
                {/* Frame */}
                <mesh position={[0, 0, 0]}>
                  <boxGeometry args={[op.width, op.height, wall.thickness * 1.05]} />
                  <meshStandardMaterial
                    color={isOpSelected ? '#38bdf8' : '#78350f'}
                    roughness={0.8}
                    wireframe={wireframe}
                  />
                </mesh>
                {/* Door Panel */}
                <mesh position={[0, 0, 0]}>
                  <boxGeometry args={[op.width * 0.95, op.height * 0.98, 0.04]} />
                  <meshStandardMaterial
                    color={isOpSelected ? '#0284c7' : '#92400e'}
                    roughness={0.6}
                  />
                </mesh>
              </group>
            ) : (
              // Window glass and trim
              <group>
                {/* Frame */}
                <mesh position={[0, 0, 0]}>
                  <boxGeometry args={[op.width, op.height, wall.thickness * 1.02]} />
                  <meshStandardMaterial
                    color={isOpSelected ? '#38bdf8' : '#334155'}
                    roughness={0.5}
                    wireframe={wireframe}
                  />
                </mesh>
                {/* Glass pane */}
                <mesh position={[0, 0, 0]}>
                  <boxGeometry args={[op.width * 0.92, op.height * 0.92, 0.02]} />
                  <meshStandardMaterial
                    color="#67e8f9"
                    transparent
                    opacity={0.45}
                    roughness={0.1}
                    metalness={0.9}
                  />
                </mesh>
              </group>
            )}
          </group>
        );
      })}
    </group>
  );
};

