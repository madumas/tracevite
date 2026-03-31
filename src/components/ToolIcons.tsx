/**
 * SVG icons for toolbar tools — inline, 20×20, stroke-based.
 * Simple geometric shapes recognizable by children.
 */

const S = {
  width: 20,
  height: 20,
  viewBox: '0 0 20 20',
  fill: 'none',
  xmlns: 'http://www.w3.org/2000/svg',
} as const;
const stroke = 'currentColor';

/** Segment: diagonal line with dots at endpoints */
export function SegmentIcon() {
  return (
    <svg {...S}>
      <line x1="3" y1="17" x2="17" y2="3" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
      <circle cx="3" cy="17" r="2" fill={stroke} />
      <circle cx="17" cy="3" r="2" fill={stroke} />
    </svg>
  );
}

/** Point: single dot */
export function PointIcon() {
  return (
    <svg {...S}>
      <circle cx="10" cy="10" r="4" fill={stroke} />
    </svg>
  );
}

/** Circle: circle outline */
export function CircleIcon() {
  return (
    <svg {...S}>
      <circle cx="10" cy="10" r="7" stroke={stroke} strokeWidth="2" />
      <circle cx="10" cy="10" r="1.5" fill={stroke} />
    </svg>
  );
}

/** Move: four-direction arrow */
export function MoveIcon() {
  return (
    <svg {...S}>
      <path
        d="M10 3v14M3 10h14M10 3l-3 3M10 3l3 3M10 17l-3-3M10 17l3-3M3 10l3-3M3 10l3 3M17 10l-3-3M17 10l-3 3"
        stroke={stroke}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Reflection: mirror axis with symmetric dots */
export function ReflectionIcon() {
  return (
    <svg {...S}>
      <line
        x1="10"
        y1="2"
        x2="10"
        y2="18"
        stroke={stroke}
        strokeWidth="1.5"
        strokeDasharray="2 2"
      />
      <circle cx="5" cy="7" r="2" fill={stroke} />
      <circle cx="15" cy="7" r="2" fill={stroke} opacity="0.5" />
      <circle cx="5" cy="13" r="2" fill={stroke} />
      <circle cx="15" cy="13" r="2" fill={stroke} opacity="0.5" />
    </svg>
  );
}

/** Measure/Length: ruler with marks */
export function LengthIcon() {
  return (
    <svg {...S}>
      <rect x="2" y="7" width="16" height="6" rx="1" stroke={stroke} strokeWidth="1.5" />
      <line x1="5" y1="7" x2="5" y2="10" stroke={stroke} strokeWidth="1" />
      <line x1="8" y1="7" x2="8" y2="11" stroke={stroke} strokeWidth="1" />
      <line x1="11" y1="7" x2="11" y2="10" stroke={stroke} strokeWidth="1" />
      <line x1="14" y1="7" x2="14" y2="11" stroke={stroke} strokeWidth="1" />
    </svg>
  );
}
