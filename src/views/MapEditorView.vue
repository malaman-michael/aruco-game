<template>
  <div class="map-editor">
    <div class="editor-header">
      <div class="header-left">
        <button class="back-btn" @click="$router?.push('/')">←</button>
        <h1>Editor Mappe - HeroQuest</h1>
      </div>
      <div class="header-actions">
        <button class="icon-btn" @click="toggleSidebar" :title="sidebarCollapsed ? 'Mostra mappe salvate' : 'Nascondi mappe salvate'">
          ☰
        </button>
        <button class="icon-btn" @click="toggleLegend" :title="legendCollapsed ? 'Mostra legenda' : 'Nascondi legenda'">
          📐
        </button>
        <button class="icon-btn" @click="saveCurrentMap" title="Salva mappa corrente">💾</button>
        <button class="icon-btn" @click="exportAllMaps" title="Esporta mappe">📤</button>
        <!-- Pulsanti stampa separati -->
        <button class="icon-btn" @click="printLegendOnly" title="Stampa legenda">📋</button>
        <button class="icon-btn" @click="printGridOnly" title="Stampa griglia">🗺️</button>
        <button class="icon-btn" @click="triggerFileImport" title="Importa mappe">📥</button>
      </div>
    </div>

    <div class="editor-body">
      <!-- Sidebar (collassabile) -->
      <div v-show="!sidebarCollapsed" class="sidebar">
        <div class="sidebar-header">
          <h3>Mappe salvate</h3>
          <button class="btn-new" @click="createNewMap">➕ Nuova</button>
        </div>
        <div class="map-list">
          <div
            v-for="map in maps"
            :key="map.id"
            class="map-item"
            :class="{ active: currentMapId === map.id }"
            @click="selectMap(map.id)"
          >
            <div class="map-info">
              <span class="map-name">{{ map.name }}</span>
              <span class="map-size">{{ map.cols }}×{{ map.rows }}</span>
            </div>
            <button class="btn-delete" @click.stop="deleteMap(map.id)">🗑</button>
          </div>
          <p v-if="maps.length === 0" class="no-maps">Nessuna mappa. Crea una nuova mappa.</p>
        </div>

        <div class="marker-panel">
          <h4>🎯 Associa Marker ArUco</h4>
          <div class="marker-controls">
            <label>ID Marker (0-250):</label>
            <input type="number" v-model.number="selectedMarkerId" min="0" max="250" />
            <button class="btn-small" @click="assignMarkerToSelectedCell">Applica</button>
            <button class="btn-small" @click="removeMarkerFromSelectedCell">Rimuovi</button>
          </div>
          <div class="selected-cell-info">
            <span>Cella selezionata:</span>
            <strong v-if="selectedCell">{{ selectedCell.x }}, {{ selectedCell.y }}</strong>
            <span v-else>nessuna</span>
            <button class="btn-small" @click="startCellSelection">🔍 Seleziona</button>
          </div>
          <div v-if="selectionMode" class="selection-mode-msg">
            ⚡ Modalità selezione attiva. Clicca su una cella.
          </div>
          <div class="marker-hint">
            💡 I marker servono per l'omografia.<br>
            Associane uno a una cella (sfondo rosso) per usarla come ancora.<br>
            <strong>Le ancore ArUco sono sempre 2×2 stud (una cella intera).</strong>
          </div>
        </div>
      </div>

      <!-- Area principale -->
      <div class="main-area" v-if="currentMap">
        <div class="map-header">
          <input
            type="text"
            v-model="mapName"
            placeholder="Nome mappa"
            class="map-name-input"
            @blur="saveCurrentMap"
          />
          <div class="size-controls">
            <div class="size-input"><label>Colonne</label><input type="number" v-model.number="tempCols" min="4" :max="MAX_SIZE" /></div>
            <div class="size-input"><label>Righe</label><input type="number" v-model.number="tempRows" min="4" :max="MAX_SIZE" /></div>
            <button class="btn-primary" @click="applyResize">Ridimensiona</button>
          </div>
        </div>

        <!-- Legenda (collassabile) -->
        <div v-show="!legendCollapsed" class="legend-panel">
          <div class="legend-title">📐 Legenda dimensioni (stud)</div>
          <div class="legend-grid">
            <div class="legend-column" v-for="(group, idx) in legendGroups" :key="idx">
              <div class="legend-group-title">{{ group.title }}</div>
              <div v-for="item in group.items" :key="item.id" class="legend-item">
                <span class="legend-emoji">{{ item.emoji }}</span>
                <span class="legend-label">{{ item.label }}</span>
                <span class="legend-size">{{ item.size }}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="tool-palette">
          <div class="tool-category">
            <div class="cat-title">📦 Base</div>
            <div class="cat-items">
              <div
                v-for="(info, type) in BASE_TYPE_INFO"
                :key="type"
                class="tool-item"
                :class="{ active: selectedEntity?.type === type && !selectedEntity?.subtype }"
                @click="selectBaseType(type)"
              >
                <span class="tool-emoji">{{ info.emoji }}</span><span class="tool-label">{{ info.label }}</span>
              </div>
            </div>
          </div>
          <div class="tool-category"><div class="cat-title">⚔️ Eroi</div><div class="cat-items"><div v-for="hero in HEROES" :key="hero.id" class="tool-item" :class="{ active: selectedEntity?.subtype?.id === hero.id }" @click="selectEntity('HERO', hero)"><span class="tool-emoji">{{ hero.emoji }}</span><span class="tool-label">{{ hero.label }}</span></div></div></div>
          <div class="tool-category"><div class="cat-title">👹 Mostri</div><div class="cat-items"><div v-for="monster in MONSTERS" :key="monster.id" class="tool-item" :class="{ active: selectedEntity?.subtype?.id === monster.id }" @click="selectEntity('MONSTER', monster)"><span class="tool-emoji">{{ monster.emoji }}</span><span class="tool-label">{{ monster.label }}</span></div></div></div>
          <div class="tool-category"><div class="cat-title">🚪 Porte &amp; Ingressi</div><div class="cat-items"><div v-for="door in DOORS" :key="door.id" class="tool-item" :class="{ active: selectedEntity?.subtype?.id === door.id }" @click="selectEntity('DOOR', door)"><span class="tool-emoji">{{ door.emoji }}</span><span class="tool-label">{{ door.label }}</span></div><div v-for="ent in ENTRANCES" :key="ent.id" class="tool-item" :class="{ active: selectedEntity?.subtype?.id === ent.id }" @click="selectEntity('ENTRANCE', ent)"><span class="tool-emoji">{{ ent.emoji }}</span><span class="tool-label">{{ ent.label }}</span></div></div></div>
          <div class="tool-category"><div class="cat-title">🪑 Arredi</div><div class="cat-items"><div v-for="furn in FURNITURE" :key="furn.id" class="tool-item" :class="{ active: selectedEntity?.subtype?.id === furn.id }" @click="selectEntity('FURNITURE', furn)"><span class="tool-emoji">{{ furn.emoji }}</span><span class="tool-label">{{ furn.label }}</span></div></div></div>
          <div class="tool-category"><div class="cat-title">⚠️ Trappole</div><div class="cat-items"><div v-for="trap in TRAPS" :key="trap.id" class="tool-item" :class="{ active: selectedEntity?.subtype?.id === trap.id }" @click="selectEntity('TRAP', trap)"><span class="tool-emoji">{{ trap.emoji }}</span><span class="tool-label">{{ trap.label }}</span></div></div></div>
          <div class="tool-category"><div class="cat-title">📜 Oggetti Speciali</div><div class="cat-items"><div v-for="obj in SPECIALS" :key="obj.id" class="tool-item" :class="{ active: selectedEntity?.subtype?.id === obj.id }" @click="selectEntity('SPECIAL', obj)"><span class="tool-emoji">{{ obj.emoji }}</span><span class="tool-label">{{ obj.label }}</span></div></div></div>
          <div class="tool-category"><div class="cat-title">🗑️ Cancella</div><div class="cat-items"><div class="tool-item" @click="setEraseMode"><span class="tool-emoji">❌</span><span class="tool-label">Elimina</span></div></div></div>
        </div>

        <div v-if="previewShape" class="preview-info">
          <span>Anteprima: occupa {{ previewShape.width }}x{{ previewShape.height }} caselle ({{ previewShape.width*2 }}×{{ previewShape.height*2 }} stud)</span>
          <button v-if="selectedEntity?.subtype?.allowOrientation" class="btn-rotate" @click="toggleOrientation">
            ⟳ Ruota ({{ currentOrientation === 'horizontal' ? '→ Orizzontale' : '↓ Verticale' }})
          </button>
        </div>

        <div class="grid-container">
          <div class="grid-wrapper" @mouseleave="clearPreview">
            <div v-for="(row, r) in currentMap.grid" :key="r" class="grid-row">
              <div
                v-for="(cell, c) in row"
                :key="c"
                class="grid-cell"
                :class="{
                  'cell-selected': selectedCell && selectedCell.x === c && selectedCell.y === r,
                  'cell-preview': isInPreview(c, r),
                  'marker-cell': isMarkerCell(cell)
                }"
                :style="{ backgroundColor: getCellBackgroundColor(cell) }"
                :title="`Riga: ${r}, Colonna: ${c}`"
                @click="handleCellClick(c, r)"
                @mouseenter="updatePreview(c, r)"
              >
                <span v-if="isMarkerCell(cell)" class="marker-number">{{ cell.markerId }}</span>
                <span v-else class="cell-emoji">{{ getCellEmoji(cell) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div v-else class="no-map-selected">
        <p>Seleziona una mappa o creane una nuova.</p>
        <button class="btn-primary" @click="createNewMap">➕ Crea nuova mappa</button>
      </div>
    </div>

    <!-- Area per la stampa (nascosta, popolata al momento della stampa) -->
    <div id="printArea" style="display:none;"></div>

    <input type="file" ref="fileInput" accept=".json" style="display: none" @change="onFileSelected" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'

const MAX_SIZE = 300

const CELL_TYPES = {
  EMPTY: 'empty',
  FLOOR: 'floor',
  WALL: 'wall',
  HERO: 'hero',
  MONSTER: 'monster',
  DOOR: 'door',
  ENTRANCE: 'entrance',
  FURNITURE: 'furniture',
  TRAP: 'trap',
  SPECIAL: 'special'
}

const BASE_TYPE_INFO = {
  [CELL_TYPES.EMPTY]: { label: 'Vuoto', emoji: '⬛', color: '#1a1a2e' },
  [CELL_TYPES.FLOOR]: { label: 'Pavimento', emoji: '⬜', color: '#3a3a4a' },
  [CELL_TYPES.WALL]: { label: 'Muro', emoji: '🧱', color: '#5a4a3a' }
}

// Oggetti con dimensioni in stud (1 cella = 2×2 stud)
const HEROES = [
  { id: 'barbarian', label: 'Barbaro', emoji: '⚔️', size: [1,1] },
  { id: 'dwarf', label: 'Nano', emoji: '🪓', size: [1,1] },
  { id: 'elf', label: 'Elfo', emoji: '🏹', size: [1,1] },
  { id: 'wizard', label: 'Mago', emoji: '🔮', size: [1,1] }
]
const MONSTERS = [
  { id: 'orc', label: 'Orco', emoji: '👹', size: [1,1] },
  { id: 'goblin', label: 'Goblin', emoji: '👺', size: [1,1] },
  { id: 'fimir', label: 'Fimir', emoji: '🐉', size: [1,1] },
  { id: 'chaos_warrior', label: 'Guerriero Caos', emoji: '⚔️', size: [1,1] },
  { id: 'chaos_lord', label: 'Signore Caos', emoji: '👑', size: [1,1] },
  { id: 'gargoyle', label: 'Gargolla', emoji: '🗿', size: [1,1] },
  { id: 'skeleton', label: 'Scheletro', emoji: '💀', size: [1,1] },
  { id: 'undead', label: 'Non-Morto', emoji: '🧟', size: [1,1] }
]
const DOORS = [
  { id: 'normal_door', label: 'Porta Normale', emoji: '🚪', size: [1,1] },
  { id: 'secret_door', label: 'Porta Segreta', emoji: '🔒', size: [1,1] },
  { id: 'iron_gate', label: 'Cancello di Ferro', emoji: '🔗', size: [1,1] }
]
const ENTRANCES = [
  { id: 'spiral_stairs', label: 'Scale a Chiocciola', emoji: '🌀', size: [2,2] }
]
const FURNITURE = [
  { id: 'chest', label: 'Cassa/Scrigno', emoji: '📦', size: [1,1] },
  { id: 'bookcase', label: 'Libreria', emoji: '📚', size: [1,1] },
  { id: 'table', label: 'Tavolo', emoji: '🪑', size: [1,1] },
  { id: 'throne', label: 'Trono', emoji: '👑', size: [1,1] },
  { id: 'alchemist', label: 'Banco Alchimista', emoji: '⚗️', size: [1,1] },
  { id: 'fireplace', label: 'Caminetto', emoji: '🔥', size: [1,1] },
  { id: 'weapon_rack', label: 'Supporto Armi', emoji: '🗡️', size: [1,1] },
  { id: 'cabinet', label: 'Armadietto', emoji: '🗄️', size: [1,1] },
  { id: 'torture_rack', label: 'Rack Torture', emoji: '⛓️', size: [1,1] },
  { id: 'tomb', label: 'Tomba', emoji: '⚰️', size: [1,1] },
  { id: 'wizard_table', label: 'Tavolo Stregone', emoji: '🔮', size: [1,1] }
]
const TRAPS = [
  { id: 'pit', label: 'Buca', emoji: '🕳️', size: [1,1] },
  { id: 'long_pit', label: 'Buca Lunga', emoji: '🕳️🕳️', size: [1,2], allowOrientation: true },
  { id: 'falling_rocks', label: 'Massi Cadenti', emoji: '🪨', size: [1,1] },
  { id: 'false_wall', label: 'Blocco d\'Accesso', emoji: '🧱', size: [1,1] },
  { id: 'spear', label: 'Lancia', emoji: '🔱', size: [1,1] },
  { id: 'poison_dart', label: 'Dardo Avvelenato', emoji: '🏹', size: [1,1] },
  { id: 'blade', label: 'Lama Rotante', emoji: '⚙️', size: [1,1] },
  { id: 'trap_door', label: 'Porta Trappola', emoji: '🚪', size: [1,1] }
]
const SPECIALS = [
  { id: 'loretome', label: 'Loretome (Libro)', emoji: '📖', size: [1,1] }
]

// Legenda organizzata per gruppi (colonne) – usata sia per UI che per stampa
const legendGroups = computed(() => {
  const groups = []
  const addGroup = (title, items) => {
    groups.push({ title, items: items.map(item => ({
      id: item.id,
      emoji: item.emoji,
      label: item.label,
      size: Array.isArray(item.size) ? `${item.size[0]*2}×${item.size[1]*2} stud` : item.size
    })) })
  }
  addGroup('Base', [
    { id: 'base-floor', emoji: '⬜', label: 'Pavimento', size: '2×2 stud' },
    { id: 'base-wall', emoji: '🧱', label: 'Muro', size: '1×1 stud' }
  ])
  addGroup('Eroi', HEROES)
  addGroup('Mostri', MONSTERS)
  addGroup('Porte & Ingressi', [...DOORS, ...ENTRANCES])
  addGroup('Arredi', FURNITURE)
  addGroup('Trappole', TRAPS)
  addGroup('Speciali', SPECIALS)
  addGroup('Ancore ArUco', [{ id: 'aruco-anchor', emoji: '📍', label: 'Ancora ArUco', size: '2×2 stud' }])
  return groups
})

function getBaseColor(type) {
  return BASE_TYPE_INFO[type]?.color || '#2a2a4a'
}

// Stato collasso (persistente in localStorage)
const SIDEBAR_STORAGE_KEY = 'mapeditor_sidebar_collapsed'
const LEGEND_STORAGE_KEY = 'mapeditor_legend_collapsed'

const sidebarCollapsed = ref(JSON.parse(localStorage.getItem(SIDEBAR_STORAGE_KEY) || 'false'))
const legendCollapsed = ref(JSON.parse(localStorage.getItem(LEGEND_STORAGE_KEY) || 'false'))

function toggleSidebar() {
  sidebarCollapsed.value = !sidebarCollapsed.value
  localStorage.setItem(SIDEBAR_STORAGE_KEY, JSON.stringify(sidebarCollapsed.value))
}
function toggleLegend() {
  legendCollapsed.value = !legendCollapsed.value
  localStorage.setItem(LEGEND_STORAGE_KEY, JSON.stringify(legendCollapsed.value))
}

// Caricamento mappe
const STORAGE_KEY = 'heroquest_maps'
const loadMaps = () => {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored) return JSON.parse(stored)
  return []
}
const saveMaps = (maps) => localStorage.setItem(STORAGE_KEY, JSON.stringify(maps))

const maps = ref(loadMaps())
const currentMapId = ref(null)
const currentMap = computed(() => maps.value.find(m => m.id === currentMapId.value) || null)
const mapName = ref('')
const tempCols = ref(10), tempRows = ref(10)

const selectedEntity = ref(null)
const eraseMode = ref(false)
const selectionMode = ref(false)
const selectedCell = ref(null)
const selectedMarkerId = ref(0)
const previewPos = ref(null)

const previewShape = computed(() => {
  if (!selectedEntity.value || eraseMode.value || selectionMode.value) return null
  const sub = selectedEntity.value.subtype
  if (!sub || !sub.size) return null
  let [w,h] = sub.size
  if (sub.allowOrientation && currentOrientation.value === 'horizontal') [w,h] = [h,w]
  return { width: w, height: h }
})
const currentOrientation = ref('horizontal')

function toggleOrientation() {
  if (selectedEntity.value?.subtype?.allowOrientation) {
    currentOrientation.value = currentOrientation.value === 'horizontal' ? 'vertical' : 'horizontal'
  }
}

function setEraseMode() {
  eraseMode.value = true; selectedEntity.value = null; selectionMode.value = false
}
function selectBaseType(type) {
  eraseMode.value = false; selectionMode.value = false;
  selectedEntity.value = { type, subtype: null, size: [1,1] }
}
function selectEntity(type, subtype) {
  eraseMode.value = false; selectionMode.value = false;
  selectedEntity.value = { type, subtype, size: subtype.size || [1,1] }
  if (subtype.allowOrientation) currentOrientation.value = 'horizontal'
}

function getCellBackgroundColor(cell) {
  if (cell.markerId !== undefined && cell.markerId !== null) {
    return '#cc3333'
  }
  return getBaseColor(cell.type)
}
function isMarkerCell(cell) {
  return cell.markerId !== undefined && cell.markerId !== null
}

function handleCellClick(col, row) {
  if (selectionMode.value) {
    selectedCell.value = { x: col, y: row }
    selectionMode.value = false
    return
  }
  if (eraseMode.value) {
    removeEntityAt(col, row)
    saveCurrentMap()
    return
  }
  if (!selectedEntity.value) return

  const { type, subtype, size } = selectedEntity.value
  let [w, h] = size
  if (subtype?.allowOrientation && currentOrientation.value === 'horizontal') [w, h] = [h, w]

  if (col + w > currentMap.value.cols || row + h > currentMap.value.rows) {
    alert("Fuori dalla mappa")
    return
  }
  let canPlace = true
  for (let dy = 0; dy < h; dy++) {
    for (let dx = 0; dx < w; dx++) {
      const cell = currentMap.value.grid[row+dy][col+dx]
      if (cell.type !== CELL_TYPES.EMPTY && cell.type !== CELL_TYPES.FLOOR) {
        canPlace = false; break
      }
    }
  }
  if (!canPlace) {
    alert("Celle già occupate")
    return
  }

  const entityId = Date.now() + Math.random()
  // Se subtype è null (elementi base), details sarà null
  const details = subtype ? {
    id: entityId,
    subtypeId: subtype.id,
    label: subtype.label,
    emoji: subtype.emoji,
    size: [w,h]
  } : null

  for (let dy = 0; dy < h; dy++) {
    for (let dx = 0; dx < w; dx++) {
      currentMap.value.grid[row+dy][col+dx] = {
        type: type,
        details: details,
        markerId: null
      }
    }
  }
  saveCurrentMap()
}

function removeEntityAt(col, row) {
  const cell = currentMap.value.grid[row]?.[col]
  if (!cell || cell.type === CELL_TYPES.EMPTY || cell.type === CELL_TYPES.FLOOR || cell.type === CELL_TYPES.WALL) return
  const entityId = cell.details?.id
  if (!entityId) {
    // Se è un elemento base o non ha id, lo resettiamo a pavimento
    currentMap.value.grid[row][col] = { type: CELL_TYPES.FLOOR, details: null, markerId: cell.markerId }
    return
  }
  for (let r=0; r<currentMap.value.rows; r++) {
    for (let c=0; c<currentMap.value.cols; c++) {
      const c2 = currentMap.value.grid[r][c]
      if (c2.details?.id === entityId) {
        currentMap.value.grid[r][c] = { type: CELL_TYPES.FLOOR, details: null, markerId: c2.markerId }
      }
    }
  }
}

function getCellEmoji(cell) {
  if (cell.details?.emoji) return cell.details.emoji
  if (BASE_TYPE_INFO[cell.type]) return BASE_TYPE_INFO[cell.type].emoji
  return '⬜'
}

function updatePreview(col, row) {
  if (!previewShape.value || eraseMode.value || selectionMode.value) {
    previewPos.value = null; return
  }
  const { width, height } = previewShape.value
  if (col+width <= currentMap.value.cols && row+height <= currentMap.value.rows) {
    previewPos.value = { x: col, y: row, w: width, h: height }
  } else {
    previewPos.value = null
  }
}
function isInPreview(col, row) {
  if (!previewPos.value) return false
  const p = previewPos.value
  return col >= p.x && col < p.x+p.w && row >= p.y && row < p.y+p.h
}
function clearPreview() {
  previewPos.value = null
}

function startCellSelection() {
  selectionMode.value = true; eraseMode.value = false; selectedEntity.value = null
}

function assignMarkerToSelectedCell() {
  if (!selectedCell.value) { alert("Seleziona prima una cella"); return }
  const { x, y } = selectedCell.value
  if (currentMap.value.grid[y] && currentMap.value.grid[y][x]) {
    currentMap.value.grid[y][x].markerId = selectedMarkerId.value
    saveCurrentMap()
  }
}
function removeMarkerFromSelectedCell() {
  if (!selectedCell.value) return
  const { x, y } = selectedCell.value
  if (currentMap.value.grid[y]?.[x]) {
    currentMap.value.grid[y][x].markerId = null
    saveCurrentMap()
  }
}

function createNewMap() {
  let name = prompt("Nome mappa:", "Nuova Avventura")
  if (!name) return
  let cols = parseInt(prompt("Larghezza (colonne, 4-"+MAX_SIZE+"):", "12") || "12")
  let rows = parseInt(prompt("Altezza (righe, 4-"+MAX_SIZE+"):", "12") || "12")
  cols = Math.min(MAX_SIZE, Math.max(4, cols))
  rows = Math.min(MAX_SIZE, Math.max(4, rows))
  const newMap = {
    id: Date.now(),
    name: name,
    cols, rows,
    grid: Array(rows).fill().map(() =>
      Array(cols).fill().map(() => ({
        type: CELL_TYPES.FLOOR,
        details: null,
        markerId: null
      }))
    )
  }
  maps.value.push(newMap)
  saveMaps(maps.value)
  currentMapId.value = newMap.id
}

function selectMap(id) {
  currentMapId.value = id; selectedCell.value = null
}
function deleteMap(id) {
  if (confirm("Eliminare mappa?")) {
    maps.value = maps.value.filter(m => m.id !== id)
    saveMaps(maps.value)
    if (currentMapId.value === id) currentMapId.value = maps.value[0]?.id || null
  }
}
function saveCurrentMap() {
  if (!currentMap.value) return
  const idx = maps.value.findIndex(m => m.id === currentMap.value.id)
  if (idx !== -1) {
    maps.value[idx].name = mapName.value
    maps.value[idx].grid = currentMap.value.grid
    maps.value[idx].cols = currentMap.value.cols
    maps.value[idx].rows = currentMap.value.rows
    saveMaps(maps.value)
  }
}
function applyResize() {
  if (!currentMap.value) return
  let newCols = Math.min(MAX_SIZE, Math.max(4, tempCols.value))
  let newRows = Math.min(MAX_SIZE, Math.max(4, tempRows.value))
  let oldGrid = currentMap.value.grid
  let newGrid = Array(newRows).fill().map(() =>
    Array(newCols).fill().map(() => ({
      type: CELL_TYPES.FLOOR,
      details: null,
      markerId: null
    }))
  )
  for (let r=0; r<Math.min(currentMap.value.rows, newRows); r++) {
    for (let c=0; c<Math.min(currentMap.value.cols, newCols); c++) {
      newGrid[r][c] = oldGrid[r][c]
    }
  }
  currentMap.value.grid = newGrid
  currentMap.value.cols = newCols
  currentMap.value.rows = newRows
  saveCurrentMap()
}

function exportAllMaps() {
  const exportData = {
    version: '1.0',
    maps: maps.value,
    exportedAt: new Date().toISOString()
  }
  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `heroquest_maps_${Date.now()}.json`
  a.click()
  URL.revokeObjectURL(url)
}

// ===== FUNZIONI STAMPA SEPARATE =====

// Funzione di base per popolare l'area di stampa
function preparePrintArea(htmlContent) {
  const printArea = document.getElementById('printArea')
  printArea.innerHTML = htmlContent
  printArea.style.display = 'block'
}

// Stampa solo la legenda
function printLegendOnly() {
  if (!currentMap.value) {
    alert('Nessuna mappa selezionata')
    return
  }
  let html = `<h1>📐 Legenda - ${currentMap.value.name}</h1>`
  html += `<div class="print-legend-grid">`
  for (const group of legendGroups.value) {
    html += `<div class="print-legend-column">`
    html += `<div class="print-legend-group-title">${group.title}</div>`
    for (const item of group.items) {
      html += `<div class="print-legend-item">${item.emoji} ${item.label} <span class="print-legend-size">${item.size}</span></div>`
    }
    html += `</div>`
  }
  html += `</div>`
  preparePrintArea(html)
  window.print()
  document.getElementById('printArea').style.display = 'none'
}

// Stampa solo la griglia
function printGridOnly() {
  if (!currentMap.value) {
    alert('Nessuna mappa selezionata')
    return
  }
  let html = `<h1>🗺️ ${currentMap.value.name}</h1>`
  html += `<div class="print-grid-wrapper"><div class="print-grid-container" style="display:grid; grid-template-columns: repeat(${currentMap.value.cols}, 1fr); grid-template-rows: repeat(${currentMap.value.rows}, 1fr); width:100%; aspect-ratio: ${currentMap.value.cols}/${currentMap.value.rows};">`
  for (let r = 0; r < currentMap.value.rows; r++) {
    for (let c = 0; c < currentMap.value.cols; c++) {
      const cell = currentMap.value.grid[r]?.[c] || { type: CELL_TYPES.FLOOR, details: null, markerId: null }
      const bgColor = getCellBackgroundColor(cell)
      let content = ''
      if (isMarkerCell(cell)) {
        content = `<span style="color:white; font-weight:bold; font-size:1.2em; text-shadow:1px 1px 0 #000;">${cell.markerId}</span>`
      } else {
        content = getCellEmoji(cell)
      }
      html += `<div class="print-cell" style="background-color:${bgColor}; border:1px solid #999; display:flex; align-items:center; justify-content:center; font-size:1.4em; min-width:16px; min-height:16px;">${content}</div>`
    }
  }
  html += `</div></div>`
  preparePrintArea(html)
  window.print()
  document.getElementById('printArea').style.display = 'none'
}

// ===========================

const fileInput = ref(null)
function triggerFileImport() {
  fileInput.value.click()
}
function onFileSelected(event) {
  const file = event.target.files[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result)
      if (data.maps && Array.isArray(data.maps)) {
        if (confirm("Sostituire tutte le mappe esistenti?")) {
          maps.value = data.maps
          saveMaps(maps.value)
          currentMapId.value = maps.value[0]?.id || null
          alert("Importate " + data.maps.length + " mappe.")
        }
      } else throw new Error("Formato invalido")
    } catch(err) {
      alert("Errore importazione: " + err.message)
    }
    fileInput.value.value = ''
  }
  reader.readAsText(file)
}

