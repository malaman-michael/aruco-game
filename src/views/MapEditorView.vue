<!-- src/views/MapEditorView.vue -->
<template>
  <div class="map-editor">
    <div class="editor-header">
      <button class="back-btn" @click="$router.push('/')">←</button>
      <h1>🗺️ Editor Mappa</h1>
      <div class="header-actions">
        <button class="action-btn" @click="saveMap">💾 Salva</button>
        <button class="action-btn" @click="exportMap">📤 Esporta</button>
        <button class="action-btn" @click="importMap">📥 Importa</button>
        <button class="action-btn" @click="printMap">🖨️ Stampa</button>
        <button class="action-btn" @click="showIdTable = true">📋 ID in uso</button>
        <input type="file" ref="fileInput" accept=".json" hidden @change="handleImport" />
      </div>
    </div>

    <div class="editor-body" v-if="mapStore.currentMap">
      <div class="sidebar">
        <!-- ========== GESTIONE MAPPE ========== -->
        <div class="map-management">
          <div class="map-header">🗺️ Mappe</div>
          <div class="map-list">
            <div
              v-for="map in mapStore.maps"
              :key="map.id"
              class="map-item"
              :class="{ active: mapStore.currentMapId === map.id }"
              @click="selectMap(map.id)"
            >
              <span class="map-name">{{ map.name }}</span>
              <span class="map-size">{{ map.cols }}×{{ map.rows }}</span>
              <button class="map-delete" @click.stop="deleteMap(map.id)" title="Cancella mappa">🗑</button>
            </div>
          </div>
          <div class="map-actions">
            <button class="btn-new-map" @click="showNewMapDialog = true">➕ Nuova</button>
            <button class="btn-rename" @click="renameCurrentMap" v-if="mapStore.currentMap">✏️ Rinomina</button>
          </div>
        </div>

        <!-- Dialog per nuova mappa -->
        <div v-if="showNewMapDialog" class="dialog-overlay" @click.self="showNewMapDialog = false">
          <div class="dialog-box">
            <h3>Nuova mappa</h3>
            <label>Nome: <input v-model="newMapName" placeholder="Nome mappa" /></label>
            <label>Colonne: <input type="number" v-model.number="newMapCols" min="2" max="40" /></label>
            <label>Righe: <input type="number" v-model.number="newMapRows" min="2" max="40" /></label>
            <div class="dialog-actions">
              <button class="btn-confirm" @click="createNewMap">Crea</button>
              <button class="btn-cancel" @click="showNewMapDialog = false">Annulla</button>
            </div>
          </div>
        </div>

        <!-- ========== FINE GESTIONE MAPPE ========== -->

        <!-- Gruppi oggetti -->
        <div class="object-groups">
          <div class="group">
            <div class="group-header" @click="toggleGroup('structures')">
              <span>🏗️ Strutture</span>
              <span class="toggle-icon">{{ expandedGroups.structures ? '▼' : '▶' }}</span>
            </div>
            <div v-if="expandedGroups.structures" class="group-items">
              <div
                v-for="item in structureItems"
                :key="item.id"
                class="object-item"
                :class="{ selected: selectedObject?.id === item.id }"
                @click="selectObject(item)"
              >
                <span class="item-emoji">{{ item.emoji }}</span>
                <span class="item-name">{{ item.label }}</span>
                <span class="item-size">{{ item.widthStud }}×{{ item.heightStud }}</span>
              </div>
            </div>
          </div>

          <div class="group">
            <div class="group-header" @click="toggleGroup('furniture')">
              <span>🪑 Mobile</span>
              <span class="toggle-icon">{{ expandedGroups.furniture ? '▼' : '▶' }}</span>
            </div>
            <div v-if="expandedGroups.furniture" class="group-items">
              <div
                v-for="item in furnitureItems"
                :key="item.id"
                class="object-item"
                :class="{ selected: selectedObject?.id === item.id }"
                @click="selectObject(item)"
              >
                <span class="item-emoji">{{ item.emoji }}</span>
                <span class="item-name">{{ item.label }}</span>
                <span class="item-size">{{ item.widthStud }}×{{ item.heightStud }}</span>
              </div>
            </div>
          </div>

          <div class="group">
            <div class="group-header" @click="toggleGroup('players')">
              <span>🧙 Giocatori</span>
              <span class="toggle-icon">{{ expandedGroups.players ? '▼' : '▶' }}</span>
            </div>
            <div v-if="expandedGroups.players" class="group-items">
              <div
                v-for="item in playerItems"
                :key="item.id"
                class="object-item"
                :class="{ selected: selectedObject?.id === item.id }"
                @click="selectObject(item)"
              >
                <span class="item-emoji">{{ item.emoji }}</span>
                <span class="item-name">{{ item.label }}</span>
                <span class="item-size">{{ item.widthStud }}×{{ item.heightStud }}</span>
              </div>
            </div>
          </div>

          <div class="group">
            <div class="group-header" @click="toggleGroup('enemies')">
              <span>💀 Nemici</span>
              <span class="toggle-icon">{{ expandedGroups.enemies ? '▼' : '▶' }}</span>
            </div>
            <div v-if="expandedGroups.enemies" class="group-items">
              <div
                v-for="item in enemyItems"
                :key="item.id"
                class="object-item"
                :class="{ selected: selectedObject?.id === item.id }"
                @click="selectObject(item)"
              >
                <span class="item-emoji">{{ item.emoji }}</span>
                <span class="item-name">{{ item.label }}</span>
                <span class="item-size">{{ item.widthStud }}×{{ item.heightStud }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Controlli rotazione -->
        <div class="rotation-controls" v-if="selectedObject">
          <button class="rotate-btn" @click="rotateObject">↻ Ruota ({{ rotation }}°)</button>
          <span class="size-hint">Dimensione: {{ getObjectCols() }}×{{ getObjectRows() }} celle</span>
        </div>

        <!-- Legenda -->
        <div class="legend">
          <div class="legend-item">
            <span class="legend-color" style="background: #3a3a4a"></span> Pavimento
          </div>
          <div class="legend-item">
            <span class="legend-color" style="background: #5a4a3a"></span> Muro
          </div>
          <div class="legend-item">
            <span class="legend-color" style="background: #8b4513"></span> Porta chiusa
          </div>
          <div class="legend-item">
            <span class="legend-color" style="background: #a0522d"></span> Porta aperta
          </div>
          <div class="legend-item">
            <span class="legend-color" style="background: #cd853f"></span> Mobile
          </div>
          <div class="legend-item">
            <span class="legend-color" style="background: #4a7cf5"></span> Eroe
          </div>
          <div class="legend-item">
            <span class="legend-color" style="background: #aa4444"></span> Mostro
          </div>
          <div class="legend-item">
            <span class="legend-color" style="background: #ffd700"></span> Ancora
          </div>
        </div>
      </div>

      <!-- Griglia mappa -->
      <div class="map-container">
        <div class="map-grid" :style="gridStyle">
          <div
            v-for="(row, r) in mapStore.currentMap.grid"
            :key="r"
            class="grid-row"
          >
            <div
              v-for="(cell, c) in row"
              :key="c"
              class="grid-cell"
              :class="getCellClasses(r, c)"
              :style="getCellStyle(cell)"
              @mouseenter="onCellHover(r, c)"
              @mouseleave="onCellLeave"
              @click="onCellClick(r, c)"
              @contextmenu.prevent="onCellRightClick(r, c)"
            >
              <span class="cell-emoji">
                <span class="cell-emoji-char">{{ getCellEmoji(cell).emoji }}</span>
                <span v-if="getCellEmoji(cell).id !== null" class="cell-id">{{ getCellEmoji(cell).id }}</span>
              </span>
              <!-- Tooltip anteprima -->
              <div v-if="hoverPos && selectedObject && isCellInPreview(r, c)" class="preview-tooltip">
                {{ getObjectCols() }}×{{ getObjectRows() }}
              </div>
            </div>
          </div>
        </div>
        <div class="map-info">
          <span>{{ mapStore.currentMap.name }} · {{ mapStore.currentMap.cols }}×{{ mapStore.currentMap.rows }}</span>
          <span v-if="selectedObject" class="selected-info">
            Selezione: {{ selectedObject.label }} ({{ getObjectCols() }}×{{ getObjectRows() }})
          </span>
        </div>
      </div>
    </div>

    <div v-else class="no-map">
      <p>Nessuna mappa selezionata. Crea una nuova mappa o caricane una esistente.</p>
      <button class="btn-primary" @click="showNewMapDialog = true">➕ Nuova mappa</button>
    </div>

    <!-- Pulsante flottante per modificare ID e tipo -->
    <button
      v-if="mapStore.currentMap"
      class="fab-edit"
      :class="{ active: editMode }"
      @click="toggleEditMode"
      title="Modifica elemento (clicca su una cella)"
    >
      ✏️
    </button>

    <!-- Dialog per modifica elemento -->
    <div v-if="editDialogVisible" class="dialog-overlay" @click.self="closeEditDialog">
      <div class="dialog-box">
        <h3>✏️ Modifica elemento</h3>
        <label>Tipo:
          <select v-model="editType">
            <option v-for="item in allItems" :key="item.id" :value="item.id">
              {{ item.emoji }} {{ item.label }}
            </option>
          </select>
        </label>
        <label>ID ArUco (0-249, lascia vuoto per nessun ID):
          <input type="number" v-model.number="editId" min="0" max="249" placeholder="es. 42" />
        </label>
        <div class="dialog-actions">
          <button class="btn-confirm" @click="applyEdit">Applica</button>
          <button class="btn-cancel" @click="closeEditDialog">Annulla</button>
        </div>
      </div>
    </div>

    <!-- Dialog: Tabella ID in uso -->
    <div v-if="showIdTable" class="dialog-overlay" @click.self="showIdTable = false">
      <div class="dialog-box dialog-large">
        <div class="modal-header">
          <h3>📋 ID ArUco in uso</h3>
          <button @click="showIdTable = false" aria-label="Chiudi">✕</button>
        </div>
        <div class="id-table-filters">
          <label>Filtra per tipo:
            <select v-model="idFilterType">
              <option value="all">Tutti</option>
              <option value="structure">Strutture</option>
              <option value="furniture">Mobili</option>
              <option value="player">Giocatori</option>
              <option value="enemy">Nemici</option>
              <option value="anchor">Ancore</option>
            </select>
          </label>
          <span class="id-count">{{ filteredIdEntries.length }} ID trovati</span>
        </div>
        <div class="id-table-wrap">
          <table class="id-table" v-if="filteredIdEntries.length">
            <thead>
              <tr>
                <th>ID</th>
                <th>Tipo</th>
                <th>Posizione</th>
                <th>Emoji</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="entry in filteredIdEntries" :key="entry.id + entry.col + entry.row">
                <td class="col-id">{{ entry.id }}</td>
                <td>{{ entry.typeLabel }}</td>
                <td>{{ entry.col }}, {{ entry.row }}</td>
                <td class="col-emoji">{{ entry.emoji }}</td>
              </tr>
            </tbody>
          </table>
          <div v-else class="empty-table">Nessun ID trovato con questo filtro.</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useMapStore, CELL_TYPES, CELL_TYPE_INFO, FURNITURE_STATIC_TYPES } from '../stores/mapStore.js'
