import { useEffect, useRef, useState } from 'react'
import { X, ClipboardList, Calendar, User, History, Flag, Trash2 } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { formatFechaHistorial } from '../../utils/dateFormat'
import Spinner from './Spinner'

export default function TareaDetallesModal({
  isOpen,
  onClose,
  tarea,
  fetchHistorial,
  usuarios = [],
  onUpdate,
}) {
  const dialogRef = useRef(null)
  const [historial, setHistorial] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (isOpen) {
      if (!dialog.open) dialog.showModal()
    } else {
      if (dialog.open) dialog.close()
    }
  }, [isOpen])

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

  const handleBackdropClick = (e) => {
    if (e.target === dialogRef.current) onClose()
  }

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
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={styles.title}>{tarea.titulo}</h2>
            <p style={styles.subtitle}>
              En columna: <strong>{tarea.columna_nombre || 'Tablero'}</strong>
            </p>
          </div>
          <button type="button" onClick={onClose} style={styles.closeBtn} aria-label="Cerrar">
            <X size={18} />
          </button>
        </div>

        {/* Detalles */}
        <div style={styles.body}>
          {tarea.descripcion && (
            <div style={styles.section}>
              <h3 style={styles.sectionTitle}>Descripción</h3>
              <p style={styles.descText}>{tarea.descripcion}</p>
            </div>
          )}

          <div style={styles.metaGrid}>
            {/* Asignado a */}
            <div style={styles.metaItem}>
              <User size={16} color="var(--color-muted)" />
              <div style={{ flex: 1 }}>
                <span style={styles.metaLabel}>Responsable</span>
                <select
                  value={tarea.asignado_a_user_id || ''}
                  onChange={(e) =>
                    handleFieldChange({
                      asignado_a_user_id: e.target.value || null,
                    })
                  }
                  style={styles.inlineSelect}
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

            {/* Fecha límite */}
            <div style={styles.metaItem}>
              <Calendar size={16} color="var(--color-muted)" />
              <div style={{ flex: 1 }}>
                <span style={styles.metaLabel}>Vence el</span>
                <input
                  type="date"
                  value={tarea.fecha_vencimiento || ''}
                  onChange={(e) =>
                    handleFieldChange({
                      fecha_vencimiento: e.target.value || null,
                    })
                  }
                  style={styles.inlineInput}
                  className="font-mono-num"
                />
              </div>
            </div>

            {/* Prioridad */}
            <div style={styles.metaItem}>
              <Flag size={16} color="var(--color-muted)" />
              <div style={{ flex: 1 }}>
                <span style={styles.metaLabel}>Prioridad</span>
                <select
                  value={tarea.prioridad || 'media'}
                  onChange={(e) =>
                    handleFieldChange({
                      prioridad: e.target.value,
                    })
                  }
                  style={styles.inlineSelect}
                >
                  <option value="baja">Baja</option>
                  <option value="media">Media</option>
                  <option value="alta">Alta</option>
                  <option value="urgente">Urgente (SNS)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Toggles: Turno de basura y Recurrencia */}
          <div style={styles.checksWrap}>
            <div style={styles.checkboxGroup}>
              <input
                id="detail-turno-basura"
                type="checkbox"
                style={styles.checkbox}
                checked={Number(tarea.es_turno_basura) === 1}
                onChange={(e) =>
                  handleFieldChange({
                    es_turno_basura: e.target.checked ? 1 : 0,
                  })
                }
              />
              <label htmlFor="detail-turno-basura" style={styles.checkboxLabel}>
                <Trash2 size={14} color="var(--color-accent)" style={{ display: 'inline', verticalAlign: 'text-bottom', marginRight: '6px' }} />
                Turno de recolección de basura (aviso SNS)
              </label>
            </div>

            <div style={styles.checkboxGroup}>
              <input
                id="detail-recurrente"
                type="checkbox"
                style={styles.checkbox}
                checked={Number(tarea.es_recurrente) === 1}
                onChange={(e) =>
                  handleFieldChange({
                    es_recurrente: e.target.checked ? 1 : 0,
                  })
                }
              />
              <label htmlFor="detail-recurrente" style={styles.checkboxLabel}>
                Tarea recurrente (se reinicia semanalmente)
              </label>
            </div>
          </div>

          {/* Historial */}
          <div style={{ ...styles.section, marginTop: '8px' }}>
            <div style={styles.historyHeader}>
              <History size={16} color="var(--color-accent)" />
              <h3 style={{ ...styles.sectionTitle, margin: 0 }}>Historial de Cambios</h3>
            </div>

            {loading ? (
              <div style={styles.loadingHistory}>
                <Spinner size="sm" />
                <span style={{ fontSize: '0.85rem', color: 'var(--color-muted)' }}>
                  Cargando historial...
                </span>
              </div>
            ) : historial.length === 0 ? (
              <p style={styles.emptyHistory}>No hay cambios registrados en esta tarea.</p>
            ) : (
              <div style={styles.timeline}>
                {historial.map((h) => (
                  <div key={h.id || h.fecha_registro} style={styles.timelineItem}>
                    <div style={styles.timelinePoint} />
                    <div style={styles.timelineContent}>
                      <span style={styles.timelineAccion}>{h.accion}</span>
                      <span style={styles.timelineMeta}>
                        por <strong>{h.usuario_nombre || 'Sistema'}</strong> •{' '}
                        <span className="font-mono-num">
                          {formatFechaHistorial(h.fecha_registro)}
                        </span>
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </dialog>
  )
}

const styles = {
  dialog: {
    width: '92vw',
    maxWidth: '540px',
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
    alignItems: 'flex-start',
    gap: '12px',
    marginBottom: '18px',
    borderBottom: '1px solid var(--color-border)',
    paddingBottom: '14px',
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
    fontSize: '1.15rem',
    fontWeight: 600,
    color: 'var(--color-text)',
    lineHeight: 1.3,
  },
  subtitle: {
    fontSize: '0.82rem',
    color: 'var(--color-muted)',
    marginTop: '2px',
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
  body: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  sectionTitle: {
    fontSize: '0.82rem',
    fontWeight: 600,
    color: 'var(--color-muted)',
  },
  descText: {
    fontSize: '0.9rem',
    color: 'var(--color-text)',
    lineHeight: 1.5,
    background: 'var(--color-surface2)',
    padding: '12px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--color-border)',
    whiteSpace: 'pre-wrap',
  },
  metaGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '14px',
    background: 'var(--color-surface2)',
    padding: '14px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--color-border)',
  },
  metaItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  metaLabel: {
    display: 'block',
    fontSize: '0.73rem',
    color: 'var(--color-muted)',
  },
  inlineSelect: {
    background: 'var(--color-surface2)',
    border: 'none',
    color: 'var(--color-text)',
    fontSize: '0.86rem',
    fontWeight: 600,
    padding: '2px 0',
    width: '100%',
    cursor: 'pointer',
    outline: 'none',
  },
  inlineInput: {
    background: 'transparent',
    border: 'none',
    color: 'var(--color-text)',
    fontSize: '0.86rem',
    fontWeight: 600,
    padding: '2px 0',
    width: '100%',
    cursor: 'pointer',
    outline: 'none',
  },
  checksWrap: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    padding: '12px 14px',
    background: 'var(--color-surface2)',
    borderRadius: 'var(--radius-sm)',
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
  },
  checkboxLabel: {
    fontSize: '0.85rem',
    color: 'var(--color-text)',
    cursor: 'pointer',
    userSelect: 'none',
  },
  historyHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    borderBottom: '1px solid var(--color-border)',
    paddingBottom: '8px',
    marginBottom: '10px',
  },
  loadingHistory: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '12px 0',
  },
  emptyHistory: {
    fontSize: '0.85rem',
    color: 'var(--color-muted)',
    fontStyle: 'italic',
    padding: '6px 0',
  },
  timeline: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    paddingLeft: '8px',
    maxHeight: '170px',
    overflowY: 'auto',
    paddingRight: '4px',
  },
  timelineItem: {
    position: 'relative',
    paddingLeft: '16px',
    borderLeft: '1px solid var(--color-border)',
  },
  timelinePoint: {
    position: 'absolute',
    left: '-4px',
    top: '6px',
    width: '7px',
    height: '7px',
    borderRadius: '50%',
    background: 'var(--color-accent)',
  },
  timelineContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  timelineAccion: {
    fontSize: '0.84rem',
    fontWeight: 500,
    color: 'var(--color-text)',
  },
  timelineMeta: {
    fontSize: '0.74rem',
    color: 'var(--color-muted)',
  },
}
