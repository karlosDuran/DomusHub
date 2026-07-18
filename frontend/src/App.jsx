import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { useAuthStore } from './stores/authStore'
import AppShell      from './components/layout/AppShell'
import LoginView     from './views/LoginView'
import InventarioView from './views/InventarioView'
import KanbanView    from './views/KanbanView'
import ModoSuperView from './views/ModoSuperView'
import NotFoundView  from './views/NotFoundView'

/**
 * ProtectedRoute — Redirige al login si no hay token válido en el store.
 */
function ProtectedRoute({ children }) {
  const token = useAuthStore((s) => s.token)
  return token ? children : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <BrowserRouter>
      {/* Toasts globales */}
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: 'var(--color-surface)',
            color: 'var(--color-text)',
            border: '1px solid var(--color-border)',
            fontSize: '0.875rem',
          },
          success: { iconTheme: { primary: 'var(--color-success)', secondary: '#fff' } },
          error:   { iconTheme: { primary: 'var(--color-danger)',  secondary: '#fff' } },
        }}
      />

      <Routes>
        {/* Ruta pública — Login */}
        <Route path="/login" element={<LoginView />} />

        {/* Rutas protegidas — requieren JWT */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <AppShell />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/inventario" replace />} />
          <Route path="inventario" element={<InventarioView />} />
          <Route path="kanban"     element={<KanbanView />} />
          <Route path="supermercado" element={<ModoSuperView />} />
        </Route>

        {/* 404 */}
        <Route path="*" element={<NotFoundView />} />
      </Routes>
    </BrowserRouter>
  )
}
