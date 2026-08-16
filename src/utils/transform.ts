import { Point } from '../types';

export function applyTransform(point: Point, x: number, y: number, scaleX: number, scaleY: number, rotation: number): Point {
  const rad = rotation * Math.PI / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  const sx = point.x * scaleX;
  const sy = point.y * scaleY;

  const rx = sx * cos - sy * sin;
  const ry = sx * sin + sy * cos;

  return {
    x: rx + x,
    y: ry + y
  };
}

export function applyInverseTransform(point: Point, x: number, y: number, scaleX: number, scaleY: number, rotation: number): Point {
  const tx = point.x - x;
  const ty = point.y - y;

  const rad = -rotation * Math.PI / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  const rx = tx * cos - ty * sin;
  const ry = tx * sin + ty * cos;

  const sx = scaleX === 0 ? 0 : rx / scaleX;
  const sy = scaleY === 0 ? 0 : ry / scaleY;

  return {
    x: sx,
    y: sy
  };
}

export function getTransformedBoundingBox(
  localMinX: number, 
  localMinY: number, 
  localMaxX: number, 
  localMaxY: number, 
  x: number, 
  y: number, 
  scaleX: number, 
  scaleY: number, 
  rotation: number
) {
  const corners = [
    { x: localMinX, y: localMinY },
    { x: localMaxX, y: localMinY },
    { x: localMinX, y: localMaxY },
    { x: localMaxX, y: localMaxY },
  ].map(p => applyTransform(p, x, y, scaleX, scaleY, rotation));

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  corners.forEach(c => {
    if (c.x < minX) minX = c.x;
    if (c.y < minY) minY = c.y;
    if (c.x > maxX) maxX = c.x;
    if (c.y > maxY) maxY = c.y;
  });

  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}
