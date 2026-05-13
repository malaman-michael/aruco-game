<template>
  <div class="mask-editor">
    <h3>{{ title }}</h3>
    <div class="mask-grid" :style="{ gridTemplateColumns: `repeat(${cols}, 36px)` }">
      <div
        v-for="(row, r) in displayGrid"
        :key="r"
        class="mask-row"
      >
        <div
          v-for="(cell, c) in row"
          :key="c"
          class="mask-cell"
          :class="{ active: cell, center: isCenter(r, c) }"
          @click="toggleCell(r, c)"
        >
          {{ isCenter(r, c) ? '★' : '' }}
        </div>
      </div>
    </div>
    <div class="mask-actions">
      <button @click="fillAll(true)" class="btn-small">Tutti selezionati</button>
      <button @click="fillAll(false)" class="btn-small">Tutti deselezionati</button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  modelValue: { type: Array, default: () => [] },
  gridCols: { type: Number, required: true },
  gridRows: { type: Number, required: true },
  title: { type: String, default: 'Maschera' }
})

const emit = defineEmits(['update:modelValue'])

const cols = computed(() => props.gridCols * 2 + 1)
const rows = computed(() => props.gridRows * 2 + 1)
const centerRow = computed(() => props.gridRows)
const centerCol = computed(() => props.gridCols)

// displayGrid è una computed che restituisce la griglia da visualizzare
const displayGrid = computed(() => {
  // Se modelValue è un array valido con le dimensioni corrette, usalo
  if (props.modelValue && Array.isArray(props.modelValue) && props.modelValue.length === rows.value) {
    // Verifica anche che ogni riga abbia la lunghezza giusta
    if (props.modelValue.every(row => row && row.length === cols.value)) {
      return props.modelValue
    }
  }
  // Fallback: crea una griglia vuota delle dimensioni corrette
  return Array(rows.value).fill().map(() => Array(cols.value).fill(false))
})

function isCenter(r, c) {
  return r === centerRow.value && c === centerCol.value
}

function toggleCell(r, c) {
  if (isCenter(r, c)) return
  const newGrid = displayGrid.value.map(row => [...row])
  newGrid[r][c] = !newGrid[r][c]
  emit('update:modelValue', newGrid)
}

function fillAll(value) {
  const newGrid = displayGrid.value.map(row => row.map(() => value))
  newGrid[centerRow.value][centerCol.value] = false
  emit('update:modelValue', newGrid)
}
</script>

<style scoped>
.mask-editor {
  border: 1px solid #3a3a6a;
  border-radius: 8px;
  padding: 1rem;
  background: #1a1a2e;
}
.mask-grid {
  display: grid;
  gap: 2px;
  background: #2a2a4a;
  padding: 4px;
  overflow-x: auto;
  max-width: 100%;
}
.mask-row {
  display: contents;
}
.mask-cell {
  width: 36px;
  height: 36px;
  background: #2a2a4a;
  border: 1px solid #4a4a6a;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #ccc;
  font-size: 0.9rem;
}
.mask-cell.active {
  background: #4a7cf5;
  color: white;
}
.mask-cell.center {
  background: #ffd700;
  color: #000;
  cursor: not-allowed;
  border-color: #ffaa00;
}
.mask-actions {
  margin-top: 0.8rem;
  display: flex;
  gap: 0.5rem;
}
.btn-small {
  background: #2a2a4a;
  border: 1px solid #3a3a6a;
  border-radius: 6px;
  color: #ccc;
  padding: 0.2rem 0.6rem;
  cursor: pointer;
  font-size: 0.8rem;
}
</style>