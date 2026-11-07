import { Point2D, Wall, Room } from '../types';

export class RoomDetector {
  /**
   * Deterministic Shoelace formula for calculating polygon area.
   */
  static calculateArea(polygon: Point2D[]): number {
    const n = polygon.length;
    if (n < 3) return 0;
    let area = 0;
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      area += polygon[i][0] * polygon[j][1];
      area -= polygon[j][0] * polygon[i][1];
    }
    return Math.abs(area) / 2.0;
  }

  /**
   * Calculates the perimeter of a polygon.
   */
  static calculatePerimeter(polygon: Point2D[]): number {
    const n = polygon.length;
    if (n < 2) return 0;
    let p = 0;
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      p += Math.hypot(polygon[j][0] - polygon[i][0], polygon[j][1] - polygon[i][1]);
    }
    return p;
  }

  /**
   * Checks whether a point is inside a polygon using ray-casting.
   */
  static pointInPolygon(pt: Point2D, polygon: Point2D[]): boolean {
    let inside = false;
    const x = pt[0];
    const y = pt[1];
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i][0], yi = polygon[i][1];
      const xj = polygon[j][0], yj = polygon[j][1];
      const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  }
}

