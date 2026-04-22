<template>
  <div class="game-view">
    <!-- CameraView sempre attivo, visibile solo quando viewMode === 'camera' -->
    <div v-show="viewMode === 'camera'" class="viewport" ref="viewportEl">
      <CameraView
        ref="cameraViewRef"
        :active="isActive"
        @unknown-marker="onUnknownMarker"
        @frame-processed="onFrameProcessed"
      />
    </div>

    <!-- Modalità Tabella Pedine -->
    <div v-show="viewMode === 'table'" class="table-view">
      <!-- Nuovo indicatore angoli visibili -->
      <div class="corner-indicator">
        <div class="corner-box">
          <span class="corner-label">Angoli visibili</span>
          <div class="corner-dots-indicator">
            <div
              v-for="role in ['NO', 'NE', 'SO', 'SE']"
              :key="role"
              class="indicator-dot"
              :class="{ active: visibleCornersSet.has(role) }"
              :title="role"
            >
              {{ role }}
            </div>
          </div>
        </div>
      </div>

      <div class="table-header">
        <h2>📋 Pedine in gioco</h2>
        <span class="piece-count">{{ piecesList.length }} pedine rilevate</span>
      </div>
      <div class="table-container">
        <table class="pieces-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Nome</th>
              <th>Posizione</th>
              <th>Orientamento</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="piece in piecesList" :key="piece.id" :class="piece.category">
              <td class="col-id">#{{ piece.id }}</td>
              <td class="col-name">
                <span class="piece-emoji">{{ piece.emoji }}</span>
                {{ piece.label }}
              </td>
              <td class="col-pos">
                {{ piece.col !== null && piece.row !== null ? `(${piece.col}, ${piece.row})` : '—' }}
              </td>
              <td class="col-dir">
                {{ piece.rotationSymbol || '—' }}
              </td>
            </tr>
            <tr v-if="piecesList.length === 0">
              <td colspan="4" class="empty-table">Nessuna pedina visibile</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="table-footer">
        <button class="btn-back" @click="viewMode = 'camera'">← Torna alla fotocamera</button>
      </div>
    </div>

    <!-- HUD superiore (visibile solo in modalità camera) -->
    <div v-if="viewMode === 'camera'" class="hud-top">
      <button class="icon-btn" @click="$router.push('/')">✕</button>
      <span class="hud-title">ArUco Game</span>
      <div class="hud-actions">
        <button
          class="icon-btn"
          :class="{ 'icon-btn--active': voiceEnabled }"
          :title="voiceEnabled ? 'Disattiva voce' : 'Attiva voce'"
          @click="toggleVoice"
        >🔊</button>

        <button
          class="icon-btn"
          :class="{ 'icon-btn--locked': !gameStore.allowNewMarkers }"
          :title="gameStore.allowNewMarkers ? 'Blocca aggiunta pedine' : 'Sblocca aggiunta pedine'"
          @click="gameStore.toggleNewMarkers(); announceMarkerMode()"
        >{{ gameStore.allowNewMarkers ? '🔓' : '🔒' }}</button>

        <button class="icon-btn" @click="showSettings = true" title="Impostazioni">⚙️</button>
        <button class="icon-btn" @click="viewMode = 'table'" title="Visualizza tabella pedine">📋</button>
      </div>
    </div>

    <!-- HUD minimale per modalità tabella -->
    <div v-else class="hud-top table-hud">
      <button class="icon-btn" @click="$router.push('/')">✕</button>
      <span class="hud-title">Tabella Pedine</span>
      <div class="hud-actions">
        <button class="icon-btn" @click="viewMode = 'camera'" title="Torna alla fotocamera">🎥</button>
      </div>
    </div>

    <!-- Status bar (solo camera) -->
    <div v-if="viewMode === 'camera'" class="status-bar">
      <span v-if="!markersStore.allCornersAssigned" class="status-warning">
        ⚠️ Angoli non configurati — vai in Configurazione
      </span>
      <span v-else-if="!gameStore.homographyReady" class="status-calibrating">
        📍 Calibrazione: {{ gameStore.cornersAcquired }}/4 angoli
        <span class="corner-dots">
          <span v-for="pos in ['NO','NE','SO','SE']" :key="pos"
            class="corner-dot" :class="{ acquired: !!gameStore.cornerPositions[pos] }"
            :title="pos">{{ pos }}</span>
        </span>
      </span>
      <span v-else class="status-ok">
        ✓ {{ gameStore.gridCols }}×{{ gameStore.gridRows }}
        · {{ gameStore.pieces.length }} pedine
        · {{ gameStore.allowNewMarkers ? '🔓' : '🔒' }}
        <button class="reset-h-btn" @click="onResetHomography" title="Ricalibra griglia">↺</button>
      </span>
    </div>

    <!-- Dialog marker sconosciuto -->
    <MarkerSetupDialog
      :visible="dialogVisible"
      :marker="unknownMarker"
      @confirmed="dialogVisible = false"
      @cancelled="dialogVisible = false"
    />

    <!-- Pannello impostazioni -->
    <CameraSettingsPanel
      :visible="showSettings"
      @close="showSettings = false"
    />

    <!-- Pannello lista pedine (solo camera) -->
    <transition v-if="viewMode === 'camera'" name="slide-up">
      <div v-if="showPieceList" class="piece-panel">
        <div class="piece-panel-header">
          <span>Pedine sul campo</span>
          <button @click="showPieceList = false">✕</button>
        </div>
        <div class="piece-list">
          <div v-for="p in gameStore.pieces" :key="p.id" class="piece-item" :class="p.category">
            <span class="piece-emoji">{{ p.emoji }}</span>
            <div>
              <strong>{{ p.label }}</strong>
              <small>#{{ p.id }} · {{ p.col !== null ? `(${p.col}, ${p.row})` : '–' }} · {{ Math.round(p.angle) }}°</small>
            </div>
          </div>
          <p v-if="!gameStore.pieces.length" class="no-pieces">Nessuna pedina visibile</p>
        </div>
      </div>
    </transition>

    <!-- FAB pedine (solo camera) -->
    <button v-if="viewMode === 'camera'" class="fab" @click="showPieceList = !showPieceList">
      🎲 {{ gameStore.pieces.length }}
    </button>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import CameraView from '../components/CameraView.vue'
