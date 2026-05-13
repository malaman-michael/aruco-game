<template>
  <div class="voice-movement-view">
    <div class="container">
      <div class="header">
        <button class="back-btn" @click="$router.push('/')">←</button>
        <h1>🎮 Muovi il quadrato con la voce</h1>
      </div>

      <div class="instructions">
        <p>🎤 <strong>Microfono sempre attivo!</strong> Parla chiaro e pronuncia comandi come:</p>
        <p><em>su, giù, destra, sinistra</em> (anche in inglese: up, down, right, left)</p>
        <p>Puoi anche dire un numero: <em>"3 destra"</em>, <em>"destra 3"</em>, <em>"due su"</em></p>
        <p>🔊 Il sistema ignorerà automaticamente i rumori di fondo.</p>
        <p>📍 Il quadrato rosso parte <strong>in basso a destra</strong> (cella 9,9).</p>
      </div>

      <div class="controls">
        <button @click="toggleListening" class="btn-listen" :class="{ listening: isListening }">
          🎙️ {{ isListening ? 'Microfono attivo' : 'Microfono disattivato' }}
        </button>
        <button @click="resetPosition" class="btn-reset">⟳ Reset posizione</button>
      </div>

      <div v-if="feedback" class="feedback" :class="{ error: feedbackError }">
        {{ feedback }}
      </div>

      <!-- Griglia 10x10 -->
      <div class="grid">
        <div v-for="row in 10" :key="'row-' + row" class="grid-row">
          <div 
            v-for="col in 10" 
            :key="'cell-' + row + '-' + col"
            class="grid-cell"
            :class="{ active: (row-1) === position.row && (col-1) === position.col }"
          >
            <span v-if="(row-1) === position.row && (col-1) === position.col" class="emoji">🔴</span>
          </div>
        </div>
      </div>

      <div class="position-info">
        Posizione attuale: <strong>colonna {{ position.col + 1 }}, riga {{ position.row + 1 }}</strong>
        ({{ colToLetter(position.col) }}{{ position.row + 1 }})
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const position = ref({ row: 9, col: 9 })
const isListening = ref(false)
const feedback = ref('')
const feedbackError = ref(false)
let recognition = null
let shouldRestart = true  // flag per riavviare automaticamente

// Mappa direzioni
const directionMap = {
  'su': { dr: -1, dc: 0 }, 'up': { dr: -1, dc: 0 },
  'giù': { dr: 1, dc: 0 }, 'down': { dr: 1, dc: 0 },
  'destra': { dr: 0, dc: 1 }, 'right': { dr: 0, dc: 1 },
  'sinistra': { dr: 0, dc: -1 }, 'left': { dr: 0, dc: -1 },
}

// Parole numeriche italiane
const numberWords = {
  'uno': 1, 'due': 2, 'tre': 3, 'quattro': 4, 'cinque': 5,
  'sei': 6, 'sette': 7, 'otto': 8, 'nove': 9, 'dieci': 10
}

function colToLetter(col) {
  return String.fromCharCode(65 + col)
}

function speakPosition() {
  const message = `Posizione: colonna ${position.value.col + 1}, riga ${position.value.row + 1}`
  if (window.speechSynthesis) {
    const utterance = new SpeechSynthesisUtterance(message)
    utterance.lang = 'it-IT'
    window.speechSynthesis.cancel()
    window.speechSynthesis.speak(utterance)
  }
}

function parseNumberToken(token) {
  if (!token) return null
  let num = parseInt(token, 10)
  if (!isNaN(num)) return num
  return numberWords[token.toLowerCase()] || null
}

function executeCommand(commandText) {
  const lower = commandText.toLowerCase().trim()
  if (!lower) return false

  const tokens = lower.split(/\s+/)
  let steps = 1
  let directionWord = null

  for (const token of tokens) {
    if (directionMap[token]) {
      directionWord = token
      break
    }
  }
  if (!directionWord) return false  // ignora silenziosamente se non è un comando valido

  for (const token of tokens) {
    if (token !== directionWord) {
      const num = parseNumberToken(token)
      if (num !== null) {
        steps = num
        break
      }
    }
  }

  const delta = directionMap[directionWord]
  let newRow = position.value.row
  let newCol = position.value.col
  let moved = false

  for (let i = 0; i < steps; i++) {
    const nextRow = newRow + delta.dr
    const nextCol = newCol + delta.dc
    if (nextRow < 0 || nextRow > 9 || nextCol < 0 || nextCol > 9) {
      feedback.value = `⚠️ Uscita dalla griglia al passo ${i+1}`
      feedbackError.value = true
      return false
    }
    newRow = nextRow
    newCol = nextCol
    moved = true
  }

  if (moved) {
    position.value = { row: newRow, col: newCol }
    feedback.value = `✅ Spostato a colonna ${newCol+1}, riga ${newRow+1}`
    feedbackError.value = false
    speakPosition()
  }
  return true
}

