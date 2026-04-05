import type React from 'react';

/**
 * SVG icons for toolbar tools — inline, 28×28 rendered (viewBox 20×20), stroke-based.
 * Simple geometric shapes recognizable by children.
 */

const S = {
  width: 28,
  height: 28,
  viewBox: '0 0 20 20',
  fill: 'none',
  xmlns: 'http://www.w3.org/2000/svg',
  style: { flexShrink: 0 } as React.CSSProperties,
} as const;
const stroke = 'currentColor';

/** Select: northwest cursor arrow (classic pointer) */
export function SelectIcon() {
  return (
    <svg {...S}>
      <path
        d="M4 2l1 15 4-4 3 5 2-1-3-5 5-1z"
        fill={stroke}
        stroke={stroke}
        strokeWidth="0.3"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Text: stylized T for text tool */
export function TextIcon() {
  return (
    <svg {...S}>
      <text
        x="7"
        y="15"
        fontSize="15"
        fontWeight="700"
        fontFamily="system-ui, sans-serif"
        fill={stroke}
        textAnchor="middle"
      >
        T
      </text>
      <line x1="2" y1="17" x2="12" y2="17" stroke={stroke} strokeWidth="1.5" />
    </svg>
  );
}

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

/** Homothety: small shape + larger dashed outline */
export function HomothetyIcon() {
  return (
    <svg {...S}>
      <rect x="7" y="7" width="6" height="6" stroke={stroke} strokeWidth="1.5" fill="none" />
      <rect
        x="3"
        y="3"
        width="14"
        height="14"
        stroke={stroke}
        strokeWidth="1.2"
        strokeDasharray="2 2"
        fill="none"
        opacity="0.5"
      />
      <circle cx="10" cy="10" r="1" fill={stroke} />
    </svg>
  );
}

/** Rotation: circular arrow around center point */
export function RotationIcon() {
  return (
    <svg {...S}>
      <circle cx="10" cy="10" r="2" fill={stroke} />
      <path
        d="M10 3a7 7 0 0 1 6.06 3.5"
        stroke={stroke}
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M14.5 3.5l1.56 3-3 1"
        stroke={stroke}
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <path
        d="M10 17a7 7 0 0 1-6.06-3.5"
        stroke={stroke}
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M5.5 16.5l-1.56-3 3-1"
        stroke={stroke}
        strokeWidth="1.3"
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

// ── ActionBar icons (18×18 rendered) ─────────────────────────

const SA = {
  width: 18,
  height: 18,
  viewBox: '0 0 20 20',
  fill: 'none',
  xmlns: 'http://www.w3.org/2000/svg',
  style: { flexShrink: 0 } as React.CSSProperties,
} as const;

/** Undo: curved arrow left */
export function UndoIcon() {
  return (
    <svg {...SA}>
      <path
        d="M5 8h8a4 4 0 0 1 0 8H9"
        stroke={stroke}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <path
        d="M8 5L5 8l3 3"
        stroke={stroke}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

/** Redo: curved arrow right */
export function RedoIcon() {
  return (
    <svg {...SA}>
      <path
        d="M15 8H7a4 4 0 0 0 0 8h4"
        stroke={stroke}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <path
        d="M12 5l3 3-3 3"
        stroke={stroke}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

/** Delete: simplified trash can */
export function DeleteIcon() {
  return (
    <svg {...SA}>
      <path
        d="M4 6h12M8 6V4h4v2M6 6v10h8V6"
        stroke={stroke}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

/** Print: simplified printer */
export function PrintIcon() {
  return (
    <svg {...SA}>
      <path
        d="M6 14H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1h-2"
        stroke={stroke}
        strokeWidth="1.5"
        strokeLinejoin="round"
        fill="none"
      />
      <rect x="6" y="12" width="8" height="5" stroke={stroke} strokeWidth="1.5" fill="none" />
      <path d="M6 8V3h8v5" stroke={stroke} strokeWidth="1.5" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

/** New: blank document with sparkle */
export function NewIcon() {
  return (
    <svg {...SA}>
      <rect
        x="4"
        y="2"
        width="12"
        height="16"
        rx="1"
        stroke={stroke}
        strokeWidth="1.5"
        fill="none"
      />
      {/* Sparkle/star — communicates "new" rather than "add" */}
      <path d="M10 7 L10.8 9.2 L13 10 L10.8 10.8 L10 13 L9.2 10.8 L7 10 L9.2 9.2 Z" fill={stroke} />
    </svg>
  );
}

/** Settings: symmetric 6-tooth gear */
export function SettingsIcon() {
  // Gear with 6 teeth, centered on (10,10), outer r=9, inner r=6.5, tooth width ±15°
  const cx = 10,
    cy = 10,
    ro = 9,
    ri = 6.5,
    teeth = 6,
    hw = 15; // half-width of tooth in degrees
  const step = 360 / teeth;
  const pts: string[] = [];
  for (let i = 0; i < teeth; i++) {
    const a = i * step;
    for (const [deg, r] of [
      [a - hw, ro],
      [a + hw, ro],
      [a + hw, ri],
      [a + step - hw, ri],
      [a + step - hw, ro],
    ] as [number, number][]) {
      const rad = (deg * Math.PI) / 180;
      pts.push(`${cx + r * Math.cos(rad)},${cy + r * Math.sin(rad)}`);
    }
  }
  return (
    <svg {...SA}>
      <polygon
        points={pts.join(' ')}
        stroke={stroke}
        strokeWidth="1.5"
        strokeLinejoin="round"
        fill="none"
      />
      <circle cx="10" cy="10" r="2.5" stroke={stroke} strokeWidth="1.5" fill="none" />
    </svg>
  );
}

/** Fullscreen: four outward corners */
export function FullscreenIcon() {
  return (
    <svg {...SA}>
      <path
        d="M3 7V3h4M13 3h4v4M17 13v4h-4M7 17H3v-4"
        stroke={stroke}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

/** Exit fullscreen: four inward corners */
export function ExitFullscreenIcon() {
  return (
    <svg {...SA}>
      <path
        d="M7 3v4H3M13 3v4h4M17 13h-4v4M3 13h4v4"
        stroke={stroke}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

/** Folder: constructions list */
export function FolderIcon() {
  return (
    <svg {...SA}>
      <path
        d="M3 5a1 1 0 0 1 1-1h4l2 2h6a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5z"
        stroke={stroke}
        strokeWidth="1.5"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

/** Magnet small: squat tilted horseshoe with spark for ActionBar */
export function SnapIconSmall() {
  return (
    <svg {...SA}>
      <g transform="rotate(-25, 10, 11)">
        {/* Horseshoe body — red, squat */}
        <path d="M5 9v1.5a5 5 0 0 0 10 0V9" stroke="#C82828" strokeWidth="2.5" fill="none" />
        {/* Left pole — silver/gray */}
        <rect
          x="3.75"
          y="4"
          width="2.5"
          height="5.5"
          fill="#9CA3AF"
          stroke="#6B7280"
          strokeWidth="0.8"
        />
        {/* Right pole — darker */}
        <rect
          x="13.75"
          y="4"
          width="2.5"
          height="5.5"
          fill="#6B7280"
          stroke="#4A5568"
          strokeWidth="0.8"
        />
      </g>
      {/* Spark — snap attraction */}
      <path
        d="M11.5 3.5l-1.5 2.5h2l-1.5 2.5"
        stroke="#F59E0B"
        strokeWidth="1.2"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ── Toolbar icons (28×28 rendered) ──────────────────────────

/** Magnet: squat tilted horseshoe with spark for toolbar */
export function SnapIcon() {
  return (
    <svg {...S}>
      <g transform="rotate(-25, 10, 11)">
        {/* Horseshoe body — red, squat */}
        <path d="M5 9v1.5a5 5 0 0 0 10 0V9" stroke="#C82828" strokeWidth="3" fill="none" />
        {/* Left pole — silver/gray */}
        <rect
          x="3.5"
          y="3.5"
          width="3"
          height="6"
          fill="#9CA3AF"
          stroke="#6B7280"
          strokeWidth="1"
        />
        {/* Right pole — darker */}
        <rect
          x="13.5"
          y="3.5"
          width="3"
          height="6"
          fill="#6B7280"
          stroke="#4A5568"
          strokeWidth="1"
        />
      </g>
      {/* Spark — snap attraction */}
      <path
        d="M11.5 3l-1.5 2.5h2l-1.5 2.5"
        stroke="#F59E0B"
        strokeWidth="1.4"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
