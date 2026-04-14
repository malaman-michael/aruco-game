import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

const STORAGE_KEY = 'aruco-game-config'

export const useGameStore = defineStore('game', () => {
  // Configurazione griglia
  const gridCols = ref(10)
  const gridRows = ref(10)

  // Lista delle pedine rilevate nell'ultimo frame
  // Ogni pedina: { id, category, role, typeId, emoji, label, col, row, angle }
  const pieces = ref([])

  // Stato della sessione di gioco
  const isGameActive = ref(false)

  // Ultimo frame timestamp (per debug)
  const lastFrameTs = ref(0)

  // Carica configurazione salvata
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
    saveConfig()
  }

  // Aggiorna le pedine rilevate in questo frame
  function updatePieces(newPieces) {
    pieces.value = newPieces
    lastFrameTs.value = Date.now()
  }

  function startGame() { isGameActive.value = true }
  function stopGame() { isGameActive.value = false }

  // Pedine raggruppate per categoria
  const players = computed(() => pieces.value.filter(p => p.category === 'player'))
  const enemies = computed(() => pieces.value.filter(p => p.category === 'enemy'))
  const furniture = computed(() => pieces.value.filter(p => p.category === 'furniture'))

  loadConfig()

  return {
    gridCols, gridRows,
    pieces, isGameActive, lastFrameTs,
    players, enemies, furniture,
    setGridSize, updatePieces,
    startGame, stopGame,
  }
})