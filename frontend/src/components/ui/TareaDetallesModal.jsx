import { useEffect, useRef, useState } from 'react'
import { X, ClipboardList, Calendar, User, History } from 'lucide-react'
import { toast } from 'react-hot-toast'

export default function TareaDetallesModal({ isOpen, onClose, tarea, fetchHistorial, usuarios = [], onUpdate }) {
  const dialogRef = useRef(null)
  const [historial, setHistorial] = useState([])
  const [loading, setLoading] = useState(false)

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

  // Cargar historial
  useEffect(() => {
    if (isOpen && tarea?.id) {
      const loadHistorial = async () => {
        setLoading(true)
        try {
          const data = await fetchHistorial(tarea.id)
          setHistorial(data)
        } catch (err) {
          toast.error('Error al cargar el historial.')
        } finally {
          setLoading(false)
        }
      }
      loadHistorial()
    } else {
      setHistorial([])
    }
  }, [isOpen, tarea, fetchHistorial])

  const handleBackdropClick = (e) => {
    if (e.target === dialogRef.current) onClose()
  }

  const formatHora = (dateStr) => {
    if (!dateStr) return ''
    const date = new Date(dateStr.replace(' ', 'T') + 'Z') // Asegurar UTC
    return date.toLocaleString('es-ES', { hour: 'numeric', minute: '2-digit', hour12: true }) + ' ' + date.toLocaleDateString('es-ES', { month: 'short', day: 'numeric' })
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
            <p style={styles.subtitle}>En columna: {tarea.columna_nombre}</p>
          </div>
          <button onClick={onClose} style={styles.closeBtn} aria-label="Cerrar">
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
            <div style={styles.metaItem}>
              <User size={16} color="var(--color-muted)" />
              <div style={{ flex: 1 }}>
                <span style={styles.metaLabel}>Asignado a</span>
                <select
                  value={tarea.asignado_a_user_id || ''}
                  onChange={(e) => onUpdate(tarea.id, { 
                    asignado_a_user_id: e.target.value ? Number(e.target.value) : null 
                  })}
                  style={styles.inlineSelect}
                >
                  <option value="">Sin asignar</option>
                  {usuarios.map(u => (
                    <option key={u.id} value={u.id}>{u.nombre}</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={styles.metaItem}>
              <Calendar size={16} color="var(--color-muted)" />
              <div style={{ flex: 1 }}>
                <span style={styles.metaLabel}>Vence el</span>
                <input
                  type="date"
                  value={tarea.fecha_vencimiento || ''}
                  onChange={(e) => onUpdate(tarea.id, { 
                    fecha_vencimiento: e.target.value || null 
                  })}
                  style={styles.inlineInput}
                />
              </div>
            </div>
          </div>

          {/* Recurrencia */}
          <div style={styles.checkboxGroup}>
            <input
              id="detail-recurrente"
              type="checkbox"
              style={styles.checkbox}
              checked={tarea.es_recurrente === 1}
              onChange={(e) => onUpdate(tarea.id, { 
                es_recurrente: e.target.checked ? 1 : 0 
              })}
            />
            <label htmlFor="detail-recurrente" style={styles.checkboxLabel}>
              Tarea recurrente (se reinicia semanalmente)
            </label>
          </div>

          {/* Historial */}
          <div style={{ ...styles.section, marginTop: '12px' }}>
            <div style={styles.historyHeader}>
              <History size={16} color="var(--color-accent)" />
              <h3 style={{ ...styles.sectionTitle, margin: 0 }}>Historial de Cambios</h3>
            </div>

            {loading ? (
              <div style={styles.loadingHistory}>
                <div style={styles.spinner} />
                <span style={{ fontSize: '0.85rem', color: 'var(--color-muted)' }}>Cargando historial...</span>
              </div>
            ) : historial.length === 0 ? (
              <p style={styles.emptyHistory}>No hay cambios registrados en esta tarea.</p>
            ) : (
              <div style={styles.timeline}>
                {historial.map((h, i) => (
                  <div key={h.id} style={styles.timelineItem}>
                    <div style={styles.timelinePoint} />
                    <div style={styles.timelineContent}>
                      <span style={styles.timelineAccion}>{h.accion}</span>
                      <span style={styles.timelineMeta}>
                        por <strong>{h.usuario_nombre || 'Sistema'}</strong> • {formatHora(h.fecha_registro)}
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
    width: '90vw',
    maxWidth: '520px',
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
    alignItems: 'flex-start',
    gap: '12px',
    marginBottom: '20px',
    borderBottom: '1px solid var(--color-border)',
    paddingBottom: '14px',
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
    fontSize: '1.15rem',
    fontWeight: 600,
    color: 'var(--color-text)',
    lineHeight: 1.3,
  },
  subtitle: {
    fontSize: '0.8rem',
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
    transition: 'color 150ms ease',
  },
  body: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  sectionTitle: {
    fontSize: '0.85rem',
    fontWeight: 600,
    color: 'var(--color-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
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
    gridTemplateColumns: '1fr 1fr',
    gap: '16px',
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
    fontSize: '0.72rem',
    color: 'var(--color-muted)',
  },
  metaValue: {
    fontSize: '0.85rem',
    fontWeight: 500,
    color: 'var(--color-text)',
  },
  inlineSelect: {
    background: 'transparent',
    border: 'none',
    color: 'var(--color-text)',
    fontSize: '0.85rem',
    fontWeight: 500,
    padding: '2px 0',
    width: '100%',
    cursor: 'pointer',
    outline: 'none',
  },
  inlineInput: {
    background: 'transparent',
    border: 'none',
    color: 'var(--color-text)',
    fontSize: '0.85rem',
    fontWeight: 500,
    padding: '2px 0',
    width: '100%',
    cursor: 'pointer',
    outline: 'none',
  },
  checkboxGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px',
    background: 'var(--color-surface2)',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--color-border)',
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
  spinner: {
    width: '16px',
    height: '16px',
    border: '2px solid rgba(255,255,255,.2)',
    borderTopColor: 'var(--color-accent)',
    borderRadius: '50%',
    animation: 'spin 0.7s linear infinite',
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
    maxHeight: '160px',
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
    fontSize: '0.82rem',
    fontWeight: 500,
    color: 'var(--color-text)',
  },
  timelineMeta: {
    fontSize: '0.72rem',
    color: 'var(--color-muted)',
  },
}
