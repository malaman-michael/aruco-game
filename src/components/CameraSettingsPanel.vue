<template>
  <Teleport to="body">
    <transition name="slide-up">
      <div v-if="visible" class="settings-backdrop" @click.self="$emit('close')">
        <div class="settings-panel">

          <div class="panel-header">
            <span class="panel-title">⚙️ Impostazioni rilevamento</span>
            <button class="close-btn" @click="$emit('close')">✕</button>
          </div>

          <!-- Taratura automatica -->
          <div class="section">
            <button class="btn-calibrate" @click="$emit('calibrate')">🎯 Avvia taratura automatica</button>
          </div>

          <!-- Immagine -->
          <div class="section">
            <div class="section-title">📷 Immagine</div>

            <SliderRow label="Luminosità"  :value="cam.brightness"  :min="30"  :max="250" unit="%" @update="v => { cam.brightness  = v; cam.save() }" />
            <SliderRow label="Contrasto"   :value="cam.contrast"    :min="50"  :max="400" unit="%" @update="v => { cam.contrast    = v; cam.save() }" />
            <SliderRow label="Saturazione" :value="cam.saturation"  :min="0"   :max="200" unit="%" @update="v => { cam.saturation  = v; cam.save() }" />
            <SliderRow label="Nitidezza"   :value="cam.sharpness"   :min="0"   :max="5"   unit=""  :step="1" @update="v => { cam.sharpness = v; cam.save() }" />
          </div>

          <!-- Binarizzazione -->
          <div class="section">
            <div class="section-title">🔲 Binarizzazione (scarsa luce)</div>

            <div class="toggle-row">
              <span class="toggle-label">Scala di grigi</span>
              <button class="toggle-btn" :class="{ active: cam.grayscale }"
                @click="cam.grayscale = !cam.grayscale; cam.save()">
                {{ cam.grayscale ? 'ON' : 'OFF' }}
              </button>
            </div>

            <SliderRow label="Soglia binarizzazione" :value="cam.threshold"
              :min="0" :max="255" unit="" hint="0 = disabilitata"
              @update="v => { cam.threshold = v; cam.save() }" />

            <div class="preset-row">
              <span class="preset-label">Preset:</span>
              <button class="preset-btn" @click="applyPreset('bright')">☀️ Luce intensa</button>
              <button class="preset-btn" @click="applyPreset('dark')">🌙 Poca luce</button>
              <button class="preset-btn" @click="applyPreset('mixed')">⛅ Mista</button>
            </div>
          </div>

          <!-- Overlay AR -->
          <div class="section">
            <div class="section-title">🗺️ Overlay AR</div>

            <div class="toggle-row">
              <span class="toggle-label">Mostra griglia</span>
              <button class="toggle-btn" :class="{ active: cam.showGrid }"
                @click="cam.showGrid = !cam.showGrid; cam.save()">
                {{ cam.showGrid ? 'ON' : 'OFF' }}
              </button>
            </div>

            <SliderRow label="Opacità griglia" :value="Math.round(cam.gridOpacity * 100)"
              :min="10" :max="100" unit="%"
              @update="v => { cam.gridOpacity = v / 100; cam.save() }" />

            <div class="toggle-row">
              <span class="toggle-label">ID sui marker</span>
              <button class="toggle-btn" :class="{ active: cam.showIds }"
                @click="cam.showIds = !cam.showIds; cam.save()">
                {{ cam.showIds ? 'ON' : 'OFF' }}
              </button>
            </div>

            <div class="toggle-row">
              <span class="toggle-label">Effetto cubo 3D</span>
              <button class="toggle-btn" :class="{ active: cam.showCubes }"
                @click="cam.showCubes = !cam.showCubes; cam.save()">
                {{ cam.showCubes ? 'ON' : 'OFF' }}
              </button>
            </div>
          </div>

          <button class="reset-btn" @click="cam.reset()">↺ Ripristina default</button>
        </div>
      </div>
    </transition>
  </Teleport>
</template>

