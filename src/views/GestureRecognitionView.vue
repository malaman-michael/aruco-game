<template>
  <div class="gesture-view">
    <div class="gesture-header">
      <button class="back-btn" @click="$router.push('/')">←</button>
      <h1>🖐️ Riconoscimento gesti mano</h1>
    </div>

    <!-- Selettore fotocamera -->
    <div class="camera-selector">
      <label for="cameraSelect">📷 Seleziona fotocamera:</label>
      <select id="cameraSelect" v-model="selectedCameraId" @change="switchCamera">
        <option v-for="cam in cameraList" :key="cam.deviceId" :value="cam.deviceId">
          {{ cam.label || (cam.kind === 'videoinput' ? 'Fotocamera ' + (cameraList.indexOf(cam)+1) : cam.label) }}
        </option>
      </select>
      <button @click="switchCamera" class="btn-refresh">⟳ Aggiorna</button>
    </div>

    <div class="video-container">
      <video ref="video" autoplay muted playsinline class="video"></video>
      <canvas ref="canvas" class="overlay-canvas"></canvas>
    </div>

    <div class="status">
      <div class="camera-status" :class="{ ready: cameraReady }">
        {{ cameraReady ? '✅ Fotocamera attiva' : '⏳ Attivazione fotocamera...' }}
      </div>
    </div>

    <div v-if="toast.visible" class="toast" :class="toast.type">
      {{ toast.message }}
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { GestureRecognizer, FilesetResolver, DrawingUtils } from '@mediapipe/tasks-vision'

const video = ref(null)
const canvas = ref(null)
let canvasCtx = null
let animationId = null
let gestureRecognizer = null
let cameraStream = null

const cameraReady = ref(false)
const cameraList = ref([])
const selectedCameraId = ref('')

const toast = ref({
  visible: false,
  message: '',
  type: 'info',
  timeout: null
})

let lastRecognizedGesture = ''
let lastRecognizedTime = 0

function showToast(message, type = 'gesture') {
  if (toast.value.timeout) clearTimeout(toast.value.timeout)
  toast.value.message = message
  toast.value.type = type
  toast.value.visible = true
  toast.value.timeout = setTimeout(() => {
    toast.value.visible = false
  }, 5000)
}

// Ottiene la lista delle fotocamere disponibili
async function getCameraList() {
  const devices = await navigator.mediaDevices.enumerateDevices()
  cameraList.value = devices.filter(device => device.kind === 'videoinput')
  if (cameraList.value.length > 0 && !selectedCameraId.value) {
    // Preferisce la fotocamera posteriore (environment)
    const backCam = cameraList.value.find(cam => cam.label.toLowerCase().includes('back') || cam.label.toLowerCase().includes('environment'))
    selectedCameraId.value = backCam ? backCam.deviceId : cameraList.value[0].deviceId
  }
}

// Avvia la fotocamera con l'ID selezionato
async function startCamera() {
  if (cameraStream) {
    cameraStream.getTracks().forEach(track => track.stop())
  }
  try {
    const constraints = {
      video: selectedCameraId.value ? { deviceId: { exact: selectedCameraId.value } } : true
    }
    cameraStream = await navigator.mediaDevices.getUserMedia(constraints)
    video.value.srcObject = cameraStream
    await video.value.play()
    cameraReady.value = true

    // Dimensiona il canvas
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
    console.error('Errore avvio fotocamera:', err)
    showToast('Impossibile accedere alla fotocamera selezionata.', 'error')
    cameraReady.value = false
  }
}

async function switchCamera() {
  await startCamera()
}

