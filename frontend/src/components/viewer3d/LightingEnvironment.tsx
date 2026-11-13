import React from 'react';
import { useFloorPlanStore } from '../../store/useFloorPlanStore';

export const LightingEnvironment: React.FC = () => {
  const { dayNightMode, model } = useFloorPlanStore();
  const isNight = dayNightMode === 'night';

  const floor = model.floors[0] || { rooms: [] };

  return (
    <>
      {isNight ? (
        // Night Scene: Dark sky, moon, and warm interior architectural spotlights
        <>
          <color attach="background" args={['#050811']} />
          <ambientLight intensity={0.15} color="#1E293B" />
          <directionalLight
            position={[15, 25, 10]}
            intensity={0.3}
            color="#94A3B8"
            castShadow
            shadow-mapSize-width={1024}
            shadow-mapSize-height={1024}
          />
          {/* Warm pendant / recessed lights over each room */}
          {floor.rooms.map((room) => {
            if (room.polygon.length === 0) return null;
            let cx = 0, cz = 0;
            room.polygon.forEach((pt) => { cx += pt.x; cz += pt.z; });
            cx /= room.polygon.length;
            cz /= room.polygon.length;
            return (
              <group key={`light_${room.id}`} position={[cx, 2.4, cz]}>
                <pointLight
                  intensity={2.2}
                  distance={8}
                  decay={2}
                  color="#FEF08A"
                  castShadow
                />
                {/* Glowing light fixture */}
                <mesh>
                  <sphereGeometry args={[0.08, 16, 16]} />
                  <meshBasicMaterial color="#FEF08A" />
                </mesh>
              </group>
            );
          })}
        </>
      ) : (
        // Day Scene: Crisp architectural sunlight with soft ground bounce
        <>
          <color attach="background" args={['#0A0D14']} />
          <ambientLight intensity={0.65} color="#E2E8F0" />
          <directionalLight
            position={[18, 30, 22]}
            intensity={1.6}
            color="#FFFBEB"
            castShadow
            shadow-mapSize-width={2048}
            shadow-mapSize-height={2048}
            shadow-camera-near={0.5}
            shadow-camera-far={80}
            shadow-camera-left={-20}
            shadow-camera-right={20}
            shadow-camera-top={20}
            shadow-camera-bottom={-20}
            shadow-bias={-0.0001}
          />
          <directionalLight position={[-15, 10, -15]} intensity={0.4} color="#93C5FD" />
        </>
      )}

      {/* Architectural ground grid plane */}
      <gridHelper
        args={[60, 60, '#1F2942', '#111726']}
        position={[0, -0.01, 0]}
      />
    </>
  );
};
