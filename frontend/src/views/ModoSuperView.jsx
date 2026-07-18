import { ShoppingCart, CheckCircle, AlertTriangle, RefreshCw, Plus, Minus, DollarSign } from 'lucide-react'
import { useModoSuper } from '../hooks/useModoSuper'
import { toast } from 'react-hot-toast'

export default function ModoSuperView() {
  const {
    criticos,
    loading,
    error,
    submitting,
    carrito,
    toggleCarrito,
    actualizarItem,
    finalizarCompra,
    refetch,
  } = useModoSuper()

  // Calcular el total del carrito en tiempo real
  const total = Object.values(carrito).reduce((sum, item) => {
    return sum + (item.precio_pagado * item.cantidad_comprada)
  }, 0)

  const handleFinalizar = async () => {
    if (Object.keys(carrito).length === 0) return
    try {
      await finalizarCompra()
      toast.success('¡Compra registrada y stock actualizado!')
    } catch (err) {
      const msg = err.response?.data?.error ?? 'Ocurrió un error al registrar la compra.'
      toast.error(msg)
    }
  }

  return (
    <div id="supermercado-page" style={styles.page}>
      {/* Header */}
      <header style={styles.header}>
        <div>
          <h1 style={styles.pageTitle}>Modo Supermercado</h1>
          <p style={styles.pageSubtitle}>
            {loading ? '…' : `${criticos.length} insumo${criticos.length !== 1 ? 's' : ''} crítico${criticos.length !== 1 ? 's' : ''}`}
          </p>
        </div>
      </header>

      {/* Estado: cargando */}
      {loading && (
        <div style={styles.list}>
          {[...Array(4)].map((_, i) => (
            <div key={i} className="skeleton" style={styles.skeletonItem} />
          ))}
        </div>
      )}

      {/* Estado: error */}
      {!loading && error && (
        <div style={styles.centerState} className="animate-fade-in">
          <AlertTriangle size={32} color="var(--color-danger)" />
          <p style={{ color: 'var(--color-danger)', fontWeight: 600 }}>Error al cargar críticos</p>
          <p style={{ color: 'var(--color-muted)', fontSize: '0.875rem' }}>{error}</p>
          <button className="btn btn-ghost" onClick={refetch} style={{ marginTop: '8px' }}>
            <RefreshCw size={16} /> Reintentar
          </button>
        </div>
      )}

      {/* Estado: despensa llena / vacío */}
      {!loading && !error && criticos.length === 0 && (
        <div style={styles.centerState} className="animate-fade-in">
          <div style={styles.successIcon}>
            <CheckCircle size={36} color="var(--color-success)" />
          </div>
          <p style={{ color: 'var(--color-text)', fontWeight: 600 }}>¡Despensa Completa!</p>
          <p style={{ color: 'var(--color-muted)', fontSize: '0.875rem' }}>
            No hay productos con stock crítico en este momento.
          </p>
        </div>
      )}

      {/* Lista de productos críticos */}
      {!loading && !error && criticos.length > 0 && (
        <div style={styles.list}>
          {criticos.map((p) => {
            const enCarrito = !!carrito[p.id]
            const item = carrito[p.id]

            return (
              <div
                key={p.id}
                className="card animate-fade-in-up"
                style={{
                  ...styles.itemCard,
                  borderColor: enCarrito ? 'rgba(88,166,255,.4)' : 'var(--color-border)',
                  background: enCarrito ? 'rgba(88,166,255,.03)' : 'rgba(22, 27, 34, 0.8)',
                }}
              >
                {/* Fila Principal */}
                <div style={styles.itemMainRow}>
                  <label style={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={enCarrito}
                      onChange={() => toggleCarrito(p)}
                      disabled={submitting}
                      style={styles.checkbox}
                    />
                    <div style={{ minWidth: 0 }}>
                      <span style={{
                        ...styles.itemName,
                        textDecoration: enCarrito ? 'line-through' : 'none',
                        color: enCarrito ? 'var(--color-muted)' : 'var(--color-text)',
                      }}>
                        {p.nombre}
                      </span>
                      <div style={styles.itemMeta}>
                        <span style={styles.metaLabel}>Mínimo: {p.cantidad_minima} {p.unidad_medida}</span>
                        <span style={styles.separator}>•</span>
                        <span style={styles.metaLabelDanger}>Actual: {p.cantidad_actual} {p.unidad_medida}</span>
                      </div>
                    </div>
                  </label>

                  <span className="badge badge-danger">
                    {p.porcentaje_visual}%
                  </span>
                </div>

                {/* Campos del Carrito (Animados/Visibles cuando se chequea) */}
                {enCarrito && item && (
                  <div style={styles.cartInputs} className="animate-fade-in-up">
                    {/* Input: Precio pagado */}
                    <div style={styles.inputGroup}>
                      <span style={styles.inputLabel}>Precio unitario</span>
                      <div style={{ position: 'relative' }}>
                        <span style={styles.currencyIcon}>$</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={item.precio_pagado}
                          onChange={(e) => actualizarItem(p.id, 'precio_pagado', e.target.value)}
                          disabled={submitting}
                          style={styles.inlineInputPrice}
                        />
                      </div>
                    </div>

                    {/* Selector de cantidad comprada */}
                    <div style={styles.inputGroup}>
                      <span style={styles.inputLabel}>Cantidad</span>
                      <div style={styles.quantityControls}>
                        <button
                          type="button"
                          onClick={() => actualizarItem(p.id, 'cantidad_comprada', Math.max(1, item.cantidad_comprada - 1))}
                          disabled={submitting || item.cantidad_comprada <= 1}
                          style={styles.qtyBtn}
                        >
                          <Minus size={12} />
                        </button>
                        <span style={styles.qtyText}>
                          {item.cantidad_comprada} <small style={{ color: 'var(--color-muted)' }}>{p.unidad_medida}</small>
                        </span>
                        <button
                          type="button"
                          onClick={() => actualizarItem(p.id, 'cantidad_comprada', item.cantidad_comprada + 1)}
                          disabled={submitting}
                          style={styles.qtyBtn}
                        >
                          <Plus size={12} />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Barra de acción fija inferior (Total + Finalizar) */}
      {Object.keys(carrito).length > 0 && (
        <div className="super-bottom-bar" style={styles.bottomBar}>
          <div style={styles.bottomBarContent}>
            <div>
              <p style={styles.totalLabel}>Total Estimado</p>
              <p style={styles.totalVal}>${total.toFixed(2)}</p>
            </div>
            <button
              onClick={handleFinalizar}
              disabled={submitting}
              className="btn btn-primary"
              style={styles.finishBtn}
            >
              {submitting ? (
                <span style={styles.spinnerInline} aria-hidden="true" />
              ) : (
                <ShoppingCart size={18} />
              )}
              {submitting ? 'Guardando…' : `Comprar (${Object.keys(carrito).length})`}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

/* ─── Estilos ─── */
const styles = {
  page: {
    maxWidth: '640px',
    margin: '0 auto',
    paddingBottom: '100px', // espacio para la bottom bar del carrito
  },
  header: {
    marginBottom: '20px',
  },
  pageTitle: {
    fontSize: '1.6rem',
    fontWeight: 700,
    color: 'var(--color-text)',
    letterSpacing: '-0.02em',
  },
  pageSubtitle: { color: 'var(--color-muted)', fontSize: '0.875rem', marginTop: '2px' },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  skeletonItem: {
    height: '76px',
    borderRadius: 'var(--radius-md)',
  },
  itemCard: {
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  itemMainRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    cursor: 'pointer',
    flex: 1,
    minWidth: 0,
  },
  checkbox: {
    width: '18px',
    height: '18px',
    borderRadius: '4px',
    border: '1px solid var(--color-border)',
    background: 'var(--color-surface2)',
    cursor: 'pointer',
    accentColor: 'var(--color-accent)',
  },
  itemName: {
    fontSize: '0.95rem',
    fontWeight: 600,
    display: 'block',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  itemMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    marginTop: '2px',
    flexWrap: 'wrap',
  },
  metaLabel: {
    fontSize: '0.75rem',
    color: 'var(--color-muted)',
  },
  metaLabelDanger: {
    fontSize: '0.75rem',
    color: 'var(--color-danger)',
  },
  separator: {
    fontSize: '0.75rem',
    color: 'var(--color-border)',
  },
  cartInputs: {
    display: 'flex',
    gap: '16px',
    paddingTop: '12px',
    borderTop: '1px solid var(--color-border)',
    flexWrap: 'wrap',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    flex: 1,
    minWidth: '140px',
  },
  inputLabel: {
    fontSize: '0.72rem',
    color: 'var(--color-muted)',
    fontWeight: 500,
  },
  currencyIcon: {
    position: 'absolute',
    left: '8px',
    top: '50%',
    transform: 'translateY(-50%)',
    fontSize: '0.85rem',
    color: 'var(--color-muted)',
    pointerEvents: 'none',
  },
  inlineInputPrice: {
    width: '100%',
    padding: '6px 10px 6px 20px',
    background: 'var(--color-surface2)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--color-text)',
    fontSize: '0.85rem',
    outline: 'none',
  },
  quantityControls: {
    display: 'inline-flex',
    alignItems: 'center',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-sm)',
    background: 'var(--color-surface2)',
    overflow: 'hidden',
    height: '32px',
  },
  qtyBtn: {
    width: '32px',
    height: '100%',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: 'var(--color-text)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background 150ms ease',
  },
  qtyText: {
    padding: '0 12px',
    fontSize: '0.85rem',
    fontWeight: 600,
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    borderLeft: '1px solid var(--color-border)',
    borderRight: '1px solid var(--color-border)',
    height: '100%',
  },
  bottomBar: {
    position: 'fixed',
    bottom: 'var(--nav-height)',
    right: 0,
    height: '76px',
    background: 'rgba(22, 27, 34, 0.95)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    borderTop: '1px solid var(--color-border)',
    zIndex: 90,
    boxShadow: '0 -4px 20px rgba(0,0,0,.4)',
  },
  bottomBarContent: {
    maxWidth: '640px',
    margin: '0 auto',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 20px',
  },
  totalLabel: {
    fontSize: '0.72rem',
    color: 'var(--color-muted)',
    fontWeight: 500,
    textTransform: 'uppercase',
  },
  totalVal: {
    fontSize: '1.4rem',
    fontWeight: 700,
    color: 'var(--color-success)',
    lineHeight: 1.1,
  },
  finishBtn: {
    padding: '12px 24px',
    fontSize: '0.95rem',
  },
  centerState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
    padding: '60px 24px',
    textAlign: 'center',
  },
  successIcon: {
    width: '72px',
    height: '72px',
    borderRadius: 'var(--radius-lg)',
    background: 'rgba(63,185,80,.08)',
    border: '1px solid rgba(63,185,80,.2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '8px',
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

// Inyectamos CSS hover/focus y responsive para la bottom bar del supermercado
const stylesSheet = document.createElement('style')
stylesSheet.textContent = `
  .super-bottom-bar {
    left: 0;
  }
  .qtyBtn:hover:not(:disabled) {
    background: var(--color-border);
  }
  .qtyBtn:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }
  @media (min-width: 768px) {
    .super-bottom-bar {
      left: var(--sidenav-width) !important;
      bottom: 0 !important; /* En desktop no hay bottom nav */
    }
  }
`
document.head.appendChild(stylesSheet)
