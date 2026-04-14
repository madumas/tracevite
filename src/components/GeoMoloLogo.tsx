/** Logo typographique GéoMolo — pur CSS, aucun SVG externe. */

export function GeoMoloLogo({ height = 32 }: { height?: number }) {
  const fontSize = height * 0.75;
  return (
    <h1
      aria-label="GéoMolo"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        height,
        margin: 0,
        padding: 0,
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
    </h1>
  );
}
