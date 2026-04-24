<template>
  <div class="map-editor">
    <!-- Header -->
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
      <!-- Sidebar sinistra: elenco mappe -->
      <div class="sidebar">
        <div class="sidebar-header">
          <h3>Mappe salvate</h3>
          <button class="btn-new" @click="createNewMapHandler">➕ Nuova</button>
        </div>
        <div class="map-list">
          <div
            v-for="map in mapStore.maps"
            :key="map.id"
            class="map-item"
            :class="{ active: currentMapId === map.id }"
            @click="selectMap(map.id)"
          >
            <div class="map-info">
              <span class="map-name">{{ map.name }}</span>
              <span class="map-size">{{ map.cols }}×{{ map.rows }}</span>
            </div>
            <button class="btn-delete" @click.stop="deleteMapHandler(map.id)">🗑</button>
          </div>
          <p v-if="mapStore.maps.length === 0" class="no-maps">Nessuna mappa. Crea una nuova mappa.</p>
        </div>
      </div>

      <!-- Area editor (visibile solo se c'è una mappa corrente) -->
      <div class="editor-area" v-if="currentMap">
        <!-- Nome mappa e dimensioni -->
        <div class="map-header">
          <input
            type="text"
            v-model="mapName"
            placeholder="Nome mappa"
            class="map-name-input"
            @blur="saveCurrentMapHandler"
          />
          <div class="size-controls">
            <div class="size-input">
              <label>Colonne</label>
              <input type="number" v-model.number="tempCols" min="4" max="20" />
            </div>
            <div class="size-input">
              <label>Righe</label>
              <input type="number" v-model.number="tempRows" min="4" max="20" />
            </div>
            <button class="btn-primary" @click="applyResize">Applica</button>
          </div>
        </div>

        <!-- Palette strumenti (tipi base) -->
        <div class="tool-palette">
          <div
            v-for="(info, type) in CELL_TYPE_INFO"
            :key="type"
            class="tool-item"
            :class="{ active: selectedType === type }"
            @click="selectBaseType(type)"
          >
            <span class="tool-emoji">{{ info.emoji }}</span>
            <span class="tool-label">{{ info.label }}</span>
          </div>
        </div>

        <!-- Sotto-palette per sottotipi (solo per PLAYER, ENEMY, FURNITURE) -->
        <div v-if="hasSubtypes" class="subtype-palette">
          <div class="subtype-header">
            <span>Scegli tipo specifico:</span>
          </div>
          <div class="subtype-list">
            <div
              v-for="sub in currentSubtypes"
              :key="sub.id"
              class="subtype-item"
              :class="{ active: selectedSubtype?.id === sub.id }"
              @click="selectedSubtype = sub"
            >
              <span class="subtype-emoji">{{ sub.emoji }}</span>
              <span class="subtype-label">{{ sub.label }}</span>
            </div>
          </div>
        </div>

        <!-- Griglia editabile -->
        <div class="grid-container">
          <div class="grid-wrapper">
            <div
              v-for="(row, r) in currentMap.grid"
              :key="r"
              class="grid-row"
            >
              <div
                v-for="(cell, c) in row"
                :key="c"
                class="grid-cell"
                :style="{ backgroundColor: getCellColor(cell.type) }"
                @click="setCellHandler(c, r)"
                @contextmenu.prevent="setCellHandler(c, r, CELL_TYPES.EMPTY, null)"
              >
                <span class="cell-emoji">{{ getCellEmoji(cell) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Placeholder se nessuna mappa caricata -->
      <div v-else class="no-map-selected">
        <p>Seleziona una mappa esistente o creane una nuova.</p>
        <button class="btn-primary" @click="createNewMapHandler">➕ Crea nuova mappa</button>
      </div>
    </div>

    <!-- Input file nascosto per l'importazione JSON -->
    <input
      type="file"
      ref="fileInput"
      accept=".json"
      style="display: none"
      @change="onFileSelected"
    />
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useMapStore, CELL_TYPES, CELL_TYPE_INFO } from '../stores/mapStore.js'
import { 
  useMarkersStore, 
  MARKER_CATEGORIES, 
  PLAYER_TYPES, 
  ENEMY_TYPES, 
  FURNITURE_TYPES 
} from '../stores/markersStore.js'

const mapStore = useMapStore()
const markersStore = useMarkersStore() // non usato direttamente ma importato per coerenza

const mapName = ref('')
const tempCols = ref(10)
const tempRows = ref(10)
const selectedType = ref(CELL_TYPES.WALL)
const selectedSubtype = ref(null)   // oggetto sottotipo { id, label, emoji }
const currentMapId = ref(null)

// Riferimento all'input file nascosto
const fileInput = ref(null)

const currentMap = computed(() => mapStore.currentMap)

// Determina se il tipo corrente ha sottotipi
const hasSubtypes = computed(() => {
  return [CELL_TYPES.PLAYER, CELL_TYPES.ENEMY, CELL_TYPES.FURNITURE].includes(selectedType.value)
})

// Restituisce la lista di sottotipi per il tipo corrente
const currentSubtypes = computed(() => {
  switch (selectedType.value) {
    case CELL_TYPES.PLAYER:
      return PLAYER_TYPES
    case CELL_TYPES.ENEMY:
      return ENEMY_TYPES
    case CELL_TYPES.FURNITURE:
      return FURNITURE_TYPES
    default:
      return []
  }
})

// Seleziona un tipo base, resetta il sottotipo e imposta un default se necessario
function selectBaseType(type) {
  selectedType.value = type
  if (hasSubtypes.value && currentSubtypes.value.length > 0) {
    selectedSubtype.value = currentSubtypes.value[0]
  } else {
    selectedSubtype.value = null
  }
}

// Ottiene l'emoji da visualizzare in una cella (priorità a details)
function getCellEmoji(cell) {
  if (cell.details?.emoji) {
    return cell.details.emoji
  }
  return CELL_TYPE_INFO[cell.type]?.emoji || '⬜'
}

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

function selectMap(mapId) {
  mapStore.loadMap(mapId)
}

function createNewMapHandler() {
  const name = prompt('Nome della nuova mappa:', 'Nuova Mappa')
  if (name) {
    mapStore.createNewMap(name, 10, 10)
  }
}

function saveCurrentMapHandler() {
  if (!currentMap.value) return
  mapStore.saveCurrentMap(mapName.value)
  alert('Mappa salvata!')
}

function deleteMapHandler(mapId) {
  if (confirm('Eliminare questa mappa?')) {
    mapStore.deleteMap(mapId)
  }
}

function applyResize() {
  if (!currentMap.value) return
  mapStore.resizeCurrentMap(tempCols.value, tempRows.value)
}

// Imposta una cella con tipo e dettagli
function setCellHandler(col, row, forcedType = null, forcedDetails = null) {
  if (!currentMap.value) return
  
  let type, details
  
  if (forcedType !== null) {
    // Usa i valori forzati (es. da click destro)
    type = forcedType
    details = forcedDetails
  } else {
    type = selectedType.value
    // Se il tipo ha sottotipi e ne abbiamo selezionato uno, costruisci i dettagli
    if (hasSubtypes.value && selectedSubtype.value) {
      // Determina la categoria in base al tipo base
      let category
      switch (type) {
        case CELL_TYPES.PLAYER:
          category = MARKER_CATEGORIES.PLAYER
          break
        case CELL_TYPES.ENEMY:
          category = MARKER_CATEGORIES.ENEMY
          break
        case CELL_TYPES.FURNITURE:
          category = MARKER_CATEGORIES.FURNITURE
          break
        default:
          category = null
      }
      details = {
        category: category,
        typeId: selectedSubtype.value.id,
        label: selectedSubtype.value.label,
        emoji: selectedSubtype.value.emoji
      }
    } else {
      details = null
    }
  }
  
  mapStore.setCell(col, row, type, details)
}

function getCellColor(type) {
  return CELL_TYPE_INFO[type]?.color || '#2a2a4a'
}

// ========== FUNZIONI EXPORT / IMPORT ==========

function exportAllMaps() {
  if (!mapStore.maps.length) {
    alert('Nessuna mappa da esportare.')
    return
  }

  const exportData = {
    version: '1.0',
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

function triggerFileImport() {
  fileInput.value.click()
}

async function onFileSelected(event) {
  const file = event.target.files[0]
  if (!file) return

  fileInput.value.value = ''

  const confirmed = confirm(
    '⚠️ ATTENZIONE: l\'importazione sovrascriverà tutte le mappe attualmente presenti. Continuare?'
  )
  if (!confirmed) return

  try {
    const text = await file.text()
    const data = JSON.parse(text)

    if (!data.maps || !Array.isArray(data.maps)) {
      throw new Error('File JSON non valido: manca l\'array "maps".')
    }

    if (data.version && data.version !== '1.0') {
      if (!confirm(`Il file è della versione ${data.version}. Potrebbe non essere completamente compatibile. Importare comunque?`)) {
        return
      }
    }

    const validMaps = []
    for (const map of data.maps) {
      if (!isValidMap(map)) {
        console.warn('Mappa ignorata (dati non validi):', map)
        continue
      }
      validMaps.push(map)
    }

    if (validMaps.length === 0) {
      throw new Error('Nessuna mappa valida trovata nel file.')
    }

    mapStore.$patch({
      maps: validMaps,
      currentMap: null
    })

    if (validMaps.length > 0) {
      mapStore.loadMap(validMaps[0].id)
    }

    alert(`Importazione completata! Importate ${validMaps.length} mappe.`)

  } catch (err) {
    console.error(err)
    alert(`Errore durante l'importazione: ${err.message}`)
  }
}

function isValidMap(map) {
  if (!map || typeof map !== 'object') return false
  if (!map.id || typeof map.id !== 'string' && typeof map.id !== 'number') return false
  if (!map.name || typeof map.name !== 'string') return false
  if (typeof map.cols !== 'number' || map.cols < 1 || map.cols > 20) return false
  if (typeof map.rows !== 'number' || map.rows < 1 || map.rows > 20) return false
  if (!Array.isArray(map.grid) || map.grid.length !== map.rows) return false

  for (let r = 0; r < map.rows; r++) {
    const row = map.grid[r]
    if (!Array.isArray(row) || row.length !== map.cols) return false
    for (let c = 0; c < map.cols; c++) {
      const cell = row[c]
      if (typeof cell !== 'object' || cell === null || !cell.type) return false
      if (!(cell.type in CELL_TYPE_INFO)) return false
      // details è opzionale, può essere qualsiasi oggetto
    }
  }
  return true
}

// ========== FINE FUNZIONI EXPORT/IMPORT ==========

</script>

<style scoped>
/* Stili esistenti... */
.map-editor {
  min-height: 100vh;
  background: #0f0f1e;
  color: #eee;
  display: flex;
  flex-direction: column;
  padding: 1rem;
}
.editor-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
}
h1 {
  margin: 0;
  font-size: 1.4rem;
  flex: 1;
}
.back-btn {
  background: none;
  border: none;
  color: #7c9ef5;
  font-size: 1.5rem;
  cursor: pointer;
  padding: 0.2rem 0.5rem;
}
.header-actions {
  display: flex;
  gap: 0.5rem;
}
.icon-btn {
  background: #2a2a4a;
  border: none;
  color: #ccc;
  font-size: 1.2rem;
  padding: 0.4rem 0.8rem;
  border-radius: 8px;
  cursor: pointer;
}
.editor-layout {
  display: flex;
  gap: 1.5rem;
  flex: 1;
  overflow: hidden;
}
.sidebar {
  width: 260px;
  background: #1a1a2e;
  border-radius: 12px;
  padding: 1rem;
  display: flex;
  flex-direction: column;
}
.sidebar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}
.sidebar-header h3 {
  margin: 0;
  font-size: 1rem;
  color: #aaa;
}
.btn-new {
  background: #4a7cf5;
  color: #fff;
  border: none;
  border-radius: 6px;
  padding: 0.3rem 0.8rem;
  font-size: 0.8rem;
  cursor: pointer;
}
.map-list {
  flex: 1;
  overflow-y: auto;
}
.map-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #2a2a4a;
  border-radius: 8px;
  padding: 0.5rem 0.8rem;
  margin-bottom: 0.5rem;
  cursor: pointer;
  border: 1px solid transparent;
  transition: all 0.15s;
}
.map-item:hover {
  background: #3a3a5a;
}
.map-item.active {
  border-color: #4a7cf5;
  background: #2a2a5a;
}
.map-info {
  display: flex;
  flex-direction: column;
}
.map-name {
  font-weight: 500;
}
.map-size {
  font-size: 0.7rem;
  color: #888;
}
.btn-delete {
  background: none;
  border: none;
  color: #ff8888;
  cursor: pointer;
  font-size: 1rem;
  padding: 0.2rem;
}
.no-maps {
  color: #666;
  text-align: center;
  padding: 1rem;
}
.editor-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.map-header {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  margin-bottom: 1rem;
}
.map-name-input {
  background: #2a2a4a;
  border: 1px solid #3a3a6a;
  border-radius: 8px;
  color: #eee;
  padding: 0.5rem 1rem;
  font-size: 1.2rem;
  width: 250px;
}
.size-controls {
  display: flex;
  align-items: flex-end;
  gap: 1rem;
}
.size-input {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}
.size-input label {
  font-size: 0.8rem;
  color: #aaa;
}
.size-input input {
  background: #2a2a4a;
  border: 1px solid #3a3a6a;
  border-radius: 6px;
  color: #eee;
  padding: 0.4rem;
  width: 60px;
}
.tool-palette {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 1rem;
}
.tool-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  background: #1a1a2e;
  border: 2px solid #3a3a6a;
  border-radius: 10px;
  padding: 0.5rem 0.8rem;
  cursor: pointer;
  transition: all 0.15s;
  min-width: 70px;
}
.tool-item.active {
  border-color: #4a7cf5;
  background: #2a2a5a;
}
.tool-emoji {
  font-size: 1.8rem;
}
.tool-label {
  font-size: 0.7rem;
  color: #aaa;
  margin-top: 0.2rem;
}
/* Nuovi stili per la sotto-palette */
.subtype-palette {
  background: #1a1a2e;
  border-radius: 12px;
  padding: 0.75rem;
  margin-bottom: 1rem;
  border: 1px solid #3a3a6a;
}
.subtype-header {
  font-size: 0.8rem;
  color: #aaa;
  margin-bottom: 0.5rem;
}
.subtype-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}
.subtype-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  background: #2a2a4a;
  border: 2px solid #3a3a6a;
  border-radius: 8px;
  padding: 0.4rem 0.8rem;
  cursor: pointer;
  transition: all 0.15s;
  min-width: 60px;
}
.subtype-item.active {
  border-color: #4a7cf5;
  background: #2a2a5a;
}
.subtype-emoji {
  font-size: 1.5rem;
}
.subtype-label {
  font-size: 0.7rem;
  color: #ccc;
  margin-top: 0.2rem;
}
.grid-container {
  flex: 1;
  overflow: auto;
  background: #0a0a14;
  border-radius: 12px;
  padding: 1rem;
}
.grid-wrapper {
  display: inline-block;
}
.grid-row {
  display: flex;
}
.grid-cell {
  width: 48px;
  height: 48px;
  border: 1px solid #3a3a6a;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: transform 0.1s;
}
.grid-cell:hover {
  transform: scale(1.02);
  border-color: #7c9ef5;
  z-index: 1;
}
.cell-emoji {
  font-size: 1.5rem;
  filter: drop-shadow(0 1px 2px rgba(0,0,0,0.5));
}
.no-map-selected {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #888;
}
.btn-primary {
  background: #4a7cf5;
  color: #fff;
  border: none;
  border-radius: 8px;
  padding: 0.6rem 1.2rem;
  cursor: pointer;
  margin-top: 1rem;
}

