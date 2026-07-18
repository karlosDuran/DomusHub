import { useState, useEffect } from 'react'
import api from '../api/axiosInstance'

/**
 * Custom hook para el módulo Kanban.
 * - Consume GET /api/protected/kanban/columnas y /api/protected/kanban/tareas
 * - Expone: columnas, tareas, loading, error y refetch()
 */
export function useKanban() {
  const [columnas, setColumnas] = useState([])
  const [tareas, setTareas]     = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)

  const fetchKanban = async () => {
    try {
      setLoading(true)
      setError(null)
      const [resCol, resTar] = await Promise.all([
        api.get('/protected/kanban/columnas'),
        api.get('/protected/kanban/tareas'),
      ])
      setColumnas(Array.isArray(resCol.data) ? resCol.data : [])
      setTareas(Array.isArray(resTar.data)   ? resTar.data   : [])
    } catch (err) {
      setError(err.response?.data?.error ?? err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const load = async () => { await fetchKanban() }
    load()
  }, [])

  return { columnas, tareas, loading, error, refetch: fetchKanban }
}
