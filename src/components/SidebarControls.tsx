import React, { useState } from 'react';
import { DrawingPath, ArtboardSettings } from '../types';
import { GRADIENT_PRESETS, DASH_PRESETS } from '../data/presets';
import { 
  Sliders, Layers, Sparkles, Trash2, Eye, EyeOff, Plus, Check, Settings, 
  Compass, CornerUpRight, Sparkle, Gauge, Palette, RotateCw, GitMerge, 
  ChevronDown, ChevronRight 
} from 'lucide-react';

function useLocalStorageState(key, defaultValue) {
  const [state, setState] = useState(() => {
    try {
      const stored = localStorage.getItem(key);
      if (stored !== null) return JSON.parse(stored);
    } catch (e) {
      console.warn('Error reading from localStorage', e);
    }
    return defaultValue;
  });

  const setValue = (val) => {
    setState(val);
    try {
      localStorage.setItem(key, JSON.stringify(val));
    } catch (e) {
      console.warn('Error writing to localStorage', e);
    }
  };

  return [state, setValue];
}

const CollapsibleSection: React.FC<{
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  id: string;
  defaultExpanded?: boolean;
  children: React.ReactNode;
  className?: string;
}> = ({ title, subtitle, id, defaultExpanded = true, children, className = '' }) => {
  const [isExpanded, setIsExpanded] = useLocalStorageState(`section-expanded-${id}`, defaultExpanded);

  return (
    <div className={`bg-[var(--color-paper)] border border-[var(--color-hairline)] rounded-[24px] overflow-hidden ${className}`}>
      <div 
        className="flex items-center justify-between p-3.5 cursor-pointer hover:bg-[var(--color-surface-alt)] transition-colors border-b border-transparent"
        style={{ borderBottomColor: isExpanded ? 'var(--color-hairline)' : 'transparent' }}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
           {isExpanded ? <ChevronDown className="w-4 h-4 text-[var(--color-mid-gray)]" /> : <ChevronRight className="w-4 h-4 text-[var(--color-mid-gray)]" />}
           <div className="flex flex-col">
             {typeof title === 'string' ? <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-ink)] flex items-center gap-1.5">{title}</span> : title}
           </div>
        </div>
        {subtitle && <span className="text-[10px] text-[var(--color-mid-gray)] font-mono">{subtitle}</span>}
      </div>
      {isExpanded && (
        <div className="p-3.5 space-y-3.5 pt-0">
          {children}
        </div>
      )}
    </div>
  );
};

