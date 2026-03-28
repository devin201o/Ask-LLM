import type { CaptureBounds, CaptureViewport } from './types';

export interface ImagePixelBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function scaleRegionToImage(
  region: CaptureBounds,
  viewport: CaptureViewport,
  imageWidth: number,
  imageHeight: number,
): ImagePixelBounds {
  const scaleX = imageWidth / viewport.viewportWidth;
  const scaleY = imageHeight / viewport.viewportHeight;

  const x = Math.max(0, Math.floor(region.x * scaleX));
  const y = Math.max(0, Math.floor(region.y * scaleY));
  const width = Math.max(1, Math.ceil(region.width * scaleX));
  const height = Math.max(1, Math.ceil(region.height * scaleY));

  return {
    x,
    y,
    width: Math.min(width, imageWidth - x),
    height: Math.min(height, imageHeight - y),
  };
}

export function getScaledDimensions(width: number, height: number, maxSide: number) {
  if (width <= maxSide && height <= maxSide) {
    return { width, height };
  }

  const scale = maxSide / Math.max(width, height);

  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}