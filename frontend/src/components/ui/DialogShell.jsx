import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'

/**
 * DialogShell — Wrapper único sobre <dialog> nativo.
 * Desktop: modal centrado minimalista.
 * Móvil (<640px): bottom sheet con safe-area y overscroll-behavior: contain.
 */
export default function DialogShell({
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
  iconTone = 'accent',
  maxWidth = 'max-w-[480px]',
  children,
  footer,
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

  const iconBgClass =
    iconTone === 'danger'
      ? 'bg-[var(--color-danger-soft)] text-[var(--color-danger-text)]'
      : 'bg-[var(--color-accent-soft)] text-[var(--color-accent)]'

  return (
    <dialog
      ref={dialogRef}
      onClick={handleBackdropClick}
      onClose={onClose}
      className={`app-dialog ${maxWidth}`}
    >
      <div
        className="flex max-h-[90dvh] flex-col rounded-t-2xl sm:rounded-2xl border border-[var(--color-border-strong)] bg-[var(--color-surface-elevated)] text-[var(--color-text)]"
        style={{ boxShadow: 'var(--shadow-floating)' }}
      >
        {/* Indicador sutil de hoja en móvil */}
        <div className="flex justify-center pt-2.5 pb-0.5 sm:hidden" aria-hidden="true">
          <span className="h-1 w-9 rounded-full bg-[var(--color-border-strong)]" />
        </div>

        {/* Cabecera */}
        <div className="flex items-start gap-3 px-5 pt-4 pb-3.5 sm:px-6 sm:pt-5 border-b border-[var(--color-border)] shrink-0">
          {icon && (
            <div
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${iconBgClass}`}
            >
              {icon}
            </div>
          )}
          <div className="min-w-0 flex-1 pt-0.5">
            <h2 className="text-[1.05rem] font-semibold leading-snug text-[var(--color-text)]">
              {title}
            </h2>
            {subtitle && (
              <p className="mt-0.5 truncate text-xs text-[var(--color-muted)]">{subtitle}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="btn-icon -mr-1.5 -mt-0.5 shrink-0"
            aria-label="Cerrar"
          >
            <X size={18} />
          </button>
        </div>

        {/* Contenido scrollable */}
        <div
          className="flex-1 overflow-y-auto px-5 py-4 sm:px-6 sm:py-5"
          style={{
            overscrollBehavior: 'contain',
            paddingBottom: footer
              ? undefined
              : 'calc(1.25rem + env(safe-area-inset-bottom, 0px))',
          }}
        >
          {children}
        </div>

        {/* Pie opcional */}
        {footer && (
          <div
            className="flex items-center justify-end gap-2.5 border-t border-[var(--color-border)] px-5 py-3.5 sm:px-6 shrink-0"
            style={{
              paddingBottom: 'calc(0.875rem + env(safe-area-inset-bottom, 0px))',
            }}
          >
            {footer}
          </div>
        )}
      </div>
    </dialog>
  )
}
