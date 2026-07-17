// src/stores/markersStore.js
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const MARKER_CATEGORIES = {
  PLAYER: 'player',
  ENEMY: 'enemy',
  // CORNER rimosso
}

export const PLAYER_TYPES = [
  { id: 'warrior', label: 'Guerriero', emoji: '⚔️' },
  { id: 'dwarf', label: 'Nano', emoji: '🪓' },
  { id: 'mage', label: 'Mago', emoji: '🧙' },
  { id: 'rogue', label: 'Ladro', emoji: '🗡️' },
  { id: 'paladin', label: 'Paladino', emoji: '🛡️' },
  { id: 'ranger', label: 'Ranger', emoji: '🏹' },
]

export const ENEMY_TYPES = [
  { id: 'skeleton', label: 'Scheletro', emoji: '💀' },
  { id: 'orc', label: 'Orco', emoji: '👹' },
  { id: 'barbarian', label: 'Barbaro', emoji: '🪓' },
  { id: 'goblin', label: 'Goblin', emoji: '👺' },
  { id: 'troll', label: 'Troll', emoji: '🧟' },
  { id: 'dragon', label: 'Drago', emoji: '🐉' },
]

const STORAGE_KEY = 'aruco-game-markers'

export const useMarkersStore = defineStore('markers', () => {
  const registry = ref(loadFromStorage())

  function createEmptyMask(cols, rows) {
    const maskRows = rows * 2 + 1
    const maskCols = cols * 2 + 1
    return Array(maskRows).fill().map(() => Array(maskCols).fill(false))
  }

  function createCircularMask(radius, cols, rows) {
    const maskCols = cols * 2 + 1
    const maskRows = rows * 2 + 1
    const centerCol = cols
    const centerRow = rows
    const mask = Array(maskRows).fill().map(() => Array(maskCols).fill(false))
    for (let r = 0; r < maskRows; r++) {
      for (let c = 0; c < maskCols; c++) {
        const dx = c - centerCol
        const dy = r - centerRow
        if (Math.sqrt(dx*dx + dy*dy) <= radius) {
          mask[r][c] = true
        }
      }
    }
    mask[centerRow][centerCol] = false
    return mask
  }

  function createCrossMask(distance, cols, rows) {
    const maskCols = cols * 2 + 1
    const maskRows = rows * 2 + 1
    const centerCol = cols
    const centerRow = rows
    const mask = Array(maskRows).fill().map(() => Array(maskCols).fill(false))
    for (let d = -distance; d <= distance; d++) {
      if (d === 0) continue
      const r = centerRow + d
      const c = centerCol + d
      if (r >= 0 && r < maskRows) mask[r][centerCol] = true
      if (c >= 0 && c < maskCols) mask[centerRow][c] = true
    }
    return mask
  }

  function createFullMask(cols, rows) {
    const maskCols = cols * 2 + 1
    const maskRows = rows * 2 + 1
    const mask = Array(maskRows).fill().map(() => Array(maskCols).fill(true))
    mask[rows][cols] = false
    return mask
  }

  function getDefaultMaskForCategory(category, cols, rows) {
    switch (category) {
      case MARKER_CATEGORIES.PLAYER:
        return createCircularMask(3, cols, rows)
      case MARKER_CATEGORIES.ENEMY:
        return createCrossMask(4, cols, rows)
      default:
        return createEmptyMask(cols, rows)
    }
  }

  function updateMask(markerId, maskType, maskArray) {
    if (registry.value[markerId]) {
      registry.value[markerId][maskType] = maskArray
      saveToStorage()
    }
  }

  function resizeAllMasks(newCols, newRows) {
    for (const [id, data] of Object.entries(registry.value)) {
      const newMask = getDefaultMaskForCategory(data.category, newCols, newRows)
      data.losMask = newMask
      data.lofMask = newMask
    }
    saveToStorage()
  }

  function isKnown(markerId) {
    return markerId in registry.value
  }

  function register(markerId, markerData, gridCols = 10, gridRows = 10) {
    if (!markerData.losMask) {
      markerData.losMask = getDefaultMaskForCategory(markerData.category, gridCols, gridRows)
    }
    if (!markerData.lofMask) {
      markerData.lofMask = getDefaultMaskForCategory(markerData.category, gridCols, gridRows)
    }
    registry.value[markerId] = markerData
    saveToStorage()
  }

  function unregister(markerId) {
    delete registry.value[markerId]
    saveToStorage()
  }

  function clearAll() {
    registry.value = {}
    saveToStorage()
  }

  function getMarker(markerId) {
    return registry.value[markerId] ?? null
  }

  function saveToStorage() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(registry.value))
  }

  function loadFromStorage() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        let changed = false
        const filtered = {}
        for (const [id, data] of Object.entries(parsed)) {
          // Ignora i vecchi marker di tipo corner
          if (data.category === 'corner') {
            changed = true
            continue
          }
          // Assicura che le maschere esistano
          if (!data.losMask) {
            data.losMask = createEmptyMask(10, 10)
            data.lofMask = createEmptyMask(10, 10)
            changed = true
          }
          filtered[id] = data
        }
        if (changed) {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered))
        }
        return filtered
      }
      return {}
    } catch {
      return {}
    }
  }

  return {
    registry,
    isKnown,
    register,
    unregister,
    clearAll,
    getMarker,
    updateMask,
    resizeAllMasks,
    createEmptyMask,
    createCircularMask,
    createCrossMask,
    createFullMask,
    getDefaultMaskForCategory,
  }
})