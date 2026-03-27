import { useEffect, useState } from 'react'
import { supabase } from '../supabase'

export default function MyRounds() {
  const [myRounds, setMyRounds]     = useState<any[]>([])
  const [joined, setJoined]         = useState<any[]>([])
  const [loading, setLoading]       = useState(true)
  const [tab, setTab]               = useState<'created' | 'joined'>('created')

  useEffect(() => { fetchRounds() }, [])

  async function fetchRounds() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: created } = await supabase
      .from('rounds')
      .select('*, round_members(status)')
      .eq('creator_id', user.id)
      .order('created_at', { ascending: false })

    const { data: joinedRounds } = await supabase
      .from('round_members')
      .select('status, rounds(*)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    setMyRounds(created || [])
    setJoined(joinedRounds || [])
    setLoading(false)
  }

  async function closeRound(roundId: string) {
    await supabase
      .from('rounds')
      .update({ status: 'closed' })
      .eq('id', roundId)
    fetchRounds()
  }

  function statusColor(status: string) {
    if (status === 'active') return '#6ec99a'
    if (status === 'full')   return '#ef9f27'
    return '#9b9bb4'
  }

  function statusLabel(status: string) {
    if (status === 'active')    return 'Activa'
    if (status === 'full')      return 'Llena'
    if (status === 'closed')    return 'Cerrada'
    if (status === 'cancelled') return 'Cancelada'
    return status
  }

  function memberLabel(status: string) {
    if (status === 'confirmed') return '✅ Confirmado'
    if (status === 'pending')   return '⏳ Pendiente'
    if (status === 'rejected')  return '❌ Rechazado'
    return status
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span style={styles.headerLogo}>🧉</span>
        <span style={styles.headerTitle}>Mis rondas</span>
      </div>

      {/* Tabs */}
      <div style={styles.tabs}>
        <button
          style={{ ...styles.tab, ...(tab === 'created' ? styles.tabActive : {}) }}
          onClick={() => setTab('created')}
        >
          Creadas por mí
        </button>
        <button
          style={{ ...styles.tab, ...(tab === 'joined' ? styles.tabActive : {}) }}
          onClick={() => setTab('joined')}
        >
          Me sumé
        </button>
      </div>

      <div style={styles.content}>
        {loading ? (
          <p style={styles.empty}>Cargando...</p>
        ) : tab === 'created' ? (
          myRounds.length === 0 ? (
            <p style={styles.empty}>Todavía no creaste ninguna ronda.</p>
          ) : (
            myRounds.map(round => (
              <div key={round.id} style={styles.card}>
                <div style={styles.cardTop}>
                  <span style={styles.placeName}>{round.place_name}</span>
                  <span style={{ ...styles.statusBadge, color: statusColor(round.status) }}>
                    {statusLabel(round.status)}
                  </span>
                </div>
                {round.description && (
                  <p style={styles.desc}>{round.description}</p>
                )}
                <div style={styles.meta}>
                  <span>🪑 {round.round_members?.filter((m: any) => m.status === 'confirmed').length || 0}/{round.capacity} personas</span>
                  <span>{round.type === 'open' ? 'Abierta' : 'Con aprobación'}</span>
                </div>
                {round.status === 'active' && (
                  <button
                    style={styles.closeBtn}
                    onClick={() => closeRound(round.id)}
                  >
                    Cerrar ronda
                  </button>
                )}
              </div>
            ))
          )
        ) : (
          joined.length === 0 ? (
            <p style={styles.empty}>Todavía no te sumaste a ninguna ronda.</p>
          ) : (
            joined.map((item: any) => (
              <div key={item.rounds?.id} style={styles.card}>
                <div style={styles.cardTop}>
                  <span style={styles.placeName}>{item.rounds?.place_name}</span>
                  <span style={{ ...styles.statusBadge, color: statusColor(item.rounds?.status) }}>
                    {statusLabel(item.rounds?.status)}
                  </span>
                </div>
                {item.rounds?.description && (
                  <p style={styles.desc}>{item.rounds.description}</p>
                )}
                <div style={styles.meta}>
                  <span>🪑 {item.rounds?.capacity} cupos</span>
                  <span style={{ color: '#6ec99a', fontSize: 12 }}>
                    {memberLabel(item.status)}
                  </span>
                </div>
              </div>
            ))
          )
        )}
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
  tabs: {
    display: 'flex',
    background: '#1a1a2e',
    borderBottom: '1px solid #2e2e4e',
  },
  tab: {
    flex: 1,
    padding: '12px',
    background: 'transparent',
    border: 'none',
    color: '#9b9bb4',
    fontSize: 13,
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
    padding: '16px',
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
    padding: '16px',
    border: '1px solid #2e2e4e',
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  cardTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  placeName: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 600,
  },
  statusBadge: {
    fontSize: 12,
    fontWeight: 600,
  },
  desc: {
    color: '#9b9bb4',
    fontSize: 13,
    margin: 0,
  },
  meta: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: 12,
    color: '#9b9bb4',
  },
  closeBtn: {
    padding: '8px',
    background: 'transparent',
    color: '#f87171',
    border: '1px solid #3a1e1e',
    borderRadius: 8,
    fontSize: 13,
    cursor: 'pointer',
    marginTop: 4,
  },
}