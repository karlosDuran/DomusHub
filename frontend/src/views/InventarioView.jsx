import { useState, useEffect } from 'react'
import { Plus, Minus, Package, AlertTriangle, RefreshCw, Pencil, Trash2 } from 'lucide-react'
import {
  useInventarioStore,
  CATEGORIAS_INVENTARIO,
  esProductoCritico,
} from '../stores/inventarioStore'
import ProductoModal from '../components/ui/ProductoModal'
import Modal from '../components/ui/Modal'
import { toast } from 'react-hot-toast'

// ── Barra de stock GPU-only (scaleX) ─────────────────────────────────────────
function StockBar({ porcentaje, critico }) {
  const pct = Math.max(0, Math.min(100, Number(porcentaje) || 0))
  const color = critico
    ? 'var(--color-danger)'
    : pct <= 50
      ? 'var(--color-warning)'
      : 'var(--color-success)'

  return (
    <div className="stock-bar-track mt-3">
      <div
        className="stock-bar-fill"
        style={{ transform: `scaleX(${pct / 100})`, backgroundColor: color }}
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
      />
    </div>
  )
}

// ── Tarjeta de producto con consumo rápido -1 / +1 ───────────────────────────
function ProductoCard({ producto, onEdit, onDelete, onAjustarStock, adjusting }) {
  const pct = Number(producto.porcentaje_visual) || 0
  const critico = esProductoCritico(producto)
  const categoria = producto.categoria || 'Despensa'

  return (
    <article
      className={[
        'surface-card surface-card-interactive group flex flex-col justify-between p-4',
        critico ? 'border-[rgba(196,62,59,0.28)]' : '',
      ].join(' ')}
    >
      <div>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3
                className="truncate text-[0.95rem] font-semibold text-[var(--color-text)]"
                title={producto.nombre}
              >
                {producto.nombre}
              </h3>
            </div>
            <div className="mt-1 flex items-center gap-2">
              <span className="badge badge-neutral text-[11px]">{categoria}</span>
              {producto.precio_promedio ? (
                <span className="font-mono-num text-xs text-[var(--color-muted)]">
                  ${Number(producto.precio_promedio).toFixed(2)}
                </span>
              ) : null}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-0.5 md:opacity-65 md:transition-opacity md:duration-150 md:group-hover:opacity-100">
            <button
              type="button"
              onClick={() => onEdit(producto)}
              className="btn-icon h-8 w-8"
              title="Editar producto"
              aria-label={`Editar ${producto.nombre}`}
            >
              <Pencil size={14} />
            </button>
            <button
              type="button"
              onClick={() => onDelete(producto)}
              className="btn-icon btn-icon-danger h-8 w-8"
              title="Eliminar producto"
              aria-label={`Eliminar ${producto.nombre}`}
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>

        <div className="mt-3 flex items-baseline justify-between gap-2">
          <p className="font-mono-num text-sm text-[var(--color-text)]">
            <strong className="text-base font-semibold">{producto.cantidad_actual}</strong>{' '}
            <span className="text-[var(--color-muted)]">{producto.unidad_medida}</span>
          </p>
          <span className="font-mono-num text-xs text-[var(--color-muted)]">
            mín. {producto.cantidad_minima}
          </span>
        </div>

        <StockBar porcentaje={pct} critico={critico} />
      </div>

      {/* Pie: Estado + Controles táctiles rápidos (-1 / +1) */}
      <div className="mt-4 flex items-center justify-between gap-2">
        <div>
          {critico ? (
            <span className="badge badge-danger font-mono-num">
              <AlertTriangle size={12} /> Crítico · {pct}%
            </span>
          ) : pct <= 50 ? (
            <span className="badge badge-warning font-mono-num">{pct}%</span>
          ) : (
            <span className="badge badge-success font-mono-num">{pct}%</span>
          )}
        </div>

        <div
          className="inline-flex items-center gap-1.5"
          aria-label={`Ajustar stock de ${producto.nombre}`}
        >
          <button
            type="button"
            disabled={adjusting || Number(producto.cantidad_actual) <= 0}
            onClick={() => onAjustarStock(producto, -1)}
            title="Descontar 1 unidad"
            aria-label={`Restar 1 a ${producto.nombre}`}
            className="btn btn-ghost font-mono-num min-h-[34px] px-2.5 text-xs"
          >
            <Minus size={13} /> 1
          </button>
          <button
            type="button"
            disabled={adjusting}
            onClick={() => onAjustarStock(producto, 1)}
            title="Sumar 1 unidad"
            aria-label={`Sumar 1 a ${producto.nombre}`}
            className="btn btn-ghost font-mono-num min-h-[34px] px-2.5 text-xs"
          >
            <Plus size={13} /> 1
          </button>
        </div>
      </div>
    </article>
  )
}

