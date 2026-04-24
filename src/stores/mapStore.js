// stores/mapStore.js
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

// Tipi base di cella (senza dettagli)
export const CELL_TYPES = {
  EMPTY: 'empty',
  WALL: 'wall',
  PLAYER: 'player',
  ENEMY: 'enemy',
  FURNITURE: 'furniture',
}

// Info visive per ogni tipo base
export const CELL_TYPE_INFO = {
  [CELL_TYPES.EMPTY]: { label: 'Vuoto', emoji: '⬜', color: '#2a2a4a' },
  [CELL_TYPES.WALL]: { label: 'Muro', emoji: '🧱', color: '#4a4a6a' },
  [CELL_TYPES.PLAYER]: { label: 'Giocatore', emoji: '🧙', color: '#2a5a7a' },
  [CELL_TYPES.ENEMY]: { label: 'Nemico', emoji: '👹', color: '#7a2a2a' },
  [CELL_TYPES.FURNITURE]: { label: 'Arredo', emoji: '📦', color: '#5a4a2a' },
}

// Struttura di una cella: { type: string, details?: object }
// details può contenere: category, role, typeId, label, emoji

const STORAGE_KEY_MAPS = 'aruco-game-maps'

export const useMapStore = defineStore('map', () => {
  const maps = ref([])
  const currentMapId = ref(null)

  const currentMap = computed(() => {
    if (!currentMapId.value) return null
    return maps.value.find(m => m.id === currentMapId.value) || null
  })

  // Carica mappe da localStorage
  function loadMapsFromStorage() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_MAPS)
      if (raw) {
        const parsed = JSON.parse(raw)
        // Migrazione: converte vecchie griglie numeriche in formato { type }
        maps.value = parsed.map(map => ({
          ...map,
          grid: map.grid.map(row =>
            row.map(cell => {
              if (typeof cell === 'number' || typeof cell === 'string') {
                // Vecchio formato: solo il tipo
                return { type: cell, details: null }
              }
              return cell // già nuovo formato
            })
          )
        }))
      } else {
        // Mappa demo
        maps.value = [{
          id: 'demo',
          name: 'Demo',
          cols: 10,
          rows: 10,
          grid: Array(10).fill().map(() => Array(10).fill().map(() => ({ type: CELL_TYPES.EMPTY, details: null })))
        }]
        currentMapId.value = 'demo'
      }
    } catch (e) {
      console.error(e)
      maps.value = []
    }
  }

  function saveMapsToStorage() {
    localStorage.setItem(STORAGE_KEY_MAPS, JSON.stringify(maps.value))
  }

  function createNewMap(name, cols, rows) {
    const id = Date.now().toString()
    const grid = Array(rows).fill().map(() =>
      Array(cols).fill().map(() => ({ type: CELL_TYPES.EMPTY, details: null }))
    )
    maps.value.push({ id, name, cols, rows, grid })
    currentMapId.value = id
    saveMapsToStorage()
  }

  function loadMap(id) {
    currentMapId.value = id
  }

  function saveCurrentMap(newName) {
    if (!currentMap.value) return
    currentMap.value.name = newName
    saveMapsToStorage()
  }

  function deleteMap(id) {
    const index = maps.value.findIndex(m => m.id === id)
    if (index !== -1) {
      maps.value.splice(index, 1)
      if (currentMapId.value === id) {
        currentMapId.value = maps.value[0]?.id || null
      }
      saveMapsToStorage()
    }
  }

  function resizeCurrentMap(newCols, newRows) {
    if (!currentMap.value) return
    const oldGrid = currentMap.value.grid
    const newGrid = Array(newRows).fill().map((_, r) =>
      Array(newCols).fill().map((_, c) => {
        if (r < oldGrid.length && c < oldGrid[0].length) {
          return { ...oldGrid[r][c] }
        }
        return { type: CELL_TYPES.EMPTY, details: null }
      })
    )
    currentMap.value.grid = newGrid
    currentMap.value.cols = newCols
    currentMap.value.rows = newRows
    saveMapsToStorage()
  }

// mapStore.js - dentro defineStore
function setCell(col, row, type, details = null) {
  if (!currentMap.value) return
  if (col >= 0 && col < currentMap.value.cols && row >= 0 && row < currentMap.value.rows) {
    // Clona la griglia e la riga specifica
    const newGrid = [...currentMap.value.grid]
    newGrid[row] = [...newGrid[row]]
    newGrid[row][col] = { type, details }
    
    // Sostituisci la griglia corrente
    currentMap.value.grid = newGrid
    saveMapsToStorage()
  }
}

  // Inizializza
  loadMapsFromStorage()

  return {
    maps,
    currentMapId,
    currentMap,
    createNewMap,
    loadMap,
    saveCurrentMap,
    deleteMap,
    resizeCurrentMap,
    setCell,
  }
})