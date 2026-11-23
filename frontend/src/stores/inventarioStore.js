import { create } from 'zustand'
import api from '../api/axiosInstance'
import { useAuthStore } from './authStore'

export const CATEGORIAS_INVENTARIO = [
  'Despensa',
  'Lácteos',
  'Limpieza',
  'Frutas y Verduras',
  'Carnes y Fríos',
  'Higiene',
  'Bebidas',
  'Otros',
]

export const esProductoCritico = (p) =>
  Number(p?.porcentaje_visual) <= 25 ||
  Number(p?.cantidad_actual) <= Number(p?.cantidad_minima)

export const useInventarioStore = create((set, get) => ({
  productos: [],
  loading: true,
  error: null,

  reset: () => set({ productos: [], loading: true, error: null }),

  fetchProductos: async (force = false) => {
    const { productos } = get()
    if (!force && productos.length > 0) {
      set({ loading: false })
      return
    }

    try {
      set({ loading: true, error: null })
      const { data } = await api.get('/protected/inventario')
      const lista = Array.isArray(data?.data) ? data.data : []
      set({ productos: lista, loading: false })
    } catch (err) {
      set({ error: err.response?.data?.error ?? err.message, loading: false })
    }
  },

  crearProducto: async (payload) => {
    const { data } = await api.post('/protected/inventario', payload)
    set((state) => ({
      productos: [...state.productos, data].sort((a, b) =>
        String(a.nombre || '').localeCompare(String(b.nombre || ''), 'es')
      ),
    }))
    return data
  },

  actualizarProducto: async (id, payload) => {
    const { data } = await api.put(`/protected/inventario/${id}`, payload)
    set((state) => ({
      productos: state.productos
        .map((p) => (String(p.id) === String(id) ? data : p))
        .sort((a, b) => String(a.nombre || '').localeCompare(String(b.nombre || ''), 'es')),
    }))
    return data
  },

  ajustarStock: async (id, delta) => {
    const { data } = await api.patch(`/protected/inventario/${id}/stock`, { delta })
    set((state) => ({
      productos: state.productos.map((p) => (String(p.id) === String(id) ? data : p)),
    }))
    return data
  },

  eliminarProducto: async (id) => {
    await api.delete(`/protected/inventario/${id}`)
    set((state) => ({
      productos: state.productos.filter((p) => String(p.id) !== String(id)),
    }))
  },
}))

// Limpiar caché de inventario automáticamente al cerrar sesión o expirar el JWT
useAuthStore.subscribe((state, prevState) => {
  if (!state.token && prevState?.token) {
    useInventarioStore.getState().reset()
  }
})
