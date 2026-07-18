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
      setProductos(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err.response?.data?.error ?? err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchProductos() }, [])

  return { productos, loading, error, refetch: fetchProductos }
}
