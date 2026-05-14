<template>
  <div class="voice-pieces-view">
    <div class="container">
      <div class="header">
        <button class="back-btn" @click="$router.push('/')">←</button>
        <h1>🎲 Muovi le pedine con la voce</h1>
      </div>

      <div class="instructions">
        <p>🗣️ <strong>Comandi vocali:</strong> <em>"goblin 2 destra"</em>, <em>"drago su"</em>, <em>"orco sinistra 3"</em></p>
        <p>🔊 Il microfono è sempre attivo. Se una casella è occupata, il sistema ti avviserà vocalmente.</p>
        <p>📍 Le 6 pedine sono posizionate casualmente all'inizio in celle diverse.</p>
      </div>

      <div class="controls">
        <button @click="toggleListening" class="btn-listen" :class="{ listening: isListening }">
          🎙️ {{ isListening ? 'Microfono attivo' : 'Microfono disattivato' }}
        </button>
        <button @click="randomizePositions" class="btn-reset">🎲 Rimescola pedine</button>
      </div>

      <div v-if="feedback" class="feedback" :class="{ error: feedbackError }">
        {{ feedback }}
      </div>

      <!-- Griglia 10x10 con pedine -->
      <div class="grid">
        <div v-for="row in 10" :key="'row-' + row" class="grid-row">
          <div 
            v-for="col in 10" 
            :key="'cell-' + row + '-' + col"
            class="grid-cell"
            :class="{ occupied: getPieceAt(row-1, col-1) }"
          >
            <span class="piece-emoji">{{ getPieceEmojiAt(row-1, col-1) }}</span>
          </div>
        </div>
      </div>

      <!-- Legenda pedine -->
      <div class="legend">
        <div v-for="piece in pieces" :key="piece.name" class="legend-item">
          <span class="legend-emoji">{{ piece.emoji }}</span>
          <span class="legend-name">{{ piece.name }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

// Definizione delle pedine
const piecesData = [
  { name: 'orco', emoji: '👹' },
  { name: 'guerriero', emoji: '⚔️' },
  { name: 'mago', emoji: '🧙' },
  { name: 'chierico', emoji: '⛪' },
  { name: 'drago', emoji: '🐉' },
  { name: 'goblin', emoji: '👺' }
]

// Mappa per riconoscere i nomi (supporto italiano e inglese)
const pieceNameMap = {
  'orco': 'orco', 'orc': 'orco',
  'guerriero': 'guerriero', 'warrior': 'guerriero',
  'mago': 'mago', 'wizard': 'mago', 'mage': 'mago',
  'chierico': 'chierico', 'cleric': 'chierico',
  'drago': 'drago', 'dragon': 'drago',
  'goblin': 'goblin'
}

// Mappa direzioni
const directionMap = {
  'su': { dr: -1, dc: 0 }, 'up': { dr: -1, dc: 0 },
  'giù': { dr: 1, dc: 0 }, 'down': { dr: 1, dc: 0 },
  'destra': { dr: 0, dc: 1 }, 'right': { dr: 0, dc: 1 },
  'sinistra': { dr: 0, dc: -1 }, 'left': { dr: 0, dc: -1 }
}

// Parole numeriche
const numberWords = {
  'uno': 1, 'due': 2, 'tre': 3, 'quattro': 4, 'cinque': 5,
  'sei': 6, 'sette': 7, 'otto': 8, 'nove': 9, 'dieci': 10,
  'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
  'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10
}

// Posizioni iniziali casuali (senza sovrapposizioni)
function randomUniquePositions(count, gridSize = 10) {
  const positions = new Set()
  while (positions.size < count) {
    const row = Math.floor(Math.random() * gridSize)
    const col = Math.floor(Math.random() * gridSize)
    positions.add(`${row},${col}`)
  }
  return Array.from(positions).map(pos => {
    const [row, col] = pos.split(',').map(Number)
    return { row, col }
  })
}

// Stato reattivo delle pedine
const pieces = ref([])
const isListening = ref(false)
const feedback = ref('')
const feedbackError = ref(false)
let recognition = null
let shouldRestart = true

// Inizializza pedine con posizioni casuali
function initPieces() {
  const positions = randomUniquePositions(piecesData.length, 10)
  pieces.value = piecesData.map((p, idx) => ({
    ...p,
    row: positions[idx].row,
    col: positions[idx].col
  }))
}

// Rimette in ordine casuale tutte le pedine
function randomizePositions() {
  const positions = randomUniquePositions(piecesData.length, 10)
  pieces.value.forEach((piece, idx) => {
    piece.row = positions[idx].row
    piece.col = positions[idx].col
  })
  feedback.value = 'Posizioni rimescolate!'
  feedbackError.value = false
  speak('Posizioni delle pedine rimescolate.')
}

// Ottiene la pedina in una data cella (se presente)
function getPieceAt(row, col) {
  return pieces.value.find(p => p.row === row && p.col === col)
}

function getPieceEmojiAt(row, col) {
  const piece = getPieceAt(row, col)
  return piece ? piece.emoji : ''
}

// Sposta una pedina specifica con controllo collisioni e messaggio vocale
function movePiece(pieceName, steps, direction) {
  const piece = pieces.value.find(p => p.name === pieceName)
  if (!piece) {
    const msg = `Pedina "${pieceName}" non trovata.`
    feedback.value = msg
    feedbackError.value = true
    speak(msg)
    return false
  }

  const delta = directionMap[direction]
  if (!delta) {
    const msg = `Direzione "${direction}" non valida.`
    feedback.value = msg
    feedbackError.value = true
    speak(msg)
    return false
  }

  let newRow = piece.row
  let newCol = piece.col
  let moved = false
  let blockedStep = null
  let blockingPiece = null

  for (let i = 1; i <= steps; i++) {
    const nextRow = piece.row + delta.dr * i
    const nextCol = piece.col + delta.dc * i
    if (nextRow < 0 || nextRow > 9 || nextCol < 0 || nextCol > 9) {
      const msg = `${piece.name}: uscita dalla griglia al passo ${i}.`
      feedback.value = msg
      feedbackError.value = true
      speak(msg)
      return false
    }
    const occupyingPiece = pieces.value.find(p => p !== piece && p.row === nextRow && p.col === nextCol)
    if (occupyingPiece) {
      blockedStep = i
      blockingPiece = occupyingPiece
      break
    }
    newRow = nextRow
    newCol = nextCol
  }

  if (blockedStep) {
    const msg = `${piece.name} non può spostarsi di ${steps} ${direction}: al passo ${blockedStep} la cella è già occupata da ${blockingPiece.name}.`
    feedback.value = msg
    feedbackError.value = true
    speak(msg)
    return false
  }

  if (newRow !== piece.row || newCol !== piece.col) {
    piece.row = newRow
    piece.col = newCol
    const newPos = `${String.fromCharCode(65+newCol)}${newRow+1}`
    const msg = `${piece.name} spostato di ${steps} ${direction} → ${newPos}`
    feedback.value = msg
    feedbackError.value = false
    speak(msg)
    return true
  }
  return false
}

// Parsing del comando vocale
function executeCommand(transcript) {
  const lower = transcript.toLowerCase().trim()
  if (!lower) return false

  const tokens = lower.split(/\s+/)
  let pieceKey = null
  let directionWord = null
  let steps = 1

  for (const token of tokens) {
    if (pieceNameMap[token]) {
      pieceKey = pieceNameMap[token]
      break
    }
  }
  if (!pieceKey) return false

  for (const token of tokens) {
    if (directionMap[token]) {
      directionWord = token
      break
    }
  }
  if (!directionWord) return false

  for (const token of tokens) {
    if (token !== pieceKey && token !== directionWord) {
      let num = parseInt(token, 10)
      if (isNaN(num)) num = numberWords[token]
      if (num && num > 0 && num <= 10) {
        steps = num
        break
      }
    }
  }

  movePiece(pieceKey, steps, directionWord)
  return true
}

// Speech recognition setup (continuo)
function initSpeechRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
  if (!SpeechRecognition) {
    feedback.value = '⚠️ Browser non supporta il riconoscimento vocale.'
    feedbackError.value = true
    return null
  }
  const rec = new SpeechRecognition()
  rec.continuous = true
  rec.interimResults = false
  rec.lang = 'it-IT'
  rec.maxAlternatives = 1

  rec.onstart = () => {
    isListening.value = true
    feedback.value = '🎤 Microfono attivo, ascolto comandi...'
    feedbackError.value = false
  }

  rec.onend = () => {
    isListening.value = false
    if (shouldRestart) setTimeout(() => restartRecognition(), 500)
  }

  rec.onerror = (event) => {
    if (event.error === 'no-speech') return
    console.warn('Speech error', event.error)
    isListening.value = false
    if (event.error !== 'aborted') {
      feedback.value = 'Errore microfono. Riavvio...'
      feedbackError.value = true
      setTimeout(() => restartRecognition(), 2000)
    }
  }

  rec.onresult = (event) => {
    const transcript = event.results[event.results.length - 1][0].transcript
    console.log('🗣️ Riconosciuto:', transcript)
    executeCommand(transcript)
  }
  return rec
}

