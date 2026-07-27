<!-- src/components/CameraView.vue -->
<template>
  <div class="camera-wrapper">
    <canvas ref="canvasEl" class="camera-canvas" />
    <div v-if="cameraError" class="camera-error"><span>⚠️ {{ cameraError }}</span></div>
    <div v-else-if="!cameraReady" class="camera-placeholder"><span>📷 Avvio fotocamera...</span></div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { createArucoService, approximateCardinalAngle } from '../services/arucoService.js'
import { useMarkersStore, MARKER_CATEGORIES } from '../stores/markersStore.js'
import { useGameStore } from '../stores/gameStore.js'
import { useCameraStore } from '../stores/cameraStore.js'
import { useMapStore } from '../stores/mapStore.js'
import { buildHomographyFromCorners, pointToCell } from '../services/homographyService.js'
import { voice } from '../services/voiceService.js'

const props = defineProps({
  active: { type: Boolean, default: true },
})

const emit = defineEmits(['unknown-marker', 'frame-processed', 'homography-updated'])

const canvasEl = ref(null)
const cameraReady = ref(false)
const cameraError = ref('')
const markersStore = useMarkersStore()
const gameStore = useGameStore()
const mapStore = useMapStore()
const cam = useCameraStore()

const video = document.createElement('video')
video.autoplay = true
video.playsInline = true
video.muted = true

const offscreen = document.createElement('canvas')
let offCtx = null
let arucoService = null
let rafId = null
let stream = null
let ctx = null
let frameCounter = 0
let restartPending = false

// IDs delle fotocamere
let mainCameraId = null
let wideCameraId = null
let currentCameraId = null

// ---- Selettore fotocamera in base allo zoom ----
function getCameraIdForZoom(zoom) {
  if (zoom < 1 && wideCameraId) return wideCameraId
  return mainCameraId || wideCameraId || null
}

async function enumerateCameras() {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices()
    const videoDevices = devices.filter(d => d.kind === 'videoinput')
    if (videoDevices.length === 0) return

    // Separa le fotocamere posteriori da quelle anteriori basandosi sull'etichetta
    const rearCams = videoDevices.filter(d => {
      const label = d.label.toLowerCase()
      // Escludiamo esplicitamente quelle con 'front' o 'selfie'
      if (label.includes('front') || label.includes('selfie') || label.includes('facetime')) return false
      // Consideriamo posteriori quelle con 'back', 'rear', 'main', oppure se non hanno 'front'
      return label.includes('back') || label.includes('rear') || label.includes('main') || true
    })

    // Se non abbiamo trovato camere posteriori, usiamo tutte (per sicurezza)
    const candidates = rearCams.length ? rearCams : videoDevices

    // Tra le posteriori, cerchiamo una grandangolare (wide, ultra, 0.5)
    const wide = candidates.find(d => {
      const label = d.label.toLowerCase()
      return label.includes('wide') || label.includes('ultra') || label.includes('0.5')
    })

    // La principale è la prima camera posteriore che non è la grandangolare,
    // oppure la prima se non c'è grandangolare
    const main = candidates.find(d => d.deviceId !== wide?.deviceId) || candidates[0]

    mainCameraId = main.deviceId
    wideCameraId = wide?.deviceId || null

    // Se non c'è una grandangolare, usiamo la principale per entrambi i casi
    if (!wideCameraId) {
      wideCameraId = mainCameraId
    }

    console.log('[CameraView] Camera principale:', main.label || main.deviceId)
    console.log('[CameraView] Camera grandangolare:', wide?.label || 'non trovata')
  } catch (e) {
    console.warn('[CameraView] Impossibile enumerare le fotocamere:', e)
  }
}

async function startCamera(cameraId = null) {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    cameraError.value = 'Il browser non supporta la fotocamera o la connessione non è sicura (usa HTTPS).'
    cameraReady.value = false
    return
  }
  if (stream) {
    stream.getTracks().forEach(track => track.stop())
  }

  const targetId = cameraId || getCameraIdForZoom(cam.digitalZoom)
  let [width, height] = cam.videoResolution.split('x').map(Number)
  if (!width || !height) { width = 1280; height = 720 }

  const constraints = {
    video: {
      facingMode: 'environment',
      width: { ideal: width },
      height: { ideal: height }
    },
    audio: false,
  }

  // Se abbiamo un ID specifico, lo usiamo
  if (targetId) {
    constraints.video.deviceId = { exact: targetId }
  }

  try {
    stream = await navigator.mediaDevices.getUserMedia(constraints)
    video.srcObject = stream
    await video.play()
    cameraReady.value = true
    cameraError.value = ''
    currentCameraId = targetId
    if (restartPending) {
      restartPending = false
      startLoop()
    }
  } catch (err) {
    cameraError.value = err.name === 'NotAllowedError'
      ? 'Permesso fotocamera negato.'
      : `Errore: ${err.message}`
    cameraReady.value = false
  }
}

