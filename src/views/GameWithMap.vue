<script setup>
// ... (import e altre variabili)

const overlayCanvas = ref(null)
const offscreenMapCanvas = document.createElement('canvas')
let offscreenCtx = offscreenMapCanvas.getContext('2d')

let redrawPending = false
let lastDrawKey = ''

// ... (altre funzioni)

function updateCanvasSize() {
  const canvas = overlayCanvas.value
  if (!canvas) return
  const videoEl = cameraViewRef.value?.$el?.querySelector('video')
  if (videoEl && videoEl.videoWidth) {
    canvas.width = videoEl.videoWidth
    canvas.height = videoEl.videoHeight
    canvas.style.width = `${videoEl.clientWidth}px`
    canvas.style.height = `${videoEl.clientHeight}px`
  } else {
    const viewport = document.querySelector('.viewport')
    if (viewport) {
      canvas.width = viewport.clientWidth
      canvas.height = viewport.clientHeight
    }
  }
  // Se la dimensione del canvas cambia, forziamo il ridisegno della mappa offscreen
  if (offscreenMapCanvas.width !== canvas.width || offscreenMapCanvas.height !== canvas.height) {
    offscreenMapCanvas.width = canvas.width
    offscreenMapCanvas.height = canvas.height
    markMapDirty()
  }
}

function markMapDirty() {
  // Invalida la cache della mappa offscreen
  lastDrawKey = ''
}

function drawMapOffscreen() {
  const map = mapStore.maps.find(m => m.id === selectedMapId.value)
  const homography = gameStore.homography
  const gridCols = gameStore.gridCols
  const gridRows = gameStore.gridRows

  if (!map || !homography || !gameStore.homographyReady) {
    offscreenCtx.clearRect(0, 0, offscreenMapCanvas.width, offscreenMapCanvas.height)
    return
  }

  // Se le dimensioni differiscono, aggiorna la griglia e esci (il prossimo frame riproverà)
  if (map.cols !== gridCols || map.rows !== gridRows) {
    gameStore.setGridSize(map.cols, map.rows)
    return
  }

  // Calcola una chiave per la cache (cambia quando mappa, omografia o dimensioni cambiano)
  const key = `${map.id}-${map.cols}x${map.rows}-${homography.join(',')}`
  if (key === lastDrawKey) return
  lastDrawKey = key

  const ctx = offscreenCtx
  const canvas = offscreenMapCanvas
  ctx.clearRect(0, 0, canvas.width, canvas.height)

  const invH = invertHomography(homography)
  if (!invH) return

  const gridToPixel = (col, row) => applyHomography(invH, { x: col, y: row })
  const grid = map.grid

  // Disegna ogni cella
  for (let row = 0; row < gridRows; row++) {
    for (let col = 0; col < gridCols; col++) {
      const cell = grid[row]?.[col] || { type: CELL_TYPES.EMPTY, details: null }
      const type = cell.type
      const info = CELL_TYPE_INFO[type] || CELL_TYPE_INFO.empty
      const emoji = getCellEmoji(cell)
      const bgColor = info.color || '#2a2a4a'

      const p0 = gridToPixel(col, row)
      const p1 = gridToPixel(col + 1, row)
      const p2 = gridToPixel(col + 1, row + 1)
      const p3 = gridToPixel(col, row + 1)

      if (isNaN(p0.x) || isNaN(p0.y)) continue

      const center = gridToPixel(col + 0.5, row + 0.5)
      if (isNaN(center.x) || isNaN(center.y)) continue

      ctx.beginPath()
      ctx.moveTo(p0.x, p0.y)
      ctx.lineTo(p1.x, p1.y)
      ctx.lineTo(p2.x, p2.y)
      ctx.lineTo(p3.x, p3.y)
      ctx.closePath()
      ctx.fillStyle = bgColor
      ctx.fill()
      ctx.strokeStyle = '#3a3a6a'
      ctx.lineWidth = 1.5
      ctx.stroke()

      const width = Math.hypot(p1.x - p0.x, p1.y - p0.y)
      const height = Math.hypot(p3.x - p0.x, p3.y - p0.y)
      const cellSize = Math.min(width, height)
      let fontSize = cellSize * 0.5
      fontSize = Math.min(48, Math.max(12, fontSize))
      ctx.font = `${fontSize}px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillStyle = '#ffffff'
      ctx.fillText(emoji, center.x, center.y)
    }
  }
}

function drawMapOverlay() {
  const canvas = overlayCanvas.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  // Ridimensiona il canvas overlay se necessario
  updateCanvasSize()

  // Disegna la mappa offscreen solo se è sporca
  drawMapOffscreen()

  // Copia il contenuto offscreen sul canvas overlay
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(offscreenMapCanvas, 0, 0, canvas.width, canvas.height)
}

function requestRedraw() {
  if (redrawPending) return
  redrawPending = true
  requestAnimationFrame(() => {
    redrawPending = false
    drawMapOverlay()
  })
}

// Chiama requestRedraw quando qualcosa cambia
function onHomographyUpdated() {
  markMapDirty()
  requestRedraw()
}

// ... (altre funzioni)
</script>