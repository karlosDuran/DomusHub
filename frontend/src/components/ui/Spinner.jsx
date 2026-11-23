/**
 * Spinner SVG ligero y rápido (0.65s para mejor percepción de velocidad).
 */
export default function Spinner({ size = 'md', color = 'var(--color-accent)' }) {
  const dim = { sm: 16, md: 22, lg: 36 }[size] ?? 22
  const stroke = { sm: 2, md: 2.25, lg: 2.75 }[size] ?? 2.25
  const r = (dim - stroke * 2) / 2

  return (
    <svg
      width={dim}
      height={dim}
      viewBox={`0 0 ${dim} ${dim}`}
      fill="none"
      role="status"
      aria-label="Cargando"
      className="inline-block shrink-0"
      style={{ animation: 'spin 0.65s linear infinite' }}
    >
      <circle
        cx={dim / 2}
        cy={dim / 2}
        r={r}
        stroke="currentColor"
        strokeOpacity="0.18"
        strokeWidth={stroke}
      />
      <circle
        cx={dim / 2}
        cy={dim / 2}
        r={r}
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={`${r * 1.65} ${r * 100}`}
        transform={`rotate(-90 ${dim / 2} ${dim / 2})`}
      />
    </svg>
  )
}
