import React from 'react';
import { Layers, Activity, ZoomIn, ZoomOut, Maximize } from 'lucide-react';

interface MetricsBarProps {
  pathCount: number;
  fps: number;
  isPlaying: boolean;
  zoom: number;
  onZoomChange: (zoom: number) => void;
}

const ZOOM_LEVELS = [0.1, 0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3, 4, 5];

export const MetricsBar: React.FC<MetricsBarProps> = ({
  pathCount,
  fps,
  isPlaying,
  zoom,
  onZoomChange,
}) => {
  const zoomPct = Math.round(zoom * 100);

  const stepZoom = (direction: 'in' | 'out') => {
    const sorted = ZOOM_LEVELS;
    if (direction === 'in') {
      const next = sorted.find(z => z > zoom + 0.001);
      onZoomChange(next ?? Math.min(zoom * 1.2, 10));
    } else {
      const prev = [...sorted].reverse().find(z => z < zoom - 0.001);
      onZoomChange(prev ?? Math.max(zoom * 0.8, 0.1));
    }
  };

  return (
    <div className="h-[48px] border-t border-[var(--color-hairline)] bg-[var(--color-paper)] px-4 flex items-center justify-between text-[12px] text-[var(--color-mid-gray)] shrink-0 overflow-x-auto gap-4">
      {/* Left: metrics */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-[var(--color-ink)]" />
          <span className="uppercase tracking-[0.05em]">Layers:</span>
          <span className="font-medium text-[var(--color-ink)]">{pathCount} active</span>
        </div>

        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-[var(--color-ink)]" />
          <span className="uppercase tracking-[0.05em]">Animation:</span>
          <span className="font-medium text-[var(--color-ink)]">{isPlaying ? `Running (${fps} FPS)` : 'Paused'}</span>
        </div>
      </div>

      {/* Center: branding */}
      <div className="hidden md:flex items-center gap-2 text-[var(--color-mid-gray)] text-[11px]">
        <span className="uppercase tracking-[0.05em]">Vector Artboard Engine • Continuous Flow SVG Animation</span>
      </div>

      {/* Right: zoom controls */}
      <div className="flex items-center gap-1 shrink-0">
        <button
          title="Zoom Out (Ctrl + -)"
          onClick={() => stepZoom('out')}
          className="p-1 rounded hover:bg-[var(--color-surface-alt)] text-[var(--color-mid-gray)] hover:text-[var(--color-ink)] transition-colors"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>

        {/* Zoom percentage – click to reset to 100% */}
        <button
          title="Reset zoom to 100% (Ctrl + 0)"
          onClick={() => onZoomChange(1)}
          className="min-w-[52px] text-center px-2 py-0.5 rounded font-mono font-medium text-[12px] text-[var(--color-ink)] hover:bg-[var(--color-surface-alt)] transition-colors tabular-nums"
        >
          {zoomPct}%
        </button>

        <button
          title="Zoom In (Ctrl + +)"
          onClick={() => stepZoom('in')}
          className="p-1 rounded hover:bg-[var(--color-surface-alt)] text-[var(--color-mid-gray)] hover:text-[var(--color-ink)] transition-colors"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>

        <button
          title="Fit to view"
          onClick={() => onZoomChange(1)}
          className="p-1 rounded hover:bg-[var(--color-surface-alt)] text-[var(--color-mid-gray)] hover:text-[var(--color-ink)] transition-colors"
        >
          <Maximize className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
