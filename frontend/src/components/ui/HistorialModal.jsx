import { useEffect, useRef, useState } from 'react'
import { X, Clock, AlertTriangle } from 'lucide-react'

/**
 * HistorialModal — Modal que despliega el historial de movimientos/auditoría de una tarea.
 * Utiliza <dialog> nativo.
 *
 * Props:
 *   isOpen          {boolean}  — Estado de apertura
 *   onClose         {function} — Cierre del modal
 *   tarea           {object}   — Tarea seleccionada { id, titulo }
 *   fetchHistorial  {function} — Función asíncrona del hook useKanban para cargar el historial
 */
export default function HistorialModal({ isOpen, onClose, tarea, fetchHistorial }) {
  const dialogRef = useRef(null)
  const [historial, setHistorial] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Cargar historial al abrirse
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

  // Helper para formatear fecha de SQLite
  const formatFecha = (str) => {
    if (!str) return ''
    try {
      // Reemplaza espacio con T para compatibilidad cross-browser del Date parser
      const parsed = new Date(str.replace(' ', 'T'))
      return parsed.toLocaleString('es-MX', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return str
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
            <Clock size={20} color="var(--color-accent)" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={styles.title}>Historial de Auditoría</h2>
            <p style={styles.subtitle} title={tarea?.titulo}>
              {tarea?.titulo}
            </p>
          </div>
          <button onClick={onClose} style={styles.closeBtn} aria-label="Cerrar">
            <X size={18} />
          </button>
        </div>

        {/* Contenido / Timeline */}
        <div style={styles.body}>
          {loading && (
            <div style={styles.loadingArea}>
              <span style={styles.spinner} aria-hidden="true" />
              <p style={{ color: 'var(--color-muted)', fontSize: '0.875rem' }}>Cargando historial...</p>
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
                  {/* Nodo visual */}
                  <div style={styles.timelineNode}>
                    <div style={styles.nodePoint} />
                    {idx < historial.length - 1 && <div style={styles.nodeLine} />}
                  </div>

                  {/* Contenido del evento */}
                  <div style={styles.timelineContent}>
                    <p style={styles.actionText}>{item.accion}</p>
                    <p style={styles.metaText}>
                      Realizado por <strong>{item.usuario_nombre ?? 'Sistema'}</strong> • {formatFecha(item.fecha_registro)}
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
    background: 'none',
    border: 'none',
    padding: 0,
  },
  content: {
    background: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-lg)',
    padding: '28px 24px 20px',
    boxShadow: '0 20px 60px rgba(0,0,0,.6)',
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
    background: 'rgba(88,166,255,.12)',
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
    transition: 'color 150ms ease',
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
  spinner: {
    width: '24px',
    height: '24px',
    border: '2px solid rgba(88,166,255,.2)',
    borderTopColor: 'var(--color-accent)',
    borderRadius: '50%',
    animation: 'spin 0.7s linear infinite',
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
    boxShadow: '0 0 8px var(--color-accent)',
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
