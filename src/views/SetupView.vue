<template>
  <div class="setup-view">
    <div class="setup-header">
      <button class="back-btn" @click="$router.push('/')">← Indietro</button>
      <h1>Configurazione</h1>
    </div>

    <!-- Griglia -->
    <section class="card">
      <h2>Dimensioni griglia</h2>
      <div class="grid-inputs">
        <label>
          Colonne
          <input type="number" v-model.number="cols" min="4" max="30" />
        </label>
        <label>
          Righe
          <input type="number" v-model.number="rows" min="4" max="30" />
        </label>
      </div>
      <button class="btn-primary" @click="saveGrid">Salva griglia</button>
    </section>

    <!-- Marker registrati -->
    <section class="card">
      <h2>Marker registrati ({{ Object.keys(markersStore.registry).length }})</h2>
      <div v-if="!Object.keys(markersStore.registry).length" class="empty-list">
        Nessun marker configurato — puntate la fotocamera sui marker durante il gioco.
      </div>
      <div class="marker-list">
        <div
          v-for="(data, id) in markersStore.registry"
          :key="id"
          class="marker-row"
          :class="data.category"
        >
          <span class="marker-emoji">{{ data.emoji }}</span>
          <div class="marker-info">
            <strong>{{ data.label }}</strong>
            <small>#{{ id }} · {{ data.category }}</small>
          </div>
          <button class="del-btn" @click="deleteMarker(id)">🗑</button>
        </div>
      </div>
      <button v-if="Object.keys(markersStore.registry).length" class="btn-danger" @click="clearAll">
        Cancella tutto
      </button>
    </section>

    <!-- Corner status -->
    <section class="card">
      <h2>Angoli griglia</h2>
      <div class="corners-grid">
        <div
          v-for="pos in cornerRoles"
          :key="pos"
          class="corner-chip"
          :class="{ assigned: !!markersStore.corners[pos] }"
        >
          <strong>{{ pos }}</strong>
          <small v-if="markersStore.corners[pos]">#{{ markersStore.corners[pos].id }}</small>
          <small v-else>—</small>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useMarkersStore, CORNER_ROLES } from '../stores/markersStore.js'
import { useGameStore } from '../stores/gameStore.js'
import { useRouter } from 'vue-router'

const router = useRouter()
const markersStore = useMarkersStore()
const gameStore = useGameStore()

const cols = ref(gameStore.gridCols)
const rows = ref(gameStore.gridRows)
const cornerRoles = CORNER_ROLES

function saveGrid() {
  gameStore.setGridSize(cols.value, rows.value)
  router.push('/')
}

function deleteMarker(id) {
  markersStore.unregister(id)
}

function clearAll() {
  if (confirm('Cancellare tutti i marker registrati?')) {
    markersStore.clearAll()
  }
}
</script>

<style scoped>
.setup-view {
  min-height: 100vh;
  background: #0f0f1e;
  color: #eee;
  padding: 1rem;
  padding-top: env(safe-area-inset-top, 1rem);
}

.setup-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
}
h1 { margin: 0; font-size: 1.3rem; }
.back-btn { background: none; border: none; color: #7c9ef5; font-size: 1rem; cursor: pointer; }

.card {
  background: #1a1a2e;
  border-radius: 14px;
  padding: 1.2rem;
  margin-bottom: 1.2rem;
}
h2 { margin: 0 0 1rem; font-size: 1rem; color: #bbb; }

.grid-inputs {
  display: flex;
  gap: 1.5rem;
  margin-bottom: 1rem;
}
label {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  font-size: 0.9rem;
  color: #aaa;
}
input[type=number] {
  background: #2a2a4a;
  border: 2px solid #3a3a6a;
  border-radius: 8px;
  color: #eee;
  padding: 0.5rem 0.7rem;
  font-size: 1rem;
  width: 80px;
}

.btn-primary {
  background: #4a7cf5;
  color: #fff;
  border: none;
  border-radius: 10px;
  padding: 0.7rem 1.5rem;
  font-size: 0.95rem;
  cursor: pointer;
}
.btn-danger {
  background: #e54040;
  color: #fff;
  border: none;
  border-radius: 10px;
  padding: 0.6rem 1.2rem;
  font-size: 0.9rem;
  cursor: pointer;
  margin-top: 0.8rem;
}

.marker-list { display: flex; flex-direction: column; gap: 0.5rem; margin-bottom: 0.5rem; }
.marker-row {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  background: #2a2a4a;
  border-radius: 10px;
  padding: 0.6rem 0.8rem;
}
.marker-row.player   { border-left: 3px solid #4a7cf5; }
.marker-row.enemy    { border-left: 3px solid #e54040; }
.marker-row.furniture { border-left: 3px solid #b87820; }
.marker-row.corner   { border-left: 3px solid #ffd700; }
.marker-emoji { font-size: 1.5rem; }
.marker-info { flex: 1; }
.marker-info strong { display: block; font-size: 0.9rem; }
.marker-info small { color: #888; font-family: monospace; font-size: 0.78rem; }
.del-btn { background: none; border: none; cursor: pointer; font-size: 1rem; }

.empty-list { color: #666; font-size: 0.9rem; padding: 0.5rem 0; }

.corners-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.6rem;
}
.corner-chip {
  background: #2a2a4a;
  border-radius: 10px;
  padding: 0.7rem;
  text-align: center;
  border: 2px solid #3a3a6a;
}
.corner-chip.assigned { border-color: #ffd700; }
.corner-chip strong { display: block; font-size: 1.1rem; }
.corner-chip small { color: #888; font-family: monospace; }
</style>