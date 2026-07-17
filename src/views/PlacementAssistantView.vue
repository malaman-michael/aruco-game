<template>
  <div class="assistant-view">
    <div v-show="debugMode" class="camera-preview">
      <CameraView ref="cameraViewRef" :active="true" @unknown-marker="onUnknownMarker" @frame-processed="onFrameProcessed" />
    </div>

    <div class="assistant-header">
      <button class="back-btn" @click="$router.push('/')">←</button>
      <h1>🎧 Guida al posizionamento</h1>
      <div class="header-buttons">
        <button class="debug-toggle" :class="{ active: debugMode }" @click="toggleDebug"> 🐞 {{ debugMode ? 'Debug ON' : 'Debug OFF' }} </button>
        <button class="voice-toggle" :class="{ active: voiceEnabled }" @click="toggleVoice"> 🔊 {{ voiceEnabled ? 'Voce attiva' : 'Voce disattivata' }} </button>
      </div>
    </div>

    <div class="assistant-content">
      <div v-if="!calibrationComplete && !isRunning" class="calibration-warning card">
        <h3>⚠️ Calibrazione campo da gioco</h3>
        <p>Per iniziare il posizionamento, devi avere almeno 3 ancore ArUco visibili sulla mappa.</p>
        <div class="corner-status">
          <div class="corner-status-item" :class="{ detected: gameStore.visibleAnchorsCount >= 1 }">
            <span class="corner-role">Ancore</span>
            <span class="corner-status">{{ gameStore.visibleAnchorsCount }} / 3</span>
          </div>
          <div class="corner-status-item" :class="{ detected: gameStore.homographyReady }">
            <span class="corner-role">Omografia</span>
            <span class="corner-status">{{ gameStore.homographyReady ? '✅' : '❌' }}</span>
          </div>
        </div>
        <p class="calibration-hint">🎯 Inquadra almeno 3 marker ArUco associati a celle della mappa</p>
        <button v-if="gameStore.homographyReady" class="btn-primary" @click="calibrate">✅ Calibra e inizia</button>
      </div>

      <div v-if="debugMode" class="webcam-preview card">
        <h3>📷 Anteprima marker</h3>
        <div class="preview-container">
          <canvas ref="videoCanvas" class="preview-canvas"></canvas>
          <div class="marker-list" v-if="debugMarkers.length">
            <h4>Marker rilevati:</h4>
            <div v-for="marker in debugMarkers" :key="marker.id" class="marker-item">
              <span class="marker-id">ID: {{ marker.id }}</span>
              <span class="marker-pos">{{ Math.round(marker.center.x) }}, {{ Math.round(marker.center.y) }}</span>
              <span v-if="isAnchor(marker.id)" class="marker-anchor">📍 Ancora</span>
            </div>
          </div>
        </div>
      </div>

      <div class="map-selector card">
        <label for="mapSelect">Mappa da preparare:</label>
        <select id="mapSelect" v-model="selectedMapId" @change="loadMap">
          <option v-for="map in mapStore.maps" :key="map.id" :value="map.id">
            {{ map.name }} ({{ map.cols }}×{{ map.rows }})
          </option>
        </select>
        <button v-if="selectedMapId && calibrationComplete" class="btn-primary" @click="startAssistant">▶️ Avvia assistente</button>
      </div>

      <div v-if="isRunning" class="assistant-panel card">
        <div class="progress">
          <span>Pezzo {{ currentIndex + 1 }} di {{ piecesToPlace.length }}</span>
          <div class="progress-bar" :style="{ width: ((currentIndex+1)/piecesToPlace.length)*100 + '%' }"></div>
        </div>
        <div class="current-step">
          <h2>{{ currentPiece ? currentPiece.label : 'Fine' }}</h2>
          <div class="details">
            <p><strong>Posizione:</strong> {{ currentPiece ? formatPosition(currentPiece.col, currentPiece.row) : '' }}</p>
            <p><strong>Tipo:</strong> {{ pieceTypeLabel(currentPiece) }}</p>
            <p v-if="currentPiece?.details?.description" class="description">{{ currentPiece.details.description }}</p>
          </div>
        </div>
        <div class="voice-controls">
          <button class="btn-speak" @click="speakCurrentInstruction">🔊 Ripeti istruzione</button>
          <button class="btn-confirm" @click="confirmPlacement">✅ Segna come posizionato</button>
          <button class="btn-skip" @click="skipPiece">⏩ Salta (posiziona dopo)</button>
        </div>
        <div class="nav-buttons">
          <button class="btn-prev" @click="prevPiece" :disabled="currentIndex === 0">← Precedente</button>
          <button class="btn-next" @click="nextPiece" :disabled="currentIndex === piecesToPlace.length - 1">Prossimo →</button>
        </div>
        <div class="completion" v-if="isComplete">
          <h3>🎉 Posizionamento completato!</h3>
          <p>Hai posizionato tutti i pezzi. Puoi ora avviare il gioco.</p>
          <button class="btn-primary" @click="$router.push('/gameWithMap')">🎮 Vai al gioco</button>
        </div>
        <div v-if="placementWarning" class="placement-warning"> ⚠️ {{ placementWarning }} </div>
      </div>

      <div class="instructions card">
        <h3>📖 Come usare l'assistente</h3>
        <ul>
          <li>Prima di iniziare, assicurati che almeno 3 marker ancore siano visibili.</li>
          <li>L'assistente ti guiderà a posizionare tutti i pezzi della mappa.</li>
          <li>Ogni pezzo viene letto ad alta voce con posizione e tipo.</li>
          <li>Premi <strong>🔊 Ripeti istruzione</strong> per riascoltare.</li>
          <li>Dopo aver posizionato il pezzo fisico, premi <strong>✅ Segna come posizionato</strong>.</li>
          <li>Se non hai ancora un pezzo, puoi saltarlo (verrà proposto di nuovo alla fine).</li>
          <li>Usa i pulsanti o le frecce della tastiera per navigare.</li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useMapStore, CELL_TYPES, CELL_TYPE_INFO } from '../stores/mapStore.js'
