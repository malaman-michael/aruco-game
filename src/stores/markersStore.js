import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const MARKER_CATEGORIES = {
  CORNER: 'corner',
  PLAYER: 'player',
  ENEMY: 'enemy',
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

  // ========== FUNZIONI PER LE MASCHERE ==========
  /**
   * Crea una maschera vuota (tutte celle false) per le dimensioni griglia date.
   * La maschera ha dimensioni (2*rows+1) x (2*cols+1).
   */
  function createEmptyMask(cols, rows) {
    const maskRows = rows * 2 + 1
    const maskCols = cols * 2 + 1
    return Array(maskRows).fill().map(() => Array(maskCols).fill(false))
  }

  /**
   * Maschera circolare con raggio specificato (in celle).
   */
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
    mask[centerRow][centerCol] = false // la cella centro (se stessa) non è raggiungibile
    return mask
  }

  /**
   * Maschera a croce (orizzontale e verticale) con distanza massima.
   */
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

  /**
   * Maschera "tutto intorno" (tutte le celle abilitate eccetto la cella centrale).
   */
  function createFullMask(cols, rows) {
    const maskCols = cols * 2 + 1
    const maskRows = rows * 2 + 1
    const mask = Array(maskRows).fill().map(() => Array(maskCols).fill(true))
    mask[rows][cols] = false
    return mask
  }

  /**
   * Restituisce una maschera predefinita in base alla categoria.
   * @param {string} category - 'player', 'enemy', 'corner'
   * @param {number} cols - numero di colonne della griglia
   * @param {number} rows - numero di righe della griglia
   */
  function getDefaultMaskForCategory(category, cols, rows) {
    switch (category) {
      case MARKER_CATEGORIES.PLAYER:
        return createCircularMask(3, cols, rows)   // raggio 3 celle
      case MARKER_CATEGORIES.ENEMY:
        return createCrossMask(4, cols, rows)      // croce fino a distanza 4
      default:
        return createEmptyMask(cols, rows)
    }
  }

  /**
   * Aggiorna una maschera (LOS o LOF) per un marker.
   */
  function updateMask(markerId, maskType, maskArray) {
    if (registry.value[markerId]) {
      registry.value[markerId][maskType] = maskArray
      saveToStorage()
    }
  }

  /**
   * Ridimensiona tutte le maschere dei marker (tranne gli angoli) in base alle nuove dimensioni della griglia.
   * Utile quando l'utente cambia la dimensione della griglia in configurazione.
   */
  function resizeAllMasks(newCols, newRows) {
    for (const [id, data] of Object.entries(registry.value)) {
      if (data.category === MARKER_CATEGORIES.CORNER) continue
      const newMask = getDefaultMaskForCategory(data.category, newCols, newRows)
      data.losMask = newMask
      data.lofMask = newMask
    }
    saveToStorage()
  }
  // =============================================

  function isKnown(markerId) {
    return markerId in registry.value
  }

  /**
   * Registra un nuovo marker.
   * Le proprietà opzionali losMask e lofMask, se non fornite, vengono generate automaticamente
   * in base alla categoria e alle dimensioni della griglia (passate come parametri aggiuntivi).
   * @param {number} markerId
   * @param {object} markerData - contiene category, role, label, emoji, description, ecc.
   * @param {number} gridCols - (opzionale) numero di colonne per generare maschere
   * @param {number} gridRows - (opzionale) numero di righe per generare maschere
   */
  function register(markerId, markerData, gridCols = 10, gridRows = 10) {
    // Se non vengono fornite maschere, le generiamo in base alla categoria
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
        // Migrazione: rimuovi eventuali marker di tipo furniture e aggiungi maschere mancanti
        for (const [id, data] of Object.entries(parsed)) {
          if (data.category === 'furniture') {
            delete parsed[id]
            changed = true
            continue
          }
          // Se le maschere non esistono, crea delle vuote (dimensioni placeholder)
          if (!data.losMask) {
            // Nota: non conosciamo le dimensioni correnti della griglia, usiamo un placeholder 10x10
            data.losMask = createEmptyMask(10, 10)
            data.lofMask = createEmptyMask(10, 10)
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
    updateMask,
    resizeAllMasks,
    createEmptyMask,
    createCircularMask,
    createCrossMask,
    createFullMask,
    getDefaultMaskForCategory,
  }
})