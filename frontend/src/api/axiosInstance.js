import axios from 'axios'
import { useAuthStore } from '../stores/authStore'

/**
 * Instancia Axios centralizada para HomeOps.
 * - baseURL apunta a VITE_API_URL (/api en CloudFront y en proxy local de Vite)
 * - Interceptor de REQUEST: inyecta automáticamente el JWT en el header Authorization
 * - Interceptor de RESPONSE: limpia la sesión si el backend devuelve 401 en rutas protegidas
 */
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 15000,
})

// ── Interceptor de petición ────────────────────────────────────────────────
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// ── Interceptor de respuesta ───────────────────────────────────────────────
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const url = error.config?.url || ''
    const isPublicAuth = url.includes('/auth/login') || url.includes('/auth/perfiles')
    if (error.response?.status === 401 && !isPublicAuth) {
      useAuthStore.getState().logout()
    }
    return Promise.reject(error)
  }
)

export default api
