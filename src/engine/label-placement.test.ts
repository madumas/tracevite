import { chooseLabelOffset, chooseAngleLabelPosition, type Obstacle } from './label-placement';

const RADIUS = 11.34; // POINT_DISPLAY_RADIUS_MM * CSS_PX_PER_MM
const LABEL_W = 8; // ~1 char at 14px
const LABEL_H = 17; // 14px * 1.2

describe('chooseLabelOffset', () => {
  it('returns default upper-right when no obstacles', () => {
    const result = chooseLabelOffset(RADIUS, LABEL_W, LABEL_H, []);
    expect(result.dx).toBeCloseTo(RADIUS + 4);
    expect(result.dy).toBeCloseTo(-(RADIUS + 2));
    expect(result.textAnchor).toBe('start');
  });

  it('avoids obstacle in upper-right', () => {
    // Place obstacle exactly where the default label would go
    const obstacle: Obstacle = {
      x: RADIUS + 4,
      y: -(RADIUS + 2) - LABEL_H,
      width: LABEL_W,
      height: LABEL_H,
    };
    const result = chooseLabelOffset(RADIUS, LABEL_W, LABEL_H, [obstacle]);
    // Should pick a different position
    expect(result.dx).not.toBeCloseTo(RADIUS + 4);
  });

  it('avoids two obstacles (upper-right + upper-left)', () => {
    const obstacles: Obstacle[] = [
      { x: RADIUS + 4, y: -(RADIUS + 2) - LABEL_H, width: LABEL_W, height: LABEL_H },
      { x: -(RADIUS + 4) - LABEL_W, y: -(RADIUS + 2) - LABEL_H, width: LABEL_W, height: LABEL_H },
    ];
    const result = chooseLabelOffset(RADIUS, LABEL_W, LABEL_H, obstacles);
    // Should pick lower-right, right, or below — not upper positions
    expect(result.dy).toBeGreaterThan(0);
  });

  it('returns least-bad position when all 8 are blocked', () => {
    // Surround the point with obstacles in all directions
    const obstacles: Obstacle[] = [];
    for (let angle = 0; angle < 2 * Math.PI; angle += Math.PI / 4) {
      obstacles.push({
        x: Math.cos(angle) * 20 - 5,
        y: Math.sin(angle) * 20 - 8,
        width: 10,
        height: 16,
      });
    }
    // Should not crash — returns something
    const result = chooseLabelOffset(RADIUS, LABEL_W, LABEL_H, obstacles);
    expect(result.textAnchor).toBeDefined();
  });

  it('handles wider label (AA, AB)', () => {
    const wideLabel = 16; // 2 chars
    const result = chooseLabelOffset(RADIUS, wideLabel, LABEL_H, []);
    expect(result.dx).toBeCloseTo(RADIUS + 4);
  });

  it('is deterministic (same inputs → same output)', () => {
    const obstacles: Obstacle[] = [
      { x: 15, y: -15, width: 10, height: 16 },
      { x: -25, y: -15, width: 10, height: 16 },
    ];
    const r1 = chooseLabelOffset(RADIUS, LABEL_W, LABEL_H, obstacles);
    const r2 = chooseLabelOffset(RADIUS, LABEL_W, LABEL_H, obstacles);
    expect(r1.dx).toBe(r2.dx);
    expect(r1.dy).toBe(r2.dy);
    expect(r1.textAnchor).toBe(r2.textAnchor);
  });
});

describe('chooseAngleLabelPosition', () => {
  const VX = 200;
  const VY = 200;
  const MID = Math.PI / 4; // 45°
  const LW = 25;
  const LH = 14;

  it('returns default (34, midAngle) when no obstacles', () => {
    const result = chooseAngleLabelPosition(VX, VY, MID, LW, LH, []);
    expect(result.radius).toBe(34);
    expect(result.angle).toBe(MID);
  });

  it('pushes to larger radius when default overlaps', () => {
    // Place obstacle exactly at default label position
    const cx = VX + Math.cos(MID) * 34;
    const cy = VY + Math.sin(MID) * 34;
    const obstacle: Obstacle = { x: cx - 12, y: cy - 7, width: 25, height: 14 };
    const result = chooseAngleLabelPosition(VX, VY, MID, LW, LH, [obstacle]);
    expect(result.radius).not.toBe(34);
  });

  it('shifts angle when all radii in same direction are blocked', () => {
    // Block all 3 radii on the midAngle direction
    const obstacles: Obstacle[] = [34, 48, 62].map((r) => {
      const cx = VX + Math.cos(MID) * r;
      const cy = VY + Math.sin(MID) * r;
      return { x: cx - 12, y: cy - 7, width: 25, height: 14 };
    });
    const result = chooseAngleLabelPosition(VX, VY, MID, LW, LH, obstacles);
    // Should use an angular offset
    expect(Math.abs(result.angle - MID)).toBeGreaterThan(0.1);
  });

  it('returns best option when all 9 candidates have obstacles', () => {
    const obstacles: Obstacle[] = [];
    for (const r of [34, 48, 62]) {
      for (const da of [0, -0.26, 0.26]) {
        const a = MID + da;
        const cx = VX + Math.cos(a) * r;
        const cy = VY + Math.sin(a) * r;
        obstacles.push({ x: cx - 12, y: cy - 7, width: 25, height: 14 });
      }
    }
    const result = chooseAngleLabelPosition(VX, VY, MID, LW, LH, obstacles);
    expect(result.radius).toBeDefined();
    expect(result.angle).toBeDefined();
  });
});
