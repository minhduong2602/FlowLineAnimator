import React from 'react';
import { 
  Activity, 
  Play, 
  Pause, 
  RotateCcw, 
  Download, 
  Upload,
  Maximize2, 
  Minimize2, 
  Undo2,
  Redo2,
  Sliders
} from 'lucide-react';

interface HeaderProps {
  isPlaying: boolean;
  onTogglePlay: () => void;
  onReset: () => void;
  onOpenExport: () => void;
  onOpenImport: () => void;
  onAddImage: () => void;
  onToggleSidebar: () => void;
  sidebarOpen: boolean;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  fps: number;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  isPlaying,
  onTogglePlay,
  onReset,
  onOpenExport,
  onOpenImport,
  onToggleSidebar,
  sidebarOpen,
  isFullscreen,
  onToggleFullscreen,
  fps,
  canUndo,
  canRedo,
  onUndo,
  onRedo
}) => {
  return (
    <header className="h-[64px] border-b border-[var(--color-hairline)] bg-[var(--color-paper)] px-8 flex items-center justify-between z-30 shrink-0">
      <div className="flex items-center gap-4">
        <div className="w-8 h-8 bg-[var(--color-ink)] rounded-[6px] flex items-center justify-center shadow-sm">
          <Activity className="w-4 h-4 text-[var(--color-paper)]" />
        </div>
        <h1 className="text-[18px] font-semibold tracking-[-0.025em] text-[var(--color-ink)] flex items-baseline gap-2">
          VectorFlow
          <span className="text-[12px] font-normal tracking-[0.05em] text-[var(--color-mid-gray)] uppercase">v3.0</span>
        </h1>
      </div>

      <div className="flex items-center gap-3">
        {/* Undo/Redo Buttons */}
        <div className="flex items-center gap-1 bg-[var(--color-surface-alt)] border border-[var(--color-hairline)] rounded-[18px] p-1 mr-2">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            className={`p-1.5 rounded-[14px] transition-all ${
              canUndo 
                ? 'text-[var(--color-ink)] hover:bg-[var(--color-canvas)]' 
                : 'text-[var(--color-mid-gray)] opacity-50 cursor-not-allowed'
            }`}
            title="Undo"
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <div className="w-[1px] h-4 bg-[var(--color-hairline)]"></div>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            className={`p-1.5 rounded-[14px] transition-all ${
              canRedo 
                ? 'text-[var(--color-ink)] hover:bg-[var(--color-canvas)]' 
                : 'text-[var(--color-mid-gray)] opacity-50 cursor-not-allowed'
            }`}
            title="Redo"
          >
            <Redo2 className="w-4 h-4" />
          </button>
        </div>

        {/* FPS Badge */}
        <div className="hidden sm:flex items-center gap-2 px-2 py-1 rounded-[18px] bg-[var(--color-surface-alt)] border border-[var(--color-hairline)]">
          <span className={`w-2 h-2 rounded-full ${isPlaying ? 'bg-[var(--color-ink)]' : 'bg-[var(--color-mid-gray)]'}`}></span>
          <span className="text-[12px] font-medium text-[var(--color-ink)]">{fps} FPS</span>
        </div>

        {/* Play/Pause Button */}
        <button
          onClick={onTogglePlay}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-[18px] text-[14px] font-medium transition-all ${
            isPlaying 
              ? 'bg-[var(--color-ink)] text-[var(--color-paper)]' 
              : 'bg-[var(--color-surface-alt)] text-[var(--color-ink)] border border-[var(--color-hairline)]'
          }`}
          title={isPlaying ? 'Pause Simulation' : 'Start Simulation'}
        >
          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          <span className="hidden md:inline">{isPlaying ? 'Pause' : 'Resume'}</span>
        </button>

        {/* Reset Button */}
        <button
          onClick={onReset}
          className="p-2 rounded-[18px] bg-transparent border border-[var(--color-hairline)] text-[var(--color-ink)] hover:bg-[var(--color-canvas)] transition-all"
          title="Reset Data"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        {/* Import Button */}
        <button
          onClick={onOpenImport}
          className="flex items-center gap-2 px-3 py-1.5 rounded-[18px] bg-transparent border border-[var(--color-hairline)] text-[var(--color-ink)] text-[14px] font-medium hover:bg-[var(--color-canvas)] transition-all"
          title="Import SVG"
        >
          <Upload className="w-4 h-4" />
          <span className="hidden lg:inline">Import</span>
        </button>

        {/* Export / Record Button */}
        <button
          onClick={onOpenExport}
          className="flex items-center gap-2 px-3 py-1.5 rounded-[18px] bg-transparent border border-[var(--color-hairline)] text-[var(--color-ink)] text-[14px] font-medium hover:bg-[var(--color-canvas)] transition-all"
        >
          <Download className="w-4 h-4" />
          <span className="hidden sm:inline">Export</span>
        </button>

        {/* Fullscreen Toggle */}
        <button
          onClick={onToggleFullscreen}
          className="hidden sm:flex p-2 rounded-[18px] bg-transparent border border-[var(--color-hairline)] text-[var(--color-ink)] hover:bg-[var(--color-canvas)] transition-all"
          title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>

        {/* Sidebar Toggle */}
        <button
          onClick={onToggleSidebar}
          className={`p-2 rounded-[18px] border transition-all ${
            sidebarOpen 
              ? 'bg-[var(--color-ink)] border-[var(--color-ink)] text-[var(--color-paper)]' 
              : 'bg-transparent border-[var(--color-hairline)] text-[var(--color-ink)] hover:bg-[var(--color-canvas)]'
          }`}
          title="Toggle Control Panel"
        >
          <Sliders className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};

