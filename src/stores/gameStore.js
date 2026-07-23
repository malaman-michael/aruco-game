import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { buildHomographyFromMarkers } from '../services/homographyService.js'
import { useMapStore } from './mapStore.js'
import { voice } from '../services/voiceService.js'

const STORAGE_KEY = 'aruco-game-config'

// Limiti anti-esplosione combinatoria: selectBestFourAnchors è O(n^4), quindi il
// numero di ancore "tracciate" contemporaneamente deve restare piccolo.
const ANCHOR_TTL_MS = 3000        // un'ancora vista viene "dimenticata" dopo 3s se non più visibile
const MAX_TRACKED_ANCHORS = 16    // tetto massimo assoluto di ancore tracciate
const MAX_BRUTEFORCE_ANCHORS = 12 // oltre questa soglia, riduciamo il pool prima della ricerca O(n^4)

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

  // Aggiornamento "legacy" di una singola ancora. NON ricalcola più l'omografia
  // internamente (era questa la causa del blocco: veniva chiamata una volta per
  // ogni marker rilevato, ad ogni frame). Preferire setVisibleAnchors().
  function updateAnchor(markerId, center) {
    anchorPositions.value = {
      ...anchorPositions.value,
      [markerId]: { center, lastSeen: Date.now() },
    }
  }

  // Sostituisce lo stato delle ancore con quelle viste nel frame corrente.
  // - Le ancore riviste vengono "rinfrescate" (lastSeen aggiornato).
  // - Le ancore non viste da più di ANCHOR_TTL_MS vengono eliminate.
  // - Se il set supera MAX_TRACKED_ANCHORS, si tengono solo le più recenti.
  // Questo mantiene l'insieme di ancore sempre limitato, evitando la crescita
  // infinita che causava il blocco del programma, pur restando "stabile" per
  // qualche secondo se un'ancora esce temporaneamente dall'inquadratura.
  function setVisibleAnchors(visibleList) {
    const now = Date.now()
    const next = { ...anchorPositions.value }

    for (const a of visibleList) {
      next[a.id] = { center: a.center, lastSeen: now }
    }

    for (const id of Object.keys(next)) {
      if (now - (next[id].lastSeen ?? 0) > ANCHOR_TTL_MS) {
        delete next[id]
      }
    }

    const ids = Object.keys(next)
    if (ids.length > MAX_TRACKED_ANCHORS) {
      const kept = ids
        .map(id => ({ id, lastSeen: next[id].lastSeen }))
        .sort((a, b) => b.lastSeen - a.lastSeen)
        .slice(0, MAX_TRACKED_ANCHORS)
        .map(x => x.id)
      const capped = {}
      for (const id of kept) capped[id] = next[id]
      anchorPositions.value = capped
    } else {
      anchorPositions.value = next
    }

    recomputeHomography()
  }

  // Riduce un pool di candidati troppo grande, privilegiando i punti più
  // distanti dal centro (di solito i migliori candidati per un quadrilatero
  // ampio e stabile). Usata solo come rete di sicurezza extra.
  function reduceAnchorPool(detected, max) {
    const cx = detected.reduce((s, p) => s + p.center.x, 0) / detected.length
    const cy = detected.reduce((s, p) => s + p.center.y, 0) / detected.length
    return detected
      .map(p => ({ ...p, _d: Math.hypot(p.center.x - cx, p.center.y - cy) }))
      .sort((a, b) => b._d - a._d)
      .slice(0, max)
  }

  function selectBestFourAnchors(detected) {
    if (detected.length < 4) return null

    let pool = detected
    if (pool.length > MAX_BRUTEFORCE_ANCHORS) {
      pool = reduceAnchorPool(pool, MAX_BRUTEFORCE_ANCHORS)
    }

    let bestQuad = null
    let maxArea = -1

    for (let i = 0; i < pool.length - 3; i++) {
      for (let j = i + 1; j < pool.length - 2; j++) {
        for (let k = j + 1; k < pool.length - 1; k++) {
          for (let l = k + 1; l < pool.length; l++) {
            const quad = [pool[i], pool[j], pool[k], pool[l]]
            const cx = quad.reduce((s, p) => s + p.center.x, 0) / 4
            const cy = quad.reduce((s, p) => s + p.center.y, 0) / 4
            const sorted = [...quad].sort((a, b) => {
              const angleA = Math.atan2(a.center.y - cy, a.center.x - cx)
              const angleB = Math.atan2(b.center.y - cy, b.center.x - cx)
              return angleA - angleB
            })
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
          voice.say(`Omografia con ancore ${selected.map(s => s.id).join(', ')}`, 'homography_anchors', 1)
          return
        }
      }
    }
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
    if (gridCols.value === cols && gridRows.value === rows) return
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
    setVisibleAnchors,
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