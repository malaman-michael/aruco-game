<template>
  <div class="gesture-view">
    <!-- Header con pulsante di ritorno e titolo -->
    <div class="gesture-header">
      <button class="back-btn" @click="$router.push('/')">←</button>
      <h1>🖐️ Riconoscimento gesti mano</h1>
    </div>

    <!-- Contenitore video + canvas -->
    <div class="video-container">
      <video ref="video" autoplay muted playsinline class="video"></video>
      <canvas ref="canvas" class="overlay-canvas"></canvas>
    </div>

    <!-- Stato e messaggi -->
    <div class="status">
      <div class="camera-status" :class="{ ready: cameraReady }">
        {{ cameraReady ? '✅ Fotocamera attiva' : '⏳ Attivazione fotocamera...' }}
      </div>
    </div>

    <!-- Toast notifiche -->
    <div v-if="toast.visible" class="toast" :class="toast.type">
      {{ toast.message }}
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { GestureRecognizer, FilesetResolver, DrawingUtils } from '@mediapipe/tasks-vision'

// Riferimenti DOM
const video = ref(null)
const canvas = ref(null)
let canvasCtx = null
let animationId = null
let gestureRecognizer = null
let cameraStream = null

// Stato UI / Reattivi
const cameraReady = ref(false)
const toast = ref({
  visible: false,
  message: '',
  type: 'info',
  timeout: null
})

// Token per evitare notifiche troppe ravvicinate (cooldown)
let lastRecognizedGesture = ''
let lastRecognizedTime = 0

// Mostra un toast per 5 secondi
function showToast(message, type = 'gesture') {
  if (toast.value.timeout) clearTimeout(toast.value.timeout)
  toast.value.message = message
  toast.value.type = type
  toast.value.visible = true
  toast.value.timeout = setTimeout(() => {
    toast.value.visible = false
  }, 5000)
}

// Gestisce i risultati del riconoscitore
async function predictGesture() {
  if (!gestureRecognizer || !video.value || !canvas.value) return

  const now = Date.now()
  // Esegue il riconoscimento sul fotogramma corrente
  const results = gestureRecognizer.recognizeForVideo(video.value, performance.now())

  // Pulisce il canvas e ridisegna i landmarks (opzionale)
  if (canvasCtx) canvasCtx.clearRect(0, 0, canvas.value.width, canvas.value.height)

  if (results.gestures.length > 0) {
    const gesture = results.gestures[0][0]
    const gestureName = gesture.categoryName
    const score = gesture.score

    // Mostra il nome del gesto nel canvas (opzionale)
    if (canvasCtx) {
      canvasCtx.font = '18px "Segoe UI", system-ui'
      canvasCtx.fillStyle = '#ffffff'
      canvasCtx.shadowBlur = 0
      canvasCtx.fillText(`Gesto: ${gestureName} (${Math.round(score * 100)}%)`, 20, 50)
    }

    // Evita spam: mostra il toast solo se il gesto è diverso dall'ultimo o se sono passati più di 2 secondi
    if (gestureName !== lastRecognizedGesture || (now - lastRecognizedTime) > 2000) {
      lastRecognizedGesture = gestureName
      lastRecognizedTime = now
      showToast(`Rilevato gesto: ${gestureName}`, 'gesture')
    }
  } else {
    if (canvasCtx) {
      canvasCtx.font = '18px "Segoe UI", system-ui'
      canvasCtx.fillStyle = '#cccccc'
      canvasCtx.fillText('Nessun gesto rilevato', 20, 50)
    }
    // Reset del token per gesti consecutivi
    lastRecognizedGesture = ''
  }

  // Disegna i punti chiave delle mani (landmarks) – effetto visivo gradevole
  if (results.landmarks && results.landmarks.length > 0 && canvasCtx) {
    const drawingUtils = new DrawingUtils(canvasCtx)
    for (const landmarks of results.landmarks) {
      drawingUtils.drawConnectors(landmarks, GestureRecognizer.HAND_CONNECTIONS, {
        color: '#00FF00',
        lineWidth: 2
      })
      drawingUtils.drawLandmarks(landmarks, {
        color: '#FF0000',
        radius: 3
      })
    }
  }

  requestAnimationFrame(predictGesture)
}