import { useGameStore } from '../stores/gameStore.js'
import { useMarkersStore, PLAYER_TYPES, ENEMY_TYPES } from '../stores/markersStore.js'

const mapStore = useMapStore()
const gameStore = useGameStore()
const markersStore = useMarkersStore()
const fileInput = ref(null)

// ==================== DIMENSIONI OGGETTI ====================
const OBJECT_DIMENSIONS = {
  // Strutture
  'wall':        { widthStud: 1, heightStud: 1 },
  'door_closed': { widthStud: 1, heightStud: 1 },
  'door_open':   { widthStud: 1, heightStud: 1 },
  'door_secret': { widthStud: 1, heightStud: 1 },
  'trap':        { widthStud: 1, heightStud: 1 },
  'entrance':    { widthStud: 1, heightStud: 1 },
  'special':     { widthStud: 1, heightStud: 1 },
  'stairs':      { widthStud: 2, heightStud: 2 },
  'anchor':      { widthStud: 2, heightStud: 2 },  // ancora 2×2

  // Mobili
  'table':       { widthStud: 2, heightStud: 1 },
  'bookcase':    { widthStud: 2, heightStud: 1 },
  'chest':       { widthStud: 2, heightStud: 2 },

  // Giocatori (1×1)
  'warrior':     { widthStud: 1, heightStud: 1 },
  'dwarf':       { widthStud: 1, heightStud: 1 },
  'mage':        { widthStud: 1, heightStud: 1 },
  'rogue':       { widthStud: 1, heightStud: 1 },
  'paladin':     { widthStud: 1, heightStud: 1 },
  'ranger':      { widthStud: 1, heightStud: 1 },

  // Nemici (1×1)
  'skeleton':    { widthStud: 1, heightStud: 1 },
  'orc':         { widthStud: 1, heightStud: 1 },
  'barbarian':   { widthStud: 1, heightStud: 1 },
  'goblin':      { widthStud: 1, heightStud: 1 },
  'troll':       { widthStud: 1, heightStud: 1 },
  'dragon':      { widthStud: 1, heightStud: 1 },
}
const DEFAULT_DIMS = { widthStud: 2, heightStud: 2 }

