<template>
  <Teleport to="body">
    <div v-if="visible" class="dialog-backdrop" @click.self="cancel">
      <div class="dialog">
        <h2>Nuovo marker rilevato! <span class="marker-id">#{{ marker?.id }}</span></h2>
        <p class="subtitle">Di che tipo è questa pedina?</p>

        <!-- Step 1: scegli categoria -->
        <div v-if="step === 1" class="categories">
          <button
            v-for="cat in categories"
            :key="cat.id"
            class="cat-btn"
            @click="selectCategory(cat.id)"
          >
            <span class="cat-icon">{{ cat.icon }}</span>
            <span>{{ cat.label }}</span>
          </button>
        </div>

        <!-- Step 2: scegli ruolo/tipo specifico -->
        <div v-if="step === 2" class="roles">
          <!-- Corner: scegli posizione NO/NE/SO/SE -->
          <template v-if="selectedCategory === 'corner'">
            <p class="hint">Seleziona l'angolo della griglia:</p>
            <div class="corner-grid">
              <button
                v-for="pos in cornerRoles"
                :key="pos"
                class="role-btn corner-btn"
                :disabled="isTakenCorner(pos)"
                @click="selectRole(pos)"
              >
                {{ pos }}
              </button>
            </div>
          </template>

          <!-- Player, Enemy, Furniture: scegli il tipo -->
          <template v-else>
            <p class="hint">Seleziona il tipo:</p>
            <div class="type-list">
              <button
                v-for="t in currentTypes"
                :key="t.id"
                class="role-btn"
                @click="selectType(t)"
              >
                <span class="type-emoji">{{ t.emoji }}</span>
                <span>{{ t.label }}</span>
              </button>
            </div>
          </template>

          <button class="back-btn" @click="step = 1">← Indietro</button>
        </div>

        <!-- Riepilogo prima di confermare -->
        <div v-if="step === 3" class="confirm">
          <div class="confirm-card">
            <span class="confirm-emoji">{{ selectedEmoji }}</span>
            <div>
              <strong>{{ selectedLabel }}</strong>
              <span class="confirm-id">Marker #{{ marker?.id }}</span>
            </div>
          </div>
          <div class="confirm-btns">
            <button class="btn-secondary" @click="step = 2">← Cambia</button>
            <button class="btn-primary" @click="confirm">✓ Conferma</button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, computed } from 'vue'
import {
  MARKER_CATEGORIES, CORNER_ROLES,
  PLAYER_TYPES, ENEMY_TYPES, FURNITURE_TYPES
} from '../stores/markersStore.js'
import { useMarkersStore } from '../stores/markersStore.js'

const props = defineProps({
  marker: { type: Object, default: null },
  visible: { type: Boolean, default: false },
})
const emit = defineEmits(['confirmed', 'cancelled'])

const markersStore = useMarkersStore()

const step = ref(1)
const selectedCategory = ref(null)
const selectedRole = ref(null)
const selectedTypeId = ref(null)
const selectedLabel = ref('')
const selectedEmoji = ref('')

const categories = [
  { id: MARKER_CATEGORIES.CORNER,    label: 'Angolo griglia', icon: '📍' },
  { id: MARKER_CATEGORIES.PLAYER,    label: 'Giocatore',      icon: '🧙' },
  { id: MARKER_CATEGORIES.ENEMY,     label: 'Nemico',         icon: '💀' },
  { id: MARKER_CATEGORIES.FURNITURE, label: 'Mobile/Oggetto', icon: '🚪' },
]

const cornerRoles = CORNER_ROLES

const currentTypes = computed(() => {
  if (selectedCategory.value === MARKER_CATEGORIES.PLAYER)    return PLAYER_TYPES
  if (selectedCategory.value === MARKER_CATEGORIES.ENEMY)     return ENEMY_TYPES
  if (selectedCategory.value === MARKER_CATEGORIES.FURNITURE) return FURNITURE_TYPES
  return []
})

function isTakenCorner(pos) {
  return !!(markersStore.corners[pos] && markersStore.corners[pos].id !== props.marker?.id)
}

function selectCategory(catId) {
  selectedCategory.value = catId
  selectedRole.value = null
  selectedTypeId.value = null
  step.value = 2
}

function selectRole(pos) {
  selectedRole.value = pos
  selectedLabel.value = `Angolo ${pos}`
  selectedEmoji.value = '📍'
  step.value = 3
}

