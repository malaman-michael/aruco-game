/**
 * voiceService.js
 * Assistente vocale via Web Speech API (SpeechSynthesis).
 * 
 * Seleziona automaticamente la voce italiana se disponibile.
 * Le frasi vengono accodate — una per volta, senza sovrapposizioni.
 * Messaggi con la stessa "chiave" non vengono ripetuti per X secondi.
 */

const COOLDOWN_MS = 4000  // stessa frase non ripetuta prima di N ms

class VoiceService {
  constructor() {
    this._enabled   = false
    this._voice     = null
    this._queue     = []
    this._speaking  = false
    this._cooldowns = {}   // key → timestamp ultima esecuzione
    this._ready     = false

    if (typeof speechSynthesis === 'undefined') return

    // Le voci potrebbero non essere ancora caricate
    const load = () => {
      const voices = speechSynthesis.getVoices()
      // Cerca voce italiana, fallback su qualsiasi
      this._voice = voices.find(v => v.lang.startsWith('it'))
                 ?? voices.find(v => v.lang.startsWith('en'))
                 ?? voices[0]
                 ?? null
      this._ready = true
    }

    load()
    speechSynthesis.addEventListener('voiceschanged', load)
  }

  get enabled()  { return this._enabled }
  get ready()    { return this._ready && typeof speechSynthesis !== 'undefined' }

  enable()  { this._enabled = true  }
  disable() {
    this._enabled = false
    speechSynthesis.cancel()
    this._queue   = []
    this._speaking = false
  }
  toggle()  { this._enabled ? this.disable() : this.enable() }

  /**
   * Parla il testo passato.
   * @param {string} text    - testo da pronunciare
   * @param {string} [key]   - chiave cooldown (se omessa usa il testo stesso)
   * @param {number} [priority] - 1=normale, 2=alta (salta la coda)
   */
  say(text, key, priority = 1) {
    if (!this._enabled || !this.ready) return

    const cooldownKey = key ?? text
    const now = Date.now()
    if (this._cooldowns[cooldownKey] && now - this._cooldowns[cooldownKey] < COOLDOWN_MS) return
    this._cooldowns[cooldownKey] = now

    if (priority === 2) {
      this._queue.unshift(text)
    } else {
      // Evita di accodare messaggi identici
      if (this._queue.includes(text)) return
      this._queue.push(text)
    }

    this._next()
  }

  _next() {
    if (this._speaking || this._queue.length === 0) return
    this._speaking = true

    const text = this._queue.shift()
    const utt  = new SpeechSynthesisUtterance(text)
    if (this._voice) utt.voice = this._voice
    utt.lang  = this._voice?.lang ?? 'it-IT'
    utt.rate  = 1.05
    utt.pitch = 1.0

    utt.onend = utt.onerror = () => {
      this._speaking = false
      this._next()
    }

    speechSynthesis.speak(utt)
  }

  /** Annuncia lo stato dei corner (usato durante la calibrazione) */
  announceCornerStatus(cornersAcquired, cornerPositions) {
    if (!this._enabled) return

    if (cornersAcquired === 4) {
      this.say('Griglia calibrata. Tutti e quattro gli angoli sono acquisiti.', 'grid_ready', 2)
      return
    }

    const NAMES = { NO: 'nord ovest', NE: 'nord est', SO: 'sud ovest', SE: 'sud est' }
    const missing = ['NO','NE','SO','SE']
      .filter(r => !cornerPositions[r])
      .map(r => NAMES[r])

    if (missing.length === 4) {
      this.say('Inquadra i marcatori degli angoli per calibrare la griglia.', 'corners_none')
    } else {
      this.say(`Mancano ${missing.join(', ')}.`, 'corners_missing')
    }
  }

  /** Annuncia quando un corner viene acquisito */
  announceCornerAcquired(role, total) {
    if (!this._enabled) return
    const NAMES = { NO: 'nord ovest', NE: 'nord est', SO: 'sud ovest', SE: 'sud est' }
    if (total === 4) {
      this.say('Perfetto! Tutti e quattro gli angoli acquisiti. Griglia pronta.', 'all_corners', 2)
    } else {
      this.say(`${NAMES[role]} acquisito. ${4 - total} angoli mancanti.`, `corner_${role}`, 2)
    }
  }

  /** Annuncia una nuova pedina rilevata */
  announcePiece(label, col, row) {
    if (!this._enabled) return
    const pos = (col !== null && row !== null) ? `, posizione ${col}, ${row}` : ''
    this.say(`${label} rilevato${pos}.`, `piece_${label}`)
  }
}

// Singleton
export const voice = new VoiceService()