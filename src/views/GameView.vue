<template>
  <div class="game-view">
    <div class="viewport" ref="viewportEl">
      <CameraView
        ref="cameraViewRef"
        :active="isActive"
        @unknown-marker="onUnknownMarker"
        @frame-processed="onFrameProcessed"
      />
    </div>

    <!-- HUD superiore -->
    <div class="hud-top">
      <button class="icon-btn" @click="$router.push('/')">✕</button>
      <span class="hud-title">ArUco Game</span>
      <div class="hud-actions">
        <!-- Assistente vocale ON/OFF -->
        <button
          class="icon-btn"
          :class="{ 'icon-btn--active': voiceEnabled }"
          :title="voiceEnabled ? 'Disattiva voce' : 'Attiva voce'"
          @click="toggleVoice"
        >🔊</button>

        <!-- Lock aggiunta pedine -->
        <button
          class="icon-btn"
          :class="{ 'icon-btn--locked': !gameStore.allowNewMarkers }"
          :title="gameStore.allowNewMarkers ? 'Blocca aggiunta pedine' : 'Sblocca aggiunta pedine'"
          @click="gameStore.toggleNewMarkers(); announceMarkerMode()"
        >{{ gameStore.allowNewMarkers ? '🔓' : '🔒' }}</button>

        <button class="icon-btn" @click="showSettings = true" title="Impostazioni">⚙️</button>
      </div>
    </div>

    <!-- Status bar -->
    <div class="status-bar">
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
      @calibrate="showSettings = false; showCalibration = true"
    />

    <!-- Modal taratura automatica -->
    <CalibrationModal
      :visible="showCalibration"
      :get-frame="getCalibrationFrame"
      @close="showCalibration = false"
      @applied="showCalibration = false"
    />

    <!-- Pannello lista pedine -->
    <transition name="slide-up">
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

    <!-- FAB pedine -->
    <button class="fab" @click="showPieceList = !showPieceList">
      🎲 {{ gameStore.pieces.length }}
    </button>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import CameraView from '../components/CameraView.vue'
import MarkerSetupDialog from '../components/MarkerSetupDialog.vue'
import CameraSettingsPanel from '../components/CameraSettingsPanel.vue'
import CalibrationModal from '../components/CalibrationModal.vue'
import { useMarkersStore, CORNER_ROLES } from '../stores/markersStore.js'
import { useGameStore } from '../stores/gameStore.js'
import { voice } from '../services/voiceService.js'

const markersStore = useMarkersStore()
const gameStore    = useGameStore()

const isActive        = ref(true)
const showSettings    = ref(false)
const showCalibration = ref(false)
const showPieceList   = ref(false)
const dialogVisible   = ref(false)
const unknownMarker   = ref(null)
const voiceEnabled    = ref(false)
const cameraViewRef   = ref(null)

onMounted(() => {
  gameStore.startGame()
  // Annuncio vocale iniziale sullo stato angoli (se voce attiva)
  voice.announceCornerStatus(gameStore.cornersAcquired, gameStore.cornerPositions)
})

const missingCorners = computed(() => CORNER_ROLES.filter(r => !markersStore.corners[r]))

function toggleVoice() {
  voice.toggle()
  voiceEnabled.value = voice.enabled
  if (voice.enabled) {
    voice.say('Assistente vocale attivato.', 'voice_on', 2)
    // Annuncia subito lo stato corrente
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

function onFrameProcessed() {}

function getCalibrationFrame() {
  return cameraViewRef.value?.getCalibrationData?.() ?? { imageData: null, detector: null }
}
</script>

<style scoped>
.game-view { position: fixed; inset: 0; background: #000; display: flex; flex-direction: column; overflow: hidden; }
.viewport  { flex: 1; position: relative; overflow: hidden; }

.hud-top {
  position: absolute; top: env(safe-area-inset-top, 12px); left: 0; right: 0;
  display: flex; align-items: center; justify-content: space-between;
  padding: 0.5rem 1rem; z-index: 10;
}
.hud-title { color: #fff; font-weight: 700; font-size: 1.1rem; text-shadow: 0 1px 4px rgba(0,0,0,0.7); }
.hud-actions { display: flex; gap: 0.3rem; }
.icon-btn {
  background: rgba(0,0,0,0.5); border: none; color: #fff;
  font-size: 1.1rem; padding: 0.4rem 0.6rem; border-radius: 8px; cursor: pointer;
  transition: background 0.15s;
}
.icon-btn--active { background: rgba(80,180,80,0.7); }
.icon-btn--locked { background: rgba(180,60,60,0.7); }

.status-bar {
  position: absolute; bottom: 80px; left: 50%; transform: translateX(-50%);
  z-index: 10; background: rgba(0,0,0,0.6); border-radius: 20px;
  padding: 0.4rem 1rem; font-size: 0.85rem; white-space: nowrap;
}
.status-warning    { color: #ffd700; }
.status-calibrating { color: #88ccff; display: flex; align-items: center; gap: 0.6rem; }
.status-ok         { color: #7fff7f; display: flex; align-items: center; gap: 0.5rem; }

.corner-dots { display: flex; gap: 0.3rem; }
.corner-dot {
  font-size: 0.7rem; padding: 0.1rem 0.3rem; border-radius: 4px;
  background: rgba(255,255,255,0.15); color: #aaa;
}
.corner-dot.acquired { background: rgba(100,200,100,0.4); color: #7fff7f; }
.reset-h-btn {
  background: none; border: 1px solid rgba(127,255,127,0.4); border-radius: 6px;
  color: #7fff7f; font-size: 0.85rem; padding: 0.1rem 0.4rem; cursor: pointer;
  line-height: 1;
}

.fab {
  position: absolute; bottom: 24px; right: 20px; z-index: 10;
  background: #4a7cf5; color: #fff; border: none; border-radius: 50px;
  padding: 0.6rem 1.2rem; font-size: 1rem; cursor: pointer;
  box-shadow: 0 4px 12px rgba(0,0,0,0.4);
}

.piece-panel {
  position: absolute; bottom: 0; left: 0; right: 0; z-index: 20;
  background: #1a1a2e; border-radius: 16px 16px 0 0;
  padding: 1rem; max-height: 50vh; overflow-y: auto;
}
.piece-panel-header {
  display: flex; justify-content: space-between; color: #eee;
  font-weight: 600; margin-bottom: 0.8rem;
}
.piece-panel-header button { background: none; border: none; color: #aaa; font-size: 1rem; cursor: pointer; }
.piece-list { display: flex; flex-direction: column; gap: 0.5rem; }
.piece-item {
  display: flex; align-items: center; gap: 0.8rem;
  background: #2a2a4a; border-radius: 10px; padding: 0.6rem 0.8rem; color: #eee;
}
.piece-item.player   { border-left: 3px solid #4a7cf5; }
.piece-item.enemy    { border-left: 3px solid #e54040; }
.piece-item.furniture { border-left: 3px solid #b87820; }
.piece-emoji { font-size: 1.6rem; }
.piece-item strong { display: block; font-size: 0.95rem; }
.piece-item small  { color: #888; font-family: monospace; font-size: 0.8rem; }
.no-pieces { color: #666; text-align: center; padding: 1rem; }

.slide-up-enter-active, .slide-up-leave-active { transition: transform 0.25s ease; }
.slide-up-enter-from, .slide-up-leave-to { transform: translateY(100%); }
</style>