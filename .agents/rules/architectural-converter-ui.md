---
name: architectural-converter-ui
description: Enforce sticky header containment, 2-panel converter layout, and isolated pipeline steppers for architectural SaaS interfaces.
always_on: true
---

# Architectural SaaS & Converter Layout Standards

1. **Sticky Header Hierarchy**:
   - Never apply independent `sticky top-0` to multiple adjacent headers or announcement banners.
   - Always enclose notification bars and navigation headers in a single shared sticky wrapper (`<div className="sticky top-0 z-40">`) to guarantee cohesive scroll behavior with zero overlapping.

2. **2-Panel Converter Architecture**:
   - For 2D-to-3D and AI drafting workflows (e.g., FloorDesign.ai / Floor-Plan.ai models), structure the hero into a two-panel workspace:
     - **Left Panel (Upload & Presets)**: File dropzone, supported format tags, and 1-click sample demo plans.
     - **Right Panel (Design & Build Specifications)**: Architectural style selector, dimension parameters (ceiling height, furnishing), and high-visibility Convert CTA.

3. **Isolated Pipeline Stepper during Processing**:
   - Never embed dynamic progress bars directly inside active form inputs.
   - Replace the configuration panel with a dedicated 4-stage pipeline stepper during upload/analysis to prevent layout shifts and text collision.

