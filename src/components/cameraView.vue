<template>
  <div class="camera-wrapper">
    <!-- Un solo canvas: mostra il feed camera e i marker sovrapposti -->
    <canvas ref="canvasEl" class="camera-canvas" />

    <div v-if="cameraError" class="camera-error">
      <span>⚠️ {{ cameraError }}</span>
    </div>
    <div v-else-if="!cameraReady" class="camera-placeholder">
      <span>📷 Avvio fotocamera...</span>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { createArucoService } from '../services/arucoService.js'
import { useMarkersStore, MARKER_CATEGORIES } from '../stores/markersStore.js'
import { useGameStore } from '../stores/gameStore.js'
import { buildHomographyFromCorners, pointToCell } from '../services/homographyService.js'

const props = defineProps({
  showDebug: { type: Boolean, default: true },
  active:    { type: Boolean, default: true },
})

const emit = defineEmits(['unknown-marker', 'frame-processed'])

const canvasEl    = ref(null)
const cameraReady = ref(false)
const cameraError = ref('')

const markersStore = useMarkersStore()
const gameStore    = useGameStore()

// video element nascosto — usato solo come sorgente per il canvas
const video = document.createElement('video')
video.autoplay  = true
video.playsInline = true
video.muted     = true

let arucoService = null
let rafId        = null
let stream       = null
let ctx          = null

// ─── Setup ───────────────────────────────────────────────────────────────────
onMounted(async () => {
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: false,
    })
    video.srcObject = stream
    await video.play()
    cameraReady.value = true

    ctx = canvasEl.value.getContext('2d')

    try {
      arucoService = createArucoService()
      console.log('[CameraView] ArUco detector pronto')
    } catch (e) {
      cameraError.value = `Errore ArUco: ${e.message}`
      return
    }

    startLoop()
  } catch (err) {
    cameraError.value = err.name === 'NotAllowedError'
      ? 'Permesso fotocamera negato.'
      : `Errore fotocamera: ${err.message}`
  }
})

onUnmounted(() => {
  stopLoop()
  stream?.getTracks().forEach(t => t.stop())
})

watch(() => props.active, val => val ? startLoop() : stopLoop())

// ─── Loop ────────────────────────────────────────────────────────────────────
function startLoop() { if (!rafId) loop() }
function stopLoop()  { cancelAnimationFrame(rafId); rafId = null }

function loop() {
  rafId = requestAnimationFrame(() => {
    if (props.active && arucoService && cameraReady.value) processFrame()
    loop()
  })
}

// ─── Frame processing ─────────────────────────────────────────────────────────
function processFrame() {
  const w = video.videoWidth
  const h = video.videoHeight
  if (!w || !h) return

  const canvas = canvasEl.value
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width  = w
    canvas.height = h
  }

  // 1. Disegna il frame video sul canvas
  ctx.drawImage(video, 0, 0, w, h)

  // 2. Rileva marker (senza passare il canvas — lo disegniamo noi)
  let markers = []
  try {
    markers = arucoService.detect(video)
  } catch(e) {
    console.warn('[ArUco]', e.message)
  }

  // 3. Disegna overlay marker sul canvas
  drawMarkers(ctx, markers, w)

  // 4. Logica di gioco
  handleGameLogic(markers)
}

