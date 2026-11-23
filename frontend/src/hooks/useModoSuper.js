import { useState, useEffect, useCallback } from 'react'
import api from '../api/axiosInstance'
import { useInventarioStore } from '../stores/inventarioStore'

/**
 * Custom hook para el Modo Supermercado.
 * - Consume GET /api/protected/inventario/critico
 * - Consume POST /api/protected/compras/registrar
 * - Sincroniza automáticamente useInventarioStore tras registrar compras
 */
export function useModoSuper() {
  const [criticos, setCriticos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [carrito, setCarrito] = useState({})

  const fetchCriticos = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const { data } = await api.get('/protected/inventario/critico')
      const lista = Array.isArray(data?.data) ? data.data : []
      setCriticos(lista)
    } catch (err) {
      setError(err.response?.data?.error ?? err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  const toggleCarrito = (producto) => {
    setCarrito((prev) => {
      const copy = { ...prev }
      if (copy[producto.id]) {
        delete copy[producto.id]
      } else {
        copy[producto.id] = {
          id_producto: producto.id,
          nombre: producto.nombre,
          unidad_medida: producto.unidad_medida,
          precio_pagado: producto.precio_promedio ? Number(producto.precio_promedio) : 0,
          cantidad_comprada: 1,
        }
      }
      return copy
    })
  }

  const actualizarItem = (id, campo, valor) => {
    setCarrito((prev) => {
      if (!prev[id]) return prev
      return {
        ...prev,
        [id]: {
          ...prev[id],
          [campo]: Number(valor),
        },
      }
    })
  }

  const finalizarCompra = async () => {
    const items = Object.values(carrito).map((item) => ({
      id_producto: item.id_producto,
      precio_pagado: Number(item.precio_pagado) || 0,
      cantidad_comprada: Number(item.cantidad_comprada) || 1,
    }))

    if (items.length === 0) return

    setSubmitting(true)
    try {
      await api.post('/protected/compras/registrar', { items })
      setCarrito({})
      await Promise.all([
        fetchCriticos(),
        useInventarioStore.getState().fetchProductos(true),
      ])
    } finally {
      setSubmitting(false)
    }
  }

  useEffect(() => {
    const load = async () => {
      await fetchCriticos()
    }
    load()
  }, [fetchCriticos])

  return {
    criticos,
    loading,
    error,
    submitting,
    carrito,
    toggleCarrito,
    actualizarItem,
    finalizarCompra,
    refetch: fetchCriticos,
  }
}
