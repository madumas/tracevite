import {
  mmToScreen,
  screenToMm,
  computeInitialZoom,
  clampZoom,
  clampViewport,
  CSS_PX_PER_MM,
  LETTER_WIDTH_MM,
  LETTER_HEIGHT_MM,
} from './viewport';
import type { ViewportState } from '@/model/types';

const viewport: ViewportState = { panX: 0, panY: 0, zoom: 1.0 };

describe('mmToScreen / screenToMm round-trip', () => {
  it('converts and back at zoom 1.0, no pan', () => {
    const screen = mmToScreen(50, 100, viewport, CSS_PX_PER_MM);
    const mm = screenToMm(screen.sx, screen.sy, viewport, CSS_PX_PER_MM);
    expect(mm.x).toBeCloseTo(50);
    expect(mm.y).toBeCloseTo(100);
  });

  it('converts and back at zoom 1.5 with pan', () => {
    const v: ViewportState = { panX: 20, panY: 30, zoom: 1.5 };
    const screen = mmToScreen(70, 80, v, CSS_PX_PER_MM);
    const mm = screenToMm(screen.sx, screen.sy, v, CSS_PX_PER_MM);
    expect(mm.x).toBeCloseTo(70);
    expect(mm.y).toBeCloseTo(80);
  });

  it('handles origin', () => {
    const screen = mmToScreen(0, 0, viewport, CSS_PX_PER_MM);
    expect(screen.sx).toBe(0);
    expect(screen.sy).toBe(0);
  });
});

describe('computeInitialZoom', () => {
  it('returns zoom within valid range', () => {
    const zoom = computeInitialZoom(1366, 600);
    expect(zoom).toBeGreaterThanOrEqual(0.5);
    expect(zoom).toBeLessThanOrEqual(2.0);
  });

  it('fits Letter page in small screen', () => {
    const zoom = computeInitialZoom(800, 500);
    expect(zoom).toBeGreaterThan(0);
    expect(zoom).toBeLessThanOrEqual(2.0);
  });

  it('landscape Letter fills Chromebook width (1366×624)', () => {
    const zoom = computeInitialZoom(1366, 624);
    const pageWidthPx = LETTER_HEIGHT_MM * CSS_PX_PER_MM * zoom; // landscape width
    expect(pageWidthPx).toBeLessThanOrEqual(1366);
    expect(pageWidthPx).toBeGreaterThan(1366 * 0.9); // fills at least 90% of width
  });

  it('landscape Letter fills iPad Pro 11 width (1194×690)', () => {
    const zoom = computeInitialZoom(1194, 690);
    const pageWidthPx = LETTER_HEIGHT_MM * CSS_PX_PER_MM * zoom;
    expect(pageWidthPx).toBeLessThanOrEqual(1194);
    expect(pageWidthPx).toBeGreaterThan(1194 * 0.9);
  });

  it('wider page needs smaller zoom to fill same width', () => {
    const landscape = computeInitialZoom(1366, 624); // 279.4mm wide
    const portrait = computeInitialZoom(1366, 624, LETTER_WIDTH_MM); // 215.9mm wide
    expect(landscape).toBeLessThan(portrait);
  });
});

describe('clampZoom', () => {
  it('clamps below minimum to 0.5', () => {
    expect(clampZoom(0.1)).toBe(0.5);
  });

  it('clamps above maximum to 2.0', () => {
    expect(clampZoom(3.0)).toBe(2.0);
  });

  it('passes through valid zoom', () => {
    expect(clampZoom(1.0)).toBe(1.0);
  });
});

describe('clampViewport', () => {
  it('clamps pan to bounds', () => {
    const v = clampViewport({ panX: -10, panY: 999, zoom: 1.0 });
    // -10 is within valid range [-BOUNDS_WIDTH_MM/2, BOUNDS_WIDTH_MM]
    expect(v.panX).toBe(-10);
    expect(v.panY).toBeLessThanOrEqual(559);
  });

  it('clamps zoom', () => {
    const v = clampViewport({ panX: 0, panY: 0, zoom: 5.0 });
    expect(v.zoom).toBe(2.0);
  });
});