function restartRecognition() {
  if (!shouldRestart) return
  if (!recognition || isListening.value) return
  try { recognition.start() } catch(e) {}
}

function toggleListening() {
  if (!recognition) {
    recognition = initSpeechRecognition()
    if (!recognition) return
  }
  if (isListening.value) {
    shouldRestart = false
    try { recognition.stop() } catch(e) {}
    isListening.value = false
    feedback.value = 'Microfono disattivato.'
  } else {
    shouldRestart = true
    try { recognition.start() } catch(e) {}
  }
}

function speak(text) {
  if (!window.speechSynthesis) return
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = 'it-IT'
  utterance.rate = 0.9
  window.speechSynthesis.cancel()
  window.speechSynthesis.speak(utterance)
}

// Avvio
onMounted(() => {
  initPieces()
  recognition = initSpeechRecognition()
  if (recognition) {
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(() => recognition.start())
      .catch(err => {
        console.error('Microfono negato', err)
        feedback.value = 'Permesso microfono negato. Attivalo dalle impostazioni.'
        feedbackError.value = true
      })
  }
})

onUnmounted(() => {
  shouldRestart = false
  if (recognition) {
    try { recognition.stop() } catch(e) {}
  }
})
</script>

<style scoped>
/* Stili identici alla versione precedente (invariati) */
.voice-pieces-view {
  min-height: 100vh;
  background: linear-gradient(145deg, #0f0f1e 0%, #1a1a2e 100%);
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 2rem 1rem;
}
.container {
  max-width: 800px;
  width: 100%;
  background: rgba(0,0,0,0.65);
  backdrop-filter: blur(8px);
  border-radius: 32px;
  padding: 1.5rem;
  color: #eee;
}
.header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
}
.back-btn {
  background: none;
  border: none;
  color: #7c9ef5;
  font-size: 1.8rem;
  cursor: pointer;
}
h1 {
  margin: 0;
  font-size: 1.5rem;
}
.instructions {
  background: rgba(30,30,60,0.7);
  border-radius: 20px;
  padding: 0.8rem 1rem;
  margin-bottom: 1rem;
  font-size: 0.9rem;
}
.controls {
  display: flex;
  gap: 1rem;
  justify-content: center;
  margin-bottom: 1rem;
}
.btn-listen {
  background: #4a7cf5;
  border: none;
  padding: 0.6rem 1.5rem;
  border-radius: 40px;
  font-size: 1rem;
  font-weight: bold;
  color: white;
  cursor: pointer;
  transition: all 0.2s;
}
.btn-listen.listening {
  background: #f5a623;
  animation: pulse 1.2s infinite;
}
.btn-reset {
  background: #5a5a7a;
  border: none;
  padding: 0.6rem 1.5rem;
  border-radius: 40px;
  font-size: 1rem;
  color: white;
  cursor: pointer;
}
.feedback {
  background: rgba(0,0,0,0.7);
  border-radius: 30px;
  padding: 0.5rem 1rem;
  margin-bottom: 1rem;
  text-align: center;
  border-left: 5px solid #4a7cf5;
}
.feedback.error {
  border-left-color: #ff6666;
  background: rgba(100,30,30,0.7);
}
.grid {
  display: flex;
  flex-direction: column;
  gap: 2px;
  background: #2a2a4a;
  padding: 4px;
  border-radius: 12px;
  margin-bottom: 1rem;
}
.grid-row {
  display: flex;
  gap: 2px;
}
.grid-cell {
  width: 100%;
  aspect-ratio: 1 / 1;
  background: #1a1a2e;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.4rem;
}
.grid-cell.occupied {
  background: #2a3a5a;
}
.piece-emoji {
  font-size: 1.2rem;
}
.legend {
  display: flex;
  flex-wrap: wrap;
  gap: 0.8rem;
  justify-content: center;
  margin-top: 0.5rem;
}
.legend-item {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  background: #2a2a4a;
  padding: 0.2rem 0.6rem;
  border-radius: 30px;
}
.legend-emoji {
  font-size: 1.1rem;
}
.legend-name {
  font-size: 0.8rem;
  text-transform: capitalize;
}
@keyframes pulse {
  0% { opacity: 1; transform: scale(1);}
  50% { opacity: 0.8; transform: scale(1.02);}
  100% { opacity: 1; transform: scale(1);}
}
@media (max-width: 600px) {
  .container { padding: 1rem; }
  .grid-cell { font-size: 1rem; }
  .piece-emoji { font-size: 1rem; }
}
</style>