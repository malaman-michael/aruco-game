<template>
  <div v-if="visible" class="modal-overlay" @click.self="$emit('close')">
    <div class="settings-panel">
      <div class="settings-header">
        <h3>⚙️ Impostazioni fotocamera</h3>
        <button class="close-btn" @click="$emit('close')">✕</button>
      </div>

      <div class="settings-content">
        <!-- Risoluzione -->
        <div class="setting-row">
          <label>Risoluzione fotocamera</label>
          <select v-model="selectedResolution" @change="onResolutionChange">
            <option v-for="res in resolutions" :key="res.value" :value="res.value">
              {{ res.label }}
            </option>
          </select>
        </div>

        <!-- FPS -->
        <div class="setting-row">
          <label>Frame rate (FPS)</label>
          <input type="range" v-model="fps" min="15" max="60" step="5" @change="onFpsChange" />
          <span class="value">{{ fps }} fps</span>
        </div>

        <!-- Modalità campo libero (free mode) -->
        <div class="setting-row">
          <label>Modalità campo libero</label>
          <div class="toggle-switch">
            <input type="checkbox" id="freeModeToggle" v-model="freeModeLocal" @change="onFreeModeToggle" />
            <label for="freeModeToggle" class="toggle-label"></label>
          </div>
          <span class="setting-hint">
            {{ freeModeLocal ? 'Coordinate assolute (px) · orientamento in gradi' : 'Griglia (colonna, riga) · orientamento N/S/E/O' }}
          </span>
        </div>

        <div class="setting-note">
          ℹ️ Le impostazioni si applicano dopo il riavvio della fotocamera.
        </div>
      </div>

      <div class="settings-footer">
        <button class="btn-reset" @click="resetToDefault">Ripristina default</button>
        <button class="btn-apply" @click="applyAndClose">Applica e chiudi</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useGameStore } from '../stores/gameStore'

const props = defineProps({
  visible: Boolean
})
const emit = defineEmits(['close'])

const gameStore = useGameStore()

// Stato locale delle impostazioni
const selectedResolution = ref('1280x720')
const fps = ref(30)
const freeModeLocal = ref(gameStore.freeMode)

// Liste predefinite
const resolutions = [
  { label: '640x480', value: '640x480' },
  { label: '800x600', value: '800x600' },
  { label: '1280x720', value: '1280x720' },
  { label: '1920x1080', value: '1920x1080' }
]

// Funzioni di modifica (da collegare al tuo servizio fotocamera)
function onResolutionChange() {
  // Implementa la logica per cambiare risoluzione
  console.log('Risoluzione impostata a:', selectedResolution.value)
}

function onFpsChange() {
  console.log('FPS impostati a:', fps.value)
}

function onFreeModeToggle() {
  gameStore.toggleFreeMode()
  // Aggiorna il valore locale per lo switch
  freeModeLocal.value = gameStore.freeMode
}

function resetToDefault() {
  selectedResolution.value = '1280x720'
  fps.value = 30
  if (gameStore.freeMode !== false) gameStore.toggleFreeMode()
  onResolutionChange()
  onFpsChange()
}

function applyAndClose() {
  // Eventuali salvataggi aggiuntivi
  emit('close')
}

// Sincronizza il toggle locale con lo store (se qualcuno lo modifica altrove)
watch(() => gameStore.freeMode, (newVal) => {
  freeModeLocal.value = newVal
})
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.settings-panel {
  background: #1a1a2e;
  border-radius: 20px;
  width: 400px;
  max-width: 90%;
  border: 1px solid #3a3a6a;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
  overflow: hidden;
}

.settings-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  background: #0f0f1e;
  border-bottom: 1px solid #3a3a6a;
}

.settings-header h3 {
  margin: 0;
  color: #eee;
  font-size: 1.2rem;
}

.close-btn {
  background: none;
  border: none;
  color: #aaa;
  font-size: 1.2rem;
  cursor: pointer;
  transition: color 0.15s;
}

.close-btn:hover {
  color: #fff;
}

.settings-content {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.2rem;
}

.setting-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.setting-row label {
  color: #ccc;
  font-size: 0.9rem;
  flex: 0 0 140px;
}

.setting-row select,
.setting-row input[type="range"] {
  background: #0f0f1e;
  border: 1px solid #3a3a6a;
  color: #fff;
  padding: 0.3rem 0.5rem;
  border-radius: 6px;
  flex: 1;
}

.setting-row .value {
  color: #4a7cf5;
  font-family: monospace;
  width: 45px;
  text-align: right;
}

.setting-hint {
  font-size: 0.7rem;
  color: #aaa;
  flex: 1;
  text-align: right;
}

/* Toggle switch personalizzato */
.toggle-switch {
  position: relative;
  display: inline-block;
  width: 50px;
  height: 24px;
  flex: 0 0 50px;
}

.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-label {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #3a3a6a;
  border-radius: 24px;
  transition: 0.2s;
}

.toggle-label:before {
  position: absolute;
  content: "";
  height: 20px;
  width: 20px;
  left: 2px;
  bottom: 2px;
  background-color: white;
  border-radius: 50%;
  transition: 0.2s;
}

input:checked + .toggle-label {
  background-color: #4a7cf5;
}

input:checked + .toggle-label:before {
  transform: translateX(26px);
}

.setting-note {
  font-size: 0.75rem;
  color: #888;
  text-align: center;
  margin-top: 0.5rem;
  padding-top: 0.5rem;
  border-top: 1px solid #2a2a4a;
}

.settings-footer {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  padding: 1rem 1.5rem;
  background: #0f0f1e;
  border-top: 1px solid #3a3a6a;
}

.btn-reset,
.btn-apply {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: bold;
  transition: background 0.15s;
}

.btn-reset {
  background: #2a2a4a;
  color: #ccc;
}

.btn-reset:hover {
  background: #3a3a6a;
}

.btn-apply {
  background: #4a7cf5;
  color: white;
}

.btn-apply:hover {
  background: #3a6be0;
}
</style>