import { Point, AnchorPoint, DrawingPath } from '../types';
import { GRADIENT_PRESETS, DASH_PRESETS } from '../data/presets';
import { svgPathProperties } from 'svg-path-properties';

/**
 * Generate a unique ID
 */
export const uid = (prefix = 'node'): string => `${prefix}-${Math.random().toString(36).substr(2, 9)}`;

/**
 * Distance between two points
 */
export const distance = (p1: Point, p2: Point): number => {
  return Math.hypot(p2.x - p1.x, p2.y - p1.y);
};

/**
 * Convert an array of AnchorPoints into an SVG path `d` string with optional corner radius support
 */
export const anchorsToPathString = (anchors: AnchorPoint[], closed = false, cornerRadius = 0, routing: DrawingPath['routing'] = 'bezier'): string => {
  if (!anchors || anchors.length === 0) return '';
  if (anchors.length === 1) return `M ${anchors[0].point.x} ${anchors[0].point.y}`;

  const n = anchors.length;

  // Handle Flowchart Routing types first
  if (routing === 'straight') {
    let d = `M ${anchors[0].point.x} ${anchors[0].point.y}`;
    for (let i = 1; i < n; i++) {
      d += ` L ${anchors[i].point.x} ${anchors[i].point.y}`;
    }
    if (closed) d += ' Z';
    return d;
  }

  if (routing === 'elbow') {
    let d = `M ${anchors[0].point.x} ${anchors[0].point.y}`;
    for (let i = 1; i < n; i++) {
      const prev = anchors[i - 1].point;
      const curr = anchors[i].point;
      // Midpoint elbow
      const midX = prev.x + (curr.x - prev.x) / 2;
      d += ` L ${midX} ${prev.y} L ${midX} ${curr.y} L ${curr.x} ${curr.y}`;
    }
    if (closed) {
      const prev = anchors[n - 1].point;
      const curr = anchors[0].point;
      const midX = prev.x + (curr.x - prev.x) / 2;
      d += ` L ${midX} ${prev.y} L ${midX} ${curr.y} Z`;
    }
    return d;
  }

  if (routing === 'smooth') {
    // Basic smooth spline via bezier
    let d = `M ${anchors[0].point.x} ${anchors[0].point.y}`;
    for (let i = 1; i < n; i++) {
      const prev = anchors[i - 1].point;
      const curr = anchors[i].point;
      // create handle at halfway point horizontally
      const midX = prev.x + (curr.x - prev.x) / 2;
      d += ` C ${midX} ${prev.y}, ${midX} ${curr.y}, ${curr.x} ${curr.y}`;
    }
    if (closed) {
      const prev = anchors[n - 1].point;
      const curr = anchors[0].point;
      const midX = prev.x + (curr.x - prev.x) / 2;
      d += ` C ${midX} ${prev.y}, ${midX} ${curr.y}, ${curr.x} ${curr.y} Z`;
    }
    return d;
  }

  // If cornerRadius > 0, check if we need to fillet corner vertices
  if (cornerRadius > 0 && n >= 2) {
    let d = '';
    const points: Point[] = [];
    const isCornerAnchor: boolean[] = [];

    for (let i = 0; i < n; i++) {
      points.push(anchors[i].point);
      const anc = anchors[i];
      const hasHandles = (anc.handleIn && (anc.handleIn.x !== anc.point.x || anc.handleIn.y !== anc.point.y)) ||
                         (anc.handleOut && (anc.handleOut.x !== anc.point.x || anc.handleOut.y !== anc.point.y));
      isCornerAnchor.push(Boolean(anc.isCorner) || !hasHandles);
    }

    // If any points have true bezier curves, fallback to bezier with corner smoothing on straight nodes
    // Or if all are sharp/straight segments (like polygon, star, zigzag, rectangle, or straight polyline):
    const allStraight = isCornerAnchor.every(c => c);

    if (allStraight) {
      if (closed && n > 2) {
        // Closed polygon with rounded corners
        for (let i = 0; i < n; i++) {
          const prev = points[(i - 1 + n) % n];
          const curr = points[i];
          const next = points[(i + 1) % n];

          const d1 = distance(prev, curr);
          const d2 = distance(curr, next);
          const r = Math.min(cornerRadius, d1 / 2.1, d2 / 2.1);

          if (r > 0) {
            const startX = curr.x + ((prev.x - curr.x) / d1) * r;
            const startY = curr.y + ((prev.y - curr.y) / d1) * r;
            const endX = curr.x + ((next.x - curr.x) / d2) * r;
            const endY = curr.y + ((next.y - curr.y) / d2) * r;

            if (i === 0) {
              d += `M ${startX} ${startY} Q ${curr.x} ${curr.y}, ${endX} ${endY}`;
            } else {
              d += ` L ${startX} ${startY} Q ${curr.x} ${curr.y}, ${endX} ${endY}`;
            }
          } else {
            if (i === 0) d += `M ${curr.x} ${curr.y}`;
            else d += ` L ${curr.x} ${curr.y}`;
          }
        }
        d += ' Z';
        return d;
      } else {
        // Open polyline with rounded inner corners
        d = `M ${points[0].x} ${points[0].y}`;
        for (let i = 1; i < n - 1; i++) {
          const prev = points[i - 1];
          const curr = points[i];
          const next = points[i + 1];

          const d1 = distance(prev, curr);
          const d2 = distance(curr, next);
          const r = Math.min(cornerRadius, d1 / 2.1, d2 / 2.1);

          if (r > 0) {
            const startX = curr.x + ((prev.x - curr.x) / d1) * r;
            const startY = curr.y + ((prev.y - curr.y) / d1) * r;
            const endX = curr.x + ((next.x - curr.x) / d2) * r;
            const endY = curr.y + ((next.y - curr.y) / d2) * r;

            d += ` L ${startX} ${startY} Q ${curr.x} ${curr.y}, ${endX} ${endY}`;
          } else {
            d += ` L ${curr.x} ${curr.y}`;
          }
        }
        d += ` L ${points[n - 1].x} ${points[n - 1].y}`;
        return d;
      }
    }
  }

  // Standard Cubic Bezier Path
  let d = `M ${anchors[0].point.x} ${anchors[0].point.y}`;

  for (let i = 1; i < anchors.length; i++) {
    const prev = anchors[i - 1];
    const curr = anchors[i];

    const cp1 = prev.handleOut || prev.point;
    const cp2 = curr.handleIn || curr.point;

    if (cp1.x === prev.point.x && cp1.y === prev.point.y && cp2.x === curr.point.x && cp2.y === curr.point.y) {
      d += ` L ${curr.point.x} ${curr.point.y}`;
    } else {
      d += ` C ${cp1.x} ${cp1.y}, ${cp2.x} ${cp2.y}, ${curr.point.x} ${curr.point.y}`;
    }
  }

  if (closed && anchors.length > 2) {
    const last = anchors[anchors.length - 1];
    const first = anchors[0];
    const cp1 = last.handleOut || last.point;
    const cp2 = first.handleIn || first.point;

    if (cp1.x === last.point.x && cp1.y === last.point.y && cp2.x === first.point.x && cp2.y === first.point.y) {
      d += ` Z`;
    } else {
      d += ` C ${cp1.x} ${cp1.y}, ${cp2.x} ${cp2.y}, ${first.point.x} ${first.point.y} Z`;
    }
  }

  return d;
};

