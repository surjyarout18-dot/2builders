import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { Project } from '../types';
import { WallBuilder } from '../geometry/WallBuilder';

export class ModelExporter {
  static exportGLB(project: Project): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const scene = new THREE.Scene();
      scene.name = project.name;

      for (const floor of project.floors) {
        const floorGroup = new THREE.Group();
        floorGroup.name = floor.name;

        // Add walls
        for (const wall of floor.walls) {
          const dx = wall.end[0] - wall.start[0];
          const dy = wall.end[1] - wall.start[1];
          const len = Math.hypot(dx, dy);
          if (len < 0.05) continue;

          const angle = Math.atan2(dy, dx);
          const dirX = dx / len;
          const dirZ = dy / len;
          const segments = WallBuilder.decomposeWallAroundOpenings(wall);

          for (const seg of segments) {
            const segLen = seg.endOffset - seg.startOffset;
            const segH = seg.topElevation - seg.bottomElevation;
            if (segLen < 1e-3 || segH < 1e-3) continue;

            const midOffset = (seg.startOffset + seg.endOffset) / 2.0;
            const posX = wall.start[0] + dirX * midOffset;
            const posY = floor.elevation + seg.bottomElevation + segH / 2.0;
            const posZ = wall.start[1] + dirZ * midOffset;

            const geom = new THREE.BoxGeometry(segLen, segH, wall.thickness);
            const mat = new THREE.MeshStandardMaterial({
              color: wall.type === 'external' ? 0xd1d5db : 0x9ca3af,
              roughness: 0.6
            });
            const mesh = new THREE.Mesh(geom, mat);
            mesh.position.set(posX, posY, posZ);
            mesh.rotation.set(0, -angle, 0);
            floorGroup.add(mesh);
          }
        }

        // Add floor slab
        if (floor.walls.length > 0) {
          let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
          for (const w of floor.walls) {
            minX = Math.min(minX, w.start[0], w.end[0]);
            maxX = Math.max(maxX, w.start[0], w.end[0]);
            minZ = Math.min(minZ, w.start[1], w.end[1]);
            maxZ = Math.max(maxZ, w.start[1], w.end[1]);
          }
          const w = maxX - minX + 1.0;
          const d = maxZ - minZ + 1.0;
          const slabGeom = new THREE.BoxGeometry(w, 0.15, d);
          const slabMat = new THREE.MeshStandardMaterial({ color: 0x374151, roughness: 0.8 });
          const slabMesh = new THREE.Mesh(slabGeom, slabMat);
          slabMesh.position.set((minX + maxX) / 2, floor.elevation - 0.075, (minZ + maxZ) / 2);
          floorGroup.add(slabMesh);
        }

        scene.add(floorGroup);
      }

      const exporter = new GLTFExporter();
      exporter.parse(
        scene,
        (gltf) => {
          const blob = new Blob([gltf as ArrayBuffer], { type: 'model/gltf-binary' });
          resolve(blob);
        },
        (error) => {
          reject(error);
        },
        { binary: true }
      );
    });
  }

  static downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

