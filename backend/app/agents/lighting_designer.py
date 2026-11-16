from typing import Dict, Any

class LightingDesigner:
    """
    Configures natural solar pathing, HDRI environment illumination,
    and warm interior luminaire networks.
    """

    ORIENTATION_ANGLES = {
        "south": {"azimuth": 180.0, "elevation": 45.0},
        "north": {"azimuth": 0.0, "elevation": 30.0},
        "east": {"azimuth": 90.0, "elevation": 35.0},
        "west": {"azimuth": 270.0, "elevation": 35.0}
    }

    @classmethod
    def design_lighting_environment(
        cls,
        orientation: str = "south",
        day_night: str = "day"
    ) -> Dict[str, Any]:
        angles = cls.ORIENTATION_ANGLES.get(orientation.lower(), cls.ORIENTATION_ANGLES["south"])
        
        if day_night == "night":
            return {
                "sky": {
                    "hdri": "night_clear_sky",
                    "turbidity": 2.0,
                    "intensity": 0.15,
                    "sun_color": "#60A5FA"
                },
                "sun": {
                    "azimuth": angles["azimuth"],
                    "elevation": 5.0,
                    "intensity": 0.1
                },
                "interior_artificial": {
                    "color_temperature_k": 2700,
                    "intensity_lux": 450,
                    "type": "recessed_warm_downlight"
                }
            }
        else:
            return {
                "sky": {
                    "hdri": "clear_architectural_noon",
                    "turbidity": 2.5,
                    "intensity": 1.0,
                    "sun_color": "#FFFBEB"
                },
                "sun": {
                    "azimuth": angles["azimuth"],
                    "elevation": angles["elevation"],
                    "intensity": 2.5
                },
                "interior_artificial": {
                    "color_temperature_k": 3000,
                    "intensity_lux": 350,
                    "type": "ambient_natural_daylight"
                }
            }
