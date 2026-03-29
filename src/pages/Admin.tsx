import { useEffect, useState } from 'react'
import { supabase } from '../supabase'

const ADMIN_ID = 'bb2e0cdb-d5d6-4e7a-98cc-521808650b08'

interface PendingUser {
  id: string
  display_name: string
  phone: string
  selfie_url: string
  created_at: string
  verification_status: string
}

export default function Admin() {
  const [users, setUsers]     = useState<PendingUser[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab]         = useState<'pending' | 'approved' | 'rejected'>('pending')
  const [selfieUrls, setSelfieUrls] = useState<Record<string, string>>({})

  useEffect(() => { fetchUsers() }, [tab])

  async function fetchUsers() {
    setLoading(true)
    const { data } = await supabase
      .from('users')
      .select('id, display_name, phone, selfie_url, created_at, verification_status')
      .eq('verification_status', tab)
      .order('created_at', { ascending: false })

    if (data) {
      setUsers(data)
      // Cargar URLs firmadas de selfies
      for (const user of data) {
        if (user.selfie_url) loadSelfieUrl(user.id, user.selfie_url)
      }
    }
    setLoading(false)
  }

  async function loadSelfieUrl(userId: string, path: string) {
    const { data } = await supabase.storage
      .from('selfies')
      .createSignedUrl(path, 3600)
    if (data?.signedUrl) {
      setSelfieUrls(prev => ({ ...prev, [userId]: data.signedUrl }))
    }
  }

  async function reviewUser(userId: string, status: 'approved' | 'rejected') {
    await supabase.rpc('admin_review_user', {
      target_user_id: userId,
      new_status: status,
    })
    fetchUsers()
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span style={styles.headerLogo}>🧉</span>
        <span style={styles.headerTitle}>Panel de admin</span>
      </div>

      <div style={styles.tabs}>
        {(['pending', 'approved', 'rejected'] as const).map(t => (
          <button
            key={t}
            style={{ ...styles.tab, ...(tab === t ? styles.tabActive : {}) }}
            onClick={() => setTab(t)}
          >
            {t === 'pending' ? '⏳ Pendientes' : t === 'approved' ? '✅ Aprobados' : '❌ Rechazados'}
          </button>
        ))}
      </div>

      <div style={styles.content}>
        {loading ? (
          <p style={styles.empty}>Cargando...</p>
        ) : users.length === 0 ? (
          <p style={styles.empty}>No hay usuarios en esta categoría.</p>
        ) : (
          users.map(user => (
            <div key={user.id} style={styles.card}>
              <div style={styles.cardTop}>
                {selfieUrls[user.id] ? (
                  <img
                    src={selfieUrls[user.id]}
                    style={styles.selfie}
                    alt="selfie"
                  />
                ) : (
                  <div style={styles.selfieEmpty}>📸</div>
                )}
                <div style={styles.userInfo}>
                  <p style={styles.userName}>{user.display_name || 'Sin nombre'}</p>
                  <p style={styles.userPhone}>+{user.phone}</p>
                  <p style={styles.userDate}>
                    {new Date(user.created_at).toLocaleDateString('es-AR')}
                  </p>
                </div>
              </div>

              {tab === 'pending' && (
                <div style={styles.actions}>
                  <button
                    style={styles.approveBtn}
                    onClick={() => reviewUser(user.id, 'approved')}
                  >
                    ✅ Aprobar
                  </button>
                  <button
                    style={styles.rejectBtn}
                    onClick={() => reviewUser(user.id, 'rejected')}
                  >
                    ❌ Rechazar
                  </button>
                </div>
              )}

              {tab === 'approved' && (
                <button
                  style={styles.rejectBtn}
                  onClick={() => reviewUser(user.id, 'rejected')}
                >
                  ❌ Revocar aprobación
                </button>
              )}

              {tab === 'rejected' && (
                <button
                  style={styles.approveBtn}
                  onClick={() => reviewUser(user.id, 'approved')}
                >
                  ✅ Aprobar igual
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    background: '#0f0f1a',
    fontFamily: 'system-ui, sans-serif',
    display: 'flex',
    flexDirection: 'column',
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
  tabs: {
    display: 'flex',
    background: '#1a1a2e',
    borderBottom: '1px solid #2e2e4e',
  },
  tab: {
    flex: 1,
    padding: '11px 4px',
    background: 'transparent',
    border: 'none',
    color: '#9b9bb4',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
    borderBottom: '2px solid transparent',
  },
  tabActive: {
    color: '#fff',
    borderBottom: '2px solid #4f46e5',
  },
  content: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    padding: 16,
  },
  empty: {
    color: '#9b9bb4',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 40,
  },
  card: {
    background: '#1a1a2e',
    borderRadius: 14,
    padding: 16,
    border: '1px solid #2e2e4e',
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  cardTop: {
    display: 'flex',
    gap: 14,
    alignItems: 'center',
  },
  selfie: {
    width: 80,
    height: 80,
    borderRadius: 10,
    objectFit: 'cover',
    flexShrink: 0,
    border: '2px solid #2e2e4e',
  },
  selfieEmpty: {
    width: 80,
    height: 80,
    borderRadius: 10,
    background: '#0f0f1a',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 28,
    flexShrink: 0,
  },
  userInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  userName: { color: '#fff', fontSize: 15, fontWeight: 600, margin: 0 },
  userPhone: { color: '#9b9bb4', fontSize: 13, margin: 0 },
  userDate: { color: '#9b9bb4', fontSize: 11, margin: 0 },
  actions: {
    display: 'flex',
    gap: 8,
  },
  approveBtn: {
    flex: 1,
    padding: '10px',
    background: '#1e3a2e',
    color: '#6ec99a',
    border: '1px solid #6ec99a',
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
  },
  rejectBtn: {
    flex: 1,
    padding: '10px',
    background: '#3a1e1e',
    color: '#f87171',
    border: '1px solid #f87171',
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
  },
}
