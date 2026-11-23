import { useState, useEffect, useCallback } from 'react'
import api from '../api/axiosInstance'

export const PRIORIDADES_TAREA = ['baja', 'media', 'alta', 'urgente']

/**
 * Custom hook para el módulo Kanban (compatible con IDs string de DynamoDB).
 * - Consume GET/POST/DELETE /api/protected/kanban/columnas
 * - Consume GET/POST/PUT/DELETE /api/protected/kanban/tareas
 * - Consume PATCH /api/protected/kanban/tareas/:id/mover
 * - Consume GET /api/protected/kanban/tareas/:id/historial
 * - Consume POST /api/protected/kanban/evaluar-avisos
 */
export function useKanban() {
  const [columnas, setColumnas] = useState([])
  const [tareas, setTareas]     = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)

  const fetchKanban = useCallback(async () => {
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
  }, [])

  const moverTarea = useCallback(async (tareaId, nuevaColumnaId) => {
    const destinoId = String(nuevaColumnaId)
    const { data } = await api.patch(`/protected/kanban/tareas/${tareaId}/mover`, {
      columna_id: destinoId,
    })
    setTareas((prev) =>
      prev.map((t) => {
        if (String(t.id) !== String(tareaId)) return t
        if (data?.tarea) return { ...t, ...data.tarea }
        const destino = columnas.find((c) => String(c.id) === destinoId)
        return {
          ...t,
          columna_id: destinoId,
          columna_nombre: destino?.nombre ?? data?.columna_nueva ?? t.columna_nombre,
        }
      })
    )
    return data
  }, [columnas])

  const crearTarea = useCallback(async (payload) => {
    const { data } = await api.post('/protected/kanban/tareas', payload)
    await fetchKanban()
    return data
  }, [fetchKanban])

  const actualizarTarea = useCallback(async (id, payload) => {
    const { data } = await api.put(`/protected/kanban/tareas/${id}`, payload)
    await fetchKanban()
    return data
  }, [fetchKanban])

  const eliminarTarea = useCallback(async (id) => {
    await api.delete(`/protected/kanban/tareas/${id}`)
    setTareas((prev) => prev.filter((t) => String(t.id) !== String(id)))
  }, [])

  const crearColumna = useCallback(async (payload) => {
    const { data } = await api.post('/protected/kanban/columnas', payload)
    await fetchKanban()
    return data
  }, [fetchKanban])

  const eliminarColumna = useCallback(async (id) => {
    await api.delete(`/protected/kanban/columnas/${id}`)
    await fetchKanban()
  }, [fetchKanban])

  const fetchHistorial = useCallback(async (tareaId) => {
    const { data } = await api.get(`/protected/kanban/tareas/${tareaId}/historial`)
    return Array.isArray(data) ? data : []
  }, [])

  const evaluarAvisos = useCallback(async () => {
    const { data } = await api.post('/protected/kanban/evaluar-avisos')
    return data
  }, [])

  useEffect(() => {
    const load = async () => {
      await fetchKanban()
    }
    load()
  }, [fetchKanban])

  return {
    columnas,
    tareas,
    loading,
    error,
    refetch: fetchKanban,
    moverTarea,
    crearTarea,
    actualizarTarea,
    eliminarTarea,
    crearColumna,
    eliminarColumna,
    fetchHistorial,
    evaluarAvisos,
  }
}
