<template>
  <div class="setup-view">
    <!-- Header -->
    <div class="setup-header">
      <button class="back-btn" @click="$router.push('/')">←</button>
      <h1>Configurazione</h1>
      <div class="header-actions">
        <button class="icon-action" title="Esporta JSON" @click="doExport">💾</button>
        <label class="icon-action" title="Importa JSON">
          📂<input type="file" accept=".json" hidden @change="doImport">
        </label>
      </div>
    </div>

    <!-- Tabs -->
    <div class="tabs">
      <button
        v-for="t in tabs"
        :key="t.id"
        class="tab"
        :class="{ active: activeTab === t.id }"
        @click="activeTab = t.id"
      >
        {{ t.icon }} {{ t.label }}
      </button>
    </div>

    <!-- TAB: GRIGLIA -->
    <div v-if="activeTab === 'grid'" class="tab-content">
      <div class="card">
        <h2>Dimensioni griglia</h2>
        <div class="grid-inputs">
          <label>Colonne<input type="number" v-model.number="cols" min="4" max="40" /></label>
          <label>Righe<input type="number" v-model.number="rows" min="4" max="40" /></label>
        </div>
        <button class="btn-primary" @click="saveGrid">Salva griglia</button>
      </div>

      <div class="card">
        <h2>Marker angolo griglia</h2>
        <div class="corners-visual">
          <div class="corner-grid-display">
            <div
              v-for="pos in ['NO','NE','SO','SE']"
              :key="pos"
              class="corner-chip"
              :class="{ assigned: !!markersStore.corners[pos] }"
            >
              <strong>{{ pos }}</strong>
              <small v-if="markersStore.corners[pos]">#{{ markersStore.corners[pos].id }}</small>
              <small v-else>—</small>
            </div>
          </div>
          <p class="corners-hint">Assegna i 4 angoli puntando la camera sui marker durante il gioco</p>
        </div>
      </div>
    </div>

    <!-- TAB: MARKER -->
    <div v-if="activeTab === 'markers'" class="tab-content">
      <!-- Pulsante Aggiungi -->
      <div class="add-marker-header">
        <button class="btn-primary add-btn" @click="toggleAddForm">
          <span v-if="!showAddForm">➕ Aggiungi marker</span>
          <span v-else>✖ Chiudi form</span>
        </button>
      </div>

      <!-- Form di aggiunta marker -->
      <div v-if="showAddForm" class="add-marker-form card">
        <h3>Nuovo marker</h3>
        <div class="form-grid">
          <div class="form-field">
            <label>ID <span class="required">*</span></label>
            <input type="number" v-model.number="newMarker.id" min="0" step="1" placeholder="es. 42" />
          </div>
          <div class="form-field">
            <label>Nome <span class="required">*</span></label>
            <input v-model="newMarker.label" placeholder="Nome visualizzato" />
          </div>
          <div class="form-field">
            <label>Categoria <span class="required">*</span></label>
            <select v-model="newMarker.category" @change="onCategoryChange">
              <option value="corner">📍 Angolo</option>
              <option value="player">🧙 Giocatore</option>
              <option value="enemy">💀 Nemico</option>
              <option value="furniture">🚪 Mobile</option>
            </select>
          </div>
          <div class="form-field">
            <label>Sottotipo <span class="required">*</span></label>
            <select v-model="newMarker.role" :disabled="!newMarker.category">
              <option v-for="opt in subtypeOptions(newMarker.category)" :key="opt.id" :value="opt.id">
                {{ opt.emoji }} {{ opt.label }}
              </option>
            </select>
          </div>
          <div class="form-field full-width">
            <label>Descrizione</label>
            <input v-model="newMarker.description" placeholder="Opzionale" />
          </div>
        </div>
        <div class="form-actions">
          <button class="btn-primary" @click="addMarker" :disabled="!isAddFormValid">✓ Salva marker</button>
          <button class="btn-secondary" @click="cancelAddForm">Annulla</button>
        </div>
        <p v-if="addError" class="error-msg">{{ addError }}</p>
      </div>

      <!-- Filtri -->
      <div class="filters">
        <select v-model="filterCat" class="filter-select">
          <option value="">Tutti i tipi</option>
          <option value="corner">📍 Angolo</option>
          <option value="player">🧙 Giocatore</option>
          <option value="enemy">💀 Nemico</option>
          <option value="furniture">🚪 Mobile</option>
        </select>
        <input v-model="filterSearch" class="filter-input" placeholder="Cerca ID o nome…" />
      </div>

      <!-- Tabella marker -->
      <div class="marker-table-wrap">
        <table class="marker-table" v-if="filteredMarkers.length">
          <thead>
            <tr>
              <th>ID</th>
              <th>Emoji</th>
              <th>Nome</th>
              <th>Tipo</th>
              <th>Sottotipo</th>
              <th>Descrizione</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="m in filteredMarkers"
              :key="m.id"
              :class="['row-' + m.category, { editing: editingId === m.id }]"
            >
              <!-- ID editabile -->
              <td class="col-id">
                <template v-if="editingId === m.id">
                  <input
                    type="number"
                    v-model.number="editData.newId"
                    min="0"
                    step="1"
                    class="edit-input"
                    :class="{ 'input-error': editErrors.id }"
                  />
                  <div v-if="editErrors.id" class="field-error">{{ editErrors.id }}</div>
                </template>
                <template v-else>#{{ m.id }}</template>
              </td>

              <td class="col-emoji">{{ m.emoji }}</td>

              <td class="col-name">
                <template v-if="editingId === m.id">
                  <input class="edit-input" v-model="editData.label" />
                </template>
                <template v-else>{{ m.label }}</template>
              </td>

              <td class="col-type">
                <span class="type-badge" :class="m.category">{{ catLabel(m.category) }}</span>
              </td>

              <td class="col-sub">
                <template v-if="editingId === m.id">
                  <select class="edit-select" v-model="editData.role">
                    <option v-for="opt in subtypeOptions(editData.category)" :key="opt.id" :value="opt.id">
                      {{ opt.emoji }} {{ opt.label }}
                    </option>
                  </select>
                </template>
                <template v-else>{{ subtypeLabel(m.category, m.role) }}</template>
              </td>

              <td class="col-desc">
                <template v-if="editingId === m.id">
                  <input class="edit-input" v-model="editData.description" placeholder="descrizione opzionale" />
                </template>
                <template v-else>{{ m.description || '—' }}</template>
              </td>

              <td class="col-actions">
                <template v-if="editingId === m.id">
                  <button class="act-btn save" @click="saveEdit(m.id)">✓</button>
                  <button class="act-btn cancel" @click="cancelEdit">✕</button>
                </template>
                <template v-else>
                  <button class="act-btn edit" @click="startEdit(m)">✏️</button>
                  <button class="act-btn del" @click="deleteMarker(m.id)">🗑</button>
                </template>
              </td>
            </tr>
          </tbody>
        </table>
        <div v-else class="empty-table">
          {{ Object.keys(markersStore.registry).length === 0
            ? 'Nessun marker configurato — punta la camera sui marker durante il gioco'
            : 'Nessun marker corrisponde ai filtri' }}
        </div>
      </div>

      <button v-if="Object.keys(markersStore.registry).length" class="btn-danger" @click="clearAll">
        🗑 Cancella tutti i marker
      </button>
    </div>

    <!-- TAB: IMPORT/EXPORT -->
    <div v-if="activeTab === 'io'" class="tab-content">
      <div class="card">
        <h2>Esporta configurazione</h2>
        <p class="card-desc">Salva griglia, marker e impostazioni camera in un file JSON.</p>
        <button class="btn-primary" @click="doExport">💾 Scarica JSON</button>
      </div>

      <div class="card">
        <h2>Importa configurazione</h2>
        <p class="card-desc">
          Carica un file JSON esportato in precedenza.<br />
          <strong>Attenzione:</strong> sovrascrive tutti i marker e le impostazioni attuali.
        </p>
        <label class="btn-secondary file-label">
          📂 Scegli file JSON
          <input type="file" accept=".json" hidden @change="doImport" />
        </label>
      </div>

      <div v-if="importResult" class="card" :class="importResult.ok ? 'card-ok' : 'card-err'">
        <h2>{{ importResult.ok ? '✓ Importazione riuscita' : '⚠️ Importazione con errori' }}</h2>
        <p v-if="importResult.ok">
          Importati {{ importResult.imported?.markers?.length ?? 0 }} marker, griglia
          {{ importResult.imported?.grid?.cols }}×{{ importResult.imported?.grid?.rows }}.
        </p>
        <ul v-if="importResult.errors.length">
          <li v-for="e in importResult.errors" :key="e" class="err-item">{{ e }}</li>
        </ul>
      </div>

      <div class="card">
        <h2>Formato file JSON</h2>
        <pre class="json-schema">{{ jsonSchema }}</pre>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import {
  useMarkersStore,
  CORNER_ROLES,
  PLAYER_TYPES,
  ENEMY_TYPES,
  FURNITURE_TYPES,
} from '../stores/markersStore.js'
import { useGameStore } from '../stores/gameStore.js'
import { useCameraStore } from '../stores/cameraStore.js'
import { downloadConfig, importConfig, readFile } from '../services/configIO.js'