watch(currentMap, (map) => {
  if (map) {
    mapName.value = map.name
    tempCols.value = map.cols
    tempRows.value = map.rows
  }
}, { immediate: true })

onMounted(() => {
  if (maps.value.length) currentMapId.value = maps.value[0].id
})
</script>

<style scoped>
.map-editor {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #0f0f1e;
  color: #eee;
  overflow: hidden;
}
.editor-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem 1rem;
  background: #1a1a2e;
  border-bottom: 1px solid #2a2a4a;
  flex-shrink: 0;
}
.header-left {
  display: flex;
  align-items: center;
  gap: 1rem;
}
.header-actions {
  display: flex;
  gap: 0.5rem;
}
.back-btn {
  background: none;
  border: none;
  color: #7c9ef5;
  font-size: 1.5rem;
  cursor: pointer;
}
h1 {
  margin: 0;
  font-size: 1.2rem;
}
.icon-btn {
  background: #2a2a4a;
  border: none;
  color: #ccc;
  border-radius: 6px;
  padding: 0.3rem 0.6rem;
  cursor: pointer;
  font-size: 1.1rem;
}
.icon-btn:hover {
  background: #3a3a5a;
}

.editor-body {
  display: flex;
  flex: 1;
  overflow: hidden;
}

/* Sidebar */
.sidebar {
  width: 280px;
  background: #1a1a2e;
  border-right: 1px solid #2a2a4a;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  overflow-y: auto;
  padding: 1rem;
  gap: 1rem;
}
.sidebar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.sidebar-header h3 {
  margin: 0;
  font-size: 1rem;
}
.btn-new {
  background: #2a5a2a;
  border: none;
  color: #d0ffd0;
  border-radius: 6px;
  padding: 0.2rem 0.6rem;
  cursor: pointer;
}
.map-list {
  flex: 1;
  overflow-y: auto;
}
.map-item {
  display: flex;
  justify-content: space-between;
  background: #2a2a4a;
  border-radius: 6px;
  padding: 0.4rem;
  margin-bottom: 0.4rem;
  cursor: pointer;
}
.map-item.active {
  border: 2px solid #4a7cf5;
}
.map-info {
  display: flex;
  flex-direction: column;
}
.map-name {
  font-size: 0.9rem;
}
.map-size {
  font-size: 0.7rem;
  color: #888;
}
.btn-delete {
  background: none;
  border: none;
  color: #ff6666;
  cursor: pointer;
}
.no-maps {
  color: #666;
  text-align: center;
  padding: 1rem;
}
.marker-panel {
  background: #111122;
  border-radius: 8px;
  padding: 0.6rem;
  border: 1px solid #3a3a6a;
}
.marker-panel h4 {
  margin: 0 0 0.5rem;
  font-size: 0.9rem;
}
.marker-controls {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}
.marker-controls label {
  font-size: 0.8rem;
}
.marker-controls input {
  background: #2a2a4a;
  border: 1px solid #3a3a6a;
  border-radius: 4px;
  color: #eee;
  padding: 0.2rem 0.4rem;
  width: 80px;
}
.btn-small {
  background: #3a3a6a;
  border: none;
  color: #ccc;
  border-radius: 4px;
  padding: 0.2rem 0.5rem;
  font-size: 0.7rem;
  cursor: pointer;
}
.selected-cell-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.8rem;
  margin-top: 0.4rem;
}
.selection-mode-msg {
  color: #ffaa44;
  font-size: 0.7rem;
  margin-top: 0.3rem;
}
.marker-hint {
  font-size: 0.65rem;
  color: #aaa;
  margin-top: 0.5rem;
}

