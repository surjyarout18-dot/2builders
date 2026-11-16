import React, { useRef, useEffect } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useFloorPlanStore } from '../../store/useFloorPlanStore';
import { Wall } from '../../types/architectural';

interface FirstPersonWalkthroughProps {
  walls: Wall[];
  eyeHeight?: number;
  speed?: number;
}

export const FirstPersonWalkthrough: React.FC<FirstPersonWalkthroughProps> = ({
  walls,
  eyeHeight = 1.65,
  speed = 3.5
}) => {
  const { camera, gl } = useThree();
  const {
    walkthroughPosition,
    setWalkthroughPosition,
    autoTourTarget,
    isAutoTouring,
    nextTourRoom,
    pauseAutoTour
  } = useFloorPlanStore();

  const keysPressed = useRef<{ [key: string]: boolean }>({});
  const isMouseDown = useRef<boolean>(false);
  const prevMousePos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const euler = useRef(new THREE.Euler(0, 0, 0, 'YXZ'));
  
  // Initialize player position from store or reasonable default
  const playerPos = useRef(
    new THREE.Vector3(
      walkthroughPosition?.x ?? 2.5,
      eyeHeight,
      walkthroughPosition?.z ?? 4.0
    )
  );

  // Auto-tour panoramic room dwell timer
  const dwellTimer = useRef<number>(0);
  const lastSyncTime = useRef<number>(0);

  useEffect(() => {
    camera.position.set(playerPos.current.x, eyeHeight, playerPos.current.z);
    
    // Set initial orientation
    if (walkthroughPosition?.angle !== undefined) {
      euler.current.y = walkthroughPosition.angle;
      camera.quaternion.setFromEuler(euler.current);
    }

    const onKeyDown = (e: KeyboardEvent) => {
      keysPressed.current[e.code] = true;
      // If user starts driving manually with WASD or arrows, pause auto tour
      if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        if (useFloorPlanStore.getState().isAutoTouring) {
          pauseAutoTour();
        }
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      keysPressed.current[e.code] = false;
    };

    const onMouseDown = (e: MouseEvent) => {
      isMouseDown.current = true;
      prevMousePos.current = { x: e.clientX, y: e.clientY };
    };

    const onMouseUp = () => {
      isMouseDown.current = false;
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isMouseDown.current) return;
      const dx = e.clientX - prevMousePos.current.x;
      const dy = e.clientY - prevMousePos.current.y;
      prevMousePos.current = { x: e.clientX, y: e.clientY };

      euler.current.setFromQuaternion(camera.quaternion);
      euler.current.y -= dx * 0.003;
      euler.current.x -= dy * 0.003;
      // Clamp vertical look angle
      euler.current.x = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, euler.current.x));
      camera.quaternion.setFromEuler(euler.current);
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    const dom = gl.domElement;
    dom.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('mousemove', onMouseMove);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      dom.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('mousemove', onMouseMove);
    };
  }, [camera, gl, eyeHeight, pauseAutoTour]);

  // Wall collision check helper
  const checkCollision = (px: number, pz: number, radius: number = 0.35): boolean => {
    for (const w of walls) {
      const x1 = w.start.x, z1 = w.start.z;
      const x2 = w.end.x, z2 = w.end.z;
      const dx = x2 - x1;
      const dz = z2 - z1;
      const lenSq = dx * dx + dz * dz;
      if (lenSq === 0) continue;

      let t = ((px - x1) * dx + (pz - z1) * dz) / lenSq;
      t = Math.max(0, Math.min(1, t));
      const closestX = x1 + t * dx;
      const closestZ = z1 + t * dz;

      const distSq = (px - closestX) * (px - closestX) + (pz - closestZ) * (pz - closestZ);
      if (distSq < radius * radius) {
        return true; // Collision detected
      }
    }
    return false;
  };

  useFrame((_, delta) => {
    const moveDist = speed * delta;
    let moved = false;

    // 1. Check if user is actively driving manually
    const isManualInput =
      keysPressed.current['KeyW'] ||
      keysPressed.current['ArrowUp'] ||
      keysPressed.current['KeyS'] ||
      keysPressed.current['ArrowDown'] ||
      keysPressed.current['KeyA'] ||
      keysPressed.current['ArrowLeft'] ||
      keysPressed.current['KeyD'] ||
      keysPressed.current['ArrowRight'];

    if (isManualInput) {
      // Clear target if user intervenes manually
      if (autoTourTarget) {
        useFloorPlanStore.setState({ autoTourTarget: null });
      }

      const forward = new THREE.Vector3();
      camera.getWorldDirection(forward);
      forward.y = 0;
      forward.normalize();

      const right = new THREE.Vector3();
      right.crossVectors(camera.up, forward).negate().normalize();

      const moveVector = new THREE.Vector3(0, 0, 0);

      if (keysPressed.current['KeyW'] || keysPressed.current['ArrowUp']) {
        moveVector.add(forward.clone().multiplyScalar(moveDist));
      }
      if (keysPressed.current['KeyS'] || keysPressed.current['ArrowDown']) {
        moveVector.add(forward.clone().multiplyScalar(-moveDist));
      }
      if (keysPressed.current['KeyA'] || keysPressed.current['ArrowLeft']) {
        moveVector.add(right.clone().multiplyScalar(-moveDist));
      }
      if (keysPressed.current['KeyD'] || keysPressed.current['ArrowRight']) {
        moveVector.add(right.clone().multiplyScalar(moveDist));
      }

      if (moveVector.lengthSq() > 0) {
        const proposedX = playerPos.current.x + moveVector.x;
        const proposedZ = playerPos.current.z + moveVector.z;

        // Slide along walls if collision on one axis
        if (!checkCollision(proposedX, playerPos.current.z)) {
          playerPos.current.x = proposedX;
          moved = true;
        }
        if (!checkCollision(playerPos.current.x, proposedZ)) {
          playerPos.current.z = proposedZ;
          moved = true;
        }
      }
    } else if (autoTourTarget) {
      // 2. Smooth Auto-Navigation / Auto-Tour Gliding
      const dx = autoTourTarget.x - playerPos.current.x;
      const dz = autoTourTarget.z - playerPos.current.z;
      const dist = Math.hypot(dx, dz);

      if (dist > 0.18) {
        // Dwell reset while travelling
        dwellTimer.current = 0;

        const navSpeed = speed * 1.25;
        const step = Math.min(dist, navSpeed * delta);
        const dirX = dx / dist;
        const dirZ = dz / dist;

        playerPos.current.x += dirX * step;
        playerPos.current.z += dirZ * step;
        moved = true;

        // Smoothly orient camera towards travel direction
        const targetYaw = Math.atan2(dirX, dirZ);
        let angleDiff = (targetYaw - euler.current.y) % (Math.PI * 2);
        if (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
        if (angleDiff > Math.PI) angleDiff -= Math.PI * 2;

        euler.current.y += angleDiff * Math.min(1.0, delta * 3.5);
        euler.current.x = THREE.MathUtils.lerp(euler.current.x, 0, delta * 3.0);
        camera.quaternion.setFromEuler(euler.current);
      } else {
        // Target reached!
        if (isAutoTouring) {
          // Perform smooth 360-degree panoramic inspection of the room
          dwellTimer.current += delta;
          euler.current.y += delta * 0.45; // Gentle cinematic pan
          camera.quaternion.setFromEuler(euler.current);

          // After 3.5 seconds of panoramic viewing, transition to next room
          if (dwellTimer.current >= 3.5) {
            dwellTimer.current = 0;
            nextTourRoom();
          }
        } else {
          // One-off navigation point reached
          useFloorPlanStore.setState({ autoTourTarget: null });
        }
      }
    }

    // Apply updated position to camera
    camera.position.x = playerPos.current.x;
    camera.position.z = playerPos.current.z;
    camera.position.y = eyeHeight;

    // 3. Sync player position and direction to store for Minimap HUD
    const now = performance.now();
    if (now - lastSyncTime.current > 33) { // ~30 fps sync
      lastSyncTime.current = now;
      const forwardDir = new THREE.Vector3();
      camera.getWorldDirection(forwardDir);
      // Horizontal heading in radians
      const heading = Math.atan2(forwardDir.x, forwardDir.z);

      setWalkthroughPosition({
        x: playerPos.current.x,
        z: playerPos.current.z,
        angle: heading
      });
    }
  });

  return null;
};
