import React, { useState } from 'react';
import { DrawingPath, ArtboardSettings, CapType } from '../types';
import { CAP_PRESETS } from '../data/presets';
import {
  Sliders, Layers, Trash2, Eye, EyeOff,
  Compass, CornerUpRight, Sparkle,
  ChevronDown, ChevronRight, ArrowLeftRight
} from 'lucide-react';

function useLocalStorageState<T>(key: string, defaultValue: T): [T, (val: T) => void] {
  const [state, setState] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(key);
      if (stored !== null) return JSON.parse(stored);
    } catch (e) {
      console.warn('Error reading from localStorage', e);
    }
    return defaultValue;
  });

  const setValue = (val: T) => {
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
  id: string;
  defaultExpanded?: boolean;
  children: React.ReactNode;
  className?: string;
  headerRight?: React.ReactNode;
}> = ({ title, id, defaultExpanded = true, children, className = '', headerRight }) => {
  const [isExpanded, setIsExpanded] = useLocalStorageState(`section-expanded-${id}`, defaultExpanded);

  return (
    <div className={`border-b border-[var(--color-hairline)] last:border-b-0 py-2 px-3 ${className}`}>
      <div
        className="flex items-center justify-between cursor-pointer select-none py-1 group"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-1.5">
          {isExpanded ? (
            <ChevronDown className="w-3.5 h-3.5 text-[var(--color-mid-gray)] group-hover:text-[var(--color-ink)] transition-colors" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 text-[var(--color-mid-gray)] group-hover:text-[var(--color-ink)] transition-colors" />
          )}
          <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-ink)] flex items-center gap-1.5">
            {title}
          </span>
        </div>
        {headerRight && <div onClick={e => e.stopPropagation()}>{headerRight}</div>}
      </div>
      {isExpanded && <div className="mt-1.5 space-y-2">{children}</div>}
    </div>
  );
};

export interface SidebarControlsProps {
  paths: DrawingPath[];
  selectedPathIds: string[];
  onSelectPaths: (ids: string[]) => void;
  onAddPath: (path: DrawingPath) => void;
  onUpdatePath: (id: string, updates: Partial<DrawingPath>) => void;
  onDeletePath: (id: string) => void;
  settings: ArtboardSettings;
  onUpdateSettings: (settings: Partial<ArtboardSettings>) => void;
}