// Riconoscimento gesti (loop)
async function predictGesture() {
  if (!gestureRecognizer || !video.value || !canvas.value) return

  const now = Date.now()
  const results = gestureRecognizer.recognizeForVideo(video.value, performance.now())

  if (canvasCtx) canvasCtx.clearRect(0, 0, canvas.value.width, canvas.value.height)

  if (results.gestures.length > 0) {
    const gesture = results.gestures[0][0]
    let gestureName = gesture.categoryName
    const score = gesture.score

    // Personalizzazione per il "pointer" (Pointing_Up)
    let displayName = gestureName
    if (gestureName === 'Pointing_Up') displayName = 'Pointer (indice puntato)'

    if (canvasCtx) {
      canvasCtx.font = '18px "Segoe UI", system-ui'
      canvasCtx.fillStyle = '#ffffff'
      canvasCtx.fillText(`Gesto: ${displayName} (${Math.round(score * 100)}%)`, 20, 50)
    }

    // Toast solo se il gesto cambia o è passato abbastanza tempo
    if (gestureName !== lastRecognizedGesture || (now - lastRecognizedTime) > 2000) {
      lastRecognizedGesture = gestureName
      lastRecognizedTime = now
      showToast(`Rilevato: ${displayName}`, 'gesture')
    }
  } else {
    if (canvasCtx) {
      canvasCtx.font = '18px "Segoe UI", system-ui'
      canvasCtx.fillStyle = '#cccccc'
      canvasCtx.fillText('Nessun gesto rilevato', 20, 50)
    }
    lastRecognizedGesture = ''
  }

  // Disegna landmarks (sempre)
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
    // Se il gesto è Pointing_Up, evidenzia il dito indice (landmark 8)
    if (results.gestures.length > 0 && results.gestures[0][0].categoryName === 'Pointing_Up') {
      const landmarks = results.landmarks[0]
      const indexTip = landmarks[8]
      canvasCtx.beginPath()
      canvasCtx.arc(indexTip.x * canvas.value.width, indexTip.y * canvas.value.height, 12, 0, 2 * Math.PI)
      canvasCtx.fillStyle = '#ffaa44'
      canvasCtx.fill()
      canvasCtx.strokeStyle = '#ffdd88'
      canvasCtx.lineWidth = 2
      canvasCtx.stroke()
    }
  }

  requestAnimationFrame(predictGesture)
}

// Inizializza MediaPipe e la fotocamera
async function initMediaPipeAndCamera() {
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
    await getCameraList()
    await startCamera()
    predictGesture()
  } catch (err) {
    console.error('Errore inizializzazione MediaPipe:', err)
    showToast('Errore nel caricamento del modello di gesti.', 'error')
  }
}

onMounted(() => {
  initMediaPipeAndCamera()
  // Aggiorna la lista quando vengono collegati/scollegati dispositivi
  navigator.mediaDevices.addEventListener('devicechange', getCameraList)
})

onUnmounted(() => {
  if (animationId) cancelAnimationFrame(animationId)
  if (gestureRecognizer) gestureRecognizer.close()
  if (cameraStream) {
    cameraStream.getTracks().forEach(track => track.stop())
  }
  navigator.mediaDevices.removeEventListener('devicechange', getCameraList)
})
</script>

<style scoped>
/* ... stili invariati rispetto alla versione precedente ... */
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
  margin-bottom: 1rem;
}
.back-btn {
  background: none;
  border: none;
  color: #7c9ef5;
  font-size: 1.8rem;
  cursor: pointer;
}
h1 {
  margin: 0;
  font-size: 1.6rem;
}
.camera-selector {
  width: 100%;
  max-width: 1000px;
  background: #1a1a2e;
  border-radius: 40px;
  padding: 0.6rem 1rem;
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}
.camera-selector label {
  font-weight: 500;
  color: #aaa;
}
.camera-selector select {
  background: #2a2a4a;
  border: 1px solid #3a3a6a;
  border-radius: 24px;
  padding: 0.4rem 1rem;
  color: #eee;
  font-size: 0.9rem;
  flex: 1;
  min-width: 180px;
}
.btn-refresh {
  background: #2a2a4a;
  border: none;
  border-radius: 30px;
  padding: 0.4rem 1rem;
  color: #ccc;
  cursor: pointer;
}
.video-container {
  position: relative;
  width: 100%;
  max-width: 1000px;
  background: #000;
  border-radius: 24px;
  overflow: hidden;
  aspect-ratio: 16 / 9;
}
.video {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transform: scaleX(-1);
}
.overlay-canvas {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  transform: scaleX(-1);
}
.status {
  margin-top: 1rem;
  background: #1a1a2e;
  padding: 0.4rem 1.2rem;
  border-radius: 40px;
}
.camera-status.ready {
  color: #7fff7f;
}
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
  white-space: nowrap;
}
.toast.gesture {
  border-left-color: #4a7cf5;
  background: #1a2a4a;
}
.toast.error {
  border-left-color: #e54040;
  background: #2a1a1a;
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
@media (max-width: 760px) {
  .toast {
    white-space: normal;
    max-width: 90%;
    text-align: center;
  }
}
</style>