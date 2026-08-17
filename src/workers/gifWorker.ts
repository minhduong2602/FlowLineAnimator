import { Encoder } from 'modern-gif';
import { calculateBoundingBox, renderArtboardToCanvas } from '../utils/bezier';
import { DrawingPath } from '../types';

if (typeof document === 'undefined') {
  (globalThis as any).document = {
    createElement: (tag: string) => {
      if (tag === 'canvas') return new OffscreenCanvas(1, 1);
      return {};
    }
  };
}

self.onmessage = async (e: MessageEvent) => {
  const id = e.data?.id;
  try {
    const { paths, settings, options } = e.data;
    
    const bbox = calculateBoundingBox(paths as DrawingPath[]);
    const scale = Math.max(0.1, options.scale || 1);
    const width = Math.max(10, Math.round(bbox.width * scale));
    const height = Math.max(10, Math.round(bbox.height * scale));
    const frameCount = Math.max(1, Math.floor(options.fps * options.duration));
    const frameDelayMs = Math.max(10, Math.floor(1000 / options.fps));
    const transparent = Boolean(options.transparent);

    // Workers have no Image constructor — decode pasted/linked images into bitmaps up front
    const imageCache: Record<string, ImageBitmap> = {};
    const imageUrls = new Set<string>(
      (paths as DrawingPath[])
        .filter(p => p.type === 'image' && p.imageUrl)
        .map(p => p.imageUrl as string)
    );
    const motionIds = new Set(
      (paths as DrawingPath[]).filter(p => p.motionObjectId).map(p => p.motionObjectId as string)
    );
    (paths as DrawingPath[]).forEach(p => {
      if (motionIds.has(p.id) && p.type === 'image' && p.imageUrl) imageUrls.add(p.imageUrl);
    });

    await Promise.all(Array.from(imageUrls).map(async url => {
      try {
        const res = await fetch(url);
        const blob = await res.blob();
        imageCache[url] = await createImageBitmap(blob);
      } catch (err) {
        console.warn('GIF export: failed to load image', url, err);
      }
    }));

    // Single reusable OffscreenCanvas
    const canvas = new OffscreenCanvas(width, height);
    const encoder = new Encoder({
      width,
      height,
      maxColors: 256
    });

    // Progressive frame rendering and encoding
    for (let f = 0; f < frameCount; f++) {
      if (f % 5 === 0 || f === frameCount - 1) {
        self.postMessage({
          type: 'progress',
          text: `Rendering & Encoding Frame ${f + 1}/${frameCount}...`
        });
      }

      const timeElapsed = f * (frameDelayMs / 1000);
      const offsets: Record<string, number> = {};
      const motionProgress: Record<string, number> = {};
      
      paths.forEach((p: DrawingPath) => {
        const flowVelocity = (p.flowSpeed || 1.5) * (settings.globalSpeed || 1) * 45;
        const dir = p.flowDirection === 'reverse' ? 1 : -1;
        offsets[p.id] = timeElapsed * flowVelocity * dir;

        const motionSpeed = (p.motionSpeed || 1) * (settings.globalSpeed || 1);
        const duration = Math.max(0.5, 20 / motionSpeed);
        motionProgress[p.id] = (timeElapsed % duration) / duration;
      });

      renderArtboardToCanvas(
        canvas as any,
        paths,
        offsets,
        settings.backgroundColor,
        settings.showGrid,
        transparent,
        { x: -bbox.x, y: -bbox.y },
        scale,
        motionProgress,
        timeElapsed,
        settings.globalSpeed || 1,
        settings.gridSize,
        imageCache
      );

      const ctx = canvas.getContext('2d', { willReadFrequently: true }) as OffscreenCanvasRenderingContext2D;
      const imageData = ctx.getImageData(0, 0, width, height);

      // Encode frame directly with modern-gif
      await encoder.encode({
        data: imageData.data,
        delay: frameDelayMs,
        transparent
      } as any);
    }

    self.postMessage({ type: 'progress', text: 'Finalizing GIF stream...' });
    const buffer = await encoder.flush();
    const blob = new Blob([buffer], { type: 'image/gif' });
    
    // Clean up cached bitmaps
    Object.values(imageCache).forEach(bitmap => {
      try {
        bitmap.close();
      } catch (_) {}
    });

    self.postMessage({ type: 'done', id, result: blob });

  } catch (err) {
    self.postMessage({ type: 'error', id, error: err instanceof Error ? err.message : String(err) });
  }
};
