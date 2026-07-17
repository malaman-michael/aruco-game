// src/services/voiceService.js
const COOLDOWN_MS = 4000

class VoiceService {
  constructor() {
    this._enabled = false
    this._voice = null
    this._queue = []
    this._speaking = false
    this._cooldowns = {}
    this._ready = false

    if (typeof speechSynthesis === 'undefined') return
    const load = () => {
      const voices = speechSynthesis.getVoices()
      this._voice = voices.find(v => v.lang.startsWith('it')) ?? voices.find(v => v.lang.startsWith('en')) ?? voices[0] ?? null
      this._ready = true
    }
    load()
    speechSynthesis.addEventListener('voiceschanged', load)
  }

  get enabled() { return this._enabled }
  get ready() { return this._ready && typeof speechSynthesis !== 'undefined' }

  enable() { this._enabled = true }
  disable() {
    this._enabled = false
    speechSynthesis.cancel()
    this._queue = []
    this._speaking = false
  }
  toggle() { this._enabled ? this.disable() : this.enable() }

  say(text, key, priority = 1) {
    if (!this._enabled || !this.ready) return
    const cooldownKey = key ?? text
    const now = Date.now()
    if (this._cooldowns[cooldownKey] && now - this._cooldowns[cooldownKey] < COOLDOWN_MS) return
    this._cooldowns[cooldownKey] = now

    if (priority === 2) {
      this._queue.unshift(text)
    } else {
      if (this._queue.includes(text)) return
      this._queue.push(text)
    }
    this._next()
  }

  _next() {
    if (this._speaking || this._queue.length === 0) return
    this._speaking = true
    const text = this._queue.shift()
    const utt = new SpeechSynthesisUtterance(text)
    if (this._voice) utt.voice = this._voice
    utt.lang = this._voice?.lang ?? 'it-IT'
    utt.rate = 1.05
    utt.pitch = 1.0
    utt.onend = utt.onerror = () => {
      this._speaking = false
      this._next()
    }
    speechSynthesis.speak(utt)
  }

  announceAnchorsCount(count) {
    if (!this._enabled) return
    if (count >= 3) {
      this.say(`Ancore visibili: ${count}. Omografia pronta.`, 'anchors_ready', 2)
    } else {
      this.say(`Ancore visibili: ${count}. Servono almeno 3.`, 'anchors_count', 1)
    }
  }

  announcePiece(label, col, row) {
    if (!this._enabled) return
    const pos = (col !== null && row !== null) ? `, posizione ${col}, ${row}` : ''
    this.say(`${label} rilevato${pos}.`, `piece_${label}`)
  }
}

export const voice = new VoiceService()