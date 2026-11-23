import { Link } from 'react-router-dom'
import { Home } from 'lucide-react'

export default function NotFoundView() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-[var(--color-bg)] px-6 text-center">
      <p className="font-mono-num text-7xl font-bold leading-none text-[var(--color-border-strong)]">
        404
      </p>
      <h1 className="mt-3 text-xl font-semibold text-[var(--color-text)]">
        Página no encontrada
      </h1>
      <p className="mt-1.5 max-w-sm text-sm text-[var(--color-muted)]">
        La ruta que buscas no existe en HomeOps.
      </p>
      <Link to="/inventario" className="btn btn-primary mt-6">
        <Home size={17} /> Volver al inicio
      </Link>
    </div>
  )
}
