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

// ── Componente: barra de stock coloreada ─────────────────────────────────────
function StockBar({ porcentaje, critico }) {
  const pct = Number(porcentaje) || 0
  const color = critico
    ? 'var(--color-danger)'
    : pct <= 50
      ? 'var(--color-warning)'
      : 'var(--color-success)'

  return (
    <div className="stock-bar-track" style={{ marginTop: '10px' }}>
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

// ── Componente: tarjeta de producto con consumo rápido -1 / +1 ───────────────
function ProductoCard({ producto, onEdit, onDelete, onAjustarStock, adjusting }) {
  const pct = Number(producto.porcentaje_visual) || 0
  const critico = esProductoCritico(producto)
  const categoria = producto.categoria || 'Despensa'

  return (
    <article className="card animate-fade-in-up" style={styles.card}>
      <div style={styles.cardHeader}>
        <div style={styles.cardIcon}>
          <Package size={18} color="var(--color-accent)" />
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
          <p style={styles.cardSub} className="font-mono-num">
            <strong>{producto.cantidad_actual}</strong> {producto.unidad_medida}{' '}
            <span style={{ color: 'var(--color-muted)' }}>
              (mín. {producto.cantidad_minima})
            </span>
          </p>
        </div>

        {/* Acciones de Edición / Borrado */}
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

      <StockBar porcentaje={pct} critico={critico} />

      {/* Fila inferior: Estado + Controles rápidos de cocina (-1 / +1) */}
      <div style={styles.cardFooter}>
        <div>
          {critico ? (
            <span className="badge badge-danger">
              <AlertTriangle size={12} /> Crítico ({pct}%)
            </span>
          ) : pct <= 50 ? (
            <span className="badge badge-warning font-mono-num">{pct}%</span>
          ) : (
            <span className="badge badge-success font-mono-num">{pct}%</span>
          )}

          {producto.precio_promedio ? (
            <span style={styles.cardPrice} className="font-mono-num">
              ${Number(producto.precio_promedio).toFixed(2)}
            </span>
          ) : null}
        </div>

        {/* Botones rápidos -1 / +1 (disparan DynamoDB Streams → SNS al llegar al mínimo) */}
        <div style={styles.quickStockGroup} aria-label={`Ajustar stock de ${producto.nombre}`}>
          <button
            type="button"
            className="qtyBtn font-mono-num"
            style={styles.quickStockBtn}
            disabled={adjusting || Number(producto.cantidad_actual) <= 0}
            onClick={() => onAjustarStock(producto, -1)}
            title="Descontar 1 unidad en cocina"
            aria-label={`Restar 1 a ${producto.nombre}`}
          >
            <Minus size={13} /> 1
          </button>
          <button
            type="button"
            className="qtyBtn font-mono-num"
            style={styles.quickStockBtn}
            disabled={adjusting}
            onClick={() => onAjustarStock(producto, 1)}
            title="Sumar 1 unidad"
            aria-label={`Sumar 1 a ${producto.nombre}`}
          >
            <Plus size={13} /> 1
          </button>
        </div>
      </div>
    </article>
  )
}

// ── Skeleton cards ────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div style={styles.skeletonCard}>
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
        <div
          className="skeleton"
          style={{ width: '36px', height: '36px', borderRadius: 'var(--radius-sm)', flexShrink: 0 }}
        />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div className="skeleton" style={{ height: '14px', width: '60%', borderRadius: '4px' }} />
          <div className="skeleton" style={{ height: '12px', width: '40%', borderRadius: '4px' }} />
        </div>
      </div>
      <div
        className="skeleton"
        style={{ height: '6px', width: '100%', borderRadius: '999px', marginTop: '12px' }}
      />
    </div>
  )
}

