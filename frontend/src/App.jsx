import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { useAuthStore } from './stores/authStore'
import './stores/themeStore'
import AppShell       from './components/layout/AppShell'
import LoginView      from './views/LoginView'
import InventarioView from './views/InventarioView'
import KanbanView     from './views/KanbanView'
import ModoSuperView  from './views/ModoSuperView'
import ProductosView  from './views/ProductosView'
import PerfilesView   from './views/PerfilesView'
import NotFoundView   from './views/NotFoundView'

function ProtectedRoute({ children }) {
  const token = useAuthStore((s) => s.token)
  return token ? children : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3200,
          style: {
            background: 'var(--color-surface-elevated)',
            color: 'var(--color-text)',
            border: '1px solid var(--color-border-strong)',
            borderRadius: '12px',
            boxShadow: 'var(--shadow-floating)',
            fontSize: '0.875rem',
            fontFamily: 'var(--font-sans)',
            padding: '10px 14px',
          },
          success: {
            iconTheme: { primary: 'var(--color-success)', secondary: '#ffffff' },
          },
          error: {
            iconTheme: { primary: 'var(--color-danger)', secondary: '#ffffff' },
          },
        }}
      />

      <Routes>
        <Route path="/login" element={<LoginView />} />

        <Route
          path="/"
          element={
            <ProtectedRoute>
              <AppShell />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/inventario" replace />} />
          <Route path="inventario"   element={<InventarioView />} />
          <Route path="productos"    element={<ProductosView />} />
          <Route path="kanban"       element={<KanbanView />} />
          <Route path="lista-compra" element={<ModoSuperView />} />
          <Route path="perfiles"     element={<PerfilesView />} />
        </Route>

        <Route path="*" element={<NotFoundView />} />
      </Routes>
    </BrowserRouter>
  )
}
