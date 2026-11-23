import { useState, useEffect } from 'react'
import {
  ShoppingCart,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Plus,
  Minus,
  X,
  Check,
} from 'lucide-react'
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

  const cantidadEnCarrito = Object.keys(carrito).length

  const handleFinalizar = async () => {
    if (cantidadEnCarrito === 0) return
    try {
      await finalizarCompra()
      toast.success('Compra registrada y despensa actualizada')
    } catch (err) {
      const msg = err.response?.data?.error ?? 'Ocurrió un error al registrar la compra.'
      toast.error(msg)
    }
  }

  return (
    <div id="supermercado-page" className="mx-auto max-w-[1040px] pb-28">
      {/* Header */}
      <header className="mb-5">
        <h1 className="text-2xl font-bold text-[var(--color-text)]">Modo supermercado</h1>
        <p className="mt-0.5 text-sm text-[var(--color-muted)]">
          {loading
            ? 'Buscando productos críticos…'
            : `${criticos.length} insumo${criticos.length !== 1 ? 's' : ''} por reponer`}
        </p>
      </header>

      {/* Cargando */}
      {loading && (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="skeleton h-20 rounded-xl" />
          ))}
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="animate-fade-in flex flex-col items-center gap-2 py-14 text-center">
          <AlertTriangle size={28} className="text-[var(--color-danger)]" />
          <p className="font-semibold text-[var(--color-danger-text)]">Error al cargar críticos</p>
          <p className="text-sm text-[var(--color-muted)]">{error}</p>
          <button type="button" className="btn btn-ghost mt-2" onClick={refetch}>
            <RefreshCw size={15} /> Reintentar
          </button>
        </div>
      )}

      {/* Despensa completa */}
      {!loading && !error && criticos.length === 0 && (
        <div className="animate-fade-in flex flex-col items-center gap-2 rounded-2xl border border-dashed border-[var(--color-border-strong)] bg-[var(--color-surface)] px-6 py-14 text-center">
          <div className="mb-1 flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--color-success-soft)] text-[var(--color-success)]">
            <CheckCircle size={26} />
          </div>
          <p className="font-semibold text-[var(--color-text)]">Despensa completa</p>
          <p className="max-w-sm text-sm text-[var(--color-muted)]">
            No hay productos con stock crítico en este momento.
          </p>
        </div>
      )}

      {/* Lista de productos críticos */}
      {!loading && !error && criticos.length > 0 && (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {criticos.map((p) => {
            const enCarrito = !!carrito[p.id]
            const item = carrito[p.id]
            const categoria = p.categoria || 'Despensa'

            return (
              <div
                key={p.id}
                className={[
                  'surface-card flex flex-col gap-3 p-4 transition-[border-color,background-color] duration-150',
                  enCarrito
                    ? 'border-[var(--color-accent-border)] bg-[var(--color-accent-soft)]'
                    : '',
                ].join(' ')}
              >
                {/* Fila principal táctil */}
                <label className="flex cursor-pointer items-center justify-between gap-3">
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <input
                      type="checkbox"
                      checked={enCarrito}
                      onChange={() => toggleCarrito(p)}
                      disabled={submitting}
                      className="sr-only"
                    />
                    <span
                      aria-hidden="true"
                      className={[
                        'flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border transition-[background-color,border-color,transform] duration-150 active:scale-95',
                        enCarrito
                          ? 'border-[var(--color-accent)] bg-[var(--color-accent)] text-[var(--color-accent-ink)]'
                          : 'border-[var(--color-border-strong)] bg-[var(--color-surface)] text-transparent',
                      ].join(' ')}
                    >
                      <Check size={14} strokeWidth={2.8} />
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span
                          className={[
                            'truncate text-[0.95rem] font-semibold transition-colors duration-150',
                            enCarrito
                              ? 'text-[var(--color-muted)] line-through'
                              : 'text-[var(--color-text)]',
                          ].join(' ')}
                        >
                          {p.nombre}
                        </span>
                        <span className="badge badge-neutral text-[11px]">{categoria}</span>
                      </div>
                      <div className="font-mono-num mt-0.5 flex flex-wrap items-center gap-1.5 text-xs">
                        <span className="text-[var(--color-muted)]">
                          Mín: {p.cantidad_minima} {p.unidad_medida}
                        </span>
                        <span className="text-[var(--color-border-strong)]">·</span>
                        <span className="font-semibold text-[var(--color-danger-text)]">
                          Actual: {p.cantidad_actual} {p.unidad_medida}
                        </span>
                      </div>
                    </div>
                  </div>

                  <span className="badge badge-danger font-mono-num shrink-0">
                    {p.porcentaje_visual}%
                  </span>
                </label>

                {/* Campos de precio y cantidad cuando está en carrito */}
                {enCarrito && item && (
                  <div className="animate-enter grid grid-cols-2 gap-3 border-t border-[var(--color-border)] pt-3">
                    <div className="flex flex-col gap-1">
                      <label
                        htmlFor={`super-price-${p.id}`}
                        className="text-[11px] font-medium text-[var(--color-muted)]"
                      >
                        Precio unitario
                      </label>
                      <div className="relative">
                        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-[var(--color-muted)]">
                          $
                        </span>
                        <input
                          id={`super-price-${p.id}`}
                          name={`precio_${p.id}`}
                          type="number"
                          inputMode="decimal"
                          step="0.01"
                          min="0"
                          value={item.precio_pagado}
                          onChange={(e) => actualizarItem(p.id, 'precio_pagado', e.target.value)}
                          disabled={submitting}
                          className="input font-mono-num min-h-[38px] py-1.5 pl-7 text-sm"
                        />
                      </div>
                    </div>

                    <div className="flex flex-col gap-1">
                      <span className="text-[11px] font-medium text-[var(--color-muted)]">
                        Cantidad comprada
                      </span>
                      <div className="flex h-[38px] items-center overflow-hidden rounded-lg border border-[var(--color-border-strong)] bg-[var(--color-surface)]">
                        <button
                          type="button"
                          onClick={() =>
                            actualizarItem(
                              p.id,
                              'cantidad_comprada',
                              Math.max(1, item.cantidad_comprada - 1)
                            )
                          }
                          disabled={submitting || item.cantidad_comprada <= 1}
                          className="flex h-full w-9 shrink-0 cursor-pointer items-center justify-center text-[var(--color-text)] transition-colors hover:bg-[var(--color-surface-subtle)] active:scale-95 disabled:opacity-35"
                          aria-label={`Disminuir cantidad de ${p.nombre}`}
                        >
                          <Minus size={14} />
                        </button>
                        <span className="font-mono-num flex h-full flex-1 items-center justify-center gap-1 border-x border-[var(--color-border)] px-2 text-sm font-semibold text-[var(--color-text)]">
                          {item.cantidad_comprada}
                          <small className="text-[11px] font-normal text-[var(--color-muted)]">
                            {p.unidad_medida}
                          </small>
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            actualizarItem(p.id, 'cantidad_comprada', item.cantidad_comprada + 1)
                          }
                          disabled={submitting}
                          className="flex h-full w-9 shrink-0 cursor-pointer items-center justify-center text-[var(--color-text)] transition-colors hover:bg-[var(--color-surface-subtle)] active:scale-95 disabled:opacity-35"
                          aria-label={`Aumentar cantidad de ${p.nombre}`}
                        >
                          <Plus size={14} />
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

      {/* Notas y artículos extra */}
      <section className="mt-8 max-w-xl">
        <h2 className="mb-2.5 text-base font-semibold text-[var(--color-text)]">
          Notas y artículos extra
        </h2>
        <form onSubmit={handleAddTemp} className="mb-3 flex gap-2">
          <input
            id="super-nota-extra"
            name="nota_extra"
            type="text"
            className="input"
            placeholder="Ej. Servilletas, pan, bolsas de basura..."
            value={inputTemp}
            onChange={(e) => setInputTemp(e.target.value)}
            enterKeyHint="done"
          />
          <button type="submit" className="btn btn-ghost shrink-0 px-3.5" aria-label="Agregar nota">
            <Plus size={18} />
          </button>
        </form>

        {itemsTemp.length > 0 && (
          <div className="flex flex-col gap-2">
            {itemsTemp.map((item) => (
              <div
                key={item.id}
                className="surface-card flex items-center justify-between gap-3 px-3.5 py-2.5"
              >
                <span className="text-sm text-[var(--color-text)]">{item.nombre}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveTemp(item.id)}
                  className="btn-icon btn-icon-danger h-7 w-7"
                  title="Eliminar nota"
                  aria-label={`Eliminar ${item.nombre}`}
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Barra flotante inferior de compra */}
      {cantidadEnCarrito > 0 && (
        <div
          className="super-checkout-bar fixed right-0 left-0 bottom-[calc(var(--nav-height)+env(safe-area-inset-bottom,0px))] z-30 border-t border-[var(--color-border-strong)] bg-[var(--color-surface-elevated)] md:bottom-0 md:left-[var(--sidenav-width)]"
          style={{ boxShadow: 'var(--shadow-bar)' }}
        >
          <div className="mx-auto flex max-w-[1040px] items-center justify-between gap-4 px-4 py-3 sm:px-6 md:px-9">
            <div>
              <p className="text-xs font-medium text-[var(--color-muted)]">Total estimado</p>
              <p className="font-mono-num text-xl font-bold leading-tight text-[var(--color-accent)]">
                ${total.toFixed(2)}
              </p>
            </div>
            <button
              type="button"
              onClick={handleFinalizar}
              disabled={submitting}
              className="btn btn-primary min-h-[44px] px-5"
            >
              {submitting ? (
                <Spinner size="sm" color="currentColor" />
              ) : (
                <ShoppingCart size={17} />
              )}
              {submitting ? 'Guardando…' : `Registrar compra (${cantidadEnCarrito})`}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
