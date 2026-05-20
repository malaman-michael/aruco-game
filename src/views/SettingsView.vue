<template>
  <div class="settings-view">
    <!-- Skip to content link per screen reader -->
    <a href="#main-content" class="skip-link">Salta al contenuto principale</a>

    <div class="settings-header" role="banner">
      <button 
        class="back-btn" 
        @click="$router.push('/')" 
        aria-label="Torna alla home"
      >
        ←
      </button>
      <h1 id="main-heading">⚙️ Personalizzazione del gioco</h1>
      <button 
        class="reset-btn" 
        @click="resetAll" 
        aria-label="Ripristina tutte le impostazioni ai valori predefiniti"
      >
        ↺ Ripristina default
      </button>
    </div>

    <div class="settings-content" id="main-content" role="main" aria-labelledby="main-heading">
      <!-- Sezioni collassabili -->
      <div 
        v-for="(section, key) in settingsStore.sections" 
        :key="key" 
        class="section-card card"
      >
        <div 
          class="section-header" 
          :id="`section-header-${key}`"
          @click="toggleCollapse(key)"
          @keydown.enter.space="toggleCollapse(key)"
          role="button"
          :aria-expanded="!collapsedSections[key]"
          :aria-controls="`section-content-${key}`"
          :aria-label="`${section.title} - sezione ${collapsedSections[key] ? 'chiusa' : 'aperta'}`"
          tabindex="0"
        >
          <h2>{{ section.title }}</h2>
          <span class="collapse-icon" aria-hidden="true">{{ collapsedSections[key] ? '▼' : '▲' }}</span>
        </div>

        <div 
          v-if="!collapsedSections[key]"
          :id="`section-content-${key}`"
          :aria-labelledby="`section-header-${key}`"
          role="region"
        >
          <!-- Items della sezione -->
          <div v-if="section.items && section.items.length" class="section-items">
            <div 
              v-for="(item, idx) in section.items" 
              :key="item.id" 
              class="item-row"
              :aria-label="`Elemento ${idx+1} di ${section.items.length}`"
            >
              <div class="move-buttons">
                <button 
                  class="move-btn" 
                  @click.stop="moveItem(key, item.id, 'up')" 
                  :disabled="idx === 0"
                  :aria-label="`Sposta ${getItemLabel(key, item)} in alto`"
                >
                  ↑
                </button>
                <button 
                  class="move-btn" 
                  @click.stop="moveItem(key, item.id, 'down')" 
                  :disabled="idx === section.items.length - 1"
                  :aria-label="`Sposta ${getItemLabel(key, item)} in basso`"
                >
                  ↓
                </button>
              </div>

              <!-- Contenuto variabile in base al tipo di sezione -->
              <template v-if="key === 'gestures'">
                <span class="gesture-name" aria-hidden="true">{{ getGestureLabel(item.gesture) }}</span>
                <span class="sr-only">Gesto: {{ getGestureLabel(item.gesture) }}</span>
                <select 
                  :value="item.action" 
                  @change="updateGestureProperty(key, item.id, 'action', $event.target.value)"
                  :aria-label="`Azione per gesto ${getGestureLabel(item.gesture)}`"
                >
                  <option v-for="act in availableActions" :value="act.value">{{ act.label }}</option>
                </select>
              </template>

              <template v-else-if="key === 'voiceCommands'">
                <span class="sr-only">Comando vocale</span>
                <input 
                  type="text" 
                  class="phrase-input" 
                  :value="item.phrase" 
                  @change="updateVoiceCommandProperty(key, item.id, 'phrase', $event.target.value)" 
                  placeholder="parola o frase"
                  :aria-label="`Frase per comando vocale (attuale: ${item.phrase})`"
                />
                <select 
                  :value="item.action" 
                  @change="updateVoiceCommandProperty(key, item.id, 'action', $event.target.value)"
                  :aria-label="`Azione per comando vocale ${item.phrase}`"
                >
                  <option v-for="act in availableActions" :value="act.value">{{ act.label }}</option>
                </select>
              </template>

              <template v-else>
                <input 
                  type="text" 
                  class="item-name" 
                  v-model="item.name" 
                  @change="updateName(key, item.id, item.name)"
                  :aria-label="`Nome dell'elemento: ${item.name}`"
                />
              </template>

              <!-- Checkbox enable per gesture/voice -->
              <label v-if="key === 'gestures' || key === 'voiceCommands'" class="enable-label">
                <input 
                  type="checkbox" 
                  :checked="item.enabled" 
                  @change="toggleEnable(key, item.id)"
                  :aria-label="`${getItemLabel(key, item)} attivo`"
                />
                <span aria-hidden="true">✅ Attivo</span>
                <span class="sr-only">Attivo</span>
              </label>

              <!-- Mute per sezioni tradizionali -->
              <label v-else class="mute-label">
                <input 
                  type="checkbox" 
                  :checked="item.muted" 
                  @change="toggleMute(key, item.id)"
                  :aria-label="`Silenzia ${item.name}`"
                />
                <span aria-hidden="true">🔇 Silenzia</span>
                <span class="sr-only">Silenzia</span>
              </label>

              <!-- Pulsante espandi per players/enemies -->
              <button 
                v-if="key === 'players' || key === 'enemies'" 
                class="expand-item-btn" 
                @click="toggleItemExpand(key, item.id)"
                :aria-label="`Opzioni avanzate per ${item.name} (espandi)`"
                aria-haspopup="true"
              >
                ⚙️
              </button>

              <div 
                v-if="expandedItems[`${key}_${item.id}`]" 
                class="item-advanced"
                role="region"
                :aria-label="`Impostazioni avanzate per ${item.name}`"
              >
                <!-- Contenuto avanzato (come prima) -->
                <div v-if="key === 'players'">
                  <label>Pronome:
                    <select 
                      :value="item.pronoun" 
                      @change="updateItemProperty(key, item.id, 'pronoun', $event.target.value)"
                    >
                      <option value="lui">lui</option>
                      <option value="lei">lei</option>
                      <option value="loro">loro</option>
                    </select>
                  </label>
                  <label>Frase inizio turno:
                    <input type="text" :value="item.startTurnPhrase" @change="updateItemProperty(key, item.id, 'startTurnPhrase', $event.target.value)" />
                  </label>
                  <label>Frase fine turno:
                    <input type="text" :value="item.endTurnPhrase" @change="updateItemProperty(key, item.id, 'endTurnPhrase', $event.target.value)" />
                  </label>
                  <label>
                    <input type="checkbox" :checked="item.announceDamage" @change="updateItemProperty(key, item.id, 'announceDamage', $event.target.checked)" />
                    Annuncia danno subito
                  </label>
                  <label>
                    <input type="checkbox" :checked="item.announceMoves" @change="updateItemProperty(key, item.id, 'announceMoves', $event.target.checked)" />
                    Annuncia movimenti
                  </label>
                </div>
                <div v-if="key === 'enemies'">
                  <label>Frase comparsa: <input type="text" :value="item.appearPhrase" @change="updateItemProperty(key, item.id, 'appearPhrase', $event.target.value)" /></label>
                  <label>Frase colpito: <input type="text" :value="item.hitPhrase" @change="updateItemProperty(key, item.id, 'hitPhrase', $event.target.value)" /></label>
                  <label>Frase morte: <input type="text" :value="item.deathPhrase" @change="updateItemProperty(key, item.id, 'deathPhrase', $event.target.value)" /></label>
                  <label>Stile morte:
                    <select :value="item.deathStyle" @change="updateItemProperty(key, item.id, 'deathStyle', $event.target.value)">
                      <option value="normale">Normale</option>
                      <option value="epica">Epica</option>
                      <option value="comica">Comica</option>
                    </select>
                  </label>
                </div>
              </div>
            </div>
          </div>

          <!-- Opzioni generali della sezione -->
          <div v-if="section.options" class="section-options">
            <h3 id="options-heading-{{key}}" class="sr-only">Opzioni sezione</h3>
            <div v-for="(value, optKey) in section.options" :key="optKey" class="option-row">
              <label :id="`${key}-${optKey}-label`">{{ formatOptionLabel(optKey) }}</label>
              <!-- Checkbox -->
              <div v-if="typeof value === 'boolean'">
                <input 
                  type="checkbox" 
                  :checked="value" 
                  @change="updateOption(key, optKey, $event.target.checked)"
                  :aria-labelledby="`${key}-${optKey}-label`"
                />
              </div>
              <!-- Slider -->
              <div v-else-if="typeof value === 'number' && !optKey.includes('Threshold') && !optKey.includes('Sensitivity')">
                <input 
                  type="range" 
                  :min="getMinForOption(optKey)" 
                  :max="getMaxForOption(optKey)" 
                  step="0.05" 
                  :value="value" 
                  @input="updateOption(key, optKey, parseFloat($event.target.value))"
                  :aria-labelledby="`${key}-${optKey}-label`"
                  :aria-valuemin="getMinForOption(optKey)"
                  :aria-valuemax="getMaxForOption(optKey)"
                  :aria-valuenow="value"
                />
                <span class="slider-value" aria-hidden="true">{{ value }}</span>
                <span class="sr-only">valore {{ value }}</span>
              </div>
              <!-- Input testo per frasi -->
              <div v-else-if="optKey.includes('Phrase') || optKey.includes('Msg') || optKey === 'entryMessage'">
                <input 
                  type="text" 
                  :value="value" 
                  @change="updateOption(key, optKey, $event.target.value)"
                  :aria-labelledby="`${key}-${optKey}-label`"
                />
              </div>
              <!-- Select -->
              <div v-else>
                <select 
                  :value="value" 
                  @change="updateOption(key, optKey, $event.target.value)"
                  :aria-labelledby="`${key}-${optKey}-label`"
                >
                  <option v-for="opt in getOptionChoices(optKey)" :value="opt">{{ opt }}</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Info card -->
      <div class="info-card card" role="complementary" aria-label="Guida alla personalizzazione">
        <h3>💡 Come usare la personalizzazione</h3>
        <ul>
          <li><strong>Ordine</strong>: usa le frecce ↑/↓ per riordinare le voci.</li>
          <li><strong>Gesti</strong>: associa uno swipe/tap a un'azione di gioco.</li>
          <li><strong>Comandi vocali</strong>: imposta parole chiave che il gioco riconoscerà a voce.</li>
          <li>Ogni comando può essere attivato/disattivato con la checkbox "Attivo".</li>
          <li>Le impostazioni vengono salvate automaticamente nel browser.</li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useSettingsStore } from '../stores/settingsStore.js'

