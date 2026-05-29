// stores/mapStore.js
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const CELL_TYPES = {
  EMPTY: 'empty', FLOOR: 'floor', WALL: 'wall',
  DOOR_CLOSED: 'door_closed', DOOR_OPEN: 'door_open', DOOR_SECRET: 'door_secret',
  STAIRS: 'stairs', FURNITURE: 'furniture', TRAP: 'trap',
  HERO: 'hero', MONSTER: 'monster', ENTRANCE: 'entrance', SPECIAL: 'special'
}

export const FURNITURE_STATIC_TYPES = [
  { id: 'table', label: 'Tavolo', emoji: '🪑' },
  { id: 'bookcase', label: 'Libreria', emoji: '📚' },
  { id: 'chest', label: 'Scrigno', emoji: '📦' }
]

export const TRAP_STATIC_TYPES = [
  { id: 'pit', label: 'Buca', emoji: '🕳️' },
  { id: 'long_pit', label: 'Buca Lunga', emoji: '🕳️🕳️', allowOrientation: true }
]

export const CELL_TYPE_INFO = {
  [CELL_TYPES.EMPTY]: { label: 'Vuoto', emoji: '⬜', color: '#2a2a4a' },
  [CELL_TYPES.FLOOR]: { label: 'Pavimento', emoji: '⬜', color: '#3a3a4a' },
  [CELL_TYPES.WALL]: { label: 'Muro', emoji: '🧱', color: '#5a4a3a' },
  [CELL_TYPES.DOOR_CLOSED]: { label: 'Porta chiusa', emoji: '🚪', color: '#8B4513' },
  [CELL_TYPES.DOOR_OPEN]: { label: 'Porta aperta', emoji: '🚪', color: '#A0522D' },
  [CELL_TYPES.DOOR_SECRET]: { label: 'Porta segreta', emoji: '🔒', color: '#556B2F' },
  [CELL_TYPES.STAIRS]: { label: 'Scale', emoji: '🪜', color: '#C0C0C0' },
  [CELL_TYPES.FURNITURE]: { label: 'Mobile', emoji: '🪑', color: '#8B5A2B' },
  [CELL_TYPES.TRAP]: { label: 'Trappola', emoji: '⚠️', color: '#8B0000' },
  [CELL_TYPES.HERO]: { label: 'Eroe', emoji: '⚔️', color: '#4a7cf5' },
  [CELL_TYPES.MONSTER]: { label: 'Mostro', emoji: '👹', color: '#aa4444' },
  [CELL_TYPES.ENTRANCE]: { label: 'Ingresso', emoji: '🌀', color: '#44aa44' },
  [CELL_TYPES.SPECIAL]: { label: 'Speciale', emoji: '📖', color: '#aa88ff' }
}

const STORAGE_KEY = 'heroquest_maps'

export const useMapStore = defineStore('map', () => {
  const maps = ref([])
  const currentMapId = ref(null)
  const currentMap = computed(() => maps.value.find(m => m.id === currentMapId.value) || null)

  function loadMaps() {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) maps.value = JSON.parse(stored)
    else {
      const demo = {
        id: 'demo', name: 'Mappa Demo', cols: 10, rows: 10,
        grid: Array(10).fill().map(() => Array(10).fill().map(() => ({ type: CELL_TYPES.FLOOR, details: null, markerId: null })))
      }
      maps.value = [demo]
      currentMapId.value = 'demo'
      saveMaps()
    }
  }
  function saveMaps() { localStorage.setItem(STORAGE_KEY, JSON.stringify(maps.value)) }
  function createNewMap(name, cols, rows) {
    const id = Date.now().toString()
    const grid = Array(rows).fill().map(() => Array(cols).fill().map(() => ({ type: CELL_TYPES.FLOOR, details: null, markerId: null })))
    maps.value.push({ id, name, cols, rows, grid })
    currentMapId.value = id
    saveMaps()
  }
  function loadMap(id) { currentMapId.value = id }
  function saveCurrentMap(newName) { if (currentMap.value) { currentMap.value.name = newName; saveMaps() } }
  function deleteMap(id) {
    const idx = maps.value.findIndex(m => m.id === id)
    if (idx !== -1) { maps.value.splice(idx, 1); if (currentMapId.value === id) currentMapId.value = maps.value[0]?.id || null; saveMaps() }
  }
  function resizeCurrentMap(newCols, newRows) {
    if (!currentMap.value) return
    const oldGrid = currentMap.value.grid
    const newGrid = Array(newRows).fill().map((_, r) => Array(newCols).fill().map((_, c) =>
      (r < oldGrid.length && c < oldGrid[0].length) ? { ...oldGrid[r][c] } : { type: CELL_TYPES.FLOOR, details: null, markerId: null }
    ))
    currentMap.value.grid = newGrid; currentMap.value.cols = newCols; currentMap.value.rows = newRows
    saveMaps()
  }
  function setCell(col, row, type, details = null, markerId = null) {
    if (!currentMap.value) return
    if (col >= 0 && col < currentMap.value.cols && row >= 0 && row < currentMap.value.rows) {
      currentMap.value.grid[row][col] = { type, details, markerId }
      saveMaps()
    }
  }
  function getMarkerAnchors() {
    if (!currentMap.value) return []
    const anchors = []
    for (let row = 0; row < currentMap.value.rows; row++) {
      for (let col = 0; col < currentMap.value.cols; col++) {
        const cell = currentMap.value.grid[row][col]
        if (cell.markerId !== undefined && cell.markerId !== null) {
          anchors.push({ id: cell.markerId, col, row })
        }
      }
    }
    return anchors
  }

  loadMaps()
  return { maps, currentMapId, currentMap, createNewMap, loadMap, saveCurrentMap, deleteMap, resizeCurrentMap, setCell, getMarkerAnchors }
})