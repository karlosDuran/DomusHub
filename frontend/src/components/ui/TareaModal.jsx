import { useEffect, useRef, useState } from 'react'
import { X, ClipboardList } from 'lucide-react'
import { toast } from 'react-hot-toast'

/**
 * TareaModal — Modal para Crear y Editar tareas del Kanban.
 * Utiliza <dialog> nativo.
 *
 * Props:
 *   isOpen          {boolean}       — Estado de apertura
 *   onClose         {function}      — Cierre del modal
 *   onSave          {function}      — Callback async que guarda la tarea en la API/padre: onSave(formData)
 *   tarea           {object|null}   — Tarea a editar (null para modo creación)
 *   columnas        {array}         — Listado de columnas del Kanban
 *   columnaInicial  {number|string} — ID de columna preseleccionada para creación
 */
export default function TareaModal({ isOpen, onClose, onSave, tarea, columnas = [], columnaInicial, usuarios = [], currentUserId }) {
  const dialogRef = useRef(null)
  const isEdit = !!tarea

  const [form, setForm] = useState({
    titulo: '',
    descripcion: '',
    columna_id: '',
    es_recurrente: 0,
    fecha_vencimiento: '',
    asignado_a_user_id: '',
  })
  const [submitting, setSubmitting] = useState(false)

  // Sincronizar form con tarea cuando se abre/cambia tarea
  useEffect(() => {
    const sync = async () => {
      if (isOpen) {
        if (tarea) {
          setForm({
            titulo: tarea.titulo ?? '',
            descripcion: tarea.descripcion ?? '',
            columna_id: tarea.columna_id ?? '',
            es_recurrente: tarea.es_recurrente === 1 ? 1 : 0,
            fecha_vencimiento: tarea.fecha_vencimiento ?? '',
            asignado_a_user_id: tarea.asignado_a_user_id ?? '',
          })
        } else {
          setForm({
            titulo: '',
            descripcion: '',
            columna_id: columnaInicial ?? (columnas[0]?.id ?? ''),
            es_recurrente: 0,
            fecha_vencimiento: '',
            asignado_a_user_id: currentUserId ?? '',
          })
        }
      }
    }
    sync()
  }, [isOpen, tarea, columnaInicial, columnas])

  // Abrir/cerrar dialog nativo
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
      [name]: type === 'checkbox' ? (checked ? 1 : 0) : (name === 'columna_id' ? Number(value) : value),
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
        asignado_a_user_id: form.asignado_a_user_id ? Number(form.asignado_a_user_id) : null
      }
      await onSave(payload)
      onClose()
    } catch (err) {
      const msg = err.response?.data?.errors?.[0] ?? err.response?.data?.error ?? 'Error al guardar la tarea.'
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
          <button onClick={onClose} style={styles.closeBtn} aria-label="Cerrar">
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
              placeholder="Ej. Barrer la sala, Limpiar platos"
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
              placeholder="Ej. Limpiar a fondo y acomodar cojines"
              rows={3}
              value={form.descripcion}
              onChange={handleChange}
              disabled={submitting}
              style={{ resize: 'vertical', minHeight: '60px' }}
            />
          </div>

          {/* Columna */}
          <div style={styles.fieldGroup}>
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

          {/* Asignado a */}
          <div style={styles.fieldGroup}>
            <label htmlFor="task-asignado" style={styles.label}>
              Asignado a
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
              <option value="">Sin asignar</option>
              {usuarios.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nombre}
                </option>
              ))}
            </select>
          </div>

          {/* Fecha de Vencimiento */}
          <div style={styles.fieldGroup}>
            <label htmlFor="task-fecha" style={styles.label}>
              Fecha de Vencimiento
            </label>
            <input
              id="task-fecha"
              name="fecha_vencimiento"
              type="date"
              className="input"
              value={form.fecha_vencimiento}
              onChange={handleChange}
              disabled={submitting}
            />
          </div>

          {/* Recurrencia */}
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
              Tarea recurrente (se reinicia semanalmente)
            </label>
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
              {submitting && <span style={styles.spinnerInline} aria-hidden="true" />}
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
    width: '90vw',
    maxWidth: '460px',
    background: 'none',
    border: 'none',
    padding: 0,
  },
  content: {
    background: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-lg)',
    padding: '28px 24px',
    boxShadow: '0 20px 60px rgba(0,0,0,.6)',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '20px',
  },
  iconWrap: {
    width: '36px',
    height: '36px',
    borderRadius: 'var(--radius-sm)',
    background: 'rgba(88,166,255,.12)',
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
    transition: 'color 150ms ease',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  fieldGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    fontSize: '0.85rem',
    fontWeight: 500,
    color: 'var(--color-muted)',
  },
  checkboxGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginTop: '4px',
  },
  checkbox: {
    width: '16px',
    height: '16px',
    cursor: 'pointer',
    accentColor: 'var(--color-accent)',
  },
  checkboxLabel: {
    fontSize: '0.85rem',
    color: 'var(--color-text)',
    cursor: 'pointer',
    userSelect: 'none',
  },
  footer: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '10px',
    marginTop: '12px',
  },
  spinnerInline: {
    width: '14px',
    height: '14px',
    border: '2px solid rgba(255,255,255,.3)',
    borderTopColor: '#fff',
    borderRadius: '50%',
    animation: 'spin 0.7s linear infinite',
    display: 'inline-block',
    marginRight: '6px',
  },
}
