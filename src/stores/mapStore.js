import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { v4 as uuidv4 } from 'uuid'

export const CELL_TYPES = {
  EMPTY: 'empty',
  WALL: 'wall',
  DOOR: 'door',
  MONSTER_SPAWN: 'monster_spawn',
  PLAYER_SPAWN: 'player_spawn',
}

export const CELL_TYPE_INFO = {
  [CELL_TYPES.EMPTY]: { label: 'Vuoto', emoji: '⬜', color: '#2a2a4a' },
  [CELL_TYPES.WALL]: { label: 'Muro', emoji: '🧱', color: '#6a4a2a' },
  [CELL_TYPES.DOOR]: { label: 'Porta', emoji: '🚪', color: '#4a3a1a' },
  [CELL_TYPES.MONSTER_SPAWN]: { label: 'Mostro', emoji: '👹', color: '#6a2a2a' },
  [CELL_TYPES.PLAYER_SPAWN]: { label: 'Giocatore', emoji: '🧙', color: '#2a4a6a' },
}

const STORAGE_KEY = 'aruco-maps-list'

export const useMapStore = defineStore('map', () => {
  const maps = ref([])
  const currentMap = ref(null)

  function loadMaps() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        maps.value = JSON.parse(raw)
      } else {
        maps.value = []
      }
    } catch {
      maps.value = []
    }
  }

  function saveMapsToStorage() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(maps.value))
  }

  function createNewMap(name, cols = 10, rows = 10) {
    const newGrid = []
    for (let r = 0; r < rows; r++) {
      const row = []
      for (let c = 0; c < cols; c++) {
        row.push(CELL_TYPES.EMPTY)
      }
      newGrid.push(row)
    }
    const map = {
      id: uuidv4(),
      name,
      cols,
      rows,
      grid: newGrid,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    maps.value.push(map)
    saveMapsToStorage()
    currentMap.value = map
    return map
  }

  function loadMap(mapId) {
    const map = maps.value.find(m => m.id === mapId)
    if (map) {
      currentMap.value = JSON.parse(JSON.stringify(map))
    }
    return currentMap.value
  }

  function saveCurrentMap(name) {
    if (!currentMap.value) return null
    const now = new Date().toISOString()
    const mapData = {
      ...currentMap.value,
      name: name || currentMap.value.name,
      updatedAt: now,
    }
    const existingIndex = maps.value.findIndex(m => m.id === mapData.id)
    if (existingIndex !== -1) {
      maps.value[existingIndex] = mapData
    } else {
      mapData.createdAt = mapData.createdAt || now
      maps.value.push(mapData)
    }
    saveMapsToStorage()
    currentMap.value = mapData
    return mapData
  }

  function deleteMap(mapId) {
    maps.value = maps.value.filter(m => m.id !== mapId)
    if (currentMap.value?.id === mapId) {
      currentMap.value = null
    }
    saveMapsToStorage()
  }

  function setCell(col, row, type) {
    if (!currentMap.value) return
    if (col >= 0 && col < currentMap.value.cols && row >= 0 && row < currentMap.value.rows) {
      currentMap.value.grid[row][col] = type
    }
  }

  function getCell(col, row) {
    if (!currentMap.value) return CELL_TYPES.EMPTY
    return currentMap.value.grid[row]?.[col] || CELL_TYPES.EMPTY
  }

  function resizeCurrentMap(newCols, newRows) {
    if (!currentMap.value) return
    const oldGrid = currentMap.value.grid
    const newGrid = []
    for (let r = 0; r < newRows; r++) {
      const row = []
      for (let c = 0; c < newCols; c++) {
        if (r < oldGrid.length && c < oldGrid[0].length) {
          row.push(oldGrid[r][c])
        } else {
          row.push(CELL_TYPES.EMPTY)
        }
      }
      newGrid.push(row)
    }
    currentMap.value.grid = newGrid
    currentMap.value.cols = newCols
    currentMap.value.rows = newRows
    currentMap.value.updatedAt = new Date().toISOString()
  }

  loadMaps()

  return {
    maps,
    currentMap,
    createNewMap,
    loadMap,
    saveCurrentMap,
    deleteMap,
    setCell,
    getCell,
    resizeCurrentMap,
  }
})