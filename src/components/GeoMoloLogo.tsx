/** Logo typographique GéoMolo — pur CSS, aucun SVG externe. */

export function GeoMoloLogo({ height = 32 }: { height?: number }) {
  const fontSize = height * 0.75;
  return (
    <span
      aria-label="GéoMolo"
      role="img"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        height,
        fontFamily: "'Nunito Sans', 'Avenir Next', 'Segoe UI', system-ui, sans-serif",
        fontSize,
        lineHeight: 1,
        letterSpacing: '-0.02em',
        userSelect: 'none',
        whiteSpace: 'nowrap',
      }}
    >
      <span style={{ fontWeight: 600, color: '#0a7e7a' }}>Géo</span>
      <span style={{ fontWeight: 800, color: '#0ea5a0' }}>Molo</span>
    </span>
  );
}
