import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useFloorPlanStore } from '../../store/useFloorPlanStore';
import { PointXZ, Wall, Door, Window } from '../../types/architectural';
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
    underlayImage,
    showDetectionOverlay
  } = useFloorPlanStore();

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
  const [calibPoints, setCalibPoints] = useState<PointXZ[]>([]);

  // Convert screen coordinates to world coordinates (meters)
  const screenToWorld = useCallback((sx: number, sy: number): PointXZ => {
    const wx = (sx - pan.x) / zoom;
    const wz = (sy - pan.y) / zoom;
    if (snapToGrid) {
      const snapStep = 0.25; // 25cm snap grid
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

  // Reset view to center geometry
  const handleResetView = useCallback(() => {
    setPan({ x: 120, y: 100 });
    setZoom(45);
  }, []);

  // Main rendering loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle high DPI
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;

    // 1. Clear background (CAD Dark)
    ctx.fillStyle = '#0A0D14';
    ctx.fillRect(0, 0, width, height);

    // 2. Render CAD Precision Grid
    const meterStep = zoom; // Screen pixels for 1 meter
    const startX = pan.x % meterStep;
    const startY = pan.y % meterStep;

    // Minor grid (every 0.5m)
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

    // Major grid (every 1.0m)
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

    // World origin axes (X in red, Z in green)
    const origin = worldToScreen(0, 0);
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = '#EF4444';
    ctx.beginPath();
    ctx.moveTo(origin.x, origin.y);
    ctx.lineTo(origin.x + 40, origin.y);
    ctx.stroke();
    ctx.strokeStyle = '#10B981';
    ctx.beginPath();
    ctx.moveTo(origin.x, origin.y);
    ctx.lineTo(origin.x, origin.y + 40);
    ctx.stroke();

    const floor = model.floors[0] || { walls: [], doors: [], windows: [], rooms: [], furniture: [] };

    // 3. Render Rooms (Translucent floor fills with tag)
    floor.rooms.forEach((room) => {
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

      // Room Center Tag
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
      ctx.fillText(`${room.area_sqm} m² (${room.area_sqft} sqft)`, centerScr.x, centerScr.y + 12);
    });

    // 4. Render Walls with parametric thickness
    floor.walls.forEach((wall) => {
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

      // Centerline accent
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.strokeStyle = isSelected ? '#0A0D14' : 'rgba(10, 13, 20, 0.4)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Selected handles at endpoints
      if (isSelected) {
        ctx.fillStyle = '#00F0FF';
        ctx.beginPath();
        ctx.arc(p1.x, p1.y, 5, 0, Math.PI * 2);
        ctx.arc(p2.x, p2.y, 5, 0, Math.PI * 2);
        ctx.fill();

        // Dimension text
        const midX = (p1.x + p2.x) / 2;
        const midY = (p1.y + p2.y) / 2;
        const lenMeters = Math.hypot(wall.end.x - wall.start.x, wall.end.z - wall.start.z);
        ctx.fillStyle = '#00F0FF';
        ctx.font = '500 11px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`${lenMeters.toFixed(2)}m`, midX, midY - 10);
      }
    });

    // 5. Render Windows (Double line CAD representation)
    floor.windows.forEach((win) => {
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

    // 6. Render Doors (Door panel + 90° swing arc)
    floor.doors.forEach((door) => {
      const pos = worldToScreen(door.position.x, door.position.z);
      const doorRadiusScr = door.width * zoom;
      const isSelected = selectedEntity.type === 'door' && selectedEntity.id === door.id;

      ctx.save();
      ctx.translate(pos.x, pos.y);

      // Swing arc
      ctx.beginPath();
      ctx.arc(0, 0, doorRadiusScr, 0, Math.PI / 2);
      ctx.strokeStyle = isSelected ? '#00F0FF' : '#F59E0B';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 3]);
      ctx.stroke();
      ctx.setLineDash([]);

      // Door leaf (panel)
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(doorRadiusScr, 0);
      ctx.lineWidth = 3;
      ctx.strokeStyle = isSelected ? '#00F0FF' : '#F59E0B';
      ctx.stroke();

      ctx.restore();
    });

    // 7. Render Furniture footprints
    floor.furniture.forEach((item) => {
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

    // 8. Live Drawing Feedback (Wall drawing rubber-band)
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

      // Dimension and angle HUD
      const dx = currentMouseWorld.x - drawingStart.x;
      const dz = currentMouseWorld.z - drawingStart.z;
      const distM = Math.hypot(dx, dz);
      const angleDeg = Math.round(Math.atan2(dz, dx) * (180 / Math.PI));

      const midX = (p1.x + p2.x) / 2;
      const midY = (p1.y + p2.y) / 2;
      ctx.fillStyle = '#00F0FF';
      ctx.font = '600 12px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`${distM.toFixed(2)}m (${angleDeg}°)`, midX, midY - 14);
    }

    // 9. Measure Tool Dimension Line
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
      ctx.fillText(`${dist.toFixed(2)}m (${(dist * 3.28084).toFixed(2)}ft)`, (p1.x + p2.x) / 2, (p1.y + p2.y) / 2 - 10);
    }

    // 10. AI Detection Overlay Mode
    if (showDetectionOverlay) {
      ctx.fillStyle = 'rgba(0, 240, 255, 0.08)';
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = '#00F0FF';
      ctx.font = '600 12px monospace';
      ctx.textAlign = 'right';
      ctx.fillText("● AI Computer Vision Detection Overlay Active", width - 20, 30);
    }

  }, [pan, zoom, model, selectedEntity, activeTool, drawingStart, currentMouseWorld, measureStart, measureEnd, showDetectionOverlay, worldToScreen]);

  // Mouse event handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const worldPos = screenToWorld(sx, sy);

    // Pan with middle mouse button or Alt key
    if (e.button === 1 || e.altKey) {
      setIsPanning(true);
      setLastMousePos({ x: e.clientX, y: e.clientY });
      return;
    }

    if (e.button === 0) {
      if (activeTool === 'select') {
        // Find clicked entity
        const floor = model.floors[0];
        let found = false;

        // Check walls
        for (const w of floor.walls) {
          const d = pointToSegmentDistance(worldPos.x, worldPos.z, w.start.x, w.start.z, w.end.x, w.end.z);
          if (d <= w.thickness / 2 + 0.15) {
            setSelectedEntity({ type: 'wall', id: w.id });
            found = true;
            break;
          }
        }

        // Check doors
        if (!found) {
          for (const d of floor.doors) {
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
          for (const r of floor.rooms) {
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
          // Finish wall
          const dist = Math.hypot(worldPos.x - drawingStart.x, worldPos.z - drawingStart.z);
          if (dist > 0.3) {
            const newWall: Wall = {
              id: `wall_${Date.now()}`,
              floor_id: 'floor_0',
              start: drawingStart,
              end: worldPos,
              thickness: 0.20,
              height: 2.80,
              wall_type: 'interior'
            };
            addWall(newWall);
          }
          setDrawingStart(null);
        }
      } else if (activeTool === 'door') {
        // Place door on wall
        const floor = model.floors[0];
        for (const w of floor.walls) {
          const d = pointToSegmentDistance(worldPos.x, worldPos.z, w.start.x, w.start.z, w.end.x, w.end.z);
          if (d <= 0.4) {
            const newDoor: Door = {
              id: `door_${Date.now()}`,
              floor_id: 'floor_0',
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
        // Place window on wall
        const floor = model.floors[0];
        for (const w of floor.walls) {
          const d = pointToSegmentDistance(worldPos.x, worldPos.z, w.start.x, w.start.z, w.end.x, w.end.z);
          if (d <= 0.4) {
            const newWindow: Window = {
              id: `win_${Date.now()}`,
              floor_id: 'floor_0',
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
      } else if (activeTool === 'measure') {
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

    if (activeTool === 'measure' && measureStart) {
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

    // Zoom centered on cursor
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
        <span>X: {currentMouseWorld.x.toFixed(2)}m</span>
        <span>Z: {currentMouseWorld.z.toFixed(2)}m</span>
        <span className="text-[#00F0FF]">Scale: {model.calibration.meters_per_pixel.toFixed(4)} m/px</span>
      </div>
    </div>
  );
};

// Geometric helper functions
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