// ---- Watcher per cambiare fotocamera in base allo zoom ----
watch(() => cam.digitalZoom, async (newZoom, oldZoom) => {
  // Cambio solo se si supera la soglia 1.0
  const wasWide = oldZoom < 1
  const isWide = newZoom < 1
  if (wasWide === isWide) return // non c'è cambio di modalità

  const newCameraId = getCameraIdForZoom(newZoom)
  if (newCameraId && newCameraId !== currentCameraId) {
    if (stream) {
      stopLoop()
      restartPending = true
      await startCamera(newCameraId)
      if (props.active) startLoop()
    }
  }
})

// ---- Ciclo di vita ----
onMounted(async () => {
  await enumerateCameras()
  await startCamera()

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
})

onUnmounted(() => {
  stopLoop()
  stream?.getTracks().forEach(t => t.stop())
})

watch(() => props.active, val => val ? startLoop() : stopLoop())

function startLoop() {
  if (!rafId) loop()
}

function stopLoop() {
  cancelAnimationFrame(rafId)
  rafId = null
}

function loop() {
  rafId = requestAnimationFrame(() => {
    if (props.active && arucoService && cameraReady.value) {
      frameCounter++
      if (frameCounter % cam.frameSkip === 0) {
        processFrame()
      }
    }
    loop()
  })
}

// ---- Ascolta eventi di cambio risoluzione ----
onMounted(() => {
  window.addEventListener('camera-settings-changed', () => {
    if (stream) {
      stopLoop()
      restartPending = true
      startCamera(currentCameraId).then(() => {
        if (props.active) startLoop()
      })
    }
  })
})

function processFrame() {
  const w = video.videoWidth
  const h = video.videoHeight
  if (!w || !h) return

  const canvas = canvasEl.value
  const rect = canvas.getBoundingClientRect()
  const displayWidth = rect.width || canvas.clientWidth || window.innerWidth
  const displayHeight = rect.height || canvas.clientHeight || window.innerHeight

  if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
    canvas.width = displayWidth
    canvas.height = displayHeight
  }

  if (offscreen.width !== w || offscreen.height !== h) {
    offscreen.width = w
    offscreen.height = h
  }

  const preprocessed = preprocessFrame(w, h)

  let markers = []
  try {
    markers = arucoService.detect(preprocessed ? offscreen : video)
  } catch(e) {
    console.warn('[ArUco]', e.message)
  }

  const H = computeH(markers)

  const ratioW = displayWidth / w
  const ratioH = displayHeight / h
  const minScale = Math.max(ratioW, ratioH)
  const effectiveZoom = Math.max(1, cam.digitalZoom)
  const zoom = minScale * effectiveZoom

  const sw = w * zoom
  const sh = h * zoom
  const offsetX = (displayWidth - sw) / 2
  const offsetY = (displayHeight - sh) / 2

  ctx.filter = buildCSSFilter()
  ctx.drawImage(video, offsetX, offsetY, sw, sh)
  ctx.filter = 'none'

  ctx.save()
  ctx.setTransform(zoom, 0, 0, zoom, offsetX, offsetY)
  if (H && cam.showGrid) drawGrid(ctx, H, w, h)
  drawMarkers(ctx, markers, H, w)
  ctx.restore()

  handleGameLogic(markers, H)
}

