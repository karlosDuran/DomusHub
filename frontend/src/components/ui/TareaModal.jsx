import { useEffect, useState } from 'react'
import { ClipboardList, Trash2, RefreshCw } from 'lucide-react'
import { toast } from 'react-hot-toast'
import DialogShell from './DialogShell'
import Spinner from './Spinner'

const OPCIONES_PRIORIDAD = [
  { value: 'baja',    label: 'Baja' },
  { value: 'media',   label: 'Media' },
  { value: 'alta',    label: 'Alta' },
  { value: 'urgente', label: 'Urgente (aviso SNS)' },
]

/**
 * TareaModal — Modal para Crear y Editar tareas del Kanban.
 */
export default function TareaModal({
  isOpen,
  onClose,
  onSave,
  tarea,
  columnas = [],
  columnaInicial,
  usuarios = [],
  currentUserId,
}) {
  const isEdit = !!tarea

  const [form, setForm] = useState({
    titulo: '',
    descripcion: '',
    columna_id: '',
    prioridad: 'media',
    es_recurrente: 0,
    es_turno_basura: 0,
    fecha_vencimiento: '',
    asignado_a_user_id: '',
  })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const sync = async () => {
      if (!isOpen) return
      if (tarea) {
        setForm({
          titulo: tarea.titulo ?? '',
          descripcion: tarea.descripcion ?? '',
          columna_id: tarea.columna_id ? String(tarea.columna_id) : '',
          prioridad: tarea.prioridad || 'media',
          es_recurrente: Number(tarea.es_recurrente) === 1 ? 1 : 0,
          es_turno_basura: Number(tarea.es_turno_basura) === 1 ? 1 : 0,
          fecha_vencimiento: tarea.fecha_vencimiento ?? '',
          asignado_a_user_id: tarea.asignado_a_user_id ? String(tarea.asignado_a_user_id) : '',
        })
      } else {
        setForm({
          titulo: '',
          descripcion: '',
          columna_id: String(columnaInicial ?? columnas[0]?.id ?? ''),
          prioridad: 'media',
          es_recurrente: 0,
          es_turno_basura: 0,
          fecha_vencimiento: '',
          asignado_a_user_id: currentUserId ? String(currentUserId) : '',
        })
      }
    }
    sync()
  }, [isOpen, tarea, columnaInicial, columnas, currentUserId])

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? (checked ? 1 : 0) : value,
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.titulo.trim()) {
      toast.error('El título de la tarea es obligatorio.')
      return
    }
    if (!form.columna_id) {
      toast.error('La columna es obligatoria.')
      return
    }

    setSubmitting(true)
    try {
      const payload = {
        ...form,
        titulo: form.titulo.trim(),
        columna_id: String(form.columna_id),
        asignado_a_user_id: form.asignado_a_user_id ? String(form.asignado_a_user_id) : null,
        fecha_vencimiento: form.fecha_vencimiento || null,
      }
      await onSave(payload)
      onClose()
    } catch (err) {
      const msg =
        err.response?.data?.errors?.[0] ??
        err.response?.data?.error ??
        'Error al guardar la tarea.'
      toast.error(msg)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <DialogShell
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? 'Editar tarea' : 'Nueva tarea'}
      icon={<ClipboardList size={18} />}
      maxWidth="max-w-[500px]"
      footer={
        <>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={onClose}
            disabled={submitting}
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="tarea-form"
            className="btn btn-primary"
            disabled={submitting}
          >
            {submitting && <Spinner size="sm" color="currentColor" />}
            {isEdit ? 'Guardar cambios' : 'Crear tarea'}
          </button>
        </>
      }
    >
      <form id="tarea-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="task-titulo" className="text-xs font-medium text-[var(--color-muted)]">
            Título *
          </label>
          <input
            id="task-titulo"
            name="titulo"
            type="text"
            className="input"
            placeholder="Ej. Sacar la basura, Lavar trastes"
            value={form.titulo}
            onChange={handleChange}
            required
            disabled={submitting}
            autoComplete="off"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="task-desc" className="text-xs font-medium text-[var(--color-muted)]">
            Descripción
          </label>
          <textarea
            id="task-desc"
            name="descripcion"
            className="input min-h-[72px] resize-y"
            placeholder="Detalles adicionales o instrucciones para el hogar"
            rows={2}
            value={form.descripcion}
            onChange={handleChange}
            disabled={submitting}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="task-columna" className="text-xs font-medium text-[var(--color-muted)]">
              Columna
            </label>
            <select
              id="task-columna"
              name="columna_id"
              className="input"
              value={form.columna_id}
              onChange={handleChange}
              disabled={submitting}
            >
              {columnas.map((col) => (
                <option key={col.id} value={col.id}>
                  {col.nombre}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="task-prioridad" className="text-xs font-medium text-[var(--color-muted)]">
              Prioridad
            </label>
            <select
              id="task-prioridad"
              name="prioridad"
              className="input"
              value={form.prioridad}
              onChange={handleChange}
              disabled={submitting}
            >
              {OPCIONES_PRIORIDAD.map(({ value, label }) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="task-asignado" className="text-xs font-medium text-[var(--color-muted)]">
              Responsable
            </label>
            <select
              id="task-asignado"
              name="asignado_a_user_id"
              className="input"
              value={form.asignado_a_user_id}
              onChange={handleChange}
              disabled={submitting}
            >
              <option value="">Toda la familia</option>
              {usuarios.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nombre}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="task-fecha" className="text-xs font-medium text-[var(--color-muted)]">
              Fecha límite
            </label>
            <input
              id="task-fecha"
              name="fecha_vencimiento"
              type="date"
              className="input font-mono-num"
              value={form.fecha_vencimiento}
              onChange={handleChange}
              disabled={submitting}
            />
          </div>
        </div>

        {/* Toggles de basura y recurrencia */}
        <div className="flex flex-col gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)] p-3">
          <label
            htmlFor="task-turno-basura"
            className="flex cursor-pointer items-start gap-2.5 text-sm text-[var(--color-text)]"
          >
            <input
              id="task-turno-basura"
              name="es_turno_basura"
              type="checkbox"
              className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-[var(--color-accent)]"
              checked={form.es_turno_basura === 1}
              onChange={handleChange}
              disabled={submitting}
            />
            <span className="flex items-center gap-1.5 leading-snug">
              <Trash2 size={14} className="shrink-0 text-[var(--color-warning)]" />
              Turno de recolección de basura (aviso SNS al responsable)
            </span>
          </label>

          <label
            htmlFor="task-recurrente"
            className="flex cursor-pointer items-start gap-2.5 text-sm text-[var(--color-text)]"
          >
            <input
              id="task-recurrente"
              name="es_recurrente"
              type="checkbox"
              className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-[var(--color-accent)]"
              checked={form.es_recurrente === 1}
              onChange={handleChange}
              disabled={submitting}
            />
            <span className="flex items-center gap-1.5 leading-snug">
              <RefreshCw size={14} className="shrink-0 text-[var(--color-info)]" />
              Tarea recurrente (se reinicia cada lunes)
            </span>
          </label>
        </div>
      </form>
    </DialogShell>
  )
}
