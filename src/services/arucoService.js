// services/arucoService.js
/**
 * Utilizza la libreria js-aruco2 (window.AR)
 * Richiede che il file aruco-bundle.js sia caricato globalmente.
 * Dizionario: ARUCO_4X4_50 (ID 0..49) – adatto ai tuoi marker 4x4.
 */

let _detector = null

// Costruisce il dizionario ARUCO_4X4_50 a partire dai primi 50 codici di ARUCO_4X4_1000
function buildDict4x4_50() {
  const AR = window.AR
  if (!AR?.DICTIONARIES?.ARUCO_4X4_1000) return false

  const full = AR.DICTIONARIES.ARUCO_4X4_1000
  AR.DICTIONARIES['ARUCO_4X4_50'] = {
    nBits: full.nBits,
    tau: full.tau,
    codeList: full.codeList.slice(0, 50)
  }
  console.log('[ArUco] Dizionario ARUCO_4X4_50 creato')
  return true
}

function getDetector() {
  if (_detector) return _detector

  const AR = window.AR
  if (!AR) throw new Error('window.AR non caricato (js-aruco2)')
  if (!AR.Detector) throw new Error('AR.Detector non trovato')

  if (!AR.DICTIONARIES?.ARUCO_4X4_50) buildDict4x4_50()

  const dictName = 'ARUCO_4X4_50'
  console.log('[ArUco] Usando dizionario:', dictName)
  _detector = new AR.Detector({ dictionaryName: dictName })
  return _detector
}

/** Approssima un angolo a punto cardinale */
export function approximateCardinalAngle(angleDeg) {
  let a = ((angleDeg % 360) + 360) % 360
  if (a >= 315 || a < 45) return { degrees: 0, symbol: 'N' }
  if (a >= 45 && a < 135) return { degrees: 90, symbol: 'E' }
  if (a >= 135 && a < 225) return { degrees: 180, symbol: 'S' }
  return { degrees: 270, symbol: 'O' }
}

function computeCenter(corners) {
  return {
    x: corners.reduce((s, c) => s + c.x, 0) / 4,
    y: corners.reduce((s, c) => s + c.y, 0) / 4
  }
}

function computeAngle(corners) {
  const dx = corners[1].x - corners[0].x
  const dy = corners[1].y - corners[0].y
  return Math.atan2(dy, dx) * 180 / Math.PI
}

export function createArucoService() {
  const detector = getDetector()
  const offscreen = document.createElement('canvas')
  let ctx = null

  function detect(video, debugCanvas = null) {
    if (!video || video.readyState < 2) return []
    const w = video.videoWidth, h = video.videoHeight
    if (w === 0 || h === 0) return []

    offscreen.width = w
    offscreen.height = h
    if (!ctx) ctx = offscreen.getContext('2d', { willReadFrequently: true })
    ctx.drawImage(video, 0, 0, w, h)
    const imageData = ctx.getImageData(0, 0, w, h)

    let rawMarkers = []
    try {
      rawMarkers = detector.detect(imageData)
    } catch (e) {
      console.warn('[ArUco] detect error:', e.message)
      return []
    }

    const results = rawMarkers.map(m => ({
      id: m.id,
      corners: m.corners,
      center: computeCenter(m.corners),
      angle: computeAngle(m.corners)
    }))

    if (debugCanvas) drawDebug(debugCanvas, video, results)
    return results
  }

  function drawDebug(canvas, video, markers) {
    const ctx = canvas.getContext('2d')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    ctx.drawImage(video, 0, 0)
    markers.forEach(({ id, corners, center }) => {
      ctx.beginPath()
      ctx.moveTo(corners[0].x, corners[0].y)
      corners.forEach(p => ctx.lineTo(p.x, p.y))
      ctx.closePath()
      ctx.strokeStyle = '#00ff88'
      ctx.lineWidth = 3
      ctx.stroke()
      // angolo TL
      ctx.beginPath()
      ctx.arc(corners[0].x, corners[0].y, 6, 0, 2 * Math.PI)
      ctx.fillStyle = '#ffff00'
      ctx.fill()
      // testo ID
      ctx.font = `bold ${Math.max(14, canvas.width * 0.025)}px monospace`
      ctx.fillStyle = '#00ff88'
      ctx.shadowBlur = 0
      ctx.fillText(`#${id}`, center.x + 10, center.y - 8)
      ctx.beginPath()
      ctx.arc(center.x, center.y, 4, 0, 2 * Math.PI)
      ctx.fillStyle = '#ff4444'
      ctx.fill()
    })
  }

  return { detect }
}