import { useEffect, useRef, useState } from 'react'
import { X, Clock, AlertTriangle } from 'lucide-react'
import { formatFechaHistorial } from '../../utils/dateFormat'
import Spinner from './Spinner'

/**
 * HistorialModal — Modal que despliega el historial de movimientos/auditoría de una tarea.
 */
export default function HistorialModal({ isOpen, onClose, tarea, fetchHistorial }) {
  const dialogRef = useRef(null)
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
            <Clock size={20} color="var(--color-accent)" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={styles.title}>Historial de Auditoría</h2>
            <p style={styles.subtitle} title={tarea?.titulo}>
              {tarea?.titulo}
            </p>
          </div>
          <button type="button" onClick={onClose} style={styles.closeBtn} aria-label="Cerrar">
            <X size={18} />
          </button>
        </div>

        {/* Contenido / Timeline */}
        <div style={styles.body}>
          {loading && (
            <div style={styles.loadingArea}>
              <Spinner size="md" />
              <p style={{ color: 'var(--color-muted)', fontSize: '0.875rem' }}>
                Cargando historial...
              </p>
            </div>
          )}

          {!loading && error && (
            <div style={styles.errorArea}>
              <AlertTriangle size={24} color="var(--color-danger)" />
              <p style={{ color: 'var(--color-danger)', fontSize: '0.85rem' }}>{error}</p>
            </div>
          )}

          {!loading && !error && historial.length === 0 && (
            <div style={styles.emptyArea}>
              <p style={{ color: 'var(--color-muted)', fontSize: '0.875rem', fontStyle: 'italic' }}>
                No se registran movimientos para esta tarea.
              </p>
            </div>
          )}

          {!loading && !error && historial.length > 0 && (
            <div style={styles.timeline}>
              {historial.map((item, idx) => (
                <div key={item.id || idx} style={styles.timelineItem}>
                  <div style={styles.timelineNode}>
                    <div style={styles.nodePoint} />
                    {idx < historial.length - 1 && <div style={styles.nodeLine} />}
                  </div>

                  <div style={styles.timelineContent}>
                    <p style={styles.actionText}>{item.accion}</p>
                    <p style={styles.metaText}>
                      Realizado por <strong>{item.usuario_nombre ?? 'Sistema'}</strong> •{' '}
                      <span className="font-mono-num">
                        {formatFechaHistorial(item.fecha_registro)}
                      </span>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={styles.footer}>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cerrar
          </button>
        </div>
      </div>
    </dialog>
  )
}

const styles = {
  dialog: {
    width: '90vw',
    maxWidth: '460px',
    margin: 'auto',
    background: 'none',
    border: 'none',
    padding: 0,
  },
  content: {
    background: 'var(--color-surface)',
    border: '1px solid var(--color-border-strong)',
    borderRadius: 'var(--radius-lg)',
    padding: '26px 24px 20px',
    boxShadow: '0 20px 48px rgba(0, 0, 0, 0.55)',
    display: 'flex',
    flexDirection: 'column',
    maxHeight: '85vh',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '20px',
    flexShrink: 0,
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
    fontSize: '1.05rem',
    fontWeight: 600,
    color: 'var(--color-text)',
  },
  subtitle: {
    fontSize: '0.8rem',
    color: 'var(--color-muted)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
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
    flex: 1,
    overflowY: 'auto',
    paddingRight: '4px',
    marginBottom: '16px',
    minHeight: '160px',
    maxHeight: '340px',
  },
  loadingArea: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    padding: '40px 0',
  },
  errorArea: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '30px 0',
    textAlign: 'center',
  },
  emptyArea: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 0',
  },
  timeline: {
    display: 'flex',
    flexDirection: 'column',
  },
  timelineItem: {
    display: 'flex',
    gap: '16px',
  },
  timelineNode: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    width: '12px',
    flexShrink: 0,
  },
  nodePoint: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    background: 'var(--color-accent)',
    marginTop: '6px',
  },
  nodeLine: {
    width: '2px',
    flex: 1,
    background: 'var(--color-border)',
    minHeight: '36px',
  },
  timelineContent: {
    flex: 1,
    paddingBottom: '20px',
  },
  actionText: {
    fontSize: '0.875rem',
    fontWeight: 500,
    color: 'var(--color-text)',
    lineHeight: 1.3,
  },
  metaText: {
    fontSize: '0.75rem',
    color: 'var(--color-muted)',
    marginTop: '4px',
  },
  footer: {
    display: 'flex',
    justifyContent: 'flex-end',
    flexShrink: 0,
    borderTop: '1px solid var(--color-border)',
    paddingTop: '12px',
  },
}