<script setup>
import { useCameraStore } from '../stores/cameraStore.js'
import SliderRow from './Sliderrow.vue'

defineProps({ visible: { type: Boolean, default: false } })
defineEmits(['close','calibrate'])

const cam = useCameraStore()

const PRESETS = {
  bright: { brightness: 70,  contrast: 150, saturation: 80,  grayscale: true,  threshold: 128, sharpness: 2 },
  dark:   { brightness: 160, contrast: 200, saturation: 100, grayscale: true,  threshold: 80,  sharpness: 3 },
  mixed:  { brightness: 110, contrast: 140, saturation: 90,  grayscale: false, threshold: 0,   sharpness: 1 },
}

function applyPreset(name) {
  const p = PRESETS[name]
  cam.brightness = p.brightness
  cam.contrast   = p.contrast
  cam.saturation = p.saturation
  cam.grayscale  = p.grayscale
  cam.threshold  = p.threshold
  cam.sharpness  = p.sharpness
  cam.save()
}
</script>

<style scoped>
.settings-backdrop {
  position: fixed; inset: 0; background: rgba(0,0,0,0.6);
  display: flex; align-items: flex-end; justify-content: center; z-index: 200;
}
.settings-panel {
  background: #1a1a2e; color: #eee; border-radius: 20px 20px 0 0;
  padding: 1.2rem 1rem 2rem; width: 100%; max-width: 480px;
  max-height: 85vh; overflow-y: auto;
}
.panel-header {
  display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;
}
.panel-title { font-size: 1.1rem; font-weight: 600; }
.close-btn { background: none; border: none; color: #aaa; font-size: 1.1rem; cursor: pointer; }

.section { margin-bottom: 1.2rem; }
.section-title {
  font-size: 0.8rem; color: #7c9ef5; font-weight: 600;
  margin-bottom: 0.7rem; text-transform: uppercase; letter-spacing: 0.05em;
}

.toggle-row {
  display: flex; justify-content: space-between; align-items: center;
  padding: 0.5rem 0; border-bottom: 1px solid #2a2a4a;
}
.toggle-label { font-size: 0.9rem; color: #ccc; }
.toggle-btn {
  background: #2a2a4a; border: 2px solid #3a3a6a; border-radius: 8px;
  color: #888; padding: 0.3rem 0.8rem; font-size: 0.85rem; cursor: pointer;
  min-width: 52px; transition: all 0.15s;
}
.toggle-btn.active { background: #2a4a8a; border-color: #4a7cf5; color: #7cb8ff; }

.preset-row {
  display: flex; align-items: center; gap: 0.4rem; flex-wrap: wrap; margin-top: 0.6rem;
}
.preset-label { font-size: 0.8rem; color: #888; }
.preset-btn {
  background: #2a2a4a; border: 1px solid #3a3a6a; border-radius: 8px;
  color: #ccc; padding: 0.3rem 0.6rem; font-size: 0.8rem; cursor: pointer;
}
.preset-btn:active { background: #3a3a6a; }

.reset-btn {
  width: 100%; background: #2a1a1a; border: 2px solid #6a3a3a;
  border-radius: 10px; color: #e08080; padding: 0.7rem;
  font-size: 0.95rem; cursor: pointer; margin-top: 0.5rem;
}

.slide-up-enter-active, .slide-up-leave-active { transition: transform 0.25s ease; }
.slide-up-enter-from, .slide-up-leave-to { transform: translateY(100%); }

.btn-calibrate {
  width: 100%; background: #1a3a2a; border: 2px solid #2a6a3a;
  border-radius: 12px; color: #7fff7f; padding: 0.8rem;
  font-size: 1rem; cursor: pointer; font-weight: 600;
}
</style>

<style>
.btn-calibrate {
  width: 100%; background: linear-gradient(135deg, #2a4a2a, #1a3a3a);
  border: 2px solid #3a7a3a; border-radius: 12px; color: #7fff7f;
  padding: 0.8rem; font-size: 1rem; cursor: pointer; font-weight: 600;
}
</style>