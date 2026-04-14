<template>
  <div class="camera-wrapper">
    <canvas ref="canvasEl" class="camera-canvas" />
    <div v-if="cameraError" class="camera-error"><span>⚠️ {{ cameraError }}</span></div>
    <div v-else-if="!cameraReady" class="camera-placeholder"><span>📷 Avvio fotocamera...</span></div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { createArucoService } from '../services/arucoService.js'
import { useMarkersStore, MARKER_CATEGORIES } from '../stores/markersStore.js'
import { useGameStore } from '../stores/gameStore.js'
import { useCameraStore } from '../stores/cameraStore.js'
import { buildHomographyFromCorners, pointToCell, computeHomography, applyHomography } from '../services/homographyService.js'

const props = defineProps({
  active: { type: Boolean, default: true },
})
const emit = defineEmits(['unknown-marker', 'frame-processed'])

const canvasEl    = ref(null)
const cameraReady = ref(false)
const cameraError = ref('')

const markersStore = useMarkersStore()
const gameStore    = useGameStore()
const cam          = useCameraStore()

const video = document.createElement('video')
video.autoplay   = true
video.playsInline = true
video.muted      = true

// Canvas offscreen per preprocessing
const offscreen = document.createElement('canvas')
let offCtx = null

let arucoService = null
let rafId = null
let stream = null
let ctx = null

// Ultima omografia valida (smooth — non resettata se i corner escono per un frame)
let lastH = null
let lastHTimestamp = 0
const H_TIMEOUT_MS = 2000 // mantieni l'ultima H per 2 secondi

onMounted(async () => {
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: false,
    })
    video.srcObject = stream
    await video.play()
    cameraReady.value = true
    ctx = canvasEl.value.getContext('2d', { willReadFrequently: true })
    offCtx = offscreen.getContext('2d', { willReadFrequently: true })

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
      ? 'Permesso fotocamera negato.' : `Errore: ${err.message}`
  }
})

onUnmounted(() => { stopLoop(); stream?.getTracks().forEach(t => t.stop()) })
watch(() => props.active, val => val ? startLoop() : stopLoop())

function startLoop() { if (!rafId) loop() }
function stopLoop()  { cancelAnimationFrame(rafId); rafId = null }
function loop() {
  rafId = requestAnimationFrame(() => {
    if (props.active && arucoService && cameraReady.value) processFrame()
    loop()
  })
}

// ─── Frame processing ──────────────────────────────────────────────────────
function processFrame() {
  const w = video.videoWidth
  const h = video.videoHeight
  if (!w || !h) return

  const canvas = canvasEl.value
  if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h }
  if (offscreen.width !== w || offscreen.height !== h) { offscreen.width = w; offscreen.height = h }

  // 1. Preprocessa il frame nel canvas offscreen
  const preprocessed = preprocessFrame(w, h)

  // 2. Rileva marker sull'immagine preprocessata
  let markers = []
  try { markers = arucoService.detect(preprocessed ? offscreen : video) }
  catch(e) { console.warn('[ArUco]', e.message) }

  // 3. Calcola omografia
  const H = computeH(markers)

  // 4. Disegna: prima il video originale (non preprocessato) sul canvas visibile
  ctx.filter = buildCSSFilter()
  ctx.drawImage(video, 0, 0, w, h)
  ctx.filter = 'none'

  // 5. Overlay: griglia + marker
  if (H && cam.showGrid) drawGrid(ctx, H, w, h)
  drawMarkers(ctx, markers, H, w)

  // 6. Aggiorna store
  handleGameLogic(markers, H)
}