/* Main area */
.main-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 0.5rem 1rem 1rem 1rem;
}
.map-header {
  display: flex;
  gap: 1rem;
  align-items: center;
  flex-wrap: wrap;
  flex-shrink: 0;
}
.map-name-input {
  background: #2a2a4a;
  border: 1px solid #3a3a6a;
  border-radius: 6px;
  color: white;
  padding: 0.3rem 0.6rem;
}
.size-controls {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}
.size-input {
  display: flex;
  align-items: center;
  gap: 0.3rem;
}
.size-input label {
  font-size: 0.8rem;
  color: #aaa;
}
.size-input input {
  width: 50px;
  background: #2a2a4a;
  border: 1px solid #3a3a6a;
  border-radius: 4px;
  color: white;
  padding: 0.2rem;
}
.btn-primary {
  background: #4a7cf5;
  border: none;
  color: white;
  border-radius: 6px;
  padding: 0.3rem 0.8rem;
  cursor: pointer;
}

/* Legenda */
.legend-panel {
  background: #1a1a2e;
  border-radius: 8px;
  padding: 0.5rem 0.8rem;
  margin: 0.5rem 0;
  border: 1px solid #3a3a6a;
  flex-shrink: 0;
  max-height: 200px;
  overflow-y: auto;
}
.legend-title {
  font-size: 0.8rem;
  font-weight: bold;
  color: #aaa;
  margin-bottom: 0.3rem;
}
.legend-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 0.5rem 1rem;
}
.legend-column {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}
.legend-group-title {
  font-size: 0.7rem;
  font-weight: bold;
  color: #7c9ef5;
  margin-bottom: 0.1rem;
}
.legend-item {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.7rem;
  color: #ccc;
}
.legend-emoji {
  font-size: 0.9rem;
}
.legend-size {
  background: #2a2a4a;
  padding: 0.05rem 0.3rem;
  border-radius: 4px;
  font-family: monospace;
  font-size: 0.6rem;
  color: #7c9ef5;
  margin-left: auto;
}

