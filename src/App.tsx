/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { encode } from 'modern-gif';
import { buildPalette, applyPalette, utils } from 'image-q';
import { 
  DrawingPath, 
  DrawTool, 
  ArtboardSettings, 
  AnchorPoint 
} from './types';
import { Header } from './components/Header';
import { SidebarControls } from './components/SidebarControls';
import { ArtboardCanvas } from './components/ArtboardCanvas';
import { MetricsBar } from './components/MetricsBar';
import { ExportModal } from './components/ExportModal';
import { ImportSvgModal } from './components/ImportSvgModal';
import {
  renderArtboardToCanvas,
  anchorsToPathString,
  calculateBoundingBox,
  preloadPathImages,
  parseHexLuminance
} from './utils/bezier';
import { extractPathsFromSvgString, parseSVGPathToAnchors } from './utils/svgImport';

const INITIAL_SETTINGS: ArtboardSettings = {
  backgroundColor: '#ffffff',
  showGrid: true,
  gridSize: 40,
  snapToGrid: false,
  snapToAnchor: true,
  globalSpeed: 1.0,
  pencilSmoothness: 6
};

const getInitialPaths = (): DrawingPath[] => {
  return [];
};

interface AppState {
  paths: DrawingPath[];
  history: DrawingPath[][];
  historyIndex: number;
}