const settingsStore = useSettingsStore()

// Stati di collasso
const collapsedSections = ref({
  general: false,
  players: false,
  enemies: false,
  room: false,
  combat: false,
  treasureCards: false,
  system: false,
  gestures: false,
  voiceCommands: false
})

const expandedItems = ref({})

function toggleCollapse(sectionKey) {
  collapsedSections.value[sectionKey] = !collapsedSections.value[sectionKey]
}

function toggleItemExpand(sectionKey, itemId) {
  const key = `${sectionKey}_${itemId}`
  expandedItems.value[key] = !expandedItems.value[key]
}

function moveItem(sectionKey, itemId, direction) {
  settingsStore.moveItem(sectionKey, itemId, direction)
}

function updateName(sectionKey, itemId, newName) {
  settingsStore.updateItemName(sectionKey, itemId, newName)
}

function toggleMute(sectionKey, itemId) {
  settingsStore.toggleMute(sectionKey, itemId)
}

function toggleEnable(sectionKey, itemId) {
  settingsStore.toggleEnable(sectionKey, itemId)
}

function updateGestureProperty(sectionKey, itemId, prop, value) {
  settingsStore.updateGestureProperty(sectionKey, itemId, prop, value)
}

function updateVoiceCommandProperty(sectionKey, itemId, prop, value) {
  settingsStore.updateVoiceCommandProperty(sectionKey, itemId, prop, value)
}

