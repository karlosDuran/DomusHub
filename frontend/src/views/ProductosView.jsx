import { useState, useEffect } from 'react'
import { Package, BookOpen, Plus, AlertTriangle, RefreshCw, Pencil } from 'lucide-react'
import { useInventarioStore } from '../stores/inventarioStore'
import ProductoModal from '../components/ui/ProductoModal'

function ProductoCatalogoCard({ producto, onEdit }) {
  return (
    <article className="card animate-fade-in-up" style={styles.card}>
      <div style={styles.cardHeader}>
        <div style={styles.cardIcon}>
          <Package size={16} color="var(--color-accent)" />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 style={styles.cardTitle}>{producto.nombre}</h3>
          <div style={styles.cardMeta}>
            <span className="badge" style={styles.badgeInfo}>
              {producto.unidad_medida}
            </span>
            <span style={styles.criticoLabel}>Mín: {producto.cantidad_minima}</span>
          </div>
        </div>
        <button
          onClick={() => onEdit(producto)}
          style={styles.actionBtn}
          title="Editar producto"
          aria-label={`Editar ${producto.nombre}`}
        >
          <Pencil size={14} />
        </button>
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
  const refetch = () => fetchProductos(true)

  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [productoEdit, setProductoEdit] = useState(null)

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

  const productosFiltrados = productos.filter((p) => 
    p.nombre.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div id="productos-page" style={styles.page}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.pageTitle}>Catálogo de Insumos</h1>
          <p style={styles.pageSubtitle}>
            {loading ? '…' : `${productos.length} insumo${productos.length !== 1 ? 's' : ''} registrado${productos.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <button
          className="btn btn-primary"
          style={{ gap: '6px' }}
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

      {loading && productos.length === 0 && (
        <div style={styles.grid}>
          {[...Array(6)].map((_, i) => (
            <div key={i} className="skeleton" style={{ height: '72px', borderRadius: 'var(--radius-md)' }} />
          ))}
        </div>
      )}

      {!loading && error && productos.length === 0 && (
        <div style={styles.centerState} className="animate-fade-in">
          <AlertTriangle size={32} color="var(--color-danger)" />
          <p style={{ color: 'var(--color-danger)', fontWeight: 600 }}>Error al cargar</p>
          <p style={{ color: 'var(--color-muted)', fontSize: '0.875rem' }}>{error}</p>
          <button className="btn btn-ghost" onClick={refetch} style={{ marginTop: '8px' }}>
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
          <p style={{ color: 'var(--color-text)', fontWeight: 500 }}>No se encontraron coincidencias.</p>
        </div>
      )}

      {productosFiltrados.length > 0 && (
        <div style={styles.grid}>
          {productosFiltrados.map((p) => (
            <ProductoCatalogoCard
              key={p.id}
              producto={p}
              onEdit={handleOpenEdit}
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
    </div>
  )
}

const styles = {
  page: { maxWidth: '720px', margin: '0 auto' },
  header: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: '16px',
    marginBottom: '20px',
  },
  pageTitle: {
    fontSize: '1.6rem',
    fontWeight: 700,
    color: 'var(--color-text)',
    letterSpacing: '-0.02em',
  },
  pageSubtitle: { color: 'var(--color-muted)', fontSize: '0.875rem', marginTop: '2px' },
  searchBar: {
    marginBottom: '20px'
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '12px',
  },
  card: { padding: '12px 16px' },
  cardHeader: { display: 'flex', alignItems: 'center', gap: '12px' },
  cardIcon: {
    width: '32px',
    height: '32px',
    borderRadius: 'var(--radius-sm)',
    background: 'rgba(88,166,255,.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  cardTitle: { 
    fontSize: '0.95rem', 
    fontWeight: 600, 
    color: 'var(--color-text)', 
    marginBottom: '2px', 
    overflow: 'hidden', 
    textOverflow: 'ellipsis', 
    whiteSpace: 'nowrap' 
  },
  cardMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  badgeInfo: {
    background: 'var(--color-surface2)',
    color: 'var(--color-text)',
    border: '1px solid var(--color-border)',
    fontSize: '0.7rem'
  },
  criticoLabel: {
    fontSize: '0.75rem',
    color: 'var(--color-muted)'
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
    transition: 'color 150ms ease, background 150ms ease',
    marginLeft: 'auto'
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