// ─── Preprocessing (miglioramento per detection) ──────────────────────────
function preprocessFrame(w, h) {
  const needsProcessing = cam.brightness !== 100 || cam.contrast !== 100
    || cam.saturation !== 100 || cam.grayscale || cam.threshold > 0
    || cam.sharpness > 0
  if (!needsProcessing) return false

  // Disegna con filtri CSS nel canvas offscreen
  offCtx.filter = buildCSSFilter()
  offCtx.drawImage(video, 0, 0, w, h)
  offCtx.filter = 'none'

  // Sharpness: unsharp mask semplice
  if (cam.sharpness > 0) {
    applySharpness(offCtx, w, h, cam.sharpness)
  }

  // Threshold adattivo (binarizzazione)
  if (cam.threshold > 0) {
    applyThreshold(offCtx, w, h, cam.threshold)
  }

  return true
}

function buildCSSFilter() {
  const b = cam.brightness
  const c = cam.contrast
  const s = cam.grayscale ? 0 : cam.saturation
  return `brightness(${b}%) contrast(${c}%) saturate(${s}%)`
}

function applySharpness(ctx, w, h, amount) {
  const imgData = ctx.getImageData(0, 0, w, h)
  const d = imgData.data
  const tmp = new Uint8ClampedArray(d)
  const kernel = [-1, -1, -1, -1, 8 + amount * 2, -1, -1, -1, -1]
  const factor = 1 / (amount * 2)

  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = (y * w + x) * 4
      for (let c = 0; c < 3; c++) {
        let sum = 0
        for (let ky = -1; ky <= 1; ky++)
          for (let kx = -1; kx <= 1; kx++)
            sum += tmp[((y+ky)*w+(x+kx))*4+c] * kernel[(ky+1)*3+(kx+1)]
        d[i+c] = Math.max(0, Math.min(255, tmp[i+c] + sum * factor))
      }
    }
  }
  ctx.putImageData(imgData, 0, 0)
}

function applyThreshold(ctx, w, h, thresh) {
  const imgData = ctx.getImageData(0, 0, w, h)
  const d = imgData.data
  for (let i = 0; i < d.length; i += 4) {
    const gray = 0.299 * d[i] + 0.587 * d[i+1] + 0.114 * d[i+2]
    const val = gray > thresh ? 255 : 0
    d[i] = d[i+1] = d[i+2] = val
  }
  ctx.putImageData(imgData, 0, 0)
}

// ─── Omografia ─────────────────────────────────────────────────────────────
function computeH(markers) {
  const detectedCorners = {}
  for (const m of markers) {
    const data = markersStore.getMarker(m.id)
    if (data?.category === MARKER_CATEGORIES.CORNER) detectedCorners[data.role] = { ...m, ...data }
  }

  if (markersStore.allCornersAssigned) {
    const H = buildHomographyFromCorners(detectedCorners, gameStore.gridCols, gameStore.gridRows)
    if (H) { lastH = H; lastHTimestamp = Date.now() }
  }

  // Mantieni l'ultima H valida per H_TIMEOUT_MS
  if (lastH && Date.now() - lastHTimestamp < H_TIMEOUT_MS) return lastH
  return null
}