function updateItemProperty(sectionKey, itemId, prop, value) {
  settingsStore.updateItemProperty(sectionKey, itemId, prop, value)
}

function updateOption(sectionKey, optKey, value) {
  settingsStore.updateOption(sectionKey, optKey, value)
}

function resetAll() {
  if (confirm('Ripristinare tutte le impostazioni ai valori predefiniti?')) {
    settingsStore.resetToDefaults()
    location.reload()
  }
}

function getGestureLabel(gestureId) {
  const map = {
    swipe_up: '🔼 Swipe su',
    swipe_down: '🔽 Swipe giù',
    swipe_left: '⬅️ Swipe sinistra',
    swipe_right: '➡️ Swipe destra',
    double_tap: '👆 Doppio tap',
    pinch: '🤏 Pinch'
  }
  return map[gestureId] || gestureId
}

function getItemLabel(sectionKey, item) {
  if (sectionKey === 'gestures') return getGestureLabel(item.gesture)
  if (sectionKey === 'voiceCommands') return `comando vocale "${item.phrase}"`
  return item.name || item.id
}

const availableActions = [
  { value: 'next_piece', label: 'Prossimo pezzo' },
  { value: 'prev_piece', label: 'Precedente pezzo' },
  { value: 'confirm', label: 'Conferma posizionamento' },
  { value: 'skip', label: 'Salta pezzo' },
  { value: 'repeat', label: 'Ripeti istruzione' },
  { value: 'toggle_voice', label: 'Attiva/disattiva voce' }
]

