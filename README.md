# 2builders — 2D Floor Plan to 3D Building & Vastu Engine

A browser-based architectural platform that transforms 2D floor plans (JPG, PNG, WebP, PDF, DXF) into interactive, dimensionally accurate 3D building models, dollhouse views, first-person walkthroughs, and Vastu compliance reports in under 60 seconds.

Built with **pure deterministic geometry algorithms, computer vision, and real-time Three.js rendering**—with zero AI guesswork or external AI APIs.

---

## 🌟 Key Features

1. **Instant 2D-to-3D Home Transformation**:
   - Ingests scanned drawings, photos, brochure pages, and CAD vector files (JPG, PNG, WebP, PDF, DXF).
   - Deterministic double-line cavity closing, skeletonization, and wall centerline vectorization.
   - 100% exact pixel-to-meter registration with zero shift and accurate right-side-up orientation.

2. **`2builders.plan/1` Schema Specification**:
   - Industry-standard millimeter coordinate frame ($x$ right, $y$ down, origin at plan's top-left).
   - Shared wall graph nodes ($a \to b$).
   - Parametric openings living on walls by offset.
   - Rooms with boundary polygons, area in $\text{sq ft}$ and $\text{m}^2$, and rule-based furniture.

3. **Vastu Shastra 8-Zone Analytics**:
   - Computes **Brahmasthan** (energy center of building envelope).
   - Emits 8 directional sectors ($N, NE, E, SE, S, SW, W, NW$) aligned to magnetic North.
   - Evaluates directional compliance for Kitchen (Agni/SE), Master Bedroom (Earth/SW), Bathrooms, Living, and Entrance.
   - Vastu score card ($A+$ to $C$) with dosha detection and remedial recommendations.

4. **Dual 3D Viewing Modes**:
   - **Dollhouse View**: OrbitControls with cut-away walls ($900\text{ mm}$) vs full ceiling height.
   - **Walkthrough Mode**: First-person eye-level camera ($1600\text{ mm}$), WASD movement, mini-map, and room teleportation.
   - **Engineering vs Realistic**: PBR materials, warm architectural sunlight, hardwood/marble flooring, and parametric furniture.

5. **Multi-Format Export & Sharing**:
   - Public shareable 3D links (`/share/{id}`).
   - **GLB** (glTF 2.0 Binary) for Web and AR.
   - **OBJ** (Wavefront CAD).
   - **USDZ / STL** for iOS AR and 3D printing.
   - **4 High-Resolution PNG Renders** (Dollhouse, Top-Down, Living, Bedroom).
   - Clean **2D Architectural Vector Blueprint** (SVG/PDF).

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- **Node.js LTS** (v18+)
- **Python** (v3.10+)

### 2. Backend Setup & Run (FastAPI + SQLite)
```powershell
# From project root
python -m venv backend/venv
.\backend\venv\Scripts\Activate.ps1
pip install -r requirements.txt
python -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload
```
- API Documentation: [http://localhost:8000/docs](http://localhost:8000/docs)

### 3. Frontend Setup & Run (React 18 + Vite + Three.js)
```powershell
cd frontend
npm install
npm run dev -- --host 0.0.0.0 --port 5173
```
- Web Application: [http://localhost:5173](http://localhost:5173)

---

## 🔒 SEO & Social Sharing
- **Canonical URL**: `https://2builders.ai/`
- **Robots.txt & Sitemap**: `/robots.txt`, `/sitemap.xml`
- **Open Graph & Twitter Cards**: High-res 1200×630 vector preview card
- **JSON-LD Schema.org**: `SoftwareApplication` & `Organization` metadata
