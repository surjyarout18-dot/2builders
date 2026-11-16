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
  const keysPressed = useRef<{ [key: string]: boolean }>({});
  const isMouseDown = useRef<boolean>(false);
  const prevMousePos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const euler = useRef(new THREE.Euler(0, 0, 0, 'YXZ'));
  const playerPos = useRef(new THREE.Vector3(2.5, eyeHeight, 4.0));

  useEffect(() => {
    // Initial camera position inside living area
    camera.position.set(playerPos.current.x, eyeHeight, playerPos.current.z);
    camera.rotation.set(0, 0, 0);

    const onKeyDown = (e: KeyboardEvent) => {
      keysPressed.current[e.code] = true;
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
  }, [camera, gl, eyeHeight]);

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
        return true; // Collision detected!
      }
    }
    return false;
  };

  useFrame((_, delta) => {
    const moveDist = speed * delta;
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

      // Check collision separately for X and Z to slide smoothly along walls
      if (!checkCollision(proposedX, playerPos.current.z)) {
        playerPos.current.x = proposedX;
      }
      if (!checkCollision(playerPos.current.x, proposedZ)) {
        playerPos.current.z = proposedZ;
      }

      camera.position.x = playerPos.current.x;
      camera.position.z = playerPos.current.z;
      camera.position.y = eyeHeight;
    }
  });

  return null;
};