const markersStore = useMarkersStore()
const gameStore = useGameStore()
const cameraStore = useCameraStore()

// ─── Griglia ─────────────────────────────────────────────────────────────────
const cols = ref(gameStore.gridCols)
const rows = ref(gameStore.gridRows)

function saveGrid() {
  gameStore.setGridSize(cols.value, rows.value)
}

// ─── Tabs ────────────────────────────────────────────────────────────────────
const activeTab = ref('markers')
const tabs = [
  { id: 'markers', label: 'Marker', icon: '🎲' },
  { id: 'grid', label: 'Griglia', icon: '📐' },
  { id: 'io', label: 'Import/Export', icon: '📁' },
]

// ─── Filtri tabella ──────────────────────────────────────────────────────────
const filterCat = ref('')
const filterSearch = ref('')

const filteredMarkers = computed(() => {
  return Object.entries(markersStore.registry)
    .map(([id, data]) => ({ id: Number(id), ...data }))
    .filter((m) => {
      if (filterCat.value && m.category !== filterCat.value) return false
      if (filterSearch.value) {
        const q = filterSearch.value.toLowerCase()
        if (!String(m.id).includes(q) && !(m.label ?? '').toLowerCase().includes(q)) return false
      }
      return true
    })
    .sort((a, b) => a.id - b.id)
})

