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
    <div className="h-12 border-t border-white/5 bg-[#0a0a0a]/90 backdrop-blur-md px-8 flex items-center justify-between text-xs text-zinc-400 shrink-0 overflow-x-auto">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <Layers className="w-3.5 h-3.5 text-[#00F2FF]" />
          <span className="text-zinc-500 uppercase tracking-widest text-[10px]">Layers:</span>
          <span className="font-mono text-white">{pathCount} active</span>
        </div>

        <div className="flex items-center gap-2">
          <Activity className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
          <span className="text-zinc-500 uppercase tracking-widest text-[10px]">Animation:</span>
          <span className="font-mono text-emerald-400 font-semibold">{isPlaying ? 'Running (60 FPS)' : 'Paused'}</span>
        </div>
      </div>

      <div className="hidden md:flex items-center gap-2 text-zinc-500">
        <Zap className="w-3.5 h-3.5 text-[#00F2FF]" />
        <span className="uppercase tracking-widest text-[10px]">Vector Artboard Engine • Continuous Flow SVG Animation</span>
      </div>
    </div>
  );
};
