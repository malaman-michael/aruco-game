<template>
  <div class="settings-view">
    <div class="settings-header">
      <button class="back-btn" @click="$router.push('/')">←</button>
      <h1>⚙️ Personalizzazione del gioco</h1>
      <button class="reset-btn" @click="resetAll">↺ Ripristina default</button>
    </div>

    <div class="settings-content">
      <!-- Sezioni collassabili -->
      <div v-for="(section, key) in settingsStore.sections" :key="key" class="section-card card">
        <div class="section-header" @click="toggleCollapse(key)">
          <h2>{{ section.title }}</h2>
          <span class="collapse-icon">{{ collapsedSections[key] ? '▼' : '▲' }}</span>
        </div>

        <div v-if="!collapsedSections[key]">
          <!-- RIGHE PER GLI ITEMS (solo se la sezione ha items) -->
          <div v-if="section.items && section.items.length" class="section-items">
            <div v-for="item in section.items" :key="item.id" class="item-row">
              <div class="move-buttons">
                <button class="move-btn" @click.stop="moveItem(key, item.id, 'up')" :disabled="section.items[0].id === item.id">↑</button>
                <button class="move-btn" @click.stop="moveItem(key, item.id, 'down')" :disabled="section.items[section.items.length-1].id === item.id">↓</button>
              </div>
              <input type="text" class="item-name" v-model="item.name" @change="updateName(key, item.id, item.name)" />
              <label class="mute-label">
                <input type="checkbox" :checked="item.muted" @change="toggleMute(key, item.id)" />
                🔇 Silenzia
              </label>
              <!-- Sezione espandibile per opzioni avanzate -->
              <button class="expand-item-btn" @click="toggleItemExpand(key, item.id)">⚙️</button>
              <div v-if="expandedItems[`${key}_${item.id}`]" class="item-advanced">
                <div v-if="key === 'players'">
                  <label>Pronome: 
                    <select :value="item.pronoun" @change="updateItemProperty(key, item.id, 'pronoun', $event.target.value)">
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
                  <label><input type="checkbox" :checked="item.announceDamage" @change="updateItemProperty(key, item.id, 'announceDamage', $event.target.checked)" /> Annuncia danno subito</label>
                  <label><input type="checkbox" :checked="item.announceMoves" @change="updateItemProperty(key, item.id, 'announceMoves', $event.target.checked)" /> Annuncia movimenti</label>
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

          <!-- OPZIONI GENERALI DELLA SEZIONE (options) -->
          <div v-if="section.options" class="section-options">
            <h3>⚙️ Opzioni sezione</h3>
            <div v-for="(value, optKey) in section.options" :key="optKey" class="option-row">
              <label>{{ formatOptionLabel(optKey) }}</label>
              <template v-if="typeof value === 'boolean'">
                <input type="checkbox" :checked="value" @change="updateOption(key, optKey, $event.target.checked)" />
              </template>
              <template v-else-if="typeof value === 'number'">
                <input type="range" :min="getMinForOption(optKey)" :max="getMaxForOption(optKey)" step="0.1" :value="value" @input="updateOption(key, optKey, parseFloat($event.target.value))" />
                <span>{{ value }}</span>
              </template>
              <template v-else-if="optKey.includes('Phrase') || optKey.includes('Msg') || optKey.includes('message')">
                <input type="text" :value="value" @change="updateOption(key, optKey, $event.target.value)" />
              </template>
              <template v-else>
                <select :value="value" @change="updateOption(key, optKey, $event.target.value)">
                  <option v-for="opt in getOptionChoices(optKey)" :key="opt" :value="opt">{{ opt }}</option>
                </select>
              </template>
            </div>
          </div>
        </div>
      </div>

      <div class="info-card card">
        <h3>💡 Come usare la personalizzazione</h3>
        <ul>
          <li><strong>Ordine</strong>: usa le frecce ↑/↓ per riordinare le voci.</li>
          <li><strong>Nomenclatura</strong>: clicca sul nome e rinominalo.</li>
          <li><strong>Silenziamento</strong>: spunta “Silenzia” per escludere quella voce dalla lettura vocale.</li>
          <li><strong>Opzioni avanzate</strong>: clicca su ⚙️ per personalizzare frasi e comportamenti specifici.</li>
          <li><strong>Opzioni sezione</strong>: ogni sezione ha impostazioni globali (lingua, modalità narrativa, ecc.).</li>
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

