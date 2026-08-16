import React, { useState } from 'react';
import { 
  X, 
  Download, 
  Video, 
  Image as ImageIcon, 
  FileCode, 
  FileJson, 
  Loader2,
  Film,
  Layers,
  Sparkles,
  Check
} from 'lucide-react';
import { DrawingPath } from '../types';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  paths: DrawingPath[];
  selectedPathIds: string[];
  onExportPNG: (transparent: boolean, scale: number) => void;
  onExportSVG: (scale: number) => void;
  onExportJSON: () => void;
  onExportGIF: (options: { transparent: boolean; exportSeparateLayers: boolean; singleLayerId?: string; scale: number; fps: number; duration: number; colorPalette: 'adaptive' | 'web-safe' | 'grayscale'; dithering: boolean }) => void;
  onStartRecordingVideo: (transparent: boolean, scale: number) => void;
  isRecording: boolean;
  recordingTime: number;
  isExportingGIF: boolean;
  gifProgressText?: string;
  onCancelExportGIF?: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  paths,
  selectedPathIds,
  onExportPNG,
  onExportSVG,
  onExportJSON,
  onExportGIF,
  onStartRecordingVideo,
  isRecording,
  recordingTime,
  isExportingGIF,
  gifProgressText,
  onCancelExportGIF
}) => {
  const [transparentBg, setTransparentBg] = useState<boolean>(true);
  const [exportMode, setExportMode] = useState<'all-in-one' | 'separate-layers' | 'selected-layer'>('all-in-one');
  const [exportScale, setExportScale] = useState<number>(1);
  const [gifFps, setGifFps] = useState<number>(15);
  const [gifDuration, setGifDuration] = useState<number>(2);
  const [colorPalette, setColorPalette] = useState<'adaptive' | 'web-safe' | 'grayscale'>('adaptive');
  const [dithering, setDithering] = useState<boolean>(true);

  if (!isOpen) return null;

  const enabledPaths = paths.filter(p => p.enabled);
  const selectedPathId = selectedPathIds.length === 1 ? selectedPathIds[0] : null;
  const selectedPath = paths.find(p => p.id === selectedPathId);

  return (
    <div className="fixed inset-0 z-50 bg-[var(--color-surface-alt)]/80 backdrop-blur-md flex items-center justify-center p-4 select-none">
      <div className="bg-[var(--color-paper)] border border-[var(--color-hairline)] rounded-[24px] w-full max-w-xl overflow-hidden shadow-[var(--shadow-medium)]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[var(--color-hairline)] flex items-center justify-between bg-[var(--color-paper)]">
          <div className="flex items-center gap-2.5">
            <Download className="w-5 h-5 text-[var(--color-ink)]" />
            <h2 className="text-sm font-bold text-[var(--color-ink)] uppercase tracking-wider">Export & Render Studio</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-[18px] text-[var(--color-mid-gray)] hover:text-[var(--color-ink)] hover:bg-[var(--color-surface-alt)] transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto custom-scrollbar">
          
          {/* Export Size Multiplier */}
          <div className="bg-[var(--color-paper)] border border-[var(--color-hairline)] rounded-[24px] p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-ink)]">
                Resolution Multiplier
              </span>
              <span className="text-[10px] text-[var(--color-mid-gray)] font-mono">{exportScale}x Scale</span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {[1, 2, 3, 4].map(scale => (
                <button
                  key={scale}
                  onClick={() => setExportScale(scale)}
                  className={`py-2 rounded-[24px] border text-xs font-bold transition-all ${
                    exportScale === scale
                      ? 'bg-[var(--color-ink)] border-[var(--color-ink)] text-[var(--color-paper)]'
                      : 'bg-[var(--color-surface-alt)] border-[var(--color-hairline)] text-[var(--color-mid-gray)] hover:text-[var(--color-ink)] hover:bg-[var(--color-canvas)]'
                  }`}
                >
                  {scale}x
                </button>
              ))}
            </div>
          </div>

          {/* Transparency & Canvas Background Selector */}
          <div className="bg-[var(--color-paper)] border border-[var(--color-hairline)] rounded-[24px] p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-ink)]">
                Background & Canvas Transparency
              </span>
              <span className="text-[10px] text-[var(--color-mid-gray)] font-mono">Export Setting</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setTransparentBg(true)}
                className={`py-2.5 px-3 rounded-[24px] border flex items-center justify-center gap-2 transition-all ${
                  transparentBg
                    ? 'bg-[var(--color-ink)]/15 border-[var(--color-ink)] text-[var(--color-ink)] '
                    : 'bg-[var(--color-surface-alt)] border-[var(--color-hairline)] text-[var(--color-mid-gray)] hover:text-[var(--color-ink)]'
                }`}
              >
                <div className="w-4 h-4 rounded border border-dashed border-[var(--color-ink)] bg-transparent flex items-center justify-center">
                  {transparentBg && <Check className="w-3 h-3 text-[var(--color-ink)]" />}
                </div>
                <div className="text-left">
                  <div className="text-xs font-semibold">Transparent Background</div>
                  <div className="text-[10px] opacity-75">Alpha channel PNG / GIF</div>
                </div>
              </button>

              <button
                onClick={() => setTransparentBg(false)}
                className={`py-2.5 px-3 rounded-[24px] border flex items-center justify-center gap-2 transition-all ${
                  !transparentBg
                    ? 'bg-[var(--color-ink)]/15 border-[var(--color-ink)] text-[var(--color-ink)] '
                    : 'bg-[var(--color-surface-alt)] border-[var(--color-hairline)] text-[var(--color-mid-gray)] hover:text-[var(--color-ink)]'
                }`}
              >
                <div className="w-4 h-4 rounded bg-[#050505] border border-white/20 flex items-center justify-center">
                  {!transparentBg && <Check className="w-3 h-3 text-[var(--color-ink)]" />}
                </div>
                <div className="text-left">
                  <div className="text-xs font-semibold">Dark Studio Canvas</div>
                  <div className="text-[10px] opacity-75">Artboard Background + Grid</div>
                </div>
              </button>
            </div>
          </div>

          {/* Color Palette & Dithering */}
          <div className="bg-[var(--color-paper)] border border-[var(--color-hairline)] rounded-[24px] p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-ink)] flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5" />
                Color & Dithering Engine
              </span>
              <span className="text-[10px] text-[var(--color-mid-gray)] font-mono">Quantization</span>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-wider text-[var(--color-mid-gray)] font-semibold block">Color Palette</label>
                <select
                  value={colorPalette}
                  onChange={(e) => setColorPalette(e.target.value as any)}
                  className="w-full bg-[var(--color-surface-alt)] border border-[var(--color-hairline)] text-[var(--color-ink)] text-xs rounded-lg p-2 outline-none focus:border-[var(--color-ink)] transition-colors"
                >
                  <option value="adaptive">Adaptive (Best)</option>
                  <option value="web-safe">Web-Safe (216 colors)</option>
                  <option value="grayscale">Grayscale</option>
                </select>
              </div>
              
              <div className="space-y-1 flex flex-col justify-end">
                <button
                  onClick={() => setDithering(!dithering)}
                  className={`w-full py-2 px-3 rounded-lg border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                    dithering
                      ? 'bg-[var(--color-ink)]/15 border-[var(--color-ink)] text-[var(--color-ink)]'
                      : 'bg-[var(--color-surface-alt)] border-[var(--color-hairline)] text-[var(--color-mid-gray)] hover:text-[var(--color-ink)]'
                  }`}
                >
                  <div className={`w-3 h-3 rounded flex items-center justify-center ${dithering ? 'bg-[var(--color-ink)]' : 'border border-[var(--color-mid-gray)]'}`}>
                    {dithering && <Check className="w-2.5 h-2.5 text-[var(--color-paper)]" />}
                  </div>
                  Floyd-Steinberg Dither
                </button>
              </div>
            </div>
          </div>

          {/* Animated GIF & Multi-Layer Export Studio */}
          <div className="bg-[var(--color-paper)] border border-[var(--color-hairline)] rounded-[24px] p-4 space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--color-hairline)] pb-2">
              <div className="flex items-center gap-2">
                <Film className="w-4 h-4 text-[var(--color-ink)]" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-ink)]">Animated GIF Engine</h3>
              </div>
              <span className="text-[10px] text-[var(--color-ink)] font-mono">Looping Vector Flow</span>
            </div>

            {/* Layer Target Selector */}
            <div className="space-y-2">
              <span className="text-[10px] uppercase tracking-wider text-[var(--color-mid-gray)] font-semibold block">Export Mode</span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  onClick={() => setExportMode('all-in-one')}
                  className={`p-2.5 rounded-[24px] border text-left transition-all ${
                    exportMode === 'all-in-one'
                      ? 'bg-[var(--color-canvas)] border-[var(--color-ink)] text-[var(--color-ink)]'
                      : 'bg-[var(--color-surface-alt)] border-[var(--color-hairline)] text-[var(--color-mid-gray)] hover:text-[var(--color-ink)]'
                  }`}
                >
                  <div className="text-xs font-semibold">Full Composite</div>
                  <div className="text-[10px] text-[var(--color-mid-gray)] mt-0.5">All {enabledPaths.length} layers in 1 GIF</div>
                </button>

                <button
                  onClick={() => setExportMode('separate-layers')}
                  className={`p-2.5 rounded-[24px] border text-left transition-all ${
                    exportMode === 'separate-layers'
                      ? 'bg-[var(--color-canvas)] border-[var(--color-ink)] text-[var(--color-ink)]'
                      : 'bg-[var(--color-surface-alt)] border-[var(--color-hairline)] text-[var(--color-mid-gray)] hover:text-[var(--color-ink)]'
                  }`}
                >
                  <div className="text-xs font-semibold flex items-center gap-1">
                    <Layers className="w-3 h-3 text-[var(--color-ink)]" />
                    Separate Files
                  </div>
                  <div className="text-[10px] text-[var(--color-mid-gray)] mt-0.5">{enabledPaths.length} distinct GIF files</div>
                </button>

                <button
                  onClick={() => setExportMode('selected-layer')}
                  className={`p-2.5 rounded-[24px] border text-left transition-all ${
                    exportMode === 'selected-layer'
                      ? 'bg-[var(--color-canvas)] border-[var(--color-ink)] text-[var(--color-ink)]'
                      : 'bg-[var(--color-surface-alt)] border-[var(--color-hairline)] text-[var(--color-mid-gray)] hover:text-[var(--color-ink)]'
                  }`}
                >
                  <div className="text-xs font-semibold">Selected Layer</div>
                  <div className="text-[10px] text-[var(--color-mid-gray)] mt-0.5 truncate">{selectedPath ? selectedPath.name : 'None'}</div>
                </button>
              </div>
            </div>

            {/* Quality/Timing Settings */}
            <div className="space-y-3">
              <span className="text-[10px] uppercase tracking-wider text-[var(--color-mid-gray)] font-semibold block">Performance Settings</span>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="flex justify-between mb-1">
                    <label className="text-xs font-semibold text-[var(--color-ink)]">Framerate</label>
                    <span className="text-xs text-[var(--color-mid-gray)]">{gifFps} FPS</span>
                  </div>
                  <input 
                    type="range" 
                    min="10" 
                    max="60" 
                    step="5"
                    value={gifFps} 
                    onChange={e => setGifFps(parseInt(e.target.value))}
                    className="w-full accent-[var(--color-ink)] h-1 bg-[var(--color-hairline)] rounded-full appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between mt-1 text-[9px] text-[var(--color-mid-gray)]">
                    <span>10 (Smaller)</span>
                    <span>60 (Smoother)</span>
                  </div>
                </div>
                
                <div>
                  <div className="flex justify-between mb-1">
                    <label className="text-xs font-semibold text-[var(--color-ink)]">Duration</label>
                    <span className="text-xs text-[var(--color-mid-gray)]">{gifDuration}s</span>
                  </div>
                  <input 
                    type="range" 
                    min="1" 
                    max="10" 
                    step="0.5"
                    value={gifDuration} 
                    onChange={e => setGifDuration(parseFloat(e.target.value))}
                    className="w-full accent-[var(--color-ink)] h-1 bg-[var(--color-hairline)] rounded-full appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between mt-1 text-[9px] text-[var(--color-mid-gray)]">
                    <span>1s (Fast)</span>
                    <span>10s (Long)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Button for GIF Export */}
            <div className="space-y-2">
              <button
                onClick={() => {
                  onExportGIF({
                    transparent: transparentBg,
                    exportSeparateLayers: exportMode === 'separate-layers',
                    singleLayerId: exportMode === 'selected-layer' && selectedPath ? selectedPath.id : undefined,
                    scale: exportScale,
                    fps: gifFps,
                    duration: gifDuration,
                    colorPalette,
                    dithering
                  });
                }}
                disabled={isExportingGIF || enabledPaths.length === 0}
                className={`w-full py-3 rounded-[24px] font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
                  isExportingGIF 
                    ? 'bg-[var(--color-canvas)] text-[var(--color-ink)] border border-[var(--color-ink)] cursor-not-allowed'
                    : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-[var(--color-ink)] [box-shadow:var(--shadow-subtle)] shadow-emerald-500/20'
                }`}
              >
                {isExportingGIF ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{gifProgressText || 'Rendering Transparent GIF...'}</span>
                  </>
                ) : (
                  <>
                    <Film className="w-4 h-4" />
                    <span>
                      {exportMode === 'separate-layers' 
                        ? `Export ${enabledPaths.length} Separate Layer GIFs (${transparentBg ? 'Transparent' : 'Dark Canvas'})` 
                        : exportMode === 'selected-layer' 
                        ? `Export "${selectedPath?.name || 'Selected'}" GIF` 
                        : `Export Animated Composition GIF (${transparentBg ? 'Transparent' : 'Solid'})`}
                    </span>
                  </>
                )}
              </button>
              {isExportingGIF && onCancelExportGIF && (
                <button
                  onClick={onCancelExportGIF}
                  className="w-full py-2 rounded-[24px] font-bold text-xs uppercase tracking-wider text-red-500 border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 transition-all"
                >
                  Cancel Export
                </button>
              )}
            </div>
          </div>

          {/* WebM Real-Time Video Recording Section */}
          <div className="bg-[var(--color-paper)] border border-[var(--color-hairline)] rounded-[24px] p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Video className="w-4 h-4 text-red-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-ink)]">Continuous Flow Video (WebM)</h3>
              </div>
              {isRecording && <span className="text-[10px] text-red-400 animate-pulse font-mono font-bold">REC ● {recordingTime}s</span>}
            </div>

            <button
              onClick={() => onStartRecordingVideo(transparentBg, exportScale)}
              disabled={isRecording}
              className={`w-full py-2.5 rounded-[24px] font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
                isRecording 
                  ? 'bg-red-500/20 text-red-400 border border-red-500/30 cursor-not-allowed'
                  : 'bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-500 hover:to-pink-500 text-[var(--color-ink)] shadow-md shadow-red-500/20'
              }`}
            >
              {isRecording ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Capturing Flow Video ({recordingTime}s remaining)</span>
                </>
              ) : (
                <>
                  <Video className="w-4 h-4" />
                  <span>Record 4-Second Flow Video (WebM)</span>
                </>
              )}
            </button>
          </div>

          {/* Static High-Res & Vector Formats */}
          <div className="space-y-3">
            <label className="text-[10px] uppercase tracking-[0.2em] text-[var(--color-mid-gray)] block font-bold">
              Static Snapshots & Vector Assets
            </label>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                onClick={() => onExportPNG(transparentBg, exportScale)}
                className="p-3.5 rounded-[24px] bg-[var(--color-paper)] border border-[var(--color-hairline)] hover:border-[var(--color-ink)] hover:bg-[var(--color-surface-alt)] flex flex-col items-center text-center gap-2 group transition-all"
              >
                <div className="p-2.5 rounded-[24px] bg-[var(--color-canvas)] text-[var(--color-ink)] group-hover:scale-110 transition-transform">
                  <ImageIcon className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-[var(--color-ink)]">PNG Image</div>
                  <div className="text-[10px] text-[var(--color-mid-gray)] mt-0.5">{transparentBg ? 'Transparent' : 'Solid Canvas'}</div>
                </div>
              </button>

              <button
                onClick={() => onExportSVG(exportScale)}
                className="p-3.5 rounded-[24px] bg-[var(--color-paper)] border border-[var(--color-hairline)] hover:border-indigo-500/40 hover:bg-[var(--color-surface-alt)] flex flex-col items-center text-center gap-2 group transition-all"
              >
                <div className="p-2.5 rounded-[24px] bg-indigo-500/10 text-indigo-400 group-hover:scale-110 transition-transform">
                  <FileCode className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-[var(--color-ink)]">SVG Vector</div>
                  <div className="text-[10px] text-[var(--color-mid-gray)] mt-0.5">Scalable Path Markup</div>
                </div>
              </button>

              <button
                onClick={onExportJSON}
                className="p-3.5 rounded-[24px] bg-[var(--color-paper)] border border-[var(--color-hairline)] hover:border-[var(--color-ink)] hover:bg-[var(--color-surface-alt)] flex flex-col items-center text-center gap-2 group transition-all"
              >
                <div className="p-2.5 rounded-[24px] bg-[var(--color-canvas)] text-[var(--color-ink)] group-hover:scale-110 transition-transform">
                  <FileJson className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-[var(--color-ink)]">JSON Data</div>
                  <div className="text-[10px] text-[var(--color-mid-gray)] mt-0.5">Artboard & Anchors</div>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[var(--color-hairline)] bg-[var(--color-paper)] flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-[24px] bg-[var(--color-surface-alt)] text-[var(--color-mid-gray)] hover:text-[var(--color-ink)] text-xs font-medium transition-all border border-[var(--color-hairline)]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