/**
 * Ramer-Douglas-Peucker simplification algorithm
 */
function perpendicularDistance(pt: Point, lineStart: Point, lineEnd: Point): number {
  const dx = lineEnd.x - lineStart.x;
  const dy = lineEnd.y - lineStart.y;
  const mag = Math.hypot(dx, dy);
  if (mag === 0) return distance(pt, lineStart);
  const u = ((pt.x - lineStart.x) * dx + (pt.y - lineStart.y) * dy) / (mag * mag);
  const clampedU = Math.max(0, Math.min(1, u));
  const projX = lineStart.x + clampedU * dx;
  const projY = lineStart.y + clampedU * dy;
  return distance(pt, { x: projX, y: projY });
}

export function simplifyPoints(points: Point[], tolerance = 3): Point[] {
  if (points.length <= 2) return points;

  let maxDist = 0;
  let index = 0;
  const start = points[0];
  const end = points[points.length - 1];

  for (let i = 1; i < points.length - 1; i++) {
    const dist = perpendicularDistance(points[i], start, end);
    if (dist > maxDist) {
      maxDist = dist;
      index = i;
    }
  }

  if (maxDist > tolerance) {
    const left = simplifyPoints(points.slice(0, index + 1), tolerance);
    const right = simplifyPoints(points.slice(index), tolerance);
    return [...left.slice(0, -1), ...right];
  } else {
    return [start, end];
  }
}