/* Responsive */
.editor-layout {
  flex-direction: column;
  gap: 1rem;
}

@media (min-width: 768px) {
  .editor-layout {
    flex-direction: row;
  }
}

.sidebar {
  width: 100%;
  max-height: 200px;
  overflow-y: auto;
}

@media (min-width: 768px) {
  .sidebar {
    width: 260px;
    max-height: none;
  }
}

.map-header {
  flex-direction: column;
  align-items: flex-start;
  gap: 1rem;
}

@media (min-width: 640px) {
  .map-header {
    flex-direction: row;
    align-items: center;
  }
}

.map-name-input {
  width: 100%;
}

@media (min-width: 640px) {
  .map-name-input {
    width: 250px;
  }
}

.size-controls {
  flex-wrap: wrap;
}

.grid-container {
  overflow: auto;
  -webkit-overflow-scrolling: touch;
  padding: 0.5rem;
}

.grid-cell {
  width: 40px;
  height: 40px;
}

@media (min-width: 640px) {
  .grid-cell {
    width: 48px;
    height: 48px;
  }
}

.cell-emoji {
  font-size: 1.2rem;
}

@media (min-width: 640px) {
  .cell-emoji {
    font-size: 1.5rem;
  }
}

.tool-palette {
  justify-content: flex-start;
  overflow-x: auto;
  padding-bottom: 0.5rem;
  -webkit-overflow-scrolling: touch;
  flex-wrap: nowrap;
}

@media (min-width: 640px) {
  .tool-palette {
    flex-wrap: wrap;
    overflow-x: visible;
  }
}

.subtype-list {
  flex-wrap: nowrap;
  overflow-x: auto;
  padding-bottom: 0.5rem;
}

@media (min-width: 640px) {
  .subtype-list {
    flex-wrap: wrap;
    overflow-x: visible;
  }
}
</style>