// ─── Labels ──────────────────────────────────────────────────────────────────
const CAT_LABELS = {
  corner: 'Angolo',
  player: 'Giocatore',
  enemy: 'Nemico',
  furniture: 'Mobile',
}
function catLabel(cat) {
  return CAT_LABELS[cat] ?? cat
}

const ALL_SUBTYPES = {
  corner: CORNER_ROLES.map((r) => ({ id: r, label: r, emoji: '📍' })),
  player: PLAYER_TYPES,
  enemy: ENEMY_TYPES,
  furniture: FURNITURE_TYPES,
}

function subtypeOptions(cat) {
  return ALL_SUBTYPES[cat] ?? []
}

function subtypeLabel(cat, role) {
  if (!role) return '—'
  const found = (ALL_SUBTYPES[cat] ?? []).find((o) => o.id === role)
  return found ? `${found.emoji} ${found.label}` : role
}

// ─── Editing inline con ID modificabile ─────────────────────────────────────
const editingId = ref(null)
const editData = ref({})
const editErrors = ref({})

function startEdit(m) {
  editingId.value = m.id
  editData.value = {
    newId: m.id,
    label: m.label,
    role: m.role,
    description: m.description ?? '',
    category: m.category,
  }
  editErrors.value = {}
}

function cancelEdit() {
  editingId.value = null
  editErrors.value = {}
}

