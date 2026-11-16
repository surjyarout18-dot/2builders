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
      {/* 1. Botanical Potted Plant (Fiddle Leaf / Monstera - PadSpan Atlas style) */}
      {item.asset_id.includes('plant') || item.name.toLowerCase().includes('plant') ? (
        <group>
          {/* Ceramic Planter Pot */}
          <mesh position={[0, h * 0.22, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[w * 0.42, w * 0.35, h * 0.44, 24]} />
            <meshStandardMaterial color="#E2E8F0" roughness={0.3} metalness={0.05} />
          </mesh>
          {/* Pot Rim Accent */}
          <mesh position={[0, h * 0.43, 0]}>
            <torusGeometry args={[w * 0.42, 0.02, 12, 24]} />
            <meshStandardMaterial color="#CBD5E1" roughness={0.4} />
          </mesh>
          {/* Potting Soil */}
          <mesh position={[0, h * 0.42, 0]}>
            <cylinderGeometry args={[w * 0.4, w * 0.4, 0.04, 16]} />
            <meshStandardMaterial color="#271810" roughness={0.9} />
          </mesh>
          {/* Plant Stem / Trunk */}
          <mesh position={[0, h * 0.65, 0]} castShadow>
            <cylinderGeometry args={[0.025, 0.035, h * 0.55, 12]} />
            <meshStandardMaterial color="#3E2723" roughness={0.8} />
          </mesh>
          {/* Broad Architectural Leaves at varied angles */}
          {[0, 60, 120, 180, 240, 300].map((deg, i) => {
            const rad = (deg * Math.PI) / 180;
            const leafH = h * (0.6 + (i % 3) * 0.12);
            return (
              <group key={`leaf_${i}`} position={[0, leafH, 0]} rotation={[0.3, rad, 0.4]}>
                <mesh position={[0, 0, w * 0.35]} rotation={[-Math.PI / 4, 0, 0]} castShadow>
                  <sphereGeometry args={[w * 0.22, 12, 8]} />
                  <meshStandardMaterial
                    color={i % 2 === 0 ? '#15803D' : '#16A34A'}
                    roughness={0.4}
                  />
                </mesh>
              </group>
            );
          })}
        </group>
      ) : item.asset_id.includes('rug') || item.name.toLowerCase().includes('rug') ? (
        // 2. Decorative Woven Area Rug (PadSpan Atlas style)
        <group position={[0, 0.005, 0]}>
          {/* Rug Base */}
          <mesh receiveShadow>
            <boxGeometry args={[w, 0.012, d]} />
            <meshStandardMaterial
              color={color}
              roughness={0.95}
              metalness={0.0}
            />
          </mesh>
          {/* Border Trim Accent */}
          <mesh position={[0, 0.007, 0]} receiveShadow>
            <boxGeometry args={[w * 0.92, 0.002, d * 0.92]} />
            <meshStandardMaterial
              color="#F1F5F9"
              roughness={0.9}
            />
          </mesh>
          {/* Inner Medallion Pattern */}
          <mesh position={[0, 0.009, 0]} receiveShadow>
            <boxGeometry args={[w * 0.75, 0.002, d * 0.75]} />
            <meshStandardMaterial
              color={color === '#475569' ? '#F59E0B' : '#0284C7'}
              roughness={0.9}
              transparent
              opacity={0.35}
            />
          </mesh>
        </group>
      ) : item.asset_id.includes('tv') || item.name.toLowerCase().includes('tv') ? (
        // 3. Media Credenza & Flat-Panel OLED TV
        <group>
          {/* Wood Console Credenza */}
          <mesh position={[0, h * 0.35, 0]} castShadow receiveShadow>
            <boxGeometry args={[w, h * 0.65, d]} />
            <meshStandardMaterial color="#1E293B" roughness={0.4} metalness={0.1} />
          </mesh>
          {/* Slender Console Legs */}
          {[-w * 0.44, w * 0.44].map((lx, idx) => (
            <mesh key={`cleg_${idx}`} position={[lx, 0.05, 0]} castShadow>
              <cylinderGeometry args={[0.02, 0.015, 0.1, 12]} />
              <meshStandardMaterial color="#D4AF37" metalness={0.8} roughness={0.2} />
            </mesh>
          ))}
          {/* TV Stand Base */}
          <mesh position={[0, h * 0.72, 0]} castShadow>
            <boxGeometry args={[w * 0.35, 0.02, d * 0.5]} />
            <meshStandardMaterial color="#0F172A" metalness={0.8} roughness={0.2} />
          </mesh>
          {/* TV Screen Panel */}
          <mesh position={[0, h * 1.35, 0]} castShadow>
            <boxGeometry args={[w * 0.85, h * 1.1, 0.04]} />
            <meshStandardMaterial color="#050811" roughness={0.1} metalness={0.7} />
          </mesh>
          {/* TV Screen Display Glow Accent */}
          <mesh position={[0, h * 1.35, 0.022]}>
            <planeGeometry args={[w * 0.82, h * 1.05]} />
            <meshBasicMaterial color="#0284C7" transparent opacity={0.15} />
          </mesh>
        </group>
      ) : item.asset_id.includes('lamp') || item.name.toLowerCase().includes('lamp') ? (
        // 4. Architectural Floor Lamp with Warm Glowing Light
        <group>
          {/* Base Plate */}
          <mesh position={[0, 0.02, 0]} castShadow>
            <cylinderGeometry args={[w * 0.4, w * 0.4, 0.03, 24]} />
            <meshStandardMaterial color="#0F172A" metalness={0.7} roughness={0.3} />
          </mesh>
          {/* Stem Pole */}
          <mesh position={[0, h * 0.5, 0]} castShadow>
            <cylinderGeometry args={[0.018, 0.018, h * 0.95, 12]} />
            <meshStandardMaterial color="#D4AF37" metalness={0.9} roughness={0.2} />
          </mesh>
          {/* Lampshade (Emissive warm fabric) */}
          <mesh position={[0, h * 0.92, 0]} castShadow>
            <cylinderGeometry args={[w * 0.35, w * 0.45, h * 0.22, 24, 1, true]} />
            <meshStandardMaterial
              color="#FEF08A"
              emissive="#F59E0B"
              emissiveIntensity={0.65}
              roughness={0.6}
            />
          </mesh>
          {/* Warm Localized Point Light */}
          <pointLight
            position={[0, h * 0.9, 0]}
            color="#FFAA44"
            intensity={1.2}
            distance={5.0}
            decay={2}
            castShadow
          />
        </group>
      ) : item.asset_id.includes('island') || item.name.toLowerCase().includes('kitchen') ? (
        // 5. Kitchen Island & Barstools
        <group>
          {/* Cabinetry Base */}
          <mesh position={[0, h * 0.45, 0]} castShadow receiveShadow>
            <boxGeometry args={[w * 0.92, h * 0.88, d * 0.85]} />
            <meshStandardMaterial color="#1E293B" roughness={0.5} />
          </mesh>
          {/* Calacatta Quartz Countertop with Overhang */}
          <mesh position={[0, h * 0.94, 0]} castShadow receiveShadow>
            <boxGeometry args={[w, 0.06, d]} />
            <meshStandardMaterial color="#F8FAFC" roughness={0.15} metalness={0.1} />
          </mesh>
          {/* Barstools tucked along overhang */}
          {[-w * 0.25, w * 0.25].map((bx, idx) => (
            <group key={`stool_${idx}`} position={[bx, 0, d * 0.48]}>
              <mesh position={[0, h * 0.65, 0]} castShadow>
                <cylinderGeometry args={[0.18, 0.18, 0.05, 16]} />
                <meshStandardMaterial color="#78350F" roughness={0.6} />
              </mesh>
              <mesh position={[0, h * 0.32, 0]} castShadow>
                <cylinderGeometry args={[0.02, 0.02, h * 0.62, 12]} />
                <meshStandardMaterial color="#0F172A" metalness={0.8} />
              </mesh>
            </group>
          ))}
        </group>
      ) : item.asset_id.includes('bathtub') || item.name.toLowerCase().includes('tub') ? (
        // 6. Freestanding Luxury Bathtub
        <group>
          <mesh position={[0, h * 0.5, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[w * 0.48, w * 0.38, h * 0.95, 32]} />
            <meshStandardMaterial color="#FFFFFF" roughness={0.1} metalness={0.1} />
          </mesh>
          {/* Water Surface inside Tub */}
          <mesh position={[0, h * 0.75, 0]}>
            <cylinderGeometry args={[w * 0.42, w * 0.42, 0.02, 24]} />
            <meshStandardMaterial color="#38BDF8" transparent opacity={0.6} roughness={0.05} />
          </mesh>
          {/* Chrome Freestanding Faucet */}
          <mesh position={[w * 0.42, h * 0.65, 0]} castShadow>
            <cylinderGeometry args={[0.02, 0.02, h * 1.1, 12]} />
            <meshStandardMaterial color="#E2E8F0" metalness={0.9} roughness={0.1} />
          </mesh>
        </group>
      ) : item.asset_id.includes('vanity') || item.name.toLowerCase().includes('vanity') ? (
        // 7. Floating Bathroom Vanity & Illuminated Mirror
        <group>
          {/* Vanity Cabinet */}
          <mesh position={[0, h * 0.4, 0]} castShadow receiveShadow>
            <boxGeometry args={[w, h * 0.75, d]} />
            <meshStandardMaterial color="#334155" roughness={0.5} />
          </mesh>
          {/* Ceramic Basin */}
          <mesh position={[0, h * 0.85, 0]} castShadow>
            <cylinderGeometry args={[w * 0.28, w * 0.22, 0.14, 24]} />
            <meshStandardMaterial color="#FFFFFF" roughness={0.1} />
          </mesh>
          {/* Chrome Tap */}
          <mesh position={[0, h * 0.98, -d * 0.2]} castShadow>
            <cylinderGeometry args={[0.015, 0.015, 0.16, 12]} />
            <meshStandardMaterial color="#E2E8F0" metalness={0.9} roughness={0.1} />
          </mesh>
          {/* Backlit Vanity Mirror */}
          <mesh position={[0, h * 1.7, -d * 0.45]} castShadow>
            <boxGeometry args={[w * 0.85, h * 0.95, 0.03]} />
            <meshStandardMaterial
              color="#F8FAFC"
              emissive="#00F0FF"
              emissiveIntensity={0.2}
              roughness={0.05}
            />
          </mesh>
        </group>
      ) : item.category === 'bedroom' ? (
        // 8. Bed: Mattress + Headboard + Pillows + Duvet
        <group>
          {/* Headboard */}
          <mesh position={[0, h * 0.5, -d * 0.45]} castShadow>
            <boxGeometry args={[w, h, 0.1]} />
            <meshStandardMaterial color="#1E293B" roughness={0.7} />
          </mesh>
          {/* Mattress Base */}
          <mesh position={[0, h * 0.3, 0.05]} castShadow receiveShadow>
            <boxGeometry args={[w * 0.95, h * 0.45, d * 0.88]} />
            <meshStandardMaterial
              color={isSelected ? '#00F0FF' : color}
              roughness={0.6}
              emissive={isSelected ? '#00F0FF' : '#000000'}
              emissiveIntensity={isSelected ? 0.3 : 0}
            />
          </mesh>
          {/* Duvet / Quilt */}
          <mesh position={[0, h * 0.38, d * 0.12]} castShadow receiveShadow>
            <boxGeometry args={[w * 0.92, 0.1, d * 0.65]} />
            <meshStandardMaterial color="#F1F5F9" roughness={0.85} />
          </mesh>
          {/* Pillows */}
          <mesh position={[-w * 0.25, h * 0.58, -d * 0.25]}>
            <boxGeometry args={[w * 0.38, 0.12, 0.35]} />
            <meshStandardMaterial color="#FFFFFF" roughness={0.8} />
          </mesh>
          <mesh position={[w * 0.25, h * 0.58, -d * 0.25]}>
            <boxGeometry args={[w * 0.38, 0.12, 0.35]} />
            <meshStandardMaterial color="#FFFFFF" roughness={0.8} />
          </mesh>
        </group>
      ) : item.category === 'living' && item.asset_id.includes('sofa') ? (
        // 9. Sofa: Seat base + Backrest + Armrests + Throw Cushions
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
          {/* Throw Cushion */}
          <mesh position={[-w * 0.35, h * 0.52, -d * 0.18]} rotation={[0, 0.3, 0.2]} castShadow>
            <boxGeometry args={[0.35, 0.35, 0.12]} />
            <meshStandardMaterial color="#F59E0B" roughness={0.8} />
          </mesh>
        </group>
      ) : item.category === 'dining' || item.asset_id.includes('table') ? (
        // 10. Table: Top + 4 Legs + Chairs
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
          {/* Chairs on sides */}
          {[-1, 1].map((sz, idx) => (
            <group key={`chair_${idx}`} position={[0, 0, sz * (d * 0.65)]}>
              <mesh position={[0, h * 0.45, 0]} castShadow>
                <boxGeometry args={[w * 0.4, 0.04, 0.38]} />
                <meshStandardMaterial color="#334155" roughness={0.6} />
              </mesh>
              <mesh position={[0, h * 0.75, sz * -0.16]} castShadow>
                <boxGeometry args={[w * 0.38, h * 0.55, 0.04]} />
                <meshStandardMaterial color="#334155" roughness={0.6} />
              </mesh>
            </group>
          ))}
        </group>
      ) : (
        // 11. Generic Parametric Bounding Volume
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
