from typing import Dict, Any

class MaterialSelector:
    """
    Selects realistic PBR materials, wall finishes, and roof textures
    tailored to architectural styles and room functions.
    """

    STYLE_PALETTES = {
        "contemporary_warm": {
            "living_room": {"floor": "parquet_herringbone", "wall": "#FAF9F6"},
            "bedroom": {"floor": "hardwood_oak", "wall": "#F8FAFC"},
            "kitchen": {"floor": "tile_slate", "wall": "#F1F5F9"},
            "bathroom": {"floor": "tile_marble", "wall": "#E2E8F0"},
            "roof": {"material": "zinc_standing_seam", "roof_type": "gable"},
            "exterior_wall": "#F8FAFC"
        },
        "nordic_minimal": {
            "living_room": {"floor": "hardwood_oak", "wall": "#FFFFFF"},
            "bedroom": {"floor": "hardwood_oak", "wall": "#F8FAFC"},
            "kitchen": {"floor": "concrete_polished", "wall": "#F1F5F9"},
            "bathroom": {"floor": "tile_slate", "wall": "#E2E8F0"},
            "roof": {"material": "zinc_standing_seam", "roof_type": "shed"},
            "exterior_wall": "#F1F5F9"
        },
        "urban_industrial": {
            "living_room": {"floor": "concrete_polished", "wall": "#F1F5F9"},
            "bedroom": {"floor": "hardwood_oak", "wall": "#E2E8F0"},
            "kitchen": {"floor": "concrete_polished", "wall": "#CBD5E1"},
            "bathroom": {"floor": "tile_slate", "wall": "#94A3B8"},
            "roof": {"material": "slate_shingle", "roof_type": "flat"},
            "exterior_wall": "#CBD5E1"
        },
        "classic_mediterranean": {
            "living_room": {"floor": "tile_marble", "wall": "#FFFBEB"},
            "bedroom": {"floor": "hardwood_oak", "wall": "#FEF3C7"},
            "kitchen": {"floor": "tile_marble", "wall": "#FDE68A"},
            "bathroom": {"floor": "tile_marble", "wall": "#FFFBEB"},
            "roof": {"material": "terracotta_tile", "roof_type": "hip"},
            "exterior_wall": "#FFFBEB"
        }
    }

    @classmethod
    def get_room_material(cls, room_type: str, style: str = "contemporary_warm") -> Dict[str, str]:
        palette = cls.STYLE_PALETTES.get(style, cls.STYLE_PALETTES["contemporary_warm"])
        return palette.get(room_type, palette["living_room"])

    @classmethod
    def get_roof_spec(cls, style: str = "contemporary_warm") -> Dict[str, str]:
        palette = cls.STYLE_PALETTES.get(style, cls.STYLE_PALETTES["contemporary_warm"])
        return palette.get("roof", {"material": "zinc_standing_seam", "roof_type": "gable"})
