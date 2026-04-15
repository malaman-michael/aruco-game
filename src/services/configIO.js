/**
 * configIO.js
 * Import/Export della configurazione completa della sessione di gioco:
 * - dimensioni griglia
 * - registro marker (id, tipo, sottotipo, nome, emoji, posizione)
 * - impostazioni camera
 */

const VERSION = '1.0'

/**
 * Esporta tutto in un oggetto JSON.
 */
export function exportConfig(markersStore, gameStore, cameraStore) {
  return {
    version: VERSION,
    exportedAt: new Date().toISOString(),
    grid: {
      cols: gameStore.gridCols,
      rows: gameStore.gridRows,
    },
    camera: {
      brightness:  cameraStore.brightness,
      contrast:    cameraStore.contrast,
      saturation:  cameraStore.saturation,
      sharpness:   cameraStore.sharpness,
      threshold:   cameraStore.threshold,
      grayscale:   cameraStore.grayscale,
      showGrid:    cameraStore.showGrid,
      showIds:     cameraStore.showIds,
      showCubes:   cameraStore.showCubes,
      gridOpacity: cameraStore.gridOpacity,
    },
    markers: Object.entries(markersStore.registry).map(([id, data]) => ({
      id:          Number(id),
      category:    data.category,   // corner | player | enemy | furniture
      role:        data.role,       // NO/NE/SO/SE | guerriero | scheletro | porta_aperta ...
      typeId:      data.typeId,
      label:       data.label,
      emoji:       data.emoji,
      description: data.description ?? '',
    })),
  }
}

/**
 * Scarica il JSON come file .json.
 */
export function downloadConfig(markersStore, gameStore, cameraStore) {
  const data = exportConfig(markersStore, gameStore, cameraStore)
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = `aruco-game-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}

/**
 * Importa una configurazione da oggetto JSON.
 * Restituisce { ok, errors } dopo aver aggiornato gli store.
 */
export function importConfig(raw, markersStore, gameStore, cameraStore) {
  const errors = []

  try {
    const data = typeof raw === 'string' ? JSON.parse(raw) : raw

    // Griglia
    if (data.grid?.cols && data.grid?.rows) {
      gameStore.setGridSize(data.grid.cols, data.grid.rows)
    } else {
      errors.push('grid: dati mancanti o non validi')
    }

    // Camera settings
    if (data.camera) {
      const c = data.camera
      if (c.brightness  !== undefined) cameraStore.brightness  = c.brightness
      if (c.contrast    !== undefined) cameraStore.contrast    = c.contrast
      if (c.saturation  !== undefined) cameraStore.saturation  = c.saturation
      if (c.sharpness   !== undefined) cameraStore.sharpness   = c.sharpness
      if (c.threshold   !== undefined) cameraStore.threshold   = c.threshold
      if (c.grayscale   !== undefined) cameraStore.grayscale   = c.grayscale
      if (c.showGrid    !== undefined) cameraStore.showGrid    = c.showGrid
      if (c.showIds     !== undefined) cameraStore.showIds     = c.showIds
      if (c.showCubes   !== undefined) cameraStore.showCubes   = c.showCubes
      if (c.gridOpacity !== undefined) cameraStore.gridOpacity = c.gridOpacity
      cameraStore.save()
    }

    // Marker
    if (Array.isArray(data.markers)) {
      markersStore.clearAll()
      for (const m of data.markers) {
        if (m.id === undefined || !m.category) {
          errors.push(`marker non valido: ${JSON.stringify(m)}`)
          continue
        }
        markersStore.register(m.id, {
          category:    m.category,
          role:        m.role    ?? null,
          typeId:      m.typeId  ?? null,
          label:       m.label   ?? `Marker #${m.id}`,
          emoji:       m.emoji   ?? '❓',
          description: m.description ?? '',
        })
      }
    } else {
      errors.push('markers: array mancante')
    }

    return { ok: errors.length === 0, errors, imported: data }
  } catch (e) {
    return { ok: false, errors: [`Parsing JSON fallito: ${e.message}`] }
  }
}

/**
 * Legge un File e restituisce la stringa JSON.
 */
export function readFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload  = e => resolve(e.target.result)
    reader.onerror = () => reject(new Error('Lettura file fallita'))
    reader.readAsText(file)
  })
}
