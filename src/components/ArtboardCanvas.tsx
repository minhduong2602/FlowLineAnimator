import React, { useState, useRef, useEffect } from 'react';
import { DrawingPath, DrawTool, Point, AnchorPoint, ArtboardSettings } from '../types';
import { GRADIENT_PRESETS, DASH_PRESETS } from '../data/presets';
import { 
  anchorsToPathString, 
  fitSmoothBezierAnchors, 
  uid,
  distance 
} from '../utils/bezier';
import { 
  MousePointer, 
  PenTool, 
  Pencil, 
  Spline, 
  Minus, 
  Trash2, 
  PlusCircle, 
  MinusCircle, 
  CornerUpRight, 
  Check, 
  X,
  Maximize2,
  GitMerge
} from 'lucide-react';

interface ArtboardCanvasProps {
  paths: DrawingPath[];
  selectedPathId: string | null;
  onSelectPath: (id: string | null) => void;
  onAddPath: (path: DrawingPath) => void;
  onUpdatePath: (id: string, updates: Partial<DrawingPath>) => void;
  onDeletePath: (id: string) => void;
  onClearPaths: () => void;
  onCommitHistory?: () => void;
  activeTool: DrawTool;
  setActiveTool: (tool: DrawTool) => void;
  settings: ArtboardSettings;
  isPlaying: boolean;
}

type DragTarget = 
  | { type: 'anchor'; index: number }
  | { type: 'handleIn'; index: number }
  | { type: 'handleOut'; index: number }
  | { type: 'wholePath' }
  | null;