function formatOptionLabel(key) {
  const map = {
    language: 'Lingua',
    voiceRate: 'Velocità voce',
    voiceVolume: 'Volume',
    voicePitch: 'Tono',
    narrativeMode: 'Modalità narrativa',
    autoWaitSeconds: 'Attesa automatica (s)',
    repeatLastKeyEnabled: 'Ripeti ultimo messaggio con tasto',
    collectivePreamble: 'Preambolo collettivo',
    announceTurnStart: 'Annuncia inizio turno',
    announceTurnEnd: 'Annuncia fine turno',
    detailedDamage: 'Danni dettagliati',
    announceRemainingHp: 'Annuncia PF rimanenti',
    entryMessage: 'Messaggio di ingresso',
    detailedDescription: 'Descrizione dettagliata',
    listExits: 'Elenca uscite',
    announceSecretDoors: 'Segnala porte segrete',
    secretDoorRevealCheck: 'Rivelazione con prova',
    ambientSoundEnabled: 'Suono ambientale',
    combatStartPhrase: 'Frase inizio combattimento',
    announceInitiativeOrder: 'Annuncia ordine iniziativa',
    criticalHitPhrase: 'Frase colpo critico',
    missPhrase: 'Frase mancato colpo',
    escapePhrase: 'Frase fuga',
    announceDiceRolls: 'Annuncia tiri dado',
    vocalFlourishes: 'Abbellimenti vocali',
    revealCardName: 'Rivela nome carta',
    goldPhrase: 'Frase oro',
    magicItemPhrase: 'Frase oggetto magico',
    trapPhrase: 'Frase trappola',
    playTreasureSound: 'Suono tesoro',
    assistantActivatedMsg: 'Attivazione assistente',
    confirmPlacementMsg: 'Conferma posizionamento',
    skipMsg: 'Saltato',
    errorNoMapMsg: 'Errore nessuna mappa',
    promptCommandMsg: 'Promemoria comandi',
    completionMsg: 'Completamento',
    enableGestures: 'Abilita gesti',
    gestureSensitivity: 'Sensibilità gesti',
    enableVoiceCommands: 'Abilita comandi vocali',
    continuousListening: 'Ascolto continuo',
    confidenceThreshold: 'Soglia di confidenza'
  }
  return map[key] || key
}

function getMinForOption(optKey) {
  if (optKey === 'voiceRate') return 0.5
  if (optKey === 'voiceVolume') return 0
  if (optKey === 'voicePitch') return 0.5
  if (optKey === 'autoWaitSeconds') return 0
  if (optKey === 'gestureSensitivity') return 0.1
  if (optKey === 'confidenceThreshold') return 0.5
  return 0
}

