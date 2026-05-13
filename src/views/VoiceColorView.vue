<template>
  <div class="voice-color-view" :style="{ backgroundColor: currentColor }">
    <div class="content">
      <button class="back-btn" @click="$router.push('/')">←</button>
      <h1>🎤 Cambia colore con la voce</h1>

      <div class="instructions card">
        <h2>📖 Come funziona</h2>
        <p>Premi il pulsante <strong>🎙️ Parla</strong> e pronuncia un colore ad alta voce.</p>
        <p>Il sistema riconoscerà il colore e cambierà immediatamente lo sfondo.</p>
        <p><strong>Esempio:</strong> dì <em>"rosso"</em>, <em>"blue"</em>, <em>"verde"</em>, <em>"giallo"</em>…</p>
        <p>Colori supportati: rosso, verde, blu, giallo, arancione, viola, rosa, nero, bianco, grigio, ciano, magenta, marrone, azzurro.</p>
      </div>

      <div class="controls card">
        <button 
          @click="startListening" 
          :disabled="isListening" 
          class="btn-listen"
          :class="{ listening: isListening }"
        >
          🎙️ {{ isListening ? 'Ascolto in corso...' : 'Parla' }}
        </button>
        <button v-if="lastCommand" class="btn-reset" @click="resetColor">⟳ Reset sfondo</button>
      </div>

      <div v-if="feedback" class="feedback card" :class="{ error: feedbackError }">
        {{ feedback }}
      </div>

      <div v-if="lastCommand" class="last-command card">
        Ultimo comando: <strong>{{ lastCommand }}</strong>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

// Mappa dei colori riconosciuti (italiano/inglese)
const colorMap = {
  'rosso': '#ff4444',
  'red': '#ff4444',
  'verde': '#44ff44',
  'green': '#44ff44',
  'blu': '#4444ff',
  'blue': '#4444ff',
  'giallo': '#ffff44',
  'yellow': '#ffff44',
  'arancione': '#ffa500',
  'orange': '#ffa500',
  'viola': '#aa44ff',
  'purple': '#aa44ff',
  'rosa': '#ff69b4',
  'pink': '#ff69b4',
  'nero': '#222222',
  'black': '#222222',
  'bianco': '#ffffff',
  'white': '#ffffff',
  'grigio': '#aaaaaa',
  'gray': '#aaaaaa',
  'grigio scuro': '#666666',
  'dark gray': '#666666',
  'ciano': '#00ffff',
  'cyan': '#00ffff',
  'magenta': '#ff44ff',
  'marrone': '#8b4513',
  'brown': '#8b4513',
  'azzurro': '#88ccff',
  'light blue': '#88ccff',
}

const currentColor = ref('#0f0f1e') // colore iniziale scuro
const isListening = ref(false)
const feedback = ref('')
const feedbackError = ref(false)
const lastCommand = ref('')
let recognition = null

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
  rec.lang = 'it-IT'  // italiano
  rec.maxAlternatives = 1

  rec.onstart = () => {
    isListening.value = true
    feedback.value = '🎤 Ascolto... parla ora'
    feedbackError.value = false
  }

  rec.onend = () => {
    isListening.value = false
    if (feedback.value === '🎤 Ascolto... parla ora') {
      feedback.value = 'Nessun comando rilevato. Riprova.'
      feedbackError.value = true
    }
  }

  rec.onerror = (event) => {
    console.error('Speech recognition error', event.error)
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
    console.log('Riconosciuto:', transcript)
    // Cerca il colore nella mappa (anche parole parziali)
    let foundColor = null
    for (const [key, hex] of Object.entries(colorMap)) {
      if (transcript.includes(key)) {
        foundColor = hex
        lastCommand.value = key
        break
      }
    }
    if (foundColor) {
      currentColor.value = foundColor
      feedback.value = `✅ Colore "${lastCommand.value}" riconosciuto! Sfondo cambiato.`
      feedbackError.value = false
      // Risposta vocale (opzionale)
      speak(`Ho cambiato lo sfondo in ${lastCommand.value}`)
    } else {
      feedback.value = `❌ Non ho riconosciuto "${transcript}". Prova con rosso, verde, blu, giallo...`
      feedbackError.value = true
    }
  }

  return rec
}

// Avvia l'ascolto
function startListening() {
  if (!recognition) {
    recognition = initSpeechRecognition()
    if (!recognition) return
  }
  try {
    recognition.start()
  } catch (e) {
    console.warn(e)
    // Se già in ascolto, non fare nulla
  }
}

// Ripristina lo sfondo originale
function resetColor() {
  currentColor.value = '#0f0f1e'
  lastCommand.value = ''
  feedback.value = 'Sfondo ripristinato.'
  feedbackError.value = false
  speak('Sfondo ripristinato.')
}

// Feedback vocale opzionale
function speak(text) {
  if (!window.speechSynthesis) return
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = 'it-IT'
  window.speechSynthesis.cancel() // interrompe eventuali frasi precedenti
  window.speechSynthesis.speak(utterance)
}

onMounted(() => {
  // Inizializza il riconoscimento senza partire subito
  recognition = initSpeechRecognition()
})

onUnmounted(() => {
  if (recognition) {
    try { recognition.abort() } catch(e) {}
  }
})
</script>

<style scoped>
.voice-color-view {
  min-height: 100vh;
  transition: background-color 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}
.content {
  max-width: 600px;
  width: 100%;
  background: rgba(0,0,0,0.6);
  backdrop-filter: blur(10px);
  border-radius: 28px;
  padding: 2rem 1.5rem;
  color: #fff;
  text-align: center;
}
.back-btn {
  position: absolute;
  top: 20px;
  left: 20px;
  background: none;
  border: none;
  color: white;
  font-size: 1.8rem;
  cursor: pointer;
  text-shadow: 0 1px 3px black;
}
h1 {
  margin-top: 0;
  margin-bottom: 1.5rem;
  font-size: 1.8rem;
}
.card {
  background: rgba(30,30,50,0.8);
  border-radius: 20px;
  padding: 1rem;
  margin-bottom: 1rem;
  text-align: left;
}
.instructions h2 {
  margin-top: 0;
  font-size: 1.2rem;
}
.instructions p {
  margin: 0.5rem 0;
}
.controls {
  display: flex;
  gap: 1rem;
  justify-content: center;
  flex-wrap: wrap;
}
.btn-listen {
  background: #4a7cf5;
  border: none;
  padding: 0.8rem 1.8rem;
  border-radius: 40px;
  font-size: 1.2rem;
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
  padding: 0.8rem 1.5rem;
  border-radius: 40px;
  font-size: 1rem;
  color: white;
  cursor: pointer;
}
.feedback {
  background: rgba(0,0,0,0.7);
  font-size: 1rem;
  text-align: center;
  border-left: 5px solid #4a7cf5;
}
.feedback.error {
  border-left-color: #ff6666;
  background: rgba(100,30,30,0.7);
}
.last-command {
  background: rgba(0,0,0,0.5);
  text-align: center;
}
@keyframes pulse {
  0% { opacity: 1; transform: scale(1);}
  50% { opacity: 0.8; transform: scale(1.02);}
  100% { opacity: 1; transform: scale(1);}
}
@media (max-width: 500px) {
  .content { padding: 1.5rem 1rem; }
  h1 { font-size: 1.4rem; }
  .btn-listen, .btn-reset { padding: 0.6rem 1.2rem; font-size: 1rem; }
}
</style>