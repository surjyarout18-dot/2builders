import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Sparkles, Layers, Box, MoveHorizontal } from 'lucide-react';

interface BeforeAfterSliderProps {
  beforeImage: string;
  afterImage: string;
  beforeLabel?: string;
  afterLabel?: string;
  onExploreDemo?: () => void;
}

export const BeforeAfterSlider: React.FC<BeforeAfterSliderProps> = ({
  beforeImage,
  afterImage,
  beforeLabel = '2D Architectural Plan',
  afterLabel = 'Living 3D Furnished Model',
  onExploreDemo
}) => {
  const [sliderPosition, setSliderPosition] = useState<number>(50); // percentage 0-100
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const handleMove = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percent = Math.max(5, Math.min(95, (x / rect.width) * 100));
    setSliderPosition(percent);
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isDragging || e.touches.length === 0) return;
    handleMove(e.touches[0].clientX);
  }, [isDragging, handleMove]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    handleMove(e.clientX);
  }, [isDragging, handleMove]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleTouchMove);
      window.addEventListener('touchend', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp, handleTouchMove]);

  return (
    <div className="relative rounded-3xl overflow-hidden border border-white/10 bg-slate-950/80 shadow-2xl group select-none">
      {/* Container holding the comparison */}
      <div
        ref={containerRef}
        onMouseDown={(e) => {
          setIsDragging(true);
          handleMove(e.clientX);
        }}
        onTouchStart={(e) => {
          setIsDragging(true);
          if (e.touches.length > 0) handleMove(e.touches[0].clientX);
        }}
        className="relative w-full h-[360px] sm:h-[440px] md:h-[500px] cursor-ew-resize overflow-hidden"
      >
        {/* Right Layer: 3D Furnished Model (Underneath) */}
        <div className="absolute inset-0 w-full h-full">
          <img
            src={afterImage}
            alt={afterLabel}
            className="w-full h-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-transparent to-transparent pointer-events-none" />
          {/* Label Badge Right */}
          <div className="absolute top-4 right-4 bg-slate-950/80 backdrop-blur-md border border-indigo-500/50 px-3 py-1.5 rounded-full flex items-center gap-1.5 text-xs font-bold text-indigo-300 shadow-xl pointer-events-none">
            <Box size={14} className="text-indigo-400" />
            <span>{afterLabel}</span>
          </div>
        </div>

        {/* Left Layer: 2D Floor Plan (Clipped on top) */}
        <div
          className="absolute inset-0 h-full overflow-hidden"
          style={{ width: `${sliderPosition}%` }}
        >
          <img
            src={beforeImage}
            alt={beforeLabel}
            className="absolute top-0 left-0 h-full max-w-none object-cover object-center"
            style={{
              width: containerRef.current ? `${containerRef.current.offsetWidth}px` : '100%'
            }}
          />
          <div className="absolute inset-0 bg-slate-950/30 backdrop-blur-[0.5px] pointer-events-none" />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-transparent to-transparent pointer-events-none" />
          {/* Label Badge Left */}
          <div className="absolute top-4 left-4 bg-slate-950/80 backdrop-blur-md border border-sky-500/50 px-3 py-1.5 rounded-full flex items-center gap-1.5 text-xs font-bold text-sky-300 shadow-xl pointer-events-none whitespace-nowrap">
            <Layers size={14} className="text-sky-400" />
            <span>{beforeLabel}</span>
          </div>
        </div>

        {/* Divider Line & Drag Handle */}
        <div
          className="absolute top-0 bottom-0 w-1 bg-gradient-to-b from-sky-400 via-indigo-400 to-purple-400 shadow-[0_0_15px_rgba(56,189,248,0.8)] pointer-events-none"
          style={{ left: `${sliderPosition}%` }}
        >
          <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-10 h-10 rounded-full bg-slate-900 border-2 border-sky-400 text-sky-300 flex items-center justify-center shadow-2xl shadow-sky-500/50 pointer-events-auto cursor-ew-resize hover:scale-110 active:scale-95 transition-transform">
            <MoveHorizontal size={18} />
          </div>
        </div>

        {/* Interactive Bottom Overlay */}
        <div className="absolute bottom-5 left-5 right-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pointer-events-none">
          <div className="bg-slate-950/85 backdrop-blur-md border border-white/10 px-4 py-2.5 rounded-2xl shadow-2xl pointer-events-auto">
            <span className="text-[11px] text-slate-400 block font-mono uppercase tracking-wider">Drag Slider</span>
            <span className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
              <span>Compare 2D Blueprint & Live 3D Synthesis</span>
              <Sparkles size={13} className="text-sky-400" />
            </span>
          </div>

          {onExploreDemo && (
            <button
              onClick={onExploreDemo}
              className="pointer-events-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 via-indigo-600 to-purple-600 hover:from-sky-400 hover:to-indigo-500 text-white font-bold text-xs shadow-xl shadow-sky-500/25 transition-all transform active:scale-95 flex items-center gap-2"
            >
              <span>Launch Live 3D Interactive Model</span>
              <Sparkles size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

