<template>
  <div class="map-editor">
    <!-- Header uguale ... -->
    <div class="editor-header">
      <button class="back-btn" @click="$router.push('/')">←</button>
      <h1>Editor Mappe</h1>
      <div class="header-actions">
        <button class="icon-btn" @click="saveCurrentMapHandler" title="Salva mappa corrente">💾</button>
        <button class="icon-btn" @click="exportAllMaps" title="Esporta tutte le mappe in JSON">📤</button>
        <button class="icon-btn" @click="triggerFileImport" title="Importa mappe da file JSON">📥</button>
      </div>
    </div>

    <div class="editor-layout">
      <!-- Sidebar sinistra: elenco mappe (identica) -->
      <div class="sidebar"> ... </div>

      <!-- Area editor -->
      <div class="editor-area" v-if="currentMap">
        <div class="map-header"> ... </div>

        <!-- Palette strumenti: categorie principali -->
        <div class="tool-palette">
          <div
            v-for="(info, type) in CELL_TYPE_INFO"
            :key="type"
            class="tool-item"
            :class="{ active: selectedCategory === type }"
            @click="selectCategory(type)"
          >
            <span class="tool-emoji">{{ info.emoji }}</span>
            <span class="tool-label">{{ info.label }}</span>
          </div>
        </div>

        <!-- Sottomenu per dettagli (se la categoria ha sottotipi) -->
        <div v-if="currentSubtypes.length > 0" class="subtype-palette">
          <div
            v-for="sub in currentSubtypes"
            :key="sub.id"
            class="subtype-item"
            :class="{ active: selectedSubtype?.id === sub.id }"
            @click="selectSubtype(sub)"
          >
            <span class="sub-emoji">{{ sub.emoji }}</span>
            <span class="sub-label">{{ sub.label }}</span>
          </div>
        </div>

        <!-- Griglia editabile -->
        <div class="grid-container">
          <div class="grid-wrapper">
            <div v-for="(row, r) in currentMap.grid" :key="r" class="grid-row">
              <div
                v-for="(cell, c) in row"
                :key="c"
                class="grid-cell"
                :style="{ backgroundColor: getCellColor(cell.type) }"
                @click="setCellWithDetails(c, r)"
                @contextmenu.prevent="setCellWithDetails(c, r, CELL_TYPES.EMPTY, null)"
              >
                <span class="cell-emoji">{{ getCellEmoji(cell) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-else class="no-map-selected">...</div>
    </div>

    <input type="file" ref="fileInput" accept=".json" style="display: none" @change="onFileSelected" />
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useMapStore, CELL_TYPES, CELL_TYPE_INFO } from '../stores/mapStore.js'
import {
  MARKER_CATEGORIES,
  PLAYER_TYPES,
  ENEMY_TYPES,
  FURNITURE_TYPES,
} from '../stores/markersStore.js'

const mapStore = useMapStore()

// Stato dell'editor
const mapName = ref('')
const tempCols = ref(10)
const tempRows = ref(10)
const currentMapId = ref(null)

// Nuova selezione: categoria + sottotipo
const selectedCategory = ref(CELL_TYPES.WALL)
const selectedSubtype = ref(null)

const fileInput = ref(null)

const currentMap = computed(() => mapStore.currentMap)

// Mappa da categoria a elenco di sottotipi
const subtypeMap = {
  [CELL_TYPES.PLAYER]: PLAYER_TYPES,
  [CELL_TYPES.ENEMY]: ENEMY_TYPES,
  [CELL_TYPES.FURNITURE]: FURNITURE_TYPES,
}

const currentSubtypes = computed(() => {
  return subtypeMap[selectedCategory.value] || []
})

watch(currentMap, (newMap) => {
  if (newMap) {
    mapName.value = newMap.name
    tempCols.value = newMap.cols
    tempRows.value = newMap.rows
    currentMapId.value = newMap.id
  } else {
    mapName.value = ''
    currentMapId.value = null
  }
}, { immediate: true })

function selectCategory(category) {
  selectedCategory.value = category
  // Reset sottotipo selezionato
  selectedSubtype.value = null
}

function selectSubtype(sub) {
  selectedSubtype.value = sub
}

function getCellEmoji(cell) {
  if (!cell) return '❓'
  if (cell.details && cell.details.emoji) {
    return cell.details.emoji
  }
  return CELL_TYPE_INFO[cell.type]?.emoji || '⬜'
}

function getCellColor(type) {
  return CELL_TYPE_INFO[type]?.color || '#2a2a4a'
}

function setCellWithDetails(col, row, forcedCategory = null, forcedDetails = null) {
  if (!currentMap.value) return
  let category = forcedCategory !== null ? forcedCategory : selectedCategory.value
  let details = forcedDetails !== null ? forcedDetails : (selectedSubtype.value ? { ...selectedSubtype.value, category } : null)

  // Se la categoria ha sottotipi ma nessun sottotipo selezionato, non fare nulla (o usa default)
  if (subtypeMap[category] && !details && forcedDetails === null) {
    alert(`Seleziona un tipo specifico per ${CELL_TYPE_INFO[category].label}`)
    return
  }

  mapStore.setCell(col, row, category, details)
}

// Salvataggio, resize, delete, selectMap ... (invariati)
function selectMap(mapId) { mapStore.loadMap(mapId) }
function createNewMapHandler() { /* ... */ }
function saveCurrentMapHandler() { /* ... */ }
function deleteMapHandler(mapId) { /* ... */ }
function applyResize() { /* ... */ }

// ========== EXPORT/IMPORT aggiornati ==========
function exportAllMaps() {
  if (!mapStore.maps.length) {
    alert('Nessuna mappa da esportare.')
    return
  }
  const exportData = {
    version: '2.0', // nuova versione con celle complesse
    maps: mapStore.maps,
    exportedAt: new Date().toISOString()
  }
  const dataStr = JSON.stringify(exportData, null, 2)
  const blob = new Blob([dataStr], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `map-editor-export-${new Date().toISOString().slice(0, 19)}.json`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

function triggerFileImport() { fileInput.value.click() }

async function onFileSelected(event) {
  const file = event.target.files[0]
  if (!file) return
  fileInput.value.value = ''

  const confirmed = confirm('⚠️ ATTENZIONE: l\'importazione sovrascriverà tutte le mappe attuali. Continuare?')
  if (!confirmed) return

  try {
    const text = await file.text()
    const data = JSON.parse(text)

    if (!data.maps || !Array.isArray(data.maps)) {
      throw new Error('File JSON non valido: manca l\'array "maps".')
    }

    // Se versione 1.0 -> converte le vecchie celle in { type }
    let validMaps = []
    if (data.version === '1.0') {
      validMaps = data.maps.map(map => ({
        ...map,
        grid: map.grid.map(row =>
          row.map(cell => {
            if (typeof cell === 'object' && cell.type) return cell
            return { type: cell, details: null }
          })
        )
      }))
    } else {
      validMaps = data.maps
    }

    // Validazione base
    for (const map of validMaps) {
      if (!isValidMap(map)) throw new Error(`Mappa "${map.name}" non valida.`)
    }

    mapStore.$patch({ maps: validMaps, currentMapId: null })
    if (validMaps.length) mapStore.loadMap(validMaps[0].id)

    alert(`Importazione completata! Importate ${validMaps.length} mappe.`)
  } catch (err) {
    console.error(err)
    alert(`Errore durante l'importazione: ${err.message}`)
  }
}

function isValidMap(map) {
  if (!map.id || !map.name) return false
  if (typeof map.cols !== 'number' || typeof map.rows !== 'number') return false
  if (!Array.isArray(map.grid) || map.grid.length !== map.rows) return false
  for (let r = 0; r < map.rows; r++) {
    const row = map.grid[r]
    if (!Array.isArray(row) || row.length !== map.cols) return false
    for (let c = 0; c < map.cols; c++) {
      const cell = row[c]
      if (!cell || typeof cell !== 'object' || !(cell.type in CELL_TYPE_INFO)) return false
      // Opzionale: controlla che i details siano coerenti con il tipo
    }
  }
  return true
}
</script>

<style scoped>
/* Stili esistenti + nuovo stile per subtype-palette */
.subtype-palette {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 1rem;
  background: #1a1a2e;
  padding: 0.5rem;
  border-radius: 8px;
}
.subtype-item {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  background: #2a2a4a;
  padding: 0.3rem 0.6rem;
  border-radius: 20px;
  cursor: pointer;
  border: 1px solid #3a3a6a;
}
.subtype-item.active {
  border-color: #4a7cf5;
  background: #2a2a5a;
}
.sub-emoji { font-size: 1.2rem; }
.sub-label { font-size: 0.8rem; color: #ccc; }
</style>