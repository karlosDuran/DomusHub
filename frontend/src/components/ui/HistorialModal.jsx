import { useEffect, useState } from 'react'
import { Clock, AlertTriangle } from 'lucide-react'
import { formatFechaHistorial } from '../../utils/dateFormat'
import DialogShell from './DialogShell'
import Spinner from './Spinner'

/**
 * HistorialModal — Despliega el historial de movimientos/auditoría de una tarea.
 */
export default function HistorialModal({ isOpen, onClose, tarea, fetchHistorial }) {
  const [historial, setHistorial] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    const loadData = async () => {
      if (isOpen && tarea?.id) {
        setLoading(true)
        setError(null)
        try {
          const res = await fetchHistorial(tarea.id)
          setHistorial(res)
        } catch (err) {
          setError(err.response?.data?.error ?? err.message ?? 'Error al cargar el historial.')
        } finally {
          setLoading(false)
        }
      }
    }
    loadData()
  }, [isOpen, tarea, fetchHistorial])

  return (
    <DialogShell
      isOpen={isOpen}
      onClose={onClose}
      title="Historial de auditoría"
      subtitle={tarea?.titulo}
      icon={<Clock size={18} />}
      maxWidth="max-w-[460px]"
      footer={
        <button type="button" className="btn btn-ghost" onClick={onClose}>
          Cerrar
        </button>
      }
    >
      <div className="min-h-[140px]">
        {loading && (
          <div className="flex flex-col items-center justify-center gap-3 py-10 text-sm text-[var(--color-muted)]">
            <Spinner size="md" />
            <span>Cargando historial...</span>
          </div>
        )}

        {!loading && error && (
          <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
            <AlertTriangle size={22} className="text-[var(--color-danger)]" />
            <p className="text-sm text-[var(--color-danger-text)]">{error}</p>
          </div>
        )}

        {!loading && !error && historial.length === 0 && (
          <p className="py-10 text-center text-sm text-[var(--color-muted)]">
            No se registran movimientos para esta tarea.
          </p>
        )}

        {!loading && !error && historial.length > 0 && (
          <div className="space-y-4 pl-2">
            {historial.map((item, idx) => (
              <div
                key={item.id || idx}
                className="relative border-l border-[var(--color-border-strong)] pl-4 pb-1 last:border-l-transparent"
              >
                <span className="absolute -left-[4.5px] top-1.5 h-2 w-2 rounded-full bg-[var(--color-accent)]" />
                <p className="text-sm font-medium text-[var(--color-text)]">{item.accion}</p>
                <p className="mt-0.5 text-xs text-[var(--color-muted)]">
                  Por <strong className="font-semibold text-[var(--color-text)]">{item.usuario_nombre ?? 'Sistema'}</strong> ·{' '}
                  <span className="font-mono-num">{formatFechaHistorial(item.fecha_registro)}</span>
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </DialogShell>
  )
}
