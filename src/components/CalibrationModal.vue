<template>
  <Teleport to="body">
    <div v-if="visible" class="cal-backdrop">
      <div class="cal-modal">

        <div class="cal-header">
          <span class="cal-title">🎯 Taratura automatica</span>
          <button class="close-btn" :disabled="running" @click="$emit('close')">✕</button>
        </div>

        <!-- Istruzioni iniziali -->
        <div v-if="phase === 'idle'" class="cal-body">
          <p class="cal-desc">
            La taratura testa ~300 combinazioni di luminosità, contrasto e binarizzazione
            sul frame attuale per trovare quelle che riconoscono il maggior numero di marker.
          </p>
          <p class="cal-tip">
            💡 <strong>Prima di avviare:</strong> metti almeno 3-4 marker ArUco nel campo visivo
            della fotocamera e assicurati che siano a fuoco.
          </p>
          <button class="btn-primary" @click="startCalibration">▶ Avvia taratura</button>
        </div>

        <!-- Progress -->
        <div v-if="phase === 'running'" class="cal-body">
          <div class="progress-label">
            Analisi in corso… {{ progress }}%
            <span v-if="bestSoFar"> · migliore finora: {{ bestSoFar.count }} marker</span>
          </div>
          <div class="progress-bar"><div class="progress-fill" :style="{ width: progress + '%' }" /></div>
          <p class="cal-tip">Attendere — ci vogliono circa 5-10 secondi.</p>
        </div>

        <!-- Risultati -->
        <div v-if="phase === 'done'" class="cal-body">
          <div class="result-badge" :class="result.markersFound > 0 ? 'ok' : 'warn'">
            {{ result.markersFound > 0
              ? `✓ Trovati ${result.markersFound} marker con le impostazioni ottimali`
              : '⚠️ Nessun marker rilevato in nessuna combinazione — avvicina i marker alla camera' }}
          </div>

          <div v-if="result.markersFound > 0" class="settings-preview">
            <div class="sp-row"><span>Luminosità</span><strong>{{ result.settings.brightness }}%</strong></div>
            <div class="sp-row"><span>Contrasto</span><strong>{{ result.settings.contrast }}%</strong></div>
            <div class="sp-row"><span>Scala di grigi</span><strong>{{ result.settings.grayscale ? 'ON' : 'OFF' }}</strong></div>
            <div class="sp-row"><span>Soglia binarizzazione</span><strong>{{ result.settings.threshold || 'OFF' }}</strong></div>
            <div class="sp-row"><span>Nitidezza</span><strong>{{ result.settings.sharpness }}</strong></div>
          </div>

          <div class="result-actions">
            <button v-if="result.markersFound > 0" class="btn-primary" @click="applyResult">✓ Applica</button>
            <button class="btn-secondary" @click="phase = 'idle'">↺ Ritenta</button>
            <button class="btn-secondary" @click="$emit('close')">Chiudi</button>
          </div>
        </div>

      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref } from 'vue'
import { runCalibration } from '../services/calibrationService.js'
import { useCameraStore } from '../stores/cameraStore.js'

const props = defineProps({
  visible:     { type: Boolean, default: false },
  getFrame:    { type: Function, required: true },  // () => {imageData, detector}
})
const emit = defineEmits(['close', 'applied'])

const cam      = useCameraStore()
const phase    = ref('idle')   // idle | running | done
const progress = ref(0)
const bestSoFar = ref(null)
const result   = ref(null)
const running  = ref(false)

async function startCalibration() {
  const { imageData, detector } = props.getFrame()
  if (!imageData || !detector) {
    alert('Camera non pronta — avvia prima il rilevamento.')
    return
  }

  phase.value    = 'running'
  running.value  = true
  progress.value = 0
  bestSoFar.value = null

  try {
    const res = await runCalibration(imageData, detector, (pct, best) => {
      progress.value  = pct
      bestSoFar.value = best
    })
    result.value = res
    phase.value  = 'done'
  } catch (e) {
    alert('Errore durante la taratura: ' + e.message)
    phase.value = 'idle'
  } finally {
    running.value = false
  }
}

function applyResult() {
  const s = result.value.settings
  cam.brightness = s.brightness
  cam.contrast   = s.contrast
  cam.saturation = s.saturation ?? 100
  cam.sharpness  = s.sharpness
  cam.threshold  = s.threshold
  cam.grayscale  = s.grayscale
  cam.save()
  emit('applied', s)
  emit('close')
}
</script>

<style scoped>
.cal-backdrop {
  position: fixed; inset: 0; background: rgba(0,0,0,0.75);
  display: flex; align-items: center; justify-content: center;
  z-index: 300; padding: 1rem;
}
.cal-modal {
  background: #1a1a2e; color: #eee; border-radius: 16px;
  padding: 1.5rem; width: 100%; max-width: 420px;
}
.cal-header {
  display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.2rem;
}
.cal-title  { font-size: 1.1rem; font-weight: 700; }
.close-btn  { background: none; border: none; color: #aaa; font-size: 1.1rem; cursor: pointer; }
.close-btn:disabled { opacity: 0.3; cursor: not-allowed; }

.cal-body   { display: flex; flex-direction: column; gap: 1rem; }
.cal-desc   { color: #bbb; font-size: 0.9rem; line-height: 1.6; }
.cal-tip    { color: #888; font-size: 0.85rem; line-height: 1.5; }

.progress-label { font-size: 0.9rem; color: #aaa; }
.progress-bar   { background: #2a2a4a; border-radius: 4px; height: 10px; overflow: hidden; }
.progress-fill  { height: 100%; background: #4a7cf5; border-radius: 4px; transition: width 0.2s; }

.result-badge {
  padding: 0.8rem 1rem; border-radius: 10px; font-size: 0.9rem; font-weight: 600;
}
.result-badge.ok   { background: #1a3a1a; color: #7fff7f; border: 1px solid #2a6a2a; }
.result-badge.warn { background: #3a2a1a; color: #ffcc88; border: 1px solid #6a4a1a; }

.settings-preview {
  background: #2a2a4a; border-radius: 10px; overflow: hidden;
}
.sp-row {
  display: flex; justify-content: space-between; padding: 0.5rem 0.8rem;
  border-bottom: 1px solid #1a1a3a; font-size: 0.9rem;
}
.sp-row:last-child { border-bottom: none; }
.sp-row span { color: #aaa; }
.sp-row strong { color: #7c9ef5; }

.result-actions { display: flex; gap: 0.6rem; flex-wrap: wrap; }
.btn-primary {
  flex: 1; background: #4a7cf5; color: #fff; border: none;
  border-radius: 10px; padding: 0.7rem; font-size: 0.95rem; cursor: pointer;
}
.btn-secondary {
  background: #2a2a4a; color: #aaa; border: 2px solid #3a3a6a;
  border-radius: 10px; padding: 0.7rem 1rem; font-size: 0.9rem; cursor: pointer;
}
</style>