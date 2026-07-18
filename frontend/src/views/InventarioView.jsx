import { useState } from 'react'
import { Plus, Package, AlertTriangle, RefreshCw, Pencil, Trash2 } from 'lucide-react'
import { useInventario } from '../hooks/useInventario'
import ProductoModal from '../components/ui/ProductoModal'
import Modal from '../components/ui/Modal'
import { toast } from 'react-hot-toast'

// ── Componente: barra de stock coloreada ─────────────────────────────────────
function StockBar({ porcentaje }) {
  const pct = Number(porcentaje) || 0
  const color =
    pct > 50  ? 'var(--color-success)' :
    pct > 25  ? 'var(--color-warning)' :
                'var(--color-danger)'

  return (
    <div className="stock-bar-track" style={{ marginTop: '8px' }}>
      <div
        className="stock-bar-fill"
        style={{ width: `${pct}%`, background: color }}
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
      />
    </div>
  )
}

// ── Componente: tarjeta de producto ─────────────────────────────────────────
function ProductoCard({ producto, onEdit, onDelete }) {
  const pct     = Number(producto.porcentaje_visual) || 0
  const critico = pct <= 25

  return (
    <article className="card animate-fade-in-up" style={styles.card}>
      <div style={styles.cardHeader}>
        <div style={styles.cardIcon}>
          <Package size={18} color="var(--color-accent)" />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 style={styles.cardTitle}>{producto.nombre}</h3>
          <p style={styles.cardSub}>
            {producto.cantidad_actual} {producto.unidad_medida}
          </p>
        </div>
        {/* Acciones de Edición/Borrado */}
        <div style={styles.actions}>
          <button
            onClick={() => onEdit(producto)}
            style={styles.actionBtn}
            title="Editar producto"
            aria-label={`Editar ${producto.nombre}`}
          >
            <Pencil size={14} />
          </button>
          <button
            onClick={() => onDelete(producto)}
            style={styles.actionBtnDanger}
            title="Eliminar producto"
            aria-label={`Eliminar ${producto.nombre}`}
          >
            <Trash2 size={14} />
          </button>
        </div>
        
        {critico && (
          <span className="badge badge-danger" style={{ gap: '4px', alignItems: 'center' }}>
            <AlertTriangle size={12} /> Crítico
          </span>
        )}
        {!critico && pct <= 50 && (
          <span className="badge badge-warning">{pct}%</span>
        )}
        {pct > 50 && (
          <span className="badge badge-success">{pct}%</span>
        )}
      </div>
      <StockBar porcentaje={pct} />
      {producto.precio_promedio ? (
        <p style={styles.cardPrice}>
          Precio ref: <strong>${Number(producto.precio_promedio).toFixed(2)}</strong>
        </p>
      ) : (
        <p style={styles.cardPriceMuted}>Sin precio registrado</p>
      )}
    </article>
  )
}

// ── Skeleton cards ────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div style={styles.skeletonCard}>
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
        <div className="skeleton" style={{ width: '36px', height: '36px', borderRadius: 'var(--radius-sm)', flexShrink: 0 }} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div className="skeleton" style={{ height: '14px', width: '60%', borderRadius: '4px' }} />
          <div className="skeleton" style={{ height: '12px', width: '40%', borderRadius: '4px' }} />
        </div>
      </div>
      <div className="skeleton" style={{ height: '6px', width: '100%', borderRadius: '999px', marginTop: '12px' }} />
    </div>
  )
}