// ─── Disegno marker ───────────────────────────────────────────────────────────
function drawMarkers(ctx, markers, videoW) {
  const fontSize = Math.max(16, videoW * 0.03)

  markers.forEach(({ id, corners, center }) => {
    const known    = markersStore.getMarker(id)
    const isCorner = known?.category === MARKER_CATEGORIES.CORNER
    const isNew    = !known

    // Colore bordo per tipo
    const color = isCorner ? '#ffd700'
                : isNew    ? '#ff4444'
                : known?.category === MARKER_CATEGORIES.PLAYER   ? '#4488ff'
                : known?.category === MARKER_CATEGORIES.ENEMY    ? '#ff4444'
                : known?.category === MARKER_CATEGORIES.FURNITURE ? '#ffaa00'
                : '#00ff88'

    // ── Contorno del marker (quadrato) ────────────────────────────────────
    ctx.beginPath()
    ctx.moveTo(corners[0].x, corners[0].y)
    corners.forEach(p => ctx.lineTo(p.x, p.y))
    ctx.closePath()
    ctx.strokeStyle = color
    ctx.lineWidth   = 4
    ctx.stroke()

    // ── Effetto "cubo" — lato superiore del marker sollevato ──────────────
    const lift = Math.max(20, videoW * 0.025) // altezza del cubo in pixel
    // Faccia superiore del cubo (colore più chiaro)
    ctx.beginPath()
    ctx.moveTo(corners[0].x,         corners[0].y)
    ctx.lineTo(corners[1].x,         corners[1].y)
    ctx.lineTo(corners[1].x,         corners[1].y - lift)
    ctx.lineTo(corners[0].x,         corners[0].y - lift)
    ctx.closePath()
    ctx.fillStyle   = color + '33'   // 20% opacità
    ctx.fill()
    ctx.strokeStyle = color
    ctx.lineWidth   = 2
    ctx.stroke()

    // Linee verticali agli angoli TL e TR (pilastri del cubo)
    ctx.beginPath()
    ctx.moveTo(corners[0].x, corners[0].y)
    ctx.lineTo(corners[0].x, corners[0].y - lift)
    ctx.moveTo(corners[1].x, corners[1].y)
    ctx.lineTo(corners[1].x, corners[1].y - lift)
    ctx.strokeStyle = color
    ctx.lineWidth   = 2
    ctx.stroke()

    // ── Corner TL evidenziato (indica orientamento) ───────────────────────
    ctx.beginPath()
    ctx.arc(corners[0].x, corners[0].y, 6, 0, Math.PI * 2)
    ctx.fillStyle = '#ffff00'
    ctx.fill()

    // ── ID del marker ─────────────────────────────────────────────────────
    const label = known ? `#${id} ${known.emoji ?? ''}` : `#${id} ?`
    const textX = center.x
    const textY = center.y - lift - 6

    ctx.font      = `bold ${fontSize}px monospace`
    ctx.textAlign = 'center'

    // Outline nero per leggibilità
    ctx.lineWidth   = 5
    ctx.strokeStyle = 'rgba(0,0,0,0.85)'
    ctx.strokeText(label, textX, textY)

    ctx.fillStyle = color
    ctx.fillText(label, textX, textY)

    ctx.textAlign = 'left' // reset
  })
}

// ─── Logica di gioco ──────────────────────────────────────────────────────────
function handleGameLogic(markers) {
  // Marker sconosciuti → chiedi configurazione
  for (const m of markers) {
    if (!markersStore.isKnown(m.id)) {
      emit('unknown-marker', m)
      break
    }
  }

  // Omografia se i 4 corner sono visibili e configurati
  const detectedCorners = {}
  for (const m of markers) {
    const data = markersStore.getMarker(m.id)
    if (data?.category === MARKER_CATEGORIES.CORNER) {
      detectedCorners[data.role] = { ...m, ...data }
    }
  }

  let homography = null
  if (markersStore.allCornersAssigned) {
    homography = buildHomographyFromCorners(
      detectedCorners, gameStore.gridCols, gameStore.gridRows
    )
  }

  // Pedine con coordinate griglia
  const pieces = []
  for (const m of markers) {
    const data = markersStore.getMarker(m.id)
    if (!data || data.category === MARKER_CATEGORIES.CORNER) continue
    let col = null, row = null
    if (homography) {
      const cell = pointToCell(homography, m.center, gameStore.gridCols, gameStore.gridRows)
      col = cell.col; row = cell.row
    }
    pieces.push({ id: m.id, ...data, col, row, angle: m.angle, center: m.center, corners: m.corners })
  }

  gameStore.updatePieces(pieces)
  emit('frame-processed', {
    markers,
    pieces,
    homography,
    videoW: video.videoWidth,
    videoH: video.videoHeight,
  })
}
</script>

<style scoped>
.camera-wrapper {
  position: relative;
  width: 100%;
  height: 100%;
  background: #000;
  overflow: hidden;
}

/* Il canvas occupa tutto lo spazio disponibile mantenendo le proporzioni */
.camera-canvas {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.camera-error {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ff6b6b;
  font-size: 1rem;
  background: rgba(0,0,0,0.85);
  padding: 1.5rem;
  text-align: center;
}

.camera-placeholder {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 1.2rem;
  background: rgba(0,0,0,0.6);
}
</style>