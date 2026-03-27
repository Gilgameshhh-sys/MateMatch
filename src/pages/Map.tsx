import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { supabase } from '../supabase';
import 'leaflet/dist/leaflet.css';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Ícono morado para la nueva ronda
const purpleIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-violet.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

interface Round {
  id: string;
  place_name: string;
  description: string;
  type: 'open' | 'approval';
  capacity: number;
  starts_at: string;
  creator_name: string;
  creator_rating: number;
  current_members: number;
  lat: number;
  lng: number;
}

function MapClickHandler({
  picking,
  onSelect,
}: {
  picking: boolean;
  onSelect: (pos: [number, number]) => void;
}) {
  useMapEvents({
    click(e) {
      if (picking) onSelect([e.latlng.lat, e.latlng.lng]);
    },
  });
  return null;
}

export default function Map() {
  const [rounds, setRounds] = useState<Round[]>([]);
  const [userPos, setUserPos] = useState<[number, number]>([-31.4201, -64.1888]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [picking, setPicking] = useState(false);
  const [creating, setCreating] = useState(false);
  const [placeName, setPlaceName] = useState('');
  const [description, setDescription] = useState('');
  const [capacity, setCapacity] = useState(4);
  const [roundType, setRoundType] = useState<'open' | 'approval'>('open');
  const [selectedPos, setSelectedPos] = useState<[number, number] | null>(null);

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserPos([pos.coords.latitude, pos.coords.longitude]),
      () => {}
    );
    fetchRounds();
  }, []);

  async function fetchRounds() {
    setLoading(true);
    const { data, error } = await supabase
      .from('rounds')
      .select(`
        id, place_name, description, type, capacity, starts_at,
        location, status,
        users!creator_id (display_name, rating_avg),
        round_members (status)
      `)
      .eq('status', 'active');

    if (!error && data) {
      const mapped = data.map((r: any) => {
        const coords = r.location
          ? JSON.parse(JSON.stringify(r.location))
          : { coordinates: [-64.1888, -31.4201] };
        return {
          id: r.id,
          place_name: r.place_name,
          description: r.description || '',
          type: r.type,
          capacity: r.capacity,
          starts_at: r.starts_at,
          creator_name: r.users?.display_name || 'Anónimo',
          creator_rating: r.users?.rating_avg || 0,
          current_members: r.round_members?.filter((m: any) => m.status === 'confirmed').length || 0,
          lat: coords.coordinates?.[1] || -31.4201,
          lng: coords.coordinates?.[0] || -64.1888,
        };
      });
      setRounds(mapped);
    }
    setLoading(false);
  }

  function handleNuevaRonda() {
    setSelectedPos(null);
    setPicking(true);
  }

  function handleMapSelect(pos: [number, number]) {
    setSelectedPos(pos);
    setPicking(false);
    setShowForm(true);
  }

  async function createRound() {
    if (!placeName.trim()) return;
    setCreating(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const pos = selectedPos || userPos;
    const { error } = await supabase.from('rounds').insert({
      creator_id: user.id,
      place_name: placeName,
      description,
      capacity,
      type: roundType,
      location: `POINT(${pos[1]} ${pos[0]})`,
      place_type: 'public',
      is_public_place: true,
      starts_at: new Date().toISOString(),
    });

    if (!error) {
      setShowForm(false);
      setPlaceName('');
      setDescription('');
      setCapacity(4);
      setSelectedPos(null);
      fetchRounds();
    } else {
      alert('Error al crear la ronda: ' + error.message);
    }
    setCreating(false);
  }

  async function joinRound(roundId: string, type: 'open' | 'approval') {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const status = type === 'open' ? 'confirmed' : 'pending';
    const { error } = await supabase.from('round_members').insert({
      round_id: roundId,
      user_id: user.id,
      status,
    });

    if (!error) {
      fetchRounds();
      alert(type === 'open' ? '¡Te sumaste a la ronda!' : 'Solicitud enviada. El creador debe aceptarte.');
    }
  }

  return (
    <div style={styles.container}>

      {/* Header */}
      <div style={styles.header}>
        <span style={styles.headerLogo}>🧉</span>
        <span style={styles.headerTitle}>MateMatch</span>
        {!picking && (
          <button style={styles.newRoundBtn} onClick={handleNuevaRonda}>
            + Nueva ronda
          </button>
        )}
      </div>

      {/* Banner modo selección */}
      {picking && (
        <div style={styles.pickingBanner}>
          <span>📍 Tocá el mapa para marcar dónde será tu ronda</span>
          <button style={styles.cancelPick} onClick={() => setPicking(false)}>
            Cancelar
          </button>
        </div>
      )}

      {/* Mapa */}
      <MapContainer
        center={userPos}
        zoom={15}
        style={{ flex: 1, width: '100%' }}
      >
        <TileLayer
          attribution="&copy; OpenStreetMap"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapClickHandler picking={picking} onSelect={handleMapSelect} />

        {/* Tu ubicación */}
        <Circle
          center={userPos}
          radius={60}
          pathOptions={{ color: '#4f46e5', fillColor: '#4f46e5', fillOpacity: 0.3 }}
        />

        {/* Pin de nueva ronda (morado) */}
        {selectedPos && (
          <Marker position={selectedPos} icon={purpleIcon}>
            <Popup>📍 Nueva ronda aquí</Popup>
          </Marker>
        )}

        {/* Rondas activas */}
        {rounds.map((round) => (
          <Marker key={round.id} position={[round.lat, round.lng]}>
            <Popup>
              <div style={styles.popup}>
                <div style={styles.popupHeader}>
                  <span style={styles.popupEmoji}>🧉</span>
                  <strong style={styles.popupPlace}>{round.place_name}</strong>
                </div>
                {round.description && <p style={styles.popupDesc}>{round.description}</p>}
                <div style={styles.popupMeta}>
                  <span>👤 {round.creator_name}</span>
                  <span>⭐ {round.creator_rating.toFixed(1)}</span>
                </div>
                <div style={styles.popupMeta}>
                  <span>🪑 {round.current_members}/{round.capacity} personas</span>
                  <span style={{
                    ...styles.typeBadge,
                    background: round.type === 'open' ? '#1e3a2e' : '#2d2d50',
                    color: round.type === 'open' ? '#6ec99a' : '#a5a5e0',
                  }}>
                    {round.type === 'open' ? 'Abierta' : 'Con aprobación'}
                  </span>
                </div>
                <button style={styles.joinBtn} onClick={() => joinRound(round.id, round.type)}>
                  {round.type === 'open' ? 'Sumarme' : 'Solicitar unirme'}
                </button>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Barra inferior */}
      <div style={styles.roundsBar}>
        {loading
          ? 'Buscando rondas...'
          : rounds.length === 0
            ? 'No hay rondas activas cerca. ¡Creá la primera!'
            : `${rounds.length} ronda${rounds.length > 1 ? 's' : ''} activa${rounds.length > 1 ? 's' : ''} cerca`}
      </div>

      {/* Modal crear ronda */}
      {showForm && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            <h2 style={styles.modalTitle}>🧉 Nueva ronda</h2>
            <p style={{ fontSize: 12, color: '#6ec99a', margin: 0 }}>
              📍 Ubicación marcada en el mapa
            </p>
            <button
              style={styles.changeLocBtn}
              onClick={() => { setShowForm(false); setPicking(true); }}
            >
              Cambiar ubicación
            </button>

            <label style={styles.label}>Lugar</label>
            <input
              style={styles.input}
              placeholder="ej: Parque Sarmiento, entrada norte"
              value={placeName}
              onChange={(e) => setPlaceName(e.target.value)}
            />

            <label style={styles.label}>Descripción (opcional)</label>
            <input
              style={styles.input}
              placeholder="ej: Ronda tranquila, traé tu mate"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />

            <label style={styles.label}>Cupos</label>
            <div style={styles.cuposRow}>
              {[2, 3, 4, 5, 6, 8].map((n) => (
                <button
                  key={n}
                  style={{
                    ...styles.cupoBtn,
                    background: capacity === n ? '#4f46e5' : '#1a1a2e',
                    color: capacity === n ? '#fff' : '#9b9bb4',
                    border: capacity === n ? '1px solid #4f46e5' : '1px solid #2e2e4e',
                  }}
                  onClick={() => setCapacity(n)}
                >
                  {n}
                </button>
              ))}
            </div>

            <label style={styles.label}>Tipo de ronda</label>
            <div style={styles.typeRow}>
              <button
                style={{
                  ...styles.typeBtn,
                  background: roundType === 'open' ? '#1e3a2e' : '#1a1a2e',
                  color: roundType === 'open' ? '#6ec99a' : '#9b9bb4',
                  border: roundType === 'open' ? '1px solid #6ec99a' : '1px solid #2e2e4e',
                }}
                onClick={() => setRoundType('open')}
              >
                Abierta
              </button>
              <button
                style={{
                  ...styles.typeBtn,
                  background: roundType === 'approval' ? '#2d2d50' : '#1a1a2e',
                  color: roundType === 'approval' ? '#a5a5e0' : '#9b9bb4',
                  border: roundType === 'approval' ? '1px solid #a5a5e0' : '1px solid #2e2e4e',
                }}
                onClick={() => setRoundType('approval')}
              >
                Con aprobación
              </button>
            </div>

            <button
              style={{ ...styles.button, opacity: creating ? 0.6 : 1 }}
              onClick={createRound}
              disabled={creating || !placeName.trim()}
            >
              {creating ? 'Creando...' : 'Crear ronda'}
            </button>
            <button style={styles.buttonSecondary} onClick={() => { setShowForm(false); setSelectedPos(null); }}>
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    height: '100vh',
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
    zIndex: 1000,
  },
  headerLogo: { fontSize: 22 },
  headerTitle: { color: '#fff', fontWeight: 700, fontSize: 18, flex: 1 },
  newRoundBtn: {
    background: '#4f46e5',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    padding: '8px 14px',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
  },
  pickingBanner: {
    background: '#4f46e5',
    color: '#fff',
    fontSize: 13,
    fontWeight: 500,
    padding: '10px 16px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 1000,
  },
  cancelPick: {
    background: 'rgba(255,255,255,0.2)',
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    padding: '4px 10px',
    fontSize: 12,
    cursor: 'pointer',
  },
  roundsBar: {
    background: '#1a1a2e',
    color: '#9b9bb4',
    fontSize: 12,
    textAlign: 'center',
    padding: '8px 16px',
    borderTop: '1px solid #2e2e4e',
  },
  popup: { fontFamily: 'system-ui, sans-serif', minWidth: 180 },
  popupHeader: { display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 },
  popupEmoji: { fontSize: 18 },
  popupPlace: { fontSize: 14, color: '#1a1a2e' },
  popupDesc: { fontSize: 12, color: '#666', margin: '0 0 6px' },
  popupMeta: { display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#444', marginBottom: 4 },
  typeBadge: { fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 10 },
  joinBtn: {
    width: '100%', padding: '8px', background: '#4f46e5', color: '#fff',
    border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', marginTop: 8,
  },
  overlay: {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    background: 'rgba(0,0,0,0.7)',
    display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    zIndex: 2000,
  },
  modal: {
    background: '#1a1a2e',
    borderRadius: '20px 20px 0 0',
    padding: '28px 24px 40px',
    width: '100%',
    maxWidth: 480,
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    maxHeight: '85vh',
    overflowY: 'auto',
  },
  modalTitle: { color: '#fff', fontSize: 20, fontWeight: 700, margin: 0 },
  changeLocBtn: {
    background: 'transparent',
    color: '#9b9bb4',
    border: '1px solid #2e2e4e',
    borderRadius: 8,
    padding: '6px 12px',
    fontSize: 12,
    cursor: 'pointer',
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
  cuposRow: { display: 'flex', gap: 8 },
  cupoBtn: { flex: 1, padding: '8px', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' },
  typeRow: { display: 'flex', gap: 8 },
  typeBtn: { flex: 1, padding: '10px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  button: {
    padding: '14px', background: '#4f46e5', color: '#fff',
    border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: 'pointer', marginTop: 4,
  },
  buttonSecondary: {
    padding: '12px', background: 'transparent', color: '#9b9bb4',
    border: '1px solid #2e2e4e', borderRadius: 10, fontSize: 14, cursor: 'pointer',
  },
};