function validateEditData(originalId) {
  const errors = {}
  const newId = editData.value.newId

  if (!Number.isInteger(newId) || newId < 0) {
    errors.id = 'ID deve essere un numero ≥ 0'
  } else if (newId !== originalId && markersStore.registry[newId]) {
    errors.id = `ID #${newId} già utilizzato`
  }

  if (!editData.value.label?.trim()) {
    errors.label = 'Nome obbligatorio'
  }

  editErrors.value = errors
  return Object.keys(errors).length === 0
}

function saveEdit(originalId) {
  if (!validateEditData(originalId)) return

  const newId = editData.value.newId
  const current = markersStore.getMarker(originalId)
  const sub = subtypeOptions(editData.value.category).find((o) => o.id === editData.value.role)

  const updatedData = {
    ...current,
    label: editData.value.label.trim(),
    role: editData.value.role,
    description: editData.value.description?.trim() || '',
    emoji: sub?.emoji ?? current.emoji,
  }

  if (newId !== originalId) {
    // Rimuovi vecchio marker
    markersStore.unregister(originalId)

    // Aggiorna eventuali riferimenti negli angoli
    for (const pos of ['NO', 'NE', 'SO', 'SE']) {
      if (markersStore.corners[pos]?.id === originalId) {
        markersStore.corners[pos] = { id: newId, ...updatedData }
      }
    }

    // Registra con nuovo ID
    markersStore.register(newId, updatedData)
  } else {
    markersStore.register(originalId, updatedData)
  }

  editingId.value = null
  editErrors.value = {}
}

function deleteMarker(id) {
  if (confirm(`Eliminare marker #${id}?`)) {
    markersStore.unregister(id)
    if (editingId.value === id) {
      editingId.value = null
      editErrors.value = {}
    }
  }
}

function clearAll() {
  if (confirm('Eliminare TUTTI i marker?')) {
    markersStore.clearAll()
    editingId.value = null
  }
}

// ─── Aggiunta marker ─────────────────────────────────────────────────────────
const showAddForm = ref(false)
const addError = ref('')
const newMarker = ref({
  id: null,
  label: '',
  category: 'player',
  role: '',
  description: '',
})

function toggleAddForm() {
  showAddForm.value = !showAddForm.value
  if (!showAddForm.value) resetAddForm()
}

function cancelAddForm() {
  showAddForm.value = false
  resetAddForm()
}

function resetAddForm() {
  newMarker.value = {
    id: null,
    label: '',
    category: 'player',
    role: '',
    description: '',
  }
  addError.value = ''
}

function onCategoryChange() {
  newMarker.value.role = ''
}

const isAddFormValid = computed(() => {
  return (
    newMarker.value.id !== null &&
    Number.isInteger(newMarker.value.id) &&
    newMarker.value.id >= 0 &&
    newMarker.value.label.trim() !== '' &&
    newMarker.value.category &&
    newMarker.value.role
  )
})

function addMarker() {
  addError.value = ''

  if (markersStore.registry[newMarker.value.id]) {
    addError.value = `ID #${newMarker.value.id} già utilizzato.`
    return
  }

  const sub = subtypeOptions(newMarker.value.category).find((o) => o.id === newMarker.value.role)
  const emoji = sub?.emoji || (newMarker.value.category === 'corner' ? '📍' : '❓')

  markersStore.register(newMarker.value.id, {
    label: newMarker.value.label.trim(),
    category: newMarker.value.category,
    role: newMarker.value.role,
    description: newMarker.value.description.trim() || '',
    emoji,
  })

  resetAddForm()
  showAddForm.value = false
}

// ─── Import / Export ─────────────────────────────────────────────────────────
const importResult = ref(null)

function doExport() {
  downloadConfig(markersStore, gameStore, cameraStore)
}

