import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const MARKER_CATEGORIES = {
  CORNER: 'corner',
  PLAYER: 'player',
  ENEMY: 'enemy',
  // FURNITURE rimosso
}

export const CORNER_ROLES = ['NO', 'NE', 'SO', 'SE']

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

// I mobili e le trappole vengono spostati in mapStore (tipi statici)
const STORAGE_KEY = 'aruco-game-markers'

export const useMarkersStore = defineStore('markers', () => {
  const registry = ref(loadFromStorage())

  const corners = computed(() => {
    const result = {}
    for (const [id, data] of Object.entries(registry.value)) {
      if (data.category === MARKER_CATEGORIES.CORNER) {
        result[data.role] = { ...data, id: Number(id) }
      }
    }
    return result
  })

  const allCornersAssigned = computed(() => CORNER_ROLES.every(r => corners.value[r]))

  function isKnown(markerId) {
    return markerId in registry.value
  }

  function register(markerId, markerData) {
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
        // Migrazione: rimuovi eventuali marker di tipo furniture
        let changed = false
        for (const [id, data] of Object.entries(parsed)) {
          if (data.category === 'furniture') {
            delete parsed[id]
            changed = true
          }
        }
        if (changed) saveToStorage()
        return parsed
      }
      return {}
    } catch {
      return {}
    }
  }

  return {
    registry,
    corners,
    allCornersAssigned,
    isKnown,
    register,
    unregister,
    clearAll,
    getMarker,
  }
})