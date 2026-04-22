import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

// Tipi di cella disponibili
export const CELL_TYPES = {
  EMPTY: 'empty',
  WALL: 'wall',
  DOOR: 'door',
  MONSTER_SPAWN: 'monster_spawn',
  PLAYER_SPAWN: 'player_spawn',
}

// Etichette ed emoji per UI
export const CELL_TYPE_INFO = {
  [CELL_TYPES.EMPTY]: { label: 'Vuoto', emoji: '⬜', color: '#2a2a4a' },
  [CELL_TYPES.WALL]: { label: 'Muro', emoji: '🧱', color: '#6a4a2a' },
  [CELL_TYPES.DOOR]: { label: 'Porta', emoji: '🚪', color: '#4a3a1a' },
  [CELL_TYPES.MONSTER_SPAWN]: { label: 'Mostro', emoji: '👹', color: '#6a2a2a' },
  [CELL_TYPES.PLAYER_SPAWN]: { label: 'Giocatore', emoji: '🧙', color: '#2a4a6a' },
}

const STORAGE_KEY = 'aruco-map-data'

export const useMapStore = defineStore('map', () => {
  // Dimensioni griglia
  const cols = ref(10)
  const rows = ref(10)

  // Matrice di celle: array di array, ogni cella è una stringa (tipo)
  const grid = ref([])

  // Inizializza o ridimensiona la griglia
  function initGrid(newCols = cols.value, newRows = rows.value) {
    const newGrid = []
    for (let r = 0; r < newRows; r++) {
      const row = []
      for (let c = 0; c < newCols; c++) {
        // Mantieni i vecchi valori se possibile
        if (grid.value[r] && grid.value[r][c] !== undefined) {
          row.push(grid.value[r][c])
        } else {
          row.push(CELL_TYPES.EMPTY)
        }
      }
      newGrid.push(row)
    }
    grid.value = newGrid
  }

  // Imposta dimensioni e reinizializza
  function setSize(newCols, newRows) {
    cols.value = newCols
    rows.value = newRows
    initGrid(newCols, newRows)
    saveToStorage()
  }

  // Cambia tipo di una cella
  function setCell(col, row, type) {
    if (col >= 0 && col < cols.value && row >= 0 && row < rows.value) {
      grid.value[row][col] = type
      saveToStorage()
    }
  }

  // Ottieni tipo cella
  function getCell(col, row) {
    return grid.value[row]?.[col] || CELL_TYPES.EMPTY
  }

  // Pulisci tutta la mappa
  function clearMap() {
    initGrid(cols.value, rows.value)
    saveToStorage()
  }

  // Persistenza
  function saveToStorage() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      cols: cols.value,
      rows: rows.value,
      grid: grid.value,
    }))
  }

  function loadFromStorage() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const data = JSON.parse(raw)
        cols.value = data.cols || 10
        rows.value = data.rows || 10
        grid.value = data.grid || []
        // Assicurati che le dimensioni corrispondano
        if (grid.value.length !== rows.value || (grid.value[0] && grid.value[0].length !== cols.value)) {
          initGrid(cols.value, rows.value)
        }
      } else {
        initGrid(cols.value, rows.value)
      }
    } catch {
      initGrid(cols.value, rows.value)
    }
  }

  // Carica all'avvio
  loadFromStorage()

  return {
    cols, rows, grid,
    setSize, setCell, getCell, clearMap,
    saveToStorage,
  }
})