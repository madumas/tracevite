/**
 * Generate a small SVG thumbnail for a construction slot.
 * Returns an SVG data URI (<1KB typically), or '' if empty.
 */

import type { ConstructionState } from '@/model/types';

const THUMB_WIDTH = 120;
const THUMB_HEIGHT = 80;
const PADDING_MM = 5;
const STROKE_COLOR = '#0a7e7a';

export function generateThumbnail(state: ConstructionState): string {
  if (state.points.length === 0) return '';

  // Compute bounding box of all points
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  for (const p of state.points) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }

  // Include circles: center +/- radius
  const pointMap = new Map(state.points.map((p) => [p.id, p]));
  for (const c of state.circles) {
    const center = pointMap.get(c.centerPointId);
    if (!center) continue;
    if (center.x - c.radiusMm < minX) minX = center.x - c.radiusMm;
    if (center.y - c.radiusMm < minY) minY = center.y - c.radiusMm;
    if (center.x + c.radiusMm > maxX) maxX = center.x + c.radiusMm;
    if (center.y + c.radiusMm > maxY) maxY = center.y + c.radiusMm;
  }

  // Apply padding
  minX -= PADDING_MM;
  minY -= PADDING_MM;
  maxX += PADDING_MM;
  maxY += PADDING_MM;

  const vbW = maxX - minX || 1;
  const vbH = maxY - minY || 1;

  // Build SVG elements
  const elements: string[] = [];

  // Segments as <line>
  for (const seg of state.segments) {
    const p1 = pointMap.get(seg.startPointId);
    const p2 = pointMap.get(seg.endPointId);
    if (!p1 || !p2) continue;
    elements.push(
      `<line x1="${p1.x}" y1="${p1.y}" x2="${p2.x}" y2="${p2.y}" stroke="${STROKE_COLOR}" stroke-width="${vbW * 0.008}" stroke-linecap="round"/>`,
    );
  }

  // Circles as <circle>
  for (const c of state.circles) {
    const center = pointMap.get(c.centerPointId);
    if (!center) continue;
    elements.push(
      `<circle cx="${center.x}" cy="${center.y}" r="${c.radiusMm}" fill="none" stroke="${STROKE_COLOR}" stroke-width="${vbW * 0.006}"/>`,
    );
  }

  // Points as small filled circles
  const pointR = vbW * 0.012;
  for (const p of state.points) {
    elements.push(`<circle cx="${p.x}" cy="${p.y}" r="${pointR}" fill="${STROKE_COLOR}"/>`);
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${THUMB_WIDTH}" height="${THUMB_HEIGHT}" viewBox="${minX} ${minY} ${vbW} ${vbH}" preserveAspectRatio="xMidYMid meet">${elements.join('')}</svg>`;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
