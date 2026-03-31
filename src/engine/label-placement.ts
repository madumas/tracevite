/**
 * Dynamic label placement for point labels (A, B, C...).
 * Selects among 8 candidate positions around a point to avoid overlapping
 * with angle labels, segment length labels, and other point labels.
 */

export interface Obstacle {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface LabelOffset {
  readonly dx: number;
  readonly dy: number;
  readonly textAnchor: 'start' | 'middle' | 'end';
}

/**
 * Choose the best label offset for a point, avoiding obstacles.
 * Uses 8 cardinal candidate positions and scores each by proximity to obstacles.
 * Returns the position with the lowest overlap score.
 */
export function chooseLabelOffset(
  radiusPx: number,
  labelWidth: number,
  labelHeight: number,
  obstacles: readonly Obstacle[],
): LabelOffset {
  const pad = 4;
  const candidates: Array<LabelOffset & { cx: number; cy: number }> = [
    { dx: radiusPx + pad, dy: -(radiusPx + 2), textAnchor: 'start', cx: 0, cy: 0 }, // upper-right (default)
    { dx: -(radiusPx + pad), dy: -(radiusPx + 2), textAnchor: 'end', cx: 0, cy: 0 }, // upper-left
    { dx: radiusPx + pad, dy: radiusPx + labelHeight, textAnchor: 'start', cx: 0, cy: 0 }, // lower-right
    { dx: -(radiusPx + pad), dy: radiusPx + labelHeight, textAnchor: 'end', cx: 0, cy: 0 }, // lower-left
    { dx: radiusPx + pad + 2, dy: 4, textAnchor: 'start', cx: 0, cy: 0 }, // right
    { dx: -(radiusPx + pad + 2), dy: 4, textAnchor: 'end', cx: 0, cy: 0 }, // left
    { dx: 0, dy: -(radiusPx + labelHeight), textAnchor: 'middle', cx: 0, cy: 0 }, // above
    { dx: 0, dy: radiusPx + labelHeight + 4, textAnchor: 'middle', cx: 0, cy: 0 }, // below
  ];

  // Compute label center for each candidate
  for (const c of candidates) {
    // Text position depends on textAnchor:
    // start: text starts at (dx, dy), center at (dx + w/2, dy - h/2)
    // end: text ends at (dx, dy), center at (dx - w/2, dy - h/2)
    // middle: text centered at (dx, dy), center at (dx, dy - h/2)
    if (c.textAnchor === 'start') {
      c.cx = c.dx + labelWidth / 2;
      c.cy = c.dy - labelHeight / 2;
    } else if (c.textAnchor === 'end') {
      c.cx = c.dx - labelWidth / 2;
      c.cy = c.dy - labelHeight / 2;
    } else {
      c.cx = c.dx;
      c.cy = c.dy - labelHeight / 2;
    }
  }

  if (obstacles.length === 0) {
    const d = candidates[0]!;
    return { dx: d.dx, dy: d.dy, textAnchor: d.textAnchor };
  }

  let bestIdx = 0;
  let bestScore = Infinity;

  for (let i = 0; i < candidates.length; i++) {
    const c = candidates[i]!;
    let score = 0;

    // Label bounding box (relative to point center)
    const lx = c.cx - labelWidth / 2;
    const ly = c.cy - labelHeight / 2;

    for (const obs of obstacles) {
      // Compute overlap area between label bbox and obstacle bbox
      const overlapX = Math.max(
        0,
        Math.min(lx + labelWidth, obs.x + obs.width) - Math.max(lx, obs.x),
      );
      const overlapY = Math.max(
        0,
        Math.min(ly + labelHeight, obs.y + obs.height) - Math.max(ly, obs.y),
      );
      const overlapArea = overlapX * overlapY;
      if (overlapArea > 0) {
        score += overlapArea;
      } else {
        // No overlap — add proximity penalty for nearby obstacles
        const dx = c.cx - (obs.x + obs.width / 2);
        const dy = c.cy - (obs.y + obs.height / 2);
        const distSq = dx * dx + dy * dy;
        if (distSq < 900) {
          // within 30px
          score += 1 / (distSq + 1);
        }
      }
    }

    // Fast path: perfect position found
    if (score === 0) {
      return { dx: c.dx, dy: c.dy, textAnchor: c.textAnchor };
    }

    if (score < bestScore) {
      bestScore = score;
      bestIdx = i;
    }
  }

  const best = candidates[bestIdx]!;
  return { dx: best.dx, dy: best.dy, textAnchor: best.textAnchor };
}
