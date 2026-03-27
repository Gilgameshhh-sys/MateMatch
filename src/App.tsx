import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import Login from './pages/Login'
import Map from './pages/Map'
import MyRounds from './pages/MyRounds'
import Profile from './pages/Profile'

export default function App() {
  const [session, setSession]   = useState<any>(null)
  const [loading, setLoading]   = useState(true)
  const [tab, setTab]           = useState<'map' | 'rounds' | 'profile'>('map')

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })
    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })
  }, [])

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

  return (
    <div style={styles.shell}>

      {/* Pantalla activa */}
      <div style={styles.screen}>
        {tab === 'map'     && <Map />}
        {tab === 'rounds'  && <MyRounds />}
        {tab === 'profile' && <Profile />}
      </div>

      {/* Barra de navegación inferior */}
      <nav style={styles.navbar}>
        <button
          style={{ ...styles.navBtn, ...(tab === 'map' ? styles.navBtnActive : {}) }}
          onClick={() => setTab('map')}
        >
          <span style={styles.navIcon}>🗺️</span>
          <span style={styles.navLabel}>Mapa</span>
        </button>
        <button
          style={{ ...styles.navBtn, ...(tab === 'rounds' ? styles.navBtnActive : {}) }}
          onClick={() => setTab('rounds')}
        >
          <span style={styles.navIcon}>🧉</span>
          <span style={styles.navLabel}>Mis rondas</span>
        </button>
        <button
          style={{ ...styles.navBtn, ...(tab === 'profile' ? styles.navBtnActive : {}) }}
          onClick={() => setTab('profile')}
        >
          <span style={styles.navIcon}>👤</span>
          <span style={styles.navLabel}>Perfil</span>
        </button>
      </nav>

    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  shell: {
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    background: '#0f0f1a',
    fontFamily: 'system-ui, sans-serif',
    overflow: 'hidden',
  },
  screen: {
    flex: 1,
    overflow: 'auto',
  },
  navbar: {
    display: 'flex',
    background: '#1a1a2e',
    borderTop: '1px solid #2e2e4e',
    padding: '8px 0 12px',
    zIndex: 1000,
  },
  navBtn: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 3,
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    padding: '6px 0',
    opacity: 0.4,
    transition: 'opacity 0.15s',
  },
  navBtnActive: {
    opacity: 1,
  },
  navIcon: {
    fontSize: 22,
  },
  navLabel: {
    fontSize: 10,
    fontWeight: 600,
    color: '#fff',
    letterSpacing: '0.02em',
  },
}