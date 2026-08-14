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
  selectedPathId: string | null;
  onExportPNG: (transparent?: boolean) => void;
  onExportSVG: () => void;
  onExportJSON: () => void;
  onExportGIF: (options: { transparent: boolean; exportSeparateLayers: boolean; singleLayerId?: string }) => void;
  onStartRecordingVideo: (transparent?: boolean) => void;
  isRecording: boolean;
  recordingTime: number;
  isExportingGIF: boolean;
  gifProgressText?: string;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  paths,
  selectedPathId,
  onExportPNG,
  onExportSVG,
  onExportJSON,
  onExportGIF,
  onStartRecordingVideo,
  isRecording,
  recordingTime,
  isExportingGIF,
  gifProgressText
}) => {
  const [transparentBg, setTransparentBg] = useState<boolean>(true);
  const [exportMode, setExportMode] = useState<'all-in-one' | 'separate-layers' | 'selected-layer'>('all-in-one');

  if (!isOpen) return null;

  const enabledPaths = paths.filter(p => p.enabled);
  const selectedPath = paths.find(p => p.id === selectedPathId);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 select-none">
      <div className="bg-[#0e0e11] border border-white/10 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-[#09090b]">
          <div className="flex items-center gap-2.5">
            <Download className="w-5 h-5 text-[#00F2FF]" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">Export & Render Studio</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto custom-scrollbar">
          {/* Transparency & Canvas Background Selector */}
          <div className="bg-[#141417] border border-white/10 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-200">
                Background & Canvas Transparency
              </span>
              <span className="text-[10px] text-zinc-500 font-mono">Export Setting</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setTransparentBg(true)}
                className={`py-2.5 px-3 rounded-xl border flex items-center justify-center gap-2 transition-all ${
                  transparentBg
                    ? 'bg-[#00F2FF]/15 border-[#00F2FF]/50 text-[#00F2FF] shadow-sm'
                    : 'bg-[#1c1c21] border-white/5 text-zinc-400 hover:text-white'
                }`}
              >
                <div className="w-4 h-4 rounded border border-dashed border-[#00F2FF]/60 bg-transparent flex items-center justify-center">
                  {transparentBg && <Check className="w-3 h-3 text-[#00F2FF]" />}
                </div>
                <div className="text-left">
                  <div className="text-xs font-semibold">Transparent Background</div>
                  <div className="text-[10px] opacity-75">Alpha channel PNG / GIF</div>
                </div>
              </button>

              <button
                onClick={() => setTransparentBg(false)}
                className={`py-2.5 px-3 rounded-xl border flex items-center justify-center gap-2 transition-all ${
                  !transparentBg
                    ? 'bg-[#00F2FF]/15 border-[#00F2FF]/50 text-[#00F2FF] shadow-sm'
                    : 'bg-[#1c1c21] border-white/5 text-zinc-400 hover:text-white'
                }`}
              >
                <div className="w-4 h-4 rounded bg-[#050505] border border-white/20 flex items-center justify-center">
                  {!transparentBg && <Check className="w-3 h-3 text-[#00F2FF]" />}
                </div>
                <div className="text-left">
                  <div className="text-xs font-semibold">Dark Studio Canvas</div>
                  <div className="text-[10px] opacity-75">Artboard Background + Grid</div>
                </div>
              </button>
            </div>
          </div>

          {/* Animated GIF & Multi-Layer Export Studio */}
          <div className="bg-[#141417] border border-white/10 rounded-xl p-4 space-y-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-2">
              <div className="flex items-center gap-2">
                <Film className="w-4 h-4 text-emerald-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-white">Animated GIF Engine</h3>
              </div>
              <span className="text-[10px] text-emerald-400 font-mono">Looping Vector Flow</span>
            </div>

            {/* Layer Target Selector */}
            <div className="space-y-2">
              <span className="text-[10px] uppercase tracking-wider text-zinc-400 font-semibold block">Export Mode</span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  onClick={() => setExportMode('all-in-one')}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    exportMode === 'all-in-one'
                      ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-300'
                      : 'bg-[#1c1c21] border-white/5 text-zinc-400 hover:text-white'
                  }`}
                >
                  <div className="text-xs font-semibold">Full Composite</div>
                  <div className="text-[10px] text-zinc-500 mt-0.5">All {enabledPaths.length} layers in 1 GIF</div>
                </button>

                <button
                  onClick={() => setExportMode('separate-layers')}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    exportMode === 'separate-layers'
                      ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-300'
                      : 'bg-[#1c1c21] border-white/5 text-zinc-400 hover:text-white'
                  }`}
                >
                  <div className="text-xs font-semibold flex items-center gap-1">
                    <Layers className="w-3 h-3 text-emerald-400" />
                    Separate Files
                  </div>
                  <div className="text-[10px] text-zinc-500 mt-0.5">{enabledPaths.length} distinct GIF files</div>
                </button>

                <button
                  onClick={() => setExportMode('selected-layer')}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    exportMode === 'selected-layer'
                      ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-300'
                      : 'bg-[#1c1c21] border-white/5 text-zinc-400 hover:text-white'
                  }`}
                >
                  <div className="text-xs font-semibold">Selected Layer</div>
                  <div className="text-[10px] text-zinc-500 mt-0.5 truncate">{selectedPath ? selectedPath.name : 'None'}</div>
                </button>
              </div>
            </div>

            {/* Action Button for GIF Export */}
            <button
              onClick={() => {
                onExportGIF({
                  transparent: transparentBg,
                  exportSeparateLayers: exportMode === 'separate-layers',
                  singleLayerId: exportMode === 'selected-layer' && selectedPath ? selectedPath.id : undefined
                });
              }}
              disabled={isExportingGIF || enabledPaths.length === 0}
              className={`w-full py-3 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
                isExportingGIF 
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 cursor-not-allowed'
                  : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-500/20'
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
          </div>

          {/* WebM Real-Time Video Recording Section */}
          <div className="bg-[#141417] border border-white/10 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Video className="w-4 h-4 text-red-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-white">Continuous Flow Video (WebM)</h3>
              </div>
              {isRecording && <span className="text-[10px] text-red-400 animate-pulse font-mono font-bold">REC ● {recordingTime}s</span>}
            </div>

            <button
              onClick={() => onStartRecordingVideo(transparentBg)}
              disabled={isRecording}
              className={`w-full py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
                isRecording 
                  ? 'bg-red-500/20 text-red-400 border border-red-500/30 cursor-not-allowed'
                  : 'bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-500 hover:to-pink-500 text-white shadow-md shadow-red-500/20'
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
            <label className="text-[10px] uppercase tracking-[0.2em] text-zinc-400 block font-bold">
              Static Snapshots & Vector Assets
            </label>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                onClick={() => onExportPNG(transparentBg)}
                className="p-3.5 rounded-xl bg-[#141417] border border-white/5 hover:border-[#00F2FF]/40 hover:bg-zinc-900 flex flex-col items-center text-center gap-2 group transition-all"
              >
                <div className="p-2.5 rounded-xl bg-[#00F2FF]/10 text-[#00F2FF] group-hover:scale-110 transition-transform">
                  <ImageIcon className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-white">PNG Image</div>
                  <div className="text-[10px] text-zinc-500 mt-0.5">{transparentBg ? 'Transparent' : 'Solid Canvas'}</div>
                </div>
              </button>

              <button
                onClick={onExportSVG}
                className="p-3.5 rounded-xl bg-[#141417] border border-white/5 hover:border-indigo-500/40 hover:bg-zinc-900 flex flex-col items-center text-center gap-2 group transition-all"
              >
                <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 group-hover:scale-110 transition-transform">
                  <FileCode className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-white">SVG Vector</div>
                  <div className="text-[10px] text-zinc-500 mt-0.5">Scalable Path Markup</div>
                </div>
              </button>

              <button
                onClick={onExportJSON}
                className="p-3.5 rounded-xl bg-[#141417] border border-white/5 hover:border-emerald-500/40 hover:bg-zinc-900 flex flex-col items-center text-center gap-2 group transition-all"
              >
                <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 group-hover:scale-110 transition-transform">
                  <FileJson className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-white">JSON Data</div>
                  <div className="text-[10px] text-zinc-500 mt-0.5">Artboard & Anchors</div>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/10 bg-[#09090b] flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-zinc-900 text-zinc-300 hover:text-white text-xs font-medium transition-all border border-white/10"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
