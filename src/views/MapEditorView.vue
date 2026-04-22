<template>
  <div class="map-editor">
    <!-- Header -->
    <div class="editor-header">
      <button class="back-btn" @click="$router.push('/')">←</button>
      <h1>Editor Mappa</h1>
      <div class="header-actions">
        <button class="icon-btn" @click="saveMap" title="Salva mappa">💾</button>
      </div>
    </div>

    <!-- Controlli dimensioni -->
    <div class="size-controls">
      <div class="size-input">
        <label>Colonne</label>
        <input type="number" v-model.number="tempCols" min="4" max="20" />
      </div>
      <div class="size-input">
        <label>Righe</label>
        <input type="number" v-model.number="tempRows" min="4" max="20" />
      </div>
      <button class="btn-primary" @click="applySize">Applica</button>
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
          v-for="(row, r) in mapStore.grid"
          :key="r"
          class="grid-row"
        >
          <div
            v-for="(cell, c) in row"
            :key="c"
            class="grid-cell"
            :style="{ backgroundColor: getCellColor(cell) }"
            @click="setCell(c, r)"
            @contextmenu.prevent="setCell(c, r, CELL_TYPES.EMPTY)"
          >
            <span class="cell-emoji">{{ CELL_TYPE_INFO[cell]?.emoji || '⬜' }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Azioni -->
    <div class="action-bar">
      <button class="btn-secondary" @click="clearMap">🧹 Pulisci tutto</button>
      <button class="btn-primary" @click="saveMap">💾 Salva mappa</button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useMapStore, CELL_TYPES, CELL_TYPE_INFO } from '../stores/mapStore.js'

const mapStore = useMapStore()

const tempCols = ref(mapStore.cols)
const tempRows = ref(mapStore.rows)
const selectedType = ref(CELL_TYPES.WALL)

onMounted(() => {
  tempCols.value = mapStore.cols
  tempRows.value = mapStore.rows
})

function applySize() {
  mapStore.setSize(tempCols.value, tempRows.value)
}

function setCell(col, row, forcedType = null) {
  const type = forcedType !== null ? forcedType : selectedType.value
  mapStore.setCell(col, row, type)
}

function getCellColor(type) {
  return CELL_TYPE_INFO[type]?.color || '#2a2a4a'
}

function clearMap() {
  if (confirm('Cancellare tutta la mappa?')) {
    mapStore.clearMap()
  }
}

function saveMap() {
  mapStore.saveToStorage()
  alert('Mappa salvata!')
}
</script>

<style scoped>
.map-editor {
  min-height: 100vh;
  background: #0f0f1e;
  color: #eee;
  display: flex;
  flex-direction: column;
  padding: 1rem;
  padding-bottom: 2rem;
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

.size-controls {
  display: flex;
  align-items: flex-end;
  gap: 1rem;
  background: #1a1a2e;
  padding: 1rem;
  border-radius: 12px;
  margin-bottom: 1rem;
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
  padding: 0.5rem;
  width: 70px;
  font-size: 1rem;
}

.tool-palette {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 1rem;
  justify-content: center;
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
  margin-bottom: 1rem;
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

.action-bar {
  display: flex;
  justify-content: center;
  gap: 1rem;
}
.btn-primary, .btn-secondary {
  padding: 0.7rem 1.5rem;
  border-radius: 10px;
  font-size: 1rem;
  cursor: pointer;
  border: none;
}
.btn-primary {
  background: #4a7cf5;
  color: #fff;
}
.btn-secondary {
  background: #2a2a4a;
  color: #aaa;
  border: 2px solid #3a3a6a;
}
</style>