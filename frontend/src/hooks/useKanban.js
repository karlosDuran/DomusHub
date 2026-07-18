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

  const moverTarea = async (tareaId, nuevaColumnaId) => {
    await api.patch(`/protected/kanban/tareas/${tareaId}/mover`, {
      columna_id: Number(nuevaColumnaId),
    })
    setTareas((prev) =>
      prev.map((t) =>
        t.id === Number(tareaId)
          ? { ...t, columna_id: Number(nuevaColumnaId) }
          : t
      )
    )
  }

  const crearTarea = async (payload) => {
    const { data } = await api.post('/protected/kanban/tareas', payload)
    // El backend Slim API en crearTarea devuelve el objeto de tarea sin col/usuario nombre
    // Hacemos refetch para que se cargue con los datos completos del JOIN
    await fetchKanban()
    return data
  }

  const actualizarTarea = async (id, payload) => {
    const { data } = await api.put(`/protected/kanban/tareas/${id}`, payload)
    // Mismo motivo, hacemos refetch para traer los campos joined actualizados
    await fetchKanban()
    return data
  }

  const eliminarTarea = async (id) => {
    await api.delete(`/protected/kanban/tareas/${id}`)
    setTareas((prev) => prev.filter((t) => t.id !== id))
  }

  const fetchHistorial = async (tareaId) => {
    const { data } = await api.get(`/protected/kanban/tareas/${tareaId}/historial`)
    return Array.isArray(data) ? data : []
  }

  useEffect(() => {
    const load = async () => { await fetchKanban() }
    load()
  }, [])

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
    fetchHistorial
  }
}
