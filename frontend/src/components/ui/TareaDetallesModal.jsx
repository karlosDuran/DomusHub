import { useEffect, useState } from 'react'
import { ClipboardList, Calendar, User, History, Flag, Trash2, RefreshCw } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { formatFechaHistorial } from '../../utils/dateFormat'
import DialogShell from './DialogShell'
import Spinner from './Spinner'

export default function TareaDetallesModal({
  isOpen,
  onClose,
  tarea,
  fetchHistorial,
  usuarios = [],
  onUpdate,
}) {
  const [historial, setHistorial] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const loadHistorial = async () => {
      if (!isOpen || !tarea?.id) {
        setHistorial([])
        return
      }
      setLoading(true)
      try {
        const data = await fetchHistorial(tarea.id)
        setHistorial(data)
      } catch {
        toast.error('Error al cargar el historial.')
      } finally {
        setLoading(false)
      }
    }
    loadHistorial()
  }, [isOpen, tarea, fetchHistorial])

  const handleFieldChange = async (fields) => {
    if (!tarea) return
    await onUpdate(tarea.id, fields)
    try {
      const data = await fetchHistorial(tarea.id)
      setHistorial(data)
    } catch {
      // ignore background refresh error
    }
  }

  if (!tarea) return null

  return (
    <DialogShell
      isOpen={isOpen}
      onClose={onClose}
      title={tarea.titulo}
      subtitle={`En columna: ${tarea.columna_nombre || 'Tablero'}`}
      icon={<ClipboardList size={18} />}
      maxWidth="max-w-[540px]"
    >
      <div className="flex flex-col gap-4">
        {tarea.descripcion && (
          <div className="flex flex-col gap-1.5">
            <h3 className="text-xs font-semibold text-[var(--color-muted)]">Descripción</h3>
            <p className="whitespace-pre-wrap rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)] p-3 text-sm leading-relaxed text-[var(--color-text)]">
              {tarea.descripcion}
            </p>
          </div>
        )}

        {/* Metadatos editables */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)] p-3.5">
          <div className="flex items-center gap-2.5">
            <User size={15} className="shrink-0 text-[var(--color-muted)]" />
            <div className="min-w-0 flex-1">
              <span className="block text-[11px] font-medium text-[var(--color-muted)]">
                Responsable
              </span>
              <select
                value={tarea.asignado_a_user_id || ''}
                onChange={(e) =>
                  handleFieldChange({ asignado_a_user_id: e.target.value || null })
                }
                className="w-full cursor-pointer bg-transparent text-sm font-semibold text-[var(--color-text)] outline-none"
              >
                <option value="">Toda la familia</option>
                {usuarios.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.nombre}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Calendar size={15} className="shrink-0 text-[var(--color-muted)]" />
            <div className="min-w-0 flex-1">
              <span className="block text-[11px] font-medium text-[var(--color-muted)]">
                Vence el
              </span>
              <input
                type="date"
                value={tarea.fecha_vencimiento || ''}
                onChange={(e) =>
                  handleFieldChange({ fecha_vencimiento: e.target.value || null })
                }
                className="font-mono-num w-full cursor-pointer bg-transparent text-sm font-semibold text-[var(--color-text)] outline-none"
              />
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Flag size={15} className="shrink-0 text-[var(--color-muted)]" />
            <div className="min-w-0 flex-1">
              <span className="block text-[11px] font-medium text-[var(--color-muted)]">
                Prioridad
              </span>
              <select
                value={tarea.prioridad || 'media'}
                onChange={(e) => handleFieldChange({ prioridad: e.target.value })}
                className="w-full cursor-pointer bg-transparent text-sm font-semibold text-[var(--color-text)] outline-none"
              >
                <option value="baja">Baja</option>
                <option value="media">Media</option>
                <option value="alta">Alta</option>
                <option value="urgente">Urgente (SNS)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Toggles */}
        <div className="flex flex-col gap-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)] p-3.5">
          <label
            htmlFor="detail-turno-basura"
            className="flex cursor-pointer items-center gap-2.5 text-sm text-[var(--color-text)]"
          >
            <input
              id="detail-turno-basura"
              type="checkbox"
              className="h-4 w-4 shrink-0 cursor-pointer accent-[var(--color-accent)]"
              checked={Number(tarea.es_turno_basura) === 1}
              onChange={(e) =>
                handleFieldChange({ es_turno_basura: e.target.checked ? 1 : 0 })
              }
            />
            <Trash2 size={14} className="shrink-0 text-[var(--color-warning)]" />
            <span>Turno de recolección de basura (aviso SNS)</span>
          </label>

          <label
            htmlFor="detail-recurrente"
            className="flex cursor-pointer items-center gap-2.5 text-sm text-[var(--color-text)]"
          >
            <input
              id="detail-recurrente"
              type="checkbox"
              className="h-4 w-4 shrink-0 cursor-pointer accent-[var(--color-accent)]"
              checked={Number(tarea.es_recurrente) === 1}
              onChange={(e) =>
                handleFieldChange({ es_recurrente: e.target.checked ? 1 : 0 })
              }
            />
            <RefreshCw size={14} className="shrink-0 text-[var(--color-info)]" />
            <span>Tarea recurrente (se reinicia semanalmente)</span>
          </label>
        </div>

        {/* Historial */}
        <div className="pt-1">
          <div className="mb-3 flex items-center gap-2 border-b border-[var(--color-border)] pb-2">
            <History size={15} className="text-[var(--color-accent)]" />
            <h3 className="text-xs font-semibold text-[var(--color-muted)]">
              Historial de cambios
            </h3>
          </div>

          {loading ? (
            <div className="flex items-center gap-2.5 py-3 text-sm text-[var(--color-muted)]">
              <Spinner size="sm" />
              <span>Cargando historial...</span>
            </div>
          ) : historial.length === 0 ? (
            <p className="py-2 text-sm text-[var(--color-muted)]">
              No hay cambios registrados en esta tarea.
            </p>
          ) : (
            <div className="max-h-44 space-y-3 overflow-y-auto pr-1 pl-2">
              {historial.map((h) => (
                <div
                  key={h.id || h.fecha_registro}
                  className="relative border-l border-[var(--color-border-strong)] pl-4"
                >
                  <span className="absolute -left-[4px] top-1.5 h-2 w-2 rounded-full bg-[var(--color-accent)]" />
                  <p className="text-sm font-medium text-[var(--color-text)]">{h.accion}</p>
                  <p className="text-xs text-[var(--color-muted)]">
                    por <strong className="font-semibold text-[var(--color-text)]">{h.usuario_nombre || 'Sistema'}</strong> ·{' '}
                    <span className="font-mono-num">{formatFechaHistorial(h.fecha_registro)}</span>
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DialogShell>
  )
}
