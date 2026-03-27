import { useEffect, useState } from 'react'
import { supabase } from '../supabase'

export default function Profile() {
  const [profile, setProfile]     = useState<any>(null)
  const [name, setName]           = useState('')
  const [bio, setBio]             = useState('')
  const [editing, setEditing]     = useState(false)
  const [saving, setSaving]       = useState(false)
  const [loading, setLoading]     = useState(true)

  useEffect(() => { fetchProfile() }, [])

  async function fetchProfile() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single()
    if (data) {
      setProfile(data)
      setName(data.display_name || '')
      setBio(data.bio || '')
    }
    setLoading(false)
  }

  async function saveProfile() {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('users').update({
      display_name: name,
      bio,
    }).eq('id', user.id)
    setEditing(false)
    fetchProfile()
    setSaving(false)
  }

  async function logout() {
    await supabase.auth.signOut()
  }

  if (loading) return (
    <div style={{ ...styles.container, justifyContent: 'center', alignItems: 'center' }}>
      <p style={{ color: '#9b9bb4' }}>Cargando perfil...</p>
    </div>
  )

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span style={styles.headerLogo}>🧉</span>
        <span style={styles.headerTitle}>Mi perfil</span>
      </div>

      <div style={styles.content}>
        {/* Avatar */}
        <div style={styles.avatarWrap}>
          <div style={styles.avatar}>
            {name ? name[0].toUpperCase() : '?'}
          </div>
          <div style={styles.ratingBadge}>
            ⭐ {profile?.rating_avg?.toFixed(1) || '0.0'}
            <span style={styles.ratingCount}>({profile?.rating_count || 0} ratings)</span>
          </div>
        </div>

        {/* Datos */}
        <div style={styles.card}>
          {editing ? (
            <>
              <label style={styles.label}>Nombre</label>
              <input
                style={styles.input}
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Tu nombre"
              />
              <label style={styles.label}>Bio (opcional)</label>
              <input
                style={styles.input}
                value={bio}
                onChange={e => setBio(e.target.value)}
                placeholder="Algo sobre vos..."
              />
              <button
                style={styles.button}
                onClick={saveProfile}
                disabled={saving}
              >
                {saving ? 'Guardando...' : 'Guardar cambios'}
              </button>
              <button
                style={styles.buttonSecondary}
                onClick={() => setEditing(false)}
              >
                Cancelar
              </button>
            </>
          ) : (
            <>
              <p style={styles.profileName}>{profile?.display_name || 'Sin nombre'}</p>
              {profile?.bio && <p style={styles.profileBio}>{profile.bio}</p>}
              <p style={styles.profilePhone}>📱 +{profile?.phone}</p>
              <div style={styles.verifiedBadge}>
                ✅ Usuario verificado
              </div>
              <button
                style={styles.button}
                onClick={() => setEditing(true)}
              >
                Editar perfil
              </button>
            </>
          )}
        </div>

        {/* Logout */}
        <button style={styles.logoutBtn} onClick={logout}>
          Cerrar sesión
        </button>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    background: '#0f0f1a',
    fontFamily: 'system-ui, sans-serif',
  },
  header: {
    background: '#1a1a2e',
    padding: '12px 16px',
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    borderBottom: '1px solid #2e2e4e',
  },
  headerLogo: { fontSize: 22 },
  headerTitle: { color: '#fff', fontWeight: 700, fontSize: 18 },
  content: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '28px 20px',
    gap: 16,
  },
  avatarWrap: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 10,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: '50%',
    background: '#4f46e5',
    color: '#fff',
    fontSize: 32,
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ratingBadge: {
    background: '#1a1a2e',
    border: '1px solid #2e2e4e',
    borderRadius: 20,
    padding: '4px 14px',
    color: '#fff',
    fontSize: 14,
    fontWeight: 600,
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  ratingCount: {
    color: '#9b9bb4',
    fontSize: 12,
    fontWeight: 400,
  },
  card: {
    background: '#1a1a2e',
    borderRadius: 16,
    padding: '20px',
    width: '100%',
    maxWidth: 400,
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    border: '1px solid #2e2e4e',
  },
  profileName: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 700,
    margin: 0,
  },
  profileBio: {
    color: '#9b9bb4',
    fontSize: 14,
    margin: 0,
  },
  profilePhone: {
    color: '#9b9bb4',
    fontSize: 13,
    margin: 0,
  },
  verifiedBadge: {
    background: '#1e3a2e',
    color: '#6ec99a',
    fontSize: 12,
    fontWeight: 600,
    padding: '6px 12px',
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  label: { color: '#9b9bb4', fontSize: 12 },
  input: {
    background: '#0f0f1a',
    border: '1px solid #2e2e4e',
    borderRadius: 10,
    color: '#fff',
    fontSize: 14,
    padding: '11px 14px',
    outline: 'none',
  },
  button: {
    padding: '13px',
    background: '#4f46e5',
    color: '#fff',
    border: 'none',
    borderRadius: 10,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
  },
  buttonSecondary: {
    padding: '11px',
    background: 'transparent',
    color: '#9b9bb4',
    border: '1px solid #2e2e4e',
    borderRadius: 10,
    fontSize: 14,
    cursor: 'pointer',
  },
  logoutBtn: {
    padding: '11px 24px',
    background: 'transparent',
    color: '#f87171',
    border: '1px solid #3a1e1e',
    borderRadius: 10,
    fontSize: 14,
    cursor: 'pointer',
    marginTop: 8,
  },
}