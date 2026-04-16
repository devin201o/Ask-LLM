import { describe, expect, it } from 'vitest';

import { getScaledDimensions, scaleRegionToImage } from './capture-utils';

describe('capture-utils', () => {
  it('scales CSS pixel bounds into image pixel bounds', () => {
    const bounds = scaleRegionToImage(
      { x: 10, y: 20, width: 100, height: 50 },
      { viewportWidth: 500, viewportHeight: 250, devicePixelRatio: 2 },
      1000,
      500,
    );

    expect(bounds).toEqual({ x: 20, y: 40, width: 200, height: 100 });
  });

  it('downscales oversized crops proportionally', () => {
    expect(getScaledDimensions(2400, 1200, 1600)).toEqual({ width: 1600, height: 800 });
  });
});