// ==================== GRUPPI OGGETTI ====================
const STRUCTURE_TYPES = [
  { id: 'wall',        label: 'Muro',        emoji: '🧱' },
  { id: 'door_closed', label: 'Porta chiusa', emoji: '🔒' },
  { id: 'door_open',   label: 'Porta aperta', emoji: '🚪' },
  { id: 'door_secret', label: 'Porta segreta', emoji: '🚪👓' },
  { id: 'stairs',      label: 'Scale',       emoji: '🔃' },
  { id: 'trap',        label: 'Trappola',    emoji: '⚠️' },
  { id: 'entrance',    label: 'Ingresso',    emoji: '🌀' },
  { id: 'special',     label: 'Speciale',    emoji: '📖' },
  { id: 'anchor',      label: 'Ancora',      emoji: '📍' },   // ora è un oggetto normale
]

const structureItems = STRUCTURE_TYPES.map(t => ({
  ...t,
  widthStud: OBJECT_DIMENSIONS[t.id]?.widthStud ?? 1,
  heightStud: OBJECT_DIMENSIONS[t.id]?.heightStud ?? 1,
  category: 'structure',
}))

const furnitureItems = FURNITURE_STATIC_TYPES.map(t => ({
  ...t,
  widthStud: OBJECT_DIMENSIONS[t.id]?.widthStud ?? DEFAULT_DIMS.widthStud,
  heightStud: OBJECT_DIMENSIONS[t.id]?.heightStud ?? DEFAULT_DIMS.heightStud,
  category: 'furniture',
}))

const playerItems = PLAYER_TYPES.map(t => ({
  ...t,
  widthStud: OBJECT_DIMENSIONS[t.id]?.widthStud ?? DEFAULT_DIMS.widthStud,
  heightStud: OBJECT_DIMENSIONS[t.id]?.heightStud ?? DEFAULT_DIMS.heightStud,
  category: 'player',
}))

const enemyItems = ENEMY_TYPES.map(t => ({
  ...t,
  widthStud: OBJECT_DIMENSIONS[t.id]?.widthStud ?? DEFAULT_DIMS.widthStud,
  heightStud: OBJECT_DIMENSIONS[t.id]?.heightStud ?? DEFAULT_DIMS.heightStud,
  category: 'enemy',
}))

// Lista completa di tutti gli elementi per il selettore di modifica
const allItems = computed(() => [
  ...structureItems,
  ...furnitureItems,
  ...playerItems,
  ...enemyItems,
])

// ==================== STATO ====================
const expandedGroups = ref({
  structures: true,
  furniture: true,
  players: false,
  enemies: false,
})
const selectedObject = ref(null)
const rotation = ref(0)
const hoverPos = ref(null)
const arucoId = ref(null)       // ID corrente per il posizionamento

// Modalità modifica (✏️)
const editMode = ref(false)
const editDialogVisible = ref(false)
const editTarget = ref(null)    // { row, col, objectId? }
const editType = ref('')
const editId = ref(null)

// Stato per la creazione di nuove mappe
const showNewMapDialog = ref(false)
const newMapName = ref('')
const newMapCols = ref(10)
const newMapRows = ref(10)

// Stato per la tabella ID
const showIdTable = ref(false)
const idFilterType = ref('all')

// ==================== COMPUTED ====================
const gridStyle = computed(() => ({
  gridTemplateColumns: `repeat(${mapStore.currentMap?.cols || 10}, 1fr)`,
}))

// -------------------- ID TABLE --------------------
const idEntries = computed(() => {
  const map = mapStore.currentMap
  if (!map) return []
  const entries = []
  for (let row = 0; row < map.rows; row++) {
    for (let col = 0; col < map.cols; col++) {
      const cell = map.grid[row][col]
      if (cell.markerId !== undefined && cell.markerId !== null) {
        let typeLabel = ''
        let emoji = ''
        let category = ''
        if (cell.details) {
          category = cell.details.category || ''
          typeLabel = cell.details.label || cell.details.typeId || ''
          emoji = cell.details.emoji || ''
        } else {
          // caso legacy (dovrebbe essere raro)
          category = 'anchor'
          typeLabel = 'Ancora'
          emoji = '📍'
        }
        entries.push({
          id: cell.markerId,
          col,
          row,
          typeLabel,
          emoji,
          category,
        })
      }
    }
  }
  entries.sort((a,b) => a.id - b.id)
  return entries
})

const filteredIdEntries = computed(() => {
  if (idFilterType.value === 'all') return idEntries.value
  return idEntries.value.filter(e => e.category === idFilterType.value)
})

// ==================== GESTIONE MAPPE ====================
function selectMap(id) {
  mapStore.loadMap(id)
  selectedObject.value = null
  editMode.value = false
  editDialogVisible.value = false
  showIdTable.value = false
}

function deleteMap(id) {
  if (mapStore.maps.length <= 1) {
    alert('Non puoi cancellare l\'ultima mappa.')
    return
  }
  const map = mapStore.maps.find(m => m.id === id)
  if (!map) return
  if (confirm(`Cancellare la mappa "${map.name}"?`)) {
    mapStore.deleteMap(id)
  }
}

function renameCurrentMap() {
  if (!mapStore.currentMap) return
  const newName = prompt('Nuovo nome per la mappa:', mapStore.currentMap.name)
  if (newName && newName.trim() !== '') {
    mapStore.saveCurrentMap(newName.trim())
  }
}

function createNewMap() {
  const name = newMapName.value.trim()
  if (!name) {
    alert('Inserisci un nome per la mappa.')
    return
  }
  const cols = newMapCols.value
  const rows = newMapRows.value
  if (isNaN(cols) || isNaN(rows) || cols < 2 || rows < 2) {
    alert('Le dimensioni devono essere almeno 2x2.')
    return
  }
  mapStore.createNewMap(name, cols, rows)
  showNewMapDialog.value = false
  newMapName.value = ''
  newMapCols.value = 10
  newMapRows.value = 10
}

// ==================== METODI PRINCIPALI ====================
function toggleGroup(key) {
  expandedGroups.value[key] = !expandedGroups.value[key]
}

function selectObject(item) {
  if (editMode.value) toggleEditMode()
  selectedObject.value = item
  rotation.value = 0
  hoverPos.value = null
}

function rotateObject() {
  rotation.value = (rotation.value + 90) % 360
  if (hoverPos.value) {
    const { row, col } = hoverPos.value
    onCellHover(row, col)
  }
}

