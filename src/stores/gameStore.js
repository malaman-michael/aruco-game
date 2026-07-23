import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { buildHomographyFromMarkers } from '../services/homographyService.js'
import { useMapStore } from './mapStore.js'

const STORAGE_KEY = 'aruco-game-config'

export const useGameStore = defineStore('game', () => {
  const gridCols = ref(10)
  const gridRows = ref(10)
  const freeMode = ref(false)
  const pieces = ref([])
  const isGameActive = ref(false)
  const lastFrameTs = ref(0)
  const anchorPositions = ref({})
  const homography = ref(null)

  const visibleAnchorsCount = computed(() => {
    const mapStore = useMapStore()
    const targets = mapStore.getMarkerAnchors()
    const targetIds = new Set(targets.map(a => a.id))
    let count = 0
    for (const id of Object.keys(anchorPositions.value)) {
      if (targetIds.has(Number(id))) count++
    }
    return count
  })

  const homographyReady = computed(() => homography.value !== null)

  function updateAnchor(markerId, center) {
    anchorPositions.value = {
      ...anchorPositions.value,
      [markerId]: { center }
    }
    recomputeHomography()
  }

  /**
   * Seleziona i 4 punti che formano il quadrilatero di area massima
   */
  function selectBestFourAnchors(detected) {
    if (detected.length < 4) return null

    let bestQuad = null
    let maxArea = -1

    // Prova tutte le combinazioni di 4 punti
    for (let i = 0; i < detected.length - 3; i++) {
      for (let j = i + 1; j < detected.length - 2; j++) {
        for (let k = j + 1; k < detected.length - 1; k++) {
          for (let l = k + 1; l < detected.length; l++) {
            const quad = [detected[i], detected[j], detected[k], detected[l]]
            // Calcola il centro del quadrilatero
            const cx = quad.reduce((s, p) => s + p.center.x, 0) / 4
            const cy = quad.reduce((s, p) => s + p.center.y, 0) / 4
            // Ordina i punti per angolo polare attorno al centro
            const sorted = [...quad].sort((a, b) => {
              const angleA = Math.atan2(a.center.y - cy, a.center.x - cx)
              const angleB = Math.atan2(b.center.y - cy, b.center.x - cx)
              return angleA - angleB
            })
            // Calcola l'area con la formula di Gauss (shoelace)
            let area = 0
            for (let idx = 0; idx < 4; idx++) {
              const p1 = sorted[idx].center
              const p2 = sorted[(idx + 1) % 4].center
              area += p1.x * p2.y - p2.x * p1.y
            }
            area = Math.abs(area) / 2
            if (area > maxArea) {
              maxArea = area
              bestQuad = sorted
            }
          }
        }
      }
    }
    return bestQuad
  }

  function recomputeHomography() {
    const mapStore = useMapStore()
    const targets = mapStore.getMarkerAnchors()
    const detected = []

    for (const [id, data] of Object.entries(anchorPositions.value)) {
      const target = targets.find(t => t.id === Number(id))
      if (target) {
        detected.push({ id: Number(id), center: data.center })
      }
    }

    if (detected.length >= 4) {
      const bestQuad = selectBestFourAnchors(detected)
      if (bestQuad) {
        const selected = bestQuad.map(p => ({ id: p.id, center: p.center }))
        const H = buildHomographyFromMarkers(selected, targets)
        if (H) {
          homography.value = H
          console.log('[gameStore] Omografia calcolata con 4 ancore (area massima):', selected.map(s => `#${s.id}`).join(', '))
          // Annuncio vocale opzionale
          const voice = (await import('../services/voiceService.js')).voice
          voice?.say?.(`Omografia con ancore ${selected.map(s => s.id).join(', ')}`, 'homography_anchors', 1)
          return
        }
      }
    }

    // Se non ci sono 4 ancore, resetta l'omografia
    homography.value = null
  }

  function resetHomography() {
    anchorPositions.value = {}
    homography.value = null
  }

  function toggleFreeMode() {
    freeMode.value = !freeMode.value
  }

  function loadConfig() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const cfg = JSON.parse(raw)
        gridCols.value = cfg.gridCols ?? 10
        gridRows.value = cfg.gridRows ?? 10
      }
    } catch {}
  }

  function saveConfig() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      gridCols: gridCols.value,
      gridRows: gridRows.value,
    }))
  }

  function setGridSize(cols, rows) {
    gridCols.value = cols
    gridRows.value = rows
    recomputeHomography()
    saveConfig()
  }

  function updatePieces(newPieces) {
    pieces.value = newPieces
    lastFrameTs.value = Date.now()
  }

  function startGame() {
    isGameActive.value = true
  }

  function stopGame() {
    isGameActive.value = false
  }

  const allowNewMarkers = ref(true)
  function toggleNewMarkers() {
    allowNewMarkers.value = !allowNewMarkers.value
  }

  const players = computed(() => pieces.value.filter(p => p.category === 'player'))
  const enemies = computed(() => pieces.value.filter(p => p.category === 'enemy'))
  const furniture = computed(() => pieces.value.filter(p => p.category === 'furniture'))

  loadConfig()

  return {
    gridCols,
    gridRows,
    pieces,
    isGameActive,
    lastFrameTs,
    players,
    enemies,
    furniture,
    anchorPositions,
    homography,
    visibleAnchorsCount,
    homographyReady,
    allowNewMarkers,
    toggleNewMarkers,
    updateAnchor,
    recomputeHomography,
    resetHomography,
    setGridSize,
    updatePieces,
    startGame,
    stopGame,
    freeMode,
    toggleFreeMode,
  }
})