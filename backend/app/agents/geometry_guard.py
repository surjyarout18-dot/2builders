from backend.app.schemas import ArchitecturalModel

class GeometryInvarianceViolationError(Exception):
    """Raised when the Realism Agent mutates structural geometry."""
    pass

class GeometryGuard:
    """
    Ensures that visual realism modifications never alter structural coordinates,
    wall positions, thicknesses, room boundaries, or floor elevations.
    """

    @staticmethod
    def assert_invariant(original: ArchitecturalModel, candidate: ArchitecturalModel) -> None:
        if len(original.floors) != len(candidate.floors):
            raise GeometryInvarianceViolationError(
                f"Floor count changed from {len(original.floors)} to {len(candidate.floors)}"
            )

        for f_idx, (orig_fl, cand_fl) in enumerate(zip(original.floors, candidate.floors)):
            if orig_fl.elevation != cand_fl.elevation or orig_fl.height != cand_fl.height:
                raise GeometryInvarianceViolationError(
                    f"Floor {f_idx} height or elevation mutated"
                )

            if len(orig_fl.walls) != len(cand_fl.walls):
                raise GeometryInvarianceViolationError(
                    f"Floor {f_idx} wall count changed from {len(orig_fl.walls)} to {len(cand_fl.walls)}"
                )

            for w_idx, (ow, cw) in enumerate(zip(orig_fl.walls, cand_fl.walls)):
                if (
                    abs(ow.start.x - cw.start.x) > 0.001 or
                    abs(ow.start.z - cw.start.z) > 0.001 or
                    abs(ow.end.x - cw.end.x) > 0.001 or
                    abs(ow.end.z - cw.end.z) > 0.001
                ):
                    raise GeometryInvarianceViolationError(
                        f"Wall {ow.id} coordinates mutated: ({ow.start.x}, {ow.start.z}) -> ({cw.start.x}, {cw.start.z})"
                    )

                if abs(ow.thickness - cw.thickness) > 0.001 or abs(ow.height - cw.height) > 0.001:
                    raise GeometryInvarianceViolationError(
                        f"Wall {ow.id} dimensions mutated: thickness={cw.thickness}, height={cw.height}"
                    )

            if len(orig_fl.rooms) != len(cand_fl.rooms):
                raise GeometryInvarianceViolationError(
                    f"Floor {f_idx} room count changed from {len(orig_fl.rooms)} to {len(cand_fl.rooms)}"
                )

            for r_idx, (orig_r, cand_r) in enumerate(zip(orig_fl.rooms, cand_fl.rooms)):
                if len(orig_r.polygon) != len(cand_r.polygon):
                    raise GeometryInvarianceViolationError(
                        f"Room {orig_r.id} polygon vertex count changed"
                    )

                for p_idx, (op, cp) in enumerate(zip(orig_r.polygon, cand_r.polygon)):
                    if abs(op.x - cp.x) > 0.001 or abs(op.z - cp.z) > 0.001:
                        raise GeometryInvarianceViolationError(
                            f"Room {orig_r.id} vertex {p_idx} mutated from ({op.x}, {op.z}) to ({cp.x}, {cp.z})"
                        )