function getObjectCols() {
  if (!selectedObject.value) return 0
  let w = selectedObject.value.widthStud
  let h = selectedObject.value.heightStud
  if (rotation.value === 90 || rotation.value === 270) [w, h] = [h, w]
  return Math.max(1, Math.ceil(w / 2))
}

function getObjectRows() {
  if (!selectedObject.value) return 0
  let w = selectedObject.value.widthStud
  let h = selectedObject.value.heightStud
  if (rotation.value === 90 || rotation.value === 270) [w, h] = [h, w]
  return Math.max(1, Math.ceil(h / 2))
}

function getOccupiedCells(row, col) {
  const cols = getObjectCols()
  const rows = getObjectRows()
  const cells = []
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      cells.push({ row: row + r, col: col + c })
    }
  }
  return cells
}

function canPlace(row, col) {
  if (!selectedObject.value) return false
  const map = mapStore.currentMap
  if (!map) return false
  const cells = getOccupiedCells(row, col)
  for (const cell of cells) {
    if (cell.row < 0 || cell.row >= map.rows || cell.col < 0 || cell.col >= map.cols) return false
    const existing = map.grid[cell.row][cell.col]
    if (existing.type !== CELL_TYPES.EMPTY && existing.type !== CELL_TYPES.FLOOR) return false
    if (existing.details !== null) return false
    if (existing.markerId !== undefined && existing.markerId !== null) return false
  }
  return true
}

function isCellInPreview(row, col) {
  if (!hoverPos.value || !selectedObject.value) return false
  const cells = getOccupiedCells(hoverPos.value.row, hoverPos.value.col)
  return cells.some(c => c.row === row && c.col === col)
}

// ----- Verifica unicità ID ArUco -----
function isMarkerIdUsed(markerId, excludeRow = null, excludeCol = null) {
  const map = mapStore.currentMap
  if (!map) return false
  for (let row = 0; row < map.rows; row++) {
    for (let col = 0; col < map.cols; col++) {
      if (row === excludeRow && col === excludeCol) continue
      const cell = map.grid[row][col]
      if (cell.markerId !== undefined && cell.markerId !== null && cell.markerId === markerId) {
        return true
      }
    }
  }
  return false
}

// ----- Modalità modifica (✏️) -----
function toggleEditMode() {
  editMode.value = !editMode.value
  if (!editMode.value) {
    closeEditDialog()
  }
  if (editMode.value) {
    selectedObject.value = null
  }
}

function openEditDialog(row, col) {
  const map = mapStore.currentMap
  if (!map) return
  const cell = map.grid[row]?.[col]
  if (!cell) return
  if (cell.type === CELL_TYPES.EMPTY || cell.type === CELL_TYPES.FLOOR) {
    alert('Questa cella è vuota, non c\'è niente da modificare.')
    return
  }

  let objectId = cell.details?.objectId
  let currentTypeId = cell.details?.typeId || ''
  let currentMarkerId = cell.markerId !== undefined && cell.markerId !== null ? cell.markerId : null

  // se non ha dettagli ma ha markerId (caso legacy), trattalo come ancora
  if (!cell.details && cell.markerId !== undefined && cell.markerId !== null) {
    currentTypeId = 'anchor'
    // cerca objectId nelle celle con stesso markerId
    for (let r = 0; r < map.rows; r++) {
      for (let c = 0; c < map.cols; c++) {
        const other = map.grid[r][c]
        if (other.markerId === cell.markerId && other.details?.objectId) {
          objectId = other.details.objectId
          break
        }
      }
    }
  }

  editTarget.value = { row, col, objectId }
  editType.value = currentTypeId
  editId.value = currentMarkerId
  editDialogVisible.value = true
}

function closeEditDialog() {
  editDialogVisible.value = false
  editTarget.value = null
  editMode.value = false
}

function applyEdit() {
  const map = mapStore.currentMap
  if (!map || !editTarget.value) return

  const { row, col, objectId } = editTarget.value
  const newTypeId = editType.value
  const newId = (editId.value !== null && editId.value !== undefined && !isNaN(editId.value) && editId.value >= 0 && editId.value <= 249) ? editId.value : null

  const item = allItems.value.find(i => i.id === newTypeId)
  if (!item) {
    alert('Tipo non valido.')
    return
  }

  if (newId !== null && isMarkerIdUsed(newId, row, col)) {
    alert(`ID ${newId} già utilizzato in un'altra cella. Scegli un ID diverso.`)
    return
  }

  const typeMap = {
    structure: CELL_TYPES.FLOOR,
    furniture: CELL_TYPES.FURNITURE,
    player: CELL_TYPES.HERO,
    enemy: CELL_TYPES.MONSTER,
  }
  const baseType = typeMap[item.category] || CELL_TYPES.FURNITURE
  let finalType = baseType
  if (item.category === 'structure') {
    const typeMapStruct = {
      'wall': CELL_TYPES.WALL,
      'door_closed': CELL_TYPES.DOOR_CLOSED,
      'door_open': CELL_TYPES.DOOR_OPEN,
      'door_secret': CELL_TYPES.DOOR_SECRET,
      'stairs': CELL_TYPES.STAIRS,
      'trap': CELL_TYPES.TRAP,
      'entrance': CELL_TYPES.ENTRANCE,
      'special': CELL_TYPES.SPECIAL,
      'anchor': CELL_TYPES.FLOOR,
    }
    finalType = typeMapStruct[item.id] || CELL_TYPES.FLOOR
  }

  // Dettagli per tutti gli oggetti, anche per l'ancora
  const details = {
    category: item.category,
    typeId: item.id,
    label: item.label,
    emoji: item.emoji,
    widthStud: item.widthStud,
    heightStud: item.heightStud,
    rotation: rotation.value,
    objectId: objectId || (Date.now() + '_' + Math.random().toString(36).slice(2, 7)),
  }

  // Se abbiamo un objectId, aggiorna tutte le celle dello stesso oggetto
  if (objectId) {
    const cellsToUpdate = []
    for (let r = 0; r < map.rows; r++) {
      for (let c = 0; c < map.cols; c++) {
        if (map.grid[r][c].details?.objectId === objectId) {
          cellsToUpdate.push({ row: r, col: c })
        }
      }
    }
    if (cellsToUpdate.length > 0) {
      for (const pos of cellsToUpdate) {
        mapStore.setCell(pos.col, pos.row, finalType, details, newId)
      }
    } else {
      // fallback
      mapStore.setCell(col, row, finalType, details, newId)
    }
  } else {
    mapStore.setCell(col, row, finalType, details, newId)
  }

  closeEditDialog()
  editMode.value = false
}

// ----- Eventi mouse sulla griglia -----
function onCellHover(row, col) {
  if (selectedObject.value) {
    hoverPos.value = { row, col }
  }
}

