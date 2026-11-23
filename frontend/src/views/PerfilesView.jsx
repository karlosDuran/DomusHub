import { useState, useEffect } from 'react'
import {
  Users,
  Plus,
  Pencil,
  Trash2,
  Mail,
  KeyRound,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  BellRing,
  CheckCircle2,
  Clock,
  Send,
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import api from '../api/axiosInstance'
import { useAuthStore } from '../stores/authStore'
import DialogShell from '../components/ui/DialogShell'
import Modal from '../components/ui/Modal'
import Spinner from '../components/ui/Spinner'

// Paleta de avatares cálida y botánica (compatible con COLOR_RE del backend)
const AVATAR_SWATCHES = [
  '#2D6A4F',
  '#3A6A85',
  '#B86E14',
  '#C45D47',
  '#6A8A4E',
  '#5C6B73',
]

function PerfilModal({ isOpen, onClose, onSave, usuario, currentUserId, esAdmin }) {
  const isEdit = !!usuario
  const soloEdicionPropia = isEdit && !esAdmin

  const [form, setForm] = useState({
    nombre: '',
    email: '',
    rol: 'miembro',
    password: '',
    pin: '',
    quitarPin: false,
    avatar_color: AVATAR_SWATCHES[0],
  })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const sync = async () => {
      if (!isOpen) return
      if (usuario) {
        setForm({
          nombre: usuario.nombre ?? '',
          email: usuario.email ?? '',
          rol: usuario.rol ?? 'miembro',
          password: '',
          pin: '',
          quitarPin: false,
          avatar_color: AVATAR_SWATCHES.includes(usuario.avatar_color)
            ? usuario.avatar_color
            : AVATAR_SWATCHES[0],
        })
      } else {
        setForm({
          nombre: '',
          email: '',
          rol: 'miembro',
          password: '',
          pin: '',
          quitarPin: false,
          avatar_color: AVATAR_SWATCHES[0],
        })
      }
    }
    sync()
  }, [isOpen, usuario])

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  const handlePinChange = (e) => {
    const clean = e.target.value.replace(/\D/g, '').slice(0, 4)
    setForm((prev) => ({ ...prev, pin: clean, quitarPin: false }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.nombre.trim()) {
      toast.error('El nombre del integrante es obligatorio.')
      return
    }
    if (!isEdit && form.password.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres.')
      return
    }
    if (isEdit && form.password && form.password.length < 6) {
      toast.error('La nueva contraseña debe tener al menos 6 caracteres.')
      return
    }
    if (form.pin && form.pin.length !== 4) {
      toast.error('El PIN debe tener exactamente 4 dígitos.')
      return
    }

    const payload = soloEdicionPropia
      ? {
          email: form.email.trim(),
          avatar_color: form.avatar_color,
        }
      : {
          nombre: form.nombre.trim(),
          email: form.email.trim(),
          rol: form.rol,
          avatar_color: form.avatar_color,
        }
    if (form.password) {
      payload.password = form.password
    }
    if (form.quitarPin) {
      payload.pin = ''
    } else if (form.pin) {
      payload.pin = form.pin
    }

    setSubmitting(true)
    try {
      await onSave(payload)
      onClose()
    } catch (err) {
      const msg = err.response?.data?.error ?? 'Error al guardar el perfil familiar.'
      toast.error(msg)
    } finally {
      setSubmitting(false)
    }
  }

  const esPropioUsuario = isEdit && String(usuario?.id) === String(currentUserId)

  return (
    <DialogShell
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? `Editar a ${usuario.nombre}` : 'Nuevo integrante'}
      icon={<Users size={18} />}
      maxWidth="max-w-[480px]"
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={submitting}>
            Cancelar
          </button>
          <button
            type="submit"
            form="perfil-form"
            className="btn btn-primary"
            disabled={submitting}
          >
            {submitting && <Spinner size="sm" color="currentColor" />}
            {isEdit ? 'Guardar cambios' : 'Crear integrante'}
          </button>
        </>
      }
    >
      <form id="perfil-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="perfil-nombre" className="text-xs font-medium text-[var(--color-muted)]">
            Nombre *
          </label>
          <input
            id="perfil-nombre"
            name="nombre"
            type="text"
            className="input"
            placeholder="Ej. Mamá, Papá, Fer, Ana"
            value={form.nombre}
            onChange={handleChange}
            required
            disabled={submitting || soloEdicionPropia}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="perfil-email" className="text-xs font-medium text-[var(--color-muted)]">
            Correo electrónico para avisos SNS
          </label>
          <input
            id="perfil-email"
            name="email"
            type="email"
            className="input"
            placeholder="integrante@ejemplo.com"
            value={form.email}
            onChange={handleChange}
            disabled={submitting}
          />
          <p className="text-[11px] leading-relaxed text-[var(--color-muted)]">
            Al guardar, HomeOps suscribe este correo en Amazon SNS para recibir tus avisos de
            tareas, turnos de basura y alertas de despensa.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="perfil-rol" className="text-xs font-medium text-[var(--color-muted)]">
              Rol en el hogar
            </label>
            <select
              id="perfil-rol"
              name="rol"
              className="input"
              value={form.rol}
              onChange={handleChange}
              disabled={submitting || esPropioUsuario || soloEdicionPropia}
            >
              <option value="miembro">Integrante</option>
              <option value="admin">Administrador</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="perfil-pin" className="text-xs font-medium text-[var(--color-muted)]">
              {isEdit ? 'Nuevo PIN (4 dígitos)' : 'PIN rápido (4 dígitos)'}
            </label>
            <input
              id="perfil-pin"
              name="pin"
              type="password"
              inputMode="numeric"
              maxLength={4}
              className="input font-mono-num"
              placeholder={isEdit && usuario?.tiene_pin ? '•••• (activo)' : 'Ej. 1234'}
              value={form.pin}
              onChange={handlePinChange}
              disabled={submitting}
            />
          </div>
        </div>

        {isEdit && usuario?.tiene_pin && (
          <label className="flex cursor-pointer items-center gap-2 text-sm text-[var(--color-text)]">
            <input
              type="checkbox"
              name="quitarPin"
              checked={form.quitarPin}
              onChange={handleChange}
              disabled={submitting}
              className="h-4 w-4 cursor-pointer accent-[var(--color-accent)]"
            />
            <span>Desactivar PIN de acceso rápido</span>
          </label>
        )}

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="perfil-password"
            className="text-xs font-medium text-[var(--color-muted)]"
          >
            {isEdit
              ? 'Nueva contraseña (opcional)'
              : 'Contraseña (mín. 6 caracteres) *'}
          </label>
          <input
            id="perfil-password"
            name="password"
            type="password"
            className="input"
            placeholder="••••••••"
            value={form.password}
            onChange={handleChange}
            required={!isEdit}
            disabled={submitting}
          />
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-xs font-medium text-[var(--color-muted)]">Color de avatar</span>
          <div className="flex items-center gap-2.5">
            {AVATAR_SWATCHES.map((hex) => {
              const selected = form.avatar_color === hex
              return (
                <button
                  key={hex}
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, avatar_color: hex }))}
                  aria-label={`Color ${hex}`}
                  className="h-8 w-8 cursor-pointer rounded-full border-none transition-transform duration-150 active:scale-90"
                  style={{
                    backgroundColor: hex,
                    outline: selected ? '2px solid var(--color-text)' : '2px solid transparent',
                    outlineOffset: '2px',
                  }}
                />
              )
            })}
          </div>
        </div>
      </form>
    </DialogShell>
  )
}

