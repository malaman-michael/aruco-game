<template>
  <div class="assistant-view">
    <div class="assistant-header">
      <button class="back-btn" @click="$router.push('/')">←</button>
      <h1>🎧 Guida al posizionamento</h1>
      <button class="voice-toggle" :class="{ active: voiceEnabled }" @click="toggleVoice">
        🔊 {{ voiceEnabled ? 'Voce attiva' : 'Voce disattivata' }}
      </button>
    </div>

    <div class="assistant-content">
      <div class="map-selector card">
        <label for="mapSelect">Mappa da preparare:</label>
        <select id="mapSelect" v-model="selectedMapId" @change="loadMap">
          <option v-for="map in mapStore.maps" :key="map.id" :value="map.id">
            {{ map.name }} ({{ map.cols }}×{{ map.rows }})
          </option>
        </select>
        <button v-if="selectedMapId" class="btn-primary" @click="startAssistant">▶️ Avvia assistente</button>
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
      </div>

      <div class="instructions card">
        <h3>📖 Come usare l'assistente</h3>
        <ul>
          <li>L'assistente ti guiderà a posizionare tutti i pezzi della mappa.</li>
          <li>Ogni pezzo viene letto ad alta voce con posizione e tipo.</li>
          <li>Premi <strong>🔊 Ripeti istruzione</strong> per riascoltare.</li>
          <li>Dopo aver posizionato il pezzo fisico, premi <strong>✅ Segna come posizionato</strong>.</li>
          <li>Se non hai ancora un pezzo, puoi saltarlo (verrà proposto di nuovo alla fine).</li>
          <li>Puoi muoverti avanti/indietro con i pulsanti o con le frecce della tastiera.</li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useMapStore, CELL_TYPES, CELL_TYPE_INFO } from '../stores/mapStore.js'
import { voice } from '../services/voiceService.js'

const mapStore = useMapStore()
const selectedMapId = ref(null)
const isRunning = ref(false)
const piecesToPlace = ref([])
const currentIndex = ref(0)
const voiceEnabled = ref(voice.enabled)

// Computed per il pezzo corrente
const currentPiece = computed(() => {
  if (!piecesToPlace.value.length) return null
  return piecesToPlace.value[currentIndex.value] || null
})

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
        list.push({
          ...cell,
          col,
          row
        })
      }
    }
  }
  return list
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
  setTimeout(() => speakCurrentInstruction(), 500)
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

function confirmPlacement() {
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
}

function skipPiece() {
  if (!currentPiece.value) return
  const skipped = piecesToPlace.value.splice(currentIndex.value, 1)[0]
  piecesToPlace.value.push(skipped)
  if (currentIndex.value >= piecesToPlace.value.length) {
    currentIndex.value = piecesToPlace.value.length - 1
  }
  speakCurrentInstruction()
}

function prevPiece() {
  if (currentIndex.value > 0) {
    currentIndex.value--
    speakCurrentInstruction()
  }
}

function nextPiece() {
  if (currentIndex.value < piecesToPlace.value.length - 1) {
    currentIndex.value++
    speakCurrentInstruction()
  }
}

function onKeydown(e) {
  if (!isRunning.value) return
  switch (e.key) {
    case 'ArrowLeft':
      prevPiece()
      break
    case 'ArrowRight':
      nextPiece()
      break
    case ' ':
    case 'Space':
      e.preventDefault()
      confirmPlacement()
      break
    case 's':
    case 'S':
      skipPiece()
      break
    case 'r':
    case 'R':
      speakCurrentInstruction()
      break
  }
}

const isComplete = computed(() => piecesToPlace.value.length === 0 && isRunning.value)

onMounted(() => {
  if (mapStore.currentMap) {
    selectedMapId.value = mapStore.currentMap.id
  }
  window.addEventListener('keydown', onKeydown)
  enableVoice()
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown)
})
</script>

<style scoped>
.assistant-view {
  min-height: 100vh;
  background: #0f0f1e;
  color: #eee;
  padding: 1rem;
}
.assistant-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
}
.back-btn {
  background: none;
  border: none;
  color: #7c9ef5;
  font-size: 1.5rem;
  cursor: pointer;
}
h1 { margin: 0; font-size: 1.4rem; flex: 1; }
.voice-toggle {
  background: #2a2a4a;
  border: 1px solid #3a3a6a;
  border-radius: 20px;
  padding: 0.3rem 1rem;
  cursor: pointer;
  color: #ccc;
}
.voice-toggle.active {
  background: #4a7cf5;
  color: white;
}
.assistant-content {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  max-width: 800px;
  margin: 0 auto;
}
.card {
  background: #1a1a2e;
  border-radius: 14px;
  padding: 1.2rem;
}
.map-selector {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
}
.map-selector select, .map-selector button {
  width: 100%;
  padding: 0.6rem;
  background: #2a2a4a;
  border: 1px solid #3a3a6a;
  border-radius: 8px;
  color: #eee;
  font-size: 1rem;
}
.btn-primary {
  background: #4a7cf5;
  color: white;
  border: none;
  padding: 0.7rem;
  border-radius: 10px;
  cursor: pointer;
}
.assistant-panel {
  background: #2a2a4a;
}
.progress {
  margin-bottom: 1rem;
}
.progress-bar {
  height: 6px;
  background: #4a7cf5;
  border-radius: 3px;
  margin-top: 0.3rem;
  transition: width 0.3s;
}
.current-step h2 {
  margin: 0 0 0.5rem;
}
.details p {
  margin: 0.3rem 0;
}
.description {
  font-style: italic;
  color: #aaa;
}
.voice-controls, .nav-buttons {
  display: flex;
  gap: 0.8rem;
  margin: 1rem 0;
  flex-wrap: wrap;
}
button {
  padding: 0.6rem 1rem;
  border-radius: 10px;
  border: none;
  cursor: pointer;
  font-size: 0.9rem;
}
.btn-speak {
  background: #5a6a8a;
  color: white;
}
.btn-confirm {
  background: #2a7a2a;
  color: white;
}
.btn-skip {
  background: #8a6a2a;
  color: white;
}
.btn-prev, .btn-next {
  background: #3a3a6a;
  color: #ccc;
}
.btn-prev:disabled, .btn-next:disabled {
  opacity: 0.4;
}
.completion {
  text-align: center;
  margin-top: 1rem;
}
.instructions ul {
  margin: 0.5rem 0 0 1rem;
  line-height: 1.6;
}
@media (max-width: 600px) {
  .voice-controls, .nav-buttons {
    flex-direction: column;
  }
  button {
    width: 100%;
  }
}
</style>