import MarkerSetupDialog from '../components/MarkerSetupDialog.vue'
import CameraSettingsPanel from '../components/CameraSettingsPanel.vue'
import { useMarkersStore, CORNER_ROLES, MARKER_CATEGORIES } from '../stores/markersStore.js'
import { useGameStore } from '../stores/gameStore.js'
import { voice } from '../services/voiceService.js'

const markersStore = useMarkersStore()
const gameStore    = useGameStore()

const isActive        = ref(true)
const showSettings    = ref(false)
const showPieceList   = ref(false)
const dialogVisible   = ref(false)
const unknownMarker   = ref(null)
const voiceEnabled    = ref(false)
const cameraViewRef   = ref(null)

// Modalità vista: 'camera' o 'table'
const viewMode = ref('camera')

// Set degli angoli attualmente visibili (per indicatore in tabella)
const visibleCornersSet = ref(new Set())

// Lista delle sole pedine (esclusi corner) per la tabella
const piecesList = computed(() => {
  return gameStore.pieces.filter(p => p.category !== MARKER_CATEGORIES.CORNER)
})

onMounted(() => {
  gameStore.startGame()
  voice.announceCornerStatus(gameStore.cornersAcquired, gameStore.cornerPositions)
})

const missingCorners = computed(() => CORNER_ROLES.filter(r => !markersStore.corners[r]))

function toggleVoice() {
  voice.toggle()
  voiceEnabled.value = voice.enabled
  if (voice.enabled) {
    voice.say('Assistente vocale attivato.', 'voice_on', 2)
    setTimeout(() => voice.announceCornerStatus(
      gameStore.cornersAcquired, gameStore.cornerPositions
    ), 800)
  }
}

function announceMarkerMode() {
  voice.say(
    gameStore.allowNewMarkers ? 'Aggiunta pedine abilitata.' : 'Aggiunta pedine bloccata.',
    'marker_mode', 2
  )
}

