import { useState, useEffect } from 'react'
import {
  BookOpen,
  Plus,
  AlertTriangle,
  RefreshCw,
  Pencil,
  Trash2,
  Search,
  X,
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import { useInventarioStore, CATEGORIAS_INVENTARIO } from '../stores/inventarioStore'
import ProductoModal from '../components/ui/ProductoModal'
import Modal from '../components/ui/Modal'

function ProductoCatalogoCard({ producto, onEdit, onDelete }) {
  const categoria = producto.categoria || 'Despensa'

  return (
    <article className="surface-card surface-card-interactive group flex flex-col justify-between gap-3 p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h3
            className="truncate text-[0.95rem] font-semibold text-[var(--color-text)]"
            title={producto.nombre}
          >
            {producto.nombre}
          </h3>
          <span className="badge badge-neutral mt-1.5 text-[11px]">{categoria}</span>
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

      <div className="font-mono-num flex items-center justify-between gap-2 border-t border-[var(--color-border)] pt-2.5 text-xs">
        <div className="flex items-center gap-2.5 text-[var(--color-muted)]">
          <span className="rounded-md bg-[var(--color-surface-subtle)] px-1.5 py-0.5 text-[11px] font-medium text-[var(--color-text)]">
            {producto.unidad_medida}
          </span>
          <span>
            Actual <strong className="text-[var(--color-text)]">{producto.cantidad_actual}</strong>
          </span>
          <span>
            Mín <strong className="text-[var(--color-text)]">{producto.cantidad_minima}</strong>
          </span>
        </div>
        {producto.precio_promedio ? (
          <span className="font-semibold text-[var(--color-text)]">
            ${Number(producto.precio_promedio).toFixed(2)}
          </span>
        ) : null}
      </div>
    </article>
  )
}

export default function ProductosView() {
  const productos = useInventarioStore((s) => s.productos)
  const loading = useInventarioStore((s) => s.loading)
  const error = useInventarioStore((s) => s.error)
  const fetchProductos = useInventarioStore((s) => s.fetchProductos)
  const crearProducto = useInventarioStore((s) => s.crearProducto)
  const actualizarProducto = useInventarioStore((s) => s.actualizarProducto)
  const eliminarProducto = useInventarioStore((s) => s.eliminarProducto)
  const refetch = () => fetchProductos(true)

  const [search, setSearch] = useState('')
  const [categoriaActiva, setCategoriaActiva] = useState('Todas')
  const [modalOpen, setModalOpen] = useState(false)
  const [productoEdit, setProductoEdit] = useState(null)
  const [modalEliminar, setModalEliminar] = useState({ open: false, producto: null })
  const [loadingDelete, setLoadingDelete] = useState(false)

  useEffect(() => {
    fetchProductos()
  }, [fetchProductos])

  const handleSaveProducto = async (formData) => {
    if (productoEdit) {
      await actualizarProducto(productoEdit.id, formData)
    } else {
      await crearProducto(formData)
    }
  }

  const handleOpenNew = () => {
    setProductoEdit(null)
    setModalOpen(true)
  }

  const handleOpenEdit = (prod) => {
    setProductoEdit(prod)
    setModalOpen(true)
  }

  const handleConfirmEliminar = async () => {
    if (!modalEliminar.producto) return
    setLoadingDelete(true)
    try {
      await eliminarProducto(modalEliminar.producto.id)
      toast.success('Insumo eliminado del catálogo')
      setModalEliminar({ open: false, producto: null })
    } catch {
      toast.error('Error al eliminar el insumo.')
    } finally {
      setLoadingDelete(false)
    }
  }

  const productosFiltrados = productos.filter((p) => {
    const coincideNombre = p.nombre.toLowerCase().includes(search.toLowerCase())
    const coincideCat =
      categoriaActiva === 'Todas' || (p.categoria || 'Despensa') === categoriaActiva
    return coincideNombre && coincideCat
  })

  return (
    <div id="productos-page" className="mx-auto max-w-[1120px]">
      <header className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text)]">Catálogo de insumos</h1>
          <p className="mt-0.5 text-sm text-[var(--color-muted)]">
            {loading
              ? 'Cargando catálogo…'
              : `${productos.length} insumo${productos.length !== 1 ? 's' : ''} registrado${productos.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <button type="button" className="btn btn-primary" onClick={handleOpenNew}>
          <Plus size={17} /> Nuevo insumo
        </button>
      </header>

      {/* Buscador */}
      <div className="relative mb-3 max-w-md">
        <Search
          size={16}
          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-muted)]"
        />
        <input
          id="productos-search"
          name="search"
          type="text"
          placeholder="Buscar producto por nombre..."
          className="input pl-10 pr-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch('')}
            className="btn-icon absolute right-1.5 top-1/2 h-7 w-7 -translate-y-1/2"
            aria-label="Limpiar búsqueda"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Categorías */}
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

      {loading && productos.length === 0 && (
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="skeleton h-28 rounded-xl" />
          ))}
        </div>
      )}

      {!loading && error && productos.length === 0 && (
        <div className="animate-fade-in flex flex-col items-center gap-2 py-14 text-center">
          <AlertTriangle size={28} className="text-[var(--color-danger)]" />
          <p className="font-semibold text-[var(--color-danger-text)]">Error al cargar</p>
          <p className="text-sm text-[var(--color-muted)]">{error}</p>
          <button type="button" className="btn btn-ghost mt-2" onClick={refetch}>
            <RefreshCw size={15} /> Reintentar
          </button>
        </div>
      )}

      {!loading && !error && productos.length === 0 && (
        <div className="animate-fade-in flex flex-col items-center gap-2 rounded-2xl border border-dashed border-[var(--color-border-strong)] bg-[var(--color-surface)] px-6 py-14 text-center">
          <div className="mb-1 flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--color-surface-subtle)] text-[var(--color-muted)]">
            <BookOpen size={24} />
          </div>
          <p className="font-semibold text-[var(--color-text)]">El catálogo está vacío</p>
          <p className="text-sm text-[var(--color-muted)]">
            Empieza registrando los insumos habituales de tu hogar.
          </p>
          <button type="button" className="btn btn-primary mt-3" onClick={handleOpenNew}>
            <Plus size={16} /> Nuevo insumo
          </button>
        </div>
      )}

      {productos.length > 0 && productosFiltrados.length === 0 && (
        <div className="animate-fade-in rounded-2xl border border-dashed border-[var(--color-border-strong)] bg-[var(--color-surface)] py-12 text-center">
          <p className="text-sm font-medium text-[var(--color-muted)]">
            No se encontraron coincidencias para tu búsqueda o categoría.
          </p>
        </div>
      )}

      {productosFiltrados.length > 0 && (
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
          {productosFiltrados.map((p) => (
            <ProductoCatalogoCard
              key={p.id}
              producto={p}
              onEdit={handleOpenEdit}
              onDelete={(prod) => setModalEliminar({ open: true, producto: prod })}
            />
          ))}
        </div>
      )}

      <ProductoModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSaveProducto}
        producto={productoEdit}
      />

      <Modal
        isOpen={modalEliminar.open}
        onClose={() => setModalEliminar({ open: false, producto: null })}
        onConfirm={handleConfirmEliminar}
        title="Eliminar insumo"
        message={`¿Deseas eliminar "${modalEliminar.producto?.nombre}" del catálogo e inventario?`}
        confirmText="Eliminar"
        variant="danger"
        loading={loadingDelete}
      />
    </div>
  )
}
