// src/components/MarkerSetupDialog.vue
<template>
  <Teleport to="body">
    <div v-if="visible" class="dialog-backdrop" @click.self="cancel">
      <div class="dialog">
        <h2>Nuovo marker rilevato! <span class="marker-id">#{{ marker?.id }}</span></h2>
        <p class="subtitle">Di che tipo è questa pedina?</p>

        <div v-if="step === 1" class="categories">
          <button v-for="cat in categories" :key="cat.id" class="cat-btn" @click="selectCategory(cat.id)">
            <span class="cat-icon">{{ cat.icon }}</span>
            <span>{{ cat.label }}</span>
          </button>
        </div>

        <div v-if="step === 2" class="roles">
          <p class="hint">Seleziona il tipo:</p>
          <div class="type-list">
            <button v-for="t in currentTypes" :key="t.id" class="role-btn" @click="selectType(t)">
              <span class="type-emoji">{{ t.emoji }}</span>
              <span>{{ t.label }}</span>
            </button>
          </div>
          <button class="back-btn" @click="step = 1">← Indietro</button>
        </div>

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
import { MARKER_CATEGORIES, PLAYER_TYPES, ENEMY_TYPES } from '../stores/markersStore.js'
import { useMarkersStore } from '../stores/markersStore.js'

const props = defineProps({
  marker: { type: Object, default: null },
  visible: { type: Boolean, default: false },
})

const emit = defineEmits(['confirmed', 'cancelled'])

const markersStore = useMarkersStore()
const step = ref(1)
const selectedCategory = ref(null)
const selectedTypeId = ref(null)
const selectedLabel = ref('')
const selectedEmoji = ref('')

const categories = [
  { id: MARKER_CATEGORIES.PLAYER, label: 'Giocatore', icon: '🧙' },
  { id: MARKER_CATEGORIES.ENEMY, label: 'Nemico', icon: '💀' },
]

const currentTypes = computed(() => {
  if (selectedCategory.value === MARKER_CATEGORIES.PLAYER) return PLAYER_TYPES
  if (selectedCategory.value === MARKER_CATEGORIES.ENEMY) return ENEMY_TYPES
  return []
})

function selectCategory(catId) {
  selectedCategory.value = catId
  selectedTypeId.value = null
  step.value = 2
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
    role: selectedTypeId.value,
    label: selectedLabel.value,
    emoji: selectedEmoji.value,
  })
  emit('confirmed', {
    markerId: props.marker.id,
    category: selectedCategory.value,
    role: selectedTypeId.value,
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
  selectedTypeId.value = null
  selectedLabel.value = ''
  selectedEmoji.value = ''
}
</script>

<style scoped>
.dialog-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.7); display: flex; align-items: flex-end; justify-content: center; z-index: 100; padding: 0 0 env(safe-area-inset-bottom); }
.dialog { background: #1a1a2e; color: #eee; border-radius: 20px 20px 0 0; padding: 1.5rem 1.2rem; width: 100%; max-width: 480px; max-height: 80vh; overflow-y: auto; }
h2 { margin: 0 0 0.2rem; font-size: 1.2rem; }
.marker-id { color: #7c9ef5; font-family: monospace; }
.subtitle { margin: 0 0 1.2rem; color: #aaa; font-size: 0.9rem; }
.hint { margin: 0 0 0.8rem; color: #aaa; font-size: 0.9rem; }
.categories { display: grid; grid-template-columns: 1fr 1fr; gap: 0.7rem; }
.cat-btn { display: flex; flex-direction: column; align-items: center; gap: 0.4rem; background: #2a2a4a; border: 2px solid #3a3a6a; border-radius: 12px; color: #eee; padding: 1rem 0.5rem; font-size: 0.95rem; cursor: pointer; transition: background 0.15s, border-color 0.15s; }
.cat-btn:active { background: #3a3a7a; border-color: #7c9ef5; }
.cat-icon { font-size: 2rem; }
.type-list { display: grid; grid-template-columns: 1fr 1fr; gap: 0.6rem; margin-bottom: 1rem; }
.role-btn { display: flex; align-items: center; gap: 0.5rem; background: #2a2a4a; border: 2px solid #3a3a6a; border-radius: 10px; color: #eee; padding: 0.7rem 0.8rem; font-size: 0.9rem; cursor: pointer; }
.role-btn:active { background: #3a3a7a; }
.type-emoji { font-size: 1.4rem; }
.back-btn { background: none; border: none; color: #7c9ef5; font-size: 0.95rem; cursor: pointer; padding: 0.4rem 0; }
.confirm-card { display: flex; align-items: center; gap: 1rem; background: #2a2a4a; border-radius: 12px; padding: 1rem; margin-bottom: 1.2rem; }
.confirm-emoji { font-size: 2.5rem; }
.confirm-id { display: block; color: #aaa; font-size: 0.85rem; font-family: monospace; }
.confirm-btns { display: flex; gap: 0.8rem; }
.btn-primary, .btn-secondary { flex: 1; padding: 0.75rem; border-radius: 10px; border: none; font-size: 1rem; cursor: pointer; }
.btn-primary { background: #4a7cf5; color: #fff; }
.btn-secondary { background: #2a2a4a; color: #aaa; border: 2px solid #3a3a6a; }
@media (min-width: 480px) {
  .dialog { border-radius: 20px; margin-bottom: 20px; }
  .dialog-backdrop { align-items: center; }
}
</style>