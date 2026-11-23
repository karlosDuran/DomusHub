import { useEffect, useState } from 'react'
import { Package, DollarSign } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { CATEGORIAS_INVENTARIO } from '../../stores/inventarioStore'
import DialogShell from './DialogShell'
import Spinner from './Spinner'

const UNIDADES_MEDIDA = [
  { value: 'unidad', label: 'Unidades' },
  { value: 'L',      label: 'Litros (L)' },
  { value: 'litros', label: 'Litros (litros)' },
  { value: 'ml',     label: 'Mililitros (ml)' },
  { value: 'kg',     label: 'Kilogramos (kg)' },
  { value: 'gr',     label: 'Gramos (gr)' },
  { value: 'rollo',  label: 'Rollos' },
  { value: 'piezas', label: 'Piezas' },
  { value: 'cajas',  label: 'Cajas' },
  { value: 'bolsas', label: 'Bolsas' },
]

/**
 * ProductoModal — Modal para Crear y Editar productos del inventario.
 */
export default function ProductoModal({ isOpen, onClose, onSave, producto }) {
  const isEdit = !!producto

  const [form, setForm] = useState({
    nombre: '',
    categoria: 'Despensa',
    cantidad_actual: 0,
    unidad_medida: 'unidad',
    cantidad_minima: 1,
    precio_promedio: 0,
  })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const sync = async () => {
      if (!isOpen) return
      if (producto) {
        setForm({
          nombre: producto.nombre ?? '',
          categoria: CATEGORIAS_INVENTARIO.includes(producto.categoria)
            ? producto.categoria
            : 'Despensa',
          cantidad_actual: producto.cantidad_actual ?? 0,
          unidad_medida: producto.unidad_medida ?? 'unidad',
          cantidad_minima: producto.cantidad_minima ?? 1,
          precio_promedio: producto.precio_promedio ?? 0,
        })
      } else {
        setForm({
          nombre: '',
          categoria: 'Despensa',
          cantidad_actual: 0,
          unidad_medida: 'unidad',
          cantidad_minima: 1,
          precio_promedio: 0,
        })
      }
    }
    sync()
  }, [isOpen, producto])

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

    const payload = {
      nombre: form.nombre.trim(),
      categoria: form.categoria || 'Despensa',
      unidad_medida: form.unidad_medida || 'unidad',
      cantidad_actual: Number(form.cantidad_actual) >= 0 ? Number(form.cantidad_actual) : 0,
      cantidad_minima: Number(form.cantidad_minima) >= 0 ? Number(form.cantidad_minima) : 0,
      precio_promedio: Number(form.precio_promedio) >= 0 ? Number(form.precio_promedio) : 0,
    }

    setSubmitting(true)
    try {
      await onSave(payload)
      toast.success(isEdit ? 'Producto actualizado' : 'Producto creado')
      onClose()
    } catch (err) {
      const msg =
        err.response?.data?.errors?.[0] ??
        err.response?.data?.error ??
        'Error al guardar el producto.'
      toast.error(msg)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <DialogShell
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? 'Editar producto' : 'Nuevo producto'}
      subtitle="Define el umbral mínimo para activar alertas automáticas"
      icon={<Package size={18} />}
      maxWidth="max-w-[480px]"
      footer={
        <>
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
            form="producto-form"
            className="btn btn-primary"
            disabled={submitting}
          >
            {submitting && <Spinner size="sm" color="currentColor" />}
            {isEdit ? 'Guardar cambios' : 'Crear producto'}
          </button>
        </>
      }
    >
      <form id="producto-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="prod-nombre" className="text-xs font-medium text-[var(--color-muted)]">
            Nombre del producto *
          </label>
          <input
            id="prod-nombre"
            name="nombre"
            type="text"
            className="input"
            placeholder="Ej. Leche entera, Papel higiénico, Arroz"
            value={form.nombre}
            onChange={handleChange}
            required
            disabled={submitting}
            autoComplete="off"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="prod-categoria" className="text-xs font-medium text-[var(--color-muted)]">
            Categoría
          </label>
          <select
            id="prod-categoria"
            name="categoria"
            className="input"
            value={form.categoria}
            onChange={handleChange}
            disabled={submitting}
          >
            {CATEGORIAS_INVENTARIO.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="prod-cant-actual" className="text-xs font-medium text-[var(--color-muted)]">
              Cantidad actual
            </label>
            <input
              id="prod-cant-actual"
              name="cantidad_actual"
              type="number"
              inputMode="decimal"
              step="any"
              min="0"
              className="input font-mono-num"
              value={form.cantidad_actual}
              onChange={handleChange}
              disabled={submitting}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="prod-unidad" className="text-xs font-medium text-[var(--color-muted)]">
              Unidad
            </label>
            <select
              id="prod-unidad"
              name="unidad_medida"
              className="input"
              value={form.unidad_medida}
              onChange={handleChange}
              disabled={submitting}
            >
              {UNIDADES_MEDIDA.map(({ value, label }) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="prod-cant-minima" className="text-xs font-medium text-[var(--color-muted)]">
              Umbral mínimo (SNS)
            </label>
            <input
              id="prod-cant-minima"
              name="cantidad_minima"
              type="number"
              inputMode="decimal"
              step="any"
              min="0"
              className="input font-mono-num"
              value={form.cantidad_minima}
              onChange={handleChange}
              disabled={submitting}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="prod-precio" className="text-xs font-medium text-[var(--color-muted)]">
              Precio referencia
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-muted)]">
                <DollarSign size={15} />
              </span>
              <input
                id="prod-precio"
                name="precio_promedio"
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                className="input font-mono-num pl-8"
                value={form.precio_promedio}
                onChange={handleChange}
                disabled={submitting}
              />
            </div>
          </div>
        </div>
      </form>
    </DialogShell>
  )
}