function SkeletonCard() {
  return (
    <div className="surface-card p-4">
      <div className="flex flex-col gap-2">
        <div className="skeleton h-4 w-3/5 rounded" />
        <div className="skeleton h-3 w-1/3 rounded" />
      </div>
      <div className="skeleton mt-5 h-1.5 w-full rounded-full" />
      <div className="mt-4 flex items-center justify-between">
        <div className="skeleton h-5 w-16 rounded-full" />
        <div className="flex gap-1.5">
          <div className="skeleton h-8 w-12 rounded-lg" />
          <div className="skeleton h-8 w-12 rounded-lg" />
        </div>
      </div>
    </div>
  )
}

export default function InventarioView() {
  const productos = useInventarioStore((s) => s.productos)
  const loading = useInventarioStore((s) => s.loading)
  const error = useInventarioStore((s) => s.error)
  const fetchProductos = useInventarioStore((s) => s.fetchProductos)
  const crearProducto = useInventarioStore((s) => s.crearProducto)
  const actualizarProducto = useInventarioStore((s) => s.actualizarProducto)
  const ajustarStock = useInventarioStore((s) => s.ajustarStock)
  const eliminarProducto = useInventarioStore((s) => s.eliminarProducto)
  const refetch = () => fetchProductos(true)

  useEffect(() => {
    fetchProductos()
  }, [fetchProductos])

  const [filtro, setFiltro] = useState('todo')
  const [categoriaActiva, setCategoriaActiva] = useState('Todas')
  const [adjustingId, setAdjustingId] = useState(null)

  const [modalProducto, setModalProducto] = useState({ open: false, producto: null })
  const [modalEliminar, setModalEliminar] = useState({ open: false, producto: null })
  const [loadingDelete, setLoadingDelete] = useState(false)

  const totalCriticos = productos.filter(esProductoCritico).length

  const productosFiltrados = productos.filter((p) => {
    if (filtro === 'critico' && !esProductoCritico(p)) return false
    if (categoriaActiva !== 'Todas' && (p.categoria || 'Despensa') !== categoriaActiva) {
      return false
    }
    return true
  })

  const handleSaveProducto = async (formData) => {
    if (modalProducto.producto) {
      await actualizarProducto(modalProducto.producto.id, formData)
    } else {
      await crearProducto(formData)
    }
  }

  const handleAjustarStock = async (producto, delta) => {
    setAdjustingId(producto.id)
    try {
      const actualizado = await ajustarStock(producto.id, delta)
      if (delta < 0 && esProductoCritico(actualizado)) {
        toast(
          `Stock crítico de ${actualizado.nombre} (${actualizado.cantidad_actual} ${actualizado.unidad_medida}). Se notificará por SNS.`
        )
      }
    } catch (err) {
      toast.error(err.response?.data?.error ?? 'No se pudo actualizar el stock.')
    } finally {
      setAdjustingId(null)
    }
  }

  const handleConfirmEliminar = async () => {
    if (!modalEliminar.producto) return
    setLoadingDelete(true)
    try {
      await eliminarProducto(modalEliminar.producto.id)
      toast.success('Producto eliminado')
      setModalEliminar({ open: false, producto: null })
    } catch {
      toast.error('Error al intentar eliminar el producto.')
    } finally {
      setLoadingDelete(false)
    }
  }

  return (
    <div id="inventario-page" className="mx-auto max-w-[1120px]">
      {/* Header */}
      <header className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text)]">Despensa</h1>
          <p className="mt-0.5 text-sm text-[var(--color-muted)]">
            {loading
              ? 'Actualizando inventario…'
              : `${productos.length} producto${productos.length !== 1 ? 's' : ''} en inventario`}
          </p>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          id="inventario-add-btn"
          onClick={() => setModalProducto({ open: true, producto: null })}
        >
          <Plus size={17} /> Agregar
        </button>
      </header>

      {/* Selector de estado: Todo / Crítico */}
      <div className="mb-3 flex flex-wrap items-center gap-2" role="tablist" aria-label="Filtro de estado de stock">
        <button
          type="button"
          role="tab"
          aria-selected={filtro === 'todo'}
          onClick={() => setFiltro('todo')}
          className={[
            'inline-flex min-h-[36px] cursor-pointer items-center gap-1.5 rounded-full border px-3.5 text-sm font-semibold transition-[background-color,border-color,color] duration-150 active:scale-[0.97]',
            filtro === 'todo'
              ? 'border-[var(--color-accent-border)] bg-[var(--color-accent-soft)] text-[var(--color-accent)]'
              : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-muted)] hover:text-[var(--color-text)]',
          ].join(' ')}
        >
          Todo
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={filtro === 'critico'}
          onClick={() => setFiltro('critico')}
          className={[
            'inline-flex min-h-[36px] cursor-pointer items-center gap-1.5 rounded-full border px-3.5 text-sm font-semibold transition-[background-color,border-color,color] duration-150 active:scale-[0.97]',
            filtro === 'critico'
              ? 'border-[rgba(196,62,59,0.34)] bg-[var(--color-danger-soft)] text-[var(--color-danger-text)]'
              : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-muted)] hover:text-[var(--color-text)]',
          ].join(' ')}
        >
          <AlertTriangle size={14} />
          Crítico
          {!loading && (
            <span className="font-mono-num ml-0.5 rounded-full bg-[var(--color-danger)] px-1.5 py-0.5 text-[11px] font-bold leading-none text-white">
              {totalCriticos}
            </span>
          )}
        </button>
      </div>

      {/* Pills de categoría */}
      <div
        className="pill-bar mb-5 pb-1 md:flex-wrap md:overflow-visible"
        role="tablist"
        aria-label="Filtro por categoría"
      >
        {['Todas', ...CATEGORIAS_INVENTARIO].map((cat) => {
          const active = categoriaActiva === cat
          return (
            <button
              key={cat}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setCategoriaActiva(cat)}
              className={[
                'shrink-0 cursor-pointer rounded-full border px-3 py-1.5 text-xs font-medium transition-[background-color,border-color,color] duration-150 active:scale-[0.97]',
                active
                  ? 'border-[var(--color-accent)] bg-[var(--color-accent)] font-semibold text-[var(--color-accent-ink)]'
                  : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-muted)] hover:text-[var(--color-text)]',
              ].join(' ')}
            >
              {cat}
            </button>
          )
        })}
      </div>

      {/* Cargando */}
      {loading && (
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="animate-fade-in flex flex-col items-center gap-2 py-14 text-center">
          <AlertTriangle size={28} className="text-[var(--color-danger)]" />
          <p className="font-semibold text-[var(--color-danger-text)]">Error al cargar</p>
          <p className="max-w-sm text-sm text-[var(--color-muted)]">{error}</p>
          <button type="button" className="btn btn-ghost mt-2" onClick={refetch}>
            <RefreshCw size={15} /> Reintentar
          </button>
        </div>
      )}

      {/* Vacío */}
      {!loading && !error && productosFiltrados.length === 0 && (
        <div className="animate-fade-in flex flex-col items-center gap-2 rounded-2xl border border-dashed border-[var(--color-border-strong)] bg-[var(--color-surface)] px-6 py-14 text-center">
          <div className="mb-1 flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--color-surface-subtle)] text-[var(--color-muted)]">
            <Package size={24} />
          </div>
          <p className="font-semibold text-[var(--color-text)]">
            {filtro === 'critico'
              ? 'Todo el stock está en buen nivel'
              : categoriaActiva !== 'Todas'
                ? `Sin productos en "${categoriaActiva}"`
                : 'Tu despensa aún está vacía'}
          </p>
          <p className="max-w-sm text-sm text-[var(--color-muted)]">
            {filtro === 'critico'
              ? 'No hay productos en umbral crítico en este momento.'
              : 'Agrega productos a tu despensa o cambia el filtro de categoría.'}
          </p>
          {filtro === 'todo' && categoriaActiva === 'Todas' && (
            <button
              type="button"
              className="btn btn-primary mt-3"
              onClick={() => setModalProducto({ open: true, producto: null })}
            >
              <Plus size={16} /> Agregar primer producto
            </button>
          )}
        </div>
      )}

      {/* Grid de productos */}
      {!loading && !error && productosFiltrados.length > 0 && (
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
          {productosFiltrados.map((p) => (
            <ProductoCard
              key={p.id}
              producto={p}
              adjusting={adjustingId === p.id}
              onAjustarStock={handleAjustarStock}
              onEdit={(prod) => setModalProducto({ open: true, producto: prod })}
              onDelete={(prod) => setModalEliminar({ open: true, producto: prod })}
            />
          ))}
        </div>
      )}

      <ProductoModal
        isOpen={modalProducto.open}
        onClose={() => setModalProducto({ open: false, producto: null })}
        onSave={handleSaveProducto}
        producto={modalProducto.producto}
      />

      <Modal
        isOpen={modalEliminar.open}
        onClose={() => setModalEliminar({ open: false, producto: null })}
        onConfirm={handleConfirmEliminar}
        title="Eliminar producto"
        message={`¿Seguro que deseas eliminar "${modalEliminar.producto?.nombre}" del inventario? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        variant="danger"
        loading={loadingDelete}
      />
    </div>
  )
}
