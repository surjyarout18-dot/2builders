import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useFloorPlanStore } from '../../store/useFloorPlanStore';
import { PointXZ, Wall, Door, Window, Stair, Column, Room } from '../../types/architectural';
import { Toolbar2D } from './Toolbar2D';
import { CalibrationModal } from './CalibrationModal';

export const Canvas2D: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const {
    model,
    activeTool,
    setActiveTool,
    selectedEntity,
    setSelectedEntity,
    updateWall,
    addWall,
    addDoor,
    addWindow,
    addStair,
    addColumn,
    addRoom,
    activeFloorIndex,
    underlayImage,
    showDetectionOverlay,
    unitSystem
  } = useFloorPlanStore();

  const floor = model.floors[activeFloorIndex] || model.floors[0] || {
    id: 'floor_0',
    walls: [],
    doors: [],
    windows: [],
    rooms: [],
    furniture: [],
    stairs: [],
    columns: []
  };

  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 120, y: 100 });
  const [zoom, setZoom] = useState<number>(45); // Screen pixels per meter
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const [lastMousePos, setLastMousePos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [snapToGrid, setSnapToGrid] = useState<boolean>(true);

  // Drawing state
  const [drawingStart, setDrawingStart] = useState<PointXZ | null>(null);
  const [currentMouseWorld, setCurrentMouseWorld] = useState<PointXZ>({ x: 0, z: 0 });
  const [measureStart, setMeasureStart] = useState<PointXZ | null>(null);
  const [measureEnd, setMeasureEnd] = useState<PointXZ | null>(null);
  const [isCalibrationOpen, setIsCalibrationOpen] = useState<boolean>(false);

  // Convert screen coordinates to world coordinates (meters)
  const screenToWorld = useCallback((sx: number, sy: number): PointXZ => {
    const wx = (sx - pan.x) / zoom;
    const wz = (sy - pan.y) / zoom;
    if (snapToGrid) {
      const snapStep = 0.25; // 25cm precision snap
      return {
        x: Math.round(wx / snapStep) * snapStep,
        z: Math.round(wz / snapStep) * snapStep,
      };
    }
    return { x: wx, z: wz };
  }, [pan, zoom, snapToGrid]);

  // Convert world coordinates (meters) to screen coordinates
  const worldToScreen = useCallback((wx: number, wz: number): { x: number; y: number } => {
    return {
      x: wx * zoom + pan.x,
      y: wz * zoom + pan.y,
    };
  }, [pan, zoom]);

  const handleResetView = useCallback(() => {
    setPan({ x: 120, y: 100 });
    setZoom(45);
  }, []);

  // Format length according to unitSystem
  const formatLength = useCallback((meters: number): string => {
    if (unitSystem === 'imperial') {
      const totalInches = Math.round(meters * 39.3701);
      const feet = Math.floor(totalInches / 12);
      const inches = totalInches % 12;
      return `${feet}' ${inches}"`;
    }
    return `${meters.toFixed(2)}m`;
  }, [unitSystem]);

  // Main 2D rendering loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;

    // 1. Clear canvas
    ctx.fillStyle = '#0A0D14';
    ctx.fillRect(0, 0, width, height);

    // 2. CAD Grid
    const meterStep = zoom;
    const startX = pan.x % meterStep;
    const startY = pan.y % meterStep;

    // Minor grid (0.5m)
    ctx.strokeStyle = '#121A2B';
    ctx.lineWidth = 1;
    const halfStep = meterStep / 2;
    for (let x = pan.x % halfStep; x < width; x += halfStep) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = pan.y % halfStep; y < height; y += halfStep) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Major grid (1.0m)
    ctx.strokeStyle = '#1F2942';
    ctx.lineWidth = 1;
    for (let x = startX; x < width; x += meterStep) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = startY; y < height; y += meterStep) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Axes
    const origin = worldToScreen(0, 0);
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = '#EF4444';
    ctx.beginPath();
    ctx.moveTo(origin.x, origin.y);
    ctx.lineTo(origin.x + 35, origin.y);
    ctx.stroke();
    ctx.strokeStyle = '#10B981';
    ctx.beginPath();
    ctx.moveTo(origin.x, origin.y);
    ctx.lineTo(origin.x, origin.y + 35);
    ctx.stroke();

    // 3. Render Rooms
    (floor.rooms || []).forEach((room) => {
      if (room.polygon.length < 3) return;
      ctx.beginPath();
      const firstPt = worldToScreen(room.polygon[0].x, room.polygon[0].z);
      ctx.moveTo(firstPt.x, firstPt.y);
      for (let i = 1; i < room.polygon.length; i++) {
        const pt = worldToScreen(room.polygon[i].x, room.polygon[i].z);
        ctx.lineTo(pt.x, pt.y);
      }
      ctx.closePath();

      const isSelected = selectedEntity.type === 'room' && selectedEntity.id === room.id;
      ctx.fillStyle = isSelected ? 'rgba(0, 240, 255, 0.18)' : 'rgba(22, 31, 51, 0.65)';
      ctx.fill();
      ctx.strokeStyle = isSelected ? '#00F0FF' : '#1F2942';
      ctx.lineWidth = isSelected ? 2 : 1;
      ctx.stroke();

      let cx = 0, cz = 0;
      room.polygon.forEach((pt) => { cx += pt.x; cz += pt.z; });
      cx /= room.polygon.length;
      cz /= room.polygon.length;
      const centerScr = worldToScreen(cx, cz);

      ctx.fillStyle = '#F1F5F9';
      ctx.font = '600 12px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(room.name, centerScr.x, centerScr.y - 4);
      ctx.fillStyle = '#00F0FF';
      ctx.font = '400 10px monospace';
      ctx.fillText(
        unitSystem === 'metric'
          ? `${room.area_sqm.toFixed(1)} m²`
          : `${room.area_sqft.toFixed(0)} sqft`,
        centerScr.x,
        centerScr.y + 12
      );
    });

    // 4. Render Walls
    (floor.walls || []).forEach((wall) => {
      const p1 = worldToScreen(wall.start.x, wall.start.z);
      const p2 = worldToScreen(wall.end.x, wall.end.z);
      const isSelected = selectedEntity.type === 'wall' && selectedEntity.id === wall.id;
      const wallThickScr = Math.max(3, wall.thickness * zoom);

      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.strokeStyle = isSelected ? '#00F0FF' : wall.wall_type === 'exterior' ? '#E2E8F0' : '#94A3B8';
      ctx.lineWidth = wallThickScr;
      ctx.lineCap = 'square';
      ctx.stroke();

      // Centerline
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.strokeStyle = isSelected ? '#0A0D14' : 'rgba(10, 13, 20, 0.4)';
      ctx.lineWidth = 1;
      ctx.stroke();

      if (isSelected) {
        ctx.fillStyle = '#00F0FF';
        ctx.beginPath();
        ctx.arc(p1.x, p1.y, 5, 0, Math.PI * 2);
        ctx.arc(p2.x, p2.y, 5, 0, Math.PI * 2);
        ctx.fill();

        const midX = (p1.x + p2.x) / 2;
        const midY = (p1.y + p2.y) / 2;
        const lenMeters = Math.hypot(wall.end.x - wall.start.x, wall.end.z - wall.start.z);
        ctx.fillStyle = '#00F0FF';
        ctx.font = '500 11px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(formatLength(lenMeters), midX, midY - 10);
      }
    });

    // 5. Render Windows
    (floor.windows || []).forEach((win) => {
      const pos = worldToScreen(win.position.x, win.position.z);
      const winHalfScr = (win.width * zoom) / 2;
      const isSelected = selectedEntity.type === 'window' && selectedEntity.id === win.id;

      ctx.save();
      ctx.translate(pos.x, pos.y);
      ctx.fillStyle = isSelected ? '#00F0FF' : '#10B981';
      ctx.fillRect(-winHalfScr, -4, win.width * zoom, 8);
      ctx.strokeStyle = '#0A0D14';
      ctx.lineWidth = 1;
      ctx.strokeRect(-winHalfScr, -4, win.width * zoom, 8);
      ctx.restore();
    });

    // 6. Render Doors
    (floor.doors || []).forEach((door) => {
      const pos = worldToScreen(door.position.x, door.position.z);
      const doorRadiusScr = door.width * zoom;
      const isSelected = selectedEntity.type === 'door' && selectedEntity.id === door.id;

      ctx.save();
      ctx.translate(pos.x, pos.y);
      ctx.beginPath();
      ctx.arc(0, 0, doorRadiusScr, 0, Math.PI / 2);
      ctx.strokeStyle = isSelected ? '#00F0FF' : '#F59E0B';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 3]);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(doorRadiusScr, 0);
      ctx.lineWidth = 3;
      ctx.strokeStyle = isSelected ? '#00F0FF' : '#F59E0B';
      ctx.stroke();
      ctx.restore();
    });

    // 7. Render Stairs
    (floor.stairs || []).forEach((stair) => {
      const p1 = worldToScreen(stair.start.x, stair.start.z);
      const p2 = worldToScreen(stair.end.x, stair.end.z);
      const wScr = (stair.width || 0.9) * zoom;
      const risers = stair.risers_count || 14;

      ctx.save();
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const len = Math.hypot(dx, dy);
      const angle = Math.atan2(dy, dx);

      ctx.translate(p1.x, p1.y);
      ctx.rotate(angle);

      // Boundary box
      ctx.strokeStyle = '#CBD5E1';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(0, -wScr / 2, len, wScr);

      // Tread lines
      const stepDist = len / risers;
      ctx.strokeStyle = '#94A3B8';
      ctx.lineWidth = 1;
      for (let i = 1; i < risers; i++) {
        ctx.beginPath();
        ctx.moveTo(i * stepDist, -wScr / 2);
        ctx.lineTo(i * stepDist, wScr / 2);
        ctx.stroke();
      }

      // Direction Arrow (UP)
      ctx.strokeStyle = '#00F0FF';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(stepDist, 0);
      ctx.lineTo(len - stepDist, 0);
      ctx.lineTo(len - stepDist - 8, -5);
      ctx.moveTo(len - stepDist, 0);
      ctx.lineTo(len - stepDist - 8, 5);
      ctx.stroke();

      ctx.restore();
    });

    // 8. Render Columns
    (floor.columns || []).forEach((col) => {
      const pos = worldToScreen(col.position.x, col.position.z);
      const sizeScr = (col.radius_or_size || 0.3) * zoom;

      ctx.save();
      ctx.translate(pos.x, pos.y);
      ctx.fillStyle = '#CBD5E1';
      ctx.strokeStyle = '#00F0FF';
      ctx.lineWidth = 1.5;

      if (col.shape === 'round') {
        ctx.beginPath();
        ctx.arc(0, 0, sizeScr / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      } else {
        ctx.fillRect(-sizeScr / 2, -sizeScr / 2, sizeScr, sizeScr);
        ctx.strokeRect(-sizeScr / 2, -sizeScr / 2, sizeScr, sizeScr);
      }

      // Center crosshair
      ctx.strokeStyle = '#0A0D14';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-sizeScr / 2, 0); ctx.lineTo(sizeScr / 2, 0);
      ctx.moveTo(0, -sizeScr / 2); ctx.lineTo(0, sizeScr / 2);
      ctx.stroke();

      ctx.restore();
    });

    // 9. Render Furniture
    (floor.furniture || []).forEach((item) => {
      const pos = worldToScreen(item.position.x, item.position.z);
      const wScr = item.dimensions.x * zoom;
      const dScr = item.dimensions.z * zoom;
      const isSelected = selectedEntity.type === 'furniture' && selectedEntity.id === item.id;

      ctx.save();
      ctx.translate(pos.x, pos.y);
      ctx.rotate(item.rotation_y);

      ctx.fillStyle = isSelected ? 'rgba(0, 240, 255, 0.3)' : 'rgba(51, 65, 85, 0.7)';
      ctx.fillRect(-wScr / 2, -dScr / 2, wScr, dScr);
      ctx.strokeStyle = isSelected ? '#00F0FF' : '#64748B';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(-wScr / 2, -dScr / 2, wScr, dScr);

      ctx.fillStyle = '#F1F5F9';
      ctx.font = '500 9px Inter';
      ctx.textAlign = 'center';
      ctx.fillText(item.name, 0, 3);
      ctx.restore();
    });

    // 10. Live Drawing Feedback (Wall & Rect Room)
    if (activeTool === 'wall' && drawingStart) {
      const p1 = worldToScreen(drawingStart.x, drawingStart.z);
      const p2 = worldToScreen(currentMouseWorld.x, currentMouseWorld.z);

      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.strokeStyle = '#00F0FF';
      ctx.lineWidth = 0.20 * zoom;
      ctx.lineCap = 'square';
      ctx.stroke();

      const dx = currentMouseWorld.x - drawingStart.x;
      const dz = currentMouseWorld.z - drawingStart.z;
      const distM = Math.hypot(dx, dz);
      const angleDeg = Math.round(Math.atan2(dz, dx) * (180 / Math.PI));

      ctx.fillStyle = '#00F0FF';
      ctx.font = '600 12px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`${formatLength(distM)} (${angleDeg}°)`, (p1.x + p2.x) / 2, (p1.y + p2.y) / 2 - 14);
    } else if (activeTool === 'rect_room' && drawingStart) {
      const p1 = worldToScreen(drawingStart.x, drawingStart.z);
      const p2 = worldToScreen(currentMouseWorld.x, currentMouseWorld.z);
      const rx = Math.min(p1.x, p2.x);
      const ry = Math.min(p1.y, p2.y);
      const rw = Math.abs(p2.x - p1.x);
      const rh = Math.abs(p2.y - p1.y);

      ctx.fillStyle = 'rgba(0, 240, 255, 0.12)';
      ctx.fillRect(rx, ry, rw, rh);
      ctx.strokeStyle = '#00F0FF';
      ctx.lineWidth = 2;
      ctx.strokeRect(rx, ry, rw, rh);

      const wMeters = Math.abs(currentMouseWorld.x - drawingStart.x);
      const dMeters = Math.abs(currentMouseWorld.z - drawingStart.z);
      ctx.fillStyle = '#00F0FF';
      ctx.font = '600 12px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`${formatLength(wMeters)} × ${formatLength(dMeters)} (${(wMeters * dMeters).toFixed(1)} m²)`, rx + rw / 2, ry + rh / 2);
    } else if (activeTool === 'stair' && drawingStart) {
      const p1 = worldToScreen(drawingStart.x, drawingStart.z);
      const p2 = worldToScreen(currentMouseWorld.x, currentMouseWorld.z);
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.strokeStyle = '#A855F7';
      ctx.lineWidth = 0.9 * zoom;
      ctx.stroke();
    }

    // 11. Measure / Dimension Tool
    if (measureStart && measureEnd) {
      const p1 = worldToScreen(measureStart.x, measureStart.z);
      const p2 = worldToScreen(measureEnd.x, measureEnd.z);

      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.strokeStyle = '#F59E0B';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.stroke();
      ctx.setLineDash([]);

      const dist = Math.hypot(measureEnd.x - measureStart.x, measureEnd.z - measureStart.z);
      ctx.fillStyle = '#F59E0B';
      ctx.font = 'bold 12px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(formatLength(dist), (p1.x + p2.x) / 2, (p1.y + p2.y) / 2 - 10);
    }

    // 12. AI Detection Overlay
    if (showDetectionOverlay) {
      ctx.fillStyle = 'rgba(0, 240, 255, 0.08)';
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = '#00F0FF';
      ctx.font = '600 12px monospace';
      ctx.textAlign = 'right';
      ctx.fillText("● AI Computer Vision Detection Overlay Active", width - 20, 30);
    }

  }, [pan, zoom, model, activeFloorIndex, selectedEntity, activeTool, drawingStart, currentMouseWorld, measureStart, measureEnd, showDetectionOverlay, worldToScreen, unitSystem, formatLength]);

  // Mouse event handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const worldPos = screenToWorld(sx, sy);

    if (e.button === 1 || e.altKey) {
      setIsPanning(true);
      setLastMousePos({ x: e.clientX, y: e.clientY });
      return;
    }

    if (e.button === 0) {
      if (activeTool === 'select') {
        let found = false;
        // Check walls
        for (const w of floor.walls || []) {
          const d = pointToSegmentDistance(worldPos.x, worldPos.z, w.start.x, w.start.z, w.end.x, w.end.z);
          if (d <= w.thickness / 2 + 0.15) {
            setSelectedEntity({ type: 'wall', id: w.id });
            found = true;
            break;
          }
        }
        // Check doors
        if (!found) {
          for (const d of floor.doors || []) {
            const dist = Math.hypot(worldPos.x - d.position.x, worldPos.z - d.position.z);
            if (dist <= d.width / 2 + 0.2) {
              setSelectedEntity({ type: 'door', id: d.id });
              found = true;
              break;
            }
          }
        }
        // Check rooms
        if (!found) {
          for (const r of floor.rooms || []) {
            if (isPointInPolygon(worldPos, r.polygon)) {
              setSelectedEntity({ type: 'room', id: r.id });
              found = true;
              break;
            }
          }
        }
        if (!found) {
          setSelectedEntity({ type: null, id: null });
        }
      } else if (activeTool === 'wall') {
        if (!drawingStart) {
          setDrawingStart(worldPos);
        } else {
          const dist = Math.hypot(worldPos.x - drawingStart.x, worldPos.z - drawingStart.z);
          if (dist > 0.3) {
            const newWall: Wall = {
              id: `wall_${Date.now()}`,
              floor_id: floor.id,
              start: drawingStart,
              end: worldPos,
              thickness: 0.20,
              height: floor.height || 2.80,
              wall_type: 'interior'
            };
            addWall(newWall);
          }
          setDrawingStart(null);
        }
      } else if (activeTool === 'rect_room') {
        if (!drawingStart) {
          setDrawingStart(worldPos);
        } else {
          const xMin = Math.min(drawingStart.x, worldPos.x);
          const xMax = Math.max(drawingStart.x, worldPos.x);
          const zMin = Math.min(drawingStart.z, worldPos.z);
          const zMax = Math.max(drawingStart.z, worldPos.z);

          if (xMax - xMin > 1.0 && zMax - zMin > 1.0) {
            const h = floor.height || 2.80;
            // 4 walls
            addWall({ id: `w_rect_${Date.now()}_1`, floor_id: floor.id, start: { x: xMin, z: zMin }, end: { x: xMax, z: zMin }, thickness: 0.20, height: h, wall_type: 'exterior' });
            addWall({ id: `w_rect_${Date.now()}_2`, floor_id: floor.id, start: { x: xMax, z: zMin }, end: { x: xMax, z: zMax }, thickness: 0.20, height: h, wall_type: 'exterior' });
            addWall({ id: `w_rect_${Date.now()}_3`, floor_id: floor.id, start: { x: xMax, z: zMax }, end: { x: xMin, z: zMax }, thickness: 0.20, height: h, wall_type: 'exterior' });
            addWall({ id: `w_rect_${Date.now()}_4`, floor_id: floor.id, start: { x: xMin, z: zMax }, end: { x: xMin, z: zMin }, thickness: 0.20, height: h, wall_type: 'exterior' });

            const areaM2 = (xMax - xMin) * (zMax - zMin);
            const newRoom: Room = {
              id: `rm_${Date.now()}`,
              floor_id: floor.id,
              name: "New Room",
              room_type: "living_room",
              area_sqm: Math.round(areaM2 * 10) / 10,
              area_sqft: Math.round(areaM2 * 10.7639 * 10) / 10,
              floor_material: "hardwood_oak",
              wall_color: "#F8FAFC",
              polygon: [
                { x: xMin, z: zMin },
                { x: xMax, z: zMin },
                { x: xMax, z: zMax },
                { x: xMin, z: zMax }
              ]
            };
            addRoom(newRoom);
            setActiveTool('select');
          }
          setDrawingStart(null);
        }
      } else if (activeTool === 'door') {
        for (const w of floor.walls || []) {
          const d = pointToSegmentDistance(worldPos.x, worldPos.z, w.start.x, w.start.z, w.end.x, w.end.z);
          if (d <= 0.4) {
            const newDoor: Door = {
              id: `door_${Date.now()}`,
              floor_id: floor.id,
              wall_id: w.id,
              position: worldPos,
              width: 0.90,
              height: 2.10,
              swing_direction: 'left',
              door_type: 'single'
            };
            addDoor(newDoor);
            setActiveTool('select');
            break;
          }
        }
      } else if (activeTool === 'window') {
        for (const w of floor.walls || []) {
          const d = pointToSegmentDistance(worldPos.x, worldPos.z, w.start.x, w.start.z, w.end.x, w.end.z);
          if (d <= 0.4) {
            const newWindow: Window = {
              id: `win_${Date.now()}`,
              floor_id: floor.id,
              wall_id: w.id,
              position: worldPos,
              width: 1.40,
              height: 1.40,
              sill_height: 0.90,
              window_type: 'casement'
            };
            addWindow(newWindow);
            setActiveTool('select');
            break;
          }
        }
      } else if (activeTool === 'stair') {
        if (!drawingStart) {
          setDrawingStart(worldPos);
        } else {
          const newStair: Stair = {
            id: `stair_${Date.now()}`,
            floor_id: floor.id,
            start: drawingStart,
            end: worldPos,
            width: 0.9,
            height: floor.height || 2.8,
            risers_count: 14,
            stair_type: 'straight'
          };
          addStair(newStair);
          setDrawingStart(null);
          setActiveTool('select');
        }
      } else if (activeTool === 'column') {
        const newCol: Column = {
          id: `col_${Date.now()}`,
          floor_id: floor.id,
          position: worldPos,
          radius_or_size: 0.35,
          height: floor.height || 2.8,
          shape: 'square'
        };
        addColumn(newCol);
        setActiveTool('select');
      } else if (activeTool === 'measure' || activeTool === 'dimension') {
        if (!measureStart) {
          setMeasureStart(worldPos);
          setMeasureEnd(worldPos);
        } else {
          setMeasureEnd(worldPos);
        }
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isPanning) {
      const dx = e.clientX - lastMousePos.x;
      const dy = e.clientY - lastMousePos.y;
      setPan((p) => ({ x: p.x + dx, y: p.y + dy }));
      setLastMousePos({ x: e.clientX, y: e.clientY });
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const world = screenToWorld(sx, sy);
    setCurrentMouseWorld(world);

    if ((activeTool === 'measure' || activeTool === 'dimension') && measureStart) {
      setMeasureEnd(world);
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.12 : 0.88;
    const newZoom = Math.min(200, Math.max(10, zoom * zoomFactor));

    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    setPan({
      x: mouseX - (mouseX - pan.x) * (newZoom / zoom),
      y: mouseY - (mouseY - pan.y) * (newZoom / zoom),
    });
    setZoom(newZoom);
  };

  return (
    <div ref={containerRef} className="relative h-full w-full select-none overflow-hidden bg-[#0A0D14]">
      {/* 2D Toolbar */}
      <Toolbar2D
        onOpenCalibration={() => setIsCalibrationOpen(true)}
        onResetView={handleResetView}
        snapToGrid={snapToGrid}
        onToggleSnap={() => setSnapToGrid(!snapToGrid)}
      />

      {/* Main Canvas */}
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
        className="h-full w-full cursor-crosshair"
      />

      {/* Calibration Modal */}
      <CalibrationModal
        isOpen={isCalibrationOpen}
        onClose={() => setIsCalibrationOpen(false)}
        pixelDistance={250}
      />

      {/* Coordinate & Scale HUD */}
      <div className="absolute bottom-4 left-4 z-20 flex items-center gap-3 rounded-lg border border-[#1F2942] bg-[#111726]/90 px-3 py-1.5 text-xs text-[#94A3B8] backdrop-blur-md font-mono">
        <span>X: {formatLength(currentMouseWorld.x)}</span>
        <span>Z: {formatLength(currentMouseWorld.z)}</span>
        <span className="text-[#00F0FF]">Scale: {model.calibration.meters_per_pixel.toFixed(4)} m/px</span>
        <span className="text-[#10B981]">{floor.name}</span>
      </div>
    </div>
  );
};

function pointToSegmentDistance(px: number, pz: number, x1: number, z1: number, x2: number, z2: number): number {
  const dx = x2 - x1;
  const dz = z2 - z1;
  const lenSq = dx * dx + dz * dz;
  if (lenSq === 0) return Math.hypot(px - x1, pz - z1);
  const u = Math.max(0, Math.min(1, ((px - x1) * dx + (pz - z1) * dz) / lenSq));
  const nx = x1 + u * dx;
  const nz = z1 + u * dz;
  return Math.hypot(px - nx, pz - nz);
}

function isPointInPolygon(point: PointXZ, polygon: PointXZ[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x, zi = polygon[i].z;
    const xj = polygon[j].x, zj = polygon[j].z;
    const intersect = ((zi > point.z) !== (zj > point.z)) &&
      (point.x < (xj - xi) * (point.z - zi) / (zj - zi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}
