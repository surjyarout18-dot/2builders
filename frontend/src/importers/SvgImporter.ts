import { Wall, Point2D } from '../types';

export class SvgImporter {
  static parseSvgText(svgContent: string, scale: number = 0.01): Wall[] {
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgContent, 'image/svg+xml');
    const walls: Wall[] = [];

    // 1. Parse <line> elements
    const lines = doc.querySelectorAll('line');
    lines.forEach((line, idx) => {
      const x1 = parseFloat(line.getAttribute('x1') || '0') * scale;
      const y1 = parseFloat(line.getAttribute('y1') || '0') * scale;
      const x2 = parseFloat(line.getAttribute('x2') || '0') * scale;
      const y2 = parseFloat(line.getAttribute('y2') || '0') * scale;

      if (Math.hypot(x2 - x1, y2 - y1) >= 0.1) {
        walls.push({
          id: `svg-wall-${idx}-${Date.now().toString(36)}`,
          start: [Math.round(x1 * 100) / 100, Math.round(y1 * 100) / 100],
          end: [Math.round(x2 * 100) / 100, Math.round(y2 * 100) / 100],
          thickness: 0.20,
          height: 3.0,
          type: 'external',
          openings: []
        });
      }
    });

    // 2. Parse <rect> elements
    const rects = doc.querySelectorAll('rect');
    rects.forEach((rect, idx) => {
      const x = parseFloat(rect.getAttribute('x') || '0') * scale;
      const y = parseFloat(rect.getAttribute('y') || '0') * scale;
      const w = parseFloat(rect.getAttribute('width') || '0') * scale;
      const h = parseFloat(rect.getAttribute('height') || '0') * scale;

      if (w >= 0.1 && h >= 0.1) {
        const p1: Point2D = [x, y];
        const p2: Point2D = [x + w, y];
        const p3: Point2D = [x + w, y + h];
        const p4: Point2D = [x, y + h];

        const pts = [p1, p2, p3, p4];
        for (let i = 0; i < 4; i++) {
          const next = (i + 1) % 4;
          walls.push({
            id: `svg-rect-${idx}-${i}-${Date.now().toString(36)}`,
            start: pts[i],
            end: pts[next],
            thickness: 0.20,
            height: 3.0,
            type: 'external',
            openings: []
          });
        }
      }
    });

    // 3. Parse <polyline> and <polygon>
    const polylines = doc.querySelectorAll('polyline, polygon');
    polylines.forEach((poly, idx) => {
      const rawPoints = poly.getAttribute('points') || '';
      const pairs = rawPoints.trim().split(/\s+|,/);
      const coords: Point2D[] = [];

      for (let i = 0; i < pairs.length; i += 2) {
        if (pairs[i] !== undefined && pairs[i + 1] !== undefined) {
          coords.push([
            parseFloat(pairs[i]) * scale,
            parseFloat(pairs[i + 1]) * scale
          ]);
        }
      }

      const isPolygon = poly.tagName.toLowerCase() === 'polygon';
      for (let i = 0; i < coords.length - 1; i++) {
        walls.push({
          id: `svg-poly-${idx}-${i}-${Date.now().toString(36)}`,
          start: coords[i],
          end: coords[i + 1],
          thickness: 0.20,
          height: 3.0,
          type: 'external',
          openings: []
        });
      }
      if (isPolygon && coords.length > 2) {
        walls.push({
          id: `svg-poly-${idx}-close-${Date.now().toString(36)}`,
          start: coords[coords.length - 1],
          end: coords[0],
          thickness: 0.20,
          height: 3.0,
          type: 'external',
          openings: []
        });
      }
    });

    return walls;
  }
}

