import { parseSVG, makeAbsolute, Command } from 'svg-path-parser';
import { AnchorPoint, Point } from '../types';
import { uid } from './bezier';

export const parseSVGPathToAnchors = (d: string): { anchors: AnchorPoint[], closed: boolean } => {
  const commands = makeAbsolute(parseSVG(d));
  const anchors: AnchorPoint[] = [];
  let closed = false;

  let lastPoint: Point | null = null;
  let lastControl: Point | null = null;

  for (const cmd of commands) {
    if (cmd.code === 'M') {
      const p = { x: cmd.x, y: cmd.y };
      anchors.push({ id: uid('anchor'), point: p, handleIn: null, handleOut: null, isCorner: true });
      lastPoint = p;
      lastControl = p;
    } else if (cmd.code === 'L' || cmd.code === 'H' || cmd.code === 'V') {
      let x = cmd.x;
      let y = cmd.y;
      if (cmd.code === 'H') {
        x = (cmd as any).x;
        y = lastPoint?.y || 0;
      } else if (cmd.code === 'V') {
        x = lastPoint?.x || 0;
        y = (cmd as any).y;
      }
      const p = { x, y };
      anchors.push({ id: uid('anchor'), point: p, handleIn: null, handleOut: null, isCorner: true });
      lastPoint = p;
      lastControl = p;
    } else if (cmd.code === 'C') {
      const c = cmd as any;
      if (anchors.length > 0) {
        anchors[anchors.length - 1].handleOut = { x: c.x1, y: c.y1 };
        anchors[anchors.length - 1].isCorner = false; // approximate
      }
      const p = { x: c.x, y: c.y };
      anchors.push({ id: uid('anchor'), point: p, handleIn: { x: c.x2, y: c.y2 }, handleOut: null, isCorner: false });
      lastPoint = p;
      lastControl = { x: c.x2, y: c.y2 };
    } else if (cmd.code === 'S') {
      const c = cmd as any;
      let x1 = lastPoint ? lastPoint.x : 0;
      let y1 = lastPoint ? lastPoint.y : 0;
      if (lastPoint && lastControl) {
        x1 = lastPoint.x + (lastPoint.x - lastControl.x);
        y1 = lastPoint.y + (lastPoint.y - lastControl.y);
      }
      if (anchors.length > 0) {
        anchors[anchors.length - 1].handleOut = { x: x1, y: y1 };
        anchors[anchors.length - 1].isCorner = false;
      }
      const p = { x: c.x, y: c.y };
      anchors.push({ id: uid('anchor'), point: p, handleIn: { x: c.x2, y: c.y2 }, handleOut: null, isCorner: false });
      lastPoint = p;
      lastControl = { x: c.x2, y: c.y2 };
    } else if (cmd.code === 'Q') {
      const c = cmd as any;
      // Convert Quad to Cubic
      const p0 = lastPoint || { x: 0, y: 0 };
      const p1 = { x: c.x1, y: c.y1 };
      const p2 = { x: c.x, y: c.y };
      
      const cp1 = { x: p0.x + (2/3) * (p1.x - p0.x), y: p0.y + (2/3) * (p1.y - p0.y) };
      const cp2 = { x: p2.x + (2/3) * (p1.x - p2.x), y: p2.y + (2/3) * (p1.y - p2.y) };

      if (anchors.length > 0) {
        anchors[anchors.length - 1].handleOut = cp1;
        anchors[anchors.length - 1].isCorner = false;
      }
      anchors.push({ id: uid('anchor'), point: p2, handleIn: cp2, handleOut: null, isCorner: false });
      lastPoint = p2;
      lastControl = p1; // For shorthand quad T
    } else if (cmd.code === 'T') {
      const c = cmd as any;
      const p0 = lastPoint || { x: 0, y: 0 };
      let p1 = p0;
      if (lastPoint && lastControl) {
        p1 = { x: lastPoint.x + (lastPoint.x - lastControl.x), y: lastPoint.y + (lastPoint.y - lastControl.y) };
      }
      const p2 = { x: c.x, y: c.y };

      const cp1 = { x: p0.x + (2/3) * (p1.x - p0.x), y: p0.y + (2/3) * (p1.y - p0.y) };
      const cp2 = { x: p2.x + (2/3) * (p1.x - p2.x), y: p2.y + (2/3) * (p1.y - p2.y) };

      if (anchors.length > 0) {
        anchors[anchors.length - 1].handleOut = cp1;
        anchors[anchors.length - 1].isCorner = false;
      }
      anchors.push({ id: uid('anchor'), point: p2, handleIn: cp2, handleOut: null, isCorner: false });
      lastPoint = p2;
      lastControl = p1;
    } else if (cmd.code === 'Z') {
      closed = true;
    }
  }

  // Remove duplicate close point if any
  if (closed && anchors.length > 1) {
    const first = anchors[0];
    const last = anchors[anchors.length - 1];
    if (Math.abs(first.point.x - last.point.x) < 0.1 && Math.abs(first.point.y - last.point.y) < 0.1) {
      first.handleIn = last.handleIn;
      anchors.pop();
    }
  }

  return { anchors, closed };
};

export const extractPathsFromSvgString = (input: string): string[] => {
  const paths: string[] = [];
  const trimmed = input.trim();
  
  if (!trimmed.includes('<svg') && !trimmed.includes('<path') && /^[\sMmZzLlHhVvCcSsQqTtAa]/.test(trimmed)) {
    // Looks like raw path data
    return [trimmed];
  }

  // Use DOM parser to find paths
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(trimmed, 'image/svg+xml');
    const pathElements = doc.querySelectorAll('path');
    pathElements.forEach(el => {
      const d = el.getAttribute('d');
      if (d) paths.push(d);
    });
  } catch (err) {
    console.error('Failed to parse SVG DOM', err);
  }

  return paths;
};
