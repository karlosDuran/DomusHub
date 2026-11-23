import { useState, useEffect, useRef } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import {
  LogIn,
  Home,
  Eye,
  EyeOff,
  KeyRound,
  UserCheck,
  RefreshCw,
  ArrowLeft,
  Sun,
  Moon,
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import api from '../api/axiosInstance'
import { useAuthStore } from '../stores/authStore'
import { useThemeStore } from '../stores/themeStore'
import Spinner from '../components/ui/Spinner'

export default function LoginView() {
  const navigate = useNavigate()
  const token = useAuthStore((s) => s.token)
  const login = useAuthStore((s) => s.login)
  const theme = useThemeStore((s) => s.theme)
  const toggleTheme = useThemeStore((s) => s.toggleTheme)

  const [modo, setModo] = useState('pin')
  const [perfiles, setPerfiles] = useState([])
  const [loadingPerfiles, setLoadingPerfiles] = useState(true)
  const [perfilSeleccionado, setPerfilSeleccionado] = useState(null)
  const [pin, setPin] = useState('')
  const [shakeKey, setShakeKey] = useState(0)

  const [form, setForm] = useState({ nombre: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [showPass, setShowPass] = useState(false)
  const pinInputRef = useRef(null)

  const cargarPerfiles = async () => {
    setLoadingPerfiles(true)
    try {
      const { data } = await api.get('/auth/perfiles')
      const lista = Array.isArray(data) ? data : []
      setPerfiles(lista)
      if (lista.length === 0) {
        setModo('password')
      }
    } catch {
      setPerfiles([])
    } finally {
      setLoadingPerfiles(false)
    }
  }

  useEffect(() => {
    const load = async () => {
      if (!token) {
        await cargarPerfiles()
      }
    }
    load()
  }, [token])

  if (token) {
    return <Navigate to="/inventario" replace />
  }

  const handleSelectPerfil = (perfil) => {
    setError(null)
    setPin('')
    if (!perfil.tiene_pin) {
      setForm((prev) => ({ ...prev, nombre: perfil.nombre }))
      setModo('password')
      toast('Este perfil no tiene PIN activo. Ingresa con tu contraseña.')
      return
    }
    setPerfilSeleccionado(perfil)
  }

  const handlePinChange = (e) => {
    const clean = e.target.value.replace(/\D/g, '').slice(0, 4)
    setError(null)
    setPin(clean)
  }

  const handlePinSubmit = async (e) => {
    e.preventDefault()
    if (!perfilSeleccionado) return
    if (pin.length !== 4) {
      setError('Ingresa los 4 dígitos de tu PIN.')
      setShakeKey((k) => k + 1)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const { data } = await api.post('/auth/login-pin', {
        user_id: perfilSeleccionado.id,
        pin,
      })
      login(data.token, data.user ?? perfilSeleccionado)
      toast.success(`¡Hola, ${perfilSeleccionado.nombre}!`)
      navigate('/inventario', { replace: true })
    } catch (err) {
      const msg = err.response?.data?.error ?? 'No se pudo verificar el PIN.'
      setError(msg)
      setPin('')
      setShakeKey((k) => k + 1)
      pinInputRef.current?.focus()
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e) => {
    setError(null)
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handlePasswordSubmit = async (e) => {
    e.preventDefault()
    if (!form.nombre.trim() || !form.password) {
      setError('Por favor completa usuario y contraseña.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const { data } = await api.post('/auth/login', {
        nombre: form.nombre.trim(),
        password: form.password,
      })
      login(data.token, data.user ?? { nombre: form.nombre.trim() })
      toast.success(`¡Bienvenido, ${data.user?.nombre ?? form.nombre.trim()}!`)
      navigate('/inventario', { replace: true })
    } catch (err) {
      const msg = err.response?.data?.error ?? 'Error al conectar con el servidor.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      id="login-page"
      className="relative flex min-h-dvh items-center justify-center bg-[var(--color-bg)] px-4 py-8"
      style={{
        paddingTop: 'calc(2rem + env(safe-area-inset-top, 0px))',
        paddingBottom: 'calc(2rem + env(safe-area-inset-bottom, 0px))',
      }}
    >
      {/* Toggle de tema discreto */}
      <button
        type="button"
        onClick={toggleTheme}
        className="btn-icon fixed right-4 top-4 border border-[var(--color-border)] bg-[var(--color-surface)]"
        style={{ top: 'calc(1rem + env(safe-area-inset-top, 0px))' }}
        aria-label={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
        title={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      >
        {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
      </button>

      <main className="animate-enter w-full max-w-[440px] rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 sm:p-8">
        {/* Cabecera de marca */}
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3.5 flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--color-accent)] text-[var(--color-accent-ink)]">
            <Home size={22} strokeWidth={2.1} />
          </div>
          <h1 className="text-2xl font-bold tracking-[-0.03em] text-[var(--color-text)]">
            HomeOps
          </h1>
          <p className="mt-1.5 text-sm text-[var(--color-muted)]">
            Despensa inteligente, compras y tareas del hogar
          </p>
        </div>

        {/* Selector segmentado con indicador deslizante */}
        <div
          role="tablist"
          aria-label="Método de acceso"
          className="relative mb-6 grid grid-cols-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)] p-1"
        >
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-1 left-1 w-[calc(50%-4px)] rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] transition-transform duration-200"
            style={{
              transitionTimingFunction: 'var(--ease-in-out)',
              transform: modo === 'password' ? 'translateX(100%)' : 'translateX(0)',
            }}
          />
          <button
            type="button"
            role="tab"
            aria-selected={modo === 'pin'}
            onClick={() => {
              setModo('pin')
              setError(null)
            }}
            className={[
              'relative z-10 flex min-h-[38px] cursor-pointer items-center justify-center gap-1.5 rounded-lg px-3 text-xs sm:text-sm font-semibold transition-colors duration-150',
              modo === 'pin' ? 'text-[var(--color-text)]' : 'text-[var(--color-muted)]',
            ].join(' ')}
          >
            <UserCheck size={15} />
            Acceso PIN
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={modo === 'password'}
            onClick={() => {
              setModo('password')
              setPerfilSeleccionado(null)
              setError(null)
            }}
            className={[
              'relative z-10 flex min-h-[38px] cursor-pointer items-center justify-center gap-1.5 rounded-lg px-3 text-xs sm:text-sm font-semibold transition-colors duration-150',
              modo === 'password' ? 'text-[var(--color-text)]' : 'text-[var(--color-muted)]',
            ].join(' ')}
          >
            <KeyRound size={15} />
            Contraseña
          </button>
        </div>

        {/* PESTAÑA 1: ACCESO RÁPIDO CON PIN */}
        {modo === 'pin' && (
          <section aria-label="Acceso rápido con PIN">
            {loadingPerfiles ? (
              <div className="grid grid-cols-3 gap-2.5">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="skeleton h-24 rounded-xl" />
                ))}
              </div>
            ) : perfiles.length === 0 ? (
              <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)] p-5 text-center">
                <p className="text-sm text-[var(--color-muted)]">
                  No se encontraron perfiles cargados o el servidor está sin conexión.
                </p>
                <div className="mt-4 flex justify-center gap-2">
                  <button type="button" className="btn btn-ghost" onClick={cargarPerfiles}>
                    <RefreshCw size={15} /> Reintentar
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => setModo('password')}
                  >
                    Usar contraseña
                  </button>
                </div>
              </div>
            ) : !perfilSeleccionado ? (
              <>
                <p className="mb-3.5 text-sm text-[var(--color-muted)]">
                  Selecciona tu perfil familiar para ingresar:
                </p>
                <div
                  className="grid gap-2.5"
                  style={{
                    gridTemplateColumns:
                      perfiles.length === 2 || perfiles.length === 4
                        ? 'repeat(2, 1fr)'
                        : 'repeat(auto-fit, minmax(112px, 1fr))',
                  }}
                >
                  {perfiles.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleSelectPerfil(p)}
                      className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)] px-3 py-4 text-center transition-[transform,border-color,background-color] duration-150 active:scale-[0.97] hover:border-[var(--color-accent-border)] hover:bg-[var(--color-surface)]"
                    >
                      <span
                        className="flex h-11 w-11 items-center justify-center rounded-full text-base font-bold text-white"
                        style={{ backgroundColor: p.avatar_color || 'var(--color-accent)' }}
                      >
                        {p.nombre?.[0]?.toUpperCase() ?? 'U'}
                      </span>
                      <span className="w-full truncate text-sm font-semibold text-[var(--color-text)]">
                        {p.nombre}
                      </span>
                      <span className="text-[11px] font-medium text-[var(--color-muted)]">
                        {p.tiene_pin ? 'PIN 4 dígitos' : 'Contraseña'}
                      </span>
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <form onSubmit={handlePinSubmit} className="flex flex-col gap-4" noValidate>
                <div className="flex items-center justify-between gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)] px-3.5 py-2.5">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                      style={{
                        backgroundColor: perfilSeleccionado.avatar_color || 'var(--color-accent)',
                      }}
                    >
                      {perfilSeleccionado.nombre?.[0]?.toUpperCase() ?? 'U'}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-[var(--color-text)]">
                        {perfilSeleccionado.nombre}
                      </p>
                      <p className="text-xs text-[var(--color-muted)]">Ingresa tu PIN</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setPerfilSeleccionado(null)
                      setPin('')
                      setError(null)
                    }}
                    className="btn btn-ghost min-h-[34px] px-2.5 text-xs"
                  >
                    <ArrowLeft size={14} /> Cambiar
                  </button>
                </div>

                {/* Casillas visuales de PIN sincronizadas con el input real */}
                <div className="flex flex-col gap-2">
                  <label
                    htmlFor="login-pin-input"
                    className="text-xs font-medium text-[var(--color-muted)]"
                  >
                    PIN de acceso (4 dígitos)
                  </label>
                  <div
                    key={shakeKey}
                    className={`relative ${shakeKey > 0 && error ? 'animate-shake' : ''}`}
                    onClick={() => pinInputRef.current?.focus()}
                  >
                    <div className="grid grid-cols-4 gap-2.5" aria-hidden="true">
                      {[0, 1, 2, 3].map((idx) => {
                        const filled = idx < pin.length
                        const isActive = idx === pin.length && !loading
                        return (
                          <div
                            key={idx}
                            className={[
                              'flex h-14 items-center justify-center rounded-xl border text-xl font-bold transition-[border-color,background-color] duration-150',
                              filled
                                ? 'border-[var(--color-accent)] bg-[var(--color-accent-soft)] text-[var(--color-accent)]'
                                : isActive
                                  ? 'border-[var(--color-accent)] bg-[var(--color-surface)]'
                                  : 'border-[var(--color-border-strong)] bg-[var(--color-surface)]',
                            ].join(' ')}
                          >
                            {filled ? (
                              <span className="h-2.5 w-2.5 rounded-full bg-[var(--color-accent)]" />
                            ) : null}
                          </div>
                        )
                      })}
                    </div>
                    <input
                      ref={pinInputRef}
                      id="login-pin-input"
                      name="pin"
                      type="password"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={4}
                      value={pin}
                      onChange={handlePinChange}
                      autoFocus
                      disabled={loading}
                      autoComplete="one-time-code"
                      aria-label="PIN de 4 dígitos"
                      className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                    />
                  </div>
                </div>

                {error && (
                  <div
                    role="alert"
                    className="animate-fade-in rounded-xl border border-[rgba(196,62,59,0.28)] bg-[var(--color-danger-soft)] px-3.5 py-2.5 text-sm text-[var(--color-danger-text)]"
                  >
                    {error}
                  </div>
                )}

                <button
                  id="login-pin-submit"
                  type="submit"
                  disabled={loading || pin.length !== 4}
                  className="btn btn-primary min-h-[44px] w-full"
                >
                  {loading ? <Spinner size="sm" color="currentColor" /> : <LogIn size={17} />}
                  {loading ? 'Verificando PIN...' : 'Desbloquear'}
                </button>
              </form>
            )}
          </section>
        )}

        {/* PESTAÑA 2: USUARIO Y CONTRASEÑA */}
        {modo === 'password' && (
          <form onSubmit={handlePasswordSubmit} noValidate className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="login-nombre" className="text-xs font-medium text-[var(--color-muted)]">
                Integrante / Usuario
              </label>
              <input
                id="login-nombre"
                name="nombre"
                type="text"
                className="input"
                placeholder="Ej. admin"
                value={form.nombre}
                onChange={handleChange}
                autoComplete="username"
                autoCapitalize="none"
                autoCorrect="off"
                autoFocus
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="login-password"
                className="text-xs font-medium text-[var(--color-muted)]"
              >
                Contraseña
              </label>
              <div className="relative">
                <input
                  id="login-password"
                  name="password"
                  type={showPass ? 'text' : 'password'}
                  className="input pr-11"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={handleChange}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
                  className="btn-icon absolute right-1.5 top-1/2 -translate-y-1/2"
                  aria-label={showPass ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showPass ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>

            {error && (
              <div
                role="alert"
                className="animate-fade-in rounded-xl border border-[rgba(196,62,59,0.28)] bg-[var(--color-danger-soft)] px-3.5 py-2.5 text-sm text-[var(--color-danger-text)]"
              >
                {error}
              </div>
            )}

            <button
              id="login-submit"
              type="submit"
              disabled={loading}
              className="btn btn-primary mt-1 min-h-[44px] w-full"
            >
              {loading ? <Spinner size="sm" color="currentColor" /> : <LogIn size={17} />}
              {loading ? 'Ingresando...' : 'Iniciar sesión'}
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-xs text-[var(--color-muted)]">
          HomeOps &copy; {new Date().getFullYear()} · Gestión familiar del hogar
        </p>
      </main>
    </div>
  )
}