export default function App() {
  const [appState, setAppState] = useState<AppState>(() => {
    const initial = getInitialPaths();
    return {
      paths: initial,
      history: [initial],
      historyIndex: 0
    };
  });
  
  const { paths, history, historyIndex } = appState;

  const [selectedPathIds, setSelectedPathIds] = useState<string[]>(['path-wave']);
  // Backward-compat helpers
  const selectedPathId = selectedPathIds.length === 1 ? selectedPathIds[0] : null;
  const [activeTool, setActiveTool] = useState<DrawTool>('direct-select');
  const [settings, setSettings] = useState<ArtboardSettings>(INITIAL_SETTINGS);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);
  const [exportModalOpen, setExportModalOpen] = useState<boolean>(false);
  const [importModalOpen, setImportModalOpen] = useState<boolean>(false);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingTime, setRecordingTime] = useState<number>(4);
  const [isExportingGIF, setIsExportingGIF] = useState<boolean>(false);
  const [gifProgressText, setGifProgressText] = useState<string>('');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [fps, setFps] = useState<number>(60);

  // FPS calculation
  const frameCountRef = useRef(0);
  const lastTimeRef = useRef(performance.now());

  useEffect(() => {
    let animId: number;
    const checkFps = (time: number) => {
      frameCountRef.current++;
      if (time - lastTimeRef.current >= 1000) {
        setFps(Math.round((frameCountRef.current * 1000) / (time - lastTimeRef.current)));
        frameCountRef.current = 0;
        lastTimeRef.current = time;
      }
      animId = requestAnimationFrame(checkFps);
    };
    animId = requestAnimationFrame(checkFps);
    return () => cancelAnimationFrame(animId);
  }, []);

  const updatePathsAndCommit = (updater: (prev: DrawingPath[]) => DrawingPath[]) => {
    setAppState(prev => {
      const newPaths = updater(prev.paths);
      const newHistory = prev.history.slice(0, prev.historyIndex + 1);
      newHistory.push(newPaths);
      if (newHistory.length > 50) newHistory.shift();
      return {
        paths: newPaths,
        history: newHistory,
        historyIndex: newHistory.length - 1
      };
    });
  };

  const handleCommitHistory = () => {
    setAppState(prev => {
      const lastHistory = prev.history[prev.historyIndex];
      // Skip if state hasn't changed
      if (JSON.stringify(lastHistory) === JSON.stringify(prev.paths)) {
        return prev;
      }
      const newHistory = prev.history.slice(0, prev.historyIndex + 1);
      newHistory.push(prev.paths);
      if (newHistory.length > 50) newHistory.shift();
      return {
        ...prev,
        history: newHistory,
        historyIndex: newHistory.length - 1
      };
    });
  };

  const handleUndo = () => {
    setAppState(prev => {
      if (prev.historyIndex > 0) {
        const newIndex = prev.historyIndex - 1;
        return {
          ...prev,
          paths: prev.history[newIndex],
          historyIndex: newIndex
        };
      }
      return prev;
    });
  };

  const handleRedo = () => {
    setAppState(prev => {
      if (prev.historyIndex < prev.history.length - 1) {
        const newIndex = prev.historyIndex + 1;
        return {
          ...prev,
          paths: prev.history[newIndex],
          historyIndex: newIndex
        };
      }
      return prev;
    });
  };

  useEffect(() => {
    const timeout = setTimeout(() => {
      handleCommitHistory();
    }, 500);
    return () => clearTimeout(timeout);
  }, [paths]);

  const handleAddPath = (path: DrawingPath) => {
    updatePathsAndCommit(currentPaths => [...currentPaths, path]);
    setSelectedPathIds([path.id]);
  };

  const handleUpdatePath = (id: string, updates: Partial<DrawingPath>) => {
    setAppState(prev => {
      let nextPaths = prev.paths.map(p => p.id === id ? { ...p, ...updates } : p);

      // Flowchart: Resolve sticky bindings
      if (updates.anchors) {
        const updatedPath = nextPaths.find(p => p.id === id);
        if (updatedPath) {
          nextPaths = nextPaths.map(p => {
            if (p.id === id) return p;
            let pChanged = false;
            const newAnchors = p.anchors.map(anc => {
              if (anc.boundTo && anc.boundTo.pathId === id) {
                const targetAnchor = updatedPath.anchors.find(a => a.id === anc.boundTo!.anchorId);
                if (targetAnchor && (anc.point.x !== targetAnchor.point.x || anc.point.y !== targetAnchor.point.y)) {
                  pChanged = true;
                  return { ...anc, point: targetAnchor.point };
                }
              }
              return anc;
            });
            return pChanged ? { ...p, anchors: newAnchors } : p;
          });
        }
      }

      return {
        ...prev,
        paths: nextPaths
      };
    });
  };

  const handleUpdatePaths = (ids: string[], updates: Partial<DrawingPath>) => {
    setAppState(prev => ({
      ...prev,
      paths: prev.paths.map(p => ids.includes(p.id) ? { ...p, ...updates } : p)
    }));
  };

  const handleDeletePaths = (ids: string[]) => {
    updatePathsAndCommit(prev => prev.filter(p => !ids.includes(p.id)));
    setSelectedPathIds(prev => prev.filter(pid => !ids.includes(pid)));
  };

  const handleDeletePath = (id: string) => {
    updatePathsAndCommit(prev => prev.filter(p => p.id !== id));
    setSelectedPathIds(prev => prev.filter(pid => pid !== id));
  };

  const handleClearPaths = () => {
    updatePathsAndCommit(() => []);
    setSelectedPathIds([]);
  };

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;

      if (cmdOrCtrl && !e.shiftKey && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        handleUndo();
      } else if (cmdOrCtrl && e.shiftKey && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        handleRedo();
      } else if (cmdOrCtrl && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (!e.defaultPrevented && selectedPathIds.length > 0) {
          e.preventDefault();
          selectedPathIds.forEach(id => handleDeletePath(id));
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);

    const handlePaste = (e: ClipboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      
      if (!e.clipboardData) return;
      const items = e.clipboardData.items;
      
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const blob = items[i].getAsFile();
          if (blob) {
            const reader = new FileReader();
            reader.onload = (event) => {
              if (event.target && typeof event.target.result === 'string') {
                const img = new Image();
                img.onload = () => {
                  const newLayer: DrawingPath = {
                    id: `image-${Date.now()}`,
                    name: `Pasted Image`,
                    type: 'image',
                    imageUrl: event.target!.result as string,
                    imageWidth: img.width,
                    imageHeight: img.height,
                    x: 100,
                    y: 100,
                    anchors: [],
                    strokeWidth: 0,
                    color: '#000000',
                    gradientId: '',
                    dashPreset: 'solid',
                    customDashLength: 0,
                    customGapLength: 0,
                    flowSpeed: 0,
                    flowDirection: 'forward',
                    showGlow: false,
                    opacity: 1,
                    enabled: true,
                    pathType: 'image'
                  };
                  updatePathsAndCommit(prev => [...prev, newLayer]);
                  setSelectedPathIds([newLayer.id]);
                };
                img.src = event.target.result;
              }
            };
            reader.readAsDataURL(blob);
          }
          break; // Only paste one image at a time
        }
      }
    };

    window.addEventListener('paste', handlePaste);

    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown);
      window.removeEventListener('paste', handlePaste);
    };
  }, [handleUndo, handleRedo, handleDeletePath, selectedPathIds]);

  const handleImportSVG = (svgData: string) => {
    const extractedPaths = extractPathsFromSvgString(svgData);
    if (extractedPaths.length === 0) return;

    const newPaths: DrawingPath[] = extractedPaths.map((d, idx) => {
      const parsed = parseSVGPathToAnchors(d);
      return {
        id: `imported-${Date.now()}-${idx}`,
        name: `Imported Vector ${paths.length + idx + 1}`,
        anchors: parsed.anchors,
        closed: parsed.closed,
        strokeWidth: 4,
        color: '#00F2FF',
        gradientId: 'cyberpunk',
        dashPreset: 'neon',
        customDashLength: 20,
        customGapLength: 10,
        cornerRadius: 0,
        lineCap: 'round',
        lineJoin: 'round',
        flowSpeed: 1.5,
        flowDirection: 'forward',
        showGlow: false,
        opacity: 1,
        enabled: true
      };
    });

    updatePathsAndCommit(prev => [...prev, ...newPaths]);
    setSelectedPathIds([newPaths[newPaths.length - 1].id]);
    setActiveTool('direct-select');
  };

  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
      setIsFullscreen(false);
    }
  };

  // High-Resolution PNG Export with optional Transparency
  const handleExportPNG = async (transparent: boolean = true, scale: number = 1) => {
    const bbox = calculateBoundingBox(paths);
    const width = Math.max(bbox.width, 100);
    const height = Math.max(bbox.height, 100);
    const canvas = document.createElement('canvas');
    canvas.width = width * scale;
    canvas.height = height * scale;

    const offsets: Record<string, number> = {};
    const motionProgress: Record<string, number> = {};
    paths.forEach(p => {
        offsets[p.id] = 0;
        motionProgress[p.id] = 0; // At export PNG, just start of motion
    });
    const imageCache = await preloadPathImages(paths);
    renderArtboardToCanvas(canvas, paths, offsets, settings.backgroundColor, settings.showGrid, transparent, { x: -bbox.x, y: -bbox.y }, scale, motionProgress, 0, settings.globalSpeed || 1, settings.gridSize, imageCache);

    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `vector-flow-artboard${transparent ? '-transparent' : ''}.png`;
    a.click();
  };

  // Scalable SVG Vector Markup Export
  const handleExportSVG = (scale: number = 1) => {
    const svgElem = document.getElementById('artboard-svg');
    if (!svgElem) return;
    const svgClone = svgElem.cloneNode(true) as SVGSVGElement;

    // Remove editor-only chrome: anchor handles, selection halos, bounding boxes
    svgClone.querySelectorAll('.illustrator-handles, .bounding-box, [data-export-exclude]').forEach(el => el.remove());

    // The live artboard bakes pan/zoom into the content group; the viewBox handles framing here
    svgClone.querySelector('#artboard-content')?.removeAttribute('transform');

    // Drop the live grid (pan-anchored pattern + CSS var colors) — rebuilt below for the export frame
    svgClone.querySelector('#artboard-grid')?.remove();

    // Resolve theme CSS variables so the file renders identically outside the app
    const cssVarMap: Record<string, string> = {
      'var(--color-ink)': '#0a0a0a',
      'var(--color-paper)': '#ffffff',
      'var(--color-canvas)': '#f5f5f5'
    };
    svgClone.querySelectorAll('*').forEach(el => {
      ['stroke', 'fill', 'color'].forEach(attr => {
        const v = el.getAttribute(attr);
        if (v && cssVarMap[v]) el.setAttribute(attr, cssVarMap[v]);
      });
    });

    // Adjust viewBox to the calculated bounding box
    const bbox = calculateBoundingBox(paths);
    const w = Math.max(bbox.width, 100);
    const h = Math.max(bbox.height, 100);
    svgClone.setAttribute('viewBox', `${bbox.x} ${bbox.y} ${w} ${h}`);
    svgClone.setAttribute('width', String(w * scale));
    svgClone.setAttribute('height', String(h * scale));

    // Rebuild background + grid as concrete primitives covering exactly the exported frame
    const NS = 'http://www.w3.org/2000/svg';
    const content = svgClone.querySelector('#artboard-content') || svgClone;
    const defs = svgClone.querySelector('defs');
    if (settings.backgroundColor && settings.backgroundColor !== 'transparent') {
      const bg = document.createElementNS(NS, 'rect');
      bg.setAttribute('x', String(bbox.x));
      bg.setAttribute('y', String(bbox.y));
      bg.setAttribute('width', String(w));
      bg.setAttribute('height', String(h));
      bg.setAttribute('fill', settings.backgroundColor);
      content.insertBefore(bg, content.firstElementChild);
    }
    if (settings.showGrid) {
      const step = settings.gridSize || 40;
      const pattern = document.createElementNS(NS, 'pattern');
      pattern.setAttribute('id', 'export-grid');
      pattern.setAttribute('x', String(bbox.x));
      pattern.setAttribute('y', String(bbox.y));
      pattern.setAttribute('width', String(step));
      pattern.setAttribute('height', String(step));
      pattern.setAttribute('patternUnits', 'userSpaceOnUse');
      const line = document.createElementNS(NS, 'path');
      line.setAttribute('d', `M ${step} 0 L 0 0 0 ${step}`);
      line.setAttribute('fill', 'none');
      line.setAttribute('stroke', parseHexLuminance(settings.backgroundColor) < 0.5 ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)');
      line.setAttribute('stroke-width', '1');
      pattern.appendChild(line);
      if (defs) defs.appendChild(pattern); else svgClone.insertBefore(pattern, svgClone.firstElementChild);

      const gridRect = document.createElementNS(NS, 'rect');
      gridRect.setAttribute('x', String(bbox.x));
      gridRect.setAttribute('y', String(bbox.y));
      gridRect.setAttribute('width', String(w));
      gridRect.setAttribute('height', String(h));
      gridRect.setAttribute('fill', 'url(#export-grid)');
      content.insertBefore(gridRect, content.firstElementChild);
    }

    svgClone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    const svgData = new XMLSerializer().serializeToString(svgClone);
    const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'vector-flow-artboard.svg';
    a.click();
  };

  // Raw JSON Data Export
  const handleExportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({ paths, settings }, null, 2));
    const a = document.createElement('a');
    a.href = dataStr;
    a.download = 'vector-flow-artboard.json';
    a.click();
  };

  const exportWorkerRef = useRef<Worker | null>(null);

  // Helper promise to create single GIF from a list of paths via Web Worker
  const generateGifForPaths = async (
    targetPaths: DrawingPath[], 
    transparent: boolean, 
    filename: string,
    scale: number = 1,
    fps: number = 15,
    durationInSeconds: number = 2,
    colorPalette: 'adaptive' | 'web-safe' | 'grayscale' = 'adaptive',
    dithering: boolean = true
  ): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (exportWorkerRef.current) {
        exportWorkerRef.current.terminate();
      }

      const worker = new Worker(new URL('./workers/gifWorker.ts', import.meta.url), { type: 'module' });
      exportWorkerRef.current = worker;

      const jobId = Date.now().toString();

      worker.onmessage = (e) => {
        const { type, text, error, result, id } = e.data;
        if (id !== jobId) return;

        if (type === 'progress') {
          setGifProgressText(text);
        } else if (type === 'error') {
          console.error('Worker GIF export error:', error);
          worker.terminate();
          exportWorkerRef.current = null;
          reject(new Error(error));
        } else if (type === 'done') {
          const url = URL.createObjectURL(result);
          const a = document.createElement('a');
          a.href = url;
          a.download = filename;
          a.click();
          setTimeout(() => URL.revokeObjectURL(url), 10000); // Allow time for download to start before cleanup
          
          worker.terminate();
          exportWorkerRef.current = null;
          resolve();
        }
      };

      worker.onerror = (err) => {
        console.error('Worker error:', err);
        worker.terminate();
        exportWorkerRef.current = null;
        reject(err);
      };

      worker.postMessage({
        id: jobId,
        paths: targetPaths,
        settings,
        options: {
          scale,
          fps,
          duration: durationInSeconds,
          transparent,
          colorPalette,
          dithering
        }
      });
    });
  };

  const handleCancelExportGIF = () => {
    if (exportWorkerRef.current) {
      exportWorkerRef.current.terminate();
      exportWorkerRef.current = null;
    }
    setIsExportingGIF(false);
    setGifProgressText('');
  };

  // Enhanced Animated GIF Export: Supports Transparent Background & Separate Layer Export
  const handleExportGIF = async (options: { 
    transparent: boolean; 
    exportSeparateLayers: boolean; 
    singleLayerId?: string;
    scale: number;
    fps: number;
    duration: number;
    colorPalette: 'adaptive' | 'web-safe' | 'grayscale';
    dithering: boolean;
  }) => {
    setIsExportingGIF(true);

    try {
      const enabledPaths = paths.filter(p => p.enabled);
      const scale = options.scale || 1;

      if (options.exportSeparateLayers) {
        for (let i = 0; i < enabledPaths.length; i++) {
          if (!isExportingGIF) break; // Check if cancelled
          const layer = enabledPaths[i];
          setGifProgressText(`Rendering Layer ${i + 1} of ${enabledPaths.length}: "${layer.name}"...`);
          const safeName = layer.name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
          await generateGifForPaths([layer], options.transparent, `${safeName || 'layer'}-flow.gif`, scale, options.fps, options.duration, options.colorPalette, options.dithering);
          await new Promise(r => setTimeout(r, 400));
        }
      } else if (options.singleLayerId) {
        const target = paths.find(p => p.id === options.singleLayerId) || enabledPaths[0];
        if (target) {
          setGifProgressText(`Rendering "${target.name}" GIF...`);
          const safeName = target.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
          await generateGifForPaths([target], options.transparent, `${safeName}-flow.gif`, scale, options.fps, options.duration, options.colorPalette, options.dithering);
        }
      } else {
        await generateGifForPaths(paths, options.transparent, 'vector-flow-artboard.gif', scale, options.fps, options.duration, options.colorPalette, options.dithering);
      }
    } catch (err) {
      if (err instanceof Error && err.message.includes('abort')) {
        console.log('Export cancelled');
      } else {
        console.error('GIF generation error:', err);
      }
    } finally {
      setIsExportingGIF(false);
      setGifProgressText('');
    }
  };

  // Real-time Canvas Video Recording (WebM) with optional Transparency
  const handleStartRecordingVideo = async (transparent: boolean = false, scale: number = 1) => {
    setIsRecording(true);
    setRecordingTime(4);

    const bbox = calculateBoundingBox(paths);
    const width = Math.max(bbox.width, 100);
    const height = Math.max(bbox.height, 100);

    const canvas = document.createElement('canvas');
    canvas.width = width * scale;
    canvas.height = height * scale;

    const imageCache = await preloadPathImages(paths);

    const stream = canvas.captureStream(30);
    const mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
    const chunks: Blob[] = [];

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `vector-flow-recording${transparent ? '-transparent' : ''}.webm`;
      a.click();
      setIsRecording(false);
    };

    mediaRecorder.start();

    // Render loop for 4 seconds
    let startTime = performance.now();
    let lastTime = startTime;
    let currentOffsets: Record<string, number> = {};
    let currentMotionProgress: Record<string, number> = {};

    const recordLoop = (time: number) => {
      const elapsed = (time - startTime) / 1000;
      const dt = Math.min(0.1, (time - lastTime) / 1000);
      lastTime = time;
      const remaining = Math.max(0, 4 - Math.floor(elapsed));
      setRecordingTime(remaining);

      paths.forEach(p => {
        const speed = (p.flowSpeed || 1.5) * (settings.globalSpeed || 1) * 45;
        const dir = p.flowDirection === 'reverse' ? 1 : -1;
        currentOffsets[p.id] = (currentOffsets[p.id] || 0) + (1 / 30) * speed * dir;

        // Advance motion objects exactly like the live artboard loop does
        const motionSpeed = (p.motionSpeed || 1) * (settings.globalSpeed || 1);
        let progress = (currentMotionProgress[p.id] || 0) + motionSpeed * 0.05 * dt;
        if (progress >= 1) progress %= 1;
        currentMotionProgress[p.id] = progress;
      });

      renderArtboardToCanvas(canvas, paths, currentOffsets, settings.backgroundColor, settings.showGrid, transparent, { x: -bbox.x, y: -bbox.y }, scale, currentMotionProgress, elapsed, settings.globalSpeed || 1, settings.gridSize, imageCache);

      if (elapsed < 4) {
        requestAnimationFrame(recordLoop);
      } else {
        mediaRecorder.stop();
      }
    };

    requestAnimationFrame(recordLoop);
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[var(--color-canvas)] text-[var(--color-ink)] font-sans">
      <Header
        isPlaying={isPlaying}
        onTogglePlay={() => setIsPlaying(!isPlaying)}
        onReset={() => setAppState({ paths: getInitialPaths(), history: [getInitialPaths()], historyIndex: 0 })}
        onOpenExport={() => setExportModalOpen(true)}
        onOpenImport={() => setImportModalOpen(true)}
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        sidebarOpen={sidebarOpen}
        isFullscreen={isFullscreen}
        onToggleFullscreen={handleToggleFullscreen}
        fps={fps}
        canUndo={historyIndex > 0}
        canRedo={historyIndex < history.length - 1}
        onUndo={handleUndo}
        onRedo={handleRedo}
      />

      <div className="flex flex-1 overflow-hidden relative">
        <ArtboardCanvas
          paths={paths}
          selectedPathIds={selectedPathIds}
          onSelectPaths={setSelectedPathIds}
          onAddPath={handleAddPath}
          onUpdatePath={handleUpdatePath}
          onDeletePath={handleDeletePath}
          onClearPaths={handleClearPaths}
          onCommitHistory={handleCommitHistory}
          activeTool={activeTool}
          setActiveTool={setActiveTool}
          settings={settings}
          onUpdateSettings={(upd) => setSettings(prev => ({ ...prev, ...upd }))}
          isPlaying={isPlaying}
        />

        {sidebarOpen && (
          <SidebarControls
            paths={paths}
            selectedPathIds={selectedPathIds}
            onSelectPaths={setSelectedPathIds}
            onAddPath={handleAddPath}
            onUpdatePath={handleUpdatePath}
            onUpdatePaths={handleUpdatePaths}
            onDeletePath={handleDeletePath}
            onDeletePaths={handleDeletePaths}
            settings={settings}
            onUpdateSettings={(upd) => setSettings(prev => ({ ...prev, ...upd }))}
          />
        )}
      </div>

      <MetricsBar
        pathCount={paths.filter(p => p.enabled).length}
        fps={fps}
        isPlaying={isPlaying}
        zoom={settings.zoom ?? 1}
        onZoomChange={(zoom) => setSettings(prev => ({ ...prev, zoom }))}
      />

      <ExportModal
        isOpen={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        paths={paths}
        selectedPathIds={selectedPathIds}
        onExportPNG={handleExportPNG}
        onExportSVG={handleExportSVG}
        onExportJSON={handleExportJSON}
        onExportGIF={handleExportGIF}
        onStartRecordingVideo={handleStartRecordingVideo}
        isRecording={isRecording}
        recordingTime={recordingTime}
        isExportingGIF={isExportingGIF}
        gifProgressText={gifProgressText}
        onCancelExportGIF={handleCancelExportGIF}
      />

      <ImportSvgModal
        isOpen={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        onImport={handleImportSVG}
      />
    </div>
  );
}
