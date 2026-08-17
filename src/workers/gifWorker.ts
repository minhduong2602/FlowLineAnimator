import { Encoder } from 'modern-gif';
import { buildPalette, applyPalette, utils } from 'image-q';
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
    const scale = options.scale || 1;
    const width = Math.max(bbox.width, 100) * scale;
    const height = Math.max(bbox.height, 100) * scale;
    const frameCount = Math.floor(options.fps * options.duration);
    const frameDelayMs = Math.floor(1000 / options.fps);
    const transparent = options.transparent;
    const colorPalette = options.colorPalette || 'adaptive';
    const dithering = options.dithering !== false;

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
        const blob = await (await fetch(url)).blob();
        imageCache[url] = await createImageBitmap(blob);
      } catch (err) {
        console.warn('GIF export: failed to load image', url, err);
      }
    }));

    // Canvas Pooling: Initialize one OffscreenCanvas to reuse for all frames
    const canvas = new OffscreenCanvas(width, height);
    const encoder = new Encoder({ width, height });

    let palette: utils.Palette | null = null;
    
    // 1. Progressive Palette Generation
    if (colorPalette === 'adaptive') {
      self.postMessage({ type: 'progress', text: 'Building adaptive color palette...' });
      
      const sampleCount = Math.min(10, frameCount);
      const samplePointContainers = [];
      
      for (let i = 0; i < sampleCount; i++) {
        const frameIndex = Math.floor(i * (frameCount / sampleCount));
        const timeElapsed = frameIndex * (frameDelayMs / 1000);
        
        const offsets: Record<string, number> = {};
        const motionProgress: Record<string, number> = {};
        paths.forEach((p: DrawingPath) => {
          const flowVelocity = (p.flowSpeed || 1.5) * (settings.globalSpeed || 1) * 45;
          // bidirectional accumulates positively; drawPathToCanvas handles the second pass with -offset
          const dir = p.flowDirection === 'reverse' ? 1 : -1;
          offsets[p.id] = timeElapsed * flowVelocity * (p.flowDirection === 'bidirectional' ? 1 : dir);

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
        samplePointContainers.push(utils.PointContainer.fromUint8Array(imageData.data, width, height));
      }
      
      palette = await buildPalette(samplePointContainers, {
        colors: 256,
        colorDistanceFormula: 'euclidean-bt709',
        paletteQuantization: 'neuquant'
      });
      
      // Free sample containers memory
      samplePointContainers.length = 0;
    } else if (colorPalette === 'web-safe') {
      palette = new utils.Palette();
      for (let r = 0; r <= 255; r += 51) {
        for (let g = 0; g <= 255; g += 51) {
          for (let b = 0; b <= 255; b += 51) {
            palette.add(utils.Point.createByRGBA(r, g, b, 255));
          }
        }
      }
      palette.add(utils.Point.createByRGBA(0, 0, 0, 0));
    }

    const ditherAlgo = dithering ? 'floyd-steinberg' : 'nearest';

    // 2. Progressive Streaming
    for (let f = 0; f < frameCount; f++) {
      if (f % 5 === 0) {
        self.postMessage({ type: 'progress', text: `Rendering & Encoding Frame ${f + 1}/${frameCount}...` });
      }

      const timeElapsed = f * (frameDelayMs / 1000);
      const offsets: Record<string, number> = {};
      const motionProgress: Record<string, number> = {};
      
      paths.forEach((p: DrawingPath) => {
        const flowVelocity = (p.flowSpeed || 1.5) * (settings.globalSpeed || 1) * 45;
        // bidirectional accumulates positively; drawPathToCanvas handles the second pass with -offset
        const dir = p.flowDirection === 'reverse' ? 1 : -1;
        offsets[p.id] = timeElapsed * flowVelocity * (p.flowDirection === 'bidirectional' ? 1 : dir);

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

      let outData: Uint8ClampedArray = imageData.data;

      if (colorPalette === 'grayscale') {
        for (let i = 0; i < outData.length; i += 4) {
          const gray = outData[i] * 0.299 + outData[i+1] * 0.587 + outData[i+2] * 0.114;
          outData[i] = gray;
          outData[i+1] = gray;
          outData[i+2] = gray;
        }
      } else if (palette) {
        const pc = utils.PointContainer.fromUint8Array(outData, width, height);
        const outPc = await applyPalette(pc, palette, {
          imageQuantization: ditherAlgo
        });
        outData = new Uint8ClampedArray(outPc.toUint8Array());
      }

      // To guarantee modern-gif accepts the frame, we put it back on the canvas and pass the canvas.
      const outImageData = new ImageData(outData, width, height);
      ctx.putImageData(outImageData, 0, 0);

      await encoder.encode({
        data: canvas as any,
        delay: frameDelayMs,
        transparent
      } as any);
    }

    self.postMessage({ type: 'progress', text: 'Finalizing GIF stream...' });
    const buffer = await encoder.flush();
    const blob = new Blob([buffer], { type: 'image/gif' });
    
    self.postMessage({ type: 'done', id, result: blob });

  } catch (err) {
    self.postMessage({ type: 'error', id, error: err instanceof Error ? err.message : String(err) });
  }
};