/**
 * Convert a stream of raw pencil points into smooth Illustrator-style Bezier anchor points
 * with tangent control handles calculated via Catmull-Rom to Cubic Bezier conversion.
 */
export function fitSmoothBezierAnchors(rawPoints: Point[], smoothness = 5): AnchorPoint[] {
  if (rawPoints.length < 2) {
    return rawPoints.map(p => ({ id: uid('anchor'), point: { ...p } }));
  }

  // 1. Simplify points based on smoothness slider
  const tolerance = Math.max(1.5, smoothness * 0.8);
  const simplified = simplifyPoints(rawPoints, tolerance);

  if (simplified.length === 2) {
    return [
      { id: uid('anchor'), point: simplified[0] },
      { id: uid('anchor'), point: simplified[1] }
    ];
  }

  const n = simplified.length;
  const anchors: AnchorPoint[] = [];

  // Tension factor based on smoothness (0.25 to 0.45)
  const tension = 0.3 + (smoothness / 10) * 0.15;

  for (let i = 0; i < n; i++) {
    const curr = simplified[i];
    let handleIn: Point | null = null;
    let handleOut: Point | null = null;

    if (i === 0) {
      // First point
      const next = simplified[1];
      const dx = (next.x - curr.x) * tension;
      const dy = (next.y - curr.y) * tension;
      handleOut = { x: curr.x + dx, y: curr.y + dy };
    } else if (i === n - 1) {
      // Last point
      const prev = simplified[n - 2];
      const dx = (curr.x - prev.x) * tension;
      const dy = (curr.y - prev.y) * tension;
      handleIn = { x: curr.x - dx, y: curr.y - dy };
    } else {
      // Middle points: compute tangent from prev to next
      const prev = simplified[i - 1];
      const next = simplified[i + 1];

      const dPrev = distance(prev, curr);
      const dNext = distance(curr, next);
      const dTotal = dPrev + dNext;

      const tangentX = (next.x - prev.x);
      const tangentY = (next.y - prev.y);

      if (dTotal > 0.001) {
        const inScale = (dPrev / dTotal) * tension * 2;
        const outScale = (dNext / dTotal) * tension * 2;

        handleIn = {
          x: curr.x - tangentX * inScale,
          y: curr.y - tangentY * inScale
        };
        handleOut = {
          x: curr.x + tangentX * outScale,
          y: curr.y + tangentY * outScale
        };
      }
    }

    anchors.push({
      id: uid('anchor'),
      point: { ...curr },
      handleIn,
      handleOut,
      isCorner: false
    });
  }

  return anchors;
}



/**
 * Draw a single DrawingPath onto a standard Canvas 2D Rendering Context
 */