function getMaxForOption(optKey) {
  if (optKey === 'voiceRate') return 2.0
  if (optKey === 'voiceVolume') return 1.0
  if (optKey === 'voicePitch') return 2.0
  if (optKey === 'autoWaitSeconds') return 10
  if (optKey === 'gestureSensitivity') return 1.0
  if (optKey === 'confidenceThreshold') return 1.0
  return 1
}

function getOptionChoices(optKey) {
  if (optKey === 'language') return ['it', 'en']
  if (optKey === 'narrativeMode') return ['dettagliata', 'sintetica']
  if (optKey === 'announceRemainingHp') return ['sempre', 'sotto30', 'mai']
  if (optKey === 'announceDiceRolls') return ['sempre', 'soloSuccessi', 'mai']
  if (optKey === 'revealCardName') return ['sempre', 'soloIdentificata', 'mai']
  return []
}

onMounted(() => {
  settingsStore.loadFromStorage()
})
</script>

<style scoped>
/* ===== RESET E VARIABILI ===== */
.settings-view {
  --bg-primary: #0f0f1e;
  --bg-card: #1a1a2e;
  --bg-item: #252540;
  --bg-input: #2a2a4a;
  --border: #3a3a6a;
  --text-primary: #eee;
  --text-secondary: #aaa;
  --accent: #4a7cf5;
  --accent-hover: #5c8ef5;
  --danger: #8a2a2a;
  --danger-hover: #a03a3a;
  --focus-ring: 0 0 0 3px rgba(74, 124, 245, 0.6);
}

.settings-view {
  min-height: 100vh;
  background: var(--bg-primary);
  color: var(--text-primary);
  padding: 1rem;
  font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
  line-height: 1.5;
}

/* ===== SKIP LINK ===== */
.skip-link {
  position: absolute;
  top: -40px;
  left: 0;
  background: var(--accent);
  color: white;
  padding: 0.5rem 1rem;
  text-decoration: none;
  z-index: 100;
  border-radius: 0 0 4px 0;
}
.skip-link:focus {
  top: 0;
  outline: none;
  box-shadow: var(--focus-ring);
}

/* ===== HEADER ===== */
.settings-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
}
.back-btn, .reset-btn {
  background: none;
  border: none;
  font-size: 1.2rem;
  padding: 0.4rem 0.8rem;
  border-radius: 30px;
  cursor: pointer;
  transition: background 0.2s, box-shadow 0.2s;
}
.back-btn {
  color: var(--accent);
  font-size: 1.5rem;
  padding: 0.2rem 0.6rem;
}
.reset-btn {
  background: var(--danger);
  color: white;
}
.back-btn:hover, .reset-btn:hover {
  filter: brightness(1.1);
}
.back-btn:focus-visible, .reset-btn:focus-visible {
  outline: none;
  box-shadow: var(--focus-ring);
}
h1 {
  margin: 0;
  font-size: 1.4rem;
  flex: 1;
}

/* ===== LAYOUT PRINCIPALE ===== */
.settings-content {
  max-width: 900px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 1.2rem;
}
.card {
  background: var(--bg-card);
  border-radius: 1rem;
  padding: 1rem;
  border: 1px solid var(--border);
}

/* ===== SEZIONI COLLASSABILI ===== */
.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  user-select: none;
  padding: 0.25rem 0;
  border-radius: 8px;
  transition: background 0.2s;
}
.section-header:hover {
  background: rgba(255,255,255,0.05);
}
.section-header:focus-visible {
  outline: none;
  box-shadow: var(--focus-ring);
}
.section-header h2 {
  margin: 0;
  font-size: 1.3rem;
}
.collapse-icon {
  font-size: 1.2rem;
  color: var(--text-secondary);
}