function onCellLeave() {
  hoverPos.value = null
}

function onCellClick(row, col) {
  if (editMode.value) {
    openEditDialog(row, col)
    return
  }

  if (selectedObject.value) {
    const isWall = selectedObject.value.id === 'wall'
    let markerId = null

    // I muri non hanno ID
    if (!isWall) {
      let id = arucoId.value
      if (id === null || id === undefined || !Number.isInteger(id) || id < 0 || id > 249) {
        const input = prompt(`Inserisci ID ArUco per "${selectedObject.value.label}" (0-249):`, '')
        if (input === null) return
        id = parseInt(input, 10)
        if (isNaN(id) || id < 0 || id > 249) {
          alert('ID non valido. Deve essere un numero tra 0 e 249.')
          return
        }
        arucoId.value = id
      }
      if (isMarkerIdUsed(id)) {
        alert(`ID ${id} già utilizzato in un'altra cella. Scegli un ID diverso.`)
        return
      }
      markerId = id
    }

    if (canPlace(row, col)) {
      placeObject(row, col, markerId)
      if (!isWall) arucoId.value = null
    } else {
      alert('Impossibile posizionare: alcune celle sono già occupate o sono muri.')
    }
    return
  }

  // Se clicca su una cella vuota e non c'è selezione, non fare nulla
}

// ----- Gestione tasto destro per cancellare (CORRETTA) -----
function onCellRightClick(row, col) {
  const map = mapStore.currentMap
  if (!map) return
  const cell = map.grid[row]?.[col]
  if (!cell) return

  // Se è vuota o pavimento SENZA dettagli e SENZA markerId, esci
  if (cell.type === CELL_TYPES.EMPTY) return
  if (cell.type === CELL_TYPES.FLOOR && !cell.details && (cell.markerId === undefined || cell.markerId === null)) return

  // 1) Se ha objectId, cancella tutte le celle con lo stesso objectId
  if (cell.details?.objectId) {
    const objectId = cell.details.objectId
    const cellsToRemove = []
    for (let r = 0; r < map.rows; r++) {
      for (let c = 0; c < map.cols; c++) {
        if (map.grid[r][c].details?.objectId === objectId) {
          cellsToRemove.push({ row: r, col: c })
        }
      }
    }
    for (const pos of cellsToRemove) {
      mapStore.setCell(pos.col, pos.row, CELL_TYPES.FLOOR, null, null)
    }
    return
  }

  // 2) Se ha markerId ma senza objectId (legacy), cancella tutte le celle con lo stesso markerId
  if (cell.markerId !== undefined && cell.markerId !== null) {
    const markerId = cell.markerId
    const cellsToRemove = []
    for (let r = 0; r < map.rows; r++) {
      for (let c = 0; c < map.cols; c++) {
        if (map.grid[r][c].markerId === markerId) {
          cellsToRemove.push({ row: r, col: c })
        }
      }
    }
    for (const pos of cellsToRemove) {
      mapStore.setCell(pos.col, pos.row, CELL_TYPES.FLOOR, null, null)
    }
    return
  }

  // 3) Fallback: cancella solo questa cella
  mapStore.setCell(col, row, CELL_TYPES.FLOOR, null, null)
}

// ----- Posizionamento oggetti (con ID unico per tutte le celle) -----
function placeObject(row, col, markerId = null) {
  const map = mapStore.currentMap
  if (!map) return

  const cells = getOccupiedCells(row, col)
  const typeMap = {
    structure: CELL_TYPES.FLOOR,
    furniture: CELL_TYPES.FURNITURE,
    player: CELL_TYPES.HERO,
    enemy: CELL_TYPES.MONSTER,
  }
  const baseType = typeMap[selectedObject.value.category] || CELL_TYPES.FURNITURE
  let finalType = baseType
  if (selectedObject.value.category === 'structure') {
    const typeMapStruct = {
      'wall': CELL_TYPES.WALL,
      'door_closed': CELL_TYPES.DOOR_CLOSED,
      'door_open': CELL_TYPES.DOOR_OPEN,
      'door_secret': CELL_TYPES.DOOR_SECRET,
      'stairs': CELL_TYPES.STAIRS,
      'trap': CELL_TYPES.TRAP,
      'entrance': CELL_TYPES.ENTRANCE,
      'special': CELL_TYPES.SPECIAL,
      'anchor': CELL_TYPES.FLOOR,
    }
    finalType = typeMapStruct[selectedObject.value.id] || CELL_TYPES.FLOOR
  }

  // Dettagli per tutti gli oggetti (anche per l'ancora)
  const details = {
    category: selectedObject.value.category,
    typeId: selectedObject.value.id,
    label: selectedObject.value.label,
    emoji: selectedObject.value.emoji,
    widthStud: selectedObject.value.widthStud,
    heightStud: selectedObject.value.heightStud,
    rotation: rotation.value,
    objectId: Date.now() + '_' + Math.random().toString(36).slice(2, 7),
  }

  for (const cell of cells) {
    mapStore.setCell(cell.col, cell.row, finalType, details, markerId)
  }
  hoverPos.value = null
}

// ----- Funzioni helper per le classi delle celle -----
function getCellClasses(row, col) {
  const classes = []
  const map = mapStore.currentMap
  if (!map) return classes
  const cell = map.grid[row]?.[col]
  if (!cell) return classes

  if (cell.type === CELL_TYPES.WALL) classes.push('wall')
  else if (cell.type === CELL_TYPES.DOOR_CLOSED) classes.push('door-closed')
  else if (cell.type === CELL_TYPES.DOOR_OPEN) classes.push('door-open')
  else if (cell.type === CELL_TYPES.DOOR_SECRET) classes.push('door-secret')
  else if (cell.type === CELL_TYPES.STAIRS) classes.push('stairs')
  else if (cell.type === CELL_TYPES.TRAP) classes.push('trap')
  else if (cell.type === CELL_TYPES.FURNITURE) classes.push('furniture')
  else if (cell.type === CELL_TYPES.HERO) classes.push('hero')
  else if (cell.type === CELL_TYPES.MONSTER) classes.push('monster')
  else if (cell.type === CELL_TYPES.ENTRANCE) classes.push('entrance')
  else if (cell.type === CELL_TYPES.SPECIAL) classes.push('special')
  else classes.push('floor')

  if (cell.details !== null) classes.push('has-detail')
  if (cell.markerId !== undefined && cell.markerId !== null) classes.push('has-marker')

  if (editMode.value) {
    classes.push('edit-mode')
  }

  if (!editMode.value && hoverPos.value && selectedObject.value) {
    const cells = getOccupiedCells(hoverPos.value.row, hoverPos.value.col)
    const isHovered = cells.some(c => c.row === row && c.col === col)
    if (isHovered) {
      classes.push(canPlace(hoverPos.value.row, hoverPos.value.col) ? 'preview-ok' : 'preview-blocked')
    }
  }

  return classes
}

