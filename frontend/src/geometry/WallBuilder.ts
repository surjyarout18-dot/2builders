import { Point2D, Wall, Opening } from '../types';

export interface WallFootprint {
  a1: Point2D;
  b1: Point2D;
  b2: Point2D;
  a2: Point2D;
  length: number;
  direction: Point2D;
  normal: Point2D;
}

export interface WallSolidSegment {
  startOffset: number;
  endOffset: number;
  bottomElevation: number;
  topElevation: number;
}

export class WallBuilder {
  /**
   * Computes the 2D footprint rectangle of a wall from start to end with thickness t.
   */
  static computeFootprint(start: Point2D, end: Point2D, thickness: number): WallFootprint {
    const dx = end[0] - start[0];
    const dy = end[1] - start[1];
    const len = Math.hypot(dx, dy);

    if (len < 1e-4) {
      return {
        a1: start,
        b1: end,
        b2: end,
        a2: start,
        length: 0,
        direction: [1, 0],
        normal: [0, 1]
      };
    }

    const dir: Point2D = [dx / len, dy / len];
    // Perpendicular normal: (-dy, dx) / len
    const norm: Point2D = [-dir[1], dir[0]];
    const halfT = thickness / 2.0;

    const a1: Point2D = [start[0] + norm[0] * halfT, start[1] + norm[1] * halfT];
    const a2: Point2D = [start[0] - norm[0] * halfT, start[1] - norm[1] * halfT];
    const b1: Point2D = [end[0] + norm[0] * halfT, end[1] + norm[1] * halfT];
    const b2: Point2D = [end[0] - norm[0] * halfT, end[1] - norm[1] * halfT];

    return {
      a1,
      b1,
      b2,
      a2,
      length: len,
      direction: dir,
      normal: norm
    };
  }

  /**
   * Decomposes a wall with openings into a set of non-overlapping 3D cuboid subsegments:
   * 1. Full-height wall segments before, between, and after openings
   * 2. Sill segments below windows
   * 3. Lintel/header segments above doors & windows
   */
  static decomposeWallAroundOpenings(wall: Wall): WallSolidSegment[] {
    const len = Math.hypot(wall.end[0] - wall.start[0], wall.end[1] - wall.start[1]);
    const height = wall.height || 3.0;

    if (!wall.openings || wall.openings.length === 0) {
      return [{
        startOffset: 0,
        endOffset: len,
        bottomElevation: 0,
        topElevation: height
      }];
    }

    // Sort openings by offset
    const sorted = [...wall.openings].sort((a, b) => a.offset - b.offset);
    const segments: WallSolidSegment[] = [];

    let currentOffset = 0;

    for (const op of sorted) {
      const opStart = Math.max(0, Math.min(len, op.offset));
      const opEnd = Math.max(0, Math.min(len, op.offset + op.width));

      // 1. Full height wall slice before this opening
      if (opStart > currentOffset + 1e-4) {
        segments.push({
          startOffset: currentOffset,
          endOffset: opStart,
          bottomElevation: 0,
          topElevation: height
        });
      }

      // 2. Sill segment (under window if sillHeight > 0)
      if (op.sillHeight > 1e-3) {
        segments.push({
          startOffset: opStart,
          endOffset: opEnd,
          bottomElevation: 0,
          topElevation: Math.min(height, op.sillHeight)
        });
      }

      // 3. Lintel/header segment (above door/window opening)
      const openingTop = op.sillHeight + op.height;
      if (openingTop < height - 1e-3) {
        segments.push({
          startOffset: opStart,
          endOffset: opEnd,
          bottomElevation: openingTop,
          topElevation: height
        });
      }

      currentOffset = Math.max(currentOffset, opEnd);
    }

    // 4. Full height wall slice after the last opening
    if (currentOffset < len - 1e-4) {
      segments.push({
        startOffset: currentOffset,
        endOffset: len,
        bottomElevation: 0,
        topElevation: height
      });
    }

    return segments;
  }
}