import { useMarkersStore } from '../stores/markersStore.js'
import { useGameStore } from '../stores/gameStore.js'
import { voice } from '../services/voiceService.js'
import CameraView from '../components/CameraView.vue'

const mapStore = useMapStore()
const markersStore = useMarkersStore()
const gameStore = useGameStore()

const selectedMapId = ref(null)
const isRunning = ref(false)
const piecesToPlace = ref([])
const currentIndex = ref(0)
const voiceEnabled = ref(voice.enabled)
const debugMode = ref(false)
const calibrationComplete = ref(false)
const cameraViewRef = ref(null)
const videoCanvas = ref(null)
let animationFrame = null
let currentMarkers = []

const debugMarkers = ref([])
const placementWarning = ref('')

const allAnchorsVisible = computed(() => gameStore.visibleAnchorsCount >= 3)
const homographyReady = computed(() => gameStore.homographyReady)
const isComplete = computed(() => piecesToPlace.value.length === 0 && isRunning.value)
const currentPiece = computed(() => {
  if (!piecesToPlace.value.length) return null
  return piecesToPlace.value[currentIndex.value] || null
})

function colToLetter(col) {
  return String.fromCharCode(65 + col)
}

function formatPosition(col, row) {
  return `${colToLetter(col)}${row + 1}`
}

function pieceTypeLabel(piece) {
  if (!piece) return ''
  const type = piece.type
  const info = CELL_TYPE_INFO[type]
  if (piece.details?.label) return piece.details.label
  if (info) return info.label
  return type
}

function loadMap() {
  if (selectedMapId.value) {
    mapStore.loadMap(selectedMapId.value)
  }
}

function preparePieceList() {
  const map = mapStore.currentMap
  if (!map) return []
  const list = []
  for (let row = 0; row < map.rows; row++) {
    for (let col = 0; col < map.cols; col++) {
      const cell = map.grid[row][col]
      if (cell.type !== CELL_TYPES.EMPTY) {
        list.push({ ...cell, col, row })
      }
    }
  }
  return list
}

function isAnchor(markerId) {
  const map = mapStore.currentMap
  if (!map) return false
  for (let row = 0; row < map.rows; row++) {
    for (let col = 0; col < map.cols; col++) {
      if (map.grid[row][col].markerId === markerId) return true
    }
  }
  return false
}

