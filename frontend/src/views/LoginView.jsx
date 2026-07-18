import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LogIn, Home, Eye, EyeOff } from 'lucide-react'
import { toast } from 'react-hot-toast'
import api from '../api/axiosInstance'
import { useAuthStore } from '../stores/authStore'

export default function LoginView() {
  const navigate  = useNavigate()
  const login     = useAuthStore((s) => s.login)

  const [form, setForm]         = useState({ nombre: '', password: '' })
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState(null)
  const [showPass, setShowPass] = useState(false)

  const handleChange = (e) => {
    setError(null)
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.nombre || !form.password) {
      setError('Por favor completa todos los campos.')
      return
    }
    setLoading(true)
    try {
      const { data } = await api.post('/auth/login', form)
      login(data.token, data.user ?? { nombre: form.nombre })
      toast.success(`¡Bienvenido, ${form.nombre}!`)
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
      {/* Orbes decorativos de fondo */}
      <div style={styles.orb1} aria-hidden="true" />
      <div style={styles.orb2} aria-hidden="true" />

      <main style={styles.cardWrapper} className="animate-scale-in">
        {/* Logo / Título */}
        <div style={styles.logoArea}>
          <div style={styles.logoIcon}>
            <Home size={28} color="var(--color-accent)" strokeWidth={1.8} />
          </div>
          <h1 style={styles.title}>DomusHub</h1>
          <p style={styles.subtitle}>Gestión del hogar, simplificada</p>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} noValidate style={styles.form}>
          {/* Campo: nombre */}
          <div style={styles.fieldGroup}>
            <label htmlFor="login-nombre" style={styles.label}>
              Usuario
            </label>
            <input
              id="login-nombre"
              name="nombre"
              type="text"
              className="input"
              placeholder="Tu nombre de usuario"
              value={form.nombre}
              onChange={handleChange}
              autoComplete="username"
              autoFocus
            />
          </div>

          {/* Campo: contraseña */}
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

          {/* Error */}
          {error && (
            <div role="alert" style={styles.errorBox} className="animate-fade-in">
              {error}
            </div>
          )}

          {/* Botón submit */}
          <button
            id="login-submit"
            type="submit"
            disabled={loading}
            className="btn btn-primary"
            style={styles.submitBtn}
          >
            {loading ? (
              <span style={styles.spinnerInline} aria-hidden="true" />
            ) : (
              <LogIn size={18} />
            )}
            {loading ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>

        {/* Footer de la card */}
        <p style={styles.footer}>DomusHub &copy; {new Date().getFullYear()}</p>
      </main>
    </div>
  )
}

/* ─── Estilos inline (complementan las clases CSS globales) ─── */
const styles = {
  page: {
    minHeight: '100dvh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px',
    position: 'relative',
    overflow: 'hidden',
  },
  orb1: {
    position: 'fixed',
    top: '-120px',
    right: '-80px',
    width: '400px',
    height: '400px',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(88,166,255,.18) 0%, transparent 70%)',
    pointerEvents: 'none',
  },
  orb2: {
    position: 'fixed',
    bottom: '-100px',
    left: '-60px',
    width: '320px',
    height: '320px',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(63,185,80,.12) 0%, transparent 70%)',
    pointerEvents: 'none',
  },
  cardWrapper: {
    width: '100%',
    maxWidth: '420px',
    background: 'rgba(22, 27, 34, 0.85)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-lg)',
    boxShadow: '0 8px 40px rgba(0,0,0,.5)',
    padding: '40px 36px 32px',
    position: 'relative',
    zIndex: 1,
  },
  logoArea: {
    textAlign: 'center',
    marginBottom: '32px',
  },
  logoIcon: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '56px',
    height: '56px',
    borderRadius: 'var(--radius-md)',
    background: 'rgba(88,166,255,.12)',
    border: '1px solid rgba(88,166,255,.25)',
    marginBottom: '16px',
  },
  title: {
    fontSize: '1.75rem',
    fontWeight: 700,
    color: 'var(--color-text)',
    letterSpacing: '-0.02em',
    lineHeight: 1.2,
  },
  subtitle: {
    color: 'var(--color-muted)',
    fontSize: '0.9rem',
    marginTop: '6px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  fieldGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    fontSize: '0.85rem',
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
    background: 'rgba(248,81,73,.12)',
    border: '1px solid rgba(248,81,73,.3)',
    color: 'var(--color-danger)',
    fontSize: '0.875rem',
  },
  submitBtn: {
    width: '100%',
    justifyContent: 'center',
    padding: '12px',
    fontSize: '1rem',
    marginTop: '4px',
  },
  spinnerInline: {
    width: '18px',
    height: '18px',
    border: '2px solid rgba(255,255,255,.3)',
    borderTopColor: '#fff',
    borderRadius: '50%',
    animation: 'spin 0.7s linear infinite',
    display: 'inline-block',
  },
  footer: {
    textAlign: 'center',
    marginTop: '28px',
    color: 'var(--color-muted)',
    fontSize: '0.78rem',
  },
}