export function drawPathToCanvas(
  ctx: CanvasRenderingContext2D,
  path: DrawingPath,
  dashOffset = 0,
  width = 800,
  height = 600
): void {
  if (!path.enabled || !path.anchors || path.anchors.length < 2) return;

  ctx.save();
  ctx.lineCap = path.lineCap || 'round';
  ctx.lineJoin = path.lineJoin || 'round';
  ctx.globalAlpha = path.opacity ?? 1;

  // Build stroke style (gradient or solid)
  let strokeStyle: string | CanvasGradient = path.color || '#00F2FF';
  const gradPreset = GRADIENT_PRESETS.find(g => g.id === path.gradientId);
  if (gradPreset && gradPreset.stops.length > 0) {
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradPreset.stops.forEach(stop => {
      const offsetVal = parseFloat(stop.offset.replace('%', '')) / 100;
      gradient.addColorStop(Math.max(0, Math.min(1, offsetVal)), stop.color);
    });
    strokeStyle = gradient;
  }
  ctx.strokeStyle = strokeStyle;

  const d = anchorsToPathString(path.anchors, path.closed, path.cornerRadius || 0, path.routing);
  const p2d = new Path2D(d);

  // Render Glow if enabled
  if (path.showGlow) {
    ctx.save();
    const glowColor = gradPreset ? gradPreset.stops[0].color : path.color;
    ctx.shadowBlur = path.strokeWidth * 3;
    ctx.shadowColor = glowColor;
    ctx.lineWidth = path.strokeWidth;
    ctx.globalAlpha = 0.5 * (path.opacity ?? 1);
    
    // Use the exact same dash pattern for the glow to match the SVG artboard behavior
    const preset = DASH_PRESETS.find(p => p.id === path.dashPreset);
    if (preset && preset.id !== 'solid') {
      let dashArr: number[] = [];
      if (preset.id === 'custom') {
        if (path.customDashArray !== undefined) {
          dashArr = path.customDashArray.split(',').map(s => parseFloat(s.trim())).filter(n => !isNaN(n));
        } else {
          dashArr = [path.customDashLength || 20, path.customGapLength || 10];
          if (path.customDash2 && path.customGap2) {
            dashArr.push(path.customDash2, path.customGap2);
          }
        }
      } else {
        dashArr = preset.array.split(',').map(s => parseFloat(s.trim())).filter(n => !isNaN(n));
      }
      ctx.setLineDash(dashArr);
      ctx.lineDashOffset = dashOffset;
    } else {
      ctx.setLineDash([]);
    }

    ctx.stroke(p2d);
    ctx.restore();
  }

  // Render Main Stroke
  ctx.lineWidth = path.strokeWidth;
  // Set dash pattern for the main stroke
  const preset = DASH_PRESETS.find(p => p.id === path.dashPreset);
  if (preset && preset.id !== 'solid') {
    let dashArr: number[] = [];
    if (preset.id === 'custom') {
      if (path.customDashArray !== undefined) {
        dashArr = path.customDashArray.split(',').map(s => parseFloat(s.trim())).filter(n => !isNaN(n));
      } else {
        dashArr = [path.customDashLength || 20, path.customGapLength || 10];
        if (path.customDash2 && path.customGap2) {
          dashArr.push(path.customDash2, path.customGap2);
        }
      }
    } else {
      dashArr = preset.array.split(',').map(s => parseFloat(s.trim())).filter(n => !isNaN(n));
    }
    ctx.setLineDash(dashArr);
    ctx.lineDashOffset = dashOffset;
  } else {
    ctx.setLineDash([]);
  }

  if (path.fill) {
    ctx.save();
    ctx.fillStyle = path.fill;
    if (path.fillOpacity !== undefined) {
      ctx.globalAlpha = path.fillOpacity;
    }
    ctx.fill(p2d);
    ctx.restore();
  }

  ctx.stroke(p2d);

  // Draw start and end caps
  if (path.startCap && path.startCap !== 'none' || path.endCap && path.endCap !== 'none') {
    const drawMarker = (cap: string, point: Point, angle: number, isStart: boolean) => {
      ctx.save();
      ctx.translate(point.x, point.y);
      ctx.rotate(angle);
      
      const sw = path.strokeWidth || 2;
      const size = Math.max(6, sw * 3.5);
      const half = size / 2;
      
      // Orient the marker similar to SVG orient="auto"
      // SVG markers have refX and refY. 
      // We will translate so the ref point is at (0,0)
      let refX = isStart ? 0 : size;
      const refY = half;
      
      if (cap === 'circle') {
          refX = half;
      } else if (cap === 'bar') {
          refX = sw;
      } else if (cap === 'diamond') {
          refX = isStart ? 0 : size;
      }
      
      ctx.translate(-refX, -refY);
      
      ctx.fillStyle = strokeStyle;
      ctx.strokeStyle = strokeStyle;
      ctx.lineWidth = sw;
      ctx.setLineDash([]);
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';

      ctx.beginPath();
      if (cap === 'arrow') {
        if (isStart) {
            ctx.moveTo(size, 0); ctx.lineTo(0, half); ctx.lineTo(size, size);
        } else {
            ctx.moveTo(0, 0); ctx.lineTo(size, half); ctx.lineTo(0, size);
        }
        ctx.stroke();
      } else if (cap === 'solidArrow') {
        if (isStart) {
            ctx.moveTo(size, 0); ctx.lineTo(0, half); ctx.lineTo(size, size);
        } else {
            ctx.moveTo(0, 0); ctx.lineTo(size, half); ctx.lineTo(0, size);
        }
        ctx.closePath();
        ctx.fill();
      } else if (cap === 'circle') {
        ctx.arc(half, half, half - 0.5, 0, Math.PI * 2);
        ctx.fill();
      } else if (cap === 'diamond') {
        if (isStart) {
            ctx.moveTo(half, 0); ctx.lineTo(size, half); ctx.lineTo(half, size); ctx.lineTo(0, half);
        } else {
            ctx.moveTo(half, 0); ctx.lineTo(size, half); ctx.lineTo(half, size); ctx.lineTo(0, half);
        }
        ctx.closePath();
        ctx.fill();
      } else if (cap === 'square') {
        ctx.rect(0, 0, size, size);
        ctx.fill();
      } else if (cap === 'bar') {
        ctx.moveTo(sw, 0); ctx.lineTo(sw, size);
        ctx.stroke();
      }
      ctx.restore();
    };

    const getAngle = (p1: Point, p2: Point) => Math.atan2(p2.y - p1.y, p2.x - p1.x);

    if (path.startCap && path.startCap !== 'none') {
        const p1 = path.anchors[0];
        let p2 = p1.handleOut;
        if (!p2 && path.anchors.length > 1) {
             const next = path.anchors[1];
             if (path.routing === 'elbow' || path.routing === 'smooth') {
                 const midX = p1.point.x + (next.point.x - p1.point.x) / 2;
                 if (midX !== p1.point.x) {
                     p2 = { x: midX, y: p1.point.y };
                 } else {
                     p2 = { x: p1.point.x, y: next.point.y }; // vertical
                 }
             } else {
                 p2 = next.handleIn || next.point;
             }
        }
        if (p2) {
            // angle from p1 to p2 because it's the start (forward direction)
            const angle = getAngle(p1.point, p2);
            drawMarker(path.startCap, p1.point, angle, true);
        }
    }

    if (path.endCap && path.endCap !== 'none' && !path.closed) {
        const p1 = path.anchors[path.anchors.length - 1];
        let p2 = p1.handleIn;
        if (!p2 && path.anchors.length > 1) {
             const prev = path.anchors[path.anchors.length - 2];
             if (path.routing === 'elbow' || path.routing === 'smooth') {
                 const midX = prev.point.x + (p1.point.x - prev.point.x) / 2;
                 if (midX !== p1.point.x) {
                     p2 = { x: midX, y: p1.point.y };
                 } else {
                     p2 = { x: p1.point.x, y: prev.point.y }; // vertical
                 }
             } else {
                 p2 = prev.handleOut || prev.point;
             }
        }
        if (p2) {
            // angle from p2 to p1 because it's the end (forward direction)
            const angle = getAngle(p2, p1.point);
            drawMarker(path.endCap, p1.point, angle, false);
        }
    }
  }

  ctx.restore();
}