function onFrameProcessed(payload) {
  const markers = payload?.markers || []
  currentMarkers = markers
  debugMarkers.value = markers.map(m => ({
    id: m.id,
    center: m.center,
    rotation: m.rotation
  }))

  // Verifica se l'omografia è pronta
  if (gameStore.homographyReady && !calibrationComplete) {
    calibrationComplete = true
    voice.say('Calibrazione completata! Ora puoi avviare il posizionamento.', 'calibration_done', 2)
  }

  if (debugMode.value) {
    drawDebugOverlay(markers)
  }
}

function onUnknownMarker(marker) {
  console.log('Marker sconosciuto:', marker)
}

function drawDebugOverlay(markers) {
  const canvas = videoCanvas.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const videoElement = cameraViewRef.value?.$el?.querySelector('video')
  if (videoElement && videoElement.videoWidth) {
    canvas.width = videoElement.videoWidth
    canvas.height = videoElement.videoHeight
    ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height)
    for (const marker of markers) {
      const anchor = isAnchor(marker.id)
      ctx.save()
      ctx.translate(marker.center.x, marker.center.y)
      ctx.rotate(marker.rotation)
      ctx.strokeStyle = anchor ? '#4a7cf5' : '#ffaa44'
      ctx.lineWidth = 4
      const size = marker.size || 100
      ctx.strokeRect(-size/2, -size/2, size, size)
      ctx.font = 'bold 16px monospace'
      ctx.fillStyle = anchor ? '#4a7cf5' : '#ffaa44'
      ctx.shadowBlur = 2
      ctx.shadowColor = 'black'
      const label = anchor ? `Ancora #${marker.id}` : `ID: ${marker.id}`
      ctx.fillText(label, -40, -size/2 - 10)
      ctx.fillText(`${Math.round(marker.center.x)}, ${Math.round(marker.center.y)}`, -40, size/2 + 20)
      ctx.restore()
      ctx.beginPath()
      ctx.arc(marker.center.x, marker.center.y, 5, 0, 2 * Math.PI)
      ctx.fillStyle = anchor ? '#4a7cf5' : '#ffaa44'
      ctx.fill()
    }
  }
}

function toggleDebug() {
  debugMode.value = !debugMode.value
  if (!debugMode.value && animationFrame) {
    cancelAnimationFrame(animationFrame)
    animationFrame = null
  }
}

function startDebugCanvasUpdate() {
  if (!debugMode.value) return
  const updateCanvas = () => {
    if (debugMode.value && currentMarkers.length) {
      drawDebugOverlay(currentMarkers)
    }
    animationFrame = requestAnimationFrame(updateCanvas)
  }
  updateCanvas()
}

function calibrate() {
  if (!gameStore.homographyReady) {
    voice.say('Omografia non pronta. Assicurati di avere almeno 3 ancore visibili.', 'calibration_error', 2)
    return
  }
  calibrationComplete.value = true
  voice.say('Calibrazione completata! Ora puoi avviare il posizionamento.', 'calibration_done', 2)
}

function startAssistant() {
  if (!selectedMapId.value) {
    alert('Seleziona prima una mappa')
    return
  }
  enableVoice()
  if (!voiceEnabled.value) {
    alert('⚠️ La voce è disattivata. Attivala per sentire le istruzioni vocali.')
  }
  if (!mapStore.currentMap || mapStore.currentMap.id !== selectedMapId.value) {
    mapStore.loadMap(selectedMapId.value)
  }
  piecesToPlace.value = preparePieceList()
  currentIndex.value = 0
  isRunning.value = true
  placementWarning.value = ''
  setTimeout(() => speakCurrentInstruction(), 500)
}

function enableVoice() {
  if (!voice.enabled) {
    voice.enable()
  }
  voiceEnabled.value = voice.enabled
}

function toggleVoice() {
  voice.toggle()
  voiceEnabled.value = voice.enabled
  if (voiceEnabled.value) {
    voice.say('Assistente vocale attivato.', 'assistant_toggle', 2)
  }
}

