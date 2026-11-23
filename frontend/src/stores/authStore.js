import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * Store de autenticación global con Zustand.
 * Persiste en localStorage bajo la clave 'domushub-auth' para mantener
 * la sesión al recargar la página.
 *
 * Estado:
 *   token  — JWT firmado por el backend (null si no autenticado)
 *   user   — { id, nombre, rol, avatar_color } del integrante logueado
 */
export const useAuthStore = create(
  persist(
    (set) => ({
      token: null,
      user: null,

      login: (token, user) => set({ token, user }),

      updateUser: (partial) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...partial } : state.user,
        })),

      logout: () => set({ token: null, user: null }),
    }),
    {
      name: 'domushub-auth',
    }
  )
)
