<template>
  <div class="map-editor">
    <div class="editor-header">
      <button class="back-btn" @click="$router?.push('/')">←</button>
      <h1>Editor Mappe - HeroQuest</h1>
      <div class="header-actions">
        <button class="icon-btn" @click="saveCurrentMap" title="Salva mappa corrente">💾</button>
        <button class="icon-btn" @click="exportAllMaps" title="Esporta tutte le mappe">📤</button>
        <button class="icon-btn" @click="triggerFileImport" title="Importa mappe">📥</button>
      </div>
    </div>

    <div class="editor-layout">
      <!-- Sidebar sinistra: elenco mappe -->
      <div class="sidebar">
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

        <!-- Sezione Marker Association -->
        <div class="marker-panel">
          <h4>🎯 Associa Marker ArUco</h4>
          <div class="marker-controls">
            <label>ID Marker (0-250):</label>
            <input type="number" v-model.number="selectedMarkerId" min="0" max="250" />
            <button class="btn-small" @click="assignMarkerToSelectedCell">Applica alla cella</button>
            <button class="btn-small" @click="removeMarkerFromSelectedCell">Rimuovi</button>
          </div>
          <div class="selected-cell-info">
            <span>Cella selezionata:</span>
            <strong v-if="selectedCell">{{ selectedCell.x }}, {{ selectedCell.y }}</strong>
            <span v-else>nessuna</span>
            <button class="btn-small" @click="startCellSelection">🔍 Seleziona cella</button>
          </div>
          <div v-if="selectionMode" class="selection-mode-msg">
            ⚡ Modalità selezione attiva. Clicca su una cella.
          </div>
          <div class="marker-hint">
            💡 I marker servono per l'omografia.<br>
            Associane uno a una cella (sfondo rosso) per usarla come ancora.
          </div>
        </div>
      </div>

      <!-- Area editor (visibile solo se c'è una mappa) -->
      <div class="editor-area" v-if="currentMap">
        <div class="map-header">
          <input type="text" v-model="mapName" placeholder="Nome mappa" class="map-name-input" @blur="saveCurrentMap" />
          <div class="size-controls">
            <div class="size-input"><label>Colonne</label><input type="number" v-model.number="tempCols" min="4" :max="MAX_SIZE" /></div>
            <div class="size-input"><label>Righe</label><input type="number" v-model.number="tempRows" min="4" :max="MAX_SIZE" /></div>
            <button class="btn-primary" @click="applyResize">Ridimensiona</button>
          </div>
        </div>

        <!-- Palette strumenti categorizzata -->
        <div class="tool-palette">
          <div class="tool-category">
            <div class="cat-title">📦 Base</div>
            <div class="cat-items">
              <div v-for="(info, type) in BASE_TYPE_INFO" :key="type" class="tool-item" :class="{ active: selectedEntity?.type === type && !selectedEntity?.subtype }" @click="selectBaseType(type)">
                <span class="tool-emoji">{{ info.emoji }}</span><span class="tool-label">{{ info.label }}</span>
              </div>
            </div>
          </div>
          <div class="tool-category"><div class="cat-title">⚔️ Eroi</div><div class="cat-items"><div v-for="hero in HEROES" :key="hero.id" class="tool-item" :class="{ active: selectedEntity?.subtype?.id === hero.id }" @click="selectEntity('HERO', hero)"><span class="tool-emoji">{{ hero.emoji }}</span><span class="tool-label">{{ hero.label }}</span></div></div></div>
          <div class="tool-category"><div class="cat-title">👹 Mostri</div><div class="cat-items"><div v-for="monster in MONSTERS" :key="monster.id" class="tool-item" :class="{ active: selectedEntity?.subtype?.id === monster.id }" @click="selectEntity('MONSTER', monster)"><span class="tool-emoji">{{ monster.emoji }}</span><span class="tool-label">{{ monster.label }}</span></div></div></div>
          <div class="tool-category"><div class="cat-title">🚪 Porte & Ingressi</div><div class="cat-items"><div v-for="door in DOORS" :key="door.id" class="tool-item" :class="{ active: selectedEntity?.subtype?.id === door.id }" @click="selectEntity('DOOR', door)"><span class="tool-emoji">{{ door.emoji }}</span><span class="tool-label">{{ door.label }}</span></div><div v-for="ent in ENTRANCES" :key="ent.id" class="tool-item" :class="{ active: selectedEntity?.subtype?.id === ent.id }" @click="selectEntity('ENTRANCE', ent)"><span class="tool-emoji">{{ ent.emoji }}</span><span class="tool-label">{{ ent.label }}</span></div></div></div>
          <div class="tool-category"><div class="cat-title">🪑 Arredi</div><div class="cat-items"><div v-for="furn in FURNITURE" :key="furn.id" class="tool-item" :class="{ active: selectedEntity?.subtype?.id === furn.id }" @click="selectEntity('FURNITURE', furn)"><span class="tool-emoji">{{ furn.emoji }}</span><span class="tool-label">{{ furn.label }}</span></div></div></div>
          <div class="tool-category"><div class="cat-title">⚠️ Trappole</div><div class="cat-items"><div v-for="trap in TRAPS" :key="trap.id" class="tool-item" :class="{ active: selectedEntity?.subtype?.id === trap.id }" @click="selectEntity('TRAP', trap)"><span class="tool-emoji">{{ trap.emoji }}</span><span class="tool-label">{{ trap.label }}</span></div></div></div>
          <div class="tool-category"><div class="cat-title">📜 Oggetti Speciali</div><div class="cat-items"><div v-for="obj in SPECIALS" :key="obj.id" class="tool-item" :class="{ active: selectedEntity?.subtype?.id === obj.id }" @click="selectEntity('SPECIAL', obj)"><span class="tool-emoji">{{ obj.emoji }}</span><span class="tool-label">{{ obj.label }}</span></div></div></div>
          <div class="tool-category"><div class="cat-title">🗑️ Cancella</div><div class="cat-items"><div class="tool-item" @click="setEraseMode"><span class="tool-emoji">❌</span><span class="tool-label">Elimina</span></div></div></div>
        </div>

        <!-- Anteprima per elementi multi-cella + Rotazione per buche lunghe -->
        <div v-if="previewShape" class="preview-info">
          <span>Anteprima: occupa {{ previewShape.width }}x{{ previewShape.height }} caselle</span>
          <button 
            v-if="selectedEntity?.subtype?.allowOrientation" 
            class="btn-rotate" 
            @click="toggleOrientation"
          >
            ⟳ Ruota ({{ currentOrientation === 'horizontal' ? '→ Orizzontale' : '↓ Verticale' }})
          </button>
        </div>

        <!-- Griglia editabile -->
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
                <!-- Mostra ID del marker al centro se esiste, altrimenti emoji -->
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

    <input type="file" ref="fileInput" accept=".json" style="display: none" @change="onFileSelected" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'

// ---------- COSTANTI ----------
const MAX_SIZE = 300   // Limite massimo righe/colonne

const CELL_TYPES = {
  EMPTY: 'empty', FLOOR: 'floor', WALL: 'wall',
  HERO: 'hero', MONSTER: 'monster', DOOR: 'door', ENTRANCE: 'entrance',
  FURNITURE: 'furniture', TRAP: 'trap', SPECIAL: 'special'
}

const BASE_TYPE_INFO = {
  [CELL_TYPES.EMPTY]: { label: 'Vuoto', emoji: '⬛', color: '#1a1a2e' },
  [CELL_TYPES.FLOOR]: { label: 'Pavimento', emoji: '⬜', color: '#3a3a4a' },
  [CELL_TYPES.WALL]: { label: 'Muro', emoji: '🧱', color: '#5a4a3a' }
}

// Eroi
const HEROES = [
  { id: 'barbarian', label: 'Barbaro', emoji: '⚔️', size: [1,1] },
  { id: 'dwarf', label: 'Nano', emoji: '🪓', size: [1,1] },
  { id: 'elf', label: 'Elfo', emoji: '🏹', size: [1,1] },
  { id: 'wizard', label: 'Mago', emoji: '🔮', size: [1,1] }
]
// Mostri
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
// Porte
const DOORS = [
  { id: 'normal_door', label: 'Porta Normale', emoji: '🚪', size: [1,1] },
  { id: 'secret_door', label: 'Porta Segreta', emoji: '🔒', size: [1,1] },
  { id: 'iron_gate', label: 'Cancello di Ferro', emoji: '🔗', size: [1,1] }
]
// Ingressi (Scala 2x2)
const ENTRANCES = [
  { id: 'spiral_stairs', label: 'Scale a Chiocciola', emoji: '🌀', size: [2,2] }
]
// Arredi
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
// Trappole (con size variabile)
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
// Oggetti speciali
const SPECIALS = [
  { id: 'loretome', label: 'Loretome (Libro)', emoji: '📖', size: [1,1] }
]

// Helper colore base
function getBaseColor(type) {
  return BASE_TYPE_INFO[type]?.color || '#2a2a4a'
}

// ---------- STORE LOCALE ----------
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

// Stato editor
const selectedEntity = ref(null) // { type, subtype, size, orientation? }
const eraseMode = ref(false)
const selectionMode = ref(false) // per selezionare cella per marker
const selectedCell = ref(null)   // { x, y }
const selectedMarkerId = ref(0)

// Preview multi-cella
const previewPos = ref(null)
const previewShape = computed(() => {
  if (!selectedEntity.value || eraseMode.value || selectionMode.value) return null
  const sub = selectedEntity.value.subtype
  if (!sub || !sub.size) return null
  let [w,h] = sub.size
  if (sub.allowOrientation && currentOrientation.value === 'horizontal') [w,h] = [h,w]
  return { width: w, height: h }
})
const currentOrientation = ref('horizontal') // per buche lunghe

// Funzione per ruotare l'orientamento
function toggleOrientation() {
  if (selectedEntity.value?.subtype?.allowOrientation) {
    currentOrientation.value = currentOrientation.value === 'horizontal' ? 'vertical' : 'horizontal'
  }
}

function setEraseMode() { eraseMode.value = true; selectedEntity.value = null; selectionMode.value = false }
function selectBaseType(type) { eraseMode.value = false; selectionMode.value = false; selectedEntity.value = { type, subtype: null, size: [1,1] } }
function selectEntity(type, subtype) {
  eraseMode.value = false
  selectionMode.value = false
  selectedEntity.value = { type, subtype, size: subtype.size || [1,1] }
  if (subtype.allowOrientation) currentOrientation.value = 'horizontal'
}

// Colore di sfondo cella: rosso se è un marker (ancora), altrimenti colore base
function getCellBackgroundColor(cell) {
  if (cell.markerId !== undefined && cell.markerId !== null) {
    return '#cc3333'   // rosso intenso
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
  // Verifica confini e celle libere
  if (col + w > currentMap.value.cols || row + h > currentMap.value.rows) { alert("Fuori dalla mappa"); return }
  let canPlace = true
  for (let dy = 0; dy < h; dy++) {
    for (let dx = 0; dx < w; dx++) {
      const cell = currentMap.value.grid[row+dy][col+dx]
      if (cell.type !== CELL_TYPES.EMPTY && cell.type !== CELL_TYPES.FLOOR) { canPlace = false; break }
    }
  }
  if (!canPlace) { alert("Celle già occupate"); return }
  const entityId = Date.now() + Math.random()
  for (let dy = 0; dy < h; dy++) {
    for (let dx = 0; dx < w; dx++) {
      currentMap.value.grid[row+dy][col+dx] = {
        type: type,
        details: { id: entityId, subtypeId: subtype.id, label: subtype.label, emoji: subtype.emoji, size: [w,h] },
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
    currentMap.value.grid[row][col] = { type: CELL_TYPES.FLOOR, details: null, markerId: cell.markerId }
    return
  }
  // rimuovi tutte le celle con stesso id
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
  if (!previewShape.value || eraseMode.value || selectionMode.value) { previewPos.value = null; return }
  const { width, height } = previewShape.value
  if (col+width <= currentMap.value.cols && row+height <= currentMap.value.rows) previewPos.value = { x: col, y: row, w: width, h: height }
  else previewPos.value = null
}
function isInPreview(col, row) {
  if (!previewPos.value) return false
  const p = previewPos.value
  return col >= p.x && col < p.x+p.w && row >= p.y && row < p.y+p.h
}
function clearPreview() { previewPos.value = null }

// Marker Association
function startCellSelection() { selectionMode.value = true; eraseMode.value = false; selectedEntity.value = null }
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

// Gestione mappe
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
    grid: Array(rows).fill().map(() => Array(cols).fill().map(() => ({ type: CELL_TYPES.FLOOR, details: null, markerId: null })))
  }
  maps.value.push(newMap)
  saveMaps(maps.value)
  currentMapId.value = newMap.id
}
function selectMap(id) { currentMapId.value = id; selectedCell.value = null }
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
  let newGrid = Array(newRows).fill().map(() => Array(newCols).fill().map(() => ({ type: CELL_TYPES.FLOOR, details: null, markerId: null })))
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
  const exportData = { version: '1.0', maps: maps.value, exportedAt: new Date().toISOString() }
  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `heroquest_maps_${Date.now()}.json`
  a.click()
  URL.revokeObjectURL(url)
}
const fileInput = ref(null)
function triggerFileImport() { fileInput.value.click() }
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
    } catch(err) { alert("Errore importazione: " + err.message) }
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

