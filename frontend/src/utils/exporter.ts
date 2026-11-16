import jsPDF from 'jspdf';
import { ArchitecturalModel } from '../types/architectural';

export function downloadFile(content: Blob | string, filename: string, mimeType: string = 'text/plain') {
  const blob = typeof content === 'string' ? new Blob([content], { type: mimeType }) : content;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function exportGLB(model: ArchitecturalModel) {
  try {
    const res = await fetch(`/api/v1/projects/${model.project_id}/export/glb`);
    if (res.ok) {
      const blob = await res.blob();
      downloadFile(blob, `${model.name.replace(/\s+/g, '_')}.glb`, 'model/gltf-binary');
      return;
    }
  } catch (e) {
    console.warn("Backend GLB endpoint not reachable, generating client-side export fallback");
  }

  // Fallback: client-side JSON glTF representation
  const jsonGltf = JSON.stringify(model, null, 2);
  downloadFile(jsonGltf, `${model.name.replace(/\s+/g, '_')}_model.json`, 'application/json');
}

export async function exportOBJ(model: ArchitecturalModel) {
  try {
    const res = await fetch(`/api/v1/projects/${model.project_id}/export/obj`);
    if (res.ok) {
      const text = await res.text();
      downloadFile(text, `${model.name.replace(/\s+/g, '_')}.obj`, 'text/plain');
      return;
    }
  } catch (e) {
    console.warn("Backend OBJ endpoint not reachable");
  }
}

export async function exportDXF(model: ArchitecturalModel) {
  try {
    const res = await fetch(`/api/v1/projects/${model.project_id}/export/dxf`);
    if (res.ok) {
      const text = await res.text();
      downloadFile(text, `${model.name.replace(/\s+/g, '_')}.dxf`, 'application/dxf');
      return;
    }
  } catch (e) {
    console.warn("Backend DXF endpoint not reachable");
  }
}

export function exportSVG(model: ArchitecturalModel) {
  const floor = model.floors[0];
  const walls = floor.walls;
  if (walls.length === 0) return;

  const minX = Math.min(...walls.map(w => Math.min(w.start.x, w.end.x)), 0);
  const maxX = Math.max(...walls.map(w => Math.max(w.start.x, w.end.x)), 10);
  const minZ = Math.min(...walls.map(w => Math.min(w.start.z, w.end.z)), 0);
  const maxZ = Math.max(...walls.map(w => Math.max(w.start.z, w.end.z)), 10);

  const wM = maxX - minX;
  const hM = maxZ - minZ;
  const scale = 50; // 50px per meter

  const svgParts = [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${wM * scale + 60} ${hM * scale + 60}" width="${wM * scale + 60}" height="${hM * scale + 60}" style="background:#0A0D14;font-family:sans-serif">`,
    `<g transform="translate(30, 30)">`
  ];

  // Rooms
  floor.rooms.forEach(rm => {
    if (rm.polygon.length >= 3) {
      const pts = rm.polygon.map(p => `${(p.x - minX) * scale},${(p.z - minZ) * scale}`).join(' ');
      svgParts.push(`<polygon points="${pts}" fill="#161F33" stroke="#00F0FF" stroke-width="1.5" opacity="0.7"/>`);
    }
  });

  // Walls
  walls.forEach(w => {
    const x1 = (w.start.x - minX) * scale;
    const y1 = (w.start.z - minZ) * scale;
    const x2 = (w.end.x - minX) * scale;
    const y2 = (w.end.z - minZ) * scale;
    const thickness = Math.max(3, w.thickness * scale);
    svgParts.push(`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#E2E8F0" stroke-width="${thickness}" stroke-linecap="square"/>`);
  });

  svgParts.push(`</g></svg>`);
  const svgText = svgParts.join('\n');
  downloadFile(svgText, `${model.name.replace(/\s+/g, '_')}_plan.svg`, 'image/svg+xml');
}

export function exportArchitecturalPDF(model: ArchitecturalModel) {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  const floor = model.floors[0];
  const totalArea = floor.rooms.reduce((acc, r) => acc + r.area_sqm, 0);

  // Background
  doc.setFillColor(10, 13, 20);
  doc.rect(0, 0, 297, 210, 'F');

  // Title Block Header
  doc.setTextColor(0, 240, 255);
  doc.setFontSize(22);
  doc.text("2BUILDERS PRECISION BLUEPRINT & SPEC SHEET", 20, 25);

  doc.setTextColor(241, 245, 249);
  doc.setFontSize(14);
  doc.text(model.name, 20, 35);

  doc.setTextColor(148, 163, 184);
  doc.setFontSize(10);
  doc.text(`Generated: ${new Date().toLocaleDateString()} | Units: ${model.unit_system || 'Metric'} | 100% Free Forever Architecture`, 20, 42);

  // Summary Card Box
  doc.setFillColor(22, 31, 51);
  doc.roundedRect(20, 50, 257, 26, 3, 3, 'F');

  doc.setTextColor(148, 163, 184);
  doc.setFontSize(9);
  doc.text("MEASURED LIVING AREA", 30, 58);
  doc.text("WALLS & PARTITIONS", 110, 58);
  doc.text("DOORS & WINDOWS", 170, 58);
  doc.text("FLOORS / STAIRS", 230, 58);

  doc.setTextColor(0, 240, 255);
  doc.setFontSize(15);
  doc.text(`${totalArea.toFixed(1)} m² (${(totalArea * 10.7639).toFixed(0)} sqft)`, 30, 68);

  doc.setTextColor(241, 245, 249);
  doc.text(`${floor.walls.length} Walls`, 110, 68);
  doc.text(`${floor.doors.length} Doors / ${floor.windows.length} Windows`, 170, 68);
  doc.text(`${model.floors.length} Levels / ${(floor.stairs || []).length} Stairs`, 230, 68);

  // Room Schedule Table
  doc.setTextColor(0, 240, 255);
  doc.setFontSize(12);
  doc.text("ROOM SCHEDULE & FINISH SPECIFICATIONS", 20, 92);

  doc.setFillColor(31, 41, 66);
  doc.rect(20, 96, 257, 8, 'F');

  doc.setTextColor(241, 245, 249);
  doc.setFontSize(9);
  doc.text("ROOM NAME", 25, 101);
  doc.text("CATEGORY", 90, 101);
  doc.text("AREA (m²)", 140, 101);
  doc.text("AREA (sq ft)", 180, 101);
  doc.text("FLOOR MATERIAL", 220, 101);

  let currentY = 110;
  floor.rooms.forEach((r, idx) => {
    if (idx % 2 === 1) {
      doc.setFillColor(17, 23, 38);
      doc.rect(20, currentY - 5, 257, 7, 'F');
    }
    doc.setTextColor(241, 245, 249);
    doc.text(r.name, 25, currentY);
    doc.setTextColor(148, 163, 184);
    doc.text(r.room_type, 90, currentY);
    doc.setTextColor(0, 240, 255);
    doc.text(`${r.area_sqm.toFixed(1)} m²`, 140, currentY);
    doc.setTextColor(241, 245, 249);
    doc.text(`${r.area_sqft.toFixed(1)} sq ft`, 180, currentY);
    doc.setTextColor(148, 163, 184);
    doc.text(r.floor_material.replace(/_/g, ' '), 220, currentY);

    currentY += 8;
  });

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text("2builders Open Architecture CAD Engine • 100% Free Forever • Unwatermarked", 20, 200);

  doc.save(`${model.name.replace(/\s+/g, '_')}_spec.pdf`);
}

export function exportCSV(model: ArchitecturalModel) {
  const rows: string[][] = [];

  rows.push(["=== 2BUILDERS ARCHITECTURAL SCHEDULE & QUANTITY TAKEOFF ==="]);
  rows.push(["Project Name", model.name]);
  rows.push(["Unit System", model.unit_system || "metric"]);
  rows.push(["Total Floors", `${model.floors.length}`]);
  rows.push(["Generated Date", new Date().toISOString()]);
  rows.push([]);

  // 1. ROOM SCHEDULE
  rows.push(["--- ROOM SCHEDULE & AREAS ---"]);
  rows.push(["Floor", "Room Name", "Room Type", "Area (m²)", "Area (sq ft)", "Floor Finish", "Finish Area +10% Waste (m²)"]);

  let totalM2 = 0;
  let totalSqft = 0;

  model.floors.forEach((f) => {
    f.rooms.forEach((r) => {
      totalM2 += r.area_sqm;
      totalSqft += r.area_sqft;
      const wasteArea = (r.area_sqm * 1.10).toFixed(2);
      rows.push([
        f.name,
        `"${r.name}"`,
        r.room_type,
        r.area_sqm.toFixed(2),
        r.area_sqft.toFixed(1),
        `"${r.floor_material.replace(/_/g, ' ')}"`,
        wasteArea
      ]);
    });
  });

  rows.push(["TOTALS", "", "", totalM2.toFixed(2), totalSqft.toFixed(1), "", (totalM2 * 1.10).toFixed(2)]);
  rows.push([]);

  // 2. WALL TAKEOFF
  rows.push(["--- WALL & PARTITION SCHEDULE ---"]);
  rows.push(["Floor", "Wall ID", "Type", "Length (m)", "Length (ft)", "Thickness (m)", "Height (m)", "Wall Face Area (m²)"]);

  let totalWallLength = 0;
  let totalWallFaceArea = 0;

  model.floors.forEach((f) => {
    f.walls.forEach((w) => {
      const dx = w.end.x - w.start.x;
      const dz = w.end.z - w.start.z;
      const lenM = Math.sqrt(dx * dx + dz * dz);
      const faceArea = lenM * w.height;
      totalWallLength += lenM;
      totalWallFaceArea += faceArea;
      rows.push([
        f.name,
        w.id,
        w.wall_type,
        lenM.toFixed(2),
        (lenM * 3.28084).toFixed(2),
        w.thickness.toFixed(2),
        w.height.toFixed(2),
        faceArea.toFixed(2)
      ]);
    });
  });

  rows.push(["TOTALS", "", "", totalWallLength.toFixed(2), (totalWallLength * 3.28084).toFixed(2), "", "", totalWallFaceArea.toFixed(2)]);
  rows.push([]);

  // 3. FENESTRATION & CIRCULATION SCHEDULE
  rows.push(["--- DOORS, WINDOWS, STAIRS & COLUMNS ---"]);
  rows.push(["Floor", "Element Type", "ID", "Dimensions / Rise", "Type / Material"]);

  model.floors.forEach((f) => {
    f.doors.forEach((d) => {
      rows.push([f.name, "Door", d.id, `${d.width}m x ${d.height}m`, `${d.door_type} (${d.swing_direction})`]);
    });
    f.windows.forEach((w) => {
      rows.push([f.name, "Window", w.id, `${w.width}m x ${w.height}m (Sill: ${w.sill_height}m)`, w.window_type]);
    });
    (f.stairs || []).forEach((st) => {
      rows.push([f.name, "Staircase", st.id, `Rise: ${st.height}m, Width: ${st.width}m, Risers: ${st.risers_count}`, st.stair_type]);
    });
    (f.columns || []).forEach((c) => {
      rows.push([f.name, "Column", c.id, `Size: ${c.radius_or_size}m, Height: ${c.height}m`, c.shape]);
    });
  });

  const csvContent = rows.map((r) => r.join(",")).join("\n");
  downloadFile(csvContent, `${model.name.replace(/\s+/g, '_')}_quantity_takeoffs.csv`, 'text/csv');
}
