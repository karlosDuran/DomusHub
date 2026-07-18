import { useState, useEffect } from 'react'
import api from '../api/axiosInstance'

/**
 * Custom hook para el módulo de Inventario.
 * - Consume GET /api/protected/inventario
 * - Expone: productos, loading, error y refetch()
 */
export function useInventario() {
  const [productos, setProductos] = useState([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState(null)

  const fetchProductos = async () => {
    try {
      setLoading(true)
      setError(null)
      const { data } = await api.get('/protected/inventario')
      // El backend devuelve { data: [...], total: N }
      const lista = Array.isArray(data?.data) ? data.data : []
      setProductos(lista)
    } catch (err) {
      setError(err.response?.data?.error ?? err.message)
    } finally {
      setLoading(false)
    }
  }

  const crearProducto = async (payload) => {
    const { data } = await api.post('/protected/inventario', payload)
    setProductos((prev) => [...prev, data])
    return data
  }

  const actualizarProducto = async (id, payload) => {
    const { data } = await api.put(`/protected/inventario/${id}`, payload)
    setProductos((prev) => prev.map((p) => (p.id === id ? data : p)))
    return data
  }

  const eliminarProducto = async (id) => {
    await api.delete(`/protected/inventario/${id}`)
    setProductos((prev) => prev.filter((p) => p.id !== id))
  }

  useEffect(() => {
    const load = async () => { await fetchProductos() }
    load()
  }, [])

  return {
    productos,
    loading,
    error,
    refetch: fetchProductos,
    crearProducto,
    actualizarProducto,
    eliminarProducto
  }
}