function getCellStyle(cell) {
  const base = { backgroundColor: '#2a2a4a' }
  if (!cell) return base

  // Colore speciale per le ancore (oro)
  if (cell.details?.category === 'anchor') {
    return { backgroundColor: '#ffd700', borderColor: '#ffaa00' }
  }

  const info = CELL_TYPE_INFO[cell.type]
  if (info) {
    base.backgroundColor = info.color
  }
  return base
}

// ==================== getCellEmoji ====================
function getCellEmoji(cell) {
  if (!cell) return { emoji: '', id: null }

  // Se ha dettagli, usa l'emoji dai dettagli
  if (cell.details?.emoji) {
    return {
      emoji: cell.details.emoji,
      id: cell.markerId !== undefined && cell.markerId !== null ? cell.markerId : null
    }
  }

  // Altrimenti emoji dal tipo di cella
  const info = CELL_TYPE_INFO[cell.type]
  return {
    emoji: info?.emoji || '',
    id: cell.markerId !== undefined && cell.markerId !== null ? cell.markerId : null
  }
}

// ----- Salvataggio, esportazione e importazione -----
function saveMap() {
  mapStore.saveCurrentMap(mapStore.currentMap.name)
  alert('Mappa salvata!')
}

function exportMap() {
  const data = {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    map: mapStore.currentMap,
  }
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `map-${mapStore.currentMap.name || 'unnamed'}.json`
  a.click()
  URL.revokeObjectURL(url)
}

function importMap() {
  fileInput.value.click()
}

function handleImport(event) {
  const file = event.target.files[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result)
      if (data.map && data.map.grid) {
        const newMap = {
          ...data.map,
          id: Date.now().toString(),
        }
        mapStore.maps.push(newMap)
        mapStore.currentMapId = newMap.id
        mapStore.saveMaps()
        alert('Mappa importata con successo!')
      } else {
        alert('Formato file non valido.')
      }
    } catch (err) {
      alert('Errore durante l\'importazione: ' + err.message)
    }
  }
  reader.readAsText(file)
  event.target.value = ''
}

// ==================== STAMPA ====================
function printMap() {
  const map = mapStore.currentMap
  if (!map) {
    alert('Nessuna mappa da stampare.')
    return
  }

  const rows = map.rows
  const cols = map.cols
  const grid = map.grid

  const printWindow = window.open('', '_blank', 'width=800,height=600')
  if (!printWindow) {
    alert('Impossibile aprire la finestra di stampa. Consentire i popup.')
    return
  }

  let html = `
    <html>
      <head>
        <title>Mappa: ${map.name}</title>
        <style>
          body { font-family: sans-serif; padding: 20px; background: white; color: black; }
          h1 { text-align: center; font-size: 24px; margin-bottom: 16px; }
          .grid {
            display: grid;
            grid-template-columns: repeat(${cols}, 60px);
            grid-template-rows: repeat(${rows}, 60px);
            gap: 2px;
            background: #ccc;
            border: 2px solid #333;
            width: fit-content;
            margin: 0 auto;
          }
          .cell {
            background: #f0f0f0;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            font-size: 24px;
            position: relative;
            padding: 2px;
          }
          .cell .marker-id {
            font-size: 10px;
            font-weight: bold;
            color: black;
            margin-top: 2px;
            background: rgba(255,255,255,0.6);
            padding: 0 2px;
            border-radius: 2px;
          }
          .cell .emoji {
            line-height: 1;
          }
          .cell.wall { background: #b0a090; }
          .cell.door-closed { background: #b8860b; }
          .cell.door-open { background: #d2b48c; }
          .cell.door-secret { background: #6b8e23; }
          .cell.furniture { background: #cd853f; }
          .cell.hero { background: #4a7cf5; color: white; }
          .cell.monster { background: #aa4444; color: white; }
          .cell.entrance { background: #44aa44; color: white; }
          .cell.special { background: #aa88ff; }
          .cell.stairs { background: #c0c0c0; }
          .cell.trap { background: #8b0000; color: white; }
          .cell.anchor { background: #ffd700; }  /* colore oro per le ancore */
          .cell.floor { background: #e0e0e0; }
          .legend {
            margin-top: 24px;
            text-align: center;
            font-size: 14px;
            display: flex;
            flex-wrap: wrap;
            justify-content: center;
            gap: 12px;
          }
          .legend-item { display: inline-flex; align-items: center; gap: 4px; }
          .legend-color { width: 20px; height: 20px; border: 1px solid #333; }
          .footer { margin-top: 20px; text-align: center; font-size: 12px; color: #666; }
          @media print {
            .no-print { display: none; }
            body { padding: 10px; }
            .grid { gap: 1px; }
          }
        </style>
      </head>
      <body>
        <h1>🗺️ ${map.name} (${cols}×${rows})</h1>
        <div class="grid">
  `

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cell = grid[r]?.[c] || { type: CELL_TYPES.EMPTY, details: null, markerId: null }
      let cellClass = 'cell'
      if (cell.type === CELL_TYPES.WALL) cellClass += ' wall'
      else if (cell.type === CELL_TYPES.DOOR_CLOSED) cellClass += ' door-closed'
      else if (cell.type === CELL_TYPES.DOOR_OPEN) cellClass += ' door-open'
      else if (cell.type === CELL_TYPES.DOOR_SECRET) cellClass += ' door-secret'
      else if (cell.type === CELL_TYPES.STAIRS) cellClass += ' stairs'
      else if (cell.type === CELL_TYPES.TRAP) cellClass += ' trap'
      else if (cell.type === CELL_TYPES.FURNITURE) cellClass += ' furniture'
      else if (cell.type === CELL_TYPES.HERO) cellClass += ' hero'
      else if (cell.type === CELL_TYPES.MONSTER) cellClass += ' monster'
      else if (cell.type === CELL_TYPES.ENTRANCE) cellClass += ' entrance'
      else if (cell.type === CELL_TYPES.SPECIAL) cellClass += ' special'
      else if (cell.details?.category === 'anchor') {
        cellClass += ' anchor'
      } else {
        cellClass += ' floor'
      }

      let emoji = ''
      if (cell.details?.emoji) {
        emoji = cell.details.emoji
      } else {
        const info = CELL_TYPE_INFO[cell.type]
        emoji = info?.emoji || ''
      }
      const markerId = cell.markerId !== undefined && cell.markerId !== null ? cell.markerId : ''

      html += `
        <div class="${cellClass}">
          <span class="emoji">${emoji}</span>
          ${markerId !== '' ? `<span class="marker-id">${markerId}</span>` : ''}
        </div>
      `
    }
  }

  html += `
        </div>
        <div class="legend">
          <div class="legend-item"><span class="legend-color" style="background:#e0e0e0;"></span> Pavimento</div>
          <div class="legend-item"><span class="legend-color" style="background:#b0a090;"></span> Muro</div>
          <div class="legend-item"><span class="legend-color" style="background:#b8860b;"></span> Porta chiusa</div>
          <div class="legend-item"><span class="legend-color" style="background:#d2b48c;"></span> Porta aperta</div>
          <div class="legend-item"><span class="legend-color" style="background:#6b8e23;"></span> Porta segreta</div>
          <div class="legend-item"><span class="legend-color" style="background:#cd853f;"></span> Mobile</div>
          <div class="legend-item"><span class="legend-color" style="background:#4a7cf5;"></span> Eroe</div>
          <div class="legend-item"><span class="legend-color" style="background:#aa4444;"></span> Mostro</div>
          <div class="legend-item"><span class="legend-color" style="background:#ffd700;"></span> Ancora</div>
        </div>
        <div class="footer">Stampato il ${new Date().toLocaleString()}</div>
      </body>
    </html>
  `

  printWindow.document.write(html)
  printWindow.document.close()
  printWindow.focus()
  printWindow.print()
}

