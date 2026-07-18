import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * Store de autenticación global con Zustand.
 * Persiste en localStorage bajo la clave 'domushub-auth' para mantener
 * la sesión al recargar la página.
 *
 * Estado:
 *   token  — JWT firmado por el backend (null si no autenticado)
 *   user   — { id, nombre } del usuario logueado
 *
 * Acciones:
 *   login(token, user)  — guarda token y datos del usuario
 *   logout()            — limpia el estado (el interceptor de Axios lo llama en 401)
 */
export const useAuthStore = create(
  persist(
    (set) => ({
      token: null,
      user: null,

      login: (token, user) => set({ token, user }),

      logout: () => set({ token: null, user: null }),
    }),
    {
      name: 'domushub-auth',
    }
  )
)
