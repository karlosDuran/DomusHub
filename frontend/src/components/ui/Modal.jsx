import { useEffect, useRef } from 'react'
import { X, AlertTriangle, Info } from 'lucide-react'
import Spinner from './Spinner'

/**
 * Modal reutilizable usando <dialog> nativo con protección de dialog.open.
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
            type="button"
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
            type="button"
            onClick={onClose}
            className="btn btn-ghost"
            disabled={loading}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={isDanger ? 'btn btn-danger' : 'btn btn-primary'}
            disabled={loading}
          >
            {loading && <Spinner size="sm" color="currentColor" />}
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
    margin: 'auto',
    background: 'none',
    border: 'none',
    padding: 0,
  },
  content: {
    background: 'var(--color-surface)',
    border: '1px solid var(--color-border-strong)',
    borderRadius: 'var(--radius-lg)',
    padding: '24px',
    boxShadow: '0 20px 48px rgba(0, 0, 0, 0.55)',
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
    background: isDanger ? 'rgba(239, 68, 68, 0.14)' : 'rgba(247, 148, 29, 0.14)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  }),
  title: {
    flex: 1,
    fontSize: '1.05rem',
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
  message: {
    color: 'var(--color-muted)',
    fontSize: '0.9375rem',
    lineHeight: 1.6,
    marginBottom: '24px',
  },
  footer: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '10px',
  },
}