// ==================== EVENTI TASTIERA ====================
function onKeydown(e) {
  if (e.key === 'r' || e.key === 'R') {
    e.preventDefault()
    rotateObject()
  }
  if (e.key === 'Escape') {
    if (editMode.value) toggleEditMode()
    if (showIdTable.value) showIdTable.value = false
  }
}

onMounted(() => {
  window.addEventListener('keydown', onKeydown)
  if (!mapStore.currentMap && mapStore.maps.length) {
    mapStore.loadMap(mapStore.maps[0].id)
  }
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown)
})
</script>

<style scoped>
/* (lo stile rimane invariato rispetto a quello già presente) */
.map-editor {
  min-height: 100vh;
  background: #0f0f1e;
  color: #eee;
  display: flex;
  flex-direction: column;
  padding: 1rem;
  position: relative;
}

.editor-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid #2a2a4a;
  flex-wrap: wrap;
}
.back-btn {
  background: none;
  border: none;
  color: #7c9ef5;
  font-size: 1.8rem;
  cursor: pointer;
}
h1 {
  margin: 0;
  font-size: 1.4rem;
  flex: 1;
}
.header-actions {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}
.action-btn {
  background: #2a2a4a;
  border: 1px solid #3a3a6a;
  border-radius: 8px;
  color: #ccc;
  padding: 0.4rem 0.8rem;
  cursor: pointer;
  font-size: 0.85rem;
  transition: background 0.2s;
}
.action-btn:hover {
  background: #3a3a6a;
}

.editor-body {
  display: flex;
  gap: 1.5rem;
  flex: 1;
  margin-top: 1rem;
  min-height: 0;
}

.sidebar {
  width: 280px;
  background: #1a1a2e;
  border-radius: 12px;
  padding: 1rem;
  overflow-y: auto;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  max-height: calc(100vh - 100px);
}

.map-management {
  background: #1a2a3a;
  border: 1px solid #3a5a7a;
  border-radius: 8px;
  padding: 0.6rem;
}
.map-header {
  font-weight: 600;
  font-size: 0.9rem;
  color: #7c9ef5;
  margin-bottom: 0.4rem;
}
.map-list {
  max-height: 150px;
  overflow-y: auto;
  margin-bottom: 0.4rem;
}
.map-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.25rem 0.4rem;
  border-radius: 4px;
  cursor: pointer;
  background: transparent;
  transition: background 0.1s;
}
.map-item:hover {
  background: #2a3a5a;
}
.map-item.active {
  background: #2a4a7a;
  border-left: 3px solid #4a7cf5;
}
.map-name {
  flex: 1;
  font-size: 0.85rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.map-size {
  font-size: 0.65rem;
  color: #888;
  margin-right: 0.4rem;
}
.map-delete {
  background: none;
  border: none;
  color: #ff6666;
  cursor: pointer;
  font-size: 0.8rem;
  padding: 0 0.2rem;
  opacity: 0.6;
}
.map-delete:hover {
  opacity: 1;
}
.map-actions {
  display: flex;
  gap: 0.4rem;
}
.btn-new-map, .btn-rename {
  flex: 1;
  background: #2a3a4a;
  border: 1px solid #3a5a6a;
  border-radius: 4px;
  color: #ccc;
  padding: 0.2rem 0.4rem;
  cursor: pointer;
  font-size: 0.75rem;
  text-align: center;
}
.btn-new-map:hover, .btn-rename:hover {
  background: #3a5a6a;
}

.dialog-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}
.dialog-box {
  background: #1a1a2e;
  border-radius: 12px;
  padding: 1.5rem;
  width: 320px;
  max-width: 90%;
  border: 1px solid #3a5a7a;
}
.dialog-box h3 {
  margin: 0 0 1rem;
  color: #7c9ef5;
}
.dialog-box label {
  display: block;
  margin-bottom: 0.5rem;
  font-size: 0.85rem;
  color: #aaa;
}
.dialog-box select,
.dialog-box input {
  width: 100%;
  background: #2a2a4a;
  border: 1px solid #3a3a6a;
  border-radius: 4px;
  color: #eee;
  padding: 0.3rem 0.5rem;
  margin-top: 0.2rem;
}
.dialog-actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 1rem;
}
.btn-confirm, .btn-cancel {
  flex: 1;
  padding: 0.4rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.85rem;
}
.btn-confirm {
  background: #4a7cf5;
  color: white;
}
.btn-cancel {
  background: #3a3a6a;
  color: #ccc;
}

.dialog-large {
  width: 90%;
  max-width: 800px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
}
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}
.modal-header h3 {
  margin: 0;
  color: #7c9ef5;
}
.modal-header button {
  background: none;
  border: none;
  color: #aaa;
  font-size: 1.5rem;
  cursor: pointer;
}
.id-table-filters {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.8rem;
  flex-wrap: wrap;
  gap: 0.5rem;
}
.id-table-filters label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #ccc;
  font-size: 0.9rem;
}
.id-table-filters select {
  background: #2a2a4a;
  border: 1px solid #3a3a6a;
  border-radius: 4px;
  color: #eee;
  padding: 0.2rem 0.5rem;
}
.id-count {
  color: #aaa;
  font-size: 0.9rem;
}
.id-table-wrap {
  overflow-y: auto;
  flex: 1;
}
.id-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
}
.id-table thead {
  position: sticky;
  top: 0;
  background: #1a2a3a;
  z-index: 1;
}
.id-table th {
  padding: 0.6rem 0.5rem;
  text-align: left;
  color: #7c9ef5;
  border-bottom: 2px solid #3a3a6a;
}
.id-table td {
  padding: 0.5rem;
  border-bottom: 1px solid #2a2a4a;
}
.id-table .col-id {
  font-family: monospace;
  color: #ffd700;
}
.id-table .col-emoji {
  font-size: 1.4rem;
  text-align: center;
}
.id-table tr:hover {
  background: #2a2a4a;
}

