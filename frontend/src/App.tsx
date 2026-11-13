import React, { useState } from 'react';
import { Navbar } from './components/navbar/Navbar';
import { Canvas2D } from './components/canvas2d/Canvas2D';
import { BuildingScene } from './components/viewer3d/BuildingScene';
import { PropertiesPanel } from './components/inspector/PropertiesPanel';
import { ProjectDashboard } from './components/dashboard/ProjectDashboard';
import { ExportModal } from './components/export/ExportModal';
import { FurnitureCatalog } from './components/furniture/FurnitureCatalog';
import { AiAssistantDrawer } from './components/assistant/AiAssistantDrawer';
import { useFloorPlanStore } from './store/useFloorPlanStore';

export default function App() {
  const { viewMode } = useFloorPlanStore();

  const [isUploadOpen, setIsUploadOpen] = useState<boolean>(false);
  const [isExportOpen, setIsExportOpen] = useState<boolean>(false);
  const [isFurnitureOpen, setIsFurnitureOpen] = useState<boolean>(false);
  const [isAssistantOpen, setIsAssistantOpen] = useState<boolean>(false);

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-[#0A0D14] text-[#F1F5F9] font-sans antialiased">
      {/* Precision CAD Top Navbar */}
      <Navbar
        onOpenUpload={() => setIsUploadOpen(true)}
        onOpenExport={() => setIsExportOpen(true)}
        onOpenFurniture={() => setIsFurnitureOpen(true)}
        onOpenAssistant={() => setIsAssistantOpen(true)}
      />

      {/* Main Workspace Body */}
      <main className="flex flex-1 overflow-hidden relative">
        {/* VIEW MODE: SPLIT (2D Left, 3D Right) */}
        {viewMode === 'split' && (
          <>
            <div className="h-full w-1/2 border-r border-[#1F2942] relative">
              <Canvas2D />
            </div>
            <div className="h-full w-1/2 relative">
              <BuildingScene />
            </div>
          </>
        )}

        {/* VIEW MODE: 2D FULL */}
        {viewMode === '2d' && (
          <div className="h-full w-full relative">
            <Canvas2D />
          </div>
        )}

        {/* VIEW MODE: 3D FULL */}
        {viewMode === '3d' && (
          <div className="h-full w-full relative">
            <BuildingScene />
          </div>
        )}

        {/* Right Properties Inspector */}
        <PropertiesPanel onOpenFurnitureCatalog={() => setIsFurnitureOpen(true)} />
      </main>

      {/* Modals & Drawers */}
      <ProjectDashboard
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
      />

      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
      />

      <FurnitureCatalog
        isOpen={isFurnitureOpen}
        onClose={() => setIsFurnitureOpen(false)}
      />

      <AiAssistantDrawer
        isOpen={isAssistantOpen}
        onClose={() => setIsAssistantOpen(false)}
      />
    </div>
  );
}
