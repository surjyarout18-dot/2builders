import { Floor, ValidationReport, ValidationIssue } from '../types';
import { RoomDetector } from './RoomDetector';

export class GeometryValidator {
  static validate(floors: Floor[]): ValidationReport {
    const issues: ValidationIssue[] = [];
    let totalWalls = 0;
    let totalOpenings = 0;

    for (const floor of floors) {
      for (const wall of floor.walls) {
        totalWalls++;
        const len = Math.hypot(wall.end[0] - wall.start[0], wall.end[1] - wall.start[1]);

        if (len < 0.05) {
          issues.push({
            type: 'error',
            objectId: wall.id,
            description: `Wall on ${floor.name} has invalid length (${len.toFixed(3)}m < 0.05m).`,
            suggestion: 'Delete or extend the wall segment.'
          });
        }

        if (wall.thickness <= 0.01) {
          issues.push({
            type: 'error',
            objectId: wall.id,
            description: `Wall '${wall.id}' has non-positive thickness (${wall.thickness}m).`,
            suggestion: 'Set thickness to at least 0.05m.'
          });
        }

        if (wall.height <= 0.1) {
          issues.push({
            type: 'error',
            objectId: wall.id,
            description: `Wall '${wall.id}' has non-positive height (${wall.height}m).`,
            suggestion: 'Set height to at least 1.0m.'
          });
        }

        // Validate openings
        const sorted = [...(wall.openings || [])].sort((a, b) => a.offset - b.offset);
        totalOpenings += sorted.length;
        let prevEnd = -1.0;

        for (const op of sorted) {
          if (op.offset < 0) {
            issues.push({
              type: 'error',
              objectId: op.id,
              description: `Opening '${op.id}' starts before wall beginning (offset: ${op.offset}m).`,
              suggestion: 'Move opening inside the wall bounds.'
            });
          }

          if (op.offset + op.width > len + 1e-3) {
            issues.push({
              type: 'error',
              objectId: op.id,
              description: `Opening '${op.id}' exceeds wall length (${(op.offset + op.width).toFixed(2)}m > ${len.toFixed(2)}m).`,
              suggestion: 'Reduce width or offset.'
            });
          }

          if (op.offset < prevEnd) {
            issues.push({
              type: 'warning',
              objectId: op.id,
              description: `Opening '${op.id}' overlaps with adjacent opening.`,
              suggestion: 'Separate openings along the wall.'
            });
          }

          prevEnd = op.offset + op.width;
        }
      }

      for (const room of floor.rooms) {
        if (!room.boundary || room.boundary.length < 3) {
          issues.push({
            type: 'error',
            objectId: room.id,
            description: `Room '${room.name}' has fewer than 3 boundary vertices.`,
            suggestion: 'Define a closed polygon of at least 3 points.'
          });
        } else {
          const area = RoomDetector.calculateArea(room.boundary);
          if (area < 0.1) {
            issues.push({
              type: 'warning',
              objectId: room.id,
              description: `Room '${room.name}' has near-zero area (${area.toFixed(2)} m²).`,
              suggestion: 'Verify boundary coordinates.'
            });
          }
        }
      }
    }

    const errors = issues.filter(i => i.type === 'error').length;
    const warnings = issues.filter(i => i.type === 'warning').length;

    return {
      isValid: errors === 0,
      issues,
      summary: `Validation finished: ${errors} errors, ${warnings} warnings across ${totalWalls} walls and ${totalOpenings} openings.`
    };
  }
}