const collapsedSections = ref({
  general: false,
  players: false,
  enemies: false,
  room: false,
  combat: false,
  treasureCards: false,
  system: false
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
    completionMsg: 'Completamento'
  }
  return map[key] || key
}

function getMinForOption(optKey) {
  if (optKey === 'voiceRate') return 0.5
  if (optKey === 'voiceVolume') return 0
  if (optKey === 'voicePitch') return 0.5
  if (optKey === 'autoWaitSeconds') return 0
  return 0
}

function getMaxForOption(optKey) {
  if (optKey === 'voiceRate') return 2.0
  if (optKey === 'voiceVolume') return 1.0
  if (optKey === 'voicePitch') return 2.0
  if (optKey === 'autoWaitSeconds') return 10
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
/* STILI BASE */
.settings-view {
  min-height: 100vh;
  background: #0f0f1e;
  color: #eee;
  padding: 1rem;
}
.settings-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
}
.back-btn {
  background: none;
  border: none;
  color: #7c9ef5;
  font-size: 1.5rem;
  cursor: pointer;
}
h1 {
  margin: 0;
  font-size: 1.4rem;
  flex: 1;
}
.reset-btn {
  background: #8a2a2a;
  border: none;
  border-radius: 20px;
  padding: 0.4rem 1rem;
  color: white;
  cursor: pointer;
}
.settings-content {
  max-width: 800px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 1.2rem;
}
.card {
  background: #1a1a2e;
  border-radius: 14px;
  padding: 1rem;
}
.section-card {
  overflow: hidden;
}
.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  user-select: none;
}
.section-header h2 {
  margin: 0;
  font-size: 1.3rem;
}
.collapse-icon {
  font-size: 1.2rem;
  color: #aaa;
}
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
  background: #252540;
  padding: 0.5rem;
  border-radius: 10px;
  flex-wrap: wrap;
}
.move-buttons {
  display: flex;
  gap: 0.3rem;
}
.move-btn {
  background: #3a3a6a;
  border: none;
  color: white;
  width: 32px;
  height: 32px;
  border-radius: 6px;
  cursor: pointer;
  font-weight: bold;
}
.move-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.item-name {
  flex: 2;
  min-width: 120px;
  background: #2a2a4a;
  border: 1px solid #4a4a7a;
  padding: 0.4rem 0.6rem;
  border-radius: 8px;
  color: #eee;
  font-size: 0.95rem;
}
.mute-label {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  background: #2a2a4a;
  padding: 0.3rem 0.8rem;
  border-radius: 20px;
  cursor: pointer;
}
.expand-item-btn {
  background: #4a6a9a;
  border: none;
  border-radius: 6px;
  padding: 0.2rem 0.6rem;
  cursor: pointer;
  font-size: 1rem;
}
.item-advanced {
  margin-top: 0.5rem;
  padding: 0.5rem;
  background: #1f1f3a;
  border-radius: 8px;
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.item-advanced label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}
.section-options {
  margin-top: 1rem;
  border-top: 1px solid #3a3a6a;
  padding-top: 0.8rem;
}
.section-options h3 {
  font-size: 1rem;
  margin: 0 0 0.5rem 0;
  color: #aaa;
}
.option-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
  flex-wrap: wrap;
  gap: 0.5rem;
}
.option-row label {
  font-weight: normal;
  flex: 1;
}
.option-row input[type="range"] {
  width: 150px;
}
.info-card ul {
  margin: 0.5rem 0 0 1.2rem;
  line-height: 1.6;
}
@media (max-width: 600px) {
  .item-row {
    flex-direction: column;
    align-items: stretch;
  }
  .move-buttons {
    justify-content: center;
  }
  .item-name {
    text-align: center;
  }
  .mute-label {
    justify-content: center;
  }
  .option-row {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>