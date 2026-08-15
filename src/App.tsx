/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import gifshot from 'gifshot';
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
  createPresetAnchors, 
  renderArtboardToCanvas,
  anchorsToPathString 
} from './utils/bezier';
import { extractPathsFromSvgString, parseSVGPathToAnchors } from './utils/svgImport';

const INITIAL_SETTINGS: ArtboardSettings = {
  backgroundColor: '#ffffff',
  showGrid: true,
  gridSize: 40,
  snapToGrid: false,
  globalSpeed: 1.0,
  pencilSmoothness: 6
};

const getInitialPaths = (): DrawingPath[] => {
  const wave = createPresetAnchors('wave', 900, 600);
  const spiral = createPresetAnchors('spiral', 900, 600);
  const infinity = createPresetAnchors('infinity', 900, 600);

  return [
    {
      id: 'path-wave',
      name: 'Cyber Sine Wave',
      anchors: wave.anchors,
      closed: wave.closed,
      pathType: 'preset',
      presetType: 'wave',
      strokeWidth: 4,
      color: '#00F2FF',
      gradientId: 'cyberpunk',
      dashPreset: 'neon',
      customDashLength: 24,
      customGapLength: 12,
      cornerRadius: 12,
      lineCap: 'round',
      lineJoin: 'round',
      flowSpeed: 1.5,
      flowDirection: 'forward',
      showGlow: true,
      opacity: 1,
      enabled: true
    },
    {
      id: 'path-spiral',
      name: 'Quantum Spiral',
      anchors: spiral.anchors,
      closed: spiral.closed,
      pathType: 'preset',
      presetType: 'spiral',
      strokeWidth: 3.5,
      color: '#7000FF',
      gradientId: 'sunset',
      dashPreset: 'racing',
      customDashLength: 16,
      customGapLength: 10,
      cornerRadius: 8,
      lineCap: 'round',
      lineJoin: 'round',
      flowSpeed: 1.8,
      flowDirection: 'forward',
      showGlow: true,
      opacity: 1,
      enabled: true
    },
    {
      id: 'path-infinity',
      name: 'Infinity Matrix Loop',
      anchors: infinity.anchors,
      closed: infinity.closed,
      pathType: 'preset',
      presetType: 'infinity',
      strokeWidth: 4,
      color: '#00FF66',
      gradientId: 'emerald',
      dashPreset: 'neon',
      customDashLength: 28,
      customGapLength: 14,
      cornerRadius: 16,
      lineCap: 'round',
      lineJoin: 'round',
      flowSpeed: 1.2,
      flowDirection: 'reverse',
      showGlow: true,
      opacity: 1,
      enabled: true
    }
  ];
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
    setAppState(prev => ({
      ...prev,
      paths: prev.paths.map(p => p.id === id ? { ...p, ...updates } : p)
    }));
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
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [handleUndo, handleRedo, handleDeletePath, selectedPathId]);

  const handleAddPresetPath = (presetType: 'wave' | 'spiral' | 'infinity' | 'zigzag' | 'star' | 'circle') => {
    const res = createPresetAnchors(presetType, 900, 600);
    const id = `preset-${Date.now()}`;
    const newPath: DrawingPath = {
      id,
      name: `${presetType.toUpperCase()} Vector`,
      anchors: res.anchors,
      closed: res.closed,
      pathType: 'preset',
      presetType,
      strokeWidth: 4,
      color: '#00F2FF',
      gradientId: presetType === 'wave' ? 'cyberpunk' : presetType === 'spiral' ? 'sunset' : 'emerald',
      dashPreset: 'neon',
      customDashLength: 20,
      customGapLength: 10,
      cornerRadius: 10,
      lineCap: 'round',
      lineJoin: 'round',
      flowSpeed: 1.5,
      flowDirection: 'forward',
      showGlow: true,
      opacity: 1,
      enabled: true
    };
    updatePathsAndCommit(prev => [...prev, newPath]);
    setSelectedPathId(id);
    setActiveTool('direct-select');
  };

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
        pathType: 'preset',
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
        showGlow: true,
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
  const handleExportPNG = (transparent: boolean = true) => {
    const width = 1200;
    const height = 800;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const offsets: Record<string, number> = {};
    paths.forEach(p => { offsets[p.id] = 0; });
    renderArtboardToCanvas(canvas, paths, offsets, settings.backgroundColor, settings.showGrid, transparent);

    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `vector-flow-artboard${transparent ? '-transparent' : ''}.png`;
    a.click();
  };

  // Scalable SVG Vector Markup Export
  const handleExportSVG = () => {
    const svgElem = document.getElementById('artboard-svg');
    if (!svgElem) return;
    const svgClone = svgElem.cloneNode(true) as SVGSVGElement;
    
    // Remove temporary edit handles from exported SVG
    const handles = svgClone.querySelector('.illustrator-handles');
    if (handles) handles.remove();

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
  const generateGifForPaths = (
    targetPaths: DrawingPath[], 
    transparent: boolean, 
    filename: string
  ): Promise<void> => {
    return new Promise((resolve, reject) => {
      const width = 720;
      const height = 480;
      const frameCount = 18;
      const frames: string[] = [];

      for (let f = 0; f < frameCount; f++) {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const offsets: Record<string, number> = {};
        targetPaths.forEach(p => {
          const cycleDist = (p.customDashLength || 20) + (p.customGapLength || 10) + ((p.customDash2 || 0) + (p.customGap2 || 0));
          const actualCycle = cycleDist > 0 ? cycleDist : 40;
          const speed = (p.flowSpeed || 1.5) * (settings.globalSpeed || 1);
          const dir = p.flowDirection === 'reverse' ? 1 : -1;
          offsets[p.id] = f * (actualCycle / frameCount) * speed * dir;
        });

        renderArtboardToCanvas(canvas, targetPaths, offsets, settings.backgroundColor, false, transparent);
        frames.push(canvas.toDataURL('image/png'));
      }

      gifshot.createGIF({
        images: frames,
        interval: 0.07,
        gifWidth: width,
        gifHeight: height,
        numWorkers: 2
      }, (obj: any) => {
        if (!obj.error) {
          const url = obj.image;
          const a = document.createElement('a');
          a.href = url;
          a.download = filename;
          a.click();
          resolve();
        } else {
          console.error('GIF export error:', obj.error);
          resolve(); // Resolve so batch export continues
        }
      });
    });
  };

  // Enhanced Animated GIF Export: Supports Transparent Background & Separate Layer Export
  const handleExportGIF = async (options: { 
    transparent: boolean; 
    exportSeparateLayers: boolean; 
    singleLayerId?: string 
  }) => {
    setIsExportingGIF(true);

    try {
      const enabledPaths = paths.filter(p => p.enabled);

      if (options.exportSeparateLayers) {
        // Export each enabled layer as an individual animated GIF file
        for (let i = 0; i < enabledPaths.length; i++) {
          const layer = enabledPaths[i];
          setGifProgressText(`Rendering Layer ${i + 1} of ${enabledPaths.length}: "${layer.name}"...`);
          const safeName = layer.name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
          await generateGifForPaths([layer], options.transparent, `${safeName || 'layer'}-flow.gif`);
          // Slight delay between downloads
          await new Promise(r => setTimeout(r, 400));
        }
      } else if (options.singleLayerId) {
        // Export single selected layer
        const target = paths.find(p => p.id === options.singleLayerId) || enabledPaths[0];
        if (target) {
          setGifProgressText(`Rendering "${target.name}" GIF...`);
          const safeName = target.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
          await generateGifForPaths([target], options.transparent, `${safeName}-flow.gif`);
        }
      } else {
        // Export full composition
        setGifProgressText(`Rendering Animated Composition (${options.transparent ? 'Transparent' : 'Solid'})...`);
        await generateGifForPaths(enabledPaths, options.transparent, 'vector-flow-artboard.gif');
      }
    } catch (err) {
      console.error('GIF generation error:', err);
    } finally {
      setIsExportingGIF(false);
      setGifProgressText('');
    }
  };

  // Real-time Canvas Video Recording (WebM) with optional Transparency
  const handleStartRecordingVideo = (transparent: boolean = false) => {
    setIsRecording(true);
    setRecordingTime(4);

    const width = 800;
    const height = 600;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

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

      renderArtboardToCanvas(canvas, paths, currentOffsets, settings.backgroundColor, settings.showGrid, transparent);

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
            onAddPresetPath={handleAddPresetPath}
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
