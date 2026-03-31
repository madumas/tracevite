/**
 * Shared label position calculations — used by both rendering layers
 * and the label-placement obstacle collector to avoid formula duplication.
 */

const ARC_RADIUS_PX = 22;
const ARC_LABEL_OFFSET = 12;

/**
 * Compute the screen position of an angle degree label.
 * Mirrors the formula in AngleLayer.tsx lines 180-185.
 */
export function getAngleLabelPosition(
  vertexScreenX: number,
  vertexScreenY: number,
  startAngle: number,
  ccwSweep: number,
): { x: number; y: number } {
  const useSmallArc = ccwSweep <= Math.PI;
  const midAngle = useSmallArc
    ? startAngle + ccwSweep / 2
    : startAngle - (2 * Math.PI - ccwSweep) / 2;
  const labelR = ARC_RADIUS_PX + ARC_LABEL_OFFSET;
  return {
    x: vertexScreenX + Math.cos(midAngle) * labelR,
    y: vertexScreenY + Math.sin(midAngle) * labelR,
  };
}

/**
 * Compute the screen position of a segment length label.
 * Mirrors the formula in SegmentLayer.tsx lines 115-126.
 */
export function getSegmentLabelPosition(
  sx1: number,
  sy1: number,
  sx2: number,
  sy2: number,
): { x: number; y: number } {
  const midX = (sx1 + sx2) / 2;
  const midY = (sy1 + sy2) / 2;
  const dx = sx2 - sx1;
  const dy = sy2 - sy1;
  const len = Math.sqrt(dx * dx + dy * dy);
  const offsetX = len > 0 ? (-dy / len) * 14 : 0;
  const offsetY = len > 0 ? (dx / len) * 14 : -14;
  return { x: midX + offsetX, y: midY + offsetY };
}