.tool-palette {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem 1rem;
  padding: 0.3rem 0;
  flex-shrink: 0;
  overflow-x: auto;
  max-height: 150px;
}
.tool-category {
  background: #1a1a2e;
  border-radius: 6px;
  padding: 0.3rem 0.5rem;
}
.cat-title {
  font-size: 0.7rem;
  font-weight: bold;
  color: #aaa;
  margin-bottom: 0.2rem;
}
.cat-items {
  display: flex;
  flex-wrap: wrap;
  gap: 0.2rem;
}
.tool-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  background: #2a2a4a;
  border-radius: 6px;
  padding: 0.1rem 0.3rem;
  cursor: pointer;
  min-width: 45px;
}
.tool-item.active {
  border: 2px solid #4a7cf5;
  background: #2a2a5a;
}
.tool-emoji {
  font-size: 1.2rem;
}
.tool-label {
  font-size: 0.55rem;
}

.preview-info {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.2rem 0.5rem;
  font-size: 0.75rem;
  color: #aaa;
  flex-shrink: 0;
}
.btn-rotate {
  background: #4a7cf5;
  border: none;
  color: white;
  border-radius: 4px;
  padding: 0.1rem 0.5rem;
  cursor: pointer;
  font-size: 0.7rem;
}

.grid-container {
  flex: 1;
  overflow: auto;
  background: #0a0a14;
  border-radius: 8px;
  padding: 0.5rem;
  margin-top: 0.3rem;
}
.grid-wrapper {
  display: inline-block;
}
.grid-row {
  display: flex;
}
.grid-cell {
  width: 44px;
  height: 44px;
  border: 1px solid #3a3a6a;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  position: relative;
  font-size: 1.2rem;
}
.cell-selected {
  outline: 3px solid gold;
  z-index: 2;
}
.cell-preview {
  background-color: rgba(100,200,100,0.4);
}
.marker-cell {
  background-color: #cc3333 !important;
}
.marker-number {
  font-size: 1.4rem;
  font-weight: bold;
  color: white;
  text-shadow: 1px 1px 0 #000;
}

