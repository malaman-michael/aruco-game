/**
 * arucoService.js
 *
 * Usa window.AR caricato da public/aruco/aruco-bundle.js.
 * Il dizionario ARUCO_4X4_1000 contiene tutti i marker 4x4 OpenCV.
 * Creiamo ARUCO_4X4_50 prendendo i primi 50 codici da quel dizionario.
 */

let _detector = null

function buildDict4x4_50() {
  const AR = window.AR
  if (!AR?.DICTIONARIES?.ARUCO_4X4_1000) return false

  const full = AR.DICTIONARIES.ARUCO_4X4_1000
  AR.DICTIONARIES['ARUCO_4X4_50'] = {
    nBits: full.nBits,   // 16
    tau:   full.tau,
    codeList: full.codeList.slice(0, 50),
  }
  console.log('[ArUco] ARUCO_4X4_50 costruito dai primi 50 codici di ARUCO_4X4_1000')
  return true
}

function getDetector() {
  if (_detector) return _detector

  const AR = window.AR
  if (!AR)          throw new Error('window.AR non trovato.')
  if (!AR.Detector) throw new Error('AR.Detector non trovato.')

  // Costruisce il sottoinsieme 4x4_50 se non esiste già
  if (!AR.DICTIONARIES?.ARUCO_4X4_50) buildDict4x4_50()

  const dicts = Object.keys(AR.DICTIONARIES ?? {})
  console.log('[ArUco] dizionari disponibili:', dicts)

  // Priorità: 4x4_50 → 4x4_1000 → fallback
  const WANTED = ['ARUCO_4X4_50', 'ARUCO']
  const dictName = WANTED.find(d => dicts.includes(d)) ?? dicts[0]

  console.log('[ArUco] uso dizionario:', dictName)
  _detector = new AR.Detector({ dictionaryName: dictName })
  return _detector
}

export function createArucoService() {
  const detector = getDetector()

  const offscreen = document.createElement('canvas')
  let ctx = null

  function detect(video, debugCanvas = null) {
    if (!video || video.readyState < 2) return []
    const w = video.videoWidth
    const h = video.videoHeight
    if (!w || !h) return []

    if (offscreen.width !== w || offscreen.height !== h) {
      offscreen.width = w
      offscreen.height = h
      ctx = null
    }
    if (!ctx) ctx = offscreen.getContext('2d', { willReadFrequently: true })

    ctx.drawImage(video, 0, 0, w, h)
    const imageData = ctx.getImageData(0, 0, w, h)

    let rawMarkers = []
    try {
      rawMarkers = detector.detect(imageData)
      console.info('Marker',rawMarkers)

    } catch (e) {
      console.warn('[ArUco] errore detect:', e.message)
      return []
    }

    const results = rawMarkers.map(m => ({
      id:      m.id,
      corners: m.corners,
      center:  computeCenter(m.corners),
      angle:   computeAngle(m.corners),
    }))

    if (debugCanvas) drawDebug(debugCanvas, video, results)
    return results
  }

  function computeCenter(corners) {
    return {
      x: corners.reduce((s, c) => s + c.x, 0) / 4,
      y: corners.reduce((s, c) => s + c.y, 0) / 4,
    }
  }

  function computeAngle(corners) {
    const dx = corners[1].x - corners[0].x
    const dy = corners[1].y - corners[0].y
    return (Math.atan2(dy, dx) * 180) / Math.PI
  }

  function drawDebug(canvas, video, markers) {
    const dCtx = canvas.getContext('2d')
    canvas.width  = video.videoWidth
    canvas.height = video.videoHeight
    dCtx.drawImage(video, 0, 0)
    const fontSize = Math.max(14, canvas.width * 0.025)
    markers.forEach(({ id, corners, center }) => {
      // Contorno verde
      dCtx.beginPath()
      dCtx.moveTo(corners[0].x, corners[0].y)
      corners.forEach(p => dCtx.lineTo(p.x, p.y))
      dCtx.closePath()
      dCtx.strokeStyle = '#00ff88'
      dCtx.lineWidth = 3
      dCtx.stroke()
      // Corner TL giallo (indica orientamento)
      dCtx.beginPath()
      dCtx.arc(corners[0].x, corners[0].y, 8, 0, Math.PI * 2)
      dCtx.fillStyle = '#ffff00'
      dCtx.fill()
      // ID con outline nero
      dCtx.font = `bold ${fontSize}px monospace`
      dCtx.lineWidth = 4
      dCtx.strokeStyle = 'rgba(0,0,0,0.8)'
      dCtx.strokeText(`#${id}`, center.x + 10, center.y - 8)
      dCtx.fillStyle = '#00ff88'
      dCtx.fillText(`#${id}`, center.x + 10, center.y - 8)
      // Centro rosso
      dCtx.beginPath()
      dCtx.arc(center.x, center.y, 5, 0, Math.PI * 2)
      dCtx.fillStyle = '#ff4444'
      dCtx.fill()
    })
  }

  return { detect }
}