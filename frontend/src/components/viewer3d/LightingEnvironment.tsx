import React from 'react';
import { useFloorPlanStore } from '../../store/useFloorPlanStore';

export const LightingEnvironment: React.FC = () => {
  const { dayNightMode } = useFloorPlanStore();
  const isNight = dayNightMode === 'night';

  return (
    <>
      {/* Sleek Deep Architectural Canvas (PadSpan Atlas style) */}
      <color attach="background" args={[isNight ? '#03050B' : '#070A14']} />

      {/* Balanced Soft Ambient Illumination */}
      <ambientLight intensity={isNight ? 0.35 : 0.65} color="#D1D5DB" />

      {/* Primary Key Architectural Sunlight */}
      <directionalLight
        position={[20, 32, 18]}
        intensity={isNight ? 0.4 : 1.6}
        color={isNight ? '#94A3B8' : '#FFFBF5'}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={0.5}
        shadow-camera-far={80}
        shadow-camera-left={-22}
        shadow-camera-right={22}
        shadow-camera-top={22}
        shadow-camera-bottom={-22}
        shadow-bias={-0.00015}
      />

      {/* Cool Shadow Fill / Sky Bounce */}
      <directionalLight
        position={[-18, 16, -16]}
        intensity={isNight ? 0.2 : 0.45}
        color="#93C5FD"
      />

      {/* Architectural ground grid plane with subtle blueprint styling */}
      <gridHelper
        args={[80, 80, '#1E293B', '#0F172A']}
        position={[0, -0.015, 0]}
      />
    </>
  );
};
