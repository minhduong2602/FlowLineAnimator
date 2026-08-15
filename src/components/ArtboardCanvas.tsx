import React, { useState, useRef, useEffect } from 'react';
import { DrawingPath, DrawTool, Point, AnchorPoint, ArtboardSettings, CapType } from '../types';
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

// ─── Arrow Flow Overlay ────────────────────────────────────────────────────
// Renders animated chevron arrows flowing along a referenced SVG path element.
const ArrowFlowOverlay: React.FC<{
  pathId: string;
  color: string;
  arrowSize: number;
  spacing: number;
  speed: number;
  reverse: boolean;
}> = ({ pathId, color, arrowSize, speed, reverse }) => {
  const arrowCount = 8;
  const duration = Math.max(0.3, 20 / speed);

  return (
    <g className="pointer-events-none">
      {Array.from({ length: arrowCount }).map((_, i) => {
        const half = arrowSize / 2;
        // The chevron points to the right (+x axis)
        const pts = `0,${half * 0.2} ${arrowSize},${half} 0,${half * 1.8}`;

        return (
          <polyline
            key={i}
            points={pts}
            fill="none"
            stroke={color}
            strokeWidth={Math.max(1, arrowSize * 0.18)}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={0.85}
          >
            <animateMotion
              dur={`${duration}s`}
              begin={`-${(i / arrowCount) * duration}s`}
              repeatCount="indefinite"
              rotate="auto"
              keyPoints={reverse ? "1;0" : "0;1"}
              keyTimes="0;1"
              calcMode="linear"
            >
              <mpath href={`#${pathId}`} />
            </animateMotion>
          </polyline>
        );
      })}
    </g>
  );
};

// ─── Object Along Path ─────────────────────────────────────────────────────
// Renders a clone of the motion object traveling along a path.
const MotionObjectOverlay: React.FC<{
  pathId: string;
  motionPath: DrawingPath;
  speed: number;
}> = ({ pathId, motionPath, speed }) => {
  const duration = Math.max(0.5, 20 / speed);
  const w = motionPath.imageWidth || 40;
  const h = motionPath.imageHeight || 40;

  return (
    <g className="pointer-events-none">
      {motionPath.type === 'image' && motionPath.imageUrl ? (
        <image
          href={motionPath.imageUrl}
          width={w}
          height={h}
          x={-w / 2}
          y={-h / 2}
          opacity={motionPath.opacity ?? 1}
        >
          <animateMotion
            dur={`${duration}s`}
            repeatCount="indefinite"
            rotate="auto"
          >
            <mpath href={`#${pathId}`} />
          </animateMotion>
        </image>
      ) : (
        <g opacity={motionPath.opacity ?? 1}>
          <animateMotion
            dur={`${duration}s`}
            repeatCount="indefinite"
            rotate="auto"
          >
            <mpath href={`#${pathId}`} />
          </animateMotion>
          {/* We reference the actual vector stroke. We need to center it if possible, but use href will just draw it. 
              The original path is drawn at its own coordinates. We can offset it to center it on the motion path origin.
              Actually, if we just <use>, the coordinates might be offset.
              For now, <use href={`#${motionPath.id}-stroke`} /> will draw the vector path.
          */}
          <use href={`#${motionPath.id}-stroke`} x={-(motionPath.x || 0)} y={-(motionPath.y || 0)} />
        </g>
      )}
    </g>
  );
};

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
  onUpdateSettings: (settings: Partial<ArtboardSettings>) => void;
  isPlaying: boolean;
}

