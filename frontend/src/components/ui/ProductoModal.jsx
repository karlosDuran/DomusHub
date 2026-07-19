import { useEffect, useRef, useState } from 'react'
import { X, Package, DollarSign } from 'lucide-react'
import { toast } from 'react-hot-toast'

/**
 * ProductoModal — Modal para Crear y Editar productos del inventario.
 * Utiliza <dialog> nativo.
 *
 * Props:
 *   isOpen    {boolean}       — Estado de apertura
 *   onClose   {function}      — Cierre del modal
 *   onSave    {function}      — Callback async que guarda el producto en la API/padre: onSave(formData)
 *   producto  {object|null}   — Producto a editar (null para modo creación)
 */
export default function ProductoModal({ isOpen, onClose, onSave, producto }) {
  const dialogRef = useRef(null)
  const isEdit = !!producto

  const [form, setForm] = useState({
    nombre: '',
    cantidad_actual: 0,
    unidad_medida: 'unidad',
    cantidad_minima: 1,
    precio_promedio: 0,
  })
  const [submitting, setSubmitting] = useState(false)

  // Sincronizar form con producto cuando se abre/cambia producto
  useEffect(() => {
    const sync = async () => {
      if (isOpen) {
        if (producto) {
          setForm({
            nombre: producto.nombre ?? '',
            cantidad_actual: producto.cantidad_actual ?? 0,
            unidad_medida: producto.unidad_medida ?? 'unidad',
            cantidad_minima: producto.cantidad_minima ?? 1,
            precio_promedio: producto.precio_promedio ?? 0,
          })
        } else {
          setForm({
            nombre: '',
            cantidad_actual: 0,
            unidad_medida: 'unidad',
            cantidad_minima: 1,
            precio_promedio: 0,
          })
        }
      }
    }
    sync()
  }, [isOpen, producto])

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
    const { name, value, type } = e.target
    setForm((prev) => ({
      ...prev,
      [name]: type === 'number' ? (value === '' ? '' : Number(value)) : value,
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.nombre.trim()) {
      toast.error('El nombre del producto es obligatorio.')
      return
    }

    setSubmitting(true)
    try {
      await onSave(form)
      toast.success(isEdit ? 'Producto actualizado' : 'Producto creado')
      onClose()
    } catch (err) {
      const msg = err.response?.data?.errors?.[0] ?? err.response?.data?.error ?? 'Error al guardar el producto.'
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
            <Package size={20} color="var(--color-accent)" />
          </div>
          <h2 style={styles.title}>
            {isEdit ? 'Editar Producto' : 'Nuevo Producto'}
          </h2>
          <button onClick={onClose} style={styles.closeBtn} aria-label="Cerrar">
            <X size={18} />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} style={styles.form}>
          {/* Nombre */}
          <div style={styles.fieldGroup}>
            <label htmlFor="prod-nombre" style={styles.label}>
              Nombre del Producto *
            </label>
            <input
              id="prod-nombre"
              name="nombre"
              type="text"
              className="input"
              placeholder="Ej. Leche Entera, Arroz"
              value={form.nombre}
              onChange={handleChange}
              required
              disabled={submitting}
              autoComplete="off"
            />
          </div>

          <div style={styles.row}>
            {/* Cantidad Actual */}
            <div style={{ ...styles.fieldGroup, flex: 1 }}>
              <label htmlFor="prod-cant-actual" style={styles.label}>
                Cantidad Actual
              </label>
              <input
                id="prod-cant-actual"
                name="cantidad_actual"
                type="number"
                step="any"
                min="0"
                className="input"
                value={form.cantidad_actual}
                onChange={handleChange}
                disabled={submitting}
              />
            </div>

            {/* Unidad Medida */}
            <div style={{ ...styles.fieldGroup, flex: 1 }}>
              <label htmlFor="prod-unidad" style={styles.label}>
                Unidad
              </label>
              <select
                id="prod-unidad"
                name="unidad_medida"
                className="input"
                value={form.unidad_medida}
                onChange={handleChange}
                disabled={submitting}
                style={{ appearance: 'auto' }}
              >
                <option value="unidad">Unidades</option>
                <option value="kg">Kilogramos (kg)</option>
                <option value="gr">Gramos (gr)</option>
                <option value="litros">Litros (l)</option>
                <option value="ml">Mililitros (ml)</option>
                <option value="piezas">Piezas</option>
                <option value="cajas">Cajas</option>
                <option value="bolsas">Bolsas</option>
              </select>
            </div>
          </div>

          <div style={styles.row}>
            {/* Cantidad Mínima */}
            <div style={{ ...styles.fieldGroup, flex: 1 }}>
              <label htmlFor="prod-cant-minima" style={styles.label}>
                Cant. Mínima (Alerta)
              </label>
              <input
                id="prod-cant-minima"
                name="cantidad_minima"
                type="number"
                step="any"
                min="0"
                className="input"
                value={form.cantidad_minima}
                onChange={handleChange}
                disabled={submitting}
              />
            </div>

            {/* Precio Promedio / Referencia */}
            <div style={{ ...styles.fieldGroup, flex: 1 }}>
              <label htmlFor="prod-precio" style={styles.label}>
                Precio Referencia ($)
              </label>
              <div style={{ position: 'relative' }}>
                <span style={styles.currencyIcon}>
                  <DollarSign size={16} color="var(--color-muted)" />
                </span>
                <input
                  id="prod-precio"
                  name="precio_promedio"
                  type="number"
                  step="0.01"
                  min="0"
                  className="input"
                  value={form.precio_promedio}
                  onChange={handleChange}
                  disabled={submitting}
                  style={{ paddingLeft: '32px' }}
                />
              </div>
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
              {submitting && <span style={styles.spinnerInline} aria-hidden="true" />}
              {isEdit ? 'Guardar Cambios' : 'Crear Producto'}
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
    maxWidth: '480px',
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
  row: {
    display: 'flex',
    gap: '12px',
  },
  currencyIcon: {
    position: 'absolute',
    left: '10px',
    top: '50%',
    transform: 'translateY(-50%)',
    display: 'flex',
    alignItems: 'center',
    pointerEvents: 'none',
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
  },
}