function resetPosition() {
  position.value = { row: 9, col: 9 }
  feedback.value = 'Posizione resettata a basso a destra'
  feedbackError.value = false
  speakPosition()
}

// Riavvia il riconoscimento dopo una pausa (se non è già in ascolto)
function restartRecognition() {
  if (!shouldRestart) return
  if (!recognition || isListening.value) return
  try {
    recognition.start()
  } catch (e) {
    console.warn('Restart recognition error:', e)
  }
}

function initSpeechRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
  if (!SpeechRecognition) {
    feedback.value = '⚠️ Browser non supporta il riconoscimento vocale.'
    feedbackError.value = true
    return null
  }
  const rec = new SpeechRecognition()
  rec.continuous = true          // ascolto continuo
  rec.interimResults = false     // solo risultati finali
  rec.lang = 'it-IT'
  rec.maxAlternatives = 1

  rec.onstart = () => {
    isListening.value = true
    feedback.value = '🎤 Microfono attivo, ascolto comandi...'
    feedbackError.value = false
  }

  rec.onend = () => {
    isListening.value = false
    if (shouldRestart) {
      // Riavvia automaticamente dopo 0.5 secondi
      setTimeout(() => restartRecognition(), 500)
    }
  }

  rec.onerror = (event) => {
    console.warn('SpeechRecognition error:', event.error)
    if (event.error === 'no-speech') {
      // Nessuna voce – ignora, non mostrare errore
      return
    }
    isListening.value = false
    let msg = 'Errore microfono.'
    if (event.error === 'not-allowed') msg = 'Permesso microfono negato.'
    else if (event.error === 'audio-capture') msg = 'Microfono non trovato.'
    feedback.value = msg
    feedbackError.value = true
    // Tentativo di riavvio dopo 2 secondi
    setTimeout(() => restartRecognition(), 2000)
  }

  rec.onresult = (event) => {
    const transcript = event.results[event.results.length - 1][0].transcript.toLowerCase().trim()
    console.log('🗣️ Riconosciuto:', transcript)
    executeCommand(transcript)
  }

  return rec
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
    feedback.value = 'Microfono disattivato. Premi per riattivare.'
  } else {
    shouldRestart = true
    try { recognition.start() } catch(e) {}
  }
}

onMounted(() => {
  recognition = initSpeechRecognition()
  if (recognition) {
    // Richiede permesso e avvia automaticamente
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(() => {
        recognition.start()
      })
      .catch(err => {
        console.error('Permesso microfono negato', err)
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
/* Stili identici alla versione precedente (nessuna modifica) */
.voice-movement-view {
  min-height: 100vh;
  background: linear-gradient(145deg, #0f0f1e 0%, #1a1a2e 100%);
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 2rem 1rem;
}
.container {
  max-width: 700px;
  width: 100%;
  background: rgba(0,0,0,0.65);
  backdrop-filter: blur(8px);
  border-radius: 32px;
  padding: 1.5rem;
  color: #eee;
  box-shadow: 0 8px 20px rgba(0,0,0,0.4);
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
  padding: 1rem;
  margin-bottom: 1.2rem;
  font-size: 0.9rem;
}
.instructions p {
  margin: 0.3rem 0;
}
.controls {
  display: flex;
  gap: 1rem;
  justify-content: center;
  margin-bottom: 1rem;
  flex-wrap: wrap;
}
.btn-listen {
  background: #4a7cf5;
  border: none;
  padding: 0.7rem 1.5rem;
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
  padding: 0.7rem 1.5rem;
  border-radius: 40px;
  font-size: 1rem;
  color: white;
  cursor: pointer;
}
.feedback {
  background: rgba(0,0,0,0.7);
  border-radius: 30px;
  padding: 0.6rem 1rem;
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
  transition: all 0.1s;
}
.grid-cell.active {
  background: #ff4444;
  box-shadow: 0 0 8px #ff8888;
}
.grid-cell .emoji {
  font-size: 1.2rem;
}
.position-info {
  text-align: center;
  background: #1a1a2e;
  border-radius: 40px;
  padding: 0.5rem;
  font-size: 0.9rem;
}
@keyframes pulse {
  0% { opacity: 1; transform: scale(1);}
  50% { opacity: 0.8; transform: scale(1.02);}
  100% { opacity: 1; transform: scale(1);}
}
@media (max-width: 550px) {
  .container { padding: 1rem; }
  h1 { font-size: 1.2rem; }
  .btn-listen, .btn-reset { padding: 0.5rem 1rem; }
}
</style>