type DragTarget = 
  | { type: 'anchor'; index: number }
  | { type: 'handleIn'; index: number }
  | { type: 'handleOut'; index: number }
  | { type: 'wholePath' }
  | { type: 'resize'; handle: number }
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
  onUpdateSettings,
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
  const [marqueeStart, setMarqueeStart] = useState<Point | null>(null);
  const [marqueeEnd, setMarqueeEnd] = useState<Point | null>(null);

  // Continuous animation flow offsets
  const [dashOffsets, setDashOffsets] = useState<Record<string, number>>({});
  // motionOffsets: normalized [0,1] position along path for object-along-path and arrow flow
  const [motionOffsets, setMotionOffsets] = useState<Record<string, number>>({});
  const animFrameRef = useRef<number | null>(null);

  const [pan, setPan] = useState<Point>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState<Point | null>(null);

  const selectedPath = paths.find(p => p.id === selectedPathId);

  // Zoom Handler
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const zoomDelta = e.deltaY > 0 ? 0.9 : 1.1;
        onUpdateSettings({ zoom: Math.max(0.1, Math.min(10, (settings.zoom || 1) * zoomDelta)) });
      }
    };
    const svgEl = svgRef.current;
    if (svgEl) {
      svgEl.addEventListener('wheel', handleWheel, { passive: false });
      return () => svgEl.removeEventListener('wheel', handleWheel);
    }
  }, [settings.zoom, onUpdateSettings]);

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

      // Update motion offsets (0→1) for object-along-path
      setMotionOffsets(prev => {
        const next = { ...prev };
        paths.forEach(path => {
          if (!path.enabled || !path.motionObjectId) return;
          const current = prev[path.id] || 0;
          const speed = (path.motionSpeed || 1) * (settings.globalSpeed || 1) * 0.05 * dt;
          let newVal = current + speed;
          if (newVal > 1) newVal = path.motionLoop === false ? 0 : newVal - 1;
          next[path.id] = newVal;
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
    const zoom = settings.zoom || 1;
    const rawX = (e.clientX - rect.left - pan.x) / zoom;
    const rawY = (e.clientY - rect.top - pan.y) / zoom;
    
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
      onSelectPath(null);
      setMarqueeStart(pos);
      setMarqueeEnd(pos);
    }

    // Shape drawing
    if (activeTool === 'rect' || activeTool === 'ellipse') {
      setIsDrawing(true);
      setRawPencilPoints([pos]);
      return;
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

    if (marqueeStart) {
      setMarqueeEnd(pos);
      return;
    }

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

    // Shape drawing
    if (isDrawing && (activeTool === 'rect' || activeTool === 'ellipse')) {
      setRawPencilPoints(prev => [prev[0], pos]);
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
          if (selectedPath.type === 'image') {
            onUpdatePath(selectedPathId, {
              x: (selectedPath.x || 0) + dx,
              y: (selectedPath.y || 0) + dy
            });
          } else {
            const updated = selectedPath.anchors.map(anchor => ({
              ...anchor,
              point: { x: anchor.point.x + dx, y: anchor.point.y + dy },
              handleIn: anchor.handleIn ? { x: anchor.handleIn.x + dx, y: anchor.handleIn.y + dy } : null,
              handleOut: anchor.handleOut ? { x: anchor.handleOut.x + dx, y: anchor.handleOut.y + dy } : null
            }));

            onUpdatePath(selectedPathId, { anchors: updated });
          }
          setDragStartPoint(posNoSnap);
        }
        return;
      }

      if (dragTarget.type === 'resize' && dragStartPoint) {
        const posNoSnap = getCanvasCoords(e, false);
        const dx = posNoSnap.x - dragStartPoint.x;
        const dy = posNoSnap.y - dragStartPoint.y;

        if (dx !== 0 || dy !== 0) {
          if (selectedPath.type === 'image') {
            const minX = 0;
            const minY = 0;
            const maxX = selectedPath.imageWidth || 100;
            const maxY = selectedPath.imageHeight || 100;

            const oldW = maxX - minX;
            const oldH = maxY - minY;
            
            let newMinX = minX;
            let newMinY = minY;
            let newMaxX = maxX;
            let newMaxY = maxY;

            const h = dragTarget.handle;
            if (h === 0 || h === 3 || h === 5) newMinX += dx;
            if (h === 2 || h === 4 || h === 7) newMaxX += dx;
            if (h === 0 || h === 1 || h === 2) newMinY += dy;
            if (h === 5 || h === 6 || h === 7) newMaxY += dy;

            if (newMaxX - newMinX < 1) newMaxX = newMinX + 1;
            if (newMaxY - newMinY < 1) newMaxY = newMinY + 1;

            const newW = newMaxX - newMinX;
            const newH = newMaxY - newMinY;

            // If we resized from the left or top, we need to move the origin
            const transX = newMinX - minX;
            const transY = newMinY - minY;

            onUpdatePath(selectedPathId, {
              imageWidth: newW,
              imageHeight: newH,
              x: (selectedPath.x || 0) + transX,
              y: (selectedPath.y || 0) + transY,
            });
          } else {
            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
            selectedPath.anchors.forEach(a => {
              const pts = [a.point];
              if (a.handleIn) pts.push(a.handleIn);
              if (a.handleOut) pts.push(a.handleOut);
              pts.forEach(p => {
                if (p.x < minX) minX = p.x;
                if (p.y < minY) minY = p.y;
                if (p.x > maxX) maxX = p.x;
                if (p.y > maxY) maxY = p.y;
              });
            });

            if (minX !== Infinity) {
              const oldW = maxX - minX;
              const oldH = maxY - minY;
              
              let newMinX = minX;
              let newMinY = minY;
              let newMaxX = maxX;
              let newMaxY = maxY;

              // Handle index maps to bounding box corners:
              // 0: TL, 1: TC, 2: TR
              // 3: ML,       4: MR
              // 5: BL, 6: BC, 7: BR
              const h = dragTarget.handle;
              if (h === 0 || h === 3 || h === 5) newMinX += dx;
              if (h === 2 || h === 4 || h === 7) newMaxX += dx;
              if (h === 0 || h === 1 || h === 2) newMinY += dy;
              if (h === 5 || h === 6 || h === 7) newMaxY += dy;

              // Prevent negative width/height inversion for simplicity
              if (newMaxX - newMinX < 1) newMaxX = newMinX + 1;
              if (newMaxY - newMinY < 1) newMaxY = newMinY + 1;

              const newW = newMaxX - newMinX;
              const newH = newMaxY - newMinY;

              const scaleX = newW / oldW;
              const scaleY = newH / oldH;

              const updated = selectedPath.anchors.map(anchor => {
                const scalePoint = (p: Point) => ({
                  x: newMinX + (p.x - minX) * scaleX,
                  y: newMinY + (p.y - minY) * scaleY
                });
                return {
                  ...anchor,
                  point: scalePoint(anchor.point),
                  handleIn: anchor.handleIn ? scalePoint(anchor.handleIn) : null,
                  handleOut: anchor.handleOut ? scalePoint(anchor.handleOut) : null
                };
              });

              onUpdatePath(selectedPathId, { anchors: updated });
            }
          }
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

    if (marqueeStart && marqueeEnd) {
      // Find paths within marquee
      const minX = Math.min(marqueeStart.x, marqueeEnd.x);
      const maxX = Math.max(marqueeStart.x, marqueeEnd.x);
      const minY = Math.min(marqueeStart.y, marqueeEnd.y);
      const maxY = Math.max(marqueeStart.y, marqueeEnd.y);

      const pathsInMarquee = paths.filter(p => {
        if (!p.enabled) return false;
        // Simple bounding box check for now
        let px = minX, py = minY, pw = 0, ph = 0;
        if (p.type === 'image') {
          px = p.x || 0;
          py = p.y || 0;
          pw = p.imageWidth || 0;
          ph = p.imageHeight || 0;
        } else if (p.anchors && p.anchors.length > 0) {
          const xs = p.anchors.map(a => a.point.x);
          const ys = p.anchors.map(a => a.point.y);
          px = Math.min(...xs);
          py = Math.min(...ys);
          pw = Math.max(...xs) - px;
          ph = Math.max(...ys) - py;
        }
        
        return px >= minX && (px + pw) <= maxX && py >= minY && (py + ph) <= maxY;
      });

      // Select first path if only one found, multi-select not supported yet
      if (pathsInMarquee.length === 1) {
        onSelectPath(pathsInMarquee[0].id);
      } else if (pathsInMarquee.length > 0) {
        onSelectPath(pathsInMarquee[0].id);
      }

      setMarqueeStart(null);
      setMarqueeEnd(null);
      return;
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
      return;
    }

    // Complete Rect/Ellipse stroke
    if (isDrawing && (activeTool === 'rect' || activeTool === 'ellipse')) {
      setIsDrawing(false);
      if (rawPencilPoints.length === 2) {
        const [start, end] = rawPencilPoints;
        const minX = Math.min(start.x, end.x);
        const minY = Math.min(start.y, end.y);
        const maxX = Math.max(start.x, end.x);
        const maxY = Math.max(start.y, end.y);
        const width = maxX - minX;
        const height = maxY - minY;

        if (width > 1 || height > 1) {
          const newPathId = `shape-${Date.now()}`;
          let anchors: AnchorPoint[] = [];

          if (activeTool === 'rect') {
            anchors = [
              { id: uid('anchor'), point: { x: minX, y: minY }, isCorner: true },
              { id: uid('anchor'), point: { x: maxX, y: minY }, isCorner: true },
              { id: uid('anchor'), point: { x: maxX, y: maxY }, isCorner: true },
              { id: uid('anchor'), point: { x: minX, y: maxY }, isCorner: true }
            ];
          } else if (activeTool === 'ellipse') {
            const cx = minX + width / 2;
            const cy = minY + height / 2;
            const rx = width / 2;
            const ry = height / 2;
            const kappa = 0.5522848; // Circle to bezier magic number
            const ox = rx * kappa;
            const oy = ry * kappa;

            anchors = [
              { id: uid('anchor'), point: { x: cx, y: minY }, handleIn: { x: cx - ox, y: minY }, handleOut: { x: cx + ox, y: minY }, isCorner: false },
              { id: uid('anchor'), point: { x: maxX, y: cy }, handleIn: { x: maxX, y: cy - oy }, handleOut: { x: maxX, y: cy + oy }, isCorner: false },
              { id: uid('anchor'), point: { x: cx, y: maxY }, handleIn: { x: cx + ox, y: maxY }, handleOut: { x: cx - ox, y: maxY }, isCorner: false },
              { id: uid('anchor'), point: { x: minX, y: cy }, handleIn: { x: minX, y: cy + oy }, handleOut: { x: minX, y: cy - oy }, isCorner: false }
            ];
          }

          const newPath: DrawingPath = {
            id: newPathId,
            name: `${activeTool === 'rect' ? 'Rectangle' : 'Ellipse'} ${paths.length + 1}`,
            anchors,
            closed: true,
            pathType: activeTool,
            strokeWidth: 4,
            color: '#00F2FF',
            gradientId: 'cyberpunk',
            dashPreset: 'solid',
            customDashLength: 0,
            customGapLength: 0,
            flowSpeed: 0,
            flowDirection: 'forward',
            showGlow: false,
            opacity: 1,
            fill: '#ffffff',
            fillOpacity: 0.1,
            enabled: true
          };

          onAddPath(newPath);
          onSelectPath(newPathId);
        }
        setRawPencilPoints([]);
        setActiveTool('direct-select');
      }
      return;
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

        {/* Rect Tool (R) */}
        <button
          onClick={() => setActiveTool('rect')}
          className={`p-2 rounded-[24px] transition-all ${
            activeTool === 'rect'
              ? 'bg-[var(--color-canvas)] text-[var(--color-ink)] border border-[var(--color-ink)] [box-shadow:var(--shadow-subtle)] ' 
              : 'text-[var(--color-mid-gray)] hover:text-[var(--color-ink)] hover:bg-[var(--color-surface-alt)]'
          }`}
          title="Rectangle Tool (R)"
        >
          <div className="w-4 h-4 border-[1.5px] border-current rounded-[2px]" />
        </button>

        {/* Ellipse Tool (O) */}
        <button
          onClick={() => setActiveTool('ellipse')}
          className={`p-2 rounded-[24px] transition-all ${
            activeTool === 'ellipse'
              ? 'bg-[var(--color-canvas)] text-[var(--color-ink)] border border-[var(--color-ink)] [box-shadow:var(--shadow-subtle)] ' 
              : 'text-[var(--color-mid-gray)] hover:text-[var(--color-ink)] hover:bg-[var(--color-surface-alt)]'
          }`}
          title="Ellipse Tool (O)"
        >
          <div className="w-4 h-4 border-[1.5px] border-current rounded-full" />
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

          {/* Per-path SVG markers for endpoint caps */}
          {paths.filter(p => p.enabled && (p.startCap || p.endCap)).map(path => {
            const sw = path.strokeWidth || 2;
            const mId = path.id.replace(/[^a-zA-Z0-9]/g, '_');
            const markers: React.ReactNode[] = [];

            const buildMarker = (cap: CapType, isStart: boolean) => {
              const side = isStart ? 'start' : 'end';
              const id = `marker-${mId}-${side}`;
              const size = Math.max(6, sw * 3.5);
              const half = size / 2;

              if (cap === 'none') return null;
              if (cap === 'arrow') {
                return (
                  <marker key={id} id={id} markerWidth={size} markerHeight={size} refX={isStart ? 0 : size} refY={half} orient="auto" markerUnits="userSpaceOnUse">
                    <polyline points={isStart ? `${size},0 0,${half} ${size},${size}` : `0,0 ${size},${half} 0,${size}`} fill="none" stroke={path.color} strokeWidth={sw} strokeLinejoin="round" strokeLinecap="round" />
                  </marker>
                );
              }
              if (cap === 'solidArrow') {
                return (
                  <marker key={id} id={id} markerWidth={size} markerHeight={size} refX={isStart ? 0 : size} refY={half} orient="auto" markerUnits="userSpaceOnUse">
                    <polygon points={isStart ? `${size},0 0,${half} ${size},${size}` : `0,0 ${size},${half} 0,${size}`} fill={path.color} />
                  </marker>
                );
              }
              if (cap === 'circle') {
                return (
                  <marker key={id} id={id} markerWidth={size} markerHeight={size} refX={half} refY={half} orient="auto" markerUnits="userSpaceOnUse">
                    <circle cx={half} cy={half} r={half - 0.5} fill={path.color} />
                  </marker>
                );
              }
              if (cap === 'diamond') {
                return (
                  <marker key={id} id={id} markerWidth={size} markerHeight={size} refX={isStart ? 0 : size} refY={half} orient="auto" markerUnits="userSpaceOnUse">
                    <polygon points={`${half},0 ${size},${half} ${half},${size} 0,${half}`} fill={path.color} />
                  </marker>
                );
              }
              if (cap === 'square') {
                return (
                  <marker key={id} id={id} markerWidth={size} markerHeight={size} refX={isStart ? 0 : size} refY={half} orient="auto" markerUnits="userSpaceOnUse">
                    <rect x={0} y={0} width={size} height={size} fill={path.color} />
                  </marker>
                );
              }
              if (cap === 'bar') {
                return (
                  <marker key={id} id={id} markerWidth={sw * 2} markerHeight={size} refX={sw} refY={half} orient="auto" markerUnits="userSpaceOnUse">
                    <line x1={sw} y1={0} x2={sw} y2={size} stroke={path.color} strokeWidth={sw} strokeLinecap="round" />
                  </marker>
                );
              }
              return null;
            };

            if (path.startCap && path.startCap !== 'none') {
              const m = buildMarker(path.startCap, true);
              if (m) markers.push(m);
            }
            if (path.endCap && path.endCap !== 'none') {
              const m = buildMarker(path.endCap, false);
              if (m) markers.push(m);
            }
            return <React.Fragment key={path.id}>{markers}</React.Fragment>;
          })}
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

        <g transform={`translate(${pan.x}, ${pan.y}) scale(${settings.zoom || 1})`}>
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
                    <>
                      <rect 
                        width={path.imageWidth || 100} 
                        height={path.imageHeight || 100} 
                        fill="none" 
                        stroke="#00F2FF" 
                        strokeWidth={1.5} 
                      />
                      {activeTool === 'select' && (() => {
                        const minX = 0;
                        const minY = 0;
                        const maxX = path.imageWidth || 100;
                        const maxY = path.imageHeight || 100;
                        const w = maxX - minX;
                        const h = maxY - minY;
                        return (
                          <g className="bounding-box">
                            {[
                              [minX, minY], [minX + w / 2, minY], [maxX, minY],
                              [minX, minY + h / 2], [maxX, minY + h / 2],
                              [minX, maxY], [minX + w / 2, maxY], [maxX, maxY]
                            ].map(([hx, hy], i) => (
                              <rect
                                key={`img-handle-${i}`}
                                x={hx - 3}
                                y={hy - 3}
                                width={6}
                                height={6}
                                fill="#FFFFFF"
                                stroke="#00F2FF"
                                strokeWidth={1.5}
                                className="cursor-pointer"
                                onMouseDown={(e) => {
                                  e.stopPropagation();
                                  setDragTarget({ type: 'resize', handle: i });
                                  setDragStartPoint(getCanvasCoords(e, false));
                                }}
                              />
                            ))}
                          </g>
                        );
                      })()}
                    </>
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
                transform={path.x || path.y ? `translate(${path.x || 0}, ${path.y || 0})` : undefined}
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

              {/* Main vector stroke with endpoint caps */}
              <path
                id={`${path.id}-stroke`}
                d={d}
                fill={path.fill || 'none'}
                fillOpacity={path.fillOpacity ?? 1}
                stroke={strokePaint}
                strokeWidth={path.strokeWidth}
                strokeLinecap={path.lineCap || 'round'}
                strokeLinejoin={path.lineJoin || 'round'}
                strokeDasharray={dashArray}
                strokeDashoffset={offset}
                opacity={path.opacity}
                markerStart={path.startCap && path.startCap !== 'none' ? `url(#marker-${path.id.replace(/[^a-zA-Z0-9]/g,'_')}-start)` : undefined}
                markerEnd={path.endCap && path.endCap !== 'none' ? `url(#marker-${path.id.replace(/[^a-zA-Z0-9]/g,'_')}-end)` : undefined}
              />

              {/* Arrow Flow — animated chevrons flowing along the path */}
              {path.arrowFlow && isPlaying && (
                <ArrowFlowOverlay
                  pathId={`${path.id}-stroke`}
                  color={path.color}
                  arrowSize={path.arrowFlowSize || 14}
                  spacing={path.arrowFlowSpacing || 70}
                  speed={(path.flowSpeed || 1.5) * (settings.globalSpeed || 1)}
                  reverse={path.flowDirection === 'reverse'}
                />
              )}

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
              {/* Object Along Path */}
              {path.motionObjectId && isPlaying && (() => {
                const motObj = paths.find(p => p.id === path.motionObjectId && p.enabled);
                if (!motObj) return null;
                return (
                  <MotionObjectOverlay
                    pathId={`${path.id}-stroke`}
                    motionPath={motObj}
                    speed={(path.motionSpeed || 1) * (settings.globalSpeed || 1)}
                  />
                );
              })()}

              {/* Selection Halo */}
              {isSelected && (
                <>
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
                  {/* Bounding box for whole path selection */}
                  {activeTool === 'select' && (() => {
                    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
                    path.anchors.forEach(a => {
                      const pts = [a.point];
                      if (a.handleIn) pts.push(a.handleIn);
                      if (a.handleOut) pts.push(a.handleOut);
                      pts.forEach(p => {
                        if (p.x < minX) minX = p.x;
                        if (p.y < minY) minY = p.y;
                        if (p.x > maxX) maxX = p.x;
                        if (p.y > maxY) maxY = p.y;
                      });
                    });
                    if (minX === Infinity) return null;
                    const w = maxX - minX;
                    const h = maxY - minY;
                    const pad = 2; // Padding around bounds
                    return (
                      <g className="bounding-box">
                        <rect
                          x={minX - pad}
                          y={minY - pad}
                          width={w + pad * 2}
                          height={h + pad * 2}
                          fill="none"
                          stroke="#00F2FF"
                          strokeWidth={1}
                        />
                        {/* 8 resize handles */}
                        {[
                          [minX - pad, minY - pad], [minX + w / 2, minY - pad], [maxX + pad, minY - pad],
                          [minX - pad, minY + h / 2], [maxX + pad, minY + h / 2],
                          [minX - pad, maxY + pad], [minX + w / 2, maxY + pad], [maxX + pad, maxY + pad]
                        ].map(([hx, hy], i) => (
                          <rect
                            key={`bb-handle-${i}`}
                            x={hx - 3}
                            y={hy - 3}
                            width={6}
                            height={6}
                            fill="#FFFFFF"
                            stroke="#00F2FF"
                            strokeWidth={1.5}
                            className="cursor-pointer"
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              setDragTarget({ type: 'resize', handle: i });
                              setDragStartPoint(getCanvasCoords(e, false));
                            }}
                          />
                        ))}
                      </g>
                    );
                  })()}
                </>
              )}
            </g>
          );
        })}

        {/* Illustrator-Style Interactive Anchor Points & Tangent Handles */}
        {selectedPath && selectedPath.enabled && (
          <g className="illustrator-handles pointer-events-auto" transform={selectedPath.x || selectedPath.y ? `translate(${selectedPath.x || 0}, ${selectedPath.y || 0})` : undefined}>
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
          
          {/* Live Shape Preview */}
          {isDrawing && (activeTool === 'rect' || activeTool === 'ellipse') && rawPencilPoints.length === 2 && (
            <path
              d={(() => {
                const [start, end] = rawPencilPoints;
                const minX = Math.min(start.x, end.x);
                const minY = Math.min(start.y, end.y);
                const maxX = Math.max(start.x, end.x);
                const maxY = Math.max(start.y, end.y);
                const width = maxX - minX;
                const height = maxY - minY;
                if (activeTool === 'rect') {
                  return `M ${minX} ${minY} L ${maxX} ${minY} L ${maxX} ${maxY} L ${minX} ${maxY} Z`;
                } else {
                  const cx = minX + width / 2;
                  const cy = minY + height / 2;
                  const rx = width / 2;
                  const ry = height / 2;
                  return `M ${cx - rx} ${cy} A ${rx} ${ry} 0 1 0 ${cx + rx} ${cy} A ${rx} ${ry} 0 1 0 ${cx - rx} ${cy}`;
                }
              })()}
              fill="rgba(0, 242, 255, 0.1)"
              stroke="var(--color-ink)"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="4,4"
              className="animate-pulse"
            />
          )}
          
          {/* Marquee Selection */}
          {marqueeStart && marqueeEnd && (
            <rect
              x={Math.min(marqueeStart.x, marqueeEnd.x)}
              y={Math.min(marqueeStart.y, marqueeEnd.y)}
              width={Math.abs(marqueeEnd.x - marqueeStart.x)}
              height={Math.abs(marqueeEnd.y - marqueeStart.y)}
              fill="rgba(0, 242, 255, 0.1)"
              stroke="#00F2FF"
              strokeWidth={1}
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