export default function PerfilesView() {
  const currentUser = useAuthStore((s) => s.user)
  const updateUser = useAuthStore((s) => s.updateUser)
  const esAdmin = currentUser?.rol === 'admin'

  const [usuarios, setUsuarios] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [modalPerfil, setModalPerfil] = useState({ open: false, usuario: null })
  const [modalEliminar, setModalEliminar] = useState({ open: false, usuario: null })
  const [loadingDelete, setLoadingDelete] = useState(false)
  const [reenviandoId, setReenviandoId] = useState(null)

  const fetchUsuarios = async () => {
    try {
      setLoading(true)
      setError(null)
      const { data } = await api.get('/protected/usuarios')
      setUsuarios(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err.response?.data?.error ?? err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const load = async () => {
      await fetchUsuarios()
    }
    load()
  }, [])

  const handleSavePerfil = async (payload) => {
    if (modalPerfil.usuario) {
      const { data } = await api.put(`/protected/usuarios/${modalPerfil.usuario.id}`, payload)
      setUsuarios((prev) => prev.map((u) => (String(u.id) === String(data.id) ? data : u)))
      if (String(data.id) === String(currentUser?.id)) {
        updateUser({
          nombre: data.nombre,
          rol: data.rol,
          avatar_color: data.avatar_color,
        })
      }
      if (data.sns_estado === 'pendiente') {
        toast.success(`Perfil actualizado. Revisa ${data.email} para confirmar el correo de AWS SNS.`)
      } else {
        toast.success('Perfil familiar actualizado')
      }
    } else {
      const { data } = await api.post('/protected/usuarios', payload)
      setUsuarios((prev) =>
        [...prev, data].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
      )
      if (data.sns_estado === 'pendiente') {
        toast.success(`Integrante creado. Revisa ${data.email} para confirmar el correo de AWS SNS.`)
      } else {
        toast.success('Integrante familiar creado')
      }
    }
  }

  const handleSuscribirSns = async (usuario) => {
    setReenviandoId(usuario.id)
    try {
      const { data } = await api.post(`/protected/usuarios/${usuario.id}/sns-suscribir`)
      setUsuarios((prev) =>
        prev.map((u) =>
          String(u.id) === String(usuario.id) ? { ...u, sns_estado: data.sns_estado } : u
        )
      )
      toast.success(data.message)
    } catch (err) {
      toast.error(err.response?.data?.error ?? 'No se pudo activar la suscripción SNS.')
    } finally {
      setReenviandoId(null)
    }
  }

  const handleConfirmEliminar = async () => {
    if (!modalEliminar.usuario) return
    setLoadingDelete(true)
    try {
      await api.delete(`/protected/usuarios/${modalEliminar.usuario.id}`)
      setUsuarios((prev) =>
        prev.filter((u) => String(u.id) !== String(modalEliminar.usuario.id))
      )
      toast.success('Integrante eliminado')
      setModalEliminar({ open: false, usuario: null })
    } catch (err) {
      toast.error(err.response?.data?.error ?? 'No se pudo eliminar el integrante.')
    } finally {
      setLoadingDelete(false)
    }
  }

  return (
    <div id="perfiles-page" className="mx-auto max-w-[1120px]">
      <header className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text)]">Familia y acceso PIN</h1>
          <p className="mt-0.5 text-sm text-[var(--color-muted)]">
            {loading
              ? 'Cargando perfiles…'
              : `${usuarios.length} integrante${usuarios.length !== 1 ? 's' : ''} registrado${usuarios.length !== 1 ? 's' : ''}`}
          </p>
        </div>

        {esAdmin && (
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setModalPerfil({ open: true, usuario: null })}
          >
            <Plus size={17} /> Nuevo integrante
          </button>
        )}
      </header>

      {/* Callout SNS */}
      <div className="mb-6 flex items-start gap-3.5 rounded-2xl border border-[var(--color-accent-border)] bg-[var(--color-accent-soft)] p-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--color-surface)] text-[var(--color-accent)]">
          <BellRing size={17} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-[var(--color-text)]">
            Notificaciones familiares por correo (Amazon SNS)
          </p>
          <p className="mt-0.5 max-w-[72ch] text-xs leading-relaxed text-[var(--color-muted)]">
            Registra el correo de cada integrante para recibir alertas de stock crítico y
            recordatorios de tareas o turnos de basura. Cada persona debe confirmar el enlace de{' '}
            <strong className="font-semibold text-[var(--color-text)]">
              AWS Notification - Subscription Confirmation
            </strong>{' '}
            en su bandeja de entrada.
          </p>
        </div>
      </div>

      {/* Cargando */}
      {loading && (
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="skeleton h-32 rounded-xl" />
          ))}
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="animate-fade-in flex flex-col items-center gap-2 py-14 text-center">
          <AlertTriangle size={28} className="text-[var(--color-danger)]" />
          <p className="font-semibold text-[var(--color-danger-text)]">Error al cargar perfiles</p>
          <p className="text-sm text-[var(--color-muted)]">{error}</p>
          <button type="button" className="btn btn-ghost mt-2" onClick={fetchUsuarios}>
            <RefreshCw size={15} /> Reintentar
          </button>
        </div>
      )}

      {/* Grid de integrantes */}
      {!loading && !error && (
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
          {usuarios.map((u) => {
            const esActual = String(u.id) === String(currentUser?.id)
            return (
              <article
                key={u.id}
                className="surface-card surface-card-interactive group flex flex-col gap-3.5 p-4"
              >
                <div className="flex items-start gap-3">
                  <div
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-base font-bold text-white"
                    style={{ backgroundColor: u.avatar_color || 'var(--color-accent)' }}
                  >
                    {u.nombre?.[0]?.toUpperCase() ?? 'U'}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <h3 className="truncate text-[0.98rem] font-semibold text-[var(--color-text)]">
                        {u.nombre}
                      </h3>
                      {esActual && <span className="badge badge-neutral text-[11px]">Tú</span>}
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      <span
                        className={`badge text-[11px] ${u.rol === 'admin' ? 'badge-warning' : 'badge-neutral'}`}
                      >
                        <ShieldCheck size={11} />
                        {u.rol === 'admin' ? 'Admin' : 'Integrante'}
                      </span>
                      <span
                        className={`badge text-[11px] ${u.tiene_pin ? 'badge-success' : 'badge-neutral'}`}
                      >
                        <KeyRound size={11} />
                        {u.tiene_pin ? 'PIN activo' : 'Sin PIN'}
                      </span>
                    </div>
                  </div>

                  {(esAdmin || esActual) && (
                    <div className="flex shrink-0 items-center gap-0.5 md:opacity-65 md:transition-opacity md:duration-150 md:group-hover:opacity-100">
                      <button
                        type="button"
                        onClick={() => setModalPerfil({ open: true, usuario: u })}
                        className="btn-icon h-8 w-8"
                        title={`Editar a ${u.nombre}`}
                        aria-label={`Editar a ${u.nombre}`}
                      >
                        <Pencil size={14} />
                      </button>
                      {esAdmin && !esActual && (
                        <button
                          type="button"
                          onClick={() => setModalEliminar({ open: true, usuario: u })}
                          className="btn-icon btn-icon-danger h-8 w-8"
                          title={`Eliminar a ${u.nombre}`}
                          aria-label={`Eliminar a ${u.nombre}`}
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-2 border-t border-[var(--color-border)] pt-2.5 text-xs text-[var(--color-muted)]">
                  <div className="flex items-center gap-2">
                    <Mail size={13} className="shrink-0" />
                    <span className="truncate">
                      {u.email || 'Sin correo configurado para alertas'}
                    </span>
                  </div>

                  {u.email && (
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      {u.sns_estado === 'confirmado' && (
                        <span className="badge badge-success text-[11px]">
                          <CheckCircle2 size={11} /> Avisos SNS activos
                        </span>
                      )}
                      {u.sns_estado === 'pendiente' && (
                        <span className="badge badge-warning text-[11px]">
                          <Clock size={11} /> Pendiente confirmar correo
                        </span>
                      )}
                      {u.sns_estado === 'no_suscrito' && (
                        <span className="badge badge-neutral text-[11px]">
                          <BellRing size={11} /> Avisos sin activar
                        </span>
                      )}
                      {u.sns_estado === 'error' && (
                        <span className="badge badge-danger text-[11px]">
                          <AlertTriangle size={11} /> Error al suscribir
                        </span>
                      )}

                      {(esAdmin || esActual) &&
                        (u.sns_estado === 'pendiente' ||
                          u.sns_estado === 'no_suscrito' ||
                          u.sns_estado === 'error') && (
                          <button
                            type="button"
                            onClick={() => handleSuscribirSns(u)}
                            disabled={reenviandoId === u.id}
                            className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-[var(--color-border)] bg-[var(--color-surface2)] px-2 py-1 text-[11px] font-medium text-[var(--color-text)] transition-colors hover:border-[var(--color-accent-border)] hover:text-[var(--color-accent)] disabled:opacity-50"
                          >
                            {reenviandoId === u.id ? (
                              <Spinner size="sm" color="currentColor" />
                            ) : (
                              <Send size={11} />
                            )}
                            {u.sns_estado === 'pendiente' ? 'Reenviar' : 'Activar avisos'}
                          </button>
                        )}
                    </div>
                  )}
                </div>
              </article>
            )
          })}
        </div>
      )}

      <PerfilModal
        isOpen={modalPerfil.open}
        onClose={() => setModalPerfil({ open: false, usuario: null })}
        onSave={handleSavePerfil}
        usuario={modalPerfil.usuario}
        currentUserId={currentUser?.id}
        esAdmin={esAdmin}
      />

      <Modal
        isOpen={modalEliminar.open}
        onClose={() => setModalEliminar({ open: false, usuario: null })}
        onConfirm={handleConfirmEliminar}
        title="Eliminar integrante"
        message={`¿Seguro que deseas eliminar el perfil de "${modalEliminar.usuario?.nombre}"?`}
        confirmText="Eliminar"
        variant="danger"
        loading={loadingDelete}
      />
    </div>
  )
}