function speakCurrentInstruction() {
  const piece = currentPiece.value
  if (!piece) return
  if (!voiceEnabled.value) {
    console.log('Voce disattivata, nessun audio')
    return
  }
  const typeName = pieceTypeLabel(piece)
  const position = formatPosition(piece.col, piece.row)
  let message = ''
  switch (piece.type) {
    case CELL_TYPES.WALL:
      message = `Posiziona un muro nella cella ${position}.`
      break
    case CELL_TYPES.DOOR_CLOSED:
      message = `Posiziona una porta chiusa nella cella ${position}.`
      break
    case CELL_TYPES.DOOR_OPEN:
      message = `Posiziona una porta aperta nella cella ${position}.`
      break
    case CELL_TYPES.DOOR_SECRET:
      message = `Posiziona una porta segreta nella cella ${position}.`
      break
    case CELL_TYPES.STAIRS:
      message = `Posiziona le scale nella cella ${position}.`
      break
    case CELL_TYPES.FURNITURE:
      message = `Posiziona ${typeName} nella cella ${position}.`
      break
    case CELL_TYPES.TRAP:
      message = `Posiziona la trappola ${typeName} nella cella ${position}.`
      break
    default:
      message = `Posiziona ${typeName} nella cella ${position}.`
  }
  voice.say(message, `placement_${currentIndex.value}`, 2)
}

function checkPlacement() {
  const expectedCol = currentPiece.value?.col
  const expectedRow = currentPiece.value?.row
  if (expectedCol !== undefined && expectedRow !== undefined) {
    const nearbyMarkers = currentMarkers.filter(marker => {
      return !isAnchor(marker.id)
    })
    if (nearbyMarkers.length === 0 && gameStore.homographyReady) {
      placementWarning.value = `Nessun marker rilevato. Posiziona il pezzo nella cella ${formatPosition(expectedCol, expectedRow)}`
    } else {
      placementWarning.value = ''
    }
  }
}

function confirmPlacement() {
  checkPlacement()
  if (placementWarning.value) {
    voice.say(placementWarning.value, 'placement_warning', 2)
    return
  }
  const idx = currentIndex.value
  if (idx >= piecesToPlace.value.length) return
  piecesToPlace.value.splice(idx, 1)
  if (currentIndex.value >= piecesToPlace.value.length) {
    currentIndex.value = piecesToPlace.value.length - 1
  }
  if (currentPiece.value) {
    speakCurrentInstruction()
  } else {
    voice.say('Tutti i pezzi sono stati posizionati. Buon divertimento!', 'placement_complete', 2)
  }
  placementWarning.value = ''
}

function skipPiece() {
  if (!currentPiece.value) return
  const skipped = piecesToPlace.value.splice(currentIndex.value, 1)[0]
  piecesToPlace.value.push(skipped)
  if (currentIndex.value >= piecesToPlace.value.length) {
    currentIndex.value = piecesToPlace.value.length - 1
  }
  speakCurrentInstruction()
  placementWarning.value = ''
}

function prevPiece() {
  if (currentIndex.value > 0) {
    currentIndex.value--
    speakCurrentInstruction()
    placementWarning.value = ''
  }
}

function nextPiece() {
  if (currentIndex.value < piecesToPlace.value.length - 1) {
    currentIndex.value++
    speakCurrentInstruction()
    placementWarning.value = ''
  }
}

function onKeydown(e) {
  if (!isRunning.value) return
  switch (e.key) {
    case 'ArrowLeft': prevPiece(); break
    case 'ArrowRight': nextPiece(); break
    case ' ':
    case 'Space':
      e.preventDefault()
      confirmPlacement()
      break
    case 's':
    case 'S': skipPiece(); break
    case 'r':
    case 'R': speakCurrentInstruction(); break
  }
}

onMounted(() => {
  if (mapStore.currentMap) {
    selectedMapId.value = mapStore.currentMap.id
  }
  window.addEventListener('keydown', onKeydown)
  enableVoice()
  startDebugCanvasUpdate()
  // Annuncia lo stato iniziale delle ancore
  if (gameStore.visibleAnchorsCount >= 3) {
    voice.announceAnchorsCount(gameStore.visibleAnchorsCount)
  }
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown)
  if (animationFrame) {
    cancelAnimationFrame(animationFrame)
  }
})
</script>

