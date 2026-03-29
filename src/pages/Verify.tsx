import { useRef, useState, useEffect } from 'react'
import { supabase } from '../supabase'

export default function Verify({ onVerified }: { onVerified: () => void }) {
  const videoRef   = useRef<HTMLVideoElement>(null)
  const canvasRef  = useRef<HTMLCanvasElement>(null)
  const streamRef  = useRef<MediaStream | null>(null)

  const [step, setStep]       = useState<'intro' | 'camera' | 'preview' | 'uploading' | 'done'>('intro')
  const [imgData, setImgData] = useState<string | null>(null)
  const [error, setError]     = useState('')
  const [ready, setReady]     = useState(false) // video listo para capturar

  // Limpiar stream al desmontar
  useEffect(() => {
    return () => { streamRef.current?.getTracks().forEach(t => t.stop()) }
  }, [])

  async function startCamera() {
    setError('')
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: false,
      })
      streamRef.current = s

      if (videoRef.current) {
        videoRef.current.srcObject = s
        // En iOS necesitamos esperar a que el video esté realmente listo
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().then(() => {
            setReady(true)
          }).catch(() => {
            setReady(true) // intentar igual
          })
        }
      }
      setStep('camera')
    } catch (e: any) {
      if (e.name === 'NotAllowedError') {
        setError('Permiso de cámara denegado. Andá a la configuración de tu celu y habilitá la cámara para este sitio.')
      } else if (e.name === 'NotFoundError') {
        setError('No encontramos una cámara en tu dispositivo.')
      } else {
        setError('No pudimos acceder a la cámara. Intentá desde Chrome o Safari.')
      }
    }
  }

  function takeSelfie() {
    const video  = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return

    const w = video.videoWidth  || 640
    const h = video.videoHeight || 480
    canvas.width  = w
    canvas.height = h

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Espejear horizontalmente (más natural para selfie)
    ctx.translate(w, 0)
    ctx.scale(-1, 1)
    ctx.drawImage(video, 0, 0, w, h)

    const data = canvas.toDataURL('image/jpeg', 0.85)

    // Verificar que la imagen no esté vacía
    if (data === 'data:,') {
      setError('No pudimos capturar la foto. Intentá de nuevo.')
      return
    }

    setImgData(data)
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    setReady(false)
    setStep('preview')
  }

  function retake() {
    setImgData(null)
    setError('')
    setReady(false)
    setStep('intro')
  }

  async function uploadSelfie() {
    if (!imgData) return
    setStep('uploading')
    setError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    try {
      // Convertir base64 a blob de forma segura
      const byteStr = atob(imgData.split(',')[1])
      const ab      = new ArrayBuffer(byteStr.length)
      const ia      = new Uint8Array(ab)
      for (let i = 0; i < byteStr.length; i++) ia[i] = byteStr.charCodeAt(i)
      const blob = new Blob([ab], { type: 'image/jpeg' })

      const path = `${user.id}/selfie.jpg`
      const { error: uploadError } = await supabase.storage
        .from('selfies')
        .upload(path, blob, { upsert: true, contentType: 'image/jpeg' })

      if (uploadError) {
        setError('Error al subir la foto: ' + uploadError.message)
        setStep('preview')
        return
      }

      const { error: updateError } = await supabase
        .from('users')
        .update({ verified_at: new Date().toISOString(), selfie_url: path })
        .eq('id', user.id)

      if (updateError) {
        setError('Error al verificar: ' + updateError.message)
        setStep('preview')
        return
      }

      setStep('done')
      setTimeout(() => onVerified(), 1800)

    } catch (e: any) {
      setError('Error inesperado: ' + e.message)
      setStep('preview')
    }
  }

  function stopAndGoBack() {
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    setReady(false)
    setStep('intro')
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>

        {step === 'intro' && (
          <>
            <div style={styles.icon}>📸</div>
            <h2 style={styles.title}>Verificación de identidad</h2>
            <p style={styles.desc}>
              MateMatch requiere una selfie para confirmar que sos una persona real.
              Es la base de confianza de toda la comunidad.
            </p>
            <div style={styles.infoBox}>
              <p style={styles.infoText}>✅ Solo usada para verificación</p>
              <p style={styles.infoText}>✅ No visible para otros usuarios</p>
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
            <h2 style={styles.title}>Mirá a la cámara</h2>
            <p style={styles.desc}>Asegurate de que tu cara esté bien iluminada.</p>

            {/* Video con muted obligatorio para autoplay en iOS */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              style={{
                ...styles.video,
                transform: 'scaleX(-1)', // espejo
                background: '#000',
              }}
            />
            <canvas ref={canvasRef} style={{ display: 'none' }} />

            {!ready && (
              <p style={{ color: '#9b9bb4', fontSize: 12, textAlign: 'center', margin: 0 }}>
                Iniciando cámara...
              </p>
            )}

            {error && <p style={styles.error}>{error}</p>}

            <button
              style={{ ...styles.button, opacity: ready ? 1 : 0.4 }}
              onClick={takeSelfie}
              disabled={!ready}
            >
              📸 Sacar foto
            </button>
            <button style={styles.buttonSecondary} onClick={stopAndGoBack}>
              Cancelar
            </button>
          </>
        )}

        {step === 'preview' && imgData && (
          <>
            <h2 style={styles.title}>¿Se ve bien tu cara?</h2>
            <img
              src={imgData}
              style={styles.preview}
              alt="selfie preview"
              onError={() => setError('La imagen no se pudo cargar. Repetí la foto.')}
            />
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
            <p style={styles.desc}>Ya podés crear y unirte a rondas de mates.</p>
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
    maxHeight: 300,
    objectFit: 'cover',
    display: 'block',
  },
  preview: {
    width: '100%',
    borderRadius: 12,
    maxHeight: 300,
    objectFit: 'cover',
    display: 'block',
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
  error: { color: '#f87171', fontSize: 13, margin: 0, textAlign: 'center', lineHeight: 1.5 },
}
