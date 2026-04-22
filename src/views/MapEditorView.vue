<template>
  <div class="map-editor">
    <!-- Header -->
    <div class="editor-header">
      <button class="back-btn" @click="$router.push('/')">←</button>
      <h1>Editor Mappe</h1>
      <div class="header-actions">
        <button class="icon-btn" @click="saveCurrentMapHandler" title="Salva mappa corrente">💾</button>
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

        <!-- Palette strumenti -->
        <div class="tool-palette">
          <div
            v-for="(info, type) in CELL_TYPE_INFO"
            :key="type"
            class="tool-item"
            :class="{ active: selectedType === type }"
            @click="selectedType = type"
          >
            <span class="tool-emoji">{{ info.emoji }}</span>
            <span class="tool-label">{{ info.label }}</span>
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
                :style="{ backgroundColor: getCellColor(cell) }"
                @click="setCellHandler(c, r)"
                @contextmenu.prevent="setCellHandler(c, r, CELL_TYPES.EMPTY)"
              >
                <span class="cell-emoji">{{ CELL_TYPE_INFO[cell]?.emoji || '⬜' }}</span>
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
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useMapStore, CELL_TYPES, CELL_TYPE_INFO } from '../stores/mapStore.js'

const mapStore = useMapStore()

const mapName = ref('')
const tempCols = ref(10)
const tempRows = ref(10)
const selectedType = ref(CELL_TYPES.WALL)
const currentMapId = ref(null)

const currentMap = computed(() => mapStore.currentMap)

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

function setCellHandler(col, row, forcedType = null) {
  if (!currentMap.value) return
  const type = forcedType !== null ? forcedType : selectedType.value
  mapStore.setCell(col, row, type)
}

function getCellColor(type) {
  return CELL_TYPE_INFO[type]?.color || '#2a2a4a'
}
</script>

<style scoped>
/* (includere gli stili del messaggio precedente) */
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
</style>