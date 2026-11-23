import { useState, useEffect } from 'react'
import { Package, BookOpen, Plus, AlertTriangle, RefreshCw, Pencil, Trash2 } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { useInventarioStore, CATEGORIAS_INVENTARIO } from '../stores/inventarioStore'
import ProductoModal from '../components/ui/ProductoModal'
import Modal from '../components/ui/Modal'

function ProductoCatalogoCard({ producto, onEdit, onDelete }) {
  const categoria = producto.categoria || 'Despensa'

  return (
    <article className="card animate-fade-in-up" style={styles.card}>
      <div style={styles.cardHeader}>
        <div style={styles.cardIcon}>
          <Package size={16} color="var(--color-accent)" />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={styles.titleRow}>
            <h3 style={styles.cardTitle} title={producto.nombre}>
              {producto.nombre}
            </h3>
            <span className="badge badge-neutral" style={{ fontSize: '0.7rem' }}>
              {categoria}
            </span>
          </div>
          <div style={styles.cardMeta} className="font-mono-num">
            <span className="badge badge-neutral" style={{ fontSize: '0.7rem' }}>
              {producto.unidad_medida}
            </span>
            <span style={styles.metaLabel}>Actual: {producto.cantidad_actual}</span>
            <span style={styles.metaLabel}>Mín: {producto.cantidad_minima}</span>
            {producto.precio_promedio ? (
              <span style={styles.metaLabel}>
                Ref: ${Number(producto.precio_promedio).toFixed(2)}
              </span>
            ) : null}
          </div>
        </div>
        <div className="actions" style={styles.actions}>
          <button
            type="button"
            onClick={() => onEdit(producto)}
            style={styles.actionBtn}
            title="Editar producto"
            aria-label={`Editar ${producto.nombre}`}
          >
            <Pencil size={14} />
          </button>
          <button
            type="button"
            onClick={() => onDelete(producto)}
            className="action-btn-danger"
            style={styles.actionBtn}
            title="Eliminar producto"
            aria-label={`Eliminar ${producto.nombre}`}
          >
            <Trash2 size={14} />
          </button>
        </div>
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
    <div id="productos-page" style={styles.page}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.pageTitle}>Catálogo de Insumos</h1>
          <p style={styles.pageSubtitle}>
            {loading
              ? '…'
              : `${productos.length} insumo${productos.length !== 1 ? 's' : ''} registrado${productos.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          onClick={handleOpenNew}
        >
          <Plus size={18} /> Nuevo Insumo
        </button>
      </header>

      <div style={styles.searchBar}>
        <input
          type="text"
          placeholder="Buscar producto por nombre..."
          className="input"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Filtro por categoría */}
      <div style={styles.categoryScroll} role="tablist" aria-label="Filtro por categoría">
        {['Todas', ...CATEGORIAS_INVENTARIO].map((cat) => (
          <button
            key={cat}
            type="button"
            role="tab"
            aria-selected={categoriaActiva === cat}
            onClick={() => setCategoriaActiva(cat)}
            style={{
              ...styles.catPill,
              ...(categoriaActiva === cat ? styles.catPillActive : {}),
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      {loading && productos.length === 0 && (
        <div style={styles.grid}>
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="skeleton"
              style={{ height: '76px', borderRadius: 'var(--radius-md)' }}
            />
          ))}
        </div>
      )}

      {!loading && error && productos.length === 0 && (
        <div style={styles.centerState} className="animate-fade-in">
          <AlertTriangle size={32} color="var(--color-danger)" />
          <p style={{ color: 'var(--color-danger)', fontWeight: 600 }}>Error al cargar</p>
          <p style={{ color: 'var(--color-muted)', fontSize: '0.875rem' }}>{error}</p>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={refetch}
            style={{ marginTop: '8px' }}
          >
            <RefreshCw size={16} /> Reintentar
          </button>
        </div>
      )}

      {!loading && !error && productos.length === 0 && (
        <div style={styles.centerState} className="animate-fade-in">
          <div style={styles.emptyIcon}>
            <BookOpen size={36} color="var(--color-muted)" />
          </div>
          <p style={{ color: 'var(--color-text)', fontWeight: 600 }}>El catálogo está vacío</p>
          <p style={{ color: 'var(--color-muted)', fontSize: '0.875rem' }}>
            Empieza registrando los insumos de tu hogar.
          </p>
        </div>
      )}

      {productos.length > 0 && productosFiltrados.length === 0 && (
        <div style={styles.centerState} className="animate-fade-in">
          <p style={{ color: 'var(--color-text)', fontWeight: 500 }}>
            No se encontraron coincidencias para tu búsqueda o categoría.
          </p>
        </div>
      )}

      {productosFiltrados.length > 0 && (
        <div style={styles.grid}>
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
        title="Eliminar Insumo"
        message={`¿Deseas eliminar "${modalEliminar.producto?.nombre}" del catálogo e inventario?`}
        confirmText="Eliminar"
        variant="danger"
        loading={loadingDelete}
      />
    </div>
  )
}

const styles = {
  page: { maxWidth: '820px', margin: '0 auto' },
  header: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: '16px',
    marginBottom: '18px',
  },
  pageTitle: {
    fontSize: '1.6rem',
    fontWeight: 700,
    color: 'var(--color-text)',
  },
  pageSubtitle: { color: 'var(--color-muted)', fontSize: '0.875rem', marginTop: '2px' },
  searchBar: {
    marginBottom: '12px',
  },
  categoryScroll: {
    display: 'flex',
    gap: '6px',
    overflowX: 'auto',
    paddingBottom: '12px',
    marginBottom: '12px',
  },
  catPill: {
    padding: '5px 13px',
    borderRadius: '999px',
    border: '1px solid var(--color-border)',
    background: 'var(--color-surface)',
    color: 'var(--color-muted)',
    fontSize: '0.8rem',
    fontWeight: 500,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    transition: 'all 150ms var(--ease)',
  },
  catPillActive: {
    background: 'var(--color-surface2)',
    borderColor: 'var(--color-accent)',
    color: 'var(--color-text)',
    fontWeight: 600,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))',
    gap: '12px',
  },
  card: { padding: '14px 16px' },
  cardHeader: { display: 'flex', alignItems: 'center', gap: '12px' },
  cardIcon: {
    width: '34px',
    height: '34px',
    borderRadius: 'var(--radius-sm)',
    background: 'rgba(247, 148, 29, 0.12)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  titleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    flexWrap: 'wrap',
    marginBottom: '4px',
  },
  cardTitle: {
    fontSize: '0.95rem',
    fontWeight: 600,
    color: 'var(--color-text)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  cardMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexWrap: 'wrap',
  },
  metaLabel: {
    fontSize: '0.76rem',
    color: 'var(--color-muted)',
  },
  actions: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    marginLeft: 'auto',
    flexShrink: 0,
  },
  actionBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: 'var(--color-muted)',
    padding: '6px',
    borderRadius: 'var(--radius-sm)',
    display: 'flex',
    alignItems: 'center',
  },
  centerState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
    padding: '60px 24px',
    textAlign: 'center',
  },
  emptyIcon: {
    width: '72px',
    height: '72px',
    borderRadius: 'var(--radius-lg)',
    background: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '8px',
  },
}