// ── Vista principal ───────────────────────────────────────────────────────────
export default function InventarioView() {
  const {
    productos,
    loading,
    error,
    refetch,
    crearProducto,
    actualizarProducto,
    eliminarProducto
  } = useInventario()

  const [filtro, setFiltro] = useState('todo') // 'todo' | 'critico'

  // Modales states
  const [modalProducto, setModalProducto] = useState({ open: false, producto: null })
  const [modalEliminar, setModalEliminar] = useState({ open: false, producto: null })
  const [loadingDelete, setLoadingDelete] = useState(false)

  const productosFiltrados = filtro === 'critico'
    ? productos.filter((p) => Number(p.porcentaje_visual) <= 25)
    : productos

  // Callback de guardado desde el ProductoModal (Crea o Edita en backend)
  const handleSaveProducto = async (formData) => {
    if (modalProducto.producto) {
      // Modo edición
      await actualizarProducto(modalProducto.producto.id, formData)
    } else {
      // Modo creación
      await crearProducto(formData)
    }
  }

  // Callback para eliminar definitivamente
  const handleConfirmEliminar = async () => {
    if (!modalEliminar.producto) return
    setLoadingDelete(true)
    try {
      await eliminarProducto(modalEliminar.producto.id)
      toast.success('Producto eliminado correctamente')
      setModalEliminar({ open: false, producto: null })
    } catch {
      toast.error('Error al intentar eliminar el producto.')
    } finally {
      setLoadingDelete(false)
    }
  }

  return (
    <div id="inventario-page" style={styles.page}>
      {/* Header */}
      <header style={styles.header}>
        <div>
          <h1 style={styles.pageTitle}>Despensa</h1>
          <p style={styles.pageSubtitle}>
            {loading ? '…' : `${productos.length} producto${productos.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <button
          className="btn btn-primary"
          id="inventario-add-btn"
          style={{ gap: '6px' }}
          onClick={() => setModalProducto({ open: true, producto: null })}
        >
          <Plus size={18} /> Agregar
        </button>
      </header>

      {/* Tabs de filtro */}
      <div style={styles.tabs} role="tablist">
        {[
          { key: 'todo',    label: 'Todo' },
          { key: 'critico', label: '⚠ Crítico' },
        ].map(({ key, label }) => (
          <button
            key={key}
            role="tab"
            aria-selected={filtro === key}
            onClick={() => setFiltro(key)}
            style={{
              ...styles.tab,
              ...(filtro === key ? styles.tabActive : {}),
            }}
          >
            {label}
            {key === 'critico' && !loading && (
              <span style={styles.tabBadge}>
                {productos.filter((p) => Number(p.porcentaje_visual) <= 25).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Estado: cargando */}
      {loading && (
        <div style={styles.skeletonGrid}>
          {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
      )}

      {/* Estado: error */}
      {!loading && error && (
        <div style={styles.errorState} className="animate-fade-in">
          <AlertTriangle size={32} color="var(--color-danger)" />
          <p style={{ color: 'var(--color-danger)', fontWeight: 600 }}>Error al cargar</p>
          <p style={{ color: 'var(--color-muted)', fontSize: '0.875rem' }}>{error}</p>
          <button className="btn btn-ghost" onClick={refetch} style={{ marginTop: '8px' }}>
            <RefreshCw size={16} /> Reintentar
          </button>
        </div>
      )}

      {/* Estado: vacío */}
      {!loading && !error && productosFiltrados.length === 0 && (
        <div style={styles.emptyState} className="animate-fade-in">
          <div style={styles.emptyIcon}>
            <Package size={36} color="var(--color-muted)" />
          </div>
          <p style={{ color: 'var(--color-text)', fontWeight: 600 }}>
            {filtro === 'critico' ? '¡Todo el stock está bien!' : 'No hay productos aún'}
          </p>
          <p style={{ color: 'var(--color-muted)', fontSize: '0.875rem' }}>
            {filtro === 'critico'
              ? 'No hay productos en estado crítico.'
              : 'Agrega el primer producto de tu despensa.'}
          </p>
        </div>
      )}

      {/* Lista de productos */}
      {!loading && !error && productosFiltrados.length > 0 && (
        <div style={styles.grid}>
          {productosFiltrados.map((p) => (
            <ProductoCard
              key={p.id}
              producto={p}
              onEdit={(prod) => setModalProducto({ open: true, producto: prod })}
              onDelete={(prod) => setModalEliminar({ open: true, producto: prod })}
            />
          ))}
        </div>
      )}

      {/* modal de formulario: Crear / Editar */}
      <ProductoModal
        isOpen={modalProducto.open}
        onClose={() => setModalProducto({ open: false, producto: null })}
        onSave={handleSaveProducto}
        producto={modalProducto.producto}
      />

      {/* modal de confirmación de eliminación */}
      <Modal
        isOpen={modalEliminar.open}
        onClose={() => setModalEliminar({ open: false, producto: null })}
        onConfirm={handleConfirmEliminar}
        title="Eliminar Producto"
        message={`¿Estás seguro de que deseas eliminar "${modalEliminar.producto?.nombre}" del inventario? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        variant="danger"
        loading={loadingDelete}
      />
    </div>
  )
}

/* ─── Estilos ─── */
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
  tabs: { display: 'flex', gap: '8px', marginBottom: '20px' },
  tab: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 16px',
    borderRadius: '999px',
    border: '1px solid var(--color-border)',
    background: 'transparent',
    color: 'var(--color-muted)',
    fontSize: '0.875rem',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 150ms ease',
  },
  tabActive: {
    background: 'rgba(88,166,255,.12)',
    borderColor: 'rgba(88,166,255,.4)',
    color: 'var(--color-accent)',
  },
  tabBadge: {
    background: 'var(--color-danger)',
    color: '#fff',
    borderRadius: '999px',
    padding: '1px 7px',
    fontSize: '0.7rem',
    fontWeight: 700,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '12px',
  },
  skeletonGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '12px',
  },
  card: { padding: '16px', position: 'relative' },
  cardHeader: { display: 'flex', alignItems: 'center', gap: '12px', position: 'relative' },
  cardIcon: {
    width: '36px',
    height: '36px',
    borderRadius: 'var(--radius-sm)',
    background: 'rgba(88,166,255,.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  cardTitle: { fontSize: '0.95rem', fontWeight: 600, color: 'var(--color-text)', marginBottom: '2px', paddingRight: '48px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  cardSub: { fontSize: '0.8rem', color: 'var(--color-muted)' },
  cardPrice: { fontSize: '0.78rem', color: 'var(--color-muted)', marginTop: '8px' },
  cardPriceMuted: { fontSize: '0.78rem', color: 'var(--color-muted)', marginTop: '8px', fontStyle: 'italic' },
  actions: {
    position: 'absolute',
    right: 0,
    top: '50%',
    transform: 'translateY(-50%)',
    display: 'flex',
    gap: '4px',
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
  },
  actionBtnDanger: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: 'var(--color-muted)',
    padding: '6px',
    borderRadius: 'var(--radius-sm)',
    display: 'flex',
    alignItems: 'center',
    transition: 'color 150ms ease, background 150ms ease',
  },
  skeletonCard: {
    background: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    padding: '16px',
  },
  emptyState: {
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
  errorState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
    padding: '48px 24px',
    textAlign: 'center',
  },
}

// Inyectamos CSS hover para que los botones de acción se vean en hover en desktop, y siempre en mobile
const hoverStyleSheet = document.createElement('style')
hoverStyleSheet.textContent = `
  .card .actions {
    opacity: 0.2;
    transition: opacity 150ms ease;
  }
  .card:hover .actions {
    opacity: 1;
  }
  .card .actions button:hover {
    background: var(--color-surface2);
  }
  .card .actions button:first-child:hover {
    color: var(--color-accent);
  }
  .card .actions button:last-child:hover {
    color: var(--color-danger);
  }
  @media (max-width: 767px) {
    .card .actions {
      opacity: 1;
    }
  }
`
document.head.appendChild(hoverStyleSheet)
