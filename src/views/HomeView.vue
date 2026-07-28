// src/views/HomeView.vue
<template>
  <div class="home-view">
    <!-- Skip link -->
    <a href="#main" class="skip-link">Salta al contenuto principale</a>

    <main id="main">
      <div class="hero">
        <div class="hero-icon">🎲</div>
        <h1>ArUco Game</h1>
        <p>Gioco da tavolo in realtà aumentata.<br />Punta la fotocamera sulla plancia.</p>
      </div>

      <div class="info-card">
        <p>
          <strong>{{ registeredCount }}</strong> marker registrati ·
          <strong>{{ gameStore.gridCols }}×{{ gameStore.gridRows }}</strong> griglia
        </p>
      </div>

      <!-- Sezione informazioni fotocamere -->
      <div v-if="cameraDevices.length" class="camera-info section-container">
        <h2 class="section-title">📷 Fotocamere rilevate</h2>
        <div class="camera-list">
          <div v-for="cam in cameraDevices" :key="cam.deviceId" class="camera-item">
            <div class="camera-icon">{{ cam.typeIcon }}</div>
            <div class="camera-details">
              <div class="camera-name">{{ cam.label || 'Senza nome' }}</div>
              <div class="camera-specs">
                <span v-if="cam.resolution">{{ cam.resolution.width }}×{{ cam.resolution.height }}</span>
                <span v-else>Risoluzione non disponibile</span>
                <span class="camera-type">{{ cam.typeLabel }}</span>
                <span v-if="cam.isWide" class="camera-badge badge-wide">📐 Grandangolare</span>
                <span v-if="cam.isMain" class="camera-badge badge-main">⭐ Principale</span>
                <span v-if="cam.isFront" class="camera-badge badge-front">🤳 Frontale</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <nav aria-label="Menu principale">
        <!-- Sezione Gioco -->
        <div class="section-container section-game">
          <h2 class="section-title">🎮 Gioco</h2>
          <div class="btn-group">
            <!--button class="btn-primary btn-play-wo-map" @click="$router.push('/gameOpenGrid')">
              🏞️ Campo aperto
              <span class="btn-desc">(usa configurazione pedine)</span>
            </button -->
            <button class="btn-primary btn-play-map" @click="$router.push('/gameWithMap')">
              🗺️ Con mappa
              <span class="btn-desc">(usa mappe editor)</span>
            </button>
            <button class="btn-secondary btn-setup" @click="$router.push('/setup')">
              ⚙️ Configurazione pedine e griglia
            </button>
            <button class="btn-secondary btn-map" @click="$router.push('/map-editor')">
              🗺️ Editor Mappa
            </button>
          </div>
        </div>

        <!-- Sezione Funzionalità aggiuntive / POC -->
        <div class="section-container section-features">
          <h2 class="section-title">🧪 Funzionalità aggiuntive</h2>
          <div class="btn-group">
            <button class="btn-accent btn-voice" @click="$router.push('/voice-color')">
              🎤 Cambia colore con la voce
            </button>
            <button class="btn-accent btn-gesture" @click="$router.push('/gesture-recognition')">
              🖐️ Riconoscimento gesti
            </button>
            <button class="btn-accent btn-assistant" @click="$router.push('/placement-assistant')">
              🎧 Guida al posizionamento
            </button>
            <button class="btn-accent btn-move" @click="$router.push('/voice-movement')">
              🎲 Muovi pedine con voce
            </button>
            <button class="btn-accent btn-settings" @click="$router.push('/settings')">
              Personalizzazione messaggi audio
            </button>
          </div>
        </div>
      </nav>
    </main>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useMarkersStore } from '../stores/markersStore.js'
import { useGameStore } from '../stores/gameStore.js'

const markersStore = useMarkersStore()
const gameStore = useGameStore()
const registeredCount = computed(() => Object.keys(markersStore.registry).length)

// Stato per le fotocamere
const cameraDevices = ref([])

