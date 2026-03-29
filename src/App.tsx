import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import Login from './pages/Login'
import Map from './pages/Map'
import MyRounds from './pages/MyRounds'
import Profile from './pages/Profile'
import Verify from './pages/Verify'
import Admin from './pages/Admin'

const ADMIN_ID = 'bb2e0cdb-d5d6-4e7a-98cc-521808650b08'

export default function App() {
  const [session, setSession]   = useState<any>(null)
  const [loading, setLoading]   = useState(true)
  const [status, setStatus]     = useState<'none' | 'pending' | 'approved' | 'rejected'>('none')
  const [tab, setTab]           = useState<'map' | 'rounds' | 'profile' | 'admin'>('map')

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) checkStatus(session.user.id)
      else setLoading(false)
    })
    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) checkStatus(session.user.id)
      else { setStatus('none'); setLoading(false) }
    })
  }, [])

  async function checkStatus(userId: string) {
    const { data } = await supabase
      .from('users')
      .select('verification_status, verified_at')
      .eq('id', userId)
      .single()

    if (!data) {
      setStatus('none')
    } else {
      setStatus(data.verification_status || 'none')
    }
    setLoading(false)
  }

  if (loading) return (
    <div style={{
      minHeight: '100vh', background: '#0f0f1a',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#9b9bb4', fontFamily: 'system-ui, sans-serif', fontSize: 16,
    }}>
      Cargando...
    </div>
  )

  if (!session) return <Login />

  // Sin selfie todavía
  if (status === 'none') {
    return <Verify onVerified={() => setStatus('pending')} />
  }

  // Selfie subida pero pendiente de revisión
  if (status === 'pending') {
    return (
      <div style={{
        minHeight: '100vh', background: '#0f0f1a',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24, fontFamily: 'system-ui, sans-serif',
      }}>
        <div style={{
          background: '#1a1a2e', borderRadius: 20, padding: '40px 28px',
          maxWidth: 360, width: '100%', textAlign: 'center',
          border: '1px solid #2e2e4e', display: 'flex', flexDirection: 'column',
          alignItems: 'center', gap: 14,
        }}>
          <div style={{ fontSize: 52 }}>⏳</div>
          <h2 style={{ color: '#fff', fontSize: 20, fontWeight: 700, margin: 0 }}>
            Verificación en proceso
          </h2>
          <p style={{ color: '#9b9bb4', fontSize: 13, lineHeight: 1.6, margin: 0 }}>
            Tu selfie fue enviada y está siendo revisada. En menos de 24 horas vas a recibir acceso completo a MateMatch.
          </p>
          <div style={{
            background: '#0f0f1a', borderRadius: 10, padding: '12px 16px',
            width: '100%', textAlign: 'left',
          }}>
            <p style={{ color: '#9b9bb4', fontSize: 12, margin: 0 }}>✅ Selfie recibida</p>
            <p style={{ color: '#ef9f27', fontSize: 12, margin: '6px 0 0' }}>⏳ Revisión manual en curso</p>
          </div>
          <button
            style={{
              padding: '10px 20px', background: 'transparent', color: '#9b9bb4',
              border: '1px solid #2e2e4e', borderRadius: 8, fontSize: 13, cursor: 'pointer',
            }}
            onClick={() => supabase.auth.signOut()}
          >
            Cerrar sesión
          </button>
        </div>
      </div>
    )
  }

  // Selfie rechazada
  if (status === 'rejected') {
    return (
      <div style={{
        minHeight: '100vh', background: '#0f0f1a',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24, fontFamily: 'system-ui, sans-serif',
      }}>
        <div style={{
          background: '#1a1a2e', borderRadius: 20, padding: '40px 28px',
          maxWidth: 360, width: '100%', textAlign: 'center',
          border: '1px solid #2e2e4e', display: 'flex', flexDirection: 'column',
          alignItems: 'center', gap: 14,
        }}>
          <div style={{ fontSize: 52 }}>❌</div>
          <h2 style={{ color: '#fff', fontSize: 20, fontWeight: 700, margin: 0 }}>
            Verificación rechazada
          </h2>
          <p style={{ color: '#9b9bb4', fontSize: 13, lineHeight: 1.6, margin: 0 }}>
            Tu selfie no pudo ser verificada. Por favor subí una foto clara de tu cara con buena iluminación.
          </p>
          <Verify onVerified={() => setStatus('pending')} />
        </div>
      </div>
    )
  }

  // Aprobado — acceso completo
  const isAdmin = session.user.id === ADMIN_ID

  return (
    <div style={styles.shell}>
      <div style={styles.screen}>
        {tab === 'map'     && <Map />}
        {tab === 'rounds'  && <MyRounds />}
        {tab === 'profile' && <Profile />}
        {tab === 'admin'   && <Admin />}
      </div>
      <nav style={styles.navbar}>
        <button style={{ ...styles.navBtn, ...(tab === 'map'     ? styles.navBtnActive : {}) }} onClick={() => setTab('map')}>
          <span style={styles.navIcon}>🗺️</span>
          <span style={styles.navLabel}>Mapa</span>
        </button>
        <button style={{ ...styles.navBtn, ...(tab === 'rounds'  ? styles.navBtnActive : {}) }} onClick={() => setTab('rounds')}>
          <span style={styles.navIcon}>🧉</span>
          <span style={styles.navLabel}>Mis rondas</span>
        </button>
        <button style={{ ...styles.navBtn, ...(tab === 'profile' ? styles.navBtnActive : {}) }} onClick={() => setTab('profile')}>
          <span style={styles.navIcon}>👤</span>
          <span style={styles.navLabel}>Perfil</span>
        </button>
        {isAdmin && (
          <button style={{ ...styles.navBtn, ...(tab === 'admin' ? styles.navBtnActive : {}) }} onClick={() => setTab('admin')}>
            <span style={styles.navIcon}>🛡️</span>
            <span style={styles.navLabel}>Admin</span>
          </button>
        )}
      </nav>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  shell: { height: '100vh', display: 'flex', flexDirection: 'column', background: '#0f0f1a', fontFamily: 'system-ui, sans-serif', overflow: 'hidden' },
  screen: { flex: 1, overflow: 'auto' },
  navbar: { display: 'flex', background: '#1a1a2e', borderTop: '1px solid #2e2e4e', padding: '8px 0 12px', zIndex: 1000 },
  navBtn: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, background: 'transparent', border: 'none', cursor: 'pointer', padding: '6px 0', opacity: 0.4 },
  navBtnActive: { opacity: 1 },
  navIcon: { fontSize: 22 },
  navLabel: { fontSize: 10, fontWeight: 600, color: '#fff', letterSpacing: '0.02em' },
}
