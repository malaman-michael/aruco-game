// stores/mapStore.js
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

// Tipi base di cella (statici)
export const CELL_TYPES = {
  EMPTY: 'empty',
  WALL: 'wall',
  DOOR_CLOSED: 'door_closed',
  DOOR_OPEN: 'door_open',
  DOOR_SECRET: 'door_secret',
  STAIRS: 'stairs',
  FURNITURE: 'furniture',
  TRAP: 'trap',
}

// Sottotipi per i mobili (fissi) – basati sulla lista fornita
export const FURNITURE_STATIC_TYPES = [
  { id: 'table', label: 'Tavolo', emoji: '🪑' },
  { id: 'bookcase', label: 'Libreria', emoji: '📚' },
  { id: 'cabinet', label: 'Armadio', emoji: '🗄️' },
  { id: 'fireplace', label: 'Camino', emoji: '🔥' },
  { id: 'tomb', label: 'Sarcofago', emoji: '⚰️' },
  { id: 'chest', label: 'Scrigno', emoji: '📦' },
  { id: 'alchemist_bench', label: 'Bancone Alchimista', emoji: '🧪' },
  { id: 'sorcerer_desk', label: 'Bancone Mago', emoji: '🔮' },
  { id: 'throne', label: 'Trono', emoji: '👑' },
  { id: 'torture_table', label: 'Tavolo Tortura', emoji: '⛓️' },
  { id: 'weapon_rack', label: 'Rastrelliera Armi', emoji: '⚔️' },
]

// Sottotipi per le trappole (statiche, ma possono essere rimosse/attivate)
export const TRAP_STATIC_TYPES = [
  { id: 'pit', label: 'Voragine', emoji: '🕳️' },
  { id: 'falling_block', label: 'Blocco di Roccia', emoji: '🪨' },
  { id: 'spear', label: 'Lancia', emoji: '🔱' },
  { id: 'poison_dart', label: 'Dardo Avvelenato', emoji: '🏹' },
  { id: 'crossfire', label: 'Fuoco Incrociato', emoji: '🔥' },
  { id: 'wandering_monster', label: 'Mostro Errante', emoji: '👾' },
  { id: 'poison_gas', label: 'Gas Velenoso', emoji: '☠️' },
  { id: 'swinging_blade', label: 'Lama Oscillante', emoji: '⚔️' },
  { id: 'exploding_lock', label: 'Blocco Esplosivo', emoji: '💥' },
  { id: 'giant_boulder', label: 'Macigno Gigante', emoji: '🪨' },
]

// Info visive per ogni tipo base
export const CELL_TYPE_INFO = {
  [CELL_TYPES.EMPTY]: { label: 'Vuoto', emoji: '⬜', color: '#2a2a4a' },
  [CELL_TYPES.WALL]: { label: 'Muro', emoji: '🧱', color: '#4a4a6a' },
  [CELL_TYPES.DOOR_CLOSED]: { label: 'Porta chiusa', emoji: '🚪', color: '#8B4513' },
  [CELL_TYPES.DOOR_OPEN]: { label: 'Porta aperta', emoji: '🚪', color: '#A0522D' },
  [CELL_TYPES.DOOR_SECRET]: { label: 'Porta segreta', emoji: '🚪', color: '#556B2F' },
  [CELL_TYPES.STAIRS]: { label: 'Scale', emoji: '🪜', color: '#C0C0C0' },
  [CELL_TYPES.FURNITURE]: { label: 'Mobile', emoji: '🪑', color: '#8B5A2B' },
  [CELL_TYPES.TRAP]: { label: 'Trappola', emoji: '⚠️', color: '#8B0000' },
}

const STORAGE_KEY_MAPS = 'aruco-game-maps'

export const useMapStore = defineStore('map', () => {
  const maps = ref([])
  const currentMapId = ref(null)

  const currentMap = computed(() => {
    if (!currentMapId.value) return null
    return maps.value.find(m => m.id === currentMapId.value) || null
  })

  function loadMapsFromStorage() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_MAPS)
      if (raw) {
        let parsed = JSON.parse(raw)
        // Migrazione per vecchi formati (se necessario)
        parsed = parsed.map(map => ({
          ...map,
          grid: map.grid.map(row =>
            row.map(cell => {
              if (typeof cell === 'number' || typeof cell === 'string') {
                return { type: cell, details: null }
              }
              return cell
            })
          )
        }))
        maps.value = parsed
      } else {
        // Mappa demo vuota
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

  function setCell(col, row, type, details = null) {
    if (!currentMap.value) return
    if (col >= 0 && col < currentMap.value.cols && row >= 0 && row < currentMap.value.rows) {
      const newGrid = [...currentMap.value.grid]
      newGrid[row] = [...newGrid[row]]
      newGrid[row][col] = { type, details }
      currentMap.value.grid = newGrid
      saveMapsToStorage()
    }
  }

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