onMounted(() => { if (maps.value.length) currentMapId.value = maps.value[0].id })
</script>

<style scoped>
/* Stili base (invariati rispetto all'originale, tranne aggiunte per marker e tooltip) */
.map-editor { min-height: 100vh; background: #0f0f1e; color: #eee; display: flex; flex-direction: column; padding: 1rem; }
.editor-header { display: flex; align-items: center; gap: 1rem; margin-bottom: 1rem; }
h1 { margin: 0; font-size: 1.4rem; flex: 1; }
.back-btn { background: none; border: none; color: #7c9ef5; font-size: 1.5rem; cursor: pointer; }
.icon-btn, .btn-new, .btn-primary, .btn-small { background: #2a2a4a; border: none; color: #ccc; border-radius: 8px; padding: 0.4rem 0.8rem; cursor: pointer; }
.btn-primary { background: #4a7cf5; color: white; }
.btn-small { font-size: 0.7rem; padding: 0.2rem 0.5rem; }
.editor-layout { display: flex; gap: 1.5rem; flex: 1; overflow: hidden; }
.sidebar { width: 280px; background: #1a1a2e; border-radius: 12px; padding: 1rem; display: flex; flex-direction: column; gap: 1rem; }
.map-list { flex: 1; overflow-y: auto; }
.map-item { display: flex; justify-content: space-between; background: #2a2a4a; border-radius: 8px; padding: 0.5rem; margin-bottom: 0.5rem; cursor: pointer; }
.map-item.active { border: 2px solid #4a7cf5; }
.marker-panel { background: #111122; border-radius: 12px; padding: 0.8rem; border-top: 1px solid #3a3a6a; }
.marker-controls { display: flex; flex-direction: column; gap: 0.5rem; margin-bottom: 0.5rem; }
.selected-cell-info { display: flex; justify-content: space-between; align-items: center; font-size: 0.8rem; margin-top: 0.5rem; }
.selection-mode-msg { color: #ffaa44; font-size: 0.7rem; margin-top: 0.3rem; }
.marker-hint { font-size: 0.65rem; color: #aaa; margin-top: 0.5rem; }
.editor-area { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
.map-header { display: flex; gap: 1rem; margin-bottom: 1rem; flex-wrap: wrap; }
.map-name-input { background: #2a2a4a; border: 1px solid #3a3a6a; border-radius: 8px; color: white; padding: 0.5rem; }
.size-controls { display: flex; gap: 0.5rem; align-items: flex-end; }
.tool-palette { display: flex; flex-wrap: wrap; gap: 1rem; margin-bottom: 1rem; max-height: 200px; overflow-y: auto; background: #0a0a14; padding: 0.5rem; border-radius: 12px; }
.tool-category { background: #1a1a2e; border-radius: 8px; padding: 0.5rem; min-width: 120px; }
.cat-title { font-size: 0.8rem; font-weight: bold; margin-bottom: 0.3rem; color: #aaa; }
.cat-items { display: flex; flex-wrap: wrap; gap: 0.3rem; }
.tool-item { display: flex; flex-direction: column; align-items: center; background: #2a2a4a; border-radius: 8px; padding: 0.2rem 0.5rem; cursor: pointer; min-width: 55px; }
.tool-item.active { border: 2px solid #4a7cf5; background: #2a2a5a; }
.tool-emoji { font-size: 1.4rem; }
.tool-label { font-size: 0.6rem; }
.grid-container { flex: 1; overflow: auto; background: #0a0a14; border-radius: 12px; padding: 1rem; }
.grid-wrapper { display: inline-block; }
.grid-row { display: flex; }
.grid-cell { width: 48px; height: 48px; border: 1px solid #3a3a6a; display: flex; align-items: center; justify-content: center; cursor: pointer; position: relative; }
.cell-selected { outline: 3px solid gold; z-index: 2; }
.cell-preview { background-color: rgba(100,200,100,0.4); }
.cell-emoji { font-size: 1.5rem; }
/* Stile per celle marker (ancora ArUco) */
.marker-cell {
  background-color: #cc3333 !important; /* rosso marcato */
}
.marker-number {
  font-size: 1.6rem;
  font-weight: bold;
  color: white;
  text-shadow: 1px 1px 0 #000;
}
/* Stile per il pulsante di rotazione */
.btn-rotate {
  background: #4a7cf5;
  border: none;
  color: white;
  border-radius: 6px;
  padding: 0.2rem 0.6rem;
  margin-left: 1rem;
  cursor: pointer;
  font-size: 0.7rem;
}
.no-map-selected { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; }
@media (max-width: 768px) { 
  .editor-layout { flex-direction: column; } 
  .sidebar { width: 100%; max-height: 300px; } 
  .grid-cell { width: 40px; height: 40px; } 
  .cell-emoji { font-size: 1.2rem; }
  .marker-number { font-size: 1.3rem; }
}
</style>