/* ===== ITEMS ROWS ===== */
.section-items {
  margin-top: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
}
.item-row {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  background: var(--bg-item);
  padding: 0.7rem;
  border-radius: 12px;
  flex-wrap: wrap;
  transition: background 0.2s;
}
.move-buttons {
  display: flex;
  gap: 0.3rem;
}
.move-btn {
  background: #3a3a6a;
  border: none;
  color: white;
  width: 36px;
  height: 36px;
  border-radius: 8px;
  cursor: pointer;
  font-weight: bold;
  transition: background 0.2s, box-shadow 0.2s;
}
.move-btn:hover:not(:disabled) {
  background: #4a4a7a;
}
.move-btn:focus-visible {
  outline: none;
  box-shadow: var(--focus-ring);
}
.move-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.item-name, .gesture-name, .phrase-input, select {
  flex: 2;
  min-width: 130px;
  background: var(--bg-input);
  border: 1px solid var(--border);
  padding: 0.5rem 0.7rem;
  border-radius: 10px;
  color: var(--text-primary);
  font-size: 0.95rem;
  transition: border 0.2s, box-shadow 0.2s;
}
.item-name:focus, .phrase-input:focus, select:focus {
  outline: none;
  border-color: var(--accent);
  box-shadow: var(--focus-ring);
}
.gesture-name {
  background: transparent;
  border: none;
  font-weight: bold;
  min-width: 110px;
}
.enable-label, .mute-label {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  background: var(--bg-input);
  padding: 0.3rem 0.8rem;
  border-radius: 30px;
  cursor: pointer;
  transition: background 0.2s;
}
.enable-label:hover, .mute-label:hover {
  background: #3a3a5a;
}
.expand-item-btn {
  background: #4a6a9a;
  border: none;
  border-radius: 8px;
  padding: 0.3rem 0.7rem;
  cursor: pointer;
  font-size: 1.1rem;
  transition: background 0.2s, box-shadow 0.2s;
}
.expand-item-btn:hover {
  background: #5a7aaa;
}
.expand-item-btn:focus-visible {
  outline: none;
  box-shadow: var(--focus-ring);
}
.item-advanced {
  margin-top: 0.7rem;
  padding: 0.7rem;
  background: #1f1f3a;
  border-radius: 12px;
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 0.7rem;
}
.item-advanced label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}
.item-advanced input, .item-advanced select {
  background: var(--bg-input);
  border: 1px solid var(--border);
  padding: 0.4rem;
  border-radius: 6px;
  color: white;
}

/* ===== OPZIONI SEZIONE ===== */
.section-options {
  margin-top: 1rem;
  border-top: 1px solid var(--border);
  padding-top: 0.8rem;
}
.section-options h3 {
  font-size: 1rem;
  margin: 0 0 0.6rem 0;
  color: var(--text-secondary);
}
.option-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.6rem;
  flex-wrap: wrap;
  gap: 0.5rem;
}
.option-row label {
  font-weight: 500;
  flex: 1;
  min-width: 150px;
}
.option-row input[type="range"] {
  width: 180px;
}
.option-row input[type="text"], .option-row select {
  background: var(--bg-input);
  border: 1px solid var(--border);
  padding: 0.4rem 0.6rem;
  border-radius: 8px;
  color: white;
}
.slider-value {
  min-width: 35px;
  text-align: center;
}

/* ===== INFO CARD ===== */
.info-card ul {
  margin: 0.5rem 0 0 1.2rem;
  line-height: 1.6;
}

/* ===== UTILITY ===== */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0,0,0,0);
  white-space: nowrap;
  border: 0;
}

/* ===== RESPONSIVE ===== */
@media (max-width: 700px) {
  .item-row {
    flex-direction: column;
    align-items: stretch;
  }
  .move-buttons {
    justify-content: center;
  }
  .item-name, .gesture-name, .phrase-input, select {
    width: 100%;
  }
  .enable-label, .mute-label {
    justify-content: center;
  }
  .option-row {
    flex-direction: column;
    align-items: flex-start;
  }
  .option-row input[type="range"] {
    width: 100%;
  }
}

@media (prefers-reduced-motion: reduce) {
  * {
    transition-duration: 0.01ms !important;
    animation-duration: 0.01ms !important;
  }
}
</style>