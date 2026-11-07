import { Point2D, UnitType } from '../types';

export const UNIT_CONVERSIONS: Record<UnitType, number> = {
  meters: 1.0,
  millimeters: 0.001,
  centimeters: 0.01,
  feet: 0.3048,
  inches: 0.0254
};

export class CoordinateSystem {
  static toMeters(val: number, unit: UnitType): number {
    return val * (UNIT_CONVERSIONS[unit] || 1.0);
  }

  static fromMeters(meters: number, unit: UnitType): number {
    const factor = UNIT_CONVERSIONS[unit] || 1.0;
    return meters / factor;
  }

  static distance(p1: Point2D, p2: Point2D): number {
    return Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
  }

  static snapToGrid(point: Point2D, gridSize: number = 0.1): Point2D {
    return [
      Math.round(point[0] / gridSize) * gridSize,
      Math.round(point[1] / gridSize) * gridSize
    ];
  }

  static snapToPoints(
    target: Point2D,
    candidates: Point2D[],
    tolerance: number = 0.25
  ): { point: Point2D; snapped: boolean } {
    let closestDist = tolerance;
    let closestPoint = target;
    let snapped = false;

    for (const p of candidates) {
      const d = CoordinateSystem.distance(target, p);
      if (d < closestDist) {
        closestDist = d;
        closestPoint = p;
        snapped = true;
      }
    }

    return { point: closestPoint, snapped };
  }
}

