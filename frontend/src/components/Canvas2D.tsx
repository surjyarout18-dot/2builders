import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useProjectStore } from '../store/useProjectStore';
import { Point2D, Wall, Opening } from '../types';
import { CoordinateSystem } from '../geometry/CoordinateSystem';
import { WallBuilder } from '../geometry/WallBuilder';
import { RoomDetector } from '../geometry/RoomDetector';
import { toast } from './Toast';
import { Upload, Zap, Droplets, Lightbulb, Trees, Layers, Compass } from 'lucide-react';

export const Canvas2D: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Store state
  const project = useProjectStore((s) => s.project);
  const activeFloorId = useProjectStore((s) => s.activeFloorId);
  const activeTool = useProjectStore((s) => s.activeTool);
  const selectedEntity = useProjectStore((s) => s.selectedEntity);
  const setSelectedEntity = useProjectStore((s) => s.setSelectedEntity);
  const addWall = useProjectStore((s) => s.addWall);
  const deleteWall = useProjectStore((s) => s.deleteWall);
  const addOpening = useProjectStore((s) => s.addOpening);
  const deleteOpening = useProjectStore((s) => s.deleteOpening);
  const addRoom = useProjectStore((s) => s.addRoom);
  const deleteRoom = useProjectStore((s) => s.deleteRoom);
  const gridSnap = useProjectStore((s) => s.gridSnap);
  const gridSize = useProjectStore((s) => s.gridSize);
  const setStatusMessage = useProjectStore((s) => s.setStatusMessage);
  const activeSpecialLayer = useProjectStore((s) => s.activeSpecialLayer);
  const setActiveSpecialLayer = useProjectStore((s) => s.setActiveSpecialLayer);

  const showBackground = useProjectStore((s) => s.showBackground);
  const setShowBackground = useProjectStore((s) => s.setShowBackground);
  const backgroundOpacity = useProjectStore((s) => s.backgroundOpacity);
  const setBackgroundOpacity = useProjectStore((s) => s.setBackgroundOpacity);
  const backgroundImageUrl = useProjectStore((s) => s.backgroundImageUrl);
  const [bgImage, setBgImage] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    if (!backgroundImageUrl) {
      setBgImage(null);
      return;
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = backgroundImageUrl;
    img.onload = () => setBgImage(img);
  }, [backgroundImageUrl]);

  // Viewport transforms (Pan & Zoom)
  const [zoom, setZoom] = useState<number>(40); // pixels per world meter
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 300, y: 300 });
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Interactive drawing states
  const [wallStartPoint, setWallStartPoint] = useState<Point2D | null>(null);
  const [roomVertices, setRoomVertices] = useState<Point2D[]>([]);
  const [mouseWorld, setMouseWorld] = useState<Point2D>([0, 0]);
  const [snappedPoint, setSnappedPoint] = useState<Point2D | null>(null);
  const [measureStart, setMeasureStart] = useState<Point2D | null>(null);
  const [measuredDist, setMeasuredDist] = useState<number | null>(null);
  const [isCanvasDragging, setIsCanvasDragging] = useState<boolean>(false);
  const [touchDist, setTouchDist] = useState<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const touch = e.touches[0];
      const sx = touch.clientX - rect.left;
      const sy = touch.clientY - rect.top;
      setDragStart({ x: sx, y: sy });
      setIsPanning(true);
      const world = screenToWorld(sx, sy);
      setMouseWorld(world);
    } else if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      setTouchDist(Math.hypot(dx, dy));
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && isPanning) {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const touch = e.touches[0];
      const sx = touch.clientX - rect.left;
      const sy = touch.clientY - rect.top;
      setPan((prev) => ({
        x: prev.x + (sx - dragStart.x),
        y: prev.y + (sy - dragStart.y)
      }));
      setDragStart({ x: sx, y: sy });
      const world = screenToWorld(sx, sy);
      setMouseWorld(world);
    } else if (e.touches.length === 2 && touchDist !== null) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const newDist = Math.hypot(dx, dy);
      const factor = newDist / touchDist;
      setZoom((prev) => Math.min(Math.max(prev * factor, 10), 200));
      setTouchDist(newDist);
    }
  };

  const handleTouchEnd = () => {
    setIsPanning(false);
    setTouchDist(null);
  };

  const handleCanvasDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsCanvasDragging(true);
  };

  const handleCanvasDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsCanvasDragging(false);
  };

  const handleCanvasDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsCanvasDragging(false);
    if (!project || !e.dataTransfer.files || !e.dataTransfer.files[0]) return;

    const file = e.dataTransfer.files[0];
    const formData = new FormData();
    formData.append('file', file);

    setStatusMessage(`Uploading "${file.name}" as blueprint underlay...`);
    try {
      const res = await fetch(`/api/projects/${project.id}/upload`, {
        method: 'POST',
        body: formData
      });
      if (!res.ok) throw new Error('Upload failed');
      const data = await res.json();
      useProjectStore.getState().setBackgroundImageUrl(data.file_path);
      useProjectStore.getState().setShowBackground(true);
      toast.success(`Loaded blueprint underlay "${file.name}"!`);
      setStatusMessage(`Loaded blueprint underlay "${file.name}"`);
    } catch (err: any) {
      toast.error(`Failed to load blueprint: ${err.message}`);
    }
  };

  const activeFloor = project?.floors.find((f) => f.id === activeFloorId) || project?.floors[0];

  // Screen to World transformation
  const screenToWorld = useCallback((sx: number, sy: number): Point2D => {
    const wx = (sx - pan.x) / zoom;
    const wy = (sy - pan.y) / zoom;
    return [Math.round(wx * 1000) / 1000, Math.round(wy * 1000) / 1000];
  }, [pan, zoom]);

  // World to Screen transformation
  const worldToScreen = useCallback((wx: number, wy: number): { x: number; y: number } => {
    return {
      x: wx * zoom + pan.x,
      y: wy * zoom + pan.y
    };
  }, [pan, zoom]);

  // Candidate snap points from existing walls and rooms
  const getSnapCandidates = useCallback((): Point2D[] => {
    if (!activeFloor) return [];
    const pts: Point2D[] = [];
    for (const w of activeFloor.walls) {
      pts.push(w.start);
      pts.push(w.end);
      pts.push([(w.start[0] + w.end[0]) / 2, (w.start[1] + w.end[1]) / 2]);
    }
    for (const r of activeFloor.rooms) {
      for (const p of r.boundary) {
        pts.push(p);
      }
    }
    return pts;
  }, [activeFloor]);

  // Handle Mouse Wheel for Zooming centered around cursor
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const zoomFactor = e.deltaY < 0 ? 1.15 : 0.87;
    const newZoom = Math.min(250, Math.max(8, zoom * zoomFactor));

    // Pan adjust so cursor stays stationary in world coordinates
    const newPanX = mouseX - (mouseX - pan.x) * (newZoom / zoom);
    const newPanY = mouseY - (mouseY - pan.y) * (newZoom / zoom);

    setZoom(newZoom);
    setPan({ x: newPanX, y: newPanY });
  };

  // Mouse Move
  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;

    if (isPanning) {
      setPan({
        x: pan.x + (sx - dragStart.x),
        y: pan.y + (sy - dragStart.y)
      });
      setDragStart({ x: sx, y: sy });
      return;
    }

    let world = screenToWorld(sx, sy);

    // Endpoint snapping
    const candidates = getSnapCandidates();
    const snapResult = CoordinateSystem.snapToPoints(world, candidates, 0.35);

    if (snapResult.snapped) {
      world = snapResult.point;
      setSnappedPoint(world);
    } else if (gridSnap) {
      world = CoordinateSystem.snapToGrid(world, gridSize);
      setSnappedPoint(null);
    } else {
      setSnappedPoint(null);
    }

    setMouseWorld(world);

    if (measureStart) {
      setMeasuredDist(CoordinateSystem.distance(measureStart, world));
    }
  };

  // Mouse Down
  const handleMouseDown = (e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;

    // Middle click or Space/Pan tool -> Pan
    if (e.button === 1 || activeTool === 'pan' || (e.button === 0 && e.altKey)) {
      setIsPanning(true);
      setDragStart({ x: sx, y: sy });
      return;
    }

    if (e.button !== 0) return; // Only left click for drawing/selection

    const clickWorld = snappedPoint || mouseWorld;

    if (activeTool === 'select') {
      // Find clicked wall or opening or room
      let found = false;
      if (activeFloor) {
        // Check walls
        for (const w of activeFloor.walls) {
          const fp = WallBuilder.computeFootprint(w.start, w.end, w.thickness + 0.2);
          const pts = [fp.a1, fp.b1, fp.b2, fp.a2];
          if (RoomDetector.pointInPolygon(clickWorld, pts)) {
            setSelectedEntity({ type: 'wall', id: w.id });
            setStatusMessage(`Selected Wall (Length: ${fp.length.toFixed(2)}m)`);
            found = true;
            break;
          }
        }
        // Check rooms if no wall clicked
        if (!found) {
          for (const r of activeFloor.rooms) {
            if (RoomDetector.pointInPolygon(clickWorld, r.boundary)) {
              setSelectedEntity({ type: 'room', id: r.id });
              setStatusMessage(`Selected ${r.name} (${r.area.toFixed(1)} m²)`);
              found = true;
              break;
            }
          }
        }
      }
      if (!found) {
        setSelectedEntity(null);
      }
    } else if (activeTool === 'delete') {
      if (activeFloor) {
        for (const w of activeFloor.walls) {
          const fp = WallBuilder.computeFootprint(w.start, w.end, w.thickness + 0.2);
          if (RoomDetector.pointInPolygon(clickWorld, [fp.a1, fp.b1, fp.b2, fp.a2])) {
            deleteWall(w.id);
            return;
          }
        }
        for (const r of activeFloor.rooms) {
          if (RoomDetector.pointInPolygon(clickWorld, r.boundary)) {
            deleteRoom(r.id);
            return;
          }
        }
      }
    } else if (activeTool === 'wall') {
      if (!wallStartPoint) {
        setWallStartPoint(clickWorld);
        setStatusMessage(`Wall start set at (${clickWorld[0]}m, ${clickWorld[1]}m). Click to place end point.`);
      } else {
        const len = CoordinateSystem.distance(wallStartPoint, clickWorld);
        if (len >= 0.1) {
          addWall({
            start: wallStartPoint,
            end: clickWorld,
            thickness: 0.20,
            height: activeFloor?.wallHeight || 3.0,
            type: 'external',
            openings: []
          });
          setWallStartPoint(null);
        }
      }
    } else if (activeTool === 'door' || activeTool === 'window') {
      if (activeFloor) {
        for (const w of activeFloor.walls) {
          const fp = WallBuilder.computeFootprint(w.start, w.end, w.thickness + 0.3);
          if (RoomDetector.pointInPolygon(clickWorld, [fp.a1, fp.b1, fp.b2, fp.a2])) {
            // Calculate offset along wall
            const dx = w.end[0] - w.start[0];
            const dy = w.end[1] - w.start[1];
            const len = Math.hypot(dx, dy);
            const ux = dx / len;
            const uy = dy / len;
            const clickDist = (clickWorld[0] - w.start[0]) * ux + (clickWorld[1] - w.start[1]) * uy;
            const width = activeTool === 'door' ? 0.9 : 1.2;
            const clampedOffset = Math.max(0.1, Math.min(len - width - 0.1, clickDist - width / 2));

            addOpening(w.id, {
              type: activeTool,
              offset: Math.round(clampedOffset * 100) / 100,
              width,
              height: activeTool === 'door' ? 2.1 : 1.2,
              sillHeight: activeTool === 'door' ? 0.0 : 0.9
            });
            break;
          }
        }
      }
    } else if (activeTool === 'room') {
      if (roomVertices.length >= 3 && CoordinateSystem.distance(clickWorld, roomVertices[0]) < 0.4) {
        // Close polygon room
        const area = RoomDetector.calculateArea(roomVertices);
        addRoom({
          name: `Room ${activeFloor ? activeFloor.rooms.length + 1 : 1}`,
          boundary: roomVertices,
          area: Math.round(area * 100) / 100
        });
        setRoomVertices([]);
      } else {
        setRoomVertices([...roomVertices, clickWorld]);
        setStatusMessage(`Added vertex ${roomVertices.length + 1}. Click first vertex to close room.`);
      }
    } else if (activeTool === 'measure') {
      if (!measureStart) {
        setMeasureStart(clickWorld);
        setMeasuredDist(0);
      } else {
        const d = CoordinateSystem.distance(measureStart, clickWorld);
        setStatusMessage(`Measured distance: ${d.toFixed(3)} ${project?.unit || 'm'}`);
        setMeasureStart(null);
        setMeasuredDist(null);
      }
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  // Keyboard shortcuts (Escape cancels drawing/selection)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setWallStartPoint(null);
        setRoomVertices([]);
        setMeasureStart(null);
        setMeasuredDist(null);
        setSelectedEntity(null);
        setStatusMessage('Cancelled action');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Main 2D Canvas Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle high DPI
    const dpr = window.devicePixelRatio || 1;
    const width = canvas.parentElement?.clientWidth || 800;
    const height = canvas.parentElement?.clientHeight || 600;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    ctx.scale(dpr, dpr);

    // 1. Clear background
    ctx.fillStyle = '#080b11';
    ctx.fillRect(0, 0, width, height);

    // 2. Architectural Grid
    const meterPixels = zoom;
    const gridSpacing = meterPixels * (meterPixels < 20 ? 5 : (meterPixels > 80 ? 0.5 : 1.0));
    
    ctx.beginPath();
    ctx.strokeStyle = '#141c2c';
    ctx.lineWidth = 1;

    const startX = pan.x % gridSpacing;
    const startY = pan.y % gridSpacing;

    for (let x = startX; x < width; x += gridSpacing) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
    }
    for (let y = startY; y < height; y += gridSpacing) {
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
    }
    ctx.stroke();

    // Origin Axes
    const origin = worldToScreen(0, 0);
    ctx.beginPath();
    ctx.strokeStyle = '#22324e';
    ctx.lineWidth = 1.5;
    ctx.moveTo(origin.x, 0);
    ctx.lineTo(origin.x, height);
    ctx.moveTo(0, origin.y);
    ctx.lineTo(width, origin.y);
    ctx.stroke();

    // 2.5 Background floor plan image underlay
    if (showBackground && bgImage && bgImage.complete) {
      ctx.save();
      ctx.globalAlpha = backgroundOpacity;
      const scale = project?.scale || 0.0125;
      const imgWorldW = bgImage.width * scale;
      const imgWorldH = bgImage.height * scale;
      const scrP = worldToScreen(0, 0);
      ctx.drawImage(bgImage, scrP.x, scrP.y, imgWorldW * zoom, imgWorldH * zoom);
      ctx.restore();
    }

    if (!activeFloor) return;

    // 3. Render Rooms (solid fill + area label)
    for (const room of activeFloor.rooms) {
      if (room.boundary.length < 3) continue;
      const isRoomSelected = selectedEntity?.type === 'room' && selectedEntity.id === room.id;
      
      ctx.beginPath();
      const firstPt = worldToScreen(room.boundary[0][0], room.boundary[0][1]);
      ctx.moveTo(firstPt.x, firstPt.y);
      for (let i = 1; i < room.boundary.length; i++) {
        const pt = worldToScreen(room.boundary[i][0], room.boundary[i][1]);
        ctx.lineTo(pt.x, pt.y);
      }
      ctx.closePath();
      ctx.fillStyle = isRoomSelected ? 'rgba(56, 189, 248, 0.25)' : 'rgba(30, 41, 59, 0.6)';
      ctx.fill();
      ctx.strokeStyle = isRoomSelected ? '#38bdf8' : '#475569';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Label at centroid
      let cx = 0, cy = 0;
      for (const p of room.boundary) {
        cx += p[0];
        cy += p[1];
      }
      cx /= room.boundary.length;
      cy /= room.boundary.length;
      const labelScreen = worldToScreen(cx, cy);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '11px -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(room.name, labelScreen.x, labelScreen.y - 4);
      ctx.fillStyle = '#38bdf8';
      ctx.fillText(`${room.area.toFixed(1)} m²`, labelScreen.x, labelScreen.y + 10);
    }

    // 4. Render Walls with Real Footprint
    for (const wall of activeFloor.walls) {
      const isWallSelected = selectedEntity?.type === 'wall' && selectedEntity.id === wall.id;
      const fp = WallBuilder.computeFootprint(wall.start, wall.end, wall.thickness);

      const pA1 = worldToScreen(fp.a1[0], fp.a1[1]);
      const pB1 = worldToScreen(fp.b1[0], fp.b1[1]);
      const pB2 = worldToScreen(fp.b2[0], fp.b2[1]);
      const pA2 = worldToScreen(fp.a2[0], fp.a2[1]);

      // Wall Body
      ctx.beginPath();
      ctx.moveTo(pA1.x, pA1.y);
      ctx.lineTo(pB1.x, pB1.y);
      ctx.lineTo(pB2.x, pB2.y);
      ctx.lineTo(pA2.x, pA2.y);
      ctx.closePath();

      ctx.fillStyle = isWallSelected ? '#0369a1' : (wall.type === 'external' ? '#334155' : '#1e293b');
      ctx.fill();
      ctx.strokeStyle = isWallSelected ? '#38bdf8' : (wall.type === 'external' ? '#94a3b8' : '#64748b');
      ctx.lineWidth = isWallSelected ? 2.5 : 1.5;
      ctx.stroke();

      // Wall Centerline (subtle dashed)
      const cStart = worldToScreen(wall.start[0], wall.start[1]);
      const cEnd = worldToScreen(wall.end[0], wall.end[1]);
      ctx.beginPath();
      ctx.setLineDash([3, 4]);
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 1;
      ctx.moveTo(cStart.x, cStart.y);
      ctx.lineTo(cEnd.x, cEnd.y);
      ctx.stroke();
      ctx.setLineDash([]);

      // Dimension Label
      const midX = (cStart.x + cEnd.x) / 2;
      const midY = (cStart.y + cEnd.y) / 2;
      ctx.fillStyle = '#e2e8f0';
      ctx.font = '10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`${fp.length.toFixed(2)}m`, midX, midY - 6);

      // Render Openings (Doors & Windows)
      const dx = wall.end[0] - wall.start[0];
      const dy = wall.end[1] - wall.start[1];
      const len = Math.hypot(dx, dy);
      if (len > 1e-4) {
        const ux = dx / len;
        const uy = dy / len;

        for (const op of wall.openings || []) {
          const isOpSelected = selectedEntity?.type === 'opening' && selectedEntity.id === op.id;
          const osX = wall.start[0] + ux * op.offset;
          const osY = wall.start[1] + uy * op.offset;
          const oeX = osX + ux * op.width;
          const oeY = osY + uy * op.width;

          const sOpS = worldToScreen(osX, osY);
          const sOpE = worldToScreen(oeX, oeY);

          if (op.type === 'door') {
            // Door cutout line & swing arc
            ctx.beginPath();
            ctx.strokeStyle = isOpSelected ? '#38bdf8' : '#f59e0b';
            ctx.lineWidth = 3;
            ctx.moveTo(sOpS.x, sOpS.y);
            ctx.lineTo(sOpE.x, sOpE.y);
            ctx.stroke();

            // Swing radius arc
            const doorRadius = op.width * zoom;
            ctx.beginPath();
            ctx.strokeStyle = 'rgba(245, 158, 11, 0.4)';
            ctx.lineWidth = 1;
            ctx.arc(sOpS.x, sOpS.y, doorRadius, 0, Math.PI / 2);
            ctx.stroke();
          } else {
            // Window double lines
            ctx.beginPath();
            ctx.strokeStyle = isOpSelected ? '#38bdf8' : '#06b6d4';
            ctx.lineWidth = 2.5;
            ctx.moveTo(sOpS.x, sOpS.y);
            ctx.lineTo(sOpE.x, sOpE.y);
            ctx.stroke();
          }
        }
      }
    }

    // 4.5 Render Specialized Architectural Layers (MEP Suite: Electrical, Plumbing, Lighting, Landscape)
    if (activeSpecialLayer === 'electrical') {
      for (const room of activeFloor.rooms) {
        if (room.boundary.length < 3) continue;
        let rcx = 0, rcy = 0;
        for (const p of room.boundary) { rcx += p[0]; rcy += p[1]; }
        rcx /= room.boundary.length;
        rcy /= room.boundary.length;
        const sLight = worldToScreen(rcx, rcy);

        // Ceiling Junction Box / Light Fixture
        ctx.beginPath();
        ctx.arc(sLight.x, sLight.y, 7, 0, Math.PI * 2);
        ctx.fillStyle = '#f59e0b';
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(sLight.x - 5, sLight.y);
        ctx.lineTo(sLight.x + 5, sLight.y);
        ctx.moveTo(sLight.x, sLight.y - 5);
        ctx.lineTo(sLight.x, sLight.y + 5);
        ctx.strokeStyle = '#78350f';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Switch near doorway
        const firstPt = room.boundary[0];
        const sSwitch = worldToScreen(firstPt[0] + 0.3, firstPt[1] + 0.3);
        ctx.beginPath();
        ctx.arc(sSwitch.x, sSwitch.y, 6, 0, Math.PI * 2);
        ctx.fillStyle = '#0284c7';
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 8px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('S', sSwitch.x, sSwitch.y + 3);

        // Dashed Conduit Wire from Switch to Light
        ctx.beginPath();
        ctx.setLineDash([4, 4]);
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.7)';
        ctx.lineWidth = 1.5;
        ctx.moveTo(sSwitch.x, sSwitch.y);
        ctx.quadraticCurveTo(sSwitch.x, sLight.y, sLight.x, sLight.y);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Duplex Outlets along walls
      for (const wall of activeFloor.walls) {
        const midX = (wall.start[0] + wall.end[0]) / 2;
        const midY = (wall.start[1] + wall.end[1]) / 2;
        const sSocket = worldToScreen(midX, midY);

        ctx.beginPath();
        ctx.arc(sSocket.x, sSocket.y, 5, 0, Math.PI * 2);
        ctx.fillStyle = '#10b981';
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    } else if (activeSpecialLayer === 'plumbing') {
      for (const room of activeFloor.rooms) {
        const rName = room.name.toLowerCase();
        const isWetArea = rName.includes('bath') || rName.includes('kitchen') || rName.includes('toilet') || rName.includes('powder') || rName.includes('utility');
        if (!isWetArea || room.boundary.length < 3) continue;

        let rcx = 0, rcy = 0;
        for (const p of room.boundary) { rcx += p[0]; rcy += p[1]; }
        rcx /= room.boundary.length;
        rcy /= room.boundary.length;
        const sCenter = worldToScreen(rcx, rcy);

        // Main Soil / Waste Stack
        ctx.beginPath();
        ctx.arc(sCenter.x + 15, sCenter.y + 15, 8, 0, Math.PI * 2);
        ctx.fillStyle = '#ea580c';
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 7px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('STACK', sCenter.x + 15, sCenter.y + 18);

        // Hot & Cold Water Supply lines
        ctx.beginPath();
        ctx.strokeStyle = '#06b6d4';
        ctx.lineWidth = 2;
        ctx.moveTo(sCenter.x - 25, sCenter.y - 15);
        ctx.lineTo(sCenter.x + 15, sCenter.y - 15);
        ctx.stroke();

        // Drainage line to stack
        ctx.beginPath();
        ctx.strokeStyle = '#f97316';
        ctx.lineWidth = 2.5;
        ctx.moveTo(sCenter.x - 20, sCenter.y);
        ctx.lineTo(sCenter.x + 15, sCenter.y + 15);
        ctx.stroke();

        // Floor drain symbol
        ctx.beginPath();
        ctx.arc(sCenter.x - 5, sCenter.y + 10, 5, 0, Math.PI * 2);
        ctx.fillStyle = '#64748b';
        ctx.fill();
        ctx.stroke();
      }
    } else if (activeSpecialLayer === 'lighting') {
      for (const room of activeFloor.rooms) {
        if (room.boundary.length < 3) continue;
        let rcx = 0, rcy = 0;
        for (const p of room.boundary) { rcx += p[0]; rcy += p[1]; }
        rcx /= room.boundary.length;
        rcy /= room.boundary.length;
        const sCenter = worldToScreen(rcx, rcy);

        const offsets = [[-20, -20], [20, -20], [-20, 20], [20, 20]];
        for (const [ox, oy] of offsets) {
          ctx.beginPath();
          ctx.arc(sCenter.x + ox, sCenter.y + oy, 5, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(253, 224, 71, 0.9)';
          ctx.fill();
          ctx.strokeStyle = '#ca8a04';
          ctx.lineWidth = 1;
          ctx.stroke();

          ctx.beginPath();
          ctx.arc(sCenter.x + ox, sCenter.y + oy, 14, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(253, 224, 71, 0.15)';
          ctx.fill();
        }

        ctx.beginPath();
        ctx.arc(sCenter.x, sCenter.y, 7, 0, Math.PI * 2);
        ctx.fillStyle = '#facc15';
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.fillStyle = '#fef08a';
        ctx.font = 'bold 9px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('350 Lux', sCenter.x, sCenter.y - 12);
      }
    } else if (activeSpecialLayer === 'landscape') {
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      for (const wall of activeFloor.walls) {
        minX = Math.min(minX, wall.start[0], wall.end[0]);
        maxX = Math.max(maxX, wall.start[0], wall.end[0]);
        minY = Math.min(minY, wall.start[1], wall.end[1]);
        maxY = Math.max(maxY, wall.start[1], wall.end[1]);
      }
      if (minX !== Infinity) {
        const sTL = worldToScreen(minX - 3.0, minY - 3.0);
        const sBR = worldToScreen(maxX + 3.0, maxY + 3.0);
        
        ctx.save();
        ctx.beginPath();
        ctx.rect(sTL.x, sTL.y, sBR.x - sTL.x, sBR.y - sTL.y);
        ctx.fillStyle = 'rgba(22, 101, 52, 0.15)';
        ctx.fill();
        ctx.strokeStyle = '#15803d';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([6, 6]);
        ctx.stroke();
        ctx.restore();

        const sDeckTL = worldToScreen(minX, maxY);
        const sDeckBR = worldToScreen(maxX, maxY + 2.5);
        ctx.fillStyle = 'rgba(180, 83, 9, 0.2)';
        ctx.fillRect(sDeckTL.x, sDeckTL.y, sDeckBR.x - sDeckTL.x, sDeckBR.y - sDeckTL.y);
        ctx.strokeStyle = '#b45309';
        ctx.strokeRect(sDeckTL.x, sDeckTL.y, sDeckBR.x - sDeckTL.x, sDeckBR.y - sDeckTL.y);
      }
    }

    // 4.6 Architectural North Arrow & Scale Bar (Fixed Overlay in canvas corners)
    ctx.save();
    const scaleBarX = 24;
    const scaleBarY = height - 28;
    const barMeterPx = 2 * zoom;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(scaleBarX, scaleBarY, barMeterPx / 2, 4);
    ctx.fillStyle = '#475569';
    ctx.fillRect(scaleBarX + barMeterPx / 2, scaleBarY, barMeterPx / 2, 4);
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1;
    ctx.strokeRect(scaleBarX, scaleBarY, barMeterPx, 4);

    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('0', scaleBarX, scaleBarY - 4);
    ctx.textAlign = 'center';
    ctx.fillText('1m', scaleBarX + barMeterPx / 2, scaleBarY - 4);
    ctx.textAlign = 'right';
    ctx.fillText('2m', scaleBarX + barMeterPx, scaleBarY - 4);

    const compassX = width - 40;
    const compassY = 40;
    ctx.beginPath();
    ctx.arc(compassX, compassY, 18, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.6)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(compassX, compassY - 14);
    ctx.lineTo(compassX + 5, compassY + 8);
    ctx.lineTo(compassX, compassY + 4);
    ctx.closePath();
    ctx.fillStyle = '#f59e0b';
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(compassX, compassY - 14);
    ctx.lineTo(compassX - 5, compassY + 8);
    ctx.lineTo(compassX, compassY + 4);
    ctx.closePath();
    ctx.fillStyle = '#94a3b8';
    ctx.fill();

    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 9px -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('N', compassX, compassY - 16);
    ctx.restore();

    // 5. Active Tool Previews
    // Wall preview
    if (activeTool === 'wall' && wallStartPoint) {
      const sStart = worldToScreen(wallStartPoint[0], wallStartPoint[1]);
      const currentEnd = snappedPoint || mouseWorld;
      const sEnd = worldToScreen(currentEnd[0], currentEnd[1]);

      ctx.beginPath();
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.moveTo(sStart.x, sStart.y);
      ctx.lineTo(sEnd.x, sEnd.y);
      ctx.stroke();
      ctx.setLineDash([]);

      const previewLen = CoordinateSystem.distance(wallStartPoint, currentEnd);
      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 12px monospace';
      ctx.fillText(`${previewLen.toFixed(2)}m`, (sStart.x + sEnd.x) / 2, (sStart.y + sEnd.y) / 2 - 8);
    }

    // Room creation vertices preview
    if (activeTool === 'room' && roomVertices.length > 0) {
      ctx.beginPath();
      const first = worldToScreen(roomVertices[0][0], roomVertices[0][1]);
      ctx.moveTo(first.x, first.y);
      for (let i = 1; i < roomVertices.length; i++) {
        const v = worldToScreen(roomVertices[i][0], roomVertices[i][1]);
        ctx.lineTo(v.x, v.y);
      }
      const cur = worldToScreen(mouseWorld[0], mouseWorld[1]);
      ctx.lineTo(cur.x, cur.y);

      ctx.fillStyle = 'rgba(56, 189, 248, 0.15)';
      ctx.fill();
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Measure preview line
    if (activeTool === 'measure' && measureStart) {
      const sStart = worldToScreen(measureStart[0], measureStart[1]);
      const sEnd = worldToScreen(mouseWorld[0], mouseWorld[1]);

      ctx.beginPath();
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 2;
      ctx.moveTo(sStart.x, sStart.y);
      ctx.lineTo(sEnd.x, sEnd.y);
      ctx.stroke();

      if (measuredDist !== null) {
        ctx.fillStyle = '#10b981';
        ctx.font = 'bold 12px monospace';
        ctx.fillText(`Distance: ${measuredDist.toFixed(3)}m`, (sStart.x + sEnd.x) / 2, (sStart.y + sEnd.y) / 2 - 8);
      }
    }

    // 6. Snapping indicator dot
    if (snappedPoint) {
      const sSnap = worldToScreen(snappedPoint[0], snappedPoint[1]);
      ctx.beginPath();
      ctx.arc(sSnap.x, sSnap.y, 6, 0, Math.PI * 2);
      ctx.fillStyle = '#38bdf8';
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }, [
    activeFloor,
    zoom,
    pan,
    selectedEntity,
    activeTool,
    wallStartPoint,
    roomVertices,
    mouseWorld,
    snappedPoint,
    measureStart,
    measuredDist,
    worldToScreen,
    showBackground,
    bgImage,
    backgroundOpacity,
    activeSpecialLayer
  ]);

  return (
    <div
      onDragOver={handleCanvasDragOver}
      onDragLeave={handleCanvasDragLeave}
      onDrop={handleCanvasDrop}
      className="w-full h-full relative overflow-hidden bg-cad-dark"
    >
      {/* 2D Architectural & MEP Layer Switcher */}
      <div className="absolute top-3 left-3 max-w-[calc(100vw-1.5rem)] overflow-x-auto no-scrollbar bg-slate-950/90 backdrop-blur-md border border-slate-700/80 rounded-xl p-1 flex items-center gap-1 text-[11px] font-bold shadow-xl z-20 pointer-events-auto">
        {[
          { id: 'none', label: 'Architecture', icon: Layers, color: 'text-sky-400' },
          { id: 'electrical', label: 'Electrical', icon: Zap, color: 'text-amber-400' },
          { id: 'plumbing', label: 'Plumbing', icon: Droplets, color: 'text-blue-400' },
          { id: 'lighting', label: 'Lighting', icon: Lightbulb, color: 'text-yellow-400' },
          { id: 'landscape', label: 'Landscape', icon: Trees, color: 'text-emerald-400' },
        ].map((layer) => {
          const Icon = layer.icon;
          const isActive = activeSpecialLayer === layer.id;
          return (
            <button
              key={layer.id}
              onClick={() => {
                setActiveSpecialLayer(layer.id as any);
                toast.info(`Switched to ${layer.label} Plan view`);
              }}
              className={`px-2 sm:px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-all shrink-0 ${
                isActive
                  ? 'bg-slate-800 text-white shadow-md border border-slate-600'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
              }`}
            >
              <Icon size={13} className={isActive ? layer.color : 'text-slate-400'} />
              <span className="hidden sm:inline">{layer.label}</span>
            </button>
          );
        })}
      </div>
      {/* Canvas Drop Overlay */}
      {isCanvasDragging && (
        <div className="absolute inset-0 z-40 bg-slate-950/80 backdrop-blur-md border-4 border-dashed border-sky-400 flex flex-col items-center justify-center pointer-events-none animate-in fade-in duration-150">
          <div className="p-4 rounded-2xl bg-sky-500/20 text-sky-400 mb-3 animate-bounce">
            <Upload size={38} />
          </div>
          <span className="text-base font-bold text-white tracking-tight">Drop Floor Plan Image Here</span>
          <span className="text-xs text-sky-300 font-mono mt-1">Loads instantly as blueprint tracing layer</span>
        </div>
      )}

      <canvas
        ref={canvasRef}
        onWheel={handleWheel}
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="w-full h-full block cursor-crosshair touch-none"
      />

      {/* Coordinate & Scale HUD overlay */}
      <div className="absolute bottom-3 left-3 bg-cad-panel/90 backdrop-blur border border-cad-border rounded px-3 py-1.5 flex items-center gap-4 text-xs font-mono text-slate-300">
        <div>
          <span className="text-slate-500">X:</span> {mouseWorld[0].toFixed(2)}m
        </div>
        <div>
          <span className="text-slate-500">Y:</span> {mouseWorld[1].toFixed(2)}m
        </div>
        <div>
          <span className="text-slate-500">ZOOM:</span> {Math.round((zoom / 40) * 100)}%
        </div>
        <div>
          <span className="text-slate-500">GRID:</span> {gridSnap ? `${gridSize}m (ON)` : 'OFF'}
        </div>
      </div>

      {/* Blueprint Background Controls */}
      {backgroundImageUrl && (
        <div className="absolute top-4 right-4 bg-cad-panel/90 backdrop-blur border border-cad-border rounded-lg px-3 py-2 flex items-center gap-3 text-xs shadow-lg z-10 text-slate-300">
          <label className="flex items-center gap-1.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showBackground}
              onChange={(e) => setShowBackground(e.target.checked)}
              className="accent-cyan-400 cursor-pointer"
            />
            <span className="font-semibold text-slate-200">Blueprint Layer</span>
          </label>
          <div className="flex items-center gap-1.5 text-slate-400">
            <input
              type="range"
              min="0.05"
              max="1.0"
              step="0.05"
              value={backgroundOpacity}
              onChange={(e) => setBackgroundOpacity(parseFloat(e.target.value))}
              className="w-16 h-1 bg-slate-700 rounded-lg cursor-pointer"
              title={`Opacity: ${Math.round(backgroundOpacity * 100)}%`}
            />
            <span className="font-mono text-[10px] w-6">{Math.round(backgroundOpacity * 100)}%</span>
          </div>
        </div>
      )}
    </div>
  );
};

