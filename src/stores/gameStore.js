import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { buildHomographyFromCorners } from '../services/homographyService.js'

const STORAGE_KEY = 'aruco-game-config'

export const useGameStore = defineStore('game', () => {
  // Configurazione griglia
  const gridCols = ref(10)
  const gridRows = ref(10)

  // Lista delle pedine rilevate nell'ultimo frame
  const pieces = ref([])

  // Stato della sessione di gioco
  const isGameActive = ref(false)
  const lastFrameTs  = ref(0)

  // ─── Posizioni pixel dei 4 corner (aggiornate ad ogni frame in cui sono visibili)
  // Struttura: { NO: {x, y}, NE: {x, y}, SO: {x, y}, SE: {x, y} }
  // Persistono per tutta la sessione — non vengono azzerate se i corner escono dall'inquadratura
  const cornerPositions = ref({})

  // Matrice di omografia calcolata dai cornerPositions
  // Viene ricalcolata ogni volta che si aggiorna almeno un corner
  const homography = ref(null)

  // Numero di corner acquisiti finora
  const cornersAcquired = computed(() => Object.keys(cornerPositions.value).length)
  const homographyReady = computed(() => homography.value !== null)

  /**
   * Chiamato ogni frame per ogni corner marker visibile.
   * Aggiorna la posizione pixel del corner e ricalcola l'omografia
   * se tutti e 4 i corner sono stati visti almeno una volta.
   *
   * @param {string} role    - 'NO' | 'NE' | 'SO' | 'SE'
   * @param {{x,y}} center   - centro del marker in pixel nel frame video
   */
  function updateCornerPosition(role, center) {
    cornerPositions.value = { ...cornerPositions.value, [role]: center }
    _recomputeHomography()
  }

  function _recomputeHomography() {
    const cp = cornerPositions.value
    if (!cp.NO || !cp.NE || !cp.SO || !cp.SE) return

    // buildHomographyFromCorners si aspetta oggetti con .center
    const corners = {
      NO: { center: cp.NO },
      NE: { center: cp.NE },
      SO: { center: cp.SO },
      SE: { center: cp.SE },
    }
    const H = buildHomographyFromCorners(corners, gridCols.value, gridRows.value)
    if (H) {
      homography.value = H
      console.log('[gameStore] Omografia calcolata ✓ griglia', gridCols.value, '×', gridRows.value)
    }
  }

  /** Cancella le posizioni dei corner e l'omografia (utile se si riposiziona la plancia) */
  function resetHomography() {
    cornerPositions.value = {}
    homography.value = null
  }

  function loadConfig() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const cfg = JSON.parse(raw)
        gridCols.value = cfg.gridCols ?? 10
        gridRows.value = cfg.gridRows ?? 10
      }
    } catch { /* ignora */ }
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
    // Ricalcola l'omografia con le nuove dimensioni griglia
    _recomputeHomography()
    saveConfig()
  }

  function updatePieces(newPieces) {
    pieces.value = newPieces
    lastFrameTs.value = Date.now()
  }

  function startGame() { isGameActive.value = true }
  function stopGame()  { isGameActive.value = false }

  // ─── Modalità aggiunta pedine ─────────────────────────────────────────────
  // Quando false, i marker sconosciuti vengono ignorati silenziosamente
  // (niente dialog, niente falsi positivi durante il gioco)
  const allowNewMarkers = ref(true)
  function toggleNewMarkers() { allowNewMarkers.value = !allowNewMarkers.value }

  const players   = computed(() => pieces.value.filter(p => p.category === 'player'))
  const enemies   = computed(() => pieces.value.filter(p => p.category === 'enemy'))
  const furniture = computed(() => pieces.value.filter(p => p.category === 'furniture'))

  loadConfig()

  return {
    gridCols, gridRows,
    pieces, isGameActive, lastFrameTs,
    players, enemies, furniture,
    cornerPositions, homography, cornersAcquired, homographyReady,
    allowNewMarkers, toggleNewMarkers,
    updateCornerPosition, resetHomography,
    setGridSize, updatePieces,
    startGame, stopGame,
  }
})