function onResetHomography() {
  gameStore.resetHomography()
  voice.say('Calibrazione azzerata. Inquadra i quattro angoli.', 'reset_h', 2)
}

function onUnknownMarker(marker) {
  if (dialogVisible.value) return
  if (markersStore.isKnown(marker.id)) return
  unknownMarker.value = marker
  dialogVisible.value = true
}

// Aggiorna i corner visibili quando CameraView emette frame-processed
function onFrameProcessed(payload) {
  // payload contiene markers, pieces, homography, videoW, videoH
  if (payload && payload.markers) {
    const newVisible = new Set()
    for (const m of payload.markers) {
      const data = markersStore.getMarker(m.id)
      if (data?.category === MARKER_CATEGORIES.CORNER && data.role) {
        newVisible.add(data.role)
      }
    }
    visibleCornersSet.value = newVisible
  }
}
</script>

<style scoped>
/* Stili esistenti + nuovi per la tabella e indicatore angoli */
.game-view {
  position: fixed;
  inset: 0;
  background: #000;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.viewport {
  flex: 1;
  position: relative;
  overflow: hidden;
}

/* Stili HUD (invariati) */
.hud-top {
  position: absolute;
  top: env(safe-area-inset-top, 12px);
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem 1rem;
  z-index: 10;
}
.table-hud {
  position: relative;
  top: 0;
  background: #1a1a2e;
}
.hud-title {
  color: #fff;
  font-weight: 700;
  font-size: 1.1rem;
  text-shadow: 0 1px 4px rgba(0,0,0,0.7);
}
.hud-actions {
  display: flex;
  gap: 0.3rem;
}
.icon-btn {
  background: rgba(0,0,0,0.5);
  border: none;
  color: #fff;
  font-size: 1.1rem;
  padding: 0.4rem 0.6rem;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.15s;
}
.icon-btn--active {
  background: rgba(80,180,80,0.7);
}
.icon-btn--locked {
  background: rgba(180,60,60,0.7);
}

