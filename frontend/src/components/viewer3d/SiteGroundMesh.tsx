import React, { useMemo } from 'react';
import * as THREE from 'three';
import { Site } from '../../types/architectural';

interface SiteGroundMeshProps {
  site?: Site;
}

export const SiteGroundMesh: React.FC<SiteGroundMeshProps> = ({ site }) => {
  if (!site) return null;

  const w = site.plot_width || 22;
  const d = site.plot_depth || 26;

  const boxGeo = useMemo(() => new THREE.BoxGeometry(w, 0.4, d), [w, d]);

  return (
    <group position={[5, -0.05, 4]}>
      {/* Lawn / Ground plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, -0.02, 0]}>
        <planeGeometry args={[w, d]} />
        <meshStandardMaterial color="#142B24" roughness={0.9} />
      </mesh>

      {/* Driveway */}
      {site.has_driveway && (
        <mesh
          rotation={[-Math.PI / 2, 0, 0]}
          position={[-w / 3.5, 0.01, d / 3]}
          receiveShadow
        >
          <planeGeometry args={[4.0, d / 2]} />
          <meshStandardMaterial color="#1E293B" roughness={0.7} />
        </mesh>
      )}

      {/* Rear Patio / Decking */}
      {site.has_garden && (
        <mesh
          rotation={[-Math.PI / 2, 0, 0]}
          position={[1.5, 0.01, -d / 3.2]}
          receiveShadow
        >
          <planeGeometry args={[7.0, 3.5]} />
          <meshStandardMaterial color="#334155" roughness={0.6} />
        </mesh>
      )}

      {/* Boundary Perimeter Lines */}
      {site.has_boundary_wall && (
        <lineSegments position={[0, 0.2, 0]}>
          <edgesGeometry args={[boxGeo]} />
          <lineBasicMaterial color="#00F0FF" opacity={0.3} transparent />
        </lineSegments>
      )}
    </group>
  );
};
