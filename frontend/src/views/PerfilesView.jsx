import { useState, useEffect, useRef } from 'react'
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
  X,
  BellRing,
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import api from '../api/axiosInstance'
import { useAuthStore } from '../stores/authStore'
import Modal from '../components/ui/Modal'

// Paleta de avatares sin tonos violeta/lavanda (cumple design-taste-frontend y COLOR_RE del backend)
const AVATAR_SWATCHES = [
  '#2a9d8f',
  '#e76f51',
  '#f4a261',
  '#457b9d',
  '#6a994e',
  '#e9c46a',
]

function PerfilModal({ isOpen, onClose, onSave, usuario, currentUserId }) {
  const dialogRef = useRef(null)
  const isEdit = !!usuario

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
      if (isOpen) {
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
    }
    sync()
  }, [isOpen, usuario])

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (isOpen) {
      if (!dialog.open) dialog.showModal()
    } else {
      if (dialog.open) dialog.close()
    }
  }, [isOpen])

  const handleBackdropClick = (e) => {
    if (e.target === dialogRef.current) onClose()
  }

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

    const payload = {
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
    <dialog
      ref={dialogRef}
      onClick={handleBackdropClick}
      onClose={onClose}
      style={styles.dialog}
    >
      <div style={styles.modalContent} className="animate-scale-in">
        <div style={styles.modalHeader}>
          <div style={styles.iconWrap}>
            <Users size={20} color="var(--color-accent)" />
          </div>
          <h2 style={styles.modalTitle}>
            {isEdit ? `Editar a ${usuario.nombre}` : 'Nuevo Integrante Familiar'}
          </h2>
          <button type="button" onClick={onClose} style={styles.closeBtn} aria-label="Cerrar">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          {/* Nombre */}
          <div style={styles.fieldGroup}>
            <label htmlFor="perfil-nombre" style={styles.label}>
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
              disabled={submitting}
            />
          </div>

          {/* Email para SNS */}
          <div style={styles.fieldGroup}>
            <label htmlFor="perfil-email" style={styles.label}>
              Correo electrónico (para alertas de Amazon SNS)
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
          </div>

          <div style={styles.row}>
            {/* Rol */}
            <div style={{ ...styles.fieldGroup, flex: 1 }}>
              <label htmlFor="perfil-rol" style={styles.label}>
                Rol en el hogar
              </label>
              <select
                id="perfil-rol"
                name="rol"
                className="input"
                value={form.rol}
                onChange={handleChange}
                disabled={submitting || esPropioUsuario}
                style={{ appearance: 'auto' }}
              >
                <option value="miembro">Integrante (Miembro)</option>
                <option value="admin">Administrador</option>
              </select>
            </div>

            {/* PIN 4 dígitos */}
            <div style={{ ...styles.fieldGroup, flex: 1 }}>
              <label htmlFor="perfil-pin" style={styles.label}>
                {isEdit ? 'Nuevo PIN (4 dígitos)' : 'PIN rápido (4 dígitos)'}
              </label>
              <input
                id="perfil-pin"
                name="pin"
                type="password"
                inputMode="numeric"
                maxLength={4}
                className="input font-mono-num"
                placeholder={isEdit && usuario?.tiene_pin ? '•••• (actual activo)' : 'Ej. 1234'}
                value={form.pin}
                onChange={handlePinChange}
                disabled={submitting}
              />
            </div>
          </div>

          {isEdit && usuario?.tiene_pin && (
            <label style={styles.checkboxRow}>
              <input
                type="checkbox"
                name="quitarPin"
                checked={form.quitarPin}
                onChange={handleChange}
                disabled={submitting}
                style={{ accentColor: 'var(--color-accent)' }}
              />
              <span>Desactivar PIN de acceso rápido para este integrante</span>
            </label>
          )}

          {/* Contraseña */}
          <div style={styles.fieldGroup}>
            <label htmlFor="perfil-password" style={styles.label}>
              {isEdit ? 'Nueva contraseña (dejar vacío para mantener la actual)' : 'Contraseña (mín. 6 caracteres) *'}
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

          {/* Color de avatar */}
          <div style={styles.fieldGroup}>
            <span style={styles.label}>Color de avatar</span>
            <div style={styles.swatchRow}>
              {AVATAR_SWATCHES.map((hex) => (
                <button
                  key={hex}
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, avatar_color: hex }))}
                  aria-label={`Color ${hex}`}
                  style={{
                    ...styles.swatchBtn,
                    background: hex,
                    outline:
                      form.avatar_color === hex
                        ? '2px solid var(--color-text)'
                        : '2px solid transparent',
                    outlineOffset: '2px',
                  }}
                />
              ))}
            </div>
          </div>

          <div style={styles.modalFooter}>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={onClose}
              disabled={submitting}
            >
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {isEdit ? 'Guardar Cambios' : 'Crear Integrante'}
            </button>
          </div>
        </form>
      </div>
    </dialog>
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
      setUsuarios((prev) =>
        prev.map((u) => (String(u.id) === String(data.id) ? data : u))
      )
      if (String(data.id) === String(currentUser?.id)) {
        updateUser({
          nombre: data.nombre,
          rol: data.rol,
          avatar_color: data.avatar_color,
        })
      }
      toast.success('Perfil familiar actualizado')
    } else {
      const { data } = await api.post('/protected/usuarios', payload)
      setUsuarios((prev) =>
        [...prev, data].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
      )
      toast.success('Integrante familiar creado')
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
    <div id="perfiles-page" style={styles.page}>
      {/* Header */}
      <header style={styles.header}>
        <div>
          <h1 style={styles.pageTitle}>Integrantes y Acceso PIN</h1>
          <p style={styles.pageSubtitle}>
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
            <Plus size={18} /> Nuevo Integrante
          </button>
        )}
      </header>

      {/* Aviso de suscripción SNS */}
      <div className="card m-nolift" style={styles.snsNotice}>
        <div style={styles.snsIconWrap}>
          <BellRing size={18} color="var(--color-accent)" />
        </div>
        <div style={{ flex: 1 }}>
          <p style={styles.snsTitle}>Notificaciones Familiares en Amazon SNS</p>
          <p style={styles.snsText}>
            Para que cada integrante reciba alertas automáticas de stock crítico del súper y recordatorios de
            tareas o turnos de basura, registra su correo aquí y confirma el enlace de
            <strong> AWS Notification - Subscription Confirmation</strong> enviado a su bandeja de entrada.
          </p>
        </div>
      </div>

      {/* Estado: cargando */}
      {loading && (
        <div style={styles.grid}>
          {[...Array(3)].map((_, i) => (
            <div key={i} className="skeleton" style={{ height: '128px' }} />
          ))}
        </div>
      )}

      {/* Estado: error */}
      {!loading && error && (
        <div style={styles.centerState}>
          <AlertTriangle size={32} color="var(--color-danger)" />
          <p style={{ color: 'var(--color-danger)', fontWeight: 600 }}>Error al cargar perfiles</p>
          <p style={{ color: 'var(--color-muted)', fontSize: '0.875rem' }}>{error}</p>
          <button type="button" className="btn btn-ghost" onClick={fetchUsuarios}>
            <RefreshCw size={16} /> Reintentar
          </button>
        </div>
      )}

      {/* Grid de integrantes */}
      {!loading && !error && (
        <div style={styles.grid}>
          {usuarios.map((u) => {
            const esActual = String(u.id) === String(currentUser?.id)
            return (
              <article key={u.id} className="card animate-fade-in-up" style={styles.card}>
                <div style={styles.cardTop}>
                  <div
                    style={{
                      ...styles.avatar,
                      background: u.avatar_color || 'var(--color-accent)',
                    }}
                  >
                    {u.nombre?.[0]?.toUpperCase() ?? 'U'}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <h3 style={styles.userName}>{u.nombre}</h3>
                      {esActual && <span className="badge badge-neutral">Tú</span>}
                    </div>
                    <div style={styles.badgesRow}>
                      <span
                        className={`badge ${u.rol === 'admin' ? 'badge-warning' : 'badge-neutral'}`}
                      >
                        <ShieldCheck size={12} />
                        {u.rol === 'admin' ? 'Admin' : 'Miembro'}
                      </span>
                      <span
                        className={`badge ${u.tiene_pin ? 'badge-success' : 'badge-neutral'}`}
                      >
                        <KeyRound size={12} />
                        {u.tiene_pin ? 'PIN 4 dígitos' : 'Sin PIN'}
                      </span>
                    </div>
                  </div>

                  {esAdmin && (
                    <div className="actions" style={styles.actions}>
                      <button
                        type="button"
                        onClick={() => setModalPerfil({ open: true, usuario: u })}
                        style={styles.actionBtn}
                        title={`Editar a ${u.nombre}`}
                        aria-label={`Editar a ${u.nombre}`}
                      >
                        <Pencil size={15} />
                      </button>
                      {!esActual && (
                        <button
                          type="button"
                          onClick={() => setModalEliminar({ open: true, usuario: u })}
                          className="action-btn-danger"
                          style={styles.actionBtn}
                          title={`Eliminar a ${u.nombre}`}
                          aria-label={`Eliminar a ${u.nombre}`}
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <div style={styles.emailRow}>
                  <Mail size={14} color="var(--color-muted)" />
                  <span style={styles.emailText}>
                    {u.email || 'Sin correo configurado para alertas SNS'}
                  </span>
                </div>
              </article>
            )
          })}
        </div>
      )}

      {/* Modal Crear / Editar Perfil */}
      <PerfilModal
        isOpen={modalPerfil.open}
        onClose={() => setModalPerfil({ open: false, usuario: null })}
        onSave={handleSavePerfil}
        usuario={modalPerfil.usuario}
        currentUserId={currentUser?.id}
      />

      {/* Modal Confirmar Eliminación */}
      <Modal
        isOpen={modalEliminar.open}
        onClose={() => setModalEliminar({ open: false, usuario: null })}
        onConfirm={handleConfirmEliminar}
        title="Eliminar Integrante"
        message={`¿Estás seguro de que deseas eliminar el perfil de "${modalEliminar.usuario?.nombre}"?`}
        confirmText="Eliminar"
        variant="danger"
        loading={loadingDelete}
      />
    </div>
  )
}

const styles = {
  page: {
    maxWidth: '820px',
    margin: '0 auto',
  },
  header: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: '16px',
    marginBottom: '20px',
    flexWrap: 'wrap',
  },
  pageTitle: {
    fontSize: '1.6rem',
    fontWeight: 700,
    color: 'var(--color-text)',
  },
  pageSubtitle: {
    color: 'var(--color-muted)',
    fontSize: '0.875rem',
    marginTop: '2px',
  },
  snsNotice: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '14px',
    padding: '16px 18px',
    marginBottom: '22px',
    borderColor: 'rgba(247, 148, 29, 0.3)',
  },
  snsIconWrap: {
    width: '36px',
    height: '36px',
    borderRadius: 'var(--radius-sm)',
    background: 'rgba(247, 148, 29, 0.14)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  snsTitle: {
    fontSize: '0.92rem',
    fontWeight: 600,
    color: 'var(--color-text)',
    marginBottom: '4px',
  },
  snsText: {
    fontSize: '0.84rem',
    color: 'var(--color-muted)',
    lineHeight: 1.5,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '14px',
  },
  card: {
    padding: '18px',
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
  },
  cardTop: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
  },
  avatar: {
    width: '44px',
    height: '44px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1.1rem',
    fontWeight: 700,
    color: '#fff',
    flexShrink: 0,
  },
  userName: {
    fontSize: '1rem',
    fontWeight: 600,
    color: 'var(--color-text)',
  },
  badgesRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    marginTop: '6px',
    flexWrap: 'wrap',
  },
  actions: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    marginLeft: 'auto',
  },
  actionBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: 'var(--color-muted)',
    padding: '6px',
    borderRadius: 'var(--radius-sm)',
    display: 'flex',
    alignItems: 'center',
  },
  emailRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    paddingTop: '10px',
    borderTop: '1px solid var(--color-border)',
  },
  emailText: {
    fontSize: '0.82rem',
    color: 'var(--color-muted)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  centerState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '10px',
    padding: '60px 24px',
    textAlign: 'center',
  },
  dialog: {
    width: '92vw',
    maxWidth: '480px',
    margin: 'auto',
    background: 'none',
    border: 'none',
    padding: 0,
  },
  modalContent: {
    background: 'var(--color-surface)',
    border: '1px solid var(--color-border-strong)',
    borderRadius: 'var(--radius-lg)',
    padding: '26px 24px',
    boxShadow: '0 20px 48px rgba(0, 0, 0, 0.55)',
  },
  modalHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '18px',
  },
  iconWrap: {
    width: '36px',
    height: '36px',
    borderRadius: 'var(--radius-sm)',
    background: 'rgba(247, 148, 29, 0.14)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    flex: 1,
    fontSize: '1.1rem',
    fontWeight: 600,
    color: 'var(--color-text)',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: 'var(--color-muted)',
    padding: '4px',
    display: 'flex',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
  },
  fieldGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    fontSize: '0.82rem',
    fontWeight: 500,
    color: 'var(--color-muted)',
  },
  row: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap',
  },
  checkboxRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '0.84rem',
    color: 'var(--color-text)',
    cursor: 'pointer',
  },
  swatchRow: {
    display: 'flex',
    gap: '10px',
    paddingTop: '4px',
  },
  swatchBtn: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    border: 'none',
    cursor: 'pointer',
  },
  modalFooter: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '10px',
    marginTop: '10px',
  },
}
