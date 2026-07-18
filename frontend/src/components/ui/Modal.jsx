import { useEffect, useRef } from 'react'
import { X, AlertTriangle, Info } from 'lucide-react'

/**
 * Modal reutilizable usando <dialog> nativo.
 *
 * Props:
 *   isOpen      {boolean}   — controla si el modal está abierto
 *   onClose     {function}  — llamado al cerrar (X o backdrop click)
 *   onConfirm   {function}  — llamado al hacer clic en el botón de acción
 *   title       {string}
 *   message     {string}
 *   confirmText {string}    — texto del botón de acción (default: "Confirmar")
 *   variant     {'danger'|'info'} — cambia el color del botón de acción
 *   loading     {boolean}   — deshabilita el botón mientras se procesa
 */
export default function Modal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirmar',
  variant = 'info',
  loading = false,
}) {
  const dialogRef = useRef(null)

  // Abre o cierra el <dialog> nativo según isOpen
  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (isOpen) {
      dialog.showModal()
    } else {
      dialog.close()
    }
  }, [isOpen])

  // Cierra al hacer clic en el backdrop (fuera del contenido)
  const handleBackdropClick = (e) => {
    if (e.target === dialogRef.current) onClose()
  }

  const isDanger = variant === 'danger'

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
          <div style={styles.iconWrap(isDanger)}>
            {isDanger
              ? <AlertTriangle size={20} color="var(--color-danger)" />
              : <Info          size={20} color="var(--color-accent)" />
            }
          </div>
          <h2 style={styles.title}>{title}</h2>
          <button
            onClick={onClose}
            style={styles.closeBtn}
            aria-label="Cerrar"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <p style={styles.message}>{message}</p>

        {/* Footer */}
        <div style={styles.footer}>
          <button
            onClick={onClose}
            className="btn btn-ghost"
            disabled={loading}
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className={isDanger ? 'btn btn-danger' : 'btn btn-primary'}
            disabled={loading}
          >
            {loading && <span style={styles.spinnerInline} aria-hidden="true" />}
            {confirmText}
          </button>
        </div>
      </div>
    </dialog>
  )
}

const styles = {
  dialog: {
    width: '90vw',
    maxWidth: '420px',
    background: 'none',
    border: 'none',
    padding: 0,
  },
  content: {
    background: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-lg)',
    padding: '24px',
    boxShadow: '0 20px 60px rgba(0,0,0,.6)',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '16px',
  },
  iconWrap: (isDanger) => ({
    width: '36px',
    height: '36px',
    borderRadius: 'var(--radius-sm)',
    background: isDanger ? 'rgba(248,81,73,.12)' : 'rgba(88,166,255,.12)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  }),
  title: {
    flex: 1,
    fontSize: '1rem',
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
  message: {
    color: 'var(--color-muted)',
    fontSize: '0.9rem',
    lineHeight: 1.6,
    marginBottom: '24px',
  },
  footer: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '10px',
  },
  spinnerInline: {
    width: '14px',
    height: '14px',
    border: '2px solid rgba(255,255,255,.3)',
    borderTopColor: '#fff',
    borderRadius: '50%',
    animation: 'spin 0.7s linear infinite',
    display: 'inline-block',
  },
}
