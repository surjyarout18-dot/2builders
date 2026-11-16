import copy
from typing import Optional
from backend.app.schemas import ArchitecturalModel
from backend.app.agents.material_selector import MaterialSelector
from backend.app.agents.interior_decorator import InteriorDecorator
from backend.app.agents.lighting_designer import LightingDesigner
from backend.app.agents.geometry_guard import GeometryGuard, GeometryInvarianceViolationError

class RealismAgent:
    """
    Agent 2: Photorealistic Realism Agent
    Applies PBR materials, contextual furniture clusters, natural and artificial lighting,
    and exterior landscape while strictly respecting the Geometry Invariance Constraint.
    """

    def __init__(self):
        self.material_selector = MaterialSelector()
        self.decorator = InteriorDecorator()
        self.lighting_designer = LightingDesigner()
        self.guard = GeometryGuard()

    def validate_geometry_invariance(self, original: ArchitecturalModel, candidate: ArchitecturalModel) -> None:
        """Exposed verification method to guarantee structural invariance."""
        self.guard.assert_invariant(original, candidate)

    def apply_realism(
        self,
        base_model: ArchitecturalModel,
        style: str = "contemporary_warm",
        orientation: str = "south",
        day_night: str = "day"
    ) -> ArchitecturalModel:
        """
        Applies material, decor, lighting, and environmental enhancements without modifying
        any structural wall, floor, or room coordinates.
        """
        # Deep copy to prevent side effects
        enhanced = base_model.model_copy(deep=True)

        roof_spec = self.material_selector.get_roof_spec(style)

        # 1. Enhance Rooms with PBR Materials & Furnishings
        for floor in enhanced.floors:
            all_furniture = []
            for room in floor.rooms:
                mat = self.material_selector.get_room_material(room.room_type, style)
                room.floor_material = mat["floor"]
                room.wall_color = mat["wall"]

                # Generate furniture cluster
                furn_items = self.decorator.decorate_room(room, floor.id)
                all_furniture.extend(furn_items)

            # Preserve existing user-placed custom furniture if present, or assign new decor
            if not floor.furniture or len(floor.furniture) == 0:
                floor.furniture = all_furniture

        # 2. Configure Realistic Roof
        if enhanced.building.roof:
            enhanced.building.roof.visible = True
            enhanced.building.roof.material = roof_spec["material"]
            enhanced.building.roof.roof_type = roof_spec["roof_type"]

        # 3. Configure Site Environment
        if enhanced.building.site:
            enhanced.building.site.has_garden = True
            enhanced.building.site.has_driveway = True
            enhanced.building.site.has_boundary_wall = True

        # 4. Attach Lighting Specification in Metadata
        lighting_spec = self.lighting_designer.design_lighting_environment(orientation, day_night)
        if not enhanced.metadata:
            enhanced.metadata = {}
        enhanced.metadata["lighting"] = lighting_spec
        enhanced.metadata["style"] = style
        enhanced.metadata["realism_engine_version"] = "2.0_pbr"

        # 5. Strict Invariance Check
        self.validate_geometry_invariance(base_model, enhanced)

        return enhanced