export const SidebarControls = ({
  paths,
  selectedPathId,
  onSelectPath,
  onUpdatePath,
  onDeletePath,
  settings,
  onUpdateSettings
}) => {
  const [activeTab, setActiveTab] = useState('paths');
  const selectedPath = paths.find(p => p.id === selectedPathId);

  return (
    <aside className="w-80 h-full bg-[var(--color-canvas)] border-r border-[var(--color-hairline)] flex flex-col z-10 relative">
      <div className="p-4 border-b border-[var(--color-hairline)] flex items-center justify-between bg-[var(--color-paper)]">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-[var(--color-ink)] flex items-center justify-center">
            <Compass className="w-3.5 h-3.5 text-[var(--color-canvas)]" />
          </div>
          <span className="font-bold text-[var(--color-ink)] tracking-tight">Artboard</span>
        </div>
      </div>

      <div className="p-4 flex gap-2">
        <button
          onClick={() => setActiveTab('paths')}
          className={`flex-1 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all ${
            activeTab === 'paths' ? 'bg-[var(--color-ink)] text-[var(--color-canvas)]' : 'text-[var(--color-mid-gray)] hover:bg-[var(--color-surface-alt)]'
          }`}
        >
          Layers
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`flex-1 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all ${
            activeTab === 'settings' ? 'bg-[var(--color-ink)] text-[var(--color-canvas)]' : 'text-[var(--color-mid-gray)] hover:bg-[var(--color-surface-alt)]'
          }`}
        >
          Settings
        </button>
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar">
        {activeTab === 'paths' && (
          <div className="p-4 space-y-4">
            {!selectedPath ? (
              <div className="text-center py-12 px-4">
                <Layers className="w-8 h-8 text-[var(--color-mid-gray)] mx-auto mb-3 opacity-50" />
                <p className="text-sm font-medium text-[var(--color-ink)]">No path selected</p>
                <p className="text-xs text-[var(--color-mid-gray)] mt-1">Select a path on the canvas to edit its properties</p>
              </div>
            ) : (
              <div className="space-y-4">
                
                <CollapsibleSection id="layer-identity" title={selectedPath.type === 'image' ? "Image Layer" : "Vector Path Layer"} subtitle={selectedPath.type === 'image' ? `${Math.round(selectedPath.imageWidth || 0)}x${Math.round(selectedPath.imageHeight || 0)}` : (selectedPath.anchors ? `${selectedPath.anchors.length} Anchors` : '0 Anchors')}>
                  <input
                    type="text"
                    value={selectedPath.name}
                    onChange={(e) => onUpdatePath(selectedPath.id, { name: e.target.value })}
                    className="w-full bg-[var(--color-surface-alt)] border border-[var(--color-hairline)] rounded-[18px] px-2.5 py-1.5 text-xs text-[var(--color-ink)] focus:outline-none focus:border-[#00F2FF] font-medium mt-3"
                    placeholder="Layer Name"
                  />
                </CollapsibleSection>

                <CollapsibleSection id="stroke-props" title={<><Sliders className="w-3.5 h-3.5 text-[var(--color-ink)]" />Stroke Properties</>} subtitle="Adobe/Figma Spec">
                  <div className="space-y-1.5 mt-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[var(--color-mid-gray)] font-medium">Weight</span>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          min="0.5"
                          max="40"
                          step="0.5"
                          value={selectedPath.strokeWidth}
                          onChange={(e) => onUpdatePath(selectedPath.id, { strokeWidth: Math.max(0.5, parseFloat(e.target.value) || 1) })}
                          className="w-14 text-right bg-[var(--color-surface-alt)] border border-[var(--color-hairline)] rounded px-1.5 py-0.5 text-xs text-[var(--color-ink)] font-mono focus:outline-none focus:border-[#00F2FF]"
                        />
                        <span className="text-[var(--color-mid-gray)] text-[11px]">px</span>
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
                        className="flex-1 accent-[var(--color-ink)] bg-[var(--color-surface-alt)] h-1.5 rounded-[18px] cursor-pointer"
                      />
                    </div>
                    <div className="flex gap-1 pt-1">
                      {[1, 2, 4, 8, 12, 16].map(w => (
                        <button
                          key={w}
                          onClick={() => onUpdatePath(selectedPath.id, { strokeWidth: w })}
                          className={`flex-1 py-1 rounded text-[10px] font-mono border transition-all ${
                            selectedPath.strokeWidth === w 
                              ? 'bg-[var(--color-ink)] border-[var(--color-ink)] text-[var(--color-canvas)]'
                              : 'bg-[var(--color-surface-alt)] border-[var(--color-hairline)] text-[var(--color-mid-gray)] hover:border-[var(--color-mid-gray)]'
                          }`}
                        >
                          {w}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  <div className="space-y-1.5 pt-2 border-t border-[var(--color-hairline)]">
                    <div className="flex justify-between text-xs mb-2">
                      <span className="text-[var(--color-mid-gray)] font-medium">Corner Join</span>
                    </div>
                    <div className="grid grid-cols-3 gap-1">
                      <button
                        onClick={() => onUpdatePath(selectedPath.id, { lineJoin: 'round' })}
                        className={`flex flex-col items-center gap-1.5 py-1.5 rounded border transition-all text-[10px] ${
                          selectedPath.lineJoin === 'round' || !selectedPath.lineJoin
                            ? 'bg-[var(--color-surface-alt)] border-[var(--color-ink)] text-[var(--color-ink)]'
                            : 'bg-transparent border-[var(--color-hairline)] text-[var(--color-mid-gray)] hover:bg-[var(--color-surface-alt)]'
                        }`}
                      >
                        Round
                      </button>
                      <button
                        onClick={() => onUpdatePath(selectedPath.id, { lineJoin: 'miter' })}
                        className={`flex flex-col items-center gap-1.5 py-1.5 rounded border transition-all text-[10px] ${
                          selectedPath.lineJoin === 'miter'
                            ? 'bg-[var(--color-surface-alt)] border-[var(--color-ink)] text-[var(--color-ink)]'
                            : 'bg-transparent border-[var(--color-hairline)] text-[var(--color-mid-gray)] hover:bg-[var(--color-surface-alt)]'
                        }`}
                      >
                        Miter
                      </button>
                      <button
                        onClick={() => onUpdatePath(selectedPath.id, { lineJoin: 'bevel' })}
                        className={`flex flex-col items-center gap-1.5 py-1.5 rounded border transition-all text-[10px] ${
                          selectedPath.lineJoin === 'bevel'
                            ? 'bg-[var(--color-surface-alt)] border-[var(--color-ink)] text-[var(--color-ink)]'
                            : 'bg-transparent border-[var(--color-hairline)] text-[var(--color-mid-gray)] hover:bg-[var(--color-surface-alt)]'
                        }`}
                      >
                        Bevel
                      </button>
                    </div>
                  </div>
                </CollapsibleSection>

                <CollapsibleSection id="dash-patterns" title={<><Sparkles className="w-3.5 h-3.5 text-[var(--color-ink)]" />Dash Patterns</>} subtitle="Illustrator Matrix">
                  <div className="flex items-center gap-2 mt-3 mb-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-ink)] flex items-center gap-1.5">
                      Enable Dashes
                    </span>
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
                      className="w-4 h-4 rounded accent-[var(--color-ink)] cursor-pointer"
                    />
                  </div>
                  
                  {selectedPath.dashPreset !== 'solid' && (
                    <div className="space-y-3 pt-2">
                      <div className="flex gap-2">
                        <div className="flex-1 space-y-1">
                          <label className="text-[10px] text-[var(--color-mid-gray)] font-mono uppercase tracking-wider">Dash (px)</label>
                          <input
                            type="number"
                            value={selectedPath.customDashLength || 24}
                            onChange={(e) => onUpdatePath(selectedPath.id, { 
                              customDashLength: parseFloat(e.target.value) || 0,
                              dashPreset: 'custom'
                            })}
                            className="w-full bg-[var(--color-surface-alt)] border border-[var(--color-hairline)] rounded px-2 py-1 text-xs font-mono text-[var(--color-ink)] focus:outline-none focus:border-[#00F2FF]"
                          />
                        </div>
                        <div className="flex-1 space-y-1">
                          <label className="text-[10px] text-[var(--color-mid-gray)] font-mono uppercase tracking-wider">Gap (px)</label>
                          <input
                            type="number"
                            value={selectedPath.customGapLength || 12}
                            onChange={(e) => onUpdatePath(selectedPath.id, { 
                              customGapLength: parseFloat(e.target.value) || 0,
                              dashPreset: 'custom'
                            })}
                            className="w-full bg-[var(--color-surface-alt)] border border-[var(--color-hairline)] rounded px-2 py-1 text-xs font-mono text-[var(--color-ink)] focus:outline-none focus:border-[#00F2FF]"
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-2 pt-1 border-t border-[var(--color-hairline)]">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-mid-gray)]">Presets</span>
                        <div className="grid grid-cols-3 gap-1">
                          {DASH_PRESETS.filter(p => p.id !== 'solid').map(dp => (
                            <button
                              key={dp.id}
                              onClick={() => onUpdatePath(selectedPath.id, { 
                                dashPreset: dp.id,
                                customDashLength: dp.dashLength,
                                customGapLength: dp.gapLength
                              })}
                              className={`py-1.5 rounded border text-[10px] font-medium transition-all ${
                                selectedPath.dashPreset === dp.id
                                  ? 'bg-[var(--color-ink)] border-[var(--color-ink)] text-[var(--color-canvas)]'
                                  : 'bg-[var(--color-surface-alt)] border-[var(--color-hairline)] text-[var(--color-mid-gray)] hover:border-[var(--color-mid-gray)]'
                              }`}
                            >
                              {dp.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </CollapsibleSection>

                <CollapsibleSection id="color-appearance" title={<><Palette className="w-3.5 h-3.5 text-[var(--color-ink)]" />Color & Appearance</>}>
                  <div className="flex items-center gap-2 mt-3 mb-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-ink)] flex items-center gap-1.5 flex-1">
                      Solid Color
                    </span>
                    <input
                      type="color"
                      value={selectedPath.color}
                      onChange={(e) => onUpdatePath(selectedPath.id, { color: e.target.value, gradientId: '' })}
                      className="w-5 h-5 rounded cursor-pointer border-0 bg-transparent"
                      title="Pick Solid Color"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {GRADIENT_PRESETS.map(preset => (
                      <button
                        key={preset.id}
                        onClick={() => onUpdatePath(selectedPath.id, { gradientId: preset.id })}
                        className={`p-2.5 rounded-[24px] border flex items-center gap-2.5 transition-all text-left ${
                          selectedPath.gradientId === preset.id
                            ? 'bg-[var(--color-canvas)] border-[var(--color-ink)] text-[var(--color-ink)] ring-1 ring-pink-500/30'
                            : 'bg-[var(--color-surface-alt)] border-[var(--color-hairline)] text-[var(--color-mid-gray)] hover:bg-[var(--color-surface-alt)]'
                        }`}
                      >
                        <div 
                          className="w-5 h-5 rounded-[18px] shrink-0 border border-[var(--color-hairline)]" 
                          style={{ background: preset.background }} 
                        />
                        <div className="overflow-hidden">
                          <div className="text-[11px] font-medium text-[var(--color-ink)] truncate">{preset.name}</div>
                        </div>
                      </button>
                    ))}
                  </div>

                  <div className="space-y-1.5 pt-2 border-t border-[var(--color-hairline)]">
                    <div className="flex justify-between text-xs">
                      <span className="text-[var(--color-mid-gray)] font-medium">Path Opacity</span>
                      <span className="text-[var(--color-ink)] font-mono">{Math.round((selectedPath.opacity ?? 1) * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0.1"
                      max="1"
                      step="0.05"
                      value={selectedPath.opacity ?? 1}
                      onChange={(e) => onUpdatePath(selectedPath.id, { opacity: parseFloat(e.target.value) })}
                      className="w-full accent-[var(--color-ink)] bg-[var(--color-surface-alt)] h-1.5 rounded-[18px] cursor-pointer"
                    />
                  </div>

                  <div className="pt-2 border-t border-[var(--color-hairline)] flex items-center justify-between">
                    <div>
                      <div className="text-xs font-medium text-[var(--color-ink)] flex items-center gap-1.5">
                        <Sparkle className="w-3.5 h-3.5 text-[var(--color-ink)]" />
                        Neon Bloom Filter
                      </div>
                      <div className="text-[10px] text-[var(--color-mid-gray)]">Diffuse photonic glow emission</div>
                    </div>
                    <button
                      onClick={() => onUpdatePath(selectedPath.id, { showGlow: !selectedPath.showGlow })}
                      className={`w-10 h-5.5 rounded-full transition-colors relative p-0.5 ${
                        selectedPath.showGlow ? 'bg-[var(--color-ink)]' : 'bg-[var(--color-surface-alt)]'
                      }`}
                    >
                      <div className={`w-4.5 h-4.5 rounded-full bg-black transition-transform ${
                        selectedPath.showGlow ? 'translate-x-4.5' : 'translate-x-0'
                      }`} />
                    </button>
                  </div>
                </CollapsibleSection>

                <CollapsibleSection id="flow-animation" title={<><Gauge className="w-3.5 h-3.5 text-[var(--color-ink)]" />Continuous Flow Animation</>} subtitle="Real-time">
                  <div className="flex items-center justify-between pt-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedPath.flowSpeed > 0}
                        onChange={(e) => onUpdatePath(selectedPath.id, { flowSpeed: e.target.checked ? 1.5 : 0 })}
                        className="w-4 h-4 rounded accent-[var(--color-ink)] cursor-pointer"
                      />
                      <span className="text-xs font-medium text-[var(--color-ink)]">Enable Flow</span>
                    </label>
                  </div>
                  
                  {selectedPath.flowSpeed > 0 && (
                    <div className="space-y-3 pt-2">
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs">
                          <span className="text-[var(--color-mid-gray)] font-medium">Flow Velocity</span>
                          <span className="text-[var(--color-ink)] font-mono">{selectedPath.flowSpeed.toFixed(1)}x</span>
                        </div>
                        <input
                          type="range"
                          min="0.1"
                          max="5"
                          step="0.1"
                          value={selectedPath.flowSpeed}
                          onChange={(e) => onUpdatePath(selectedPath.id, { flowSpeed: parseFloat(e.target.value) })}
                          className="w-full accent-[var(--color-ink)] bg-[var(--color-surface-alt)] h-1.5 rounded-[18px] cursor-pointer"
                        />
                      </div>
                      
                      <div className="flex items-center justify-between pt-2 border-t border-[var(--color-hairline)]">
                        <span className="text-xs text-[var(--color-mid-gray)] font-medium">Reverse Direction</span>
                        <button
                          onClick={() => onUpdatePath(selectedPath.id, { 
                            flowDirection: selectedPath.flowDirection === 'forward' ? 'reverse' : 'forward' 
                          })}
                          className={`w-10 h-5.5 rounded-full transition-colors relative p-0.5 ${
                            selectedPath.flowDirection === 'reverse' ? 'bg-[var(--color-ink)]' : 'bg-[var(--color-surface-alt)]'
                          }`}
                        >
                          <div className={`w-4.5 h-4.5 rounded-full bg-black transition-transform ${
                            selectedPath.flowDirection === 'reverse' ? 'translate-x-4.5' : 'translate-x-0'
                          }`} />
                        </button>
                      </div>
                    </div>
                  )}
                </CollapsibleSection>

                <CollapsibleSection id="path-actions" title={<><RotateCw className="w-3.5 h-3.5 text-[var(--color-ink)]" />Path Actions</>}>
                  <div className="grid grid-cols-2 gap-2 mt-3">
                    <button
                      onClick={() => {
                        const duplicate = {
                          ...selectedPath,
                          id: Math.random().toString(36).substr(2, 9),
                          name: `${selectedPath.name} Copy`,
                          anchors: selectedPath.anchors.map(a => ({ ...a, x: a.x + 20, y: a.y + 20 }))
                        };
                        const updatedPaths = [...paths, duplicate];
                        onSelectPath(duplicate.id);
                        // Assuming the parent component has access to all paths, but onUpdatePath only updates one.
                        // We actually can't duplicate perfectly here without an onAddPath prop. 
                        // I will omit duplicate since it requires parent changes.
                      }}
                      className="flex items-center justify-center gap-1.5 py-1.5 rounded bg-[var(--color-surface-alt)] border border-[var(--color-hairline)] text-[11px] font-medium text-[var(--color-ink)] hover:bg-[var(--color-hairline)] transition-colors"
                      disabled
                    >
                      <Layers className="w-3.5 h-3.5" />
                      Duplicate
                    </button>
                    <button
                      onClick={() => onDeletePath(selectedPath.id)}
                      className="flex items-center justify-center gap-1.5 py-1.5 rounded bg-red-500/10 border border-red-500/20 text-[11px] font-medium text-red-500 hover:bg-red-500/20 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete
                    </button>
                  </div>
                </CollapsibleSection>
              </div>
            )}
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="p-4 space-y-4">
            <CollapsibleSection id="settings-pencil" title="Pencil Smoothing (N)">
              <div className="flex justify-between text-xs mt-3 mb-2">
                <span className="text-[var(--color-mid-gray)] font-medium">Smoothing Level</span>
                <span className="text-[var(--color-ink)] font-mono">{settings.pencilSmoothness || 6}px</span>
              </div>
              <input
                type="range"
                min="0"
                max="20"
                step="1"
                value={settings.pencilSmoothness || 6}
                onChange={(e) => onUpdateSettings({ pencilSmoothness: parseFloat(e.target.value) })}
                className="w-full accent-[var(--color-ink)] bg-[var(--color-surface-alt)] h-1.5 rounded-[18px] cursor-pointer"
              />
              <p className="text-[10px] text-[var(--color-mid-gray)] mt-2">
                Higher values create smoother curves but follow your cursor less strictly.
              </p>
            </CollapsibleSection>

            <CollapsibleSection id="settings-speed" title="Global Speed Multiplier">
              <div className="flex justify-between text-xs mt-3 mb-2">
                <span className="text-[var(--color-mid-gray)] font-medium">Multiplier</span>
                <span className="text-[var(--color-ink)] font-mono">{settings.globalSpeed}x</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="3"
                step="0.1"
                value={settings.globalSpeed}
                onChange={(e) => onUpdateSettings({ globalSpeed: parseFloat(e.target.value) })}
                className="w-full accent-[var(--color-ink)] bg-[var(--color-surface-alt)] h-1.5 rounded-[18px] cursor-pointer"
              />
            </CollapsibleSection>

            <CollapsibleSection id="settings-grid" title="Background Grid">
              <div className="flex items-center justify-between mt-3">
                <span className="text-xs text-[var(--color-mid-gray)] font-medium">Show Canvas Grid</span>
                <button
                  onClick={() => onUpdateSettings({ showGrid: !settings.showGrid })}
                  className={`w-10 h-5.5 rounded-full transition-colors relative p-0.5 ${
                    settings.showGrid ? 'bg-[var(--color-ink)]' : 'bg-[var(--color-surface-alt)]'
                  }`}
                >
                  <div className={`w-4.5 h-4.5 rounded-full bg-black transition-transform ${
                    settings.showGrid ? 'translate-x-4.5' : 'translate-x-0'
                  }`} />
                </button>
              </div>
            </CollapsibleSection>
          </div>
        )}
      </div>
    </aside>
  );
};