async function doImport(evt) {
  const file = evt.target.files?.[0]
  if (!file) return
  try {
    const text = await readFile(file)
    importResult.value = importConfig(text, markersStore, gameStore, cameraStore)
    if (importResult.value.ok) {
      cols.value = gameStore.gridCols
      rows.value = gameStore.gridRows
    }
  } catch (e) {
    importResult.value = { ok: false, errors: [e.message] }
  }
  evt.target.value = ''
}

// ─── Schema JSON ─────────────────────────────────────────────────────────────
const jsonSchema = `{
  "version": "1.0",
  "exportedAt": "2024-01-01T00:00:00.000Z",
  "grid": { "cols": 10, "rows": 10 },
  "camera": {
    "brightness": 100, "contrast": 100,
    "saturation": 100, "threshold": 0,
    "grayscale": false, "sharpness": 0
  },
  "markers": [
    {
      "id": 0,
      "category": "corner",
      "role": "NO",
      "label": "Angolo NO",
      "emoji": "📍",
      "description": ""
    }
  ]
}`
</script>

<style scoped>
/* Stili invariati + aggiunte per il form */
.setup-view {
  min-height: 100vh;
  background: #0f0f1e;
  color: #eee;
  padding-bottom: 2rem;
}

.setup-header {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  padding: 1rem 1rem env(safe-area-inset-top, 0.5rem);
  background: #1a1a2e;
  position: sticky;
  top: 0;
  z-index: 10;
}
h1 {
  margin: 0;
  font-size: 1.2rem;
  flex: 1;
}
.back-btn {
  background: none;
  border: none;
  color: #7c9ef5;
  font-size: 1.2rem;
  cursor: pointer;
  padding: 0.3rem;
}
.header-actions {
  display: flex;
  gap: 0.4rem;
}
.icon-action {
  background: #2a2a4a;
  border: 1px solid #3a3a6a;
  border-radius: 8px;
  color: #ccc;
  padding: 0.4rem 0.6rem;
  font-size: 1rem;
  cursor: pointer;
}

.tabs {
  display: flex;
  gap: 0;
  background: #1a1a2e;
  border-bottom: 2px solid #2a2a4a;
  padding: 0 1rem;
}
.tab {
  background: none;
  border: none;
  color: #888;
  padding: 0.7rem 1rem;
  font-size: 0.85rem;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  margin-bottom: -2px;
  transition: all 0.15s;
  white-space: nowrap;
}
.tab.active {
  color: #7c9ef5;
  border-bottom-color: #4a7cf5;
}

.tab-content {
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.card {
  background: #1a1a2e;
  border-radius: 14px;
  padding: 1.2rem;
}
.card-ok {
  border: 1px solid #2a6a2a;
  background: #1a2a1a;
}
.card-err {
  border: 1px solid #6a2a2a;
  background: #2a1a1a;
}
h2 {
  margin: 0 0 0.8rem;
  font-size: 0.95rem;
  color: #bbb;
}
.card-desc {
  color: #888;
  font-size: 0.88rem;
  line-height: 1.6;
  margin-bottom: 0.8rem;
}

.grid-inputs {
  display: flex;
  gap: 1.5rem;
  margin-bottom: 1rem;
}
label {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  font-size: 0.88rem;
  color: #aaa;
}
input[type='number'] {
  background: #2a2a4a;
  border: 2px solid #3a3a6a;
  border-radius: 8px;
  color: #eee;
  padding: 0.5rem 0.7rem;
  font-size: 1rem;
  width: 80px;
}

.corners-visual {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
}
.corner-grid-display {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
  max-width: 200px;
}
.corner-chip {
  background: #2a2a4a;
  border: 2px solid #3a3a6a;
  border-radius: 10px;
  padding: 0.6rem;
  text-align: center;
}
.corner-chip.assigned {
  border-color: #ffd700;
}
.corner-chip strong {
  display: block;
  font-size: 1rem;
}
.corner-chip small {
  color: #888;
  font-family: monospace;
  font-size: 0.78rem;
}
.corners-hint {
  font-size: 0.82rem;
  color: #666;
}

/* Filtri */
.filters {
  display: flex;
  gap: 0.6rem;
}
.filter-select,
.filter-input {
  background: #2a2a4a;
  border: 1px solid #3a3a6a;
  border-radius: 8px;
  color: #eee;
  padding: 0.5rem 0.7rem;
  font-size: 0.88rem;
}
.filter-select {
  flex: 0 0 auto;
}
.filter-input {
  flex: 1;
}

/* Tabella */
.marker-table-wrap {
  overflow-x: auto;
  border-radius: 12px;
  background: #1a1a2e;
}
.marker-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85rem;
}
.marker-table thead tr {
  background: #2a2a4a;
}
.marker-table th {
  padding: 0.6rem 0.8rem;
  text-align: left;
  color: #888;
  font-weight: 600;
  font-size: 0.78rem;
  text-transform: uppercase;
  border-bottom: 2px solid #3a3a6a;
  white-space: nowrap;
}
.marker-table td {
  padding: 0.55rem 0.8rem;
  border-bottom: 1px solid #222244;
  vertical-align: middle;
}
.marker-table tr:last-child td {
  border-bottom: none;
}
.marker-table tr.editing td {
  background: #1e2040;
}

