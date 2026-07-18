import { useState, useEffect } from 'react'
import api from '../api/axiosInstance'

/**
 * Custom hook para el Modo Supermercado.
 * - Consume GET /api/protected/inventario/critico
 * - Consume POST /api/protected/compras/registrar
 * - Maneja el estado local del carrito (items seleccionados, precios y cantidades).
 */
export function useModoSuper() {
  const [criticos, setCriticos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [carrito, setCarrito] = useState({}) // { [id]: { id_producto, precio_pagado, cantidad_comprada, nombre, unidad_medida } }

  const fetchCriticos = async () => {
    try {
      setLoading(true)
      setError(null)
      const { data } = await api.get('/protected/inventario/critico')
      // El backend devuelve { data: [...], total: N }
      const lista = Array.isArray(data?.data) ? data.data : []
      setCriticos(lista)
    } catch (err) {
      setError(err.response?.data?.error ?? err.message)
    } finally {
      setLoading(false)
    }
  }

  // Toggle de un producto dentro del carrito
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

  // Actualizar precio o cantidad de un item en el carrito
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

  // Enviar compra al backend Slim
  const finalizarCompra = async () => {
    const items = Object.values(carrito).map((item) => ({
      id_producto: item.id_producto,
      precio_pagado: item.precio_pagado,
      cantidad_comprada: item.cantidad_comprada,
    }))

    if (items.length === 0) return

    setSubmitting(true)
    try {
      await api.post('/protected/compras/registrar', { items })
      setCarrito({}) // Limpiar carrito
      await fetchCriticos() // Recargar stock crítico
    } finally {
      setSubmitting(false)
    }
  }

  useEffect(() => {
    const load = async () => { await fetchCriticos() }
    load()
  }, [])

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