.no-map-selected {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #aaa;
}

/* STYLES PER LA STAMPA */
@media print {
  /* Nascondi tutto tranne #printArea */
  body * {
    visibility: hidden;
  }
  #printArea, #printArea * {
    visibility: visible;
  }
  #printArea {
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
    padding: 10mm;
    background: white;
    color: black;
  }
  .print-legend-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 4px;
    margin-bottom: 8mm;
  }
  .print-legend-column {
    font-size: 9px;
  }
  .print-legend-group-title {
    font-weight: bold;
    color: #4a7cf5;
  }
  .print-legend-item {
    display: flex;
    justify-content: space-between;
    padding: 1px 0;
  }
  .print-legend-size {
    background: #eee;
    padding: 0 4px;
    border-radius: 3px;
    font-family: monospace;
  }
  .print-grid-wrapper {
    width: 100%;
    display: flex;
    justify-content: center;
    page-break-inside: avoid;
  }
  .print-grid-container {
    display: grid;
    max-width: 100%;
    max-height: 70vh;
    aspect-ratio: auto;
    border: 1px solid #666;
  }
  .print-cell {
    border: 1px solid #999;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.4em;
    min-width: 16px;
    min-height: 16px;
  }
  h1 {
    font-size: 18px;
    margin: 0 0 4mm 0;
  }
  h2 {
    font-size: 14px;
    margin: 0 0 3mm 0;
  }
}

@media (max-width: 768px) {
  .sidebar {
    width: 100%;
    max-height: 40vh;
    border-right: none;
    border-bottom: 1px solid #2a2a4a;
  }
  .editor-body {
    flex-direction: column;
  }
  .legend-grid {
    grid-template-columns: 1fr 1fr;
  }
  .grid-cell {
    width: 36px;
    height: 36px;
  }
  .cell-emoji {
    font-size: 1rem;
  }
  .marker-number {
    font-size: 1.2rem;
  }
}
</style>