export const ArtboardCanvas: React.FC<ArtboardCanvasProps> = ({
  paths,
  selectedPathId,
  onSelectPath,
  onAddPath,
  onUpdatePath,
  onDeletePath,
  onClearPaths,
  onCommitHistory,
  activeTool,
  setActiveTool,
  settings,
  isPlaying
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);

  // Drawing state
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [rawPencilPoints, setRawPencilPoints] = useState<Point[]>([]);
  
  // Pen / Curve multi-point building state
  const [penAnchors, setPenAnchors] = useState<AnchorPoint[]>([]);
  const [currentCursorPos, setCurrentCursorPos] = useState<Point | null>(null);
  const [isDraggingPenHandle, setIsDraggingPenHandle] = useState<boolean>(false);
  const [connectorStart, setConnectorStart] = useState<{ point: Point; boundTo?: { pathId: string; anchorId: string } | null } | null>(null);

  // Direct Selection / Anchor Editing state
  const [selectedAnchorIndex, setSelectedAnchorIndex] = useState<number | null>(null);
  const [dragTarget, setDragTarget] = useState<DragTarget>(null);
  const [dragStartPoint, setDragStartPoint] = useState<Point | null>(null);

  // Continuous animation flow offsets
  const [dashOffsets, setDashOffsets] = useState<Record<string, number>>({});
  const animFrameRef = useRef<number | null>(null);

  const [pan, setPan] = useState<Point>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState<Point | null>(null);

  const selectedPath = paths.find(p => p.id === selectedPathId);

  // Animation Loop
  useEffect(() => {
    if (!isPlaying) return;

    let lastTime = performance.now();

    const animate = (time: number) => {
      const dt = (time - lastTime) / 1000;
      lastTime = time;

      setDashOffsets(prev => {
        const next = { ...prev };
        paths.forEach(path => {
          if (!path.enabled) return;
          const current = prev[path.id] || 0;
          const speed = (path.flowSpeed || 1.5) * (settings.globalSpeed || 1) * 45 * dt;
          const direction = path.flowDirection === 'reverse' ? 1 : -1;
          next[path.id] = current + speed * direction;
        });
        return next;
      });

      animFrameRef.current = requestAnimationFrame(animate);
    };

    animFrameRef.current = requestAnimationFrame(animate);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlaying, paths, settings.globalSpeed]);

  // Keyboard shortcut listener (Delete key removes selected anchor, Enter finishes pen)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        // If an anchor is selected in direct-select mode, delete it
        if (selectedPathId && selectedPath && selectedAnchorIndex !== null && selectedPath.anchors.length > 2) {
          e.preventDefault();
          e.stopImmediatePropagation();
          const updatedAnchors = selectedPath.anchors.filter((_, idx) => idx !== selectedAnchorIndex);
          onUpdatePath(selectedPathId, { anchors: updatedAnchors });
          onCommitHistory?.();
          setSelectedAnchorIndex(null);
        }
      } else if (e.key === 'Escape' || e.key === 'Enter') {
        if (penAnchors.length >= 2) {
          finishPenPath(false);
        }
      } else if (e.key.toLowerCase() === 'v') {
        setActiveTool('select');
      } else if (e.key.toLowerCase() === 'a') {
        setActiveTool('direct-select');
      } else if (e.key.toLowerCase() === 'p') {
        setActiveTool('pen');
      } else if (e.key.toLowerCase() === 'n') {
        setActiveTool('pencil');
      } else if (e.key.toLowerCase() === 'c') {
        setActiveTool('connector');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedPathId, selectedPath, selectedAnchorIndex, penAnchors, activeTool]);

  const findNearestAnchor = (pos: Point, excludePathId?: string, threshold = 20) => {
    if (!settings.snapToAnchor) return null;
    let nearest: { pathId: string; anchorId: string; point: Point } | null = null;
    let minDist = threshold;

    paths.forEach(path => {
      if (path.id === excludePathId) return;
      path.anchors.forEach(anc => {
        const d = distance(pos, anc.point);
        if (d < minDist) {
          minDist = d;
          nearest = { pathId: path.id, anchorId: anc.id, point: anc.point };
        }
      });
    });

    return nearest;
  };

  const getCanvasCoords = (e: React.MouseEvent<SVGSVGElement> | React.MouseEvent<SVGElement>, applySnap: boolean = true, excludePathId?: string): Point => {
    if (!svgRef.current) return { x: e.clientX, y: e.clientY };
    const rect = svgRef.current.getBoundingClientRect();
    const rawX = e.clientX - rect.left - pan.x;
    const rawY = e.clientY - rect.top - pan.y;
    
    let x = rawX;
    let y = rawY;

    if (applySnap) {
      let anchorSnapped = false;
      if (settings.snapToAnchor) {
        const snap = findNearestAnchor({ x: rawX, y: rawY }, excludePathId, 15);
        if (snap) {
          x = snap.point.x;
          y = snap.point.y;
          anchorSnapped = true;
        }
      }
      
      // Only snap to grid if we haven't already snapped to an anchor
      if (!anchorSnapped && settings.snapToGrid) {
        const grid = settings.gridSize || 20;
        x = Math.round(x / grid) * grid;
        y = Math.round(y / grid) * grid;
      }
    }

    return { x, y };
  };

  // Finish Pen Tool path and commit to layer
  const finishPenPath = (closed = false) => {
    if (penAnchors.length < 2) {
      setPenAnchors([]);
      setIsDrawing(false);
      return;
    }

    const newPathId = `path-${Date.now()}`;
    const newPath: DrawingPath = {
      id: newPathId,
      name: `Bezier Curve ${paths.length + 1}`,
      anchors: [...penAnchors],
      closed,
      pathType: 'pen',
      strokeWidth: 4,
      color: '#00F2FF',
      gradientId: 'cyberpunk',
      dashPreset: 'neon',
      customDashLength: 24,
      customGapLength: 12,
      flowSpeed: 1.5,
      flowDirection: 'forward',
      showGlow: false,
      opacity: 1,
      enabled: true
    };

    onAddPath(newPath);
    onSelectPath(newPathId);
    setPenAnchors([]);
    setIsDrawing(false);
    setActiveTool('direct-select');
  };

  // Convert selected anchor between Smooth and Corner
  const handleToggleAnchorSmooth = () => {
    if (!selectedPath || selectedAnchorIndex === null || !selectedPathId) return;
    const anchor = selectedPath.anchors[selectedAnchorIndex];
    const isCorner = !anchor.isCorner;

    let handleIn = anchor.handleIn;
    let handleOut = anchor.handleOut;

    if (!isCorner) {
      // Convert to smooth: compute collinear tangent
      const prev = selectedPath.anchors[selectedAnchorIndex - 1] || anchor;
      const next = selectedPath.anchors[selectedAnchorIndex + 1] || anchor;
      const dx = (next.point.x - prev.point.x) * 0.25;
      const dy = (next.point.y - prev.point.y) * 0.25;
      handleIn = { x: anchor.point.x - dx, y: anchor.point.y - dy };
      handleOut = { x: anchor.point.x + dx, y: anchor.point.y + dy };
    } else {
      // Convert to sharp corner
      handleIn = null;
      handleOut = null;
    }

    const updated = [...selectedPath.anchors];
    updated[selectedAnchorIndex] = {
      ...anchor,
      isCorner,
      handleIn,
      handleOut
    };

    onUpdatePath(selectedPathId, { anchors: updated });
    onCommitHistory?.();
  };

  // Delete selected anchor
  const handleDeleteSelectedAnchor = () => {
    if (!selectedPath || selectedAnchorIndex === null || !selectedPathId) return;
    if (selectedPath.anchors.length <= 2) {
      onDeletePath(selectedPathId);
      return;
    }
    const updated = selectedPath.anchors.filter((_, idx) => idx !== selectedAnchorIndex);
    onUpdatePath(selectedPathId, { anchors: updated });
    onCommitHistory?.();
    setSelectedAnchorIndex(null);
  };

  // Add an anchor point along path
  const handleAddAnchorPoint = (pos: Point) => {
    if (!selectedPath || !selectedPathId) return;
    
    // Find closest segment to insert into
    let bestIndex = selectedPath.anchors.length - 1;
    let minD = Infinity;

    for (let i = 0; i < selectedPath.anchors.length - 1; i++) {
      const p1 = selectedPath.anchors[i].point;
      const p2 = selectedPath.anchors[i + 1].point;
      const mid = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
      const d = distance(pos, mid);
      if (d < minD) {
        minD = d;
        bestIndex = i + 1;
      }
    }

    const newAnchor: AnchorPoint = {
      id: uid('anchor'),
      point: pos,
      handleIn: { x: pos.x - 20, y: pos.y },
      handleOut: { x: pos.x + 20, y: pos.y },
      isCorner: false
    };

    const updated = [...selectedPath.anchors];
    updated.splice(bestIndex, 0, newAnchor);
    onUpdatePath(selectedPathId, { anchors: updated });
    onCommitHistory?.();
    setSelectedAnchorIndex(bestIndex);
    setActiveTool('direct-select');
  };

  // MOUSE DOWN HANDLER
  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      e.preventDefault();
      setIsPanning(true);
      setPanStart({ x: e.clientX, y: e.clientY });
      return;
    }

    const pos = getCanvasCoords(e);

    // 1. PENCIL TOOL (Freehand Smooth Drawing)
    if (activeTool === 'pencil' || activeTool === 'freehand') {
      setIsDrawing(true);
      setRawPencilPoints([pos]);
      return;
    }

    // 2. LINE TOOL
    if (activeTool === 'line') {
      setIsDrawing(true);
      setRawPencilPoints([pos, pos]);
      return;
    }

    // 2.5. CONNECTOR TOOL
    if (activeTool === 'connector') {
      setIsDrawing(true);
      const snap = findNearestAnchor(pos);
      const startPos = snap ? snap.point : pos;
      setConnectorStart({ point: startPos, boundTo: snap ? { pathId: snap.pathId, anchorId: snap.anchorId } : null });
      setRawPencilPoints([startPos, pos]);
      return;
    }

    // 3. PEN / CURVE TOOL
    if (activeTool === 'pen' || activeTool === 'curve') {
      // Check if clicked near start point to close curve
      if (penAnchors.length >= 2 && distance(pos, penAnchors[0].point) < 14) {
        finishPenPath(true);
        return;
      }

      setIsDrawing(true);
      setIsDraggingPenHandle(true);

      const newAnchor: AnchorPoint = {
        id: uid('anchor'),
        point: pos,
        handleIn: null,
        handleOut: null,
        isCorner: false
      };

      setPenAnchors(prev => [...prev, newAnchor]);
      return;
    }

    // 4. ADD ANCHOR TOOL
    if (activeTool === 'add-anchor') {
      handleAddAnchorPoint(pos);
      return;
    }

    // Deselect if clicking on empty canvas in selection mode
    if ((activeTool === 'select' || activeTool === 'direct-select') && !dragTarget) {
      setSelectedAnchorIndex(null);
    }
  };

  // MOUSE MOVE HANDLER
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (isPanning && panStart) {
      const dx = e.clientX - panStart.x;
      const dy = e.clientY - panStart.y;
      setPan(prev => ({ x: prev.x + dx, y: prev.y + dy }));
      setPanStart({ x: e.clientX, y: e.clientY });
      return;
    }

    const excludePathId = dragTarget?.type === 'anchor' && selectedPathId ? selectedPathId : undefined;
    const pos = getCanvasCoords(e, true, excludePathId);
    setCurrentCursorPos(pos);

    // Pencil drawing
    if (isDrawing && (activeTool === 'pencil' || activeTool === 'freehand')) {
      setRawPencilPoints(prev => {
        const last = prev[prev.length - 1];
        if (!last || distance(last, pos) > 3) {
          return [...prev, pos];
        }
        return prev;
      });
      return;
    }

    // Line drawing
    if (isDrawing && activeTool === 'line') {
      setRawPencilPoints(prev => [prev[0], pos]);
      return;
    }

    // Connector drawing
    if (isDrawing && activeTool === 'connector') {
      const snap = findNearestAnchor(pos);
      const endPos = snap ? snap.point : pos;
      setRawPencilPoints(prev => [prev[0], endPos]);
      return;
    }

    // Pen tool dragging handle outward
    if (isDrawing && (activeTool === 'pen' || activeTool === 'curve') && isDraggingPenHandle) {
      setPenAnchors(prev => {
        if (prev.length === 0) return prev;
        const updated = [...prev];
        const lastIndex = updated.length - 1;
        const last = updated[lastIndex];
        const dx = pos.x - last.point.x;
        const dy = pos.y - last.point.y;

        updated[lastIndex] = {
          ...last,
          handleOut: { x: last.point.x + dx, y: last.point.y + dy },
          handleIn: { x: last.point.x - dx, y: last.point.y - dy }
        };
        return updated;
      });
      return;
    }

    // Direct Selection / Dragging Anchor or Handles or Whole Path
    if (dragTarget && selectedPathId && selectedPath) {
      if (dragTarget.type === 'wholePath' && dragStartPoint) {
        const posNoSnap = getCanvasCoords(e, false);
        const dx = posNoSnap.x - dragStartPoint.x;
        const dy = posNoSnap.y - dragStartPoint.y;
        
        if (dx !== 0 || dy !== 0) {
          const updated = selectedPath.anchors.map(anchor => ({
            ...anchor,
            point: { x: anchor.point.x + dx, y: anchor.point.y + dy },
            handleIn: anchor.handleIn ? { x: anchor.handleIn.x + dx, y: anchor.handleIn.y + dy } : null,
            handleOut: anchor.handleOut ? { x: anchor.handleOut.x + dx, y: anchor.handleOut.y + dy } : null
          }));

          onUpdatePath(selectedPathId, { anchors: updated });
          setDragStartPoint(posNoSnap);
        }
        return;
      }

      const updated = [...selectedPath.anchors];
      const anchor = updated[dragTarget.index];
      if (!anchor) return;

      if (dragTarget.type === 'anchor') {
        // Move anchor position and translate both handles with it
        const dx = pos.x - anchor.point.x;
        const dy = pos.y - anchor.point.y;

        updated[dragTarget.index] = {
          ...anchor,
          point: pos,
          handleIn: anchor.handleIn ? { x: anchor.handleIn.x + dx, y: anchor.handleIn.y + dy } : null,
          handleOut: anchor.handleOut ? { x: anchor.handleOut.x + dx, y: anchor.handleOut.y + dy } : null
        };
      } else if (dragTarget.type === 'handleIn') {
        const handleIn = { x: pos.x, y: pos.y };
        let handleOut = anchor.handleOut;

        // If not corner, mirror angle to handleOut (Illustrator smooth point behavior)
        if (!anchor.isCorner && handleOut) {
          const dx = pos.x - anchor.point.x;
          const dy = pos.y - anchor.point.y;
          const lenOut = distance(anchor.point, handleOut);
          const lenIn = Math.hypot(dx, dy);
          if (lenIn > 0) {
            const scale = lenOut / lenIn;
            handleOut = { x: anchor.point.x - dx * scale, y: anchor.point.y - dy * scale };
          }
        }

        updated[dragTarget.index] = { ...anchor, handleIn, handleOut };
      } else if (dragTarget.type === 'handleOut') {
        const handleOut = { x: pos.x, y: pos.y };
        let handleIn = anchor.handleIn;

        if (!anchor.isCorner && handleIn) {
          const dx = pos.x - anchor.point.x;
          const dy = pos.y - anchor.point.y;
          const lenIn = distance(anchor.point, handleIn);
          const lenOut = Math.hypot(dx, dy);
          if (lenOut > 0) {
            const scale = lenIn / lenOut;
            handleIn = { x: anchor.point.x - dx * scale, y: anchor.point.y - dy * scale };
          }
        }

        updated[dragTarget.index] = { ...anchor, handleIn, handleOut };
      }

      onUpdatePath(selectedPathId, { anchors: updated });
    }
  };

  // MOUSE UP HANDLER
  const handleMouseUp = () => {
    if (isPanning) {
      setIsPanning(false);
      setPanStart(null);
      return;
    }

    let committed = false;
    if (dragTarget) {
      if (dragTarget.type === 'anchor' && selectedPathId && selectedPath) {
        // Evaluate stickiness
        const snap = currentCursorPos ? findNearestAnchor(currentCursorPos, selectedPathId) : null;
        const updated = [...selectedPath.anchors];
        const anc = updated[dragTarget.index];
        if (snap) {
          updated[dragTarget.index] = { ...anc, point: snap.point, boundTo: { pathId: snap.pathId, anchorId: snap.anchorId } };
        } else {
          updated[dragTarget.index] = { ...anc, boundTo: null };
        }
        onUpdatePath(selectedPathId, { anchors: updated });
      }

      setDragTarget(null);
      setDragStartPoint(null);
      onCommitHistory?.();
      committed = true;
    }

    if (isDraggingPenHandle) {
      setIsDraggingPenHandle(false);
    }

    // Complete pencil freehand stroke
    if (isDrawing && (activeTool === 'pencil' || activeTool === 'freehand')) {
      setIsDrawing(false);
      if (rawPencilPoints.length < 2) {
        setRawPencilPoints([]);
        return;
      }

      // Fit silky-smooth cubic Bezier anchors using Catmull-Rom & Douglas-Peucker!
      const smoothAnchors = fitSmoothBezierAnchors(rawPencilPoints, settings.pencilSmoothness || 6);

      const newPathId = `path-${Date.now()}`;
      const newPath: DrawingPath = {
        id: newPathId,
        name: `Smooth Stroke ${paths.length + 1}`,
        anchors: smoothAnchors,
        closed: false,
        pathType: 'pencil',
        strokeWidth: 4,
        color: '#00F2FF',
        gradientId: 'cyberpunk',
        dashPreset: 'neon',
        customDashLength: 24,
        customGapLength: 12,
        flowSpeed: 1.5,
        flowDirection: 'forward',
        showGlow: false,
        opacity: 1,
        enabled: true
      };

      onAddPath(newPath);
      onSelectPath(newPathId);
      setRawPencilPoints([]);
      setActiveTool('direct-select');
      return;
    }

    // Complete connector stroke
    if (isDrawing && activeTool === 'connector') {
      setIsDrawing(false);
      if (rawPencilPoints.length === 2 && connectorStart) {
        const snap = currentCursorPos ? findNearestAnchor(currentCursorPos) : null;
        const endPos = snap ? snap.point : rawPencilPoints[1];

        const newPathId = `connector-${Date.now()}`;
        const newPath: DrawingPath = {
          id: newPathId,
          name: `Connector ${paths.length + 1}`,
          anchors: [
            { id: uid('anchor'), point: connectorStart.point, handleIn: null, handleOut: null, isCorner: true, boundTo: connectorStart.boundTo },
            { id: uid('anchor'), point: endPos, handleIn: null, handleOut: null, isCorner: true, boundTo: snap ? { pathId: snap.pathId, anchorId: snap.anchorId } : null }
          ],
          closed: false,
          pathType: 'connector',
          routing: 'elbow',
          strokeWidth: 4,
          color: '#6366f1',
          gradientId: 'cyberpunk',
          dashPreset: 'solid',
          customDashLength: 0,
          customGapLength: 0,
          flowSpeed: 1,
          flowDirection: 'forward',
          showGlow: false,
          opacity: 1,
          enabled: true
        };

        onAddPath(newPath);
        onSelectPath(newPathId);
      }
      setConnectorStart(null);
      setRawPencilPoints([]);
      setActiveTool('direct-select');
      return;
    }

    // Complete line stroke
    if (isDrawing && activeTool === 'line') {
      setIsDrawing(false);
      if (rawPencilPoints.length === 2) {
        const newPathId = `path-${Date.now()}`;
        const newPath: DrawingPath = {
          id: newPathId,
          name: `Straight Line ${paths.length + 1}`,
          anchors: [
            { id: uid('anchor'), point: rawPencilPoints[0], handleIn: null, handleOut: null, isCorner: true },
            { id: uid('anchor'), point: rawPencilPoints[1], handleIn: null, handleOut: null, isCorner: true }
          ],
          closed: false,
          pathType: 'line',
          strokeWidth: 4,
          color: '#00F2FF',
          gradientId: 'cyberpunk',
          dashPreset: 'neon',
          customDashLength: 24,
          customGapLength: 12,
          flowSpeed: 1.5,
          flowDirection: 'forward',
          showGlow: false,
          opacity: 1,
          enabled: true
        };

        onAddPath(newPath);
        onSelectPath(newPathId);
        setRawPencilPoints([]);
        setActiveTool('direct-select');
      }
    }
  };

  const getDashArray = (path: DrawingPath): string => {
    const preset = DASH_PRESETS.find(p => p.id === path.dashPreset);
    if (!preset || preset.id === 'solid') return 'none';
    if (preset.id === 'custom') {
      if (path.customDashArray !== undefined) {
        return path.customDashArray;
      }
      if (path.customDash2 && path.customGap2) {
        return `${path.customDashLength || 20}, ${path.customGapLength || 10}, ${path.customDash2}, ${path.customGap2}`;
      }
      return `${path.customDashLength || 20}, ${path.customGapLength || 10}`;
    }
    return preset.array;
  };

  // Preview path string for pen tool rubber-banding
  const getPenPreviewPath = (): string => {
    if (penAnchors.length === 0) return '';
    let d = anchorsToPathString(penAnchors, false);
    if (currentCursorPos && !isDraggingPenHandle) {
      const last = penAnchors[penAnchors.length - 1];
      const cp1 = last.handleOut || last.point;
      d += ` C ${cp1.x} ${cp1.y}, ${currentCursorPos.x} ${currentCursorPos.y}, ${currentCursorPos.x} ${currentCursorPos.y}`;
    }
    return d;
  };

  return (
    <div className="relative flex-1 bg-[var(--color-canvas)] overflow-hidden flex flex-col select-none">
      {/* Floating Illustrator-Style Toolbox */}
      <div className="absolute top-4 left-4 z-30 flex items-center gap-1.5 p-1.5 bg-[var(--color-paper)]/90 backdrop-blur-md border border-[var(--color-hairline)] rounded-[24px] shadow-2xl">
        {/* Direct Selection / Anchor Edit Tool (A) */}
        <button
          onClick={() => setActiveTool('direct-select')}
          className={`p-2 rounded-[24px] transition-all ${
            activeTool === 'direct-select'
              ? 'bg-[var(--color-canvas)] text-[var(--color-ink)] border border-[var(--color-ink)] [box-shadow:var(--shadow-subtle)] ' 
              : 'text-[var(--color-mid-gray)] hover:text-[var(--color-ink)] hover:bg-[var(--color-surface-alt)]'
          }`}
          title="Direct Selection / Anchor Point Editor (A)"
        >
          <MousePointer className="w-4 h-4" />
        </button>

        {/* Pen / Bezier Curve Tool (P) */}
        <button
          onClick={() => {
            setActiveTool('pen');
            setPenAnchors([]);
          }}
          className={`p-2 rounded-[24px] transition-all ${
            activeTool === 'pen' || activeTool === 'curve'
              ? 'bg-[var(--color-canvas)] text-[var(--color-ink)] border border-[var(--color-ink)] [box-shadow:var(--shadow-subtle)] ' 
              : 'text-[var(--color-mid-gray)] hover:text-[var(--color-ink)] hover:bg-[var(--color-surface-alt)]'
          }`}
          title="Pen / Bezier Curve Tool (P) - Click & Drag for Handles"
        >
          <PenTool className="w-4 h-4" />
        </button>

        {/* Smooth Pencil (N) */}
        <button
          onClick={() => setActiveTool('pencil')}
          className={`p-2 rounded-[24px] transition-all ${
            activeTool === 'pencil' || activeTool === 'freehand'
              ? 'bg-[var(--color-canvas)] text-[var(--color-ink)] border border-[var(--color-ink)] [box-shadow:var(--shadow-subtle)] ' 
              : 'text-[var(--color-mid-gray)] hover:text-[var(--color-ink)] hover:bg-[var(--color-surface-alt)]'
          }`}
          title="Smooth Pencil (N) - Auto-smoothed curves"
        >
          <Pencil className="w-4 h-4" />
        </button>

        {/* Line Tool (L) */}
        <button
          onClick={() => setActiveTool('line')}
          className={`p-2 rounded-[24px] transition-all ${
            activeTool === 'line'
              ? 'bg-[var(--color-canvas)] text-[var(--color-ink)] border border-[var(--color-ink)] [box-shadow:var(--shadow-subtle)] ' 
              : 'text-[var(--color-mid-gray)] hover:text-[var(--color-ink)] hover:bg-[var(--color-surface-alt)]'
          }`}
          title="Straight Line (L)"
        >
          <Minus className="w-4 h-4" />
        </button>

        {/* Connector Tool (C) */}
        <button
          onClick={() => setActiveTool('connector')}
          className={`p-2 rounded-[24px] transition-all ${
            activeTool === 'connector'
              ? 'bg-[var(--color-canvas)] text-[var(--color-ink)] border border-[var(--color-ink)] [box-shadow:var(--shadow-subtle)] ' 
              : 'text-[var(--color-mid-gray)] hover:text-[var(--color-ink)] hover:bg-[var(--color-surface-alt)]'
          }`}
          title="Flowchart Connector (C) - Snap to anchors"
        >
          <GitMerge className="w-4 h-4" />
        </button>

        <div className="w-[1px] h-6 bg-[var(--color-hairline)] mx-1" />

        {/* Add Anchor Point Tool */}
        <button
          onClick={() => setActiveTool('add-anchor')}
          className={`p-2 rounded-[24px] transition-all ${
            activeTool === 'add-anchor'
              ? 'bg-[var(--color-canvas)] text-[var(--color-ink)] border border-[var(--color-ink)]'
              : 'text-[var(--color-mid-gray)] hover:text-[var(--color-ink)] hover:bg-[var(--color-surface-alt)]'
          }`}
          title="Add Anchor Point to Curve (+)"
        >
          <PlusCircle className="w-4 h-4" />
        </button>

        {/* Clear Paths */}
        <button
          onClick={onClearPaths}
          className="p-2 rounded-[24px] text-[var(--color-mid-gray)] hover:text-red-400 hover:bg-red-500/10 transition-all"
          title="Clear Artboard"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Floating Active Pen Control Bar (When creating a curve with Pen Tool) */}
      {penAnchors.length > 0 && (
        <div className="absolute top-20 left-4 z-30 flex items-center gap-2 p-2 bg-[var(--color-surface-alt)]/90 backdrop-blur-md border border-[var(--color-ink)] rounded-[24px] [box-shadow:var(--shadow-subtle)] animate-fade-in">
          <div className="text-xs font-mono text-[var(--color-ink)] font-semibold px-2">
            Pen Active: {penAnchors.length} Anchors
          </div>
          <button
            onClick={() => finishPenPath(false)}
            className="px-3 py-1.5 rounded-[18px] bg-[var(--color-ink)] text-slate-100 text-xs font-bold hover:bg-white transition-all flex items-center gap-1.5"
          >
            <Check className="w-3.5 h-3.5" />
            Finish Path
          </button>
          <button
            onClick={() => finishPenPath(true)}
            className="px-3 py-1.5 rounded-[18px] bg-teal-200 text-[var(--color-ink)] text-xs font-bold hover:bg-teal-500 transition-all flex items-center gap-1.5"
          >
            Close Loop
          </button>
          <button
            onClick={() => setPenAnchors([])}
            className="p-1.5 rounded-[18px] text-[var(--color-mid-gray)] hover:text-red-400 hover:bg-red-500/10 transition-all"
            title="Cancel"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Floating Selected Anchor Point Inspector (Illustrator Style) */}
      {selectedPath && selectedAnchorIndex !== null && selectedPath.anchors[selectedAnchorIndex] && (
        <div className="absolute top-4 right-4 z-30 flex items-center gap-2 p-2 bg-zinc-950/90 backdrop-blur-md border border-white/15 rounded-[24px] shadow-2xl">
          <div className="px-2.5 text-[11px] font-mono text-[var(--color-mid-gray)]">
            Anchor #{selectedAnchorIndex + 1} ({Math.round(selectedPath.anchors[selectedAnchorIndex].point.x)}, {Math.round(selectedPath.anchors[selectedAnchorIndex].point.y)})
          </div>
          
          <button
            onClick={handleToggleAnchorSmooth}
            className={`px-3 py-1.5 rounded-[24px] text-xs font-medium border transition-all flex items-center gap-1.5 ${
              !selectedPath.anchors[selectedAnchorIndex].isCorner
                ? 'bg-[var(--color-canvas)] border-[var(--color-ink)] text-[var(--color-ink)]'
                : 'bg-[var(--color-surface-alt)] border-[var(--color-hairline)] text-[var(--color-mid-gray)] hover:text-[var(--color-ink)]'
            }`}
            title="Toggle Smooth Tangent / Sharp Corner"
          >
            <CornerUpRight className="w-3.5 h-3.5" />
            <span>{!selectedPath.anchors[selectedAnchorIndex].isCorner ? 'Smooth Curve' : 'Corner Point'}</span>
          </button>

          <button
            onClick={handleDeleteSelectedAnchor}
            className="p-2 rounded-[24px] bg-[var(--color-surface-alt)] border border-[var(--color-hairline)] text-[var(--color-mid-gray)] hover:text-red-400 hover:bg-red-500/10 transition-all"
            title="Delete this anchor point (Del/Backspace)"
          >
            <MinusCircle className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Primary SVG Artboard Canvas */}
      <svg
        id="artboard-svg"
        ref={svgRef}
        className={`w-full h-full ${
          activeTool === 'pen' 
            ? 'cursor-crosshair' 
            : activeTool === 'pencil' 
            ? 'cursor-crosshair' 
            : activeTool === 'direct-select' 
            ? 'cursor-default' 
            : 'cursor-pointer'
        }`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <defs>
          {GRADIENT_PRESETS.map(grad => (
            <linearGradient key={grad.id} id={`grad-${grad.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
              {grad.stops.map((stop, idx) => (
                <stop key={idx} offset={stop.offset} stopColor={stop.color} />
              ))}
            </linearGradient>
          ))}

          <filter id="neon-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="8" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Background Grid */}
        {settings.showGrid && (
          <g className="opacity-25 pointer-events-none">
            <defs>
              <pattern id="grid" x={pan.x} y={pan.y} width={settings.gridSize || 40} height={settings.gridSize || 40} patternUnits="userSpaceOnUse">
                <path d={`M ${settings.gridSize || 40} 0 L 0 0 0 ${settings.gridSize || 40}`} fill="none" stroke="var(--color-ink)" opacity="0.1" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </g>
        )}

        <g transform={`translate(${pan.x}, ${pan.y})`}>
          {/* Render Saved Vector Paths */}
          {paths.map(path => {
            if (!path.enabled) return null;
            if (path.type === 'image') {
              const isSelected = selectedPathId === path.id;
              return (
                <g
                  key={path.id}
                  onMouseDown={(e) => {
                    if (e.button === 1 || (e.button === 0 && e.altKey)) return;
                    e.stopPropagation();
                    onSelectPath(path.id);
                    
                    if (activeTool === 'select') {
                      setDragTarget({ type: 'wholePath' });
                      setDragStartPoint(getCanvasCoords(e, false));
                    }
                  }}
                  className="cursor-pointer"
                  transform={`translate(${path.x || 0}, ${path.y || 0})`}
                >
                  <image 
                    href={path.imageUrl} 
                    width={path.imageWidth || 100} 
                    height={path.imageHeight || 100} 
                    opacity={path.opacity ?? 1}
                  />
                  {isSelected && (
                    <rect 
                      width={path.imageWidth || 100} 
                      height={path.imageHeight || 100} 
                      fill="none" 
                      stroke="#00F2FF" 
                      strokeWidth={1 / zoom} 
                    />
                  )}
                </g>
              );
            }

            if (!path.anchors || path.anchors.length === 0) return null;
            const d = anchorsToPathString(path.anchors, path.closed, path.cornerRadius || 0, path.routing);
            const dashArray = getDashArray(path);
            const offset = dashOffsets[path.id] || 0;
            const strokePaint = path.gradientId ? `url(#grad-${path.gradientId})` : path.color;
            const isSelected = selectedPathId === path.id;

            return (
              <g
                key={path.id}
                onMouseDown={(e) => {
                  if (e.button === 1 || (e.button === 0 && e.altKey)) return;
                  e.stopPropagation();
                  onSelectPath(path.id);
                  
                  if (activeTool === 'select' || activeTool === 'direct-select') {
                    setDragTarget({ type: 'wholePath' });
                    setDragStartPoint(getCanvasCoords(e, false));
                  }
                }}
                className="cursor-pointer"
              >
              {/* Glow bloom layer */}
              {path.showGlow && (
                <path
                  d={d}
                  fill="none"
                  stroke={strokePaint}
                  strokeWidth={path.strokeWidth * 2.2}
                  strokeLinecap={path.lineCap || 'round'}
                  strokeLinejoin={path.lineJoin || 'round'}
                  strokeDasharray={dashArray}
                  strokeDashoffset={offset}
                  opacity={path.opacity * 0.45}
                  filter="url(#neon-glow)"
                />
              )}

              {/* Main vector stroke */}
              <path
                id={`${path.id}-stroke`}
                d={d}
                fill="none"
                stroke={strokePaint}
                strokeWidth={path.strokeWidth}
                strokeLinecap={path.lineCap || 'round'}
                strokeLinejoin={path.lineJoin || 'round'}
                strokeDasharray={dashArray}
                strokeDashoffset={offset}
                opacity={path.opacity}
              />

              {/* Label */}
              {path.label && (
                <text 
                  fill="var(--color-ink)" 
                  className="font-bold text-[12px] tracking-wide"
                  style={{ paintOrder: 'stroke fill', stroke: 'var(--color-paper)', strokeWidth: '4px', strokeLinecap: 'round', strokeLinejoin: 'round' }}
                >
                  <textPath href={`#${path.id}-stroke`} startOffset="50%" textAnchor="middle" dominantBaseline="middle">
                    {path.label}
                  </textPath>
                </text>
              )}

              {/* Selection Halo */}
              {isSelected && (
                <path
                  d={d}
                  fill="none"
                  stroke="var(--color-ink)"
                  strokeWidth={1.5}
                  strokeLinecap={path.lineCap || 'round'}
                  strokeLinejoin={path.lineJoin || 'round'}
                  strokeDasharray="4,4"
                  opacity={0.7}
                />
              )}
            </g>
          );
        })}

        {/* Illustrator-Style Interactive Anchor Points & Tangent Handles */}
        {selectedPath && selectedPath.enabled && (
          <g className="illustrator-handles pointer-events-auto">
            {selectedPath.anchors.map((anchor, idx) => {
              const isAnchorSelected = selectedAnchorIndex === idx;

              return (
                <g key={`anchor-group-${anchor.id || idx}`}>
                  {/* Tangent Handle Lines & Grips (Shown for selected anchor or when direct-select active) */}
                  {(isAnchorSelected || activeTool === 'direct-select') && (
                    <>
                      {/* Incoming Handle Line */}
                      {anchor.handleIn && (
                        <>
                          <line
                            x1={anchor.point.x}
                            y1={anchor.point.y}
                            x2={anchor.handleIn.x}
                            y2={anchor.handleIn.y}
                            stroke="var(--color-ink)"
                            strokeWidth={1.5}
                            strokeDasharray="2,2"
                            opacity={0.8}
                          />
                          <circle
                            cx={anchor.handleIn.x}
                            cy={anchor.handleIn.y}
                            r={5}
                            fill="var(--color-ink)"
                            stroke="var(--color-canvas)"
                            strokeWidth={1.5}
                            className="cursor-pointer hover:scale-150 transition-transform"
                            style={{ transformOrigin: `${anchor.handleIn.x}px ${anchor.handleIn.y}px` }}
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              setSelectedAnchorIndex(idx);
                              setDragTarget({ type: 'handleIn', index: idx });
                            }}
                          />
                        </>
                      )}

                      {/* Outgoing Handle Line */}
                      {anchor.handleOut && (
                        <>
                          <line
                            x1={anchor.point.x}
                            y1={anchor.point.y}
                            x2={anchor.handleOut.x}
                            y2={anchor.handleOut.y}
                            stroke="var(--color-ink)"
                            strokeWidth={1.5}
                            strokeDasharray="2,2"
                            opacity={0.8}
                          />
                          <circle
                            cx={anchor.handleOut.x}
                            cy={anchor.handleOut.y}
                            r={5}
                            fill="var(--color-ink)"
                            stroke="var(--color-canvas)"
                            strokeWidth={1.5}
                            className="cursor-pointer hover:scale-150 transition-transform"
                            style={{ transformOrigin: `${anchor.handleOut.x}px ${anchor.handleOut.y}px` }}
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              setSelectedAnchorIndex(idx);
                              setDragTarget({ type: 'handleOut', index: idx });
                            }}
                          />
                        </>
                      )}
                    </>
                  )}

                  {/* Anchor Point Square Box (Illustrator Node Style) */}
                  <rect
                    x={anchor.point.x - 5}
                    y={anchor.point.y - 5}
                    width={10}
                    height={10}
                    fill={isAnchorSelected ? '#00F2FF' : '#FFFFFF'}
                    stroke="#000000"
                    strokeWidth={2}
                    className="cursor-move hover:scale-125 transition-transform"
                    style={{ transformOrigin: `${anchor.point.x}px ${anchor.point.y}px` }}
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      setSelectedAnchorIndex(idx);
                      setDragTarget({ type: 'anchor', index: idx });
                    }}
                  />
                </g>
              );
            })}
          </g>
        )}

        {/* Live Pen Tool Construction Path Preview */}
        {penAnchors.length > 0 && (
          <g>
            <path
              d={getPenPreviewPath()}
              fill="none"
              stroke="var(--color-ink)"
              strokeWidth={3}
              strokeDasharray="6,4"
              className="animate-pulse"
            />
            {penAnchors.map((anc, idx) => (
              <g key={`pen-node-${idx}`}>
                <rect
                  x={anc.point.x - 5}
                  y={anc.point.y - 5}
                  width={10}
                  height={10}
                  fill="var(--color-ink)"
                  stroke="var(--color-canvas)"
                  strokeWidth={2}
                />
                {anc.handleOut && (
                  <circle
                    cx={anc.handleOut.x}
                    cy={anc.handleOut.y}
                    r={4}
                    fill="#FF007F"
                    stroke="var(--color-canvas)"
                  />
                )}
              </g>
            ))}
          </g>
        )}

          {/* Live Pencil / Freehand / Line / Connector Stroke Preview */}
          {isDrawing && (activeTool === 'pencil' || activeTool === 'freehand' || activeTool === 'line' || activeTool === 'connector') && rawPencilPoints.length > 1 && (
            <path
              d={
                activeTool === 'line' 
                  ? `M ${rawPencilPoints[0].x} ${rawPencilPoints[0].y} L ${rawPencilPoints[1].x} ${rawPencilPoints[1].y}`
                  : activeTool === 'connector'
                  ? anchorsToPathString([
                      { id: '1', point: rawPencilPoints[0] },
                      { id: '2', point: rawPencilPoints[1] }
                    ], false, 0, 'elbow')
                  : anchorsToPathString(fitSmoothBezierAnchors(rawPencilPoints, settings.pencilSmoothness || 6))
              }
              fill="none"
              stroke="var(--color-ink)"
              strokeWidth={3.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="8,4"
              className="animate-pulse"
            />
          )}
        </g>
      </svg>

      {/* Artboard Status / Hotkey Footer */}
      <div className="absolute bottom-4 left-4 right-4 pointer-events-none flex justify-between items-center text-[10px] uppercase tracking-widest text-[var(--color-mid-gray)] font-mono">
        <div className="bg-[var(--color-paper)]/90 backdrop-blur-md px-3 py-1.5 rounded-[18px] border border-[var(--color-hairline)] pointer-events-auto flex items-center gap-2 [box-shadow:var(--shadow-subtle)]">
          <span>Active Tool:</span>
          <span className="text-[var(--color-ink)] font-bold">{activeTool}</span>
          <span className="text-[var(--color-mid-gray)]">•</span>
          <span>{paths.length} Layers</span>
          {selectedPath && <span className="text-[var(--color-mid-gray)]">({selectedPath.name} • {selectedPath.anchors.length} Anchors)</span>}
        </div>
        <div className="bg-[var(--color-paper)]/90 backdrop-blur-md px-3 py-1.5 rounded-[18px] border border-[var(--color-hairline)] pointer-events-auto hidden md:flex items-center gap-3 text-[var(--color-mid-gray)] [box-shadow:var(--shadow-subtle)]">
          <span><kbd className="text-[var(--color-ink)] bg-[var(--color-surface-alt)] px-1 py-0.5 rounded border border-[var(--color-hairline)]">A</kbd> Direct Select</span>
          <span><kbd className="text-[var(--color-ink)] bg-[var(--color-surface-alt)] px-1 py-0.5 rounded border border-[var(--color-hairline)]">P</kbd> Pen Tool</span>
          <span><kbd className="text-[var(--color-ink)] bg-[var(--color-surface-alt)] px-1 py-0.5 rounded border border-[var(--color-hairline)]">N</kbd> Smooth Pencil</span>
          <span><kbd className="text-[var(--color-ink)] bg-[var(--color-surface-alt)] px-1 py-0.5 rounded border border-[var(--color-hairline)]">C</kbd> Connector</span>
          <span><kbd className="text-[var(--color-ink)] bg-[var(--color-surface-alt)] px-1 py-0.5 rounded border border-[var(--color-hairline)]">Del</kbd> Remove Anchor</span>
        </div>
      </div>
    </div>
  );
};
