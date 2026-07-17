// src/stores/gameStore.js
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

  const anchorPositions = ref({}) // { markerId: { center: {x,y} } }
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

  function recomputeHomography() {
    const mapStore = useMapStore()
    const targets = mapStore.getMarkerAnchors()
    const detected = []
    for (const [id, data] of Object.entries(anchorPositions.value)) {
      const target = targets.find(t => t.id === Number(id))
      if (target) {
        detected.push({
          id: Number(id),
          center: data.center
        })
      }
    }
    if (detected.length >= 3) {
      const H = buildHomographyFromMarkers(detected, targets)
      if (H) {
        homography.value = H
        console.log('[gameStore] Omografia calcolata con', detected.length, 'ancore')
        return
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
    gridCols.value = cols
    gridRows.value = rows
    recomputeHomography()
    saveConfig()
  }

  function updatePieces(newPieces) {
    pieces.value = newPieces
    lastFrameTs.value = Date.now()
  }

  function startGame() { isGameActive.value = true }
  function stopGame() { isGameActive.value = false }

  const allowNewMarkers = ref(true)
  function toggleNewMarkers() { allowNewMarkers.value = !allowNewMarkers.value }

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