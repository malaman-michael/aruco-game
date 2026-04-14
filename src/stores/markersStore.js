import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

// Tipi di marker disponibili
export const MARKER_CATEGORIES = {
  CORNER: 'corner',
  PLAYER: 'player',
  ENEMY: 'enemy',
  FURNITURE: 'furniture',
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

export const FURNITURE_TYPES = [
  { id: 'door_open', label: 'Porta aperta', emoji: '🚪' },
  { id: 'door_closed', label: 'Porta chiusa', emoji: '🔒' },
  { id: 'chest', label: 'Forziere', emoji: '📦' },
  { id: 'trap', label: 'Trappola', emoji: '⚠️' },
  { id: 'altar', label: 'Altare', emoji: '🏛️' },
]

const STORAGE_KEY = 'aruco-game-markers'

export const useMarkersStore = defineStore('markers', () => {
  // Map: markerId (number) → { category, role, typeId, label, emoji }
  const registry = ref(loadFromStorage())

  // Marker angoli (4 corner) con la loro posizione assegnata (NO/NE/SO/SE)
  const corners = computed(() => {
    const result = {}
    for (const [id, data] of Object.entries(registry.value)) {
      if (data.category === MARKER_CATEGORIES.CORNER) {
        result[data.role] = { ...data, id: Number(id) }
      }
    }
    return result
  })

  const allCornersAssigned = computed(() => {
    return CORNER_ROLES.every(r => corners.value[r])
  })

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
      return raw ? JSON.parse(raw) : {}
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