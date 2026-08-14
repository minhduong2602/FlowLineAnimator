import React from 'react';
import { 
  Activity, 
  Play, 
  Pause, 
  RotateCcw, 
  Download, 
  Maximize2, 
  Minimize2, 
  Sliders
} from 'lucide-react';

interface HeaderProps {
  isPlaying: boolean;
  onTogglePlay: () => void;
  onReset: () => void;
  onOpenExport: () => void;
  onToggleSidebar: () => void;
  sidebarOpen: boolean;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  fps: number;
}

export const Header: React.FC<HeaderProps> = ({
  isPlaying,
  onTogglePlay,
  onReset,
  onOpenExport,
  onToggleSidebar,
  sidebarOpen,
  isFullscreen,
  onToggleFullscreen,
  fps
}) => {
  return (
    <header className="h-16 border-b border-white/5 bg-black/40 backdrop-blur-md px-8 flex items-center justify-between z-30 sticky top-0">
      <div className="flex items-center gap-4">
        <div className="w-8 h-8 bg-gradient-to-tr from-[#00F2FF] to-[#7000FF] rounded-lg p-0.5 shadow-lg shadow-[#00F2FF]/20 flex items-center justify-center">
          <div className="w-full h-full bg-[#050505] rounded-[6px] flex items-center justify-center">
            <Activity className="w-4 h-4 text-[#00F2FF] animate-pulse" />
          </div>
        </div>
        <h1 className="text-xl font-bold tracking-tighter text-white uppercase italic">
          VectorFlow <span className="text-xs font-normal not-italic text-zinc-500 ml-2 font-mono">Artboard v3.0</span>
        </h1>
      </div>

      <div className="flex items-center gap-4">
        {/* FPS Badge */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-lg bg-zinc-900 border border-white/5 text-xs font-mono text-zinc-400">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="text-[10px] uppercase tracking-widest text-zinc-400">Live Engine: {fps} FPS</span>
        </div>

        {/* Play/Pause Button */}
        <button
          onClick={onTogglePlay}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-all ${
            isPlaying 
              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30 hover:bg-amber-500/20' 
              : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20'
          }`}
          title={isPlaying ? 'Pause Simulation' : 'Start Simulation'}
        >
          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          <span className="hidden md:inline uppercase tracking-widest text-[10px]">{isPlaying ? 'Pause' : 'Resume'}</span>
        </button>

        {/* Reset Button */}
        <button
          onClick={onReset}
          className="p-2 rounded-lg bg-zinc-900 border border-white/10 text-zinc-400 hover:text-white hover:border-[#00F2FF] transition-all"
          title="Reset Data"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        {/* Export / Record Button */}
        <button
          onClick={onOpenExport}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white text-black text-xs font-bold hover:bg-[#00F2FF] transition-all transform active:scale-95 shadow-lg shadow-white/5 uppercase tracking-tighter"
        >
          <Download className="w-4 h-4" />
          <span className="hidden sm:inline">Export Studio</span>
        </button>

        {/* Fullscreen Toggle */}
        <button
          onClick={onToggleFullscreen}
          className="hidden sm:flex p-2 rounded-lg bg-zinc-900 border border-white/10 text-zinc-400 hover:text-white transition-all"
          title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>

        {/* Sidebar Toggle */}
        <button
          onClick={onToggleSidebar}
          className={`p-2 rounded-lg border transition-all ${
            sidebarOpen 
              ? 'bg-[#00F2FF]/10 border-[#00F2FF]/30 text-[#00F2FF]' 
              : 'bg-zinc-900 border-white/10 text-zinc-400 hover:text-white'
          }`}
          title="Toggle Control Panel"
        >
          <Sliders className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};

