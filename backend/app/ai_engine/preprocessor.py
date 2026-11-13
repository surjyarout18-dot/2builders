"""
Image Preprocessing for Floor Plan Analysis.
Converts raw raster drawing into high-contrast binary and wall-enhanced feature maps.
"""
import cv2
import numpy as np
from typing import Tuple, Dict, Any

class ImagePreprocessor:
    def __init__(self, target_max_dim: int = 1600):
        self.target_max_dim = target_max_dim

    def preprocess(self, image_bytes: bytes) -> Tuple[np.ndarray, np.ndarray, Dict[str, Any]]:
        """
        Reads image bytes, resizes if oversized, enhances contrast, and creates binary masks.
        Returns:
            - color_img: original resized RGB image
            - binary_walls: binary mask where walls/features are 255 (white on black background)
            - metadata: image dimensions and scaling factors
        """
        nparr = np.frombuffer(image_bytes, np.uint8)
        color_img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if color_img is None:
            raise ValueError("Invalid image file or format could not be decoded.")

        orig_h, orig_w = color_img.shape[:2]
        scale = 1.0
        max_dim = max(orig_h, orig_w)
        if max_dim > self.target_max_dim:
            scale = self.target_max_dim / max_dim
            new_w = int(orig_w * scale)
            new_h = int(orig_h * scale)
            color_img = cv2.resize(color_img, (new_w, new_h), interpolation=cv2.INTER_AREA)

        h, w = color_img.shape[:2]
        gray = cv2.cvtColor(color_img, cv2.COLOR_BGR2GRAY)

        # Bilateral filter to smooth noise while preserving sharp wall edges
        smooth = cv2.bilateralFilter(gray, d=7, sigmaColor=50, sigmaSpace=50)

        # In architectural plans, lines/walls are typically darker than the white background
        # Otsu thresholding + adaptive thresholding blend
        _, otsu = cv2.threshold(smooth, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
        
        # Adaptive thresholding for uneven illumination / scanned paper
        adapt = cv2.adaptiveThreshold(
            smooth, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
            cv2.THRESH_BINARY_INV, 25, 10
        )

        # Combine Otsu and Adaptive to capture both solid thick walls and thin outlines
        combined = cv2.bitwise_or(otsu, adapt)

        # Remove isolated single-pixel noise with morphological open
        kernel_noise = cv2.getStructuringElement(cv2.MORPH_RECT, (2, 2))
        clean_binary = cv2.morphologyEx(combined, cv2.MORPH_OPEN, kernel_noise)

        metadata = {
            "orig_width": orig_w,
            "orig_height": orig_h,
            "width": w,
            "height": h,
            "scale_factor": scale
        }

        return color_img, clean_binary, metadata