// Funzione per ottenere la risoluzione di una fotocamera in modo temporaneo
async function getCameraResolution(deviceId) {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { deviceId: { exact: deviceId }, width: { ideal: 4096 }, height: { ideal: 2160 } }
    })
    const track = stream.getVideoTracks()[0]
    const settings = track.getSettings()
    // Alcuni browser potrebbero non dare larghezza/altezza precise, ma tentiamo
    let width = settings.width || settings.idealWidth || 0
    let height = settings.height || settings.idealHeight || 0
    // Se non funziona, proviamo a leggere da track.getCapabilities()
    if (!width || !height) {
      const cap = track.getCapabilities ? track.getCapabilities() : {}
      width = cap.width?.max || cap.width?.ideal || 0
      height = cap.height?.max || cap.height?.ideal || 0
    }
    // Chiudiamo lo stream dopo un breve timeout per non consumare risorse
    setTimeout(() => {
      stream.getTracks().forEach(t => t.stop())
    }, 100)
    return { width, height }
  } catch (e) {
    console.warn('Impossibile ottenere risoluzione per camera', deviceId, e)
    return null
  }
}

async function enumerateCameras() {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices()
    const videoDevices = devices.filter(d => d.kind === 'videoinput')
    if (videoDevices.length === 0) return

    const cameras = []
    for (const dev of videoDevices) {
      const label = dev.label.toLowerCase()
      const isFront = label.includes('front') || label.includes('selfie') || label.includes('facetime')
      const isWide = label.includes('wide') || label.includes('ultra') || label.includes('0.5')
      const isMain = label.includes('back') || label.includes('rear') || label.includes('main') || (!isFront && !isWide)
      let typeIcon = '📷'
      let typeLabel = 'Posteriore'
      if (isFront) { typeIcon = '🤳'; typeLabel = 'Frontale' }
      else if (isWide) { typeIcon = '🌄'; typeLabel = 'Grandangolare' }
      else if (isMain) { typeIcon = '📷'; typeLabel = 'Principale' }
      else { typeIcon = '📸'; typeLabel = 'Altro' }

      // Tentiamo di ottenere la risoluzione
      let resolution = null
      try {
        const res = await getCameraResolution(dev.deviceId)
        if (res && res.width && res.height) {
          resolution = res
        }
      } catch (e) {}

      cameras.push({
        deviceId: dev.deviceId,
        label: dev.label || 'Camera ' + (videoDevices.indexOf(dev) + 1),
        isFront,
        isWide,
        isMain,
        typeIcon,
        typeLabel,
        resolution
      })
    }
    cameraDevices.value = cameras
  } catch (e) {
    console.warn('Errore enumerazione fotocamere:', e)
  }
}

onMounted(() => {
  enumerateCameras()
  // Se le fotocamere vengono aggiunte/rimosse, ri-enumeriamo
  navigator.mediaDevices?.addEventListener?.('devicechange', enumerateCameras)
})
</script>

