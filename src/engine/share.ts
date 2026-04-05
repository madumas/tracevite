/**
 * URL sharing — encode/decode construction for link sharing.
 * Same pattern as ResoMolo: lz-string compression in ?s= query param.
 */

import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string';
import QRCode from 'qrcode';
import type { Point, Segment, Circle, ConstructionState, DisplayMode } from '@/model/types';
import { generateId } from '@/model/id';

// === Compact payload format ===

interface SharePayload {
  t?: string; // notes/consigne text
  m?: 's' | 'c'; // mode: simplifie / complet
  g?: number; // grid size mm
  p?: MinPoint[]; // points
  s?: MinSegment[]; // segments (index-based)
  r?: MinCircle[]; // circles
  sc?: string; // segment color override (hex)
}

type MinPoint = [number, number, string] | [number, number, string, true]; // [x, y, label] or [x, y, label, locked]
type MinSegment = [number, number]; // [startPointIndex, endPointIndex]
type MinCircle = [number, number]; // [centerPointIndex, radiusMm]

// === Encoding ===

export function generateShareUrl(state: ConstructionState, segmentColor?: string): string {
  const url = new URL(window.location.origin + window.location.pathname);
  const payload: SharePayload = {};

  if (state.consigne) payload.t = state.consigne;
  if (state.displayMode !== 'simplifie') payload.m = 'c';
  if (state.gridSizeMm !== 5) payload.g = state.gridSizeMm;
  if (segmentColor) payload.sc = segmentColor;

  if (state.points.length > 0) {
    const pointIndexMap = new Map<string, number>();
    payload.p = state.points.map((pt, i) => {
      pointIndexMap.set(pt.id, i);
      return pt.locked
        ? [Math.round(pt.x * 10) / 10, Math.round(pt.y * 10) / 10, pt.label, true]
        : [Math.round(pt.x * 10) / 10, Math.round(pt.y * 10) / 10, pt.label];
    });

    if (state.segments.length > 0) {
      payload.s = state.segments.map((seg) => [
        pointIndexMap.get(seg.startPointId) ?? 0,
        pointIndexMap.get(seg.endPointId) ?? 0,
      ]);
    }

    if (state.circles.length > 0) {
      payload.r = state.circles.map((c) => [
        pointIndexMap.get(c.centerPointId) ?? 0,
        Math.round(c.radiusMm * 10) / 10,
      ]);
    }
  }

  const compressed = compressToEncodedURIComponent(JSON.stringify(payload));
  url.searchParams.set('s', compressed);
  return url.toString();
}

// === Decoding ===

export interface SharedConstruction {
  points: Point[];
  segments: Segment[];
  circles: Circle[];
  consigne: string | null;
  displayMode: DisplayMode;
  gridSizeMm: number;
  segmentColor?: string;
}

export function parseShareParam(search: string): SharedConstruction | null {
  const params = new URLSearchParams(search);
  const s = params.get('s');
  if (s === null) return null;

  try {
    const json = decompressFromEncodedURIComponent(s);
    if (!json) return null;
    const data: SharePayload = JSON.parse(json);

    const points: Point[] = [];
    const segments: Segment[] = [];
    const circles: Circle[] = [];

    if (Array.isArray(data.p)) {
      for (const mp of data.p) {
        points.push({
          id: generateId(),
          x: mp[0],
          y: mp[1],
          label: mp[2],
          locked: mp[3] === true,
        });
      }
    }

    if (Array.isArray(data.s)) {
      for (const ms of data.s) {
        const start = points[ms[0]];
        const end = points[ms[1]];
        if (!start || !end) continue;
        const dx = end.x - start.x;
        const dy = end.y - start.y;
        segments.push({
          id: generateId(),
          startPointId: start.id,
          endPointId: end.id,
          lengthMm: Math.sqrt(dx * dx + dy * dy),
        });
      }
    }

    if (Array.isArray(data.r)) {
      for (const mc of data.r) {
        const center = points[mc[0]];
        if (!center) continue;
        circles.push({
          id: generateId(),
          centerPointId: center.id,
          radiusMm: mc[1],
        });
      }
    }

    return {
      points,
      segments,
      circles,
      consigne: data.t ?? null,
      displayMode: data.m === 'c' ? 'complet' : 'simplifie',
      gridSizeMm: data.g ?? 5,
      segmentColor: data.sc,
    };
  } catch {
    return null;
  }
}

// === QR code generation ===

export async function generateQrDataUrl(url: string): Promise<string> {
  return QRCode.toDataURL(url, {
    width: 320, // 160px at 2x for retina
    margin: 2,
    color: { dark: '#0a7e7a', light: '#FFFFFF' },
  });
}

// === Clipboard helpers ===

export async function copyTextToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    window.prompt('Copier ce lien :', text);
    return true;
  }
}

export async function copyImageToClipboard(dataUrl: string): Promise<boolean> {
  try {
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
    return true;
  } catch {
    window.open(dataUrl, '_blank');
    return false;
  }
}

export function downloadDataUrl(dataUrl: string, filename: string): void {
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = filename;
  a.click();
}
