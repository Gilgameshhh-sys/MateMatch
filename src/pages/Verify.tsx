import { useRef, useState } from 'react'
import { supabase } from '../supabase'

export default function Verify({ onVerified }: { onVerified: () => void }) {
  const videoRef    = useRef<HTMLVideoElement>(null)
  const canvasRef   = useRef<HTMLCanvasElement>(null)
  const [step, setStep]         = useState<'intro' | 'camera' | 'preview' | 'uploading' | 'done'>('intro')
  const [imgData, setImgData]   = useState<string | null>(null)
  const [error, setError]       = useState('')
  const [stream, setStream]     = useState<MediaStream | null>(null)

  async function startCamera() {
    setError('')
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false })
      setStream(s)
      if (videoRef.current) videoRef.current.srcObject = s
      setStep('camera')
    } catch {
      setError('No pudimos acceder a tu cámara. Permití el acceso e intentá de nuevo.')
    }
  }

  function takeSelfie() {
    if (!videoRef.current || !canvasRef.current) return
    const canvas = canvasRef.current
    const video  = videoRef.current
    canvas.width  = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d')?.drawImage(video, 0, 0)
    const data = canvas.toDataURL('image/jpeg', 0.8)
    setImgData(data)
    stream?.getTracks().forEach(t => t.stop())
    setStream(null)
    setStep('preview')
  }

  function retake() {
    setImgData(null)
    setStep('intro')
  }

  async function uploadSelfie() {
    if (!imgData) return
    setStep('uploading')
    setError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Convertir base64 a blob
    const res   = await fetch(imgData)
    const blob  = await res.blob()
    const path  = `${user.id}/selfie.jpg`

    const { error: uploadError } = await supabase.storage
      .from('selfies')
      .upload(path, blob, { upsert: true, contentType: 'image/jpeg' })

    if (uploadError) {
      setError('Error al subir la foto. Intentá de nuevo.')
      setStep('preview')
      return
    }

    // Marcar usuario como verificado
    const { error: updateError } = await supabase
      .from('users')
      .update({ verified_at: new Date().toISOString(), selfie_url: path })
      .eq('id', user.id)

    if (updateError) {
      setError('Error al verificar. Intentá de nuevo.')
      setStep('preview')
      return
    }

    setStep('done')
    setTimeout(() => onVerified(), 1500)
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>

        {step === 'intro' && (
          <>
            <div style={styles.icon}>📸</div>
            <h2 style={styles.title}>Verificación de identidad</h2>
            <p style={styles.desc}>MateMatch requiere una selfie para verificar que sos una persona real. Es el primer paso para generar confianza en la comunidad.</p>
            <div style={styles.infoBox}>
              <p style={styles.infoText}>✅ Tu foto solo se usa para verificación</p>
              <p style={styles.infoText}>✅ No se comparte con otros usuarios</p>
              <p style={styles.infoText}>✅ Podés actualizarla cuando quieras</p>
            </div>
            {error && <p style={styles.error}>{error}</p>}
            <button style={styles.button} onClick={startCamera}>
              Activar cámara
            </button>
          </>
        )}

        {step === 'camera' && (
          <>
            <h2 style={styles.title}>Sacate una selfie</h2>
            <p style={styles.desc}>Mirá a la cámara y asegurate de que tu cara se vea bien iluminada.</p>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              style={styles.video}
            />
            <canvas ref={canvasRef} style={{ display: 'none' }} />
            <button style={styles.button} onClick={takeSelfie}>
              📸 Sacar foto
            </button>
            <button style={styles.buttonSecondary} onClick={() => { stream?.getTracks().forEach(t => t.stop()); setStep('intro') }}>
              Cancelar
            </button>
          </>
        )}

        {step === 'preview' && imgData && (
          <>
            <h2 style={styles.title}>¿Se ve bien?</h2>
            <img src={imgData} style={styles.preview} alt="selfie" />
            {error && <p style={styles.error}>{error}</p>}
            <button style={styles.button} onClick={uploadSelfie}>
              ✅ Confirmar y verificarme
            </button>
            <button style={styles.buttonSecondary} onClick={retake}>
              Repetir foto
            </button>
          </>
        )}

        {step === 'uploading' && (
          <>
            <div style={styles.icon}>⏳</div>
            <h2 style={styles.title}>Verificando...</h2>
            <p style={styles.desc}>Subiendo tu selfie de forma segura.</p>
          </>
        )}

        {step === 'done' && (
          <>
            <div style={styles.icon}>🎉</div>
            <h2 style={styles.title}>¡Verificado!</h2>
            <p style={styles.desc}>Ya podés crear y unirte a rondas.</p>
          </>
        )}

      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    background: '#0f0f1a',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    fontFamily: 'system-ui, sans-serif',
  },
  card: {
    background: '#1a1a2e',
    borderRadius: 20,
    padding: '36px 28px',
    width: '100%',
    maxWidth: 380,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 14,
    border: '1px solid #2e2e4e',
  },
  icon: { fontSize: 52 },
  title: { color: '#fff', fontSize: 20, fontWeight: 700, margin: 0, textAlign: 'center' },
  desc: { color: '#9b9bb4', fontSize: 13, textAlign: 'center', lineHeight: 1.6, margin: 0 },
  infoBox: {
    background: '#0f0f1a',
    borderRadius: 10,
    padding: '12px 16px',
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  infoText: { color: '#9b9bb4', fontSize: 12, margin: 0 },
  video: {
    width: '100%',
    borderRadius: 12,
    background: '#000',
    maxHeight: 280,
    objectFit: 'cover',
  },
  preview: {
    width: '100%',
    borderRadius: 12,
    maxHeight: 280,
    objectFit: 'cover',
  },
  button: {
    width: '100%',
    padding: '14px',
    background: '#4f46e5',
    color: '#fff',
    border: 'none',
    borderRadius: 10,
    fontSize: 15,
    fontWeight: 600,
    cursor: 'pointer',
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
  error: { color: '#f87171', fontSize: 13, margin: 0, textAlign: 'center' },
}
