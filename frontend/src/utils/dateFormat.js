/**
 * Formatea una fecha proveniente de DynamoDB (ISO 8601 con posible sufijo #sortKey)
 * o SQLite legacy ('YYYY-MM-DD HH:MM:SS') a formato legible en español.
 */
export function formatFechaHistorial(dateStr) {
  if (!dateStr) return ''
  const clean = String(dateStr).split('#')[0].trim()
  if (!clean) return ''
  const hasTz = /[zZ]$|[+-]\d{2}:\d{2}$/.test(clean)
  const iso = clean.includes('T')
    ? (hasTz ? clean : `${clean}Z`)
    : `${clean.replace(' ', 'T')}Z`
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return clean
  return date.toLocaleString('es-MX', {
    day: '2-digit',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}