.object-groups {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.group {
  border: 1px solid #2a2a4a;
  border-radius: 8px;
  overflow: hidden;
}
.group-header {
  background: #2a2a4a;
  padding: 0.4rem 0.6rem;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  font-weight: 600;
  font-size: 0.9rem;
}
.group-header:hover {
  background: #3a3a6a;
}
.toggle-icon {
  color: #888;
}
.group-items {
  padding: 0.2rem 0;
  max-height: 200px;
  overflow-y: auto;
}
.object-item {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.3rem 0.6rem;
  cursor: pointer;
  border-radius: 4px;
  transition: background 0.1s;
}
.object-item:hover {
  background: #2a2a4a;
}
.object-item.selected {
  background: #4a6a9a;
}
.item-emoji {
  font-size: 1.2rem;
  width: 1.8rem;
  text-align: center;
}
.item-name {
  flex: 1;
  font-size: 0.85rem;
}
.item-size {
  font-size: 0.7rem;
  color: #888;
  background: #2a2a4a;
  padding: 0.1rem 0.4rem;
  border-radius: 4px;
}

.rotation-controls {
  background: #2a2a4a;
  border-radius: 8px;
  padding: 0.6rem;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  align-items: center;
}
.rotate-btn {
  background: #4a6a9a;
  border: none;
  border-radius: 6px;
  color: white;
  padding: 0.4rem 0.8rem;
  cursor: pointer;
  font-size: 0.9rem;
  width: 100%;
}
.rotate-btn:hover {
  background: #5a7aaa;
}
.size-hint {
  font-size: 0.8rem;
  color: #aaa;
}

.legend {
  border-top: 1px solid #2a2a4a;
  padding-top: 0.5rem;
  margin-top: auto;
}
.legend-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.75rem;
  color: #aaa;
  padding: 0.1rem 0;
}
.legend-color {
  width: 20px;
  height: 20px;
  border-radius: 4px;
  border: 1px solid #3a3a6a;
}

.map-container {
  flex: 1;
  background: #1a1a2e;
  border-radius: 12px;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.map-grid {
  display: grid;
  gap: 3px;
  flex: 1;
  background: #2a2a4a;
  padding: 3px;
  border-radius: 8px;
  overflow: auto;
}
.grid-row {
  display: contents;
}
.grid-cell {
  background: #2a2a4a;
  aspect-ratio: 1 / 1;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 2px;
  position: relative;
  cursor: pointer;
  transition: background 0.15s;
  min-width: 24px;
  min-height: 24px;
}

.cell-emoji {
  display: flex;
  flex-direction: column;
  align-items: center;
  line-height: 1;
  pointer-events: none;
}

.cell-emoji-char {
  font-size: 1.1rem;
}

.cell-id {
  font-size: x-small;
  color: #fff;
  background-color: black;
  font-weight: bold;
  margin-top: -2px;
}

.grid-cell.wall { background: #5a4a3a; }
.grid-cell.door-closed { background: #8B4513; }
.grid-cell.door-open { background: #A0522D; }
.grid-cell.door-secret { background: #556B2F; }
.grid-cell.stairs { background: #C0C0C0; }
.grid-cell.trap { background: #8B0000; }
.grid-cell.furniture { background: #8B5A2B; }
.grid-cell.hero { background: #4a7cf5; }
.grid-cell.monster { background: #aa4444; }
.grid-cell.entrance { background: #44aa44; }
.grid-cell.special { background: #aa88ff; }
.grid-cell.floor { background: #3a3a4a; }
.grid-cell.has-detail { border: 2px solid #ffd700; }
.grid-cell.has-marker { border: 2px solid #ffaa00; }

.grid-cell.edit-mode {
  background: rgba(255, 215, 0, 0.15) !important;
  border: 2px dashed #ffd700 !important;
}

.grid-cell.preview-ok {
  background: rgba(74, 124, 245, 0.6) !important;
  border: 3px solid #4a7cf5 !important;
}
.grid-cell.preview-blocked {
  background: rgba(255, 0, 0, 0.5) !important;
  border: 3px solid #ff4444 !important;
}

.preview-tooltip {
  position: absolute;
  bottom: 2px;
  right: 2px;
  font-size: 0.5rem;
  background: rgba(0,0,0,0.7);
  color: #fff;
  padding: 0 3px;
  border-radius: 3px;
  pointer-events: none;
  white-space: nowrap;
}

.map-info {
  margin-top: 0.5rem;
  display: flex;
  justify-content: space-between;
  font-size: 0.8rem;
  color: #888;
}
.selected-info {
  color: #7c9ef5;
}

.no-map {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: #1a1a2e;
  border-radius: 12px;
  padding: 2rem;
  gap: 1rem;
}
.no-map p {
  color: #aaa;
}
.btn-primary {
  background: #4a7cf5;
  border: none;
  border-radius: 10px;
  color: white;
  padding: 0.6rem 1.2rem;
  cursor: pointer;
  font-size: 1rem;
}
.btn-primary:hover {
  background: #5c8ef5;
}

.fab-edit {
  position: fixed;
  bottom: 30px;
  right: 30px;
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: #2a2a4a;
  color: #ccc;
  border: 2px solid #3a3a6a;
  font-size: 1.8rem;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(0,0,0,0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  z-index: 100;
  user-select: none;
}
.fab-edit:hover {
  transform: scale(1.05);
  background: #3a3a6a;
}
.fab-edit.active {
  background: #c9701a;
  border-color: #ffd700;
  color: #fff;
  box-shadow: 0 0 20px rgba(255, 215, 0, 0.4);
}
.fab-edit.active:hover {
  background: #d9802a;
}

@media (max-width: 768px) {
  .editor-body {
    flex-direction: column;
  }
  .sidebar {
    width: 100%;
    max-height: 300px;
  }
  .map-info {
    flex-direction: column;
    align-items: center;
    gap: 0.2rem;
  }
  .fab-edit {
    bottom: 20px;
    right: 20px;
    width: 50px;
    height: 50px;
    font-size: 1.5rem;
  }
  .dialog-large {
    width: 95%;
    max-height: 90vh;
  }
  .id-table-filters {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>