<style scoped>
.assistant-view { min-height: 100vh; background: #0f0f1e; color: #eee; padding: 1rem; }
.camera-preview { position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: -1; opacity: 0; pointer-events: none; }
.assistant-header { display: flex; align-items: center; gap: 1rem; margin-bottom: 1rem; flex-wrap: wrap; }
.back-btn { background: none; border: none; color: #7c9ef5; font-size: 1.5rem; cursor: pointer; }
h1 { margin: 0; font-size: 1.4rem; flex: 1; }
.header-buttons { display: flex; gap: 0.5rem; }
.debug-toggle { background: #2a2a4a; border: 1px solid #3a3a6a; border-radius: 20px; padding: 0.3rem 1rem; cursor: pointer; color: #ccc; }
.debug-toggle.active { background: #8a6a2a; color: white; }
.voice-toggle { background: #2a2a4a; border: 1px solid #3a3a6a; border-radius: 20px; padding: 0.3rem 1rem; cursor: pointer; color: #ccc; }
.voice-toggle.active { background: #4a7cf5; color: white; }
.assistant-content { display: flex; flex-direction: column; gap: 1.5rem; max-width: 800px; margin: 0 auto; }
.card { background: #1a1a2e; border-radius: 14px; padding: 1.2rem; }
.calibration-warning { background: #2a1a1a; border: 2px solid #ff4444; }
.calibration-warning h3 { color: #ff4444; margin: 0 0 0.5rem; }
.corner-status { display: flex; gap: 1rem; justify-content: center; margin: 1rem 0; flex-wrap: wrap; }
.corner-status-item { display: flex; flex-direction: column; align-items: center; gap: 0.3rem; padding: 0.5rem; background: #2a2a4a; border-radius: 8px; min-width: 70px; }
.corner-status-item.detected { background: #2a4a2a; border: 1px solid #4a7a4a; }
.corner-role { font-weight: bold; font-size: 1.1rem; }
.corner-status { font-size: 1.2rem; }
.calibration-hint { text-align: center; color: #ffaa44; margin: 0.5rem 0; }
.webcam-preview { padding: 0; overflow: hidden; }
.preview-container { position: relative; }
.preview-canvas { width: 100%; height: auto; display: block; background: #000; border-radius: 8px; }
.marker-list { margin-top: 0.5rem; padding: 0.5rem; background: #2a2a4a; border-radius: 8px; max-height: 150px; overflow-y: auto; }
.marker-list h4 { margin: 0 0 0.5rem; font-size: 0.8rem; color: #7c9ef5; }
.marker-item { display: flex; justify-content: space-between; align-items: center; padding: 0.3rem; border-bottom: 1px solid #3a3a6a; font-size: 0.8rem; font-family: monospace; }
.marker-id { color: #ffaa44; }
.marker-pos { color: #aaa; }
.marker-anchor { color: #4a7cf5; font-weight: bold; }
.map-selector { display: flex; flex-direction: column; gap: 0.8rem; }
.map-selector select, .map-selector button { width: 100%; padding: 0.6rem; background: #2a2a4a; border: 1px solid #3a3a6a; border-radius: 8px; color: #eee; font-size: 1rem; }
.btn-primary { background: #4a7cf5; color: white; border: none; padding: 0.7rem; border-radius: 10px; cursor: pointer; }
.assistant-panel { background: #2a2a4a; }
.progress { margin-bottom: 1rem; }
.progress-bar { height: 6px; background: #4a7cf5; border-radius: 3px; margin-top: 0.3rem; transition: width 0.3s; }
.current-step h2 { margin: 0 0 0.5rem; }
.details p { margin: 0.3rem 0; }
.description { font-style: italic; color: #aaa; }
.voice-controls, .nav-buttons { display: flex; gap: 0.8rem; margin: 1rem 0; flex-wrap: wrap; }
button { padding: 0.6rem 1rem; border-radius: 10px; border: none; cursor: pointer; font-size: 0.9rem; }
.btn-speak { background: #5a6a8a; color: white; }
.btn-confirm { background: #2a7a2a; color: white; }
.btn-skip { background: #8a6a2a; color: white; }
.btn-prev, .btn-next { background: #3a3a6a; color: #ccc; }
.btn-prev:disabled, .btn-next:disabled { opacity: 0.4; }
.completion { text-align: center; margin-top: 1rem; }
.placement-warning { background: #aa4444; color: white; padding: 0.5rem; border-radius: 8px; text-align: center; margin-top: 0.5rem; }
.instructions ul { margin: 0.5rem 0 0 1rem; line-height: 1.6; }
@media (max-width: 600px) {
  .voice-controls, .nav-buttons { flex-direction: column; }
  button { width: 100%; }
  .corner-status { flex-wrap: wrap; }
}
</style>