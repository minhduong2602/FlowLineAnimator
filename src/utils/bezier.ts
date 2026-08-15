import { Point, AnchorPoint, DrawingPath } from '../types';
import { GRADIENT_PRESETS, DASH_PRESETS } from '../data/presets';

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
export const anchorsToPathString = (anchors: AnchorPoint[], closed = false, cornerRadius = 0): string => {
  if (!anchors || anchors.length === 0) return '';
  if (anchors.length === 1) return `M ${anchors[0].point.x} ${anchors[0].point.y}`;

  const n = anchors.length;

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
 * Generate Preset Shapes with rich Bezier anchors
 */
export function createPresetAnchors(type: string, width = 800, height = 600): { anchors: AnchorPoint[]; closed: boolean } {
  const cx = width / 2;
  const cy = height / 2;

  if (type === 'wave') {
    const anchors: AnchorPoint[] = [];
    const amplitude = 120;
    const waveCount = 3;
    const stepX = (width - 160) / (waveCount * 2);

    for (let i = 0; i <= waveCount * 2; i++) {
      const x = 80 + i * stepX;
      const y = cy + (i % 2 === 1 ? (i % 4 === 1 ? -amplitude : amplitude) : 0);
      const handleDx = stepX * 0.45;

      anchors.push({
        id: uid('anchor'),
        point: { x, y },
        handleIn: i > 0 ? { x: x - handleDx, y } : null,
        handleOut: i < waveCount * 2 ? { x: x + handleDx, y } : null,
        isCorner: false
      });
    }
    return { anchors, closed: false };
  }

  if (type === 'infinity') {
    const anchors: AnchorPoint[] = [];
    const rx = 180;
    const ry = 100;

    anchors.push({
      id: uid('anchor'),
      point: { x: cx, y: cy },
      handleIn: { x: cx - 40, y: cy + 40 },
      handleOut: { x: cx + 40, y: cy - 40 },
      isCorner: true
    });
    anchors.push({
      id: uid('anchor'),
      point: { x: cx + rx, y: cy - ry * 0.6 },
      handleIn: { x: cx + rx - 50, y: cy - ry },
      handleOut: { x: cx + rx + 30, y: cy },
      isCorner: false
    });
    anchors.push({
      id: uid('anchor'),
      point: { x: cx + rx, y: cy + ry * 0.6 },
      handleIn: { x: cx + rx + 30, y: cy },
      handleOut: { x: cx + rx - 50, y: cy + ry },
      isCorner: false
    });
    anchors.push({
      id: uid('anchor'),
      point: { x: cx, y: cy },
      handleIn: { x: cx + 40, y: cy + 40 },
      handleOut: { x: cx - 40, y: cy - 40 },
      isCorner: true
    });
    anchors.push({
      id: uid('anchor'),
      point: { x: cx - rx, y: cy - ry * 0.6 },
      handleIn: { x: cx - rx + 50, y: cy - ry },
      handleOut: { x: cx - rx - 30, y: cy },
      isCorner: false
    });
    anchors.push({
      id: uid('anchor'),
      point: { x: cx - rx, y: cy + ry * 0.6 },
      handleIn: { x: cx - rx - 30, y: cy },
      handleOut: { x: cx - rx + 50, y: cy + ry },
      isCorner: false
    });

    return { anchors, closed: true };
  }

  if (type === 'spiral') {
    const rawPoints: Point[] = [];
    for (let i = 0; i < 180; i += 3) {
      const angle = i * 0.12;
      const r = i * 1.5;
      rawPoints.push({ x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) });
    }
    return { anchors: fitSmoothBezierAnchors(rawPoints, 6), closed: false };
  }

  if (type === 'circle') {
    const r = 150;
    const kappa = 0.5522847498307935; // optimal handle length for circle
    const handleLen = r * kappa;

    const anchors: AnchorPoint[] = [
      {
        id: uid('anchor'),
        point: { x: cx, y: cy - r },
        handleIn: { x: cx - handleLen, y: cy - r },
        handleOut: { x: cx + handleLen, y: cy - r },
        isCorner: false
      },
      {
        id: uid('anchor'),
        point: { x: cx + r, y: cy },
        handleIn: { x: cx + r, y: cy - handleLen },
        handleOut: { x: cx + r, y: cy + handleLen },
        isCorner: false
      },
      {
        id: uid('anchor'),
        point: { x: cx, y: cy + r },
        handleIn: { x: cx + handleLen, y: cy + r },
        handleOut: { x: cx - handleLen, y: cy + r },
        isCorner: false
      },
      {
        id: uid('anchor'),
        point: { x: cx - r, y: cy },
        handleIn: { x: cx - r, y: cy + handleLen },
        handleOut: { x: cx - r, y: cy - handleLen },
        isCorner: false
      }
    ];

    return { anchors, closed: true };
  }

  if (type === 'star') {
    const pointsCount = 5;
    const outerR = 150;
    const innerR = 65;
    const anchors: AnchorPoint[] = [];

    for (let i = 0; i < pointsCount * 2; i++) {
      const r = i % 2 === 0 ? outerR : innerR;
      const angle = (i * Math.PI) / pointsCount - Math.PI / 2;
      anchors.push({
        id: uid('anchor'),
        point: { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) },
        handleIn: null,
        handleOut: null,
        isCorner: true
      });
    }

    return { anchors, closed: true };
  }

  // Default ZigZag
  const anchors: AnchorPoint[] = [];
  const step = 80;
  for (let x = 120, i = 0; x <= width - 120; x += step, i++) {
    anchors.push({
      id: uid('anchor'),
      point: { x, y: i % 2 === 0 ? cy - 100 : cy + 100 },
      handleIn: null,
      handleOut: null,
      isCorner: true
    });
  }
  return { anchors, closed: false };
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

  // Function to trace path geometry with corner radius
  const trace = () => {
    const cr = path.cornerRadius || 0;
    const n = path.anchors.length;

    if (cr > 0 && n >= 2) {
      const points = path.anchors.map(a => a.point);
      const isCornerAnchor = path.anchors.map(anc => {
        const hasHandles = (anc.handleIn && (anc.handleIn.x !== anc.point.x || anc.handleIn.y !== anc.point.y)) ||
                           (anc.handleOut && (anc.handleOut.x !== anc.point.x || anc.handleOut.y !== anc.point.y));
        return Boolean(anc.isCorner) || !hasHandles;
      });

      if (isCornerAnchor.every(Boolean)) {
        ctx.beginPath();
        if (path.closed && n > 2) {
          for (let i = 0; i < n; i++) {
            const prev = points[(i - 1 + n) % n];
            const curr = points[i];
            const next = points[(i + 1) % n];

            const d1 = distance(prev, curr);
            const d2 = distance(curr, next);
            const r = Math.min(cr, d1 / 2.1, d2 / 2.1);

            if (r > 0) {
              const startX = curr.x + ((prev.x - curr.x) / d1) * r;
              const startY = curr.y + ((prev.y - curr.y) / d1) * r;
              const endX = curr.x + ((next.x - curr.x) / d2) * r;
              const endY = curr.y + ((next.y - curr.y) / d2) * r;

              if (i === 0) ctx.moveTo(startX, startY);
              else ctx.lineTo(startX, startY);
              ctx.quadraticCurveTo(curr.x, curr.y, endX, endY);
            } else {
              if (i === 0) ctx.moveTo(curr.x, curr.y);
              else ctx.lineTo(curr.x, curr.y);
            }
          }
          ctx.closePath();
          return;
        } else {
          ctx.beginPath();
          ctx.moveTo(points[0].x, points[0].y);
          for (let i = 1; i < n - 1; i++) {
            const prev = points[i - 1];
            const curr = points[i];
            const next = points[i + 1];

            const d1 = distance(prev, curr);
            const d2 = distance(curr, next);
            const r = Math.min(cr, d1 / 2.1, d2 / 2.1);

            if (r > 0) {
              const startX = curr.x + ((prev.x - curr.x) / d1) * r;
              const startY = curr.y + ((prev.y - curr.y) / d1) * r;
              const endX = curr.x + ((next.x - curr.x) / d2) * r;
              const endY = curr.y + ((next.y - curr.y) / d2) * r;

              ctx.lineTo(startX, startY);
              ctx.quadraticCurveTo(curr.x, curr.y, endX, endY);
            } else {
              ctx.lineTo(curr.x, curr.y);
            }
          }
          ctx.lineTo(points[n - 1].x, points[n - 1].y);
          return;
        }
      }
    }

    ctx.beginPath();
    ctx.moveTo(path.anchors[0].point.x, path.anchors[0].point.y);

    for (let i = 1; i < path.anchors.length; i++) {
      const prev = path.anchors[i - 1];
      const curr = path.anchors[i];

      const cp1 = prev.handleOut || prev.point;
      const cp2 = curr.handleIn || curr.point;

      if (cp1.x === prev.point.x && cp1.y === prev.point.y && cp2.x === curr.point.x && cp2.y === curr.point.y) {
        ctx.lineTo(curr.point.x, curr.point.y);
      } else {
        ctx.bezierCurveTo(cp1.x, cp1.y, cp2.x, cp2.y, curr.point.x, curr.point.y);
      }
    }

    if (path.closed && path.anchors.length > 2) {
      const last = path.anchors[path.anchors.length - 1];
      const first = path.anchors[0];
      const cp1 = last.handleOut || last.point;
      const cp2 = first.handleIn || first.point;

      if (cp1.x === last.point.x && cp1.y === last.point.y && cp2.x === first.point.x && cp2.y === first.point.y) {
        ctx.closePath();
      } else {
        ctx.bezierCurveTo(cp1.x, cp1.y, cp2.x, cp2.y, first.point.x, first.point.y);
        ctx.closePath();
      }
    }
  };

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
        dashArr = [path.customDashLength || 20, path.customGapLength || 10];
        if (path.customDash2 && path.customGap2) {
          dashArr.push(path.customDash2, path.customGap2);
        }
      } else {
        dashArr = preset.array.split(',').map(s => parseFloat(s.trim())).filter(n => !isNaN(n));
      }
      ctx.setLineDash(dashArr);
      ctx.lineDashOffset = dashOffset;
    } else {
      ctx.setLineDash([]);
    }

    trace();
    ctx.stroke();
    ctx.restore();
  }

  // Render Main Stroke
  ctx.lineWidth = path.strokeWidth;
  // Set dash pattern for the main stroke
  const preset = DASH_PRESETS.find(p => p.id === path.dashPreset);
  if (preset && preset.id !== 'solid') {
    let dashArr: number[] = [];
    if (preset.id === 'custom') {
      dashArr = [path.customDashLength || 20, path.customGapLength || 10];
      if (path.customDash2 && path.customGap2) {
        dashArr.push(path.customDash2, path.customGap2);
      }
    } else {
      dashArr = preset.array.split(',').map(s => parseFloat(s.trim())).filter(n => !isNaN(n));
    }
    ctx.setLineDash(dashArr);
    ctx.lineDashOffset = dashOffset;
  } else {
    ctx.setLineDash([]);
  }

  trace();
  ctx.stroke();

  ctx.restore();
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
  transparent = false
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const w = canvas.width;
  const h = canvas.height;

  // Initialize the canvas alpha channel to truly transparent before any rendering
  ctx.clearRect(0, 0, w, h);

  // Fill background if not transparent
  if (!transparent && backgroundColor !== 'transparent') {
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, w, h);

    // Grid
    if (showGrid) {
      ctx.save();
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
      ctx.lineWidth = 1;
      const step = 40;
      for (let x = 0; x < w; x += step) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 0; y < h; y += step) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  // Paths
  paths.forEach(path => {
    if (path.enabled) {
      const offset = dashOffsets[path.id] || 0;
      drawPathToCanvas(ctx, path, offset, w, h);
    }
  });
}
