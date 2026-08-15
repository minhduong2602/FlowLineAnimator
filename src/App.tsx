/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { encode } from 'modern-gif';
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
  calculateBoundingBox
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

  const [selectedPathId, setSelectedPathId] = useState<string | null>('path-wave');
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

  const handleAddPath = (newPath: DrawingPath) => {
    updatePathsAndCommit(prev => [...prev, newPath]);
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

  const handleDeletePath = (id: string) => {
    updatePathsAndCommit(prev => prev.filter(p => p.id !== id));
    if (selectedPathId === id) {
      setSelectedPathId(null);
    }
  };

  const handleClearPaths = () => {
    updatePathsAndCommit(() => []);
    setSelectedPathId(null);
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
        if (!e.defaultPrevented && selectedPathId) {
          e.preventDefault();
          handleDeletePath(selectedPathId);
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
                  setSelectedPathId(newLayer.id);
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
  }, [handleUndo, handleRedo, handleDeletePath, selectedPathId]);

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
    setSelectedPathId(newPaths[newPaths.length - 1].id);
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
  const handleExportPNG = (transparent: boolean = true, scale: number = 1) => {
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
    renderArtboardToCanvas(canvas, paths, offsets, settings.backgroundColor, settings.showGrid, transparent, { x: -bbox.x, y: -bbox.y }, scale, motionProgress);

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
    
    // Remove temporary edit handles from exported SVG
    const handles = svgClone.querySelector('.illustrator-handles');
    if (handles) handles.remove();

    // Adjust viewBox to the calculated bounding box
    const bbox = calculateBoundingBox(paths);
    const w = Math.max(bbox.width, 100);
    const h = Math.max(bbox.height, 100);
    svgClone.setAttribute('viewBox', `${bbox.x} ${bbox.y} ${w} ${h}`);
    svgClone.setAttribute('width', String(w * scale));
    svgClone.setAttribute('height', String(h * scale));

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

  // Helper promise to create single GIF from a list of paths
  const generateGifForPaths = async (
    targetPaths: DrawingPath[], 
    transparent: boolean, 
    filename: string,
    scale: number = 1,
    fps: number = 15,
    durationInSeconds: number = 2
  ): Promise<void> => {
    const bbox = calculateBoundingBox(targetPaths);
    const width = Math.max(bbox.width, 100);
    const height = Math.max(bbox.height, 100);
    const frameCount = Math.floor(fps * durationInSeconds);
    const frameDelayMs = Math.floor(1000 / fps);
    const frames: HTMLCanvasElement[] = [];

    for (let f = 0; f < frameCount; f++) {
      const canvas = document.createElement('canvas');
      canvas.width = width * scale;
      canvas.height = height * scale;

      const offsets: Record<string, number> = {};
      const motionProgress: Record<string, number> = {};
      const timeElapsed = f * (frameDelayMs / 1000); // converting frame index to elapsed seconds
      
      targetPaths.forEach(p => {
        // Continuous dash flow velocity: 45 px/sec per unit speed (matches ArtboardCanvas animation loop)
        const flowVelocity = (p.flowSpeed || 1.5) * (settings.globalSpeed || 1) * 45;
        const dir = p.flowDirection === 'reverse' ? 1 : -1;
        offsets[p.id] = timeElapsed * flowVelocity * dir;

        const motionSpeed = (p.motionSpeed || 1) * (settings.globalSpeed || 1);
        const duration = Math.max(0.5, 20 / motionSpeed);
        motionProgress[p.id] = (timeElapsed % duration) / duration;
      });

      renderArtboardToCanvas(
        canvas, 
        targetPaths, 
        offsets, 
        settings.backgroundColor, 
        false, 
        transparent, 
        { x: -bbox.x, y: -bbox.y }, 
        scale, 
        motionProgress,
        timeElapsed,
        settings.globalSpeed || 1
      );
      frames.push(canvas);
    }

    try {
      const buffer = await encode({
        width: width * scale,
        height: height * scale,
        frames: frames.map(canvas => ({
          data: canvas,
          delay: frameDelayMs,
          transparent
        }))
      });

      const blob = new Blob([buffer], { type: 'image/gif' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
    } catch (err) {
      console.error('GIF export error:', err);
    }
  };

  // Enhanced Animated GIF Export: Supports Transparent Background & Separate Layer Export
  const handleExportGIF = async (options: { 
    transparent: boolean; 
    exportSeparateLayers: boolean; 
    singleLayerId?: string;
    scale: number;
    fps: number;
    duration: number;
  }) => {
    setIsExportingGIF(true);

    try {
      const enabledPaths = paths.filter(p => p.enabled);
      const scale = options.scale || 1;

      if (options.exportSeparateLayers) {
        // Export each enabled layer as an individual animated GIF file
        for (let i = 0; i < enabledPaths.length; i++) {
          const layer = enabledPaths[i];
          setGifProgressText(`Rendering Layer ${i + 1} of ${enabledPaths.length}: "${layer.name}"...`);
          const safeName = layer.name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
          await generateGifForPaths([layer], options.transparent, `${safeName || 'layer'}-flow.gif`, scale, options.fps, options.duration);
          // Slight delay between downloads
          await new Promise(r => setTimeout(r, 400));
        }
      } else if (options.singleLayerId) {
        // Export single selected layer
        const target = paths.find(p => p.id === options.singleLayerId) || enabledPaths[0];
        if (target) {
          setGifProgressText(`Rendering "${target.name}" GIF...`);
          const safeName = target.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
          await generateGifForPaths([target], options.transparent, `${safeName}-flow.gif`, scale, options.fps, options.duration);
        }
      } else {
        // Export full composition
        setGifProgressText(`Rendering Animated Composition (${options.transparent ? 'Transparent' : 'Solid'})...`);
        await generateGifForPaths(paths, options.transparent, 'vector-flow-artboard.gif', scale, options.fps, options.duration);
      }
    } catch (err) {
      console.error('GIF generation error:', err);
    } finally {
      setIsExportingGIF(false);
      setGifProgressText('');
    }
  };

  // Real-time Canvas Video Recording (WebM) with optional Transparency
  const handleStartRecordingVideo = (transparent: boolean = false, scale: number = 1) => {
    setIsRecording(true);
    setRecordingTime(4);

    const bbox = calculateBoundingBox(paths);
    const width = Math.max(bbox.width, 100);
    const height = Math.max(bbox.height, 100);

    const canvas = document.createElement('canvas');
    canvas.width = width * scale;
    canvas.height = height * scale;

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
    let currentOffsets: Record<string, number> = {};

    const recordLoop = (time: number) => {
      const elapsed = (time - startTime) / 1000;
      const remaining = Math.max(0, 4 - Math.floor(elapsed));
      setRecordingTime(remaining);

      paths.forEach(p => {
        const speed = (p.flowSpeed || 1.5) * (settings.globalSpeed || 1) * 45;
        const dir = p.flowDirection === 'reverse' ? 1 : -1;
        currentOffsets[p.id] = (currentOffsets[p.id] || 0) + (1 / 30) * speed * dir;
      });

      renderArtboardToCanvas(canvas, paths, currentOffsets, settings.backgroundColor, settings.showGrid, transparent, { x: -bbox.x, y: -bbox.y }, scale);

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
          selectedPathId={selectedPathId}
          onSelectPath={setSelectedPathId}
          onAddPath={handleAddPath}
          onUpdatePath={handleUpdatePath}
          onDeletePath={handleDeletePath}
          onClearPaths={handleClearPaths}
          onCommitHistory={handleCommitHistory}
          activeTool={activeTool}
          setActiveTool={setActiveTool}
          settings={settings}
          isPlaying={isPlaying}
        />

        {sidebarOpen && (
          <SidebarControls
            paths={paths}
            selectedPathId={selectedPathId}
            onSelectPath={setSelectedPathId}
            onUpdatePath={handleUpdatePath}
            onDeletePath={handleDeletePath}
            settings={settings}
            onUpdateSettings={(upd) => setSettings(prev => ({ ...prev, ...upd }))}
          />
        )}
      </div>

      <MetricsBar
        pathCount={paths.filter(p => p.enabled).length}
        fps={fps}
        isPlaying={isPlaying}
      />

      <ExportModal
        isOpen={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        paths={paths}
        selectedPathId={selectedPathId}
        onExportPNG={handleExportPNG}
        onExportSVG={handleExportSVG}
        onExportJSON={handleExportJSON}
        onExportGIF={handleExportGIF}
        onStartRecordingVideo={handleStartRecordingVideo}
        isRecording={isRecording}
        recordingTime={recordingTime}
        isExportingGIF={isExportingGIF}
        gifProgressText={gifProgressText}
      />

      <ImportSvgModal
        isOpen={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        onImport={handleImportSVG}
      />
    </div>
  );
}
