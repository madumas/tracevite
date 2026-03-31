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

/** Reproduce: two offset segments (copy metaphor) */
export function ReproduceIcon() {
  return (
    <svg {...S}>
      <line x1="3" y1="14" x2="11" y2="6" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
      <circle cx="3" cy="14" r="1.5" fill={stroke} />
      <circle cx="11" cy="6" r="1.5" fill={stroke} />
      <line
        x1="9"
        y1="16"
        x2="17"
        y2="8"
        stroke={stroke}
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.5"
      />
      <circle cx="9" cy="16" r="1.5" fill={stroke} opacity="0.5" />
      <circle cx="17" cy="8" r="1.5" fill={stroke} opacity="0.5" />
    </svg>
  );
}

/** Perpendicular: two lines at 90° with right-angle square marker */
export function PerpendicularIcon() {
  return (
    <svg {...S}>
      <line x1="4" y1="16" x2="4" y2="3" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
      <line x1="4" y1="16" x2="17" y2="16" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
      <rect x="4" y="12" width="4" height="4" stroke={stroke} strokeWidth="1" fill="none" />
    </svg>
  );
}

/** Parallel: two parallel diagonal lines */
export function ParallelIcon() {
  return (
    <svg {...S}>
      <line x1="3" y1="15" x2="13" y2="5" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
      <line x1="7" y1="17" x2="17" y2="7" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/** Translation: source dot → dashed arrow → destination dot */
export function TranslationIcon() {
  return (
    <svg {...S}>
      <circle cx="4" cy="14" r="2" fill={stroke} />
      <circle cx="16" cy="6" r="2" fill={stroke} opacity="0.5" />
      <line x1="4" y1="14" x2="16" y2="6" stroke={stroke} strokeWidth="1.5" strokeDasharray="2 2" />
      <path
        d="M13 4l3 2-3 2"
        stroke={stroke}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

/** Symmetry: vertical dashed axis with mirrored dots */
export function SymmetryIcon() {
  return (
    <svg {...S}>
      <line
        x1="10"
        y1="2"
        x2="10"
        y2="18"
        stroke={stroke}
        strokeWidth="1.5"
        strokeDasharray="3 2"
      />
      <circle cx="5" cy="7" r="2" fill={stroke} />
      <circle cx="15" cy="7" r="2" fill={stroke} opacity="0.5" />
      <circle cx="6" cy="14" r="2" fill={stroke} />
      <circle cx="14" cy="14" r="2" fill={stroke} opacity="0.5" />
    </svg>
  );
}

/** Frieze: three small shapes in a row with an arrow */
export function FriezeIcon() {
  return (
    <svg {...S}>
      <polygon points="1,16 5,8 9,16" stroke={stroke} strokeWidth="1.5" fill="none" />
      <polygon
        points="6,16 10,8 14,16"
        stroke={stroke}
        strokeWidth="1.5"
        fill="none"
        opacity="0.6"
      />
      <polygon
        points="11,16 15,8 19,16"
        stroke={stroke}
        strokeWidth="1.5"
        fill="none"
        opacity="0.3"
      />
      <line x1="2" y1="4" x2="16" y2="4" stroke={stroke} strokeWidth="1" strokeDasharray="2 1" />
      <path
        d="M14 2l2 2-2 2"
        stroke={stroke}
        strokeWidth="1"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

/** Compare: two overlapping squares suggesting superposition */
export function CompareIcon() {
  return (
    <svg {...S}>
      <rect x="2" y="6" width="10" height="10" stroke={stroke} strokeWidth="1.5" fill="none" />
      <rect
        x="8"
        y="4"
        width="10"
        height="10"
        stroke={stroke}
        strokeWidth="1.5"
        fill="none"
        strokeDasharray="3 2"
      />
    </svg>
  );
}

/** Magnet: U-shape for snap toggle */
export function SnapIcon() {
  return (
    <svg {...S}>
      <path
        d="M5 4v8a5 5 0 0 0 10 0V4"
        stroke={stroke}
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />
      <line x1="5" y1="4" x2="5" y2="2" stroke={stroke} strokeWidth="3" strokeLinecap="round" />
      <line x1="15" y1="4" x2="15" y2="2" stroke={stroke} strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