// Avvia la fotocamera e inizializza MediaPipe
async function initCameraAndMediaPipe() {
  try {
    cameraStream = await navigator.mediaDevices.getUserMedia({ video: true })
    video.value.srcObject = cameraStream
    await video.value.play()
    cameraReady.value = true

    // Imposta dimensioni canvas in base al video
    const updateCanvasSize = () => {
      if (video.value.videoWidth && video.value.videoHeight) {
        canvas.value.width = video.value.videoWidth
        canvas.value.height = video.value.videoHeight
        canvas.value.style.width = `${video.value.videoWidth}px`
        canvas.value.style.height = `${video.value.videoHeight}px`
        canvasCtx = canvas.value.getContext('2d')
      } else {
        setTimeout(updateCanvasSize, 100)
      }
    }
    updateCanvasSize()
  } catch (err) {
    console.error('Errore fotocamera:', err)
    showToast('Impossibile accedere alla fotocamera. Verifica i permessi.', 'error')
  }

  // Carica il modello MediaPipe
  try {
    const vision = await FilesetResolver.forVisionTasks(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm'
    )
    gestureRecognizer = await GestureRecognizer.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath:
          'https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task',
        delegate: 'GPU'
      },
      numHands: 2,
      runningMode: 'VIDEO'
    })
    // Avvia il loop di riconoscimento
    predictGesture()
  } catch (err) {
    console.error('Errore caricamento modello MediaPipe:', err)
    showToast('Errore nel caricamento del riconoscitore di gesti.', 'error')
  }
}

// Dimensiona il canvas quando la finestra cambia dimensione
window.addEventListener('resize', () => {
  if (video.value && video.value.videoWidth) {
    canvas.value.width = video.value.videoWidth
    canvas.value.height = video.value.videoHeight
    canvas.value.style.width = `${video.value.videoWidth}px`
    canvas.value.style.height = `${video.value.videoHeight}px`
  }
})

onMounted(() => {
  initCameraAndMediaPipe()
})

onUnmounted(() => {
  if (animationId) cancelAnimationFrame(animationId)
  if (gestureRecognizer) gestureRecognizer.close()
  if (cameraStream) {
    cameraStream.getTracks().forEach((track) => track.stop())
  }
})
</script>

<style scoped>
.gesture-view {
  min-height: 100vh;
  background: linear-gradient(145deg, #0f0f1e 0%, #1a1a2e 100%);
  color: #eee;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.gesture-header {
  width: 100%;
  max-width: 1000px;
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
}
.back-btn {
  background: none;
  border: none;
  color: #7c9ef5;
  font-size: 1.8rem;
  cursor: pointer;
  transition: transform 0.1s;
}
.back-btn:hover {
  transform: scale(1.05);
}
h1 {
  margin: 0;
  font-size: 1.6rem;
  font-weight: 500;
}
.video-container {
  position: relative;
  width: 100%;
  max-width: 1000px;
  background: #000;
  border-radius: 24px;
  overflow: hidden;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.5);
  aspect-ratio: 16 / 9;
}
.video {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transform: scaleX(-1);  /* Effetto specchio, più naturale */
}
.overlay-canvas {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  transform: scaleX(-1);  /* Allinea con il video specchiato */
}
.status {
  margin-top: 1rem;
  font-size: 0.9rem;
  background: #1a1a2e;
  padding: 0.4rem 1rem;
  border-radius: 40px;
}
.camera-status.ready {
  color: #7fff7f;
}
/* Toast notifica */
.toast {
  position: fixed;
  bottom: 30px;
  left: 50%;
  transform: translateX(-50%);
  background: #1e1e2e;
  backdrop-filter: blur(12px);
  border-radius: 48px;
  padding: 12px 24px;
  font-size: 1rem;
  font-weight: 500;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.3);
  border-left: 6px solid;
  z-index: 1000;
  animation: fadeInUp 0.3s ease;
  pointer-events: none;
  white-space: nowrap;
}
.toast.gesture {
  border-left-color: #4a7cf5;
  background: #1a2a4a;
  color: #ccc;
}
.toast.error {
  border-left-color: #e54040;
  background: #2a1a1a;
  color: #ffaaaa;
}
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
}
/* Responsive */
@media (max-width: 760px) {
  .toast {
    white-space: normal;
    max-width: 90%;
    text-align: center;
    font-size: 0.9rem;
  }
}
</style>