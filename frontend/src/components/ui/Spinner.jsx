/**
 * Spinner de carga SVG animado.
 *
 * Props:
 *   size  {'sm'|'md'|'lg'}  — sm=16px, md=24px, lg=40px
 *   color {string}          — color del arco (default: var(--color-accent))
 */
export default function Spinner({ size = 'md', color = 'var(--color-accent)' }) {
  const dim = { sm: 16, md: 24, lg: 40 }[size] ?? 24
  const stroke = { sm: 2, md: 2.5, lg: 3 }[size] ?? 2.5
  const r = (dim - stroke * 2) / 2

  return (
    <svg
      width={dim}
      height={dim}
      viewBox={`0 0 ${dim} ${dim}`}
      fill="none"
      role="status"
      aria-label="Cargando"
      style={{ animation: 'spin 0.8s linear infinite', display: 'inline-block', flexShrink: 0 }}
    >
      {/* Pista */}
      <circle
        cx={dim / 2}
        cy={dim / 2}
        r={r}
        stroke="var(--color-border)"
        strokeWidth={stroke}
      />
      {/* Arco animado */}
      <circle
        cx={dim / 2}
        cy={dim / 2}
        r={r}
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={`${r * 1.5} ${r * 100}`}
        strokeDashoffset="0"
        transform={`rotate(-90 ${dim / 2} ${dim / 2})`}
      />
    </svg>
  )
}