// ── Vista principal ───────────────────────────────────────────────────────────
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

  const [filtro, setFiltro] = useState('todo') // 'todo' | 'critico'
  const [categoriaActiva, setCategoriaActiva] = useState('Todas')
  const [adjustingId, setAdjustingId] = useState(null)

  // Modales states
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
          `Stock crítico de ${actualizado.nombre} (${actualizado.cantidad_actual} ${actualizado.unidad_medida}). DynamoDB Streams notificará por SNS.`,
          { icon: '⚠️' }
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
            {loading
              ? '…'
              : `${productos.length} producto${productos.length !== 1 ? 's' : ''} en inventario`}
          </p>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          id="inventario-add-btn"
          onClick={() => setModalProducto({ open: true, producto: null })}
        >
          <Plus size={18} /> Agregar
        </button>
      </header>

      {/* Tabs de estado: Todo / Crítico */}
      <div style={styles.tabs} role="tablist" aria-label="Filtro de estado de stock">
        {[
          { key: 'todo',    label: 'Todo' },
          { key: 'critico', label: '⚠ Crítico' },
        ].map(({ key, label }) => (
          <button
            key={key}
            type="button"
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
              <span style={styles.tabBadge} className="font-mono-num">
                {totalCriticos}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Pills de categoría */}
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

      {/* Estado: cargando */}
      {loading && (
        <div style={styles.skeletonGrid}>
          {[...Array(6)].map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      )}

      {/* Estado: error */}
      {!loading && error && (
        <div style={styles.errorState} className="animate-fade-in">
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

      {/* Estado: vacío */}
      {!loading && !error && productosFiltrados.length === 0 && (
        <div style={styles.emptyState} className="animate-fade-in">
          <div style={styles.emptyIcon}>
            <Package size={36} color="var(--color-muted)" />
          </div>
          <p style={{ color: 'var(--color-text)', fontWeight: 600 }}>
            {filtro === 'critico'
              ? '¡Todo el stock está en buen nivel!'
              : categoriaActiva !== 'Todas'
                ? `Sin productos en "${categoriaActiva}"`
                : 'No hay productos aún'}
          </p>
          <p style={{ color: 'var(--color-muted)', fontSize: '0.875rem' }}>
            {filtro === 'critico'
              ? 'No hay productos en umbral crítico.'
              : 'Agrega productos a tu despensa o cambia el filtro de categoría.'}
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
              adjusting={adjustingId === p.id}
              onAjustarStock={handleAjustarStock}
              onEdit={(prod) => setModalProducto({ open: true, producto: prod })}
              onDelete={(prod) => setModalEliminar({ open: true, producto: prod })}
            />
          ))}
        </div>
      )}

      {/* Modal de formulario: Crear / Editar */}
      <ProductoModal
        isOpen={modalProducto.open}
        onClose={() => setModalProducto({ open: false, producto: null })}
        onSave={handleSaveProducto}
        producto={modalProducto.producto}
      />

      {/* Modal de confirmación de eliminación */}
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
  tabs: { display: 'flex', gap: '8px', marginBottom: '12px' },
  tab: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '7px 16px',
    borderRadius: '999px',
    border: '1px solid var(--color-border)',
    background: 'transparent',
    color: 'var(--color-muted)',
    fontSize: '0.875rem',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 150ms var(--ease)',
  },
  tabActive: {
    background: 'rgba(247, 148, 29, 0.14)',
    borderColor: 'rgba(247, 148, 29, 0.45)',
    color: 'var(--color-accent)',
  },
  tabBadge: {
    background: 'var(--color-danger)',
    color: '#fff',
    borderRadius: '999px',
    padding: '1px 7px',
    fontSize: '0.72rem',
    fontWeight: 700,
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
    gap: '14px',
  },
  skeletonGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))',
    gap: '14px',
  },
  card: { padding: '16px', position: 'relative' },
  cardHeader: { display: 'flex', alignItems: 'flex-start', gap: '12px' },
  cardIcon: {
    width: '36px',
    height: '36px',
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
    marginBottom: '2px',
  },
  cardTitle: {
    fontSize: '0.96rem',
    fontWeight: 600,
    color: 'var(--color-text)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  cardSub: { fontSize: '0.82rem', color: 'var(--color-text)' },
  cardFooter: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '10px',
    marginTop: '12px',
  },
  cardPrice: {
    fontSize: '0.78rem',
    color: 'var(--color-muted)',
    marginLeft: '8px',
  },
  quickStockGroup: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
  },
  quickStockBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '3px',
    height: '32px',
    padding: '0 10px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--color-border-strong)',
    background: 'var(--color-surface2)',
    color: 'var(--color-text)',
    fontSize: '0.78rem',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'background 150ms var(--ease)',
  },
  actions: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    flexShrink: 0,
    marginLeft: 'auto',
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
