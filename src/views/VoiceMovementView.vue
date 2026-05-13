<template>
  <div class="voice-movement-view">
    <div class="container">
      <div class="header">
        <button class="back-btn" @click="$router.push('/')">←</button>
        <h1>🎮 Muovi il quadrato con la voce</h1>
      </div>

      <div class="instructions">
        <p>🗣️ <strong>Comandi vocali supportati:</strong></p>
        <p><em>su, giù, destra, sinistra</em> (anche in inglese: up, down, right, left)</p>
        <p>Puoi anche dire un numero prima della direzione: <em>"3 destra"</em>, <em>"2 su"</em>, <em>"4 sinistra"</em></p>
        <p>🔊 Dopo ogni movimento, la voce confermerà la nuova posizione.</p>
        <p>📍 Il quadrato rosso parte <strong>in basso a destra</strong> (cella 9,9).</p>
      </div>

      <div class="controls">
        <button 
          @click="startListening" 
          :disabled="isListening" 
          class="btn-listen"
          :class="{ listening: isListening }"
        >
          🎙️ {{ isListening ? 'Ascolto in corso...' : 'Attiva microfono' }}
        </button>
        <button @click="resetPosition" class="btn-reset">⟳ Reset posizione</button>
      </div>

      <div v-if="feedback" class="feedback" :class="{ error: feedbackError }">
        {{ feedback }}
      </div>

      <!-- Griglia 10x10 -->
      <div class="grid">
        <div 
          v-for="row in 10" 
          :key="'row-' + row"
          class="grid-row"
        >
          <div 
            v-for="col in 10" 
            :key="'cell-' + row + '-' + col"
            class="grid-cell"
            :class="{ 
              active: (row-1) === position.row && (col-1) === position.col,
              'bottom-right': (row-1) === 9 && (col-1) === 9
            }"
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

// Posizione iniziale: basso a destra (riga 9, colonna 9, indici 0-9)
const position = ref({ row: 9, col: 9 })
const isListening = ref(false)
const feedback = ref('')
const feedbackError = ref(false)

let recognition = null

// Mappa direzioni (supporta italiano e inglese)
const directionMap = {
  'su': { dr: -1, dc: 0 },
  'up': { dr: -1, dc: 0 },
  'giù': { dr: 1, dc: 0 },
  'down': { dr: 1, dc: 0 },
  'destra': { dr: 0, dc: 1 },
  'right': { dr: 0, dc: 1 },
  'sinistra': { dr: 0, dc: -1 },
  'left': { dr: 0, dc: -1 },
}

// Converti colonna in lettera (A=0)
function colToLetter(col) {
  return String.fromCharCode(65 + col)
}

// Legge ad alta voce la posizione
function speakPosition() {
  const message = `Posizione: colonna ${position.col + 1}, riga ${position.row + 1}`
  if (window.speechSynthesis) {
    const utterance = new SpeechSynthesisUtterance(message)
    utterance.lang = 'it-IT'
    window.speechSynthesis.cancel()
    window.speechSynthesis.speak(utterance)
  }
}

// Applica uno spostamento (delta righe, delta colonne)
function move(deltaRow, deltaCol) {
  let newRow = position.value.row + deltaRow
  let newCol = position.value.col + deltaCol
  // Limita alla griglia 0-9
  newRow = Math.max(0, Math.min(9, newRow))
  newCol = Math.max(0, Math.min(9, newCol))
  if (newRow !== position.value.row || newCol !== position.value.col) {
    position.value = { row: newRow, col: newCol }
    feedback.value = `Spostato a colonna ${newCol+1}, riga ${newRow+1}`
    feedbackError.value = false
    speakPosition()
  } else {
    feedback.value = 'Movimento non valido: fuori dalla griglia!'
    feedbackError.value = true
  }
}

// Esegue un comando testuale es. "2 destra", "su"
function executeCommand(commandText) {
  const lower = commandText.toLowerCase().trim()
  // Cerca un numero all'inizio (opzionale)
  let numberMatch = lower.match(/^(\d+)\s+(.+)/)
  let steps = 1
  let directionWord = lower
  if (numberMatch) {
    steps = parseInt(numberMatch[1], 10)
    directionWord = numberMatch[2]
  }
  // Gestisci anche casi come "destra 3" (numero dopo)
  let reverseMatch = lower.match(/(.+)\s+(\d+)$/)
  if (!numberMatch && reverseMatch) {
    steps = parseInt(reverseMatch[2], 10)
    directionWord = reverseMatch[1]
  }
  const delta = directionMap[directionWord]
  if (!delta) {
    feedback.value = `Direzione "${directionWord}" non riconosciuta. Usa su, giù, destra, sinistra.`
    feedbackError.value = true
    return false
  }
  for (let i = 0; i < steps; i++) {
    move(delta.dr, delta.dc)
  }
  return true
}

// Resetta la posizione a (9,9)
function resetPosition() {
  position.value = { row: 9, col: 9 }
  feedback.value = 'Posizione resettata a basso a destra (colonna 10, riga 10)'
  feedbackError.value = false
  speakPosition()
}

// Inizializza il riconoscimento vocale
function initSpeechRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
  if (!SpeechRecognition) {
    feedback.value = '⚠️ Il tuo browser non supporta il riconoscimento vocale. Prova Chrome, Edge o Safari.'
    feedbackError.value = true
    return null
  }
  const rec = new SpeechRecognition()
  rec.continuous = false
  rec.interimResults = false
  rec.lang = 'it-IT'
  rec.maxAlternatives = 1

  rec.onstart = () => {
    isListening.value = true
    feedback.value = '🎤 Ascolto... pronuncia un comando'
    feedbackError.value = false
  }

  rec.onend = () => {
    isListening.value = false
    if (feedback.value === '🎤 Ascolto... pronuncia un comando') {
      feedback.value = 'Nessun comando rilevato. Riprova.'
      feedbackError.value = true
    }
  }

  rec.onerror = (event) => {
    console.error('Speech error', event.error)
    isListening.value = false
    let msg = 'Errore di riconoscimento.'
    if (event.error === 'not-allowed') msg = 'Permesso microfono negato. Concedi l\'accesso e riprova.'
    else if (event.error === 'no-speech') msg = 'Nessun discorso rilevato. Riprova.'
    else if (event.error === 'audio-capture') msg = 'Microfono non trovato.'
    feedback.value = msg
    feedbackError.value = true
  }

  rec.onresult = (event) => {
    const transcript = event.results[0][0].transcript.toLowerCase().trim()
    console.log('Comando vocale:', transcript)
    executeCommand(transcript)
    // Riavvia l'ascolto dopo un secondo (opzionale, per comandi consecutivi senza ripremere)
    setTimeout(() => {
      if (!isListening.value) startListening()
    }, 1000)
  }

  return rec
}

function startListening() {
  if (!recognition) {
    recognition = initSpeechRecognition()
    if (!recognition) return
  }
  try {
    recognition.start()
  } catch (e) {
    console.warn(e)
  }
}

onMounted(() => {
  recognition = initSpeechRecognition()
})

onUnmounted(() => {
  if (recognition) {
    try { recognition.abort() } catch(e) {}
  }
})
</script>

<style scoped>
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