.status-bar {
  position: absolute;
  bottom: 80px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 10;
  background: rgba(0,0,0,0.6);
  border-radius: 20px;
  padding: 0.4rem 1rem;
  font-size: 0.85rem;
  white-space: nowrap;
}
.status-warning { color: #ffd700; }
.status-calibrating {
  color: #88ccff;
  display: flex;
  align-items: center;
  gap: 0.6rem;
}
.status-ok {
  color: #7fff7f;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.corner-dots { display: flex; gap: 0.3rem; }
.corner-dot {
  font-size: 0.7rem;
  padding: 0.1rem 0.3rem;
  border-radius: 4px;
  background: rgba(255,255,255,0.15);
  color: #aaa;
}
.corner-dot.acquired {
  background: rgba(100,200,100,0.4);
  color: #7fff7f;
}
.reset-h-btn {
  background: none;
  border: 1px solid rgba(127,255,127,0.4);
  border-radius: 6px;
  color: #7fff7f;
  font-size: 0.85rem;
  padding: 0.1rem 0.4rem;
  cursor: pointer;
  line-height: 1;
}

.fab {
  position: absolute;
  bottom: 24px;
  right: 20px;
  z-index: 10;
  background: #4a7cf5;
  color: #fff;
  border: none;
  border-radius: 50px;
  padding: 0.6rem 1.2rem;
  font-size: 1rem;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(0,0,0,0.4);
}

.piece-panel {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 20;
  background: #1a1a2e;
  border-radius: 16px 16px 0 0;
  padding: 1rem;
  max-height: 50vh;
  overflow-y: auto;
}
.piece-panel-header {
  display: flex;
  justify-content: space-between;
  color: #eee;
  font-weight: 600;
  margin-bottom: 0.8rem;
}
.piece-panel-header button {
  background: none;
  border: none;
  color: #aaa;
  font-size: 1rem;
  cursor: pointer;
}
.piece-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.piece-item {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  background: #2a2a4a;
  border-radius: 10px;
  padding: 0.6rem 0.8rem;
  color: #eee;
}
.piece-item.player { border-left: 3px solid #4a7cf5; }
.piece-item.enemy { border-left: 3px solid #e54040; }
.piece-item.furniture { border-left: 3px solid #b87820; }
.piece-emoji { font-size: 1.6rem; }
.piece-item strong { display: block; font-size: 0.95rem; }
.piece-item small {
  color: #888;
  font-family: monospace;
  font-size: 0.8rem;
}
.no-pieces {
  color: #666;
  text-align: center;
  padding: 1rem;
}

.slide-up-enter-active,
.slide-up-leave-active {
  transition: transform 0.25s ease;
}
.slide-up-enter-from,
.slide-up-leave-to {
  transform: translateY(100%);
}

/* Stili per la modalità tabella */
.table-view {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: #0f0f1e;
  color: #eee;
  padding: 1rem;
  overflow: hidden;
  position: relative;
}

/* Nuovo indicatore angoli visibili in alto a sinistra */
.corner-indicator {
  position: absolute;
  top: 1rem;
  left: 1rem;
  z-index: 5;
}
.corner-box {
  background: rgba(26, 26, 46, 0.9);
  border-radius: 12px;
  padding: 0.6rem 1rem;
  backdrop-filter: blur(4px);
  border: 1px solid #3a3a6a;
}
.corner-label {
  display: block;
  font-size: 0.7rem;
  color: #aaa;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 0.4rem;
}
.corner-dots-indicator {
  display: flex;
  gap: 0.5rem;
}
.indicator-dot {
  width: 2.2rem;
  height: 2.2rem;
  border-radius: 8px;
  background: #2a2a4a;
  border: 2px solid #3a3a6a;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8rem;
  font-weight: bold;
  color: #888;
  transition: all 0.2s;
}
.indicator-dot.active {
  background: #ff4444;
  border-color: #ff8888;
  color: #fff;
  box-shadow: 0 0 12px rgba(255, 68, 68, 0.5);
}

.table-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 1rem;
  padding: 0 0.5rem;
  margin-top: 2.5rem; /* Spazio per l'indicatore */
}
.table-header h2 {
  margin: 0;
  font-size: 1.5rem;
  color: #fff;
}
.piece-count {
  color: #7c9ef5;
  font-size: 1rem;
}

.table-container {
  flex: 1;
  overflow-y: auto;
  border-radius: 12px;
  background: #1a1a2e;
}

.pieces-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 1rem;
}

.pieces-table thead {
  position: sticky;
  top: 0;
  background: #2a2a4a;
  z-index: 2;
}

.pieces-table th {
  padding: 1rem 0.8rem;
  text-align: left;
  color: #aaa;
  font-weight: 600;
  font-size: 0.9rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border-bottom: 2px solid #3a3a6a;
}

.pieces-table td {
  padding: 0.9rem 0.8rem;
  border-bottom: 1px solid #222244;
  vertical-align: middle;
}

.pieces-table tbody tr:last-child td {
  border-bottom: none;
}

.pieces-table tr.player td:first-child {
  border-left: 4px solid #4a7cf5;
}
.pieces-table tr.enemy td:first-child {
  border-left: 4px solid #e54040;
}
.pieces-table tr.furniture td:first-child {
  border-left: 4px solid #b87820;
}

.col-id {
  font-family: monospace;
  color: #888;
  width: 80px;
}
.col-name {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 500;
}
.col-name .piece-emoji {
  font-size: 1.4rem;
  width: 1.8rem;
  text-align: center;
}
.col-pos {
  font-family: monospace;
  color: #7cb8ff;
  width: 120px;
}
.col-dir {
  font-weight: bold;
  color: #ffd700;
  width: 80px;
}

.empty-table {
  text-align: center;
  color: #666;
  padding: 3rem !important;
  font-style: italic;
}

.table-footer {
  margin-top: 1rem;
  display: flex;
  justify-content: center;
}
.btn-back {
  background: #2a2a4a;
  border: 2px solid #3a3a6a;
  border-radius: 12px;
  color: #ccc;
  padding: 0.8rem 2rem;
  font-size: 1rem;
  cursor: pointer;
  transition: background 0.15s;
}
.btn-back:hover {
  background: #3a3a6a;
}
</style>