export function getBoundingBox(path: DrawingPath) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  
  if (path.type === 'image') {
    return {
      x: path.x || 0,
      y: path.y || 0,
      width: path.imageWidth || 0,
      height: path.imageHeight || 0
    };
  }

  let hasPoints = false;
  path.anchors.forEach(a => {
    hasPoints = true;
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

  if (!hasPoints) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY
  };
}

export function calculateBoundingBox(paths: DrawingPath[]) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  let hasPoints = false;
  let maxStroke = 0;

  paths.forEach(path => {
    if (!path.enabled) return;
    hasPoints = true;
    const box = getBoundingBox(path);
    if (box.x < minX) minX = box.x;
    if (box.y < minY) minY = box.y;
    if (box.x + box.width > maxX) maxX = box.x + box.width;
    if (box.y + box.height > maxY) maxY = box.y + box.height;
    
    if (path.strokeWidth > maxStroke) maxStroke = path.strokeWidth;
  });

  if (!hasPoints) {
    return { x: 0, y: 0, width: 800, height: 600 };
  }

  // Margin to prevent cut off (e.g. stroke width + glow spread + generous padding)
  const margin = maxStroke * 6 + 40;
  
  return {
    x: Math.floor(minX - margin),
    y: Math.floor(minY - margin),
    width: Math.ceil((maxX - minX) + (margin * 2)),
    height: Math.ceil((maxY - minY) + (margin * 2))
  };
}

