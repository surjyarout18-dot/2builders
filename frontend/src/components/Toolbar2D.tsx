import React from 'react';
import {
  MousePointer,
  Hand,
  Square,
  DoorOpen,
  AppWindow,
  Shapes,
  Ruler,
  Trash2,
  Grid as GridIcon,
  Magnet
} from 'lucide-react';
import { useProjectStore } from '../store/useProjectStore';
import { EditorTool } from '../types';

export const Toolbar2D: React.FC = () => {
  const activeTool = useProjectStore((s) => s.activeTool);
  const setActiveTool = useProjectStore((s) => s.setActiveTool);
  const gridSnap = useProjectStore((s) => s.gridSnap);
  const setGridSnap = useProjectStore((s) => s.setGridSnap);
  const gridSize = useProjectStore((s) => s.gridSize);
  const setGridSize = useProjectStore((s) => s.setGridSize);

  const tools: { id: EditorTool; label: string; icon: React.ReactNode; shortcut: string }[] = [
    { id: 'select', label: 'Select (V)', icon: <MousePointer size={18} />, shortcut: 'V' },
    { id: 'pan', label: 'Pan (H / Alt)', icon: <Hand size={18} />, shortcut: 'H' },
    { id: 'wall', label: 'Draw Wall (W)', icon: <Square size={18} />, shortcut: 'W' },
    { id: 'door', label: 'Add Door (D)', icon: <DoorOpen size={18} />, shortcut: 'D' },
    { id: 'window', label: 'Add Window (N)', icon: <AppWindow size={18} />, shortcut: 'N' },
    { id: 'room', label: 'Room Polygon (R)', icon: <Shapes size={18} />, shortcut: 'R' },
    { id: 'measure', label: 'Measure (M)', icon: <Ruler size={18} />, shortcut: 'M' },
    { id: 'delete', label: 'Delete (X)', icon: <Trash2 size={18} />, shortcut: 'X' }
  ];

  return (
    <div className="absolute top-4 left-4 z-10 flex flex-col gap-1 bg-cad-panel/95 backdrop-blur border border-cad-border p-1.5 rounded-lg shadow-xl">
      {tools.map((t) => (
        <button
          key={t.id}
          title={`${t.label}`}
          onClick={() => setActiveTool(t.id)}
          className={`p-2.5 rounded transition-all flex items-center justify-center relative group ${
            activeTool === t.id
              ? 'bg-cad-accent text-slate-950 font-bold shadow-md'
              : 'text-slate-400 hover:text-slate-100 hover:bg-cad-surface'
          }`}
        >
          {t.icon}
          {/* Tooltip */}
          <span className="absolute left-full ml-2 px-2 py-1 bg-slate-900 border border-slate-700 text-xs text-slate-200 rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-opacity shadow-lg z-50">
            {t.label}
          </span>
        </button>
      ))}

      <div className="h-[1px] bg-cad-border my-1" />

      {/* Grid snap toggle */}
      <button
        title={`Snap to Grid (${gridSnap ? 'ON' : 'OFF'})`}
        onClick={() => setGridSnap(!gridSnap)}
        className={`p-2.5 rounded transition-all flex items-center justify-center relative group ${
          gridSnap ? 'text-cad-accent bg-cad-surface' : 'text-slate-500 hover:text-slate-300'
        }`}
      >
        <Magnet size={18} />
        <span className="absolute left-full ml-2 px-2 py-1 bg-slate-900 border border-slate-700 text-xs text-slate-200 rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-opacity shadow-lg z-50">
          Grid Snap: {gridSnap ? 'Enabled' : 'Disabled'}
        </span>
      </button>

      {/* Grid step toggle */}
      <button
        title={`Grid Step: ${gridSize}m`}
        onClick={() => setGridSize(gridSize === 0.5 ? 0.1 : (gridSize === 0.1 ? 1.0 : 0.5))}
        className="p-1 text-[10px] font-mono font-bold text-slate-400 hover:text-slate-200 text-center rounded hover:bg-cad-surface"
      >
        {gridSize}m
      </button>
    </div>
  );
};

