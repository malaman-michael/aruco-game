<template>
  <div class="game-view">
    <!-- Camera feed con overlay AR -->
    <div class="viewport" ref="viewportEl">
      <CameraView
        :show-debug="showDebug"
        :active="isActive"
        @unknown-marker="onUnknownMarker"
        @frame-processed="onFrameProcessed"
      />
      <GameOverlay
        :video-w="videoW"
        :video-h="videoH"
        :homography="currentHomography"
        :show-coords="showCoords"
        :markers="lastMarkers"
      />
    </div>

    <!-- HUD superiore -->
    <div class="hud-top">
      <button class="icon-btn" @click="$router.push('/')">✕</button>
      <span class="hud-title">ArUco Game</span>
      <button class="icon-btn" @click="toggleDebug">{{ showDebug ? '🔍' : '👁️' }}</button>
    </div>

    <!-- Status bar -->
    <div class="status-bar">
      <span v-if="!markersStore.allCornersAssigned" class="status-warning">
        ⚠️ Corner mancanti: {{ missingCorners.join(', ') }}
      </span>
      <span v-else class="status-ok">
        ✓ Griglia {{ gameStore.gridCols }}×{{ gameStore.gridRows }} · {{ gameStore.pieces.length }} pedine
      </span>
    </div>

    <!-- Dialog configurazione marker sconosciuto -->
    <MarkerSetupDialog
      :visible="dialogVisible"
      :marker="unknownMarker"
      @confirmed="onMarkerConfirmed"
      @cancelled="dialogVisible = false"
    />

    <!-- Pannello laterale: lista pedine -->
    <transition name="slide-up">
      <div v-if="showPieceList" class="piece-panel">
        <div class="piece-panel-header">
          <span>Pedine sul campo</span>
          <button @click="showPieceList = false">✕</button>
        </div>
        <div class="piece-list">
          <div
            v-for="p in gameStore.pieces"
            :key="p.id"
            class="piece-item"
            :class="p.category"
          >
            <span class="piece-emoji">{{ p.emoji }}</span>
            <div>
              <strong>{{ p.label }}</strong>
              <small>#{{ p.id }} · {{ p.col !== null ? `(${p.col}, ${p.row})` : '–' }}</small>
            </div>
          </div>
          <p v-if="!gameStore.pieces.length" class="no-pieces">Nessuna pedina visibile</p>
        </div>
      </div>
    </transition>

    <!-- Bottone lista pedine -->
    <button class="fab" @click="showPieceList = !showPieceList">
      🎲 {{ gameStore.pieces.length }}
    </button>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import CameraView from '../components/CameraView.vue'
import GameOverlay from '../components/GameOverlay.vue'
import MarkerSetupDialog from '../components/MarkerSetupDialog.vue'
import { useMarkersStore, CORNER_ROLES } from '../stores/markersStore.js'
import { useGameStore } from '../stores/gameStore.js'

const markersStore = useMarkersStore()
const gameStore = useGameStore()

const isActive = ref(true)
const showDebug = ref(false)
const showCoords = ref(true)
const showPieceList = ref(false)

// Dialog marker sconosciuto
const dialogVisible = ref(false)
const unknownMarker = ref(null)
const pendingUnknownQueue = ref([])

// Stato del frame corrente
const currentHomography = ref(null)
const lastMarkers = ref([])
const videoW = ref(1280)
const videoH = ref(720)
const viewportEl = ref(null)

onMounted(() => {
  gameStore.startGame()
})

const missingCorners = computed(() =>
  CORNER_ROLES.filter(r => !markersStore.corners[r])
)

function toggleDebug() {
  showDebug.value = !showDebug.value
}

/** Ricevuto quando la camera rileva un marker mai configurato */
function onUnknownMarker(marker) {
  // Evita di mostrare il dialog se già aperto o se il marker
  // è già in coda (stesso id)
  if (dialogVisible.value) return
  if (pendingUnknownQueue.value.find(m => m.id === marker.id)) return
  if (markersStore.isKnown(marker.id)) return

  unknownMarker.value = marker
  dialogVisible.value = true
}

function onMarkerConfirmed(data) {
  dialogVisible.value = false
  unknownMarker.value = null
}

/** Aggiorna stato ad ogni frame processato */
function onFrameProcessed({ markers, pieces, homography }) {
  lastMarkers.value = markers
  currentHomography.value = homography

  // Leggi dimensioni reali del video
  if (viewportEl.value) {
    const vEl = viewportEl.value.querySelector('video')
    if (vEl && vEl.videoWidth) {
      videoW.value = vEl.videoWidth
      videoH.value = vEl.videoHeight
    }
  }
}
</script>

<style scoped>
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

.hud-top {
  position: absolute;
  top: env(safe-area-inset-top, 12px);
  left: 0; right: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem 1rem;
  z-index: 10;
}

.hud-title {
  color: #fff;
  font-weight: 700;
  font-size: 1.1rem;
  text-shadow: 0 1px 4px rgba(0,0,0,0.7);
}

.icon-btn {
  background: rgba(0,0,0,0.5);
  border: none;
  color: #fff;
  font-size: 1.1rem;
  padding: 0.4rem 0.6rem;
  border-radius: 8px;
  cursor: pointer;
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
.status-ok { color: #7fff7f; }

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
  bottom: 0; left: 0; right: 0;
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
  background: none; border: none; color: #aaa; font-size: 1rem; cursor: pointer;
}

.piece-list { display: flex; flex-direction: column; gap: 0.5rem; }

.piece-item {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  background: #2a2a4a;
  border-radius: 10px;
  padding: 0.6rem 0.8rem;
  color: #eee;
}
.piece-item.player  { border-left: 3px solid #4a7cf5; }
.piece-item.enemy   { border-left: 3px solid #e54040; }
.piece-item.furniture { border-left: 3px solid #b87820; }

.piece-emoji { font-size: 1.6rem; }
.piece-item strong { display: block; font-size: 0.95rem; }
.piece-item small  { color: #888; font-family: monospace; font-size: 0.8rem; }

.no-pieces { color: #666; text-align: center; padding: 1rem; }

.slide-up-enter-active, .slide-up-leave-active {
  transition: transform 0.25s ease;
}
.slide-up-enter-from, .slide-up-leave-to {
  transform: translateY(100%);
}
</style>