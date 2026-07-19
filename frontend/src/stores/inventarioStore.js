import { create } from 'zustand'
import api from '../api/axiosInstance'

export const useInventarioStore = create((set, get) => ({
  productos: [],
  loading: true,
  error: null,
  
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
    set((state) => ({ productos: [...state.productos, data] }))
    return data
  },

  actualizarProducto: async (id, payload) => {
    const { data } = await api.put(`/protected/inventario/${id}`, payload)
    set((state) => ({
      productos: state.productos.map((p) => (p.id === id ? data : p))
    }))
    return data
  },

  eliminarProducto: async (id) => {
    await api.delete(`/protected/inventario/${id}`)
    set((state) => ({
      productos: state.productos.filter((p) => p.id !== id)
    }))
  }
}))
