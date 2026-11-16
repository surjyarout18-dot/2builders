import React, { useState, useEffect } from 'react';
import { Navbar } from './components/navbar/Navbar';
import { Canvas2D } from './components/canvas2d/Canvas2D';
import { BuildingScene } from './components/viewer3d/BuildingScene';
import { PropertiesPanel } from './components/inspector/PropertiesPanel';
import { ProjectDashboard } from './components/dashboard/ProjectDashboard';
import { ExportModal } from './components/export/ExportModal';
import { FurnitureCatalog } from './components/furniture/FurnitureCatalog';
import { AiAssistantDrawer } from './components/assistant/AiAssistantDrawer';
import { PromptToPlanModal } from './components/generator/PromptToPlanModal';
import { RecognitionReviewModal } from './components/recognition/RecognitionReviewModal';
import { ScheduleTakeoffsModal } from './components/schedule/ScheduleTakeoffsModal';
import { RealismControlsModal } from './components/viewer3d/RealismControlsModal';
import { HistoryModal } from './components/history/HistoryModal';
import { FloorLevelBar } from './components/floors/FloorLevelBar';
import { LandingPage } from './components/landing/LandingPage';
import { useFloorPlanStore } from './store/useFloorPlanStore';

export default function App() {
  const { viewMode, setViewMode, currentPage } = useFloorPlanStore();

  const [isUploadOpen, setIsUploadOpen] = useState<boolean>(false);
  const [isExportOpen, setIsExportOpen] = useState<boolean>(false);
  const [isFurnitureOpen, setIsFurnitureOpen] = useState<boolean>(false);
  const [isAssistantOpen, setIsAssistantOpen] = useState<boolean>(false);
  const [isGeneratorOpen, setIsGeneratorOpen] = useState<boolean>(false);
  const [isReviewOpen, setIsReviewOpen] = useState<boolean>(false);
  const [isTakeoffsOpen, setIsTakeoffsOpen] = useState<boolean>(false);
  const [isRealismOpen, setIsRealismOpen] = useState<boolean>(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState<boolean>(false);

  // Global hotkeys for /history and /edit navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+H or Cmd+H to toggle Revision History
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'h') {
        e.preventDefault();
        setIsHistoryOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-[#0A0D14] text-[#F1F5F9] font-sans antialiased">
      {currentPage === 'landing' ? (
        <div className="h-full w-full overflow-y-auto">
          <LandingPage onOpenGenerator={() => setIsGeneratorOpen(true)} />
        </div>
      ) : (
        <>
          {/* Precision CAD Top Navbar */}
          <Navbar
            onOpenUpload={() => setIsUploadOpen(true)}
            onOpenExport={() => setIsExportOpen(true)}
            onOpenFurniture={() => setIsFurnitureOpen(true)}
            onOpenAssistant={() => setIsAssistantOpen(true)}
            onOpenGenerator={() => setIsGeneratorOpen(true)}
            onOpenTakeoffs={() => setIsTakeoffsOpen(true)}
            onOpenReview={() => setIsReviewOpen(true)}
            onOpenRealism={() => setIsRealismOpen(true)}
            onOpenHistory={() => setIsHistoryOpen(true)}
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

            {/* VIEW MODE: 3D FULL or WALKTHROUGH */}
            {(viewMode === '3d' || viewMode === 'walkthrough') && (
              <div className="h-full w-full relative">
                <BuildingScene />
              </div>
            )}

            {/* Floating Multi-Floor Level Switcher */}
            <FloorLevelBar />

            {/* Right Properties Inspector */}
            <PropertiesPanel onOpenFurnitureCatalog={() => setIsFurnitureOpen(true)} />
          </main>
        </>
      )}

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

      <PromptToPlanModal
        isOpen={isGeneratorOpen}
        onClose={() => setIsGeneratorOpen(false)}
      />

      <RecognitionReviewModal
        isOpen={isReviewOpen}
        onClose={() => setIsReviewOpen(false)}
      />

      <ScheduleTakeoffsModal
        isOpen={isTakeoffsOpen}
        onClose={() => setIsTakeoffsOpen(false)}
      />

      <RealismControlsModal
        isOpen={isRealismOpen}
        onClose={() => setIsRealismOpen(false)}
      />

      <HistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
      />
    </div>
  );
}
