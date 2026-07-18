import axios from 'axios'
import { useAuthStore } from '../stores/authStore'

/**
 * Instancia Axios centralizada para DomusHub.
 * - baseURL apunta a /api (el proxy de Vite lo redirige al backend Slim en :8080)
 * - Interceptor de REQUEST: inyecta automáticamente el JWT en el header Authorization
 * - Interceptor de RESPONSE: limpia la sesión si el backend devuelve 401
 */
const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
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
    if (error.response?.status === 401) {
      // Token expirado o inválido → cerrar sesión automáticamente
      useAuthStore.getState().logout()
    }
    return Promise.reject(error)
  }
)

export default api