<style scoped>
/* ... stili esistenti ... */
.home-view {
  min-height: 100vh;
  background: linear-gradient(160deg, #0f0f1e 0%, #1a1a3a 100%);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem 1.5rem;
  color: #eee;
  gap: 2rem;
}
.hero {
  text-align: center;
}
.hero-icon {
  font-size: clamp(3rem, 15vw, 5rem);
  margin-bottom: 2.5rem;
}
h1 {
  margin: 0 0 0.5rem;
  font-size: clamp(1.8rem, 8vw, 2.5rem);
  letter-spacing: 1px;
}
p {
  color: #aaa;
  line-height: 1.6;
  font-size: clamp(0.9rem, 4vw, 1.1rem);
}
.subtitle {
  font-size: 0.9rem;
  background: rgba(255,255,255,0.05);
  padding: 0.5rem 1rem;
  border-radius: 12px;
  display: inline-block;
}
.info-card {
  background: #1a1a2e;
  border-radius: 12px;
  padding: 0.8rem 1.2rem;
  text-align: center;
  font-size: 0.9rem;
  color: #888;
  max-width: 90%;
}
.section-container {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  padding: 1.2rem 1rem;
  margin-bottom: 1.5rem;
  width: 100%;
  max-width: 1000px;
}
.section-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: #ccc;
  margin: 0 0 1rem 0;
  text-align: left;
  letter-spacing: 0.5px;
}
.btn-group {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.8rem;
  width: 100%;
}
.btn-group button {
  border-radius: 14px;
  padding: 0.8rem 1.2rem;
  font-size: 1rem;
  cursor: pointer;
  text-align: center;
  border: none;
  transition: all 0.2s ease;
  flex: 1 1 auto;
  min-width: 140px;
  white-space: nowrap;
  font-weight: 500;
  position: relative;
}
.btn-desc {
  display: block;
  font-size: 0.65rem;
  font-weight: 400;
  opacity: 0.7;
  margin-top: 0.2rem;
}
.btn-primary { color: #fff; font-weight: 600; }
.btn-play-wo-map { background: linear-gradient(135deg, #34d399, #059669); }
.btn-play-map { background: linear-gradient(135deg, #4a7cf5, #1e40af); }
.btn-secondary { background: #2a2a4a; color: #aaa; border: 2px solid #3a3a6a; }
.btn-secondary:hover { background: #3a3a6a; color: #fff; }
.btn-accent { color: #fff; font-weight: 500; }
.btn-voice { background: linear-gradient(135deg, #a855f7, #7c3aed); }
.btn-gesture { background: linear-gradient(135deg, #7c5ef5, #4a2faf); }
.btn-assistant { background: linear-gradient(135deg, #f94316, #c53010); }
.btn-move { background: linear-gradient(135deg, #3b82f6, #1e40af); }
.btn-settings { background: linear-gradient(135deg, #f59e0b, #d97706); }
.btn-group button:hover { transform: translateY(-2px); filter: brightness(1.05); box-shadow: 0 6px 12px rgba(0,0,0,0.2); }
.skip-link { position: absolute; top: -100px; left: 0; background: #4a7cf5; color: #fff; padding: 0.5rem 1rem; z-index: 1000; }
.skip-link:focus { top: 0; }

/* Nuovi stili per la sezione fotocamere */
.camera-info {
  background: rgba(0,0,0,0.3);
  border: 1px solid rgba(255,255,255,0.1);
}
.camera-list {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
}
.camera-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  background: rgba(255,255,255,0.05);
  border-radius: 12px;
  padding: 0.6rem 1rem;
}
.camera-icon {
  font-size: 1.8rem;
  width: 3rem;
  text-align: center;
}
.camera-details {
  flex: 1;
}
.camera-name {
  font-weight: 600;
  font-size: 0.95rem;
  color: #eee;
}
.camera-specs {
  font-size: 0.8rem;
  color: #aaa;
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;
  margin-top: 0.2rem;
}
.camera-type {
  background: rgba(255,255,255,0.1);
  padding: 0.1rem 0.5rem;
  border-radius: 12px;
}
.camera-badge {
  font-size: 0.7rem;
  padding: 0.1rem 0.5rem;
  border-radius: 12px;
  background: rgba(255,255,255,0.15);
}
.badge-wide { background: rgba(100,200,255,0.2); color: #7cb8ff; }
.badge-main { background: rgba(255,215,0,0.2); color: #ffd700; }
.badge-front { background: rgba(255,100,200,0.2); color: #ff88cc; }

@media (min-width: 640px) {
  .btn-group { gap: 1rem; }
  .btn-group button { padding: 0.9rem 1.4rem; font-size: 1rem; min-width: 160px; }
}
@media (min-width: 1024px) {
  .section-container { padding: 1.5rem 2rem; }
  .btn-group { gap: 1rem; }
  .btn-group button { flex: 0 1 auto; min-width: 180px; padding: 1rem 1.5rem; font-size: 1.05rem; }
}
@media (max-width: 480px) {
  .btn-group button { flex: 1 1 100%; white-space: normal; word-break: keep-all; }
  .camera-item { flex-wrap: wrap; }
  .camera-icon { font-size: 1.5rem; }
}
</style>