.row-corner td:first-child {
  border-left: 3px solid #ffd700;
}
.row-player td:first-child {
  border-left: 3px solid #4a7cf5;
}
.row-enemy td:first-child {
  border-left: 3px solid #e54040;
}
.row-furniture td:first-child {
  border-left: 3px solid #b87820;
}

.col-id {
  font-family: monospace;
  color: #888;
  width: 70px;
}
.col-emoji {
  width: 40px;
  font-size: 1.2rem;
}
.col-name {
  font-weight: 500;
}
.col-type {
  width: 90px;
}
.col-sub {
  color: #aaa;
}
.col-desc {
  color: #666;
  font-size: 0.82rem;
  max-width: 140px;
}
.col-actions {
  width: 72px;
  white-space: nowrap;
}

.type-badge {
  display: inline-block;
  padding: 0.15rem 0.5rem;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 600;
}
.type-badge.corner {
  background: #3a3000;
  color: #ffd700;
}
.type-badge.player {
  background: #1a2a4a;
  color: #7cb8ff;
}
.type-badge.enemy {
  background: #3a1a1a;
  color: #ff8888;
}
.type-badge.furniture {
  background: #3a2a1a;
  color: #ffb060;
}

.edit-input,
.edit-select {
  background: #2a2a5a;
  border: 1px solid #4a4a8a;
  border-radius: 6px;
  color: #eee;
  padding: 0.3rem 0.5rem;
  font-size: 0.85rem;
  width: 100%;
}

.input-error {
  border-color: #ff6666 !important;
}

.field-error {
  color: #ff8888;
  font-size: 0.7rem;
  margin-top: 2px;
}

.act-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.2rem 0.3rem;
  font-size: 0.95rem;
  border-radius: 4px;
}
.act-btn.save {
  color: #7fff7f;
}
.act-btn.cancel {
  color: #ff8888;
}
.act-btn.edit {
  color: #aaa;
}
.act-btn.del {
  color: #ff6666;
}

.empty-table {
  padding: 2rem;
  text-align: center;
  color: #555;
  font-size: 0.9rem;
}

/* Pulsanti */
.btn-primary {
  background: #4a7cf5;
  color: #fff;
  border: none;
  border-radius: 10px;
  padding: 0.7rem 1.5rem;
  font-size: 0.95rem;
  cursor: pointer;
}
.btn-secondary {
  background: #2a2a4a;
  color: #aaa;
  border: 2px solid #3a3a6a;
  border-radius: 10px;
  padding: 0.6rem 1.2rem;
  font-size: 0.9rem;
  cursor: pointer;
}
.btn-danger {
  background: #3a1a1a;
  color: #ff8888;
  border: 2px solid #6a2a2a;
  border-radius: 10px;
  padding: 0.6rem 1.2rem;
  font-size: 0.9rem;
  cursor: pointer;
}
.file-label {
  display: inline-block;
  cursor: pointer;
}
.err-item {
  color: #ff8888;
  font-size: 0.85rem;
  margin: 0.2rem 0;
}