export const SidebarControls: React.FC<SidebarControlsProps> = ({
  paths,
  selectedPathIds,
  onSelectPaths,
  onAddPath,
  onUpdatePath,
  onDeletePath,
  settings,
  onUpdateSettings
}) => {
  const [activeTab, setActiveTab] = useState<'paths' | 'settings'>('paths');
  const selectedPathId = selectedPathIds.length === 1 ? selectedPathIds[0] : null;
  const selectedPath = paths.find(p => p.id === selectedPathId);

  return (
    <aside className="w-72 h-full bg-[var(--color-canvas)] border-r border-[var(--color-hairline)] flex flex-col z-10 relative select-none">
      {/* Top Brand / Header */}
      <div className="px-3 py-2.5 border-b border-[var(--color-hairline)] flex items-center justify-between bg-[var(--color-paper)]">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-md bg-[var(--color-ink)] flex items-center justify-center">
            <Compass className="w-3 h-3 text-[var(--color-canvas)]" />
          </div>
          <span className="font-bold text-xs text-[var(--color-ink)] tracking-tight">FlowLine Studio</span>
        </div>

        {/* Tab switcher */}
        <div className="flex bg-[var(--color-surface-alt)] p-0.5 rounded-lg border border-[var(--color-hairline)]">
          <button
            onClick={() => setActiveTab('paths')}
            className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all ${
              activeTab === 'paths'
                ? 'bg-[var(--color-ink)] text-[var(--color-canvas)] shadow-xs'
                : 'text-[var(--color-mid-gray)] hover:text-[var(--color-ink)]'
            }`}
          >
            Design
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all ${
              activeTab === 'settings'
                ? 'bg-[var(--color-ink)] text-[var(--color-canvas)] shadow-xs'
                : 'text-[var(--color-mid-gray)] hover:text-[var(--color-ink)]'
            }`}
          >
            Canvas
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar divide-y divide-[var(--color-hairline)]">
        {activeTab === 'paths' && (
          <>
            {/* Layer Stack */}
            <CollapsibleSection id="layer-list" title={`Layers (${paths.length})`}>
              <div className="space-y-0.5 max-h-36 overflow-y-auto custom-scrollbar pr-0.5">
                {[...paths].reverse().map((p) => (
                  <div
                    key={p.id}
                    onClick={() => onSelectPaths([p.id])}
                    className={`flex items-center justify-between px-2 py-1 rounded cursor-pointer border transition-colors ${
                      selectedPathIds.includes(p.id)
                        ? 'bg-[var(--color-ink)] text-[var(--color-canvas)] border-[var(--color-ink)]'
                        : 'bg-[var(--color-surface-alt)]/50 text-[var(--color-mid-gray)] border-transparent hover:border-[var(--color-hairline)] hover:text-[var(--color-ink)]'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      {p.type === 'image' ? (
                        <Eye className="w-3 h-3 shrink-0" />
                      ) : (
                        <Layers className="w-3 h-3 shrink-0" />
                      )}
                      <span className="text-[11px] font-medium truncate">{p.name}</span>
                    </div>
                    <div className="flex items-center gap-1 opacity-70 hover:opacity-100">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onUpdatePath(p.id, { enabled: !p.enabled });
                        }}
                        className="p-0.5 hover:bg-black/10 rounded"
                        title={p.enabled ? "Hide Layer" : "Show Layer"}
                      >
                        {p.enabled ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                      </button>
                    </div>
                  </div>
                ))}
                {paths.length === 0 && (
                  <div className="text-center py-3 text-[11px] text-[var(--color-mid-gray)]">No layers yet</div>
                )}
              </div>
            </CollapsibleSection>

            {!selectedPath ? (
              <div className="text-center py-10 px-4">
                <p className="text-xs font-medium text-[var(--color-ink)]">No layer selected</p>
                <p className="text-[10px] text-[var(--color-mid-gray)] mt-0.5">Select a layer to edit properties</p>
              </div>
            ) : (
              <div>
                {/* ── Layer Header / Name + Quick Actions ── */}
                <div className="flex items-center justify-between px-3 py-1.5 bg-[var(--color-surface-alt)]/40 border-b border-[var(--color-hairline)]">
                  <input
                    type="text"
                    value={selectedPath.name}
                    onChange={(e) => onUpdatePath(selectedPath.id, { name: e.target.value })}
                    className="flex-1 bg-transparent border border-transparent hover:border-[var(--color-hairline)] focus:border-[#00F2FF] rounded px-1.5 py-0.5 text-xs font-bold text-[var(--color-ink)] focus:outline-none truncate mr-2"
                    title="Rename Layer"
                  />
                  <div className="flex items-center gap-0.5 shrink-0">
                    <button
                      onClick={() => {
                        const duplicate: DrawingPath = {
                          ...selectedPath,
                          id: `path-${Date.now()}`,
                          name: `${selectedPath.name} Copy`,
                          x: (selectedPath.x || 0) + 20,
                          y: (selectedPath.y || 0) + 20
                        };
                        if (duplicate.anchors) {
                          duplicate.anchors = duplicate.anchors.map(a => ({
                            ...a,
                            id: `anchor-${Math.random().toString(36).substr(2, 9)}`,
                            point: { x: a.point.x + 20, y: a.point.y + 20 }
                          }));
                        }
                        onAddPath(duplicate);
                        onSelectPaths([duplicate.id]);
                      }}
                      title="Duplicate Layer"
                      className="p-1 text-[var(--color-mid-gray)] hover:text-[var(--color-ink)] hover:bg-[var(--color-surface-alt)] rounded transition-colors"
                    >
                      <Layers className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onDeletePath(selectedPath.id)}
                      title="Delete Layer"
                      className="p-1 text-[var(--color-mid-gray)] hover:text-red-500 hover:bg-red-500/10 rounded transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* ── Section 1: Merged Transform & Appearance ── */}
                <CollapsibleSection id="transform-appearance" title="Transform & Appearance">
                  <div className="space-y-1.5">
                    {/* Row 1: X & Y (+ W & H for image) */}
                    <div className="flex items-center gap-1.5">
                      <div className="flex flex-1 items-center bg-[var(--color-surface-alt)] border border-[var(--color-hairline)] rounded hover:border-[var(--color-ink)] focus-within:border-[#00F2FF] px-2 py-1 transition-colors">
                        <span className="text-[10px] text-[var(--color-mid-gray)] w-3.5 font-mono select-none">X</span>
                        <input
                          type="number"
                          value={selectedPath.x || 0}
                          onChange={e => onUpdatePath(selectedPath.id, { x: parseFloat(e.target.value) || 0 })}
                          className="w-full bg-transparent text-xs text-[var(--color-ink)] focus:outline-none font-mono"
                        />
                      </div>
                      <div className="flex flex-1 items-center bg-[var(--color-surface-alt)] border border-[var(--color-hairline)] rounded hover:border-[var(--color-ink)] focus-within:border-[#00F2FF] px-2 py-1 transition-colors">
                        <span className="text-[10px] text-[var(--color-mid-gray)] w-3.5 font-mono select-none">Y</span>
                        <input
                          type="number"
                          value={selectedPath.y || 0}
                          onChange={e => onUpdatePath(selectedPath.id, { y: parseFloat(e.target.value) || 0 })}
                          className="w-full bg-transparent text-xs text-[var(--color-ink)] focus:outline-none font-mono"
                        />
                      </div>
                      {selectedPath.type === 'image' && (
                        <>
                          <div className="flex flex-1 items-center bg-[var(--color-surface-alt)] border border-[var(--color-hairline)] rounded hover:border-[var(--color-ink)] focus-within:border-[#00F2FF] px-2 py-1 transition-colors">
                            <span className="text-[10px] text-[var(--color-mid-gray)] w-3.5 font-mono select-none">W</span>
                            <input
                              type="number"
                              value={selectedPath.imageWidth || 0}
                              onChange={e => onUpdatePath(selectedPath.id, { imageWidth: parseFloat(e.target.value) || 0 })}
                              className="w-full bg-transparent text-xs text-[var(--color-ink)] focus:outline-none font-mono"
                            />
                          </div>
                          <div className="flex flex-1 items-center bg-[var(--color-surface-alt)] border border-[var(--color-hairline)] rounded hover:border-[var(--color-ink)] focus-within:border-[#00F2FF] px-2 py-1 transition-colors">
                            <span className="text-[10px] text-[var(--color-mid-gray)] w-3.5 font-mono select-none">H</span>
                            <input
                              type="number"
                              value={selectedPath.imageHeight || 0}
                              onChange={e => onUpdatePath(selectedPath.id, { imageHeight: parseFloat(e.target.value) || 0 })}
                              className="w-full bg-transparent text-xs text-[var(--color-ink)] focus:outline-none font-mono"
                            />
                          </div>
                        </>
                      )}
                    </div>

                    {/* Row 2: Opacity %, Corner Radius, Glow toggle */}
                    <div className="flex items-center gap-1.5">
                      {/* Opacity */}
                      <div className="flex flex-1 items-center bg-[var(--color-surface-alt)] border border-[var(--color-hairline)] rounded hover:border-[var(--color-ink)] focus-within:border-[#00F2FF] px-2 py-1 transition-colors" title="Layer Opacity">
                        <Eye className="w-3 h-3 text-[var(--color-mid-gray)] mr-1.5 shrink-0" />
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={Math.round((selectedPath.opacity ?? 1) * 100)}
                          onChange={e => onUpdatePath(selectedPath.id, { opacity: (parseFloat(e.target.value) || 0) / 100 })}
                          className="w-full bg-transparent text-xs text-[var(--color-ink)] focus:outline-none font-mono"
                        />
                        <span className="text-[10px] text-[var(--color-mid-gray)] font-mono select-none">%</span>
                      </div>

                      {/* Corner Radius */}
                      <div className="flex flex-1 items-center bg-[var(--color-surface-alt)] border border-[var(--color-hairline)] rounded hover:border-[var(--color-ink)] focus-within:border-[#00F2FF] px-2 py-1 transition-colors" title="Corner Radius">
                        <CornerUpRight className="w-3 h-3 text-[var(--color-mid-gray)] mr-1.5 shrink-0" />
                        <input
                          type="number"
                          min="0"
                          value={selectedPath.cornerRadius || 0}
                          onChange={e => onUpdatePath(selectedPath.id, { cornerRadius: parseFloat(e.target.value) || 0 })}
                          className="w-full bg-transparent text-xs text-[var(--color-ink)] focus:outline-none font-mono"
                        />
                      </div>

                      {/* Glow Button */}
                      <button
                        onClick={() => onUpdatePath(selectedPath.id, { showGlow: !selectedPath.showGlow })}
                        title={selectedPath.showGlow ? "Disable Bloom Glow" : "Enable Bloom Glow"}
                        className={`flex items-center gap-1 px-2 py-1 rounded border text-[11px] font-medium transition-all ${
                          selectedPath.showGlow
                            ? 'bg-[var(--color-ink)] border-[var(--color-ink)] text-[var(--color-canvas)]'
                            : 'bg-[var(--color-surface-alt)] border-[var(--color-hairline)] text-[var(--color-mid-gray)] hover:border-[var(--color-mid-gray)]'
                        }`}
                      >
                        <Sparkle className="w-3 h-3 shrink-0" />
                        <span className="text-[10px]">Glow</span>
                      </button>
                    </div>
                  </div>
                </CollapsibleSection>

                {/* ── Section 2: Merged Stroke + Fill + Endpoints ── */}
                {selectedPath.type !== 'image' && (
                  <CollapsibleSection id="stroke-fill-endpoints" title="Stroke, Fill & Caps">
                    <div className="space-y-2">
                      {/* ── Stroke Row: Color swatch + Hex + Weight + Join ── */}
                      <div className="flex items-center gap-1.5">
                        {/* Stroke Color */}
                        <div className="flex flex-1 items-center bg-[var(--color-surface-alt)] border border-[var(--color-hairline)] rounded hover:border-[var(--color-ink)] focus-within:border-[#00F2FF] px-2 py-1 transition-colors">
                          <input
                            type="color"
                            value={selectedPath.color}
                            onChange={e => onUpdatePath(selectedPath.id, { color: e.target.value, gradientId: '' })}
                            className="w-4 h-4 rounded cursor-pointer border-0 bg-transparent p-0 mr-1.5 shrink-0"
                            title="Stroke Color"
                          />
                          <input
                            type="text"
                            value={selectedPath.color}
                            onChange={e => onUpdatePath(selectedPath.id, { color: e.target.value, gradientId: '' })}
                            className="w-full bg-transparent text-xs text-[var(--color-ink)] focus:outline-none font-mono uppercase"
                          />
                        </div>

                        {/* Stroke Weight */}
                        <div className="flex w-20 items-center bg-[var(--color-surface-alt)] border border-[var(--color-hairline)] rounded hover:border-[var(--color-ink)] focus-within:border-[#00F2FF] px-2 py-1 transition-colors" title="Stroke Weight (px)">
                          <Sliders className="w-3 h-3 text-[var(--color-mid-gray)] mr-1 shrink-0" />
                          <input
                            type="number"
                            min="0.5"
                            step="0.5"
                            value={selectedPath.strokeWidth}
                            onChange={e => onUpdatePath(selectedPath.id, { strokeWidth: Math.max(0.5, parseFloat(e.target.value) || 1) })}
                            className="w-full bg-transparent text-xs text-[var(--color-ink)] focus:outline-none font-mono"
                          />
                        </div>

                        {/* Line Join */}
                        <select
                          value={selectedPath.lineJoin || 'round'}
                          onChange={e => onUpdatePath(selectedPath.id, { lineJoin: e.target.value as 'round' | 'miter' | 'bevel' })}
                          className="w-20 bg-[var(--color-surface-alt)] border border-[var(--color-hairline)] rounded px-1.5 py-1 text-[11px] text-[var(--color-ink)] focus:outline-none cursor-pointer"
                          title="Line Join"
                        >
                          <option value="round">Round</option>
                          <option value="miter">Miter</option>
                          <option value="bevel">Bevel</option>
                        </select>
                      </div>

                      {/* ── Fill Row: Checkbox + Color Swatch + Hex + Fill Opacity ── */}
                      <div className="flex items-center gap-1.5">
                        <label className="flex items-center gap-1.5 cursor-pointer select-none shrink-0" title="Enable Solid Fill">
                          <input
                            type="checkbox"
                            checked={!!selectedPath.fill}
                            onChange={e => onUpdatePath(selectedPath.id, { fill: e.target.checked ? '#ffffff' : undefined })}
                            className="accent-[var(--color-ink)] w-3.5 h-3.5"
                          />
                          <span className="text-[11px] text-[var(--color-mid-gray)] font-medium">Fill</span>
                        </label>

                        {selectedPath.fill ? (
                          <>
                            <div className="flex flex-1 items-center bg-[var(--color-surface-alt)] border border-[var(--color-hairline)] rounded hover:border-[var(--color-ink)] focus-within:border-[#00F2FF] px-2 py-1 transition-colors">
                              <input
                                type="color"
                                value={selectedPath.fill}
                                onChange={e => onUpdatePath(selectedPath.id, { fill: e.target.value })}
                                className="w-4 h-4 rounded cursor-pointer border-0 bg-transparent p-0 mr-1.5 shrink-0"
                              />
                              <input
                                type="text"
                                value={selectedPath.fill}
                                onChange={e => onUpdatePath(selectedPath.id, { fill: e.target.value })}
                                className="w-full bg-transparent text-xs text-[var(--color-ink)] focus:outline-none font-mono uppercase"
                              />
                            </div>
                            <div className="flex w-16 items-center bg-[var(--color-surface-alt)] border border-[var(--color-hairline)] rounded hover:border-[var(--color-ink)] focus-within:border-[#00F2FF] px-2 py-1 transition-colors" title="Fill Opacity">
                              <input
                                type="number"
                                min="0"
                                max="100"
                                value={Math.round((selectedPath.fillOpacity ?? 1) * 100)}
                                onChange={e => onUpdatePath(selectedPath.id, { fillOpacity: (parseFloat(e.target.value) || 0) / 100 })}
                                className="w-full bg-transparent text-xs text-[var(--color-ink)] focus:outline-none font-mono text-right"
                              />
                              <span className="text-[10px] text-[var(--color-mid-gray)] ml-0.5">%</span>
                            </div>
                          </>
                        ) : (
                          <span className="text-[10px] text-[var(--color-mid-gray)] italic">None</span>
                        )}
                      </div>

                      {/* ── Dashes Row: Checkbox + Dash + Gap ── */}
                      <div className="flex items-center gap-1.5 pt-1 border-t border-[var(--color-hairline)]/60">
                        <label className="flex items-center gap-1.5 cursor-pointer select-none shrink-0">
                          <input
                            type="checkbox"
                            checked={selectedPath.dashPreset !== 'solid'}
                            onChange={e => onUpdatePath(selectedPath.id, {
                              dashPreset: e.target.checked ? 'custom' : 'solid',
                              customDashLength: selectedPath.customDashLength || 24,
                              customGapLength: selectedPath.customGapLength || 12
                            })}
                            className="accent-[var(--color-ink)] w-3.5 h-3.5"
                          />
                          <span className="text-[11px] text-[var(--color-mid-gray)] font-medium">Dash</span>
                        </label>

                        {selectedPath.dashPreset !== 'solid' && (
                          <>
                            <div className="flex flex-1 items-center bg-[var(--color-surface-alt)] border border-[var(--color-hairline)] rounded px-2 py-0.5">
                              <span className="text-[10px] text-[var(--color-mid-gray)] mr-1">Dash</span>
                              <input
                                type="number"
                                value={selectedPath.customDashLength || 24}
                                onChange={e => onUpdatePath(selectedPath.id, { customDashLength: parseFloat(e.target.value) || 0, dashPreset: 'custom' })}
                                className="w-full bg-transparent text-xs text-[var(--color-ink)] focus:outline-none font-mono"
                              />
                            </div>
                            <div className="flex flex-1 items-center bg-[var(--color-surface-alt)] border border-[var(--color-hairline)] rounded px-2 py-0.5">
                              <span className="text-[10px] text-[var(--color-mid-gray)] mr-1">Gap</span>
                              <input
                                type="number"
                                value={selectedPath.customGapLength || 12}
                                onChange={e => onUpdatePath(selectedPath.id, { customGapLength: parseFloat(e.target.value) || 0, dashPreset: 'custom' })}
                                className="w-full bg-transparent text-xs text-[var(--color-ink)] focus:outline-none font-mono"
                              />
                            </div>
                          </>
                        )}
                      </div>

                      {/* ── Endpoints & Caps Row: Start Cap + Swap + End Cap ── */}
                      <div className="flex items-center gap-1.5 pt-1 border-t border-[var(--color-hairline)]/60">
                        <select
                          value={selectedPath.startCap || 'none'}
                          onChange={e => onUpdatePath(selectedPath.id, { startCap: e.target.value as CapType })}
                          className="flex-1 bg-[var(--color-surface-alt)] border border-[var(--color-hairline)] rounded px-2 py-1 text-xs text-[var(--color-ink)] focus:outline-none cursor-pointer truncate"
                          title="Start Endpoint"
                        >
                          {CAP_PRESETS.map(cap => (
                            <option key={`start-${cap.id}`} value={cap.id}>
                              Start: {cap.name}
                            </option>
                          ))}
                        </select>

                        <button
                          onClick={() => onUpdatePath(selectedPath.id, {
                            startCap: selectedPath.endCap || 'none',
                            endCap: selectedPath.startCap || 'none'
                          })}
                          className="p-1.5 text-[var(--color-mid-gray)] hover:text-[var(--color-ink)] bg-[var(--color-surface-alt)] hover:bg-[var(--color-hairline)] rounded border border-[var(--color-hairline)] transition-colors shrink-0"
                          title="Swap Start ↔ End Caps"
                        >
                          <ArrowLeftRight className="w-3.5 h-3.5" />
                        </button>

                        <select
                          value={selectedPath.endCap || 'none'}
                          onChange={e => onUpdatePath(selectedPath.id, { endCap: e.target.value as CapType })}
                          className="flex-1 bg-[var(--color-surface-alt)] border border-[var(--color-hairline)] rounded px-2 py-1 text-xs text-[var(--color-ink)] focus:outline-none cursor-pointer truncate"
                          title="End Endpoint"
                        >
                          {CAP_PRESETS.map(cap => (
                            <option key={`end-${cap.id}`} value={cap.id}>
                              End: {cap.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </CollapsibleSection>
                )}

                {/* ── Section 3: Merged Flow & Motion Animation ── */}
                <CollapsibleSection id="animation" title="Flow & Motion" defaultExpanded={false}>
                  <div className="space-y-2">
                    {/* Flow Velocity Row */}
                    <div className="flex items-center gap-1.5">
                      <label className="flex items-center gap-1.5 cursor-pointer select-none shrink-0" title="Enable Continuous Flow">
                        <input
                          type="checkbox"
                          checked={selectedPath.flowSpeed > 0}
                          onChange={e => onUpdatePath(selectedPath.id, { flowSpeed: e.target.checked ? 1.5 : 0 })}
                          className="accent-[var(--color-ink)] w-3.5 h-3.5"
                        />
                        <span className="text-[11px] text-[var(--color-mid-gray)] font-medium">Flow</span>
                      </label>

                      {selectedPath.flowSpeed > 0 && (
                        <>
                          <div className="flex flex-1 items-center bg-[var(--color-surface-alt)] border border-[var(--color-hairline)] rounded px-2 py-0.5" title="Flow Speed">
                            <span className="text-[10px] text-[var(--color-mid-gray)] mr-1 font-mono">Speed</span>
                            <input
                              type="number"
                              step="0.1"
                              value={selectedPath.flowSpeed}
                              onChange={e => onUpdatePath(selectedPath.id, { flowSpeed: parseFloat(e.target.value) || 0 })}
                              className="w-full bg-transparent text-xs text-[var(--color-ink)] focus:outline-none font-mono"
                            />
                          </div>
                          <div className="flex rounded border border-[var(--color-hairline)] overflow-hidden shrink-0" title="Flow Direction">
                            {([ 
                              { value: 'forward',       label: '→' },
                              { value: 'reverse',       label: '←' },
                              { value: 'bidirectional', label: '↔' },
                            ] as const).map(({ value, label }) => (
                              <button
                                key={value}
                                onClick={() => onUpdatePath(selectedPath.id, { flowDirection: value })}
                                title={value === 'forward' ? 'Forward' : value === 'reverse' ? 'Reverse' : 'Bidirectional (center → both ends)'}
                                className={`text-[11px] font-bold px-2 py-1 transition-colors ${
                                  selectedPath.flowDirection === value
                                    ? 'bg-[var(--color-ink)] text-[var(--color-canvas)]'
                                    : 'bg-[var(--color-surface-alt)] text-[var(--color-mid-gray)] hover:text-[var(--color-ink)]'
                                }`}
                              >
                                {label}
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                    </div>

                    {/* Arrow Flow / Chevrons Row */}
                    <div className="flex items-center gap-1.5">
                      <label className="flex items-center gap-1.5 cursor-pointer select-none shrink-0" title="Animated Chevrons">
                        <input
                          type="checkbox"
                          checked={selectedPath.arrowFlow || false}
                          onChange={e => onUpdatePath(selectedPath.id, { arrowFlow: e.target.checked })}
                          className="accent-[var(--color-ink)] w-3.5 h-3.5"
                        />
                        <span className="text-[11px] text-[var(--color-mid-gray)] font-medium">Chevrons</span>
                      </label>

                      {selectedPath.arrowFlow && (
                        <>
                          <div className="flex flex-1 items-center bg-[var(--color-surface-alt)] border border-[var(--color-hairline)] rounded px-2 py-0.5" title="Chevron Size">
                            <span className="text-[10px] text-[var(--color-mid-gray)] mr-1 font-mono">Size</span>
                            <input
                              type="number"
                              value={selectedPath.arrowFlowSize || 14}
                              onChange={e => onUpdatePath(selectedPath.id, { arrowFlowSize: parseFloat(e.target.value) || 14 })}
                              className="w-full bg-transparent text-xs text-[var(--color-ink)] focus:outline-none font-mono"
                            />
                          </div>
                          <div className="flex flex-1 items-center bg-[var(--color-surface-alt)] border border-[var(--color-hairline)] rounded px-2 py-0.5" title="Chevron Spacing">
                            <span className="text-[10px] text-[var(--color-mid-gray)] mr-1 font-mono">Gap</span>
                            <input
                              type="number"
                              value={selectedPath.arrowFlowSpacing || 70}
                              onChange={e => onUpdatePath(selectedPath.id, { arrowFlowSpacing: parseFloat(e.target.value) || 70 })}
                              className="w-full bg-transparent text-xs text-[var(--color-ink)] focus:outline-none font-mono"
                            />
                          </div>
                        </>
                      )}
                    </div>

                    {/* Object Along Path Row */}
                    <div className="flex items-center gap-1.5 pt-1 border-t border-[var(--color-hairline)]/60">
                      <span className="text-[11px] text-[var(--color-mid-gray)] font-medium shrink-0">Object:</span>
                      <select
                        value={selectedPath.motionObjectId || ''}
                        onChange={e => onUpdatePath(selectedPath.id, { motionObjectId: e.target.value || undefined })}
                        className="flex-1 bg-[var(--color-surface-alt)] border border-[var(--color-hairline)] rounded px-2 py-1 text-xs text-[var(--color-ink)] focus:outline-none cursor-pointer truncate"
                      >
                        <option value="">— None —</option>
                        {paths.filter(p => p.id !== selectedPath.id).map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                      {selectedPath.motionObjectId && (
                        <div className="flex w-16 items-center bg-[var(--color-surface-alt)] border border-[var(--color-hairline)] rounded px-1.5 py-0.5" title="Object Motion Speed">
                          <input
                            type="number"
                            step="0.1"
                            value={selectedPath.motionSpeed || 1}
                            onChange={e => onUpdatePath(selectedPath.id, { motionSpeed: parseFloat(e.target.value) || 1 })}
                            className="w-full bg-transparent text-xs text-[var(--color-ink)] focus:outline-none font-mono text-right"
                          />
                          <span className="text-[10px] text-[var(--color-mid-gray)] ml-0.5 font-mono">x</span>
                        </div>
                      )}
                    </div>
                  </div>
                </CollapsibleSection>
              </div>
            )}
          </>
        )}

        {activeTab === 'settings' && (
          <div>
            {/* Canvas Smoothing */}
            <CollapsibleSection id="settings-pencil" title="Pencil Smoothing (N)">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[var(--color-mid-gray)] font-medium">Smoothing</span>
                  <span className="text-[var(--color-ink)] font-mono">{settings.pencilSmoothness || 6}px</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="20"
                  step="1"
                  value={settings.pencilSmoothness || 6}
                  onChange={(e) => onUpdateSettings({ pencilSmoothness: parseFloat(e.target.value) })}
                  className="w-full accent-[var(--color-ink)] bg-[var(--color-surface-alt)] h-1.5 rounded-full cursor-pointer"
                />
              </div>
            </CollapsibleSection>

            {/* Canvas Global Speed */}
            <CollapsibleSection id="settings-speed" title="Global Speed">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
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
                  className="w-full accent-[var(--color-ink)] bg-[var(--color-surface-alt)] h-1.5 rounded-full cursor-pointer"
                />
              </div>
            </CollapsibleSection>

            {/* Canvas Appearance */}
            <CollapsibleSection id="settings-canvas" title="Canvas Appearance">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[var(--color-mid-gray)] font-medium">Background Color</span>
                  <input
                    type="color"
                    value={settings.backgroundColor || '#09090b'}
                    onChange={(e) => onUpdateSettings({ backgroundColor: e.target.value })}
                    className="w-5 h-5 rounded cursor-pointer border-0 bg-transparent"
                  />
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-[var(--color-hairline)]/60">
                  <span className="text-xs text-[var(--color-mid-gray)] font-medium">Show Canvas Grid</span>
                  <input
                    type="checkbox"
                    checked={settings.showGrid}
                    onChange={(e) => onUpdateSettings({ showGrid: e.target.checked })}
                    className="accent-[var(--color-ink)] w-3.5 h-3.5 cursor-pointer"
                  />
                </div>
              </div>
            </CollapsibleSection>
          </div>
        )}
      </div>
    </aside>
  );
};
