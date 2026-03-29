import { useRef, useState } from 'react'
import { supabase } from '../supabase'

export default function Verify({ onVerified }: { onVerified: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [step, setStep]       = useState<'intro' | 'preview' | 'uploading' | 'done'>('intro')
  const [imgData, setImgData] = useState<string | null>(null)
  const [imgBlob, setImgBlob] = useState<Blob | null>(null)
  const [error, setError]     = useState('')

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    // Verificar que sea imagen
    if (!file.type.startsWith('image/')) {
      setError('Por favor seleccioná una foto.')
      return
    }

    setImgBlob(file)
    const reader = new FileReader()
    reader.onload = (ev) => {
      const result = ev.target?.result as string
      if (result) {
        setImgData(result)
        setStep('preview')
      }
    }
    reader.readAsDataURL(file)
  }

  function retake() {
    setImgData(null)
    setImgBlob(null)
    setError('')
    setStep('intro')
    // Resetear el input para que detecte la misma foto de nuevo si es necesario
    if (inputRef.current) inputRef.current.value = ''
  }

  async function uploadSelfie() {
    if (!imgBlob) return
    setStep('uploading')
    setError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    try {
      const path = `${user.id}/selfie.jpg`

      const { error: uploadError } = await supabase.storage
        .from('selfies')
        .upload(path, imgBlob, { upsert: true, contentType: 'image/jpeg' })

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

  return (
    <div style={styles.container}>
      <div style={styles.card}>

        {step === 'intro' && (
          <>
            <div style={styles.icon}>📸</div>
            <h2 style={styles.title}>Verificación de identidad</h2>
            <p style={styles.desc}>
              Necesitamos una selfie para confirmar que sos una persona real.
              Es la base de confianza de toda la comunidad.
            </p>
            <div style={styles.infoBox}>
              <p style={styles.infoText}>✅ Solo usada para verificación</p>
              <p style={styles.infoText}>✅ No visible para otros usuarios</p>
              <p style={styles.infoText}>✅ Podés actualizarla cuando quieras</p>
            </div>
            {error && <p style={styles.error}>{error}</p>}

            {/* Input oculto — abre la cámara frontal directamente */}
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              capture="user"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />

            <button style={styles.button} onClick={() => inputRef.current?.click()}>
              📸 Sacar selfie
            </button>
          </>
        )}

        {step === 'preview' && imgData && (
          <>
            <h2 style={styles.title}>¿Se ve bien tu cara?</h2>
            <p style={styles.desc}>Asegurate de que tu cara esté clara y bien iluminada.</p>
            <img
              src={imgData}
              style={styles.preview}
              alt="selfie preview"
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
  preview: {
    width: '100%',
    borderRadius: 12,
    maxHeight: 320,
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
