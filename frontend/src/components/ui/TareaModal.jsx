import { useEffect, useRef, useState } from 'react'
import { X, ClipboardList, Trash2 } from 'lucide-react'
import { toast } from 'react-hot-toast'
import Spinner from './Spinner'

const OPCIONES_PRIORIDAD = [
  { value: 'baja',    label: 'Baja' },
  { value: 'media',   label: 'Media' },
  { value: 'alta',    label: 'Alta' },
  { value: 'urgente', label: 'Urgente (notifica por correo SNS)' },
]

/**
 * TareaModal — Modal para Crear y Editar tareas del Kanban (compatible con DynamoDB + SNS).
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
  const dialogRef = useRef(null)
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
      if (isOpen) {
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
    }
    sync()
  }, [isOpen, tarea, columnaInicial, columnas, currentUserId])

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (isOpen) {
      if (!dialog.open) dialog.showModal()
    } else {
      if (dialog.open) dialog.close()
    }
  }, [isOpen])

  const handleBackdropClick = (e) => {
    if (e.target === dialogRef.current) onClose()
  }

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
    <dialog
      ref={dialogRef}
      onClick={handleBackdropClick}
      onClose={onClose}
      style={styles.dialog}
    >
      <div style={styles.content} className="animate-scale-in">
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.iconWrap}>
            <ClipboardList size={20} color="var(--color-accent)" />
          </div>
          <h2 style={styles.title}>
            {isEdit ? 'Editar Tarea' : 'Nueva Tarea'}
          </h2>
          <button type="button" onClick={onClose} style={styles.closeBtn} aria-label="Cerrar">
            <X size={18} />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} style={styles.form}>
          {/* Título */}
          <div style={styles.fieldGroup}>
            <label htmlFor="task-titulo" style={styles.label}>
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

          {/* Descripción */}
          <div style={styles.fieldGroup}>
            <label htmlFor="task-desc" style={styles.label}>
              Descripción
            </label>
            <textarea
              id="task-desc"
              name="descripcion"
              className="input"
              placeholder="Detalles adicionales o instrucciones para el hogar"
              rows={2}
              value={form.descripcion}
              onChange={handleChange}
              disabled={submitting}
              style={{ resize: 'vertical', minHeight: '60px' }}
            />
          </div>

          <div style={styles.row}>
            {/* Columna */}
            <div style={{ ...styles.fieldGroup, flex: 1 }}>
              <label htmlFor="task-columna" style={styles.label}>
                Columna
              </label>
              <select
                id="task-columna"
                name="columna_id"
                className="input"
                value={form.columna_id}
                onChange={handleChange}
                disabled={submitting}
                style={{ appearance: 'auto' }}
              >
                {columnas.map((col) => (
                  <option key={col.id} value={col.id}>
                    {col.nombre}
                  </option>
                ))}
              </select>
            </div>

            {/* Prioridad */}
            <div style={{ ...styles.fieldGroup, flex: 1 }}>
              <label htmlFor="task-prioridad" style={styles.label}>
                Prioridad
              </label>
              <select
                id="task-prioridad"
                name="prioridad"
                className="input"
                value={form.prioridad}
                onChange={handleChange}
                disabled={submitting}
                style={{ appearance: 'auto' }}
              >
                {OPCIONES_PRIORIDAD.map(({ value, label }) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={styles.row}>
            {/* Asignado a */}
            <div style={{ ...styles.fieldGroup, flex: 1 }}>
              <label htmlFor="task-asignado" style={styles.label}>
                Responsable
              </label>
              <select
                id="task-asignado"
                name="asignado_a_user_id"
                className="input"
                value={form.asignado_a_user_id}
                onChange={handleChange}
                disabled={submitting}
                style={{ appearance: 'auto' }}
              >
                <option value="">Toda la familia (Sin asignar)</option>
                {usuarios.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.nombre}
                  </option>
                ))}
              </select>
            </div>

            {/* Fecha de Vencimiento */}
            <div style={{ ...styles.fieldGroup, flex: 1 }}>
              <label htmlFor="task-fecha" style={styles.label}>
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

          {/* Checkboxes: Turno de Basura y Recurrencia */}
          <div style={styles.checksContainer}>
            <div style={styles.checkboxGroup}>
              <input
                id="task-turno-basura"
                name="es_turno_basura"
                type="checkbox"
                style={styles.checkbox}
                checked={form.es_turno_basura === 1}
                onChange={handleChange}
                disabled={submitting}
              />
              <label htmlFor="task-turno-basura" style={styles.checkboxLabel}>
                <Trash2 size={14} color="var(--color-accent)" style={{ display: 'inline', verticalAlign: 'text-bottom', marginRight: '6px' }} />
                Turno de recolección de basura (envía recordatorio SNS al responsable)
              </label>
            </div>

            <div style={styles.checkboxGroup}>
              <input
                id="task-recurrente"
                name="es_recurrente"
                type="checkbox"
                style={styles.checkbox}
                checked={form.es_recurrente === 1}
                onChange={handleChange}
                disabled={submitting}
              />
              <label htmlFor="task-recurrente" style={styles.checkboxLabel}>
                Tarea recurrente (se reinicia cada lunes con EventBridge)
              </label>
            </div>
          </div>

          {/* Footer del Form */}
          <div style={styles.footer}>
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
              className="btn btn-primary"
              disabled={submitting}
            >
              {submitting && <Spinner size="sm" color="currentColor" />}
              {isEdit ? 'Guardar Cambios' : 'Crear Tarea'}
            </button>
          </div>
        </form>
      </div>
    </dialog>
  )
}

const styles = {
  dialog: {
    width: '92vw',
    maxWidth: '500px',
    margin: 'auto',
    background: 'none',
    border: 'none',
    padding: 0,
  },
  content: {
    background: 'var(--color-surface)',
    border: '1px solid var(--color-border-strong)',
    borderRadius: 'var(--radius-lg)',
    padding: '26px 24px',
    boxShadow: '0 20px 48px rgba(0, 0, 0, 0.55)',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '18px',
  },
  iconWrap: {
    width: '36px',
    height: '36px',
    borderRadius: 'var(--radius-sm)',
    background: 'rgba(247, 148, 29, 0.14)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  title: {
    flex: 1,
    fontSize: '1.1rem',
    fontWeight: 600,
    color: 'var(--color-text)',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: 'var(--color-muted)',
    padding: '4px',
    display: 'flex',
    borderRadius: 'var(--radius-sm)',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
  },
  row: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap',
  },
  fieldGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    minWidth: '180px',
  },
  label: {
    fontSize: '0.82rem',
    fontWeight: 500,
    color: 'var(--color-muted)',
  },
  checksContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    padding: '12px 14px',
    borderRadius: 'var(--radius-sm)',
    background: 'var(--color-surface2)',
    border: '1px solid var(--color-border)',
  },
  checkboxGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  checkbox: {
    width: '16px',
    height: '16px',
    cursor: 'pointer',
    accentColor: 'var(--color-accent)',
    flexShrink: 0,
  },
  checkboxLabel: {
    fontSize: '0.84rem',
    color: 'var(--color-text)',
    cursor: 'pointer',
    userSelect: 'none',
    lineHeight: 1.35,
  },
  footer: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '10px',
    marginTop: '8px',
  },
}
