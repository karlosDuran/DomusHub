import { useState, useEffect } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { LogIn, Home, Eye, EyeOff, KeyRound, UserCheck, RefreshCw, ArrowLeft } from 'lucide-react'
import { toast } from 'react-hot-toast'
import api from '../api/axiosInstance'
import { useAuthStore } from '../stores/authStore'
import Spinner from '../components/ui/Spinner'

export default function LoginView() {
  const navigate = useNavigate()
  const token = useAuthStore((s) => s.token)
  const login = useAuthStore((s) => s.login)

  // Modo de acceso: 'pin' (Acceso rápido familiar) | 'password' (Usuario y contraseña)
  const [modo, setModo] = useState('pin')

  // Estado para Acceso Rápido con PIN
  const [perfiles, setPerfiles] = useState([])
  const [loadingPerfiles, setLoadingPerfiles] = useState(true)
  const [perfilSeleccionado, setPerfilSeleccionado] = useState(null)
  const [pin, setPin] = useState('')

  // Estado para Usuario y Contraseña
  const [form, setForm] = useState({ nombre: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [showPass, setShowPass] = useState(false)

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
      // Si el backend aún no está disponible o falla la carga inicial, mostramos login clásico
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

  // Si ya hay sesión activa, redirigir al inventario
  if (token) {
    return <Navigate to="/inventario" replace />
  }

  const handleSelectPerfil = (perfil) => {
    setError(null)
    setPin('')
    if (!perfil.tiene_pin) {
      setForm((prev) => ({ ...prev, nombre: perfil.nombre }))
      setModo('password')
      toast('Este perfil no tiene PIN activo. Ingresa con tu contraseña.', { icon: '🔑' })
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
    <div id="login-page" style={styles.page}>
      <main style={styles.cardWrapper} className="card m-nolift animate-scale-in">
        {/* Cabecera de marca */}
        <div style={styles.logoArea}>
          <div style={styles.logoIcon}>
            <Home size={26} color="var(--color-accent)" strokeWidth={1.9} />
          </div>
          <h1 style={styles.title}>HomeOps</h1>
          <p style={styles.subtitle}>
            Gestión doméstica, despensa inteligente y tareas familiares
          </p>
        </div>

        {/* Selector de pestañas: Acceso Rápido (PIN) vs Contraseña */}
        <div style={styles.modeTabs} role="tablist" aria-label="Método de acceso">
          <button
            type="button"
            role="tab"
            aria-selected={modo === 'pin'}
            onClick={() => {
              setModo('pin')
              setError(null)
            }}
            style={{
              ...styles.modeTab,
              ...(modo === 'pin' ? styles.modeTabActive : {}),
            }}
          >
            <UserCheck size={16} />
            Acceso Rápido (PIN)
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
            style={{
              ...styles.modeTab,
              ...(modo === 'password' ? styles.modeTabActive : {}),
            }}
          >
            <KeyRound size={16} />
            Contraseña
          </button>
        </div>

        {/* PESTAÑA 1: ACCESO RÁPIDO POR PERFIL + PIN */}
        {modo === 'pin' && (
          <section aria-label="Acceso rápido con PIN">
            {loadingPerfiles ? (
              <div style={styles.perfilesGrid}>
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="skeleton" style={{ height: '84px' }} />
                ))}
              </div>
            ) : perfiles.length === 0 ? (
              <div style={styles.emptyPerfiles}>
                <p style={{ color: 'var(--color-muted)', fontSize: '0.9rem' }}>
                  No se encontraron perfiles cargados o el servidor está sin conexión.
                </p>
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginTop: '12px' }}>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={cargarPerfiles}
                  >
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
                <p style={styles.helperText}>
                  Selecciona tu perfil familiar para ingresar con tu PIN de 4 dígitos:
                </p>
                <div style={styles.perfilesGrid}>
                  {perfiles.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleSelectPerfil(p)}
                      style={styles.perfilCard}
                    >
                      <span
                        style={{
                          ...styles.perfilAvatar,
                          background: p.avatar_color || 'var(--color-accent)',
                        }}
                      >
                        {p.nombre?.[0]?.toUpperCase() ?? 'U'}
                      </span>
                      <span style={styles.perfilNombre}>{p.nombre}</span>
                      <span style={styles.perfilMeta}>
                        {p.tiene_pin ? 'PIN 4 dígitos' : 'Usar contraseña'}
                      </span>
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <form onSubmit={handlePinSubmit} style={styles.form} noValidate>
                <div style={styles.selectedProfileBar}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span
                      style={{
                        ...styles.perfilAvatarSmall,
                        background: perfilSeleccionado.avatar_color || 'var(--color-accent)',
                      }}
                    >
                      {perfilSeleccionado.nombre?.[0]?.toUpperCase() ?? 'U'}
                    </span>
                    <div>
                      <p style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--color-text)' }}>
                        {perfilSeleccionado.nombre}
                      </p>
                      <p style={{ fontSize: '0.76rem', color: 'var(--color-muted)' }}>
                        Ingresa tu PIN de 4 dígitos
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setPerfilSeleccionado(null)
                      setPin('')
                      setError(null)
                    }}
                    style={styles.backProfileBtn}
                  >
                    <ArrowLeft size={14} /> Cambiar
                  </button>
                </div>

                <div style={styles.fieldGroup}>
                  <label htmlFor="login-pin-input" style={styles.label}>
                    PIN de Acceso (4 dígitos)
                  </label>
                  <input
                    id="login-pin-input"
                    name="pin"
                    type="password"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={4}
                    className="input font-mono-num"
                    placeholder="••••"
                    value={pin}
                    onChange={handlePinChange}
                    autoFocus
                    disabled={loading}
                    style={styles.pinInput}
                  />
                </div>

                {error && (
                  <div role="alert" style={styles.errorBox} className="animate-fade-in">
                    {error}
                  </div>
                )}

                <button
                  id="login-pin-submit"
                  type="submit"
                  disabled={loading || pin.length !== 4}
                  className="btn btn-primary"
                  style={styles.submitBtn}
                >
                  {loading ? (
                    <Spinner size="sm" color="currentColor" />
                  ) : (
                    <LogIn size={18} />
                  )}
                  {loading ? 'Verificando PIN...' : 'Desbloquear con PIN'}
                </button>
              </form>
            )}
          </section>
        )}

        {/* PESTAÑA 2: USUARIO Y CONTRASEÑA */}
        {modo === 'password' && (
          <form onSubmit={handlePasswordSubmit} noValidate style={styles.form}>
            <div style={styles.fieldGroup}>
              <label htmlFor="login-nombre" style={styles.label}>
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
                autoFocus
              />
            </div>

            <div style={styles.fieldGroup}>
              <label htmlFor="login-password" style={styles.label}>
                Contraseña
              </label>
              <div style={styles.passwordWrapper}>
                <input
                  id="login-password"
                  name="password"
                  type={showPass ? 'text' : 'password'}
                  className="input"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={handleChange}
                  autoComplete="current-password"
                  style={{ paddingRight: '44px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
                  style={styles.eyeBtn}
                  aria-label={showPass ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showPass
                    ? <EyeOff size={18} color="var(--color-muted)" />
                    : <Eye    size={18} color="var(--color-muted)" />
                  }
                </button>
              </div>
            </div>

            {error && (
              <div role="alert" style={styles.errorBox} className="animate-fade-in">
                {error}
              </div>
            )}

            <button
              id="login-submit"
              type="submit"
              disabled={loading}
              className="btn btn-primary"
              style={styles.submitBtn}
            >
              {loading ? (
                <Spinner size="sm" color="currentColor" />
              ) : (
                <LogIn size={18} />
              )}
              {loading ? 'Ingresando...' : 'Iniciar sesión'}
            </button>
          </form>
        )}

        {/* Footer */}
        <p style={styles.footer}>
          HomeOps Serverless &copy; {new Date().getFullYear()} · AWS CloudFront &amp; DynamoDB
        </p>
      </main>
    </div>
  )
}