/**
 * Render the full artboard onto a canvas element
 */
export function renderArtboardToCanvas(
  canvas: HTMLCanvasElement,
  paths: DrawingPath[],
  dashOffsets: Record<string, number>,
  backgroundColor = '#050505',
  showGrid = true,
  transparent = false,
  offset = { x: 0, y: 0 },
  scale = 1,
  motionProgress: Record<string, number> = {},
  timeElapsed: number = 0,
  globalSpeed: number = 1
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const w = canvas.width;
  const h = canvas.height;

  // Initialize the canvas alpha channel to truly transparent before any rendering
  ctx.clearRect(0, 0, w, h);

  ctx.save();
  ctx.scale(scale, scale);
  ctx.translate(offset.x, offset.y);

  // Fill background if not transparent
  if (!transparent && backgroundColor !== 'transparent') {
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(-offset.x, -offset.y, w / scale, h / scale);

    // Grid
    if (showGrid) {
      ctx.save();
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
      ctx.lineWidth = 1;
      const step = 40;
      for (let x = (-offset.x % step) - step; x < (w / scale) - offset.x; x += step) {
        ctx.beginPath();
        ctx.moveTo(x, -offset.y);
        ctx.lineTo(x, (h / scale) - offset.y);
        ctx.stroke();
      }
      for (let y = (-offset.y % step) - step; y < (h / scale) - offset.y; y += step) {
        ctx.beginPath();
        ctx.moveTo(-offset.x, y);
        ctx.lineTo((w / scale) - offset.x, y);
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  // Paths and Images
  paths.forEach(path => {
    if (path.enabled) {
      if (path.type === 'image' && path.imageUrl) {
        ctx.save();
        ctx.translate(path.x || 0, path.y || 0);
        if (path.opacity !== undefined) {
          ctx.globalAlpha = path.opacity;
        }
        
        try {
          const img = new Image();
          img.src = path.imageUrl;
          ctx.drawImage(img, 0, 0, path.imageWidth || 100, path.imageHeight || 100);
        } catch (e) {
          console.error('Failed to draw image', e);
        }

        ctx.restore();
      } else {
        const lineOffset = dashOffsets[path.id] || 0;
        drawPathToCanvas(ctx, path, lineOffset, w / scale, h / scale);

        // Helper to get or construct SVG Path Properties for sampling curve positions & tangents
        const getSvgPathNode = (): any => {
          if (path.anchors && path.anchors.length > 0) {
            const d = anchorsToPathString(path.anchors, path.closed, path.cornerRadius || 0, path.routing);
            return new svgPathProperties(d);
          }
          return null;
        };

        // ── Render Animated Chevrons (Arrow Flow) ──
        if (path.arrowFlow) {
          const svgPathNode = getSvgPathNode();
          if (svgPathNode) {
            try {
              const totalLength = svgPathNode.getTotalLength();
              if (totalLength > 0) {
                const arrowCount = 8;
                const speed = (path.flowSpeed || 1.5) * globalSpeed;
                const duration = Math.max(0.3, 20 / speed);
                const baseProgress = (timeElapsed % duration) / duration;
                const arrowSize = path.arrowFlowSize || 14;
                const half = arrowSize / 2;

                for (let i = 0; i < arrowCount; i++) {
                  let progress = ((baseProgress + (i / arrowCount)) % 1);
                  if (path.flowDirection === 'reverse') {
                    progress = (1 - progress + 1) % 1;
                  }

                  const currentDist = progress * totalLength;
                  const pt = svgPathNode.getPointAtLength(currentDist);

                  const sampleDist = 1;
                  let ptNext = null;
                  let ptPrev = null;
                  if (currentDist + sampleDist <= totalLength) {
                    ptNext = svgPathNode.getPointAtLength(currentDist + sampleDist);
                    ptPrev = pt;
                  } else {
                    ptPrev = svgPathNode.getPointAtLength(Math.max(0, currentDist - sampleDist));
                    ptNext = pt;
                  }

                  let angle = 0;
                  if (ptNext && ptPrev) {
                    angle = Math.atan2(ptNext.y - ptPrev.y, ptNext.x - ptPrev.x);
                  }
                  if (path.flowDirection === 'reverse') {
                    angle += Math.PI;
                  }

                  ctx.save();
                  ctx.translate((path.x || 0) + pt.x, (path.y || 0) + pt.y);
                  ctx.rotate(angle);

                  ctx.beginPath();
                  ctx.moveTo(-half, -half * 0.8);
                  ctx.lineTo(half, 0);
                  ctx.lineTo(-half, half * 0.8);

                  ctx.strokeStyle = path.color;
                  ctx.lineWidth = Math.max(1, arrowSize * 0.18);
                  ctx.lineCap = 'round';
                  ctx.lineJoin = 'round';
                  ctx.globalAlpha = (path.opacity ?? 1) * 0.85;
                  ctx.stroke();

                  ctx.restore();
                }
              }
            } catch (err) {
              console.error('Error drawing arrow flow on canvas:', err);
            }
          }
        }

        // ── Render Motion Object Along Path ──
        if (path.motionObjectId) {
          const motionObj = paths.find(p => p.id === path.motionObjectId);
          const svgPathNode = getSvgPathNode();
          
          if (motionObj && svgPathNode) {
            try {
              const totalLength = svgPathNode.getTotalLength();
              const progress = motionProgress[path.id] || 0;
              const currentDist = progress * totalLength;
              const pt = svgPathNode.getPointAtLength(currentDist);
              
              const sampleDist = 1;
              let ptNext = null;
              let ptPrev = null;
              if (currentDist + sampleDist <= totalLength) {
                ptNext = svgPathNode.getPointAtLength(currentDist + sampleDist);
                ptPrev = pt;
              } else {
                ptPrev = svgPathNode.getPointAtLength(Math.max(0, currentDist - sampleDist));
                ptNext = pt;
              }

              let angle = 0;
              if (ptNext && ptPrev) {
                angle = Math.atan2(ptNext.y - ptPrev.y, ptNext.x - ptPrev.x);
              }

              ctx.save();
              ctx.translate((path.x || 0) + pt.x, (path.y || 0) + pt.y);
              ctx.rotate(angle);

              if (motionObj.type === 'image' && motionObj.imageUrl) {
                const img = new Image();
                img.src = motionObj.imageUrl;
                const mw = motionObj.imageWidth || 40;
                const mh = motionObj.imageHeight || 40;
                if (motionObj.opacity !== undefined) {
                  ctx.globalAlpha = motionObj.opacity;
                }
                ctx.drawImage(img, -mw / 2, -mh / 2, mw, mh);
              } else {
                ctx.fillStyle = motionObj.color;
                if (motionObj.opacity !== undefined) ctx.globalAlpha = motionObj.opacity;
                ctx.beginPath();
                ctx.arc(0, 0, 12, 0, Math.PI * 2);
                ctx.fill();
              }

              ctx.restore();
            } catch (err) {
              console.error('Error drawing motion object on canvas:', err);
            }
          }
        }
      }
    }
  });

  ctx.restore();
}
