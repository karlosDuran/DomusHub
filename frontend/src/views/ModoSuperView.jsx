import { useState, useEffect } from 'react'
import { ShoppingCart, CheckCircle, AlertTriangle, RefreshCw, Plus, Minus, X } from 'lucide-react'
import { useModoSuper } from '../hooks/useModoSuper'
import { toast } from 'react-hot-toast'
import Spinner from '../components/ui/Spinner'

const STORAGE_KEY_MANUAL = 'homeops-lista-manual'

function leerListaManual() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_MANUAL)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

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

  const [itemsTemp, setItemsTemp] = useState(leerListaManual)
  const [inputTemp, setInputTemp] = useState('')

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_MANUAL, JSON.stringify(itemsTemp))
    } catch {
      // ignore storage quota errors
    }
  }, [itemsTemp])

  const handleAddTemp = (e) => {
    e.preventDefault()
    if (!inputTemp.trim()) return
    setItemsTemp((prev) => [...prev, { id: Date.now(), nombre: inputTemp.trim() }])
    setInputTemp('')
  }

  const handleRemoveTemp = (id) => {
    setItemsTemp((prev) => prev.filter((item) => item.id !== id))
  }

  const total = Object.values(carrito).reduce((sum, item) => {
    return sum + Number(item.precio_pagado || 0) * Number(item.cantidad_comprada || 0)
  }, 0)

  const handleFinalizar = async () => {
    if (Object.keys(carrito).length === 0) return
    try {
      await finalizarCompra()
      toast.success('¡Compra registrada y despensa actualizada!')
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
            {loading
              ? '…'
              : `${criticos.length} insumo${criticos.length !== 1 ? 's' : ''} en nivel crítico`}
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
            const categoria = p.categoria || 'Despensa'

            return (
              <div
                key={p.id}
                className="card m-nolift animate-fade-in-up"
                style={{
                  ...styles.itemCard,
                  borderColor: enCarrito ? 'var(--color-accent)' : 'var(--color-border)',
                  background: enCarrito
                    ? 'rgba(247, 148, 29, 0.06)'
                    : 'var(--color-surface)',
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
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span
                          style={{
                            ...styles.itemName,
                            textDecoration: enCarrito ? 'line-through' : 'none',
                            color: enCarrito ? 'var(--color-muted)' : 'var(--color-text)',
                          }}
                        >
                          {p.nombre}
                        </span>
                        <span className="badge badge-neutral" style={{ fontSize: '0.68rem' }}>
                          {categoria}
                        </span>
                      </div>
                      <div style={styles.itemMeta} className="font-mono-num">
                        <span style={styles.metaLabel}>
                          Mínimo: {p.cantidad_minima} {p.unidad_medida}
                        </span>
                        <span style={styles.separator}>•</span>
                        <span style={styles.metaLabelDanger}>
                          Actual: {p.cantidad_actual} {p.unidad_medida}
                        </span>
                      </div>
                    </div>
                  </label>

                  <span className="badge badge-danger font-mono-num">
                    {p.porcentaje_visual}%
                  </span>
                </div>

                {/* Campos del Carrito */}
                {enCarrito && item && (
                  <div style={styles.cartInputs} className="animate-fade-in-up">
                    {/* Input: Precio pagado */}
                    <div style={styles.inputGroup}>
                      <span style={styles.inputLabel}>Precio unitario pagado</span>
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
                          className="font-mono-num"
                        />
                      </div>
                    </div>

                    {/* Selector de cantidad comprada */}
                    <div style={styles.inputGroup}>
                      <span style={styles.inputLabel}>Cantidad comprada</span>
                      <div style={styles.quantityControls}>
                        <button
                          type="button"
                          className="qtyBtn"
                          onClick={() =>
                            actualizarItem(
                              p.id,
                              'cantidad_comprada',
                              Math.max(1, item.cantidad_comprada - 1)
                            )
                          }
                          disabled={submitting || item.cantidad_comprada <= 1}
                          style={styles.qtyBtn}
                          aria-label={`Disminuir cantidad de ${p.nombre}`}
                        >
                          <Minus size={12} />
                        </button>
                        <span style={styles.qtyText} className="font-mono-num">
                          {item.cantidad_comprada}{' '}
                          <small style={{ color: 'var(--color-muted)' }}>{p.unidad_medida}</small>
                        </span>
                        <button
                          type="button"
                          className="qtyBtn"
                          onClick={() =>
                            actualizarItem(p.id, 'cantidad_comprada', item.cantidad_comprada + 1)
                          }
                          disabled={submitting}
                          style={styles.qtyBtn}
                          aria-label={`Aumentar cantidad de ${p.nombre}`}
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

      {/* Sección: Agregar manualmente (persistida en localStorage) */}
      <div style={{ ...styles.list, marginTop: '28px' }}>
        <h2 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--color-text)', marginBottom: '4px' }}>
          Notas y artículos extra de compra
        </h2>
        <form onSubmit={handleAddTemp} style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
          <input
            type="text"
            className="input"
            placeholder="Ej. Servilletas, pan, bolsas de basura..."
            value={inputTemp}
            onChange={(e) => setInputTemp(e.target.value)}
          />
          <button type="submit" className="btn btn-ghost" style={{ padding: '0 16px' }} aria-label="Agregar nota">
            <Plus size={18} />
          </button>
        </form>

        {itemsTemp.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {itemsTemp.map((item) => (
              <div key={item.id} style={styles.tempItem} className="animate-fade-in-up">
                <span style={{ fontSize: '0.9rem', color: 'var(--color-text)' }}>{item.nombre}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveTemp(item.id)}
                  style={styles.actionBtnDanger}
                  title="Eliminar nota"
                  aria-label={`Eliminar ${item.nombre}`}
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Barra de acción fija inferior (Total + Finalizar) */}
      {Object.keys(carrito).length > 0 && (
        <div className="super-bottom-bar" style={styles.bottomBar}>
          <div style={styles.bottomBarContent}>
            <div>
              <p style={styles.totalLabel}>Total Estimado</p>
              <p style={styles.totalVal} className="font-mono-num">
                ${total.toFixed(2)}
              </p>
            </div>
            <button
              type="button"
              onClick={handleFinalizar}
              disabled={submitting}
              className="btn btn-primary"
              style={styles.finishBtn}
            >
              {submitting ? (
                <Spinner size="sm" color="currentColor" />
              ) : (
                <ShoppingCart size={18} />
              )}
              {submitting ? 'Guardando…' : `Registrar compra (${Object.keys(carrito).length})`}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

const styles = {
  page: {
    maxWidth: '680px',
    margin: '0 auto',
    paddingBottom: '104px',
  },
  header: {
    marginBottom: '20px',
  },
  pageTitle: {
    fontSize: '1.6rem',
    fontWeight: 700,
    color: 'var(--color-text)',
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
    flexShrink: 0,
  },
  itemName: {
    fontSize: '0.96rem',
    fontWeight: 600,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  itemMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    marginTop: '3px',
    flexWrap: 'wrap',
  },
  metaLabel: {
    fontSize: '0.76rem',
    color: 'var(--color-muted)',
  },
  metaLabelDanger: {
    fontSize: '0.76rem',
    color: '#f87171',
    fontWeight: 600,
  },
  separator: {
    fontSize: '0.76rem',
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
    fontSize: '0.74rem',
    color: 'var(--color-muted)',
    fontWeight: 500,
  },
  currencyIcon: {
    position: 'absolute',
    left: '10px',
    top: '50%',
    transform: 'translateY(-50%)',
    fontSize: '0.85rem',
    color: 'var(--color-muted)',
    pointerEvents: 'none',
  },
  inlineInputPrice: {
    width: '100%',
    height: '36px',
    padding: '6px 10px 6px 24px',
    background: 'var(--color-surface2)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--color-text)',
    fontSize: '0.88rem',
    outline: 'none',
  },
  quantityControls: {
    display: 'inline-flex',
    alignItems: 'center',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-sm)',
    background: 'var(--color-surface2)',
    overflow: 'hidden',
    height: '36px',
  },
  qtyBtn: {
    width: '36px',
    height: '100%',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: 'var(--color-text)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background 150ms var(--ease)',
  },
  qtyText: {
    padding: '0 12px',
    fontSize: '0.88rem',
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
    background: 'var(--color-surface)',
    borderTop: '1px solid var(--color-border-strong)',
    zIndex: 90,
    boxShadow: '0 -8px 24px rgba(0, 0, 0, 0.45)',
  },
  bottomBarContent: {
    maxWidth: '680px',
    margin: '0 auto',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 20px',
  },
  totalLabel: {
    fontSize: '0.75rem',
    color: 'var(--color-muted)',
    fontWeight: 500,
  },
  totalVal: {
    fontSize: '1.35rem',
    fontWeight: 700,
    color: '#4ade80',
    lineHeight: 1.1,
  },
  finishBtn: {
    padding: '10px 22px',
  },
  centerState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
    padding: '60px 24px',
    textAlign: 'center',
  },
  tempItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 14px',
    background: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-sm)',
  },
  actionBtnDanger: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: 'var(--color-muted)',
    padding: '4px',
    borderRadius: 'var(--radius-sm)',
    display: 'flex',
    alignItems: 'center',
  },
  successIcon: {
    width: '72px',
    height: '72px',
    borderRadius: 'var(--radius-lg)',
    background: 'rgba(46, 160, 67, 0.12)',
    border: '1px solid rgba(46, 160, 67, 0.25)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '8px',
  },
}