const styles = {
  page: {
    minHeight: '100dvh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px',
    background: 'var(--color-bg)',
  },
  cardWrapper: {
    width: '100%',
    maxWidth: '460px',
    borderRadius: 'var(--radius-lg)',
    padding: '36px 32px 28px',
  },
  logoArea: {
    textAlign: 'center',
    marginBottom: '24px',
  },
  logoIcon: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '52px',
    height: '52px',
    borderRadius: 'var(--radius-md)',
    background: 'rgba(247, 148, 29, 0.14)',
    border: '1px solid rgba(247, 148, 29, 0.32)',
    marginBottom: '12px',
  },
  title: {
    fontSize: '1.75rem',
    fontWeight: 700,
    color: 'var(--color-text)',
    letterSpacing: '-0.03em',
    lineHeight: 1.15,
  },
  subtitle: {
    color: 'var(--color-muted)',
    fontSize: '0.9rem',
    marginTop: '6px',
  },
  modeTabs: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '6px',
    padding: '4px',
    background: 'var(--color-surface2)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-sm)',
    marginBottom: '22px',
  },
  modeTab: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    minHeight: '38px',
    padding: '8px 12px',
    borderRadius: '6px',
    border: 'none',
    background: 'transparent',
    color: 'var(--color-muted)',
    fontSize: '0.84rem',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 150ms var(--ease)',
  },
  modeTabActive: {
    background: 'var(--color-surface)',
    color: 'var(--color-accent)',
    boxShadow: 'inset 0 0 0 1px rgba(247, 148, 29, 0.35)',
  },
  helperText: {
    fontSize: '0.86rem',
    color: 'var(--color-muted)',
    marginBottom: '14px',
  },
  perfilesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(115px, 1fr))',
    gap: '10px',
  },
  perfilCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '6px',
    padding: '14px 10px',
    borderRadius: 'var(--radius-md)',
    background: 'var(--color-surface2)',
    border: '1px solid var(--color-border)',
    cursor: 'pointer',
    transition: 'transform 150ms var(--ease), border-color 150ms var(--ease)',
  },
  perfilAvatar: {
    width: '44px',
    height: '44px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1.1rem',
    fontWeight: 700,
    color: '#fff',
  },
  perfilAvatarSmall: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.95rem',
    fontWeight: 700,
    color: '#fff',
    flexShrink: 0,
  },
  perfilNombre: {
    fontSize: '0.9rem',
    fontWeight: 600,
    color: 'var(--color-text)',
    maxWidth: '100%',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  perfilMeta: {
    fontSize: '0.72rem',
    color: 'var(--color-muted)',
  },
  emptyPerfiles: {
    textAlign: 'center',
    padding: '18px 12px',
    background: 'var(--color-surface2)',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--color-border)',
  },
  selectedProfileBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '10px',
    padding: '12px 14px',
    borderRadius: 'var(--radius-sm)',
    background: 'var(--color-surface2)',
    border: '1px solid var(--color-border)',
  },
  backProfileBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    background: 'transparent',
    border: '1px solid var(--color-border)',
    color: 'var(--color-muted)',
    borderRadius: 'var(--radius-sm)',
    padding: '6px 10px',
    fontSize: '0.78rem',
    fontWeight: 600,
    cursor: 'pointer',
  },
  pinInput: {
    textAlign: 'center',
    fontSize: '1.5rem',
    letterSpacing: '0.45em',
    fontWeight: 600,
    height: '52px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '18px',
  },
  fieldGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    fontSize: '0.84rem',
    fontWeight: 500,
    color: 'var(--color-muted)',
  },
  passwordWrapper: {
    position: 'relative',
  },
  eyeBtn: {
    position: 'absolute',
    right: '12px',
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '4px',
    display: 'flex',
    alignItems: 'center',
  },
  errorBox: {
    padding: '10px 14px',
    borderRadius: 'var(--radius-sm)',
    background: 'rgba(239, 68, 68, 0.14)',
    border: '1px solid rgba(239, 68, 68, 0.35)',
    color: '#fca5a5',
    fontSize: '0.875rem',
  },
  submitBtn: {
    width: '100%',
    justifyContent: 'center',
    marginTop: '2px',
  },
  footer: {
    textAlign: 'center',
    marginTop: '26px',
    color: 'var(--color-muted)',
    fontSize: '0.78rem',
  },
}
