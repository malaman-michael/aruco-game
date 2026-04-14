/**
 * calibrationService.js
 * Taratura automatica: testa combinazioni di brightness/contrast/threshold
 * e trova le impostazioni che massimizzano il numero di marker rilevati.
 */

// Griglia di combinazioni da testare
const CANDIDATES = []
for (const b of [70, 90, 100, 120, 150, 180]) {
  for (const c of [100, 130, 160, 200, 250]) {
    for (const t of [0, 60, 100, 140, 180]) {
      for (const g of [false, true]) {
        CANDIDATES.push({ brightness: b, contrast: c, threshold: t, grayscale: g, sharpness: 0 })
      }
    }
  }
}
// ~300 combinazioni — le testiamo tutte in batch veloci

/**
 * Applica impostazioni a un ImageData e restituisce un nuovo ImageData preprocessato.
 */
function applySettings(src, w, h, settings) {
  const { brightness, contrast, threshold, grayscale } = settings

  // Usiamo un canvas offscreen per applicare i filtri CSS
  const tmp = new OffscreenCanvas(w, h)
  const ctx = tmp.getContext('2d')

  // Ridisegna con filtro
  const sat = grayscale ? 0 : 100
  ctx.filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${sat}%)`
  ctx.putImageData(src, 0, 0)

  // Leggi i pixel trasformati
  const out = ctx.getImageData(0, 0, w, h)

  // Threshold
  if (threshold > 0) {
    const d = out.data
    for (let i = 0; i < d.length; i += 4) {
      const gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]
      const val = gray > threshold ? 255 : 0
      d[i] = d[i + 1] = d[i + 2] = val
    }
  }
  return out
}

/**
 * Esegue la taratura su un singolo frame.
 *
 * @param {ImageData} frameData  - frame grezzo dalla camera
 * @param {object}    detector   - window.AR detector già inizializzato
 * @param {Function}  onProgress - callback(percent, bestSoFar)
 * @returns {Promise<{settings, markersFound, scores}>}
 */
export async function runCalibration(frameData, detector, onProgress) {
  const { width: w, height: h } = frameData
  const results = []

  // Testa ogni candidato in slice async per non bloccare il browser
  const BATCH = 10
  for (let i = 0; i < CANDIDATES.length; i += BATCH) {
    const batch = CANDIDATES.slice(i, i + BATCH)

    for (const cfg of batch) {
      try {
        const processed = applySettings(frameData, w, h, cfg)
        const markers = detector.detect(processed)
        results.push({ cfg, count: markers.length, markers })
      } catch {
        results.push({ cfg, count: 0, markers: [] })
      }
    }

    const pct = Math.round(((i + BATCH) / CANDIDATES.length) * 100)
    const best = results.reduce((a, b) => (b.count > a.count ? b : a), results[0])
    onProgress?.(Math.min(pct, 100), best)

    // Yield al browser ogni batch
    await new Promise(r => setTimeout(r, 0))
  }

  // Ordina per: count desc, poi brightness più bassa (meno aggressivo), poi contrast più bassa
  results.sort((a, b) =>
    b.count - a.count ||
    a.cfg.brightness - b.cfg.brightness ||
    a.cfg.contrast - b.cfg.contrast
  )

  const best = results[0]
  return {
    settings: best.cfg,
    markersFound: best.count,
    scores: results.slice(0, 10), // top 10
  }
}