// ─── Disegno griglia proiettata ────────────────────────────────────────────
function drawGrid(ctx, H, w, h) {
  const cols = gameStore.gridCols
  const rows = gameStore.gridRows
  const invH = invert3x3(H)
  const opacity = cam.gridOpacity

  ctx.save()
  ctx.strokeStyle = `rgba(100, 200, 255, ${opacity})`
  ctx.lineWidth = 1

  // Linee verticali
  for (let c = 0; c <= cols; c++) {
    const p1 = gridToPixel(invH, c, 0)
    const p2 = gridToPixel(invH, c, rows)
    ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.stroke()
  }
  // Linee orizzontali
  for (let r = 0; r <= rows; r++) {
    const p1 = gridToPixel(invH, 0, r)
    const p2 = gridToPixel(invH, cols, r)
    ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.stroke()
  }

  // Evidenzia celle occupate
  for (const piece of gameStore.pieces) {
    if (piece.col === null) continue
    const tl = gridToPixel(invH, piece.col,     piece.row)
    const tr = gridToPixel(invH, piece.col + 1, piece.row)
    const br = gridToPixel(invH, piece.col + 1, piece.row + 1)
    const bl = gridToPixel(invH, piece.col,     piece.row + 1)
    const color = piece.category === MARKER_CATEGORIES.PLAYER   ? `rgba(68,136,255,${opacity})`
                : piece.category === MARKER_CATEGORIES.ENEMY    ? `rgba(255,68,68,${opacity})`
                : `rgba(255,170,0,${opacity})`
    ctx.beginPath()
    ctx.moveTo(tl.x, tl.y); ctx.lineTo(tr.x, tr.y)
    ctx.lineTo(br.x, br.y); ctx.lineTo(bl.x, bl.y)
    ctx.closePath()
    ctx.fillStyle = color
    ctx.fill()
    // Etichetta cella (col, row)
    const cx = (tl.x + tr.x + br.x + bl.x) / 4
    const cy = (tl.y + tr.y + br.y + bl.y) / 4
    ctx.font = 'bold 11px monospace'
    ctx.textAlign = 'center'
    ctx.fillStyle = 'rgba(255,255,255,0.9)'
    ctx.fillText(`${piece.col},${piece.row}`, cx, cy + 4)
  }

  // Label angoli NO/NE/SO/SE
  const corners = { NO: [0,0], NE: [cols,0], SO: [0,rows], SE: [cols,rows] }
  for (const [label, [gc, gr]] of Object.entries(corners)) {
    if (!markersStore.corners[label]) continue
    const p = gridToPixel(invH, gc, gr)
    ctx.font = 'bold 14px monospace'
    ctx.textAlign = 'center'
    ctx.strokeStyle = 'rgba(0,0,0,0.8)'; ctx.lineWidth = 4
    ctx.strokeText(label, p.x, p.y - 10)
    ctx.fillStyle = '#ffd700'
    ctx.fillText(label, p.x, p.y - 10)
  }

  ctx.restore()
}

function gridToPixel(invH, col, row) {
  const wx = invH[0]*col + invH[1]*row + invH[2]
  const wy = invH[3]*col + invH[4]*row + invH[5]
  const ww = invH[6]*col + invH[7]*row + invH[8]
  return { x: wx/ww, y: wy/ww }
}

function invert3x3(m) {
  const [a,b,c,d,e,f,g,h,i] = m
  const det = a*(e*i-f*h) - b*(d*i-f*g) + c*(d*h-e*g)
  if (Math.abs(det) < 1e-10) return m
  return [
    (e*i-f*h)/det, (c*h-b*i)/det, (b*f-c*e)/det,
    (f*g-d*i)/det, (a*i-c*g)/det, (c*d-a*f)/det,
    (d*h-e*g)/det, (b*g-a*h)/det, (a*e-b*d)/det,
  ]
}

