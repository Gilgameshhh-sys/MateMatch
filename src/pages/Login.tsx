import { useState } from 'react';
import { supabase } from '../supabase';

export default function Login() {
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function sendOTP() {
    setLoading(true);
    setError('');
    const fullPhone = '+549' + phone.replace(/\D/g, '');
    const { error } = await supabase.auth.signInWithOtp({ phone: fullPhone });
    if (error) {
      setError('No pudimos enviar el código. Revisá el número.');
    } else {
      setStep('otp');
    }
    setLoading(false);
  }

  async function verifyOTP() {
    setLoading(true);
    setError('');
    const fullPhone = '+549' + phone.replace(/\D/g, '');
    const { error } = await supabase.auth.verifyOtp({
      phone: fullPhone,
      token: otp,
      type: 'sms',
    });
    if (error) {
      setError('Código incorrecto. Intentá de nuevo.');
    }
    setLoading(false);
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.logo}>🧉</div>
        <h1 style={styles.title}>MateMatch</h1>
        <p style={styles.subtitle}>La red social de encuentros reales.</p>

        {step === 'phone' ? (
          <>
            <p style={styles.label}>Tu número de celular</p>
            <div style={styles.inputRow}>
              <span style={styles.prefix}>+549</span>
              <input
                style={styles.input}
                type="tel"
                placeholder="3512546273"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                maxLength={10}
              />
            </div>
            {error && <p style={styles.error}>{error}</p>}
            <button
              style={styles.button}
              onClick={sendOTP}
              disabled={loading || phone.length < 10}
            >
              {loading ? 'Enviando...' : 'Recibir código'}
            </button>
          </>
        ) : (
          <>
            <p style={styles.label}>Ingresá el código que te enviamos</p>
            <input
              style={{
                ...styles.input,
                textAlign: 'center',
                letterSpacing: 8,
                fontSize: 24,
                width: '100%',
              }}
              type="number"
              placeholder="123456"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              maxLength={6}
            />
            {error && <p style={styles.error}>{error}</p>}
            <button
              style={styles.button}
              onClick={verifyOTP}
              disabled={loading || otp.length < 6}
            >
              {loading ? 'Verificando...' : 'Confirmar código'}
            </button>
            <button
              style={styles.buttonSecondary}
              onClick={() => {
                setStep('phone');
                setOtp('');
                setError('');
              }}
            >
              Cambiar número
            </button>
          </>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    background: '#0f0f1a',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'system-ui, sans-serif',
    padding: 20,
  },
  card: {
    background: '#1a1a2e',
    borderRadius: 20,
    padding: '40px 32px',
    width: '100%',
    maxWidth: 380,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 12,
  },
  logo: {
    fontSize: 56,
    marginBottom: 4,
  },
  title: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: 700,
    margin: 0,
  },
  subtitle: {
    color: '#9b9bb4',
    fontSize: 14,
    margin: '0 0 12px',
    textAlign: 'center',
  },
  label: {
    color: '#9b9bb4',
    fontSize: 13,
    alignSelf: 'flex-start',
    margin: 0,
  },
  inputRow: {
    display: 'flex',
    alignItems: 'center',
    background: '#0f0f1a',
    borderRadius: 10,
    border: '1px solid #2e2e4e',
    width: '100%',
    overflow: 'hidden',
  },
  prefix: {
    color: '#9b9bb4',
    fontSize: 15,
    padding: '12px 10px 12px 14px',
    borderRight: '1px solid #2e2e4e',
  },
  input: {
    background: 'transparent',
    border: 'none',
    outline: 'none',
    color: '#ffffff',
    fontSize: 16,
    padding: '12px 14px',
    flex: 1,
  },
  button: {
    width: '100%',
    padding: '14px',
    background: '#4f46e5',
    color: '#ffffff',
    border: 'none',
    borderRadius: 10,
    fontSize: 15,
    fontWeight: 600,
    cursor: 'pointer',
    marginTop: 4,
  },
  buttonSecondary: {
    width: '100%',
    padding: '12px',
    background: 'transparent',
    color: '#9b9bb4',
    border: '1px solid #2e2e4e',
    borderRadius: 10,
    fontSize: 14,
    cursor: 'pointer',
  },
  error: {
    color: '#f87171',
    fontSize: 13,
    margin: 0,
    alignSelf: 'flex-start',
  },
};