.json-schema {
  background: #0f0f1e;
  border-radius: 8px;
  padding: 0.8rem;
  font-size: 0.75rem;
  color: #7c9ef5;
  overflow-x: auto;
  font-family: monospace;
  line-height: 1.5;
  margin: 0;
}

/* Form aggiunta */
.add-marker-header {
  display: flex;
  align-items: center;
  margin-bottom: 0.5rem;
}
.add-btn {
  padding: 0.5rem 1.2rem;
  font-size: 0.9rem;
  background: #2a5a2a;
  border: 1px solid #4a8a4a;
  color: #d0ffd0;
}
.add-marker-form {
  margin-bottom: 1.5rem;
  background: #1e1e32;
}
.add-marker-form h3 {
  margin: 0 0 1rem 0;
  font-size: 1rem;
  color: #ccc;
}
.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}
.form-field {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}
.form-field.full-width {
  grid-column: span 2;
}
.form-field label {
  font-size: 0.85rem;
  color: #aaa;
}
.form-field .required {
  color: #ff8888;
  margin-left: 2px;
}
.form-field input,
.form-field select {
  background: #2a2a4a;
  border: 1px solid #3a3a6a;
  border-radius: 6px;
  color: #eee;
  padding: 0.5rem 0.7rem;
  font-size: 0.9rem;
}
.form-field select:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.form-actions {
  display: flex;
  gap: 0.8rem;
  margin-top: 1.2rem;
}
.error-msg {
  color: #ff8888;
  font-size: 0.85rem;
  margin: 0.5rem 0 0;
}

@media (max-width: 480px) {
  .form-grid {
    grid-template-columns: 1fr;
  }
  .form-field.full-width {
    grid-column: span 1;
  }
}

.setup-header {
  flex-wrap: wrap;
  padding: 0.8rem 1rem;
}

h1 {
  font-size: clamp(1.2rem, 6vw, 1.8rem);
}

.tabs {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  white-space: nowrap;
  padding: 0 0.5rem;
}

.tab {
  padding: 0.5rem 0.8rem;
  font-size: 0.9rem;
}

.tab-content {
  padding: 0.8rem;
}

.card {
  padding: 1rem;
}

.grid-inputs {
  flex-wrap: wrap;
  gap: 1rem;
}

.grid-inputs label {
  width: auto;
}

input[type='number'] {
  width: 100%;
  max-width: 100px;
}

.filters {
  flex-wrap: wrap;
}

.filter-select, .filter-input {
  width: 100%;
}

@media (min-width: 640px) {
  .filters {
    flex-wrap: nowrap;
  }
  .filter-select {
    width: auto;
  }
}

.marker-table-wrap {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

.marker-table {
  min-width: 700px; /* scroll su mobile */
}

/* Form aggiunta marker */
.form-grid {
  grid-template-columns: 1fr;
  gap: 0.8rem;
}

@media (min-width: 640px) {
  .form-grid {
    grid-template-columns: 1fr 1fr;
  }
  .form-field.full-width {
    grid-column: span 2;
  }
}

.form-actions {
  flex-direction: column;
  gap: 0.5rem;
}

@media (min-width: 480px) {
  .form-actions {
    flex-direction: row;
  }
}

.btn-primary, .btn-secondary, .btn-danger {
  padding: 0.6rem 1rem;
  font-size: 0.9rem;
  width: 100%;
}

@media (min-width: 480px) {
  .btn-primary, .btn-secondary, .btn-danger {
    width: auto;
  }
}

/* Corner grid display */
.corner-grid-display {
  max-width: 100%;
}


</style>