// ─── Disegno marker ────────────────────────────────────────────────────────
function drawMarkers(ctx, markers, H, videoW) {
  if (!cam.showIds && !cam.showCubes) return
  const fontSize = Math.max(16, videoW * 0.025)

  markers.forEach(({ id, corners, center }) => {
    const known    = markersStore.getMarker(id)
    const isCorner = known?.category === MARKER_CATEGORIES.CORNER
    const color    = isCorner                                         ? '#ffd700'
                   : !known                                           ? '#ff4444'
                   : known.category === MARKER_CATEGORIES.PLAYER     ? '#4488ff'
                   : known.category === MARKER_CATEGORIES.ENEMY      ? '#ff4444'
                   : known.category === MARKER_CATEGORIES.FURNITURE  ? '#ffaa00'
                   :                                                    '#00ff88'

    // Contorno quadrato
    ctx.beginPath()
    ctx.moveTo(corners[0].x, corners[0].y)
    corners.forEach(p => ctx.lineTo(p.x, p.y))
    ctx.closePath()
    ctx.strokeStyle = color; ctx.lineWidth = 3; ctx.stroke()

    // Effetto cubo (faccia superiore)
    if (cam.showCubes) {
      const lift = Math.max(18, videoW * 0.022)
      // Faccia top semitrasparente
      ctx.beginPath()
      ctx.moveTo(corners[0].x, corners[0].y - lift)
      ctx.lineTo(corners[1].x, corners[1].y - lift)
      ctx.lineTo(corners[1].x, corners[1].y)
      ctx.lineTo(corners[0].x, corners[0].y)
      ctx.closePath()
      ctx.fillStyle = color + '33'; ctx.fill()
      ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.stroke()
      // Pilastri verticali
      ctx.beginPath()
      ctx.moveTo(corners[0].x, corners[0].y)
      ctx.lineTo(corners[0].x, corners[0].y - lift)
      ctx.moveTo(corners[1].x, corners[1].y)
      ctx.lineTo(corners[1].x, corners[1].y - lift)
      ctx.stroke()

      // Linea top del cubo
      ctx.beginPath()
      ctx.moveTo(corners[0].x, corners[0].y - lift)
      ctx.lineTo(corners[1].x, corners[1].y - lift)
      ctx.strokeStyle = color; ctx.lineWidth = 3; ctx.stroke()
    }

    // Pallino TL (orientamento)
    ctx.beginPath()
    ctx.arc(corners[0].x, corners[0].y, 6, 0, Math.PI * 2)
    ctx.fillStyle = '#ffff00'; ctx.fill()

    // Label ID + emoji + posizione griglia
    if (cam.showIds) {
      const lift   = cam.showCubes ? Math.max(18, videoW * 0.022) : 0
      const textY  = Math.min(...corners.map(c=>c.y)) - lift - 8
      const known  = markersStore.getMarker(id)
      let label    = `#${id}`
      if (known?.emoji) label += ` ${known.emoji}`

      // Posizione griglia se disponibile
      const piece = gameStore.pieces.find(p => p.id === id)
      if (piece?.col !== null && piece?.col !== undefined)
        label += `  (${piece.col},${piece.row})`

      ctx.font = `bold ${fontSize}px monospace`
      ctx.textAlign = 'center'
      ctx.lineWidth = 5
      ctx.strokeStyle = 'rgba(0,0,0,0.85)'
      ctx.strokeText(label, center.x, textY)
      ctx.fillStyle = color
      ctx.fillText(label, center.x, textY)
      ctx.textAlign = 'left'
    }
  })
}

// ─── Logica di gioco ───────────────────────────────────────────────────────
function handleGameLogic(markers, H) {
  for (const m of markers) {
    if (!markersStore.isKnown(m.id)) { emit('unknown-marker', m); break }
  }

  const detectedCorners = {}
  for (const m of markers) {
    const data = markersStore.getMarker(m.id)
    if (data?.category === MARKER_CATEGORIES.CORNER) detectedCorners[data.role] = { ...m, ...data }
  }

  const pieces = []
  for (const m of markers) {
    const data = markersStore.getMarker(m.id)
    if (!data || data.category === MARKER_CATEGORIES.CORNER) continue
    let col = null, row = null
    if (H) {
      const cell = pointToCell(H, m.center, gameStore.gridCols, gameStore.gridRows)
      col = cell.col; row = cell.row
    }
    pieces.push({ id: m.id, ...data, col, row, angle: m.angle, center: m.center, corners: m.corners })
  }

  gameStore.updatePieces(pieces)
  emit('frame-processed', { markers, pieces, homography: H, videoW: video.videoWidth, videoH: video.videoHeight })
}
</script>

<style scoped>
.camera-wrapper {
  position: relative; width: 100%; height: 100%;
  background: #000; overflow: hidden;
}
.camera-canvas {
  width: 100%; height: 100%; object-fit: cover; display: block;
}
.camera-error {
  position: absolute; inset: 0; display: flex; align-items: center;
  justify-content: center; color: #ff6b6b; font-size: 1rem;
  background: rgba(0,0,0,0.85); padding: 1.5rem; text-align: center;
}
.camera-placeholder {
  position: absolute; inset: 0; display: flex; align-items: center;
  justify-content: center; color: #fff; font-size: 1.2rem;
  background: rgba(0,0,0,0.6);
}
</style>