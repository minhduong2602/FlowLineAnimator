import React from 'react';
import { Layers, Zap, Compass, Activity } from 'lucide-react';

interface MetricsBarProps {
  pathCount: number;
  fps: number;
  isPlaying: boolean;
}

export const MetricsBar: React.FC<MetricsBarProps> = ({
  pathCount,
  fps,
  isPlaying
}) => {
  return (
    <div className="h-[48px] border-t border-[var(--color-hairline)] bg-[var(--color-paper)] px-8 flex items-center justify-between text-[12px] text-[var(--color-mid-gray)] shrink-0 overflow-x-auto">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-[var(--color-ink)]" />
          <span className="uppercase tracking-[0.05em]">Layers:</span>
          <span className="font-medium text-[var(--color-ink)]">{pathCount} active</span>
        </div>

        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-[var(--color-ink)]" />
          <span className="uppercase tracking-[0.05em]">Animation:</span>
          <span className="font-medium text-[var(--color-ink)]">{isPlaying ? 'Running (60 FPS)' : 'Paused'}</span>
        </div>
      </div>

      <div className="hidden md:flex items-center gap-2">
        <Zap className="w-4 h-4 text-[var(--color-ink)]" />
        <span className="uppercase tracking-[0.05em]">Vector Artboard Engine • Continuous Flow SVG Animation</span>
      </div>
    </div>
  );
};