function preprocessFrame(w, h) {
  const needsProcessing = cam.brightness !== 100 || cam.contrast !== 100 || cam.saturation !== 100 ||
    cam.grayscale || cam.threshold > 0 || cam.sharpness > 0
  if (!needsProcessing) return false

  offCtx.filter = buildCSSFilter()
  offCtx.drawImage(video, 0, 0, w, h)
  offCtx.filter = 'none'

  if (cam.sharpness > 0) {
    applySharpness(offCtx, w, h, cam.sharpness)
  }
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

// --- Ancore / omografia ------------------------------------------------------
let cachedMapId = null
let cachedCellByMarkerId = {}

function getCellByMarkerIdForCurrentMap() {
  const currentMap = mapStore.currentMap
  if (!currentMap) {
    cachedMapId = null
    cachedCellByMarkerId = {}
    return cachedCellByMarkerId
  }
  if (cachedMapId === currentMap.id) {
    return cachedCellByMarkerId
  }
  const map = {}
  for (let row = 0; row < currentMap.rows; row++) {
    for (let col = 0; col < currentMap.cols; col++) {
      const cell = currentMap.grid[row][col]
      if (cell.markerId !== undefined && cell.markerId !== null) {
        map[cell.markerId] = { col, row }
      }
    }
  }
  cachedMapId = currentMap.id
  cachedCellByMarkerId = map
  return cachedCellByMarkerId
}

function computeH(markers) {
  const currentMap = mapStore.currentMap
  if (currentMap) {
    const cellByMarkerId = getCellByMarkerIdForCurrentMap()
    const visible = []
    for (const m of markers) {
      if (cellByMarkerId[m.id]) {
        visible.push({ id: m.id, center: m.center })
      }
    }
    gameStore.setVisibleAnchors(visible)
    emit('homography-updated', gameStore.homography)
  }
  return gameStore.homography
}

function drawGrid(ctx, H, w, h) {
  const cols = gameStore.gridCols
  const rows = gameStore.gridRows
  const invH = invert3x3(H)
  const opacity = cam.gridOpacity
  ctx.save()
  ctx.strokeStyle = `rgba(100, 200, 255, ${opacity})`
  ctx.lineWidth = 1
  for (let c = 0; c <= cols; c++) {
    const p1 = gridToPixel(invH, c, 0)
    const p2 = gridToPixel(invH, c, rows)
    ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.stroke()
  }
  for (let r = 0; r <= rows; r++) {
    const p1 = gridToPixel(invH, 0, r)
    const p2 = gridToPixel(invH, cols, r)
    ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.stroke()
  }
  for (const piece of gameStore.pieces) {
    if (piece.col === null) continue
    const tl = gridToPixel(invH, piece.col, piece.row)
    const tr = gridToPixel(invH, piece.col + 1, piece.row)
    const br = gridToPixel(invH, piece.col + 1, piece.row + 1)
    const bl = gridToPixel(invH, piece.col, piece.row + 1)
    const color = piece.category === 'player' ? `rgba(68,136,255,${opacity})` :
                  piece.category === 'enemy' ? `rgba(255,68,68,${opacity})` :
                  `rgba(255,170,0,${opacity})`
    ctx.beginPath()
    ctx.moveTo(tl.x, tl.y); ctx.lineTo(tr.x, tr.y)
    ctx.lineTo(br.x, br.y); ctx.lineTo(bl.x, bl.y)
    ctx.closePath()
    ctx.fillStyle = color
    ctx.fill()
    const cx = (tl.x + tr.x + br.x + bl.x) / 4
    const cy = (tl.y + tr.y + br.y + bl.y) / 4
    ctx.font = 'bold 11px monospace'
    ctx.textAlign = 'center'
    ctx.fillStyle = 'rgba(255,255,255,0.9)'
    const rotText = piece.rotationSymbol ? `, ${piece.rotationSymbol}` : ''
    ctx.fillText(`${piece.col},${piece.row}${rotText}`, cx, cy + 4)
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

// =============== FUNZIONE MODIFICATA (senza cubi) ===============
function drawMarkers(ctx, markers, H, videoW) {
  // Se non vogliamo mostrare nemmeno gli ID, possiamo uscire prima
  // Ma teniamo il bordo anche se showIds è false? Per sicurezza mostriamo sempre bordo e puntino.
  // La label viene mostrata solo se showIds è true.
  const fontSize = Math.max(20, videoW * 0.250)
  markers.forEach(({ id, corners, center, angle }) => {
    const known = markersStore.getMarker(id)
    const color = !known ? '#ff4444' :
                  known.category === 'player' ? '#4488ff' :
                  known.category === 'enemy' ? '#ff4444' : '#00ff88'

    // --- Bordo del marker (quadrato) ---
    ctx.beginPath()
    ctx.moveTo(corners[0].x, corners[0].y)
    corners.forEach(p => ctx.lineTo(p.x, p.y))
    ctx.closePath()
    ctx.strokeStyle = color
    ctx.lineWidth = 3
    ctx.stroke()

    // --- Puntino giallo nell'angolo in alto a sinistra ---
    ctx.beginPath()
    ctx.arc(corners[0].x, corners[0].y, 6, 0, Math.PI * 2)
    ctx.fillStyle = '#ffff00'
    ctx.fill()

    // --- Etichetta con ID, emoji e posizione (solo se showIds è attivo) ---
    if (cam.showIds) {
      // Calcola la coordinata Y in alto (sopra il bordo superiore)
      const topY = Math.min(...corners.map(c => c.y))
      const textY = topY - 8 // piccolo margine

      let label = `#${id}`
      if (known?.emoji) label += ` ${known.emoji}`

      // Aggiungi posizione griglia se disponibile
      const piece = gameStore.pieces.find(p => p.id === id)
      if (piece?.col !== null && piece?.col !== undefined) {
        const rot = piece.rotationSymbol ? ` ${piece.rotationSymbol}` : ''
        label += ` (${piece.col},${piece.row}${rot})`
      }

      ctx.font = `bold ${fontSize}px monospace`
      ctx.textAlign = 'center'
      // Sfondo nero per migliorare la leggibilità
      ctx.lineWidth = 5
      ctx.strokeStyle = 'rgba(0,0,0,0.85)'
      ctx.strokeText(label, center.x, textY)
      ctx.fillStyle = color
      ctx.fillText(label, center.x, textY)
      ctx.textAlign = 'left'
    }
  })
}
// =================================================================

defineExpose({
  getCalibrationData() {
    if (!video.videoWidth || !offCtx) return { imageData: null, detector: null }
    const tmp = new OffscreenCanvas(video.videoWidth, video.videoHeight)
    const c = tmp.getContext('2d')
    c.drawImage(video, 0, 0)
    const imageData = c.getImageData(0, 0, video.videoWidth, video.videoHeight)
    const detector = window.AR?.DICTIONARIES
      ? (() => {
          try { return arucoService?._detector ?? null } catch { return null }
        })()
      : null
    const AR = window.AR
    const det = AR ? new AR.Detector({ dictionaryName: Object.keys(AR.DICTIONARIES ?? {})[0] }) : null
    return { imageData, detector: det }
  }
})

const _announcedPieces = new Set()

function handleGameLogic(markers, H) {
  if (gameStore.allowNewMarkers) {
    for (const m of markers) {
      if (!markersStore.isKnown(m.id)) {
        emit('unknown-marker', m)
        break
      }
    }
  }

  const anchors = new Set()
  const currentMap = mapStore.currentMap
  if (currentMap) {
    for (let row = 0; row < currentMap.rows; row++) {
      for (let col = 0; col < currentMap.cols; col++) {
        const cell = currentMap.grid[row][col]
        if (cell.markerId !== undefined && cell.markerId !== null) {
          anchors.add(cell.markerId)
        }
      }
    }
  }

  const pieces = []
  for (const m of markers) {
    if (anchors.has(m.id)) continue
    const data = markersStore.getMarker(m.id)
    if (!data) continue

    let col = null, row = null
    if (H) {
      const cell = pointToCell(H, m.center, gameStore.gridCols, gameStore.gridRows)
      col = cell.col
      row = cell.row
    }

    const { degrees: rotationDeg, symbol: rotationSymbol } = approximateCardinalAngle(m.angle)

    pieces.push({
      id: m.id,
      ...data,
      col, row,
      angle: m.angle,
      rotationDeg,
      rotationSymbol,
      center: m.center,
      corners: m.corners,
    })

    if (data && !_announcedPieces.has(m.id)) {
      _announcedPieces.add(m.id)
      voice.announcePiece(data.label, col, row)
    }
  }

  const visibleIds = new Set(markers.map(m => m.id))
  for (const id of _announcedPieces) {
    if (!visibleIds.has(id)) _announcedPieces.delete(id)
  }

  gameStore.updatePieces(pieces)

  emit('frame-processed', {
    markers,
    pieces,
    homography: H,
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
.camera-canvas {
  width: 100%;
  height: 100%;
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