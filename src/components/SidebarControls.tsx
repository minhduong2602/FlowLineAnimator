import React, { useState } from 'react';
import { DrawingPath, ArtboardSettings } from '../types';
import { GRADIENT_PRESETS, DASH_PRESETS } from '../data/presets';
import { 
  Sliders, 
  Layers, 
  Sparkles, 
  Trash2, 
  Eye, 
  EyeOff, 
  Plus, 
  Check, 
  Settings,
  Compass,
  CornerUpRight,
  Sparkle,
  Gauge,
  Palette,
  RotateCw
} from 'lucide-react';

interface SidebarControlsProps {
  paths: DrawingPath[];
  selectedPathId: string | null;
  onSelectPath: (id: string) => void;
  onUpdatePath: (id: string, updates: Partial<DrawingPath>) => void;
  onDeletePath: (id: string) => void;
  onAddPresetPath: (presetType: 'wave' | 'spiral' | 'infinity' | 'zigzag' | 'star' | 'circle') => void;
  settings: ArtboardSettings;
  onUpdateSettings: (updates: Partial<ArtboardSettings>) => void;
}

export const SidebarControls: React.FC<SidebarControlsProps> = ({
  paths,
  selectedPathId,
  onSelectPath,
  onUpdatePath,
  onDeletePath,
  onAddPresetPath,
  settings,
  onUpdateSettings
}) => {
  const [activeTab, setActiveTab] = useState<'style' | 'paths' | 'presets' | 'settings'>('style');

  const selectedPath = paths.find(p => p.id === selectedPathId) || paths[0];

  return (
    <aside className="w-80 lg:w-[380px] border-l border-white/5 bg-[#0d0d0f] flex flex-col h-[calc(100vh-4rem)] z-20 shrink-0 overflow-hidden select-none">
      {/* Top Inspector Tab Bar */}
      <div className="flex border-b border-white/10 bg-[#09090b] p-1.5 gap-1">
        <button
          onClick={() => setActiveTab('style')}
          className={`flex-1 py-2 px-1.5 rounded-lg text-[11px] font-medium flex items-center justify-center gap-1.5 transition-all ${
            activeTab === 'style' 
              ? 'bg-[#18181b] text-[#00F2FF] shadow-sm border border-white/10' 
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50'
          }`}
          title="Figma & Illustrator Stroke Inspector"
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>Stroke & Style</span>
        </button>
        <button
          onClick={() => setActiveTab('paths')}
          className={`flex-1 py-2 px-1.5 rounded-lg text-[11px] font-medium flex items-center justify-center gap-1.5 transition-all ${
            activeTab === 'paths' 
              ? 'bg-[#18181b] text-[#00F2FF] shadow-sm border border-white/10' 
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50'
          }`}
          title="Vector Layers"
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Layers ({paths.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('presets')}
          className={`flex-1 py-2 px-1.5 rounded-lg text-[11px] font-medium flex items-center justify-center gap-1.5 transition-all ${
            activeTab === 'presets' 
              ? 'bg-[#18181b] text-[#00F2FF] shadow-sm border border-white/10' 
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50'
          }`}
          title="Vector Shapes & Curves"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Shapes</span>
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`p-2 rounded-lg text-[11px] font-medium flex items-center justify-center transition-all ${
            activeTab === 'settings' 
              ? 'bg-[#18181b] text-[#00F2FF] shadow-sm border border-white/10' 
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50'
          }`}
          title="Artboard Settings"
        >
          <Settings className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {/* ========================================================================= */}
        {/* TAB 1: ADOBE ILLUSTRATOR / FIGMA STYLE STROKE & APPEARANCE INSPECTOR      */}
        {/* ========================================================================= */}
        {activeTab === 'style' && (
          <div className="space-y-4">
            {!selectedPath ? (
              <div className="text-center py-16 text-xs text-zinc-500 border border-dashed border-white/10 rounded-2xl p-6">
                <Sliders className="w-8 h-8 mx-auto text-zinc-600 mb-2" />
                <p className="font-semibold text-zinc-400">No Vector Path Selected</p>
                <p className="text-[11px] text-zinc-500 mt-1">Select a layer or draw on the artboard to open the Stroke properties inspector.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Layer Identity Card */}
                <div className="bg-[#141417] border border-white/10 rounded-xl p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400">Vector Path Layer</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-[#00F2FF]">
                      {selectedPath.anchors ? selectedPath.anchors.length : 0} Anchors {selectedPath.closed ? '• Closed' : ''}
                    </span>
                  </div>
                  <input
                    type="text"
                    value={selectedPath.name}
                    onChange={(e) => onUpdatePath(selectedPath.id, { name: e.target.value })}
                    className="w-full bg-[#1c1c21] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#00F2FF] font-medium"
                    placeholder="Layer Name"
                  />
                </div>

                {/* 1. STROKE WEIGHT & CORNER RADIUS SECTION (Illustrator Style) */}
                <div className="bg-[#141417] border border-white/10 rounded-xl p-3.5 space-y-3.5">
                  <div className="flex items-center justify-between border-b border-white/5 pb-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-200 flex items-center gap-1.5">
                      <Sliders className="w-3.5 h-3.5 text-[#00F2FF]" />
                      Stroke Properties
                    </span>
                    <span className="text-[10px] text-zinc-500 font-mono">Adobe/Figma Spec</span>
                  </div>

                  {/* Weight / Thickness */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-zinc-400 font-medium">Weight</span>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          min="0.5"
                          max="40"
                          step="0.5"
                          value={selectedPath.strokeWidth}
                          onChange={(e) => onUpdatePath(selectedPath.id, { strokeWidth: Math.max(0.5, parseFloat(e.target.value) || 1) })}
                          className="w-14 text-right bg-[#1c1c21] border border-white/10 rounded px-1.5 py-0.5 text-xs text-[#00F2FF] font-mono focus:outline-none focus:border-[#00F2FF]"
                        />
                        <span className="text-zinc-500 text-[11px]">px</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min="1"
                        max="32"
                        step="0.5"
                        value={selectedPath.strokeWidth}
                        onChange={(e) => onUpdatePath(selectedPath.id, { strokeWidth: parseFloat(e.target.value) })}
                        className="flex-1 accent-[#00F2FF] bg-zinc-800 h-1.5 rounded-lg cursor-pointer"
                      />
                    </div>
                    {/* Quick presets buttons */}
                    <div className="flex gap-1 pt-1">
                      {[1, 2, 4, 8, 12, 16].map(w => (
                        <button
                          key={w}
                          onClick={() => onUpdatePath(selectedPath.id, { strokeWidth: w })}
                          className={`flex-1 py-1 rounded text-[10px] font-mono border transition-all ${
                            selectedPath.strokeWidth === w 
                              ? 'bg-[#00F2FF]/20 border-[#00F2FF]/50 text-[#00F2FF]' 
                              : 'bg-[#1a1a1f] border-white/5 text-zinc-400 hover:text-white'
                          }`}
                        >
                          {w}px
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Corner Radius (Fillet) Adjustment */}
                  <div className="space-y-1.5 pt-2 border-t border-white/5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-zinc-400 font-medium flex items-center gap-1">
                        <CornerUpRight className="w-3.5 h-3.5 text-amber-400" />
                        Corner Radius
                      </span>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          min="0"
                          max="50"
                          step="1"
                          value={selectedPath.cornerRadius || 0}
                          onChange={(e) => onUpdatePath(selectedPath.id, { cornerRadius: Math.max(0, Math.min(50, parseFloat(e.target.value) || 0)) })}
                          className="w-14 text-right bg-[#1c1c21] border border-white/10 rounded px-1.5 py-0.5 text-xs text-amber-400 font-mono focus:outline-none focus:border-amber-400"
                        />
                        <span className="text-zinc-500 text-[11px]">px</span>
                      </div>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="50"
                      step="1"
                      value={selectedPath.cornerRadius || 0}
                      onChange={(e) => onUpdatePath(selectedPath.id, { cornerRadius: parseFloat(e.target.value) })}
                      className="w-full accent-amber-400 bg-zinc-800 h-1.5 rounded-lg cursor-pointer"
                    />
                    <div className="flex gap-1 pt-0.5">
                      {[0, 6, 12, 20, 32].map(r => (
                        <button
                          key={r}
                          onClick={() => onUpdatePath(selectedPath.id, { cornerRadius: r })}
                          className={`flex-1 py-1 rounded text-[10px] font-mono border transition-all ${
                            (selectedPath.cornerRadius || 0) === r 
                              ? 'bg-amber-400/20 border-amber-400/50 text-amber-300' 
                              : 'bg-[#1a1a1f] border-white/5 text-zinc-400 hover:text-white'
                          }`}
                        >
                          {r}px
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Stroke Cap Segmented Control (Illustrator Style) */}
                  <div className="space-y-1.5 pt-2 border-t border-white/5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-zinc-400 font-medium">Cap</span>
                      <span className="text-[10px] text-zinc-500 font-mono capitalize">{selectedPath.lineCap || 'round'}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-1 bg-[#1a1a1f] p-1 rounded-lg border border-white/5">
                      {/* Butt Cap */}
                      <button
                        onClick={() => onUpdatePath(selectedPath.id, { lineCap: 'butt' })}
                        className={`py-1.5 px-2 rounded text-[11px] font-medium flex items-center justify-center gap-1.5 transition-all ${
                          (selectedPath.lineCap || 'round') === 'butt'
                            ? 'bg-[#00F2FF]/20 text-[#00F2FF] border border-[#00F2FF]/40 shadow-sm'
                            : 'text-zinc-400 hover:text-white'
                        }`}
                        title="Butt Cap (Sharp Edge)"
                      >
                        <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor">
                          <rect x="2" y="5" width="12" height="6" rx="0" />
                        </svg>
                        <span>Butt</span>
                      </button>

                      {/* Round Cap */}
                      <button
                        onClick={() => onUpdatePath(selectedPath.id, { lineCap: 'round' })}
                        className={`py-1.5 px-2 rounded text-[11px] font-medium flex items-center justify-center gap-1.5 transition-all ${
                          (selectedPath.lineCap || 'round') === 'round'
                            ? 'bg-[#00F2FF]/20 text-[#00F2FF] border border-[#00F2FF]/40 shadow-sm'
                            : 'text-zinc-400 hover:text-white'
                        }`}
                        title="Round Cap (Pill Edge)"
                      >
                        <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor">
                          <rect x="2" y="5" width="12" height="6" rx="3" />
                        </svg>
                        <span>Round</span>
                      </button>

                      {/* Square Cap */}
                      <button
                        onClick={() => onUpdatePath(selectedPath.id, { lineCap: 'square' })}
                        className={`py-1.5 px-2 rounded text-[11px] font-medium flex items-center justify-center gap-1.5 transition-all ${
                          (selectedPath.lineCap || 'round') === 'square'
                            ? 'bg-[#00F2FF]/20 text-[#00F2FF] border border-[#00F2FF]/40 shadow-sm'
                            : 'text-zinc-400 hover:text-white'
                        }`}
                        title="Projecting Square Cap"
                      >
                        <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor">
                          <rect x="1" y="5" width="14" height="6" />
                        </svg>
                        <span>Square</span>
                      </button>
                    </div>
                  </div>

                  {/* Stroke Corner / Join Segmented Control (Illustrator Style) */}
                  <div className="space-y-1.5 pt-2 border-t border-white/5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-zinc-400 font-medium">Corner Join</span>
                      <span className="text-[10px] text-zinc-500 font-mono capitalize">{selectedPath.lineJoin || 'round'}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-1 bg-[#1a1a1f] p-1 rounded-lg border border-white/5">
                      {/* Miter Join */}
                      <button
                        onClick={() => onUpdatePath(selectedPath.id, { lineJoin: 'miter' })}
                        className={`py-1.5 px-2 rounded text-[11px] font-medium flex items-center justify-center gap-1.5 transition-all ${
                          (selectedPath.lineJoin || 'round') === 'miter'
                            ? 'bg-[#00F2FF]/20 text-[#00F2FF] border border-[#00F2FF]/40 shadow-sm'
                            : 'text-zinc-400 hover:text-white'
                        }`}
                        title="Miter Join (Pointed Corner)"
                      >
                        <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path d="M3 13 L8 4 L13 13" strokeLinejoin="miter" />
                        </svg>
                        <span>Miter</span>
                      </button>

                      {/* Round Join */}
                      <button
                        onClick={() => onUpdatePath(selectedPath.id, { lineJoin: 'round' })}
                        className={`py-1.5 px-2 rounded text-[11px] font-medium flex items-center justify-center gap-1.5 transition-all ${
                          (selectedPath.lineJoin || 'round') === 'round'
                            ? 'bg-[#00F2FF]/20 text-[#00F2FF] border border-[#00F2FF]/40 shadow-sm'
                            : 'text-zinc-400 hover:text-white'
                        }`}
                        title="Round Join (Smooth Curvature)"
                      >
                        <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path d="M3 13 L8 4 L13 13" strokeLinejoin="round" />
                        </svg>
                        <span>Round</span>
                      </button>

                      {/* Bevel Join */}
                      <button
                        onClick={() => onUpdatePath(selectedPath.id, { lineJoin: 'bevel' })}
                        className={`py-1.5 px-2 rounded text-[11px] font-medium flex items-center justify-center gap-1.5 transition-all ${
                          (selectedPath.lineJoin || 'round') === 'bevel'
                            ? 'bg-[#00F2FF]/20 text-[#00F2FF] border border-[#00F2FF]/40 shadow-sm'
                            : 'text-zinc-400 hover:text-white'
                        }`}
                        title="Bevel Join (Chamfered Corner)"
                      >
                        <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path d="M3 13 L8 4 L13 13" strokeLinejoin="bevel" />
                        </svg>
                        <span>Bevel</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* 2. ADOBE ILLUSTRATOR DASHED LINE PANEL */}
                <div className="bg-[#141417] border border-white/10 rounded-xl p-3.5 space-y-3.5">
                  <div className="flex items-center justify-between border-b border-white/5 pb-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedPath.dashPreset !== 'solid'}
                        onChange={(e) => {
                          onUpdatePath(selectedPath.id, { 
                            dashPreset: e.target.checked ? 'custom' : 'solid',
                            customDashLength: selectedPath.customDashLength || 24,
                            customGapLength: selectedPath.customGapLength || 12
                          });
                        }}
                        className="w-4 h-4 rounded accent-[#00F2FF] cursor-pointer"
                      />
                      <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-200">
                        Dashed Line
                      </span>
                    </label>
                    <span className="text-[10px] text-zinc-500 font-mono">Illustrator Matrix</span>
                  </div>

                  {/* 4-Field Illustrator Dash/Gap Matrix */}
                  <div className="space-y-2">
                    <div className="grid grid-cols-4 gap-1.5 text-center">
                      <span className="text-[10px] text-zinc-400 font-mono">dash 1</span>
                      <span className="text-[10px] text-zinc-400 font-mono">gap 1</span>
                      <span className="text-[10px] text-zinc-400 font-mono">dash 2</span>
                      <span className="text-[10px] text-zinc-400 font-mono">gap 2</span>
                    </div>
                    <div className="grid grid-cols-4 gap-1.5">
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={selectedPath.customDashLength || 20}
                        onChange={(e) => onUpdatePath(selectedPath.id, { 
                          dashPreset: 'custom',
                          customDashLength: Math.max(1, parseFloat(e.target.value) || 1) 
                        })}
                        className="w-full text-center bg-[#1c1c21] border border-white/10 rounded-lg py-1 text-xs text-[#00F2FF] font-mono focus:outline-none focus:border-[#00F2FF]"
                      />
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={selectedPath.customGapLength || 10}
                        onChange={(e) => onUpdatePath(selectedPath.id, { 
                          dashPreset: 'custom',
                          customGapLength: Math.max(1, parseFloat(e.target.value) || 1) 
                        })}
                        className="w-full text-center bg-[#1c1c21] border border-white/10 rounded-lg py-1 text-xs text-zinc-300 font-mono focus:outline-none focus:border-[#00F2FF]"
                      />
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={selectedPath.customDash2 || 0}
                        onChange={(e) => onUpdatePath(selectedPath.id, { 
                          dashPreset: 'custom',
                          customDash2: Math.max(0, parseFloat(e.target.value) || 0) 
                        })}
                        className="w-full text-center bg-[#1c1c21] border border-white/10 rounded-lg py-1 text-xs text-zinc-400 font-mono focus:outline-none focus:border-[#00F2FF]"
                        placeholder="0"
                      />
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={selectedPath.customGap2 || 0}
                        onChange={(e) => onUpdatePath(selectedPath.id, { 
                          dashPreset: 'custom',
                          customGap2: Math.max(0, parseFloat(e.target.value) || 0) 
                        })}
                        className="w-full text-center bg-[#1c1c21] border border-white/10 rounded-lg py-1 text-xs text-zinc-400 font-mono focus:outline-none focus:border-[#00F2FF]"
                        placeholder="0"
                      />
                    </div>
                  </div>

                  {/* Dash Pattern Preset Chips */}
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[10px] uppercase tracking-wider text-zinc-400">Dash Presets</span>
                    <div className="grid grid-cols-3 gap-1.5">
                      {DASH_PRESETS.map(dp => (
                        <button
                          key={dp.id}
                          onClick={() => onUpdatePath(selectedPath.id, { dashPreset: dp.id })}
                          className={`py-1.5 px-2 rounded-lg text-[10px] font-medium border text-center truncate transition-all ${
                            selectedPath.dashPreset === dp.id
                              ? 'bg-[#00F2FF]/20 border-[#00F2FF]/40 text-[#00F2FF]'
                              : 'bg-[#1a1a1f] border-white/5 text-zinc-400 hover:text-white'
                          }`}
                          title={`Pattern: ${dp.array}`}
                        >
                          {dp.name}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 3. CHROMA GRADIENT & COLOR PALETTE */}
                <div className="bg-[#141417] border border-white/10 rounded-xl p-3.5 space-y-3.5">
                  <div className="flex items-center justify-between border-b border-white/5 pb-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-200 flex items-center gap-1.5">
                      <Palette className="w-3.5 h-3.5 text-pink-400" />
                      Color & Appearance
                    </span>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={selectedPath.color}
                        onChange={(e) => onUpdatePath(selectedPath.id, { color: e.target.value, gradientId: '' })}
                        className="w-5 h-5 rounded cursor-pointer border-0 bg-transparent"
                        title="Pick Solid Color"
                      />
                    </div>
                  </div>

                  {/* Gradient Presets Grid */}
                  <div className="grid grid-cols-2 gap-2">
                    {GRADIENT_PRESETS.map(preset => (
                      <button
                        key={preset.id}
                        onClick={() => onUpdatePath(selectedPath.id, { gradientId: preset.id })}
                        className={`p-2.5 rounded-xl border flex items-center gap-2.5 transition-all text-left ${
                          selectedPath.gradientId === preset.id
                            ? 'bg-pink-500/10 border-pink-500/40 text-white ring-1 ring-pink-500/30'
                            : 'bg-[#1a1a1f] border-white/5 text-zinc-400 hover:bg-zinc-800'
                        }`}
                      >
                        <div 
                          className="w-5 h-5 rounded-lg shadow-sm shrink-0 border border-white/10" 
                          style={{ background: preset.background }} 
                        />
                        <div className="overflow-hidden">
                          <div className="text-[11px] font-medium text-white truncate">{preset.name}</div>
                        </div>
                      </button>
                    ))}
                  </div>

                  {/* Opacity Slider */}
                  <div className="space-y-1.5 pt-2 border-t border-white/5">
                    <div className="flex justify-between text-xs">
                      <span className="text-zinc-400 font-medium">Path Opacity</span>
                      <span className="text-[#00F2FF] font-mono">{Math.round((selectedPath.opacity ?? 1) * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0.1"
                      max="1"
                      step="0.05"
                      value={selectedPath.opacity ?? 1}
                      onChange={(e) => onUpdatePath(selectedPath.id, { opacity: parseFloat(e.target.value) })}
                      className="w-full accent-[#00F2FF] bg-zinc-800 h-1.5 rounded-lg cursor-pointer"
                    />
                  </div>

                  {/* Neon Glow Toggle */}
                  <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-medium text-white flex items-center gap-1.5">
                        <Sparkle className="w-3.5 h-3.5 text-[#00F2FF]" />
                        Neon Bloom Filter
                      </div>
                      <div className="text-[10px] text-zinc-500">Diffuse photonic glow emission</div>
                    </div>
                    <button
                      onClick={() => onUpdatePath(selectedPath.id, { showGlow: !selectedPath.showGlow })}
                      className={`w-10 h-5.5 rounded-full transition-colors relative p-0.5 ${
                        selectedPath.showGlow ? 'bg-[#00F2FF]' : 'bg-zinc-800'
                      }`}
                    >
                      <div className={`w-4.5 h-4.5 rounded-full bg-black transition-transform ${
                        selectedPath.showGlow ? 'translate-x-4.5' : 'translate-x-0'
                      }`} />
                    </button>
                  </div>
                </div>

                {/* 4. CONTINUOUS FLOW ANIMATION VECTOR */}
                <div className="bg-[#141417] border border-white/10 rounded-xl p-3.5 space-y-3.5">
                  <div className="flex items-center justify-between border-b border-white/5 pb-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-200 flex items-center gap-1.5">
                      <Gauge className="w-3.5 h-3.5 text-emerald-400" />
                      Continuous Flow Animation
                    </span>
                    <span className="text-[10px] text-zinc-500 font-mono">Real-time</span>
                  </div>

                  {/* Flow Speed Multiplier */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-zinc-400 font-medium">Flow Velocity</span>
                      <span className="text-emerald-400 font-mono">{selectedPath.flowSpeed}x</span>
                    </div>
                    <input
                      type="range"
                      min="0.1"
                      max="5"
                      step="0.1"
                      value={selectedPath.flowSpeed}
                      onChange={(e) => onUpdatePath(selectedPath.id, { flowSpeed: parseFloat(e.target.value) })}
                      className="w-full accent-emerald-400 bg-zinc-800 h-1.5 rounded-lg cursor-pointer"
                    />
                  </div>

                  {/* Flow Direction Segmented Toggle */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-zinc-400 font-medium">Flow Direction</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => onUpdatePath(selectedPath.id, { flowDirection: 'forward' })}
                        className={`py-2 rounded-lg text-xs font-medium border transition-all flex items-center justify-center gap-1.5 ${
                          selectedPath.flowDirection === 'forward'
                            ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                            : 'bg-[#1a1a1f] border-white/5 text-zinc-400 hover:text-white'
                        }`}
                      >
                        <RotateCw className="w-3.5 h-3.5" />
                        <span>Forward →</span>
                      </button>
                      <button
                        onClick={() => onUpdatePath(selectedPath.id, { flowDirection: 'reverse' })}
                        className={`py-2 rounded-lg text-xs font-medium border transition-all flex items-center justify-center gap-1.5 ${
                          selectedPath.flowDirection === 'reverse'
                            ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                            : 'bg-[#1a1a1f] border-white/5 text-zinc-400 hover:text-white'
                        }`}
                      >
                        <RotateCw className="w-3.5 h-3.5 -scale-x-100" />
                        <span>← Reverse</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: PATHS / LAYERS LIST                                                */}
        {/* ========================================================================= */}
        {activeTab === 'paths' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-[10px] uppercase tracking-[0.2em] text-zinc-400 font-bold">Layers Stack ({paths.length})</label>
                <p className="text-[11px] text-zinc-500">Select any layer to inspect handles & anchor points.</p>
              </div>
            </div>

            {paths.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-white/10 rounded-2xl p-6">
                <Compass className="w-8 h-8 text-zinc-600 mx-auto mb-3 animate-spin" style={{ animationDuration: '10s' }} />
                <h4 className="text-xs font-semibold text-white">No Paths Drawn Yet</h4>
                <p className="text-[11px] text-zinc-500 mt-1">Use the Pen (P) or Smooth Pencil (N) on the canvas, or pick a preset.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {paths.map(path => (
                  <div
                    key={path.id}
                    onClick={() => {
                      onSelectPath(path.id);
                      setActiveTab('style');
                    }}
                    className={`p-3 rounded-xl border transition-all flex items-center justify-between cursor-pointer ${
                      selectedPathId === path.id
                        ? 'bg-[#00F2FF]/10 border-[#00F2FF]/40 text-white shadow-lg shadow-[#00F2FF]/5'
                        : 'bg-[#141417] border-white/5 text-zinc-400 hover:bg-zinc-900'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div 
                        className="w-3.5 h-3.5 rounded-full shadow-sm shrink-0"
                        style={{ background: GRADIENT_PRESETS.find(g => g.id === path.gradientId)?.background || path.color }}
                      />
                      <div>
                        <div className="text-xs font-semibold text-white truncate max-w-[140px]">{path.name}</div>
                        <div className="text-[10px] text-zinc-500 uppercase font-mono">
                          {path.strokeWidth}px • {path.anchors ? path.anchors.length : 0} Anchors {path.closed ? '• Closed' : ''}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={(e) => { e.stopPropagation(); onUpdatePath(path.id, { enabled: !path.enabled }); }}
                        className={`p-1.5 rounded-lg border transition-all ${
                          path.enabled ? 'bg-[#00F2FF]/10 border-[#00F2FF]/30 text-[#00F2FF]' : 'bg-zinc-900 border-white/10 text-zinc-600'
                        }`}
                        title={path.enabled ? 'Hide path' : 'Show path'}
                      >
                        {path.enabled ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); onDeletePath(path.id); }}
                        className="p-1.5 rounded-lg bg-zinc-900 border border-white/10 text-zinc-500 hover:text-red-400 hover:border-red-500/30 transition-all"
                        title="Delete path"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: VECTOR PRESETS & CURVES                                            */}
        {/* ========================================================================= */}
        {activeTab === 'presets' && (
          <div className="space-y-4">
            <div>
              <label className="text-[10px] uppercase tracking-[0.2em] text-zinc-400 font-bold">Vector Shape Generators</label>
              <p className="text-[11px] text-zinc-500">Generate mathematical Bezier curves with editable anchors & corner radii.</p>
            </div>

            <div className="grid grid-cols-1 gap-2.5">
              {[
                { id: 'wave', name: 'Cyber Sine Wave', desc: 'Smooth oscillating continuous wave' },
                { id: 'spiral', name: 'Quantum Spiral', desc: 'Hypnotic radial vortex curve' },
                { id: 'infinity', name: 'Infinity Loop', desc: 'Figure-eight continuous flow' },
                { id: 'circle', name: 'Cubic Circle', desc: 'Perfect 4-anchor Bezier ellipse' },
                { id: 'zigzag', name: 'Neural Pulse Zigzag', desc: 'Sharp telemetry pulse trace' },
                { id: 'star', name: 'Geodesic Star', desc: 'Multi-point vector starburst' }
              ].map(preset => (
                <button
                  key={preset.id}
                  onClick={() => onAddPresetPath(preset.id as any)}
                  className="p-3.5 rounded-xl bg-[#141417] border border-white/5 hover:border-[#00F2FF]/40 hover:bg-zinc-900 text-left transition-all group flex items-center justify-between"
                >
                  <div>
                    <div className="text-xs font-semibold text-white group-hover:text-[#00F2FF] transition-colors">{preset.name}</div>
                    <div className="text-[10px] text-zinc-500 mt-0.5">{preset.desc}</div>
                  </div>
                  <Plus className="w-4 h-4 text-zinc-500 group-hover:text-[#00F2FF] group-hover:scale-110 transition-all" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: ARTBOARD SETTINGS                                                  */}
        {/* ========================================================================= */}
        {activeTab === 'settings' && (
          <div className="space-y-4">
            <div>
              <label className="text-[10px] uppercase tracking-[0.2em] text-zinc-400 font-bold">Artboard & Environment</label>
              <p className="text-[11px] text-zinc-500">Configure global canvas settings, pencil curve smoothness, and grid.</p>
            </div>

            <div className="space-y-4">
              {/* Pencil Smoothness Tolerance */}
              <div className="bg-[#141417] border border-white/10 rounded-xl p-3.5 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-300 font-medium">Pencil Smoothing (N)</span>
                  <span className="text-[#00F2FF] font-mono">{settings.pencilSmoothness || 6}px</span>
                </div>
                <input
                  type="range"
                  min="2"
                  max="16"
                  step="1"
                  value={settings.pencilSmoothness || 6}
                  onChange={(e) => onUpdateSettings({ pencilSmoothness: parseFloat(e.target.value) })}
                  className="w-full accent-[#00F2FF] bg-zinc-800 h-1.5 rounded-lg cursor-pointer"
                />
                <p className="text-[10px] text-zinc-500">Higher values reduce jitter and create smoother cubic Bezier splines.</p>
              </div>

              {/* Global Animation Speed */}
              <div className="bg-[#141417] border border-white/10 rounded-xl p-3.5 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-300 font-medium">Global Speed Multiplier</span>
                  <span className="text-[#00F2FF] font-mono">{settings.globalSpeed}x</span>
                </div>
                <input
                  type="range"
                  min="0.2"
                  max="3"
                  step="0.1"
                  value={settings.globalSpeed}
                  onChange={(e) => onUpdateSettings({ globalSpeed: parseFloat(e.target.value) })}
                  className="w-full accent-[#00F2FF] bg-zinc-800 h-1.5 rounded-lg cursor-pointer"
                />
              </div>

              {/* Background Color & Grid */}
              <div className="bg-[#141417] border border-white/10 rounded-xl p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-300 font-medium">Show Canvas Grid</span>
                  <button
                    onClick={() => onUpdateSettings({ showGrid: !settings.showGrid })}
                    className={`w-10 h-5.5 rounded-full transition-colors relative p-0.5 ${
                      settings.showGrid ? 'bg-[#00F2FF]' : 'bg-zinc-800'
                    }`}
                  >
                    <div className={`w-4.5 h-4.5 rounded-full bg-black transition-transform ${
                      settings.showGrid ? 'translate-x-4.5' : 'translate-x-0'
                    }`} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
