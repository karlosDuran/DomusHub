import { AlertTriangle, Info } from 'lucide-react'
import DialogShell from './DialogShell'
import Spinner from './Spinner'

/**
 * Modal de confirmación reutilizable sobre DialogShell.
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
  const isDanger = variant === 'danger'

  return (
    <DialogShell
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      icon={isDanger ? <AlertTriangle size={18} /> : <Info size={18} />}
      iconTone={isDanger ? 'danger' : 'accent'}
      maxWidth="max-w-[420px]"
      footer={
        <>
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
        </>
      }
    >
      <p className="text-sm leading-relaxed text-[var(--color-muted)]">{message}</p>
    </DialogShell>
  )
}