function selectType(t) {
  selectedTypeId.value = t.id
  selectedLabel.value = t.label
  selectedEmoji.value = t.emoji
  step.value = 3
}

function confirm() {
  markersStore.register(props.marker.id, {
    category: selectedCategory.value,
    role: selectedRole.value,
    typeId: selectedTypeId.value,
    label: selectedLabel.value,
    emoji: selectedEmoji.value,
  })
  emit('confirmed', {
    markerId: props.marker.id,
    category: selectedCategory.value,
    role: selectedRole.value,
    typeId: selectedTypeId.value,
    label: selectedLabel.value,
    emoji: selectedEmoji.value,
  })
  reset()
}

function cancel() {
  emit('cancelled')
  reset()
}

function reset() {
  step.value = 1
  selectedCategory.value = null
  selectedRole.value = null
  selectedTypeId.value = null
  selectedLabel.value = ''
  selectedEmoji.value = ''
}
</script>

<style scoped>
.dialog-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.7);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: 100;
  padding: 0 0 env(safe-area-inset-bottom);
}

.dialog {
  background: #1a1a2e;
  color: #eee;
  border-radius: 20px 20px 0 0;
  padding: 1.5rem 1.2rem;
  width: 100%;
  max-width: 480px;
  max-height: 80vh;
  overflow-y: auto;
}

h2 { margin: 0 0 0.2rem; font-size: 1.2rem; }
.marker-id { color: #7c9ef5; font-family: monospace; }
.subtitle { margin: 0 0 1.2rem; color: #aaa; font-size: 0.9rem; }
.hint { margin: 0 0 0.8rem; color: #aaa; font-size: 0.9rem; }

.categories {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.7rem;
}

.cat-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.4rem;
  background: #2a2a4a;
  border: 2px solid #3a3a6a;
  border-radius: 12px;
  color: #eee;
  padding: 1rem 0.5rem;
  font-size: 0.95rem;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
}
.cat-btn:active { background: #3a3a7a; border-color: #7c9ef5; }
.cat-icon { font-size: 2rem; }

.type-list {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.6rem;
  margin-bottom: 1rem;
}

.corner-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.6rem;
  max-width: 200px;
  margin: 0 auto 1rem;
}

.role-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: #2a2a4a;
  border: 2px solid #3a3a6a;
  border-radius: 10px;
  color: #eee;
  padding: 0.7rem 0.8rem;
  font-size: 0.9rem;
  cursor: pointer;
}
.role-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.role-btn:active:not(:disabled) { background: #3a3a7a; }
.corner-btn { justify-content: center; font-size: 1.1rem; font-weight: 700; }
.type-emoji { font-size: 1.4rem; }

.back-btn {
  background: none;
  border: none;
  color: #7c9ef5;
  font-size: 0.95rem;
  cursor: pointer;
  padding: 0.4rem 0;
}

.confirm-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  background: #2a2a4a;
  border-radius: 12px;
  padding: 1rem;
  margin-bottom: 1.2rem;
}
.confirm-emoji { font-size: 2.5rem; }
.confirm-id { display: block; color: #aaa; font-size: 0.85rem; font-family: monospace; }

.confirm-btns { display: flex; gap: 0.8rem; }
.btn-primary, .btn-secondary {
  flex: 1;
  padding: 0.75rem;
  border-radius: 10px;
  border: none;
  font-size: 1rem;
  cursor: pointer;
}
.btn-primary { background: #4a7cf5; color: #fff; }
.btn-secondary { background: #2a2a4a; color: #aaa; border: 2px solid #3a3a6a; }


.dialog {
  width: 100%;
  max-width: 100%;
  border-radius: 20px 20px 0 0;
  padding: 1.2rem 1rem;
  max-height: 85vh;
}

@media (min-width: 480px) {
  .dialog {
    max-width: 480px;
    border-radius: 20px;
  }
}

.categories {
  grid-template-columns: 1fr;
  gap: 0.5rem;
}

@media (min-width: 400px) {
  .categories {
    grid-template-columns: 1fr 1fr;
  }
}

.type-list {
  grid-template-columns: 1fr;
}

@media (min-width: 400px) {
  .type-list {
    grid-template-columns: 1fr 1fr;
  }
}

.corner-grid {
  max-width: 100%;
}

.confirm-btns {
  flex-direction: column;
  gap: 0.5rem;
}

@media (min-width: 360px) {
  .confirm-btns {
    flex-direction: row;
  }
}

</style>