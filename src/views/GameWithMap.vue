<template>
  <div class="game-view">
    <!-- CameraView sempre attivo, visibile solo quando viewMode === 'camera' -->
    <div v-show="viewMode === 'camera'" class="viewport" ref="viewportEl">
      <CameraView
        ref="cameraViewRef"
        :active="isActive"
        @unknown-marker="onUnknownMarker"
        @frame-processed="onFrameProcessed"
        @homography-updated="onHomographyUpdated"
      />
      <!-- Canvas overlay mappa -->
      <canvas
        v-if="selectedMapId && showMapOverlay"
        ref="overlayCanvas"
        class="map-canvas-overlay"
      ></canvas>
    </div>

    <!-- Modalità Tabella Pedine (con due sezioni) -->
    <div v-show="viewMode === 'table'" class="table-view">
      <!-- Indicatore angoli visibili -->
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

      <!-- Sezione 1: Pedine dinamiche (marker) -->
      <div class="table-header">
        <h2>🎲 Pedine in gioco</h2>
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

      <!-- Sezione 2: Contenuto statico della mappa (se selezionata) -->
      <div class="table-header" style="margin-top: 2rem;">
        <h2>🗺️ Contenuto mappa: {{ selectedMapName }}</h2>
        <span class="piece-count">{{ staticCellsList.length }} celle occupate</span>
      </div>
      <div class="table-container">
        <table v-if="selectedMapId && currentStaticMap" class="pieces-table">
          <thead>
            <tr>
              <th>Colonna</th>
              <th>Riga</th>
              <th>Tipo</th>
              <th>Dettaglio</th>
              <th>Emoji</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="cell in staticCellsList" :key="`${cell.col}-${cell.row}`">
              <td class="col-pos">{{ cell.col }}</td>
              <td class="col-pos">{{ cell.row }}</td>
              <td>{{ cell.typeLabel }}</td>
              <td>{{ cell.detailLabel || '—' }}</td>
              <td class="col-name"><span class="piece-emoji">{{ cell.emoji }}</span></td>
            </tr>
            <tr v-if="staticCellsList.length === 0 && selectedMapId">
              <td colspan="5" class="empty-table">La mappa è completamente vuota</td>
            </tr>
            <tr v-if="!selectedMapId">
              <td colspan="5" class="empty-table">
                Nessuna mappa selezionata. Torna alla videocamera e scegli una mappa dal pulsante 🗺️.
              </td>
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
        <button class="icon-btn map-picker-btn" @click="showMapPicker = true" title="Seleziona mappa overlay">🗺️</button>
        <button
          class="icon-btn"
          :class="{ 'icon-btn--active': voiceEnabled }"
          @click="toggleVoice"
        >🔊</button>
        <button
          class="icon-btn"
          :class="{ 'icon-btn--locked': !gameStore.allowNewMarkers }"
          @click="gameStore.toggleNewMarkers(); announceMarkerMode()"
        >{{ gameStore.allowNewMarkers ? '🔓' : '🔒' }}</button>
        <button class="icon-btn" @click="showSettings = true">⚙️</button>
        <button class="icon-btn" @click="viewMode = 'table'">📋</button>
      </div>
    </div>

    <!-- HUD minimale per modalità tabella -->
    <div v-else class="hud-top table-hud">
      <button class="icon-btn" @click="$router.push('/')">✕</button>
      <span class="hud-title">Tabella Pedine</span>
      <div class="hud-actions">
        <button class="icon-btn" @click="viewMode = 'camera'">🎥</button>
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

    <!-- Bottom sheet per selezione mappa -->
    <div v-if="showMapPicker" class="modal-overlay" @click.self="showMapPicker = false">
      <div class="modal-sheet">
        <div class="modal-header">
          <span>Scegli una mappa</span>
          <button @click="showMapPicker = false">✕</button>
        </div>
        <div class="modal-list">
          <button
            v-for="map in mapStore.maps"
            :key="map.id"
            class="map-option"
            :class="{ active: selectedMapId === map.id }"
            @click="selectMap(map.id)"
          >
            <span class="map-emoji">🗺️</span>
            <div class="map-details">
              <strong>{{ map.name }}</strong>
              <small>{{ map.cols }}×{{ map.rows }}</small>
            </div>
          </button>
          <button
            class="map-option"
            :class="{ active: selectedMapId === null }"
            @click="selectMap(null)"
          >
            <span class="map-emoji">❌</span>
            <div class="map-details">
              <strong>Nessuna mappa</strong>
              <small>disabilita overlay</small>
            </div>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import CameraView from '../components/CameraView.vue'
import MarkerSetupDialog from '../components/MarkerSetupDialog.vue'
import CameraSettingsPanel from '../components/CameraSettingsPanel.vue'
import { useMarkersStore, CORNER_ROLES, MARKER_CATEGORIES } from '../stores/markersStore.js'
import { useGameStore } from '../stores/gameStore.js'
import { useMapStore, CELL_TYPES, CELL_TYPE_INFO } from '../stores/mapStore.js'
import { voice } from '../services/voiceService.js'

const markersStore = useMarkersStore()
const gameStore    = useGameStore()
const mapStore     = useMapStore()

// Stato esistente
const isActive        = ref(true)
const showSettings    = ref(false)
const showPieceList   = ref(false)
const dialogVisible   = ref(false)
const unknownMarker   = ref(null)
const voiceEnabled    = ref(false)
const cameraViewRef   = ref(null)
const viewMode        = ref('camera')
const visibleCornersSet = ref(new Set())

// Stato overlay mappa
const overlayCanvas   = ref(null)
const selectedMapId   = ref(null)
const showMapOverlay  = ref(true)
const showMapPicker   = ref(false)

let animationFrameId  = null
let resizeObserver    = null

// Computed per la tabella statica
const selectedMapName = computed(() => {
  if (!selectedMapId.value) return 'nessuna'
  return mapStore.maps.find(m => m.id === selectedMapId.value)?.name || 'sconosciuta'
})
const currentStaticMap = computed(() => mapStore.maps.find(m => m.id === selectedMapId.value))
const staticCellsList = computed(() => {
  const map = currentStaticMap.value
  if (!map) return []
  const cells = []
  for (let row = 0; row < map.rows; row++) {
    for (let col = 0; col < map.cols; col++) {
      const cell = map.grid[row][col]
      const type = cell.type
      if (type !== CELL_TYPES.EMPTY) {
        const info = CELL_TYPE_INFO[type]
        let detailLabel = ''
        let emoji = info?.emoji || '⬜'
        if (cell.details) {
          detailLabel = cell.details.label || cell.details.typeId || ''
          if (cell.details.emoji) emoji = cell.details.emoji
        }
        cells.push({
          col, row,
          typeLabel: info?.label || type,
          detailLabel,
          emoji
        })
      }
    }
  }
  return cells
})

// Helper: inversa matrice (per proiezione mappa)
function invertHomography(H) {
  const [a, b, c, d, e, f, g, h, i] = H
  const det = a*(e*i - f*h) - b*(d*i - f*g) + c*(d*h - e*g)
  if (Math.abs(det) < 1e-8) return null
  const invDet = 1 / det
  return [
    (e*i - f*h) * invDet,
    (c*h - b*i) * invDet,
    (b*f - c*e) * invDet,
    (f*g - d*i) * invDet,
    (a*i - c*g) * invDet,
    (c*d - a*f) * invDet,
    (d*h - e*g) * invDet,
    (b*g - a*h) * invDet,
    (a*e - b*d) * invDet
  ]
}

function projectWorldToPixel(x, y, invH) {
  const denom = invH[6] * x + invH[7] * y + invH[8]
  const u = (invH[0] * x + invH[1] * y + invH[2]) / denom
  const v = (invH[3] * x + invH[4] * y + invH[5]) / denom
  return { u, v }
}

function updateCanvasSize() {
  const canvas = overlayCanvas.value
  if (!canvas) return
  const videoEl = cameraViewRef.value?.$el?.querySelector('video')
  if (videoEl && videoEl.videoWidth) {
    canvas.width = videoEl.videoWidth
    canvas.height = videoEl.videoHeight
    canvas.style.width = `${videoEl.clientWidth}px`
    canvas.style.height = `${videoEl.clientHeight}px`
  } else {
    const viewport = document.querySelector('.viewport')
    if (viewport) {
      canvas.width = viewport.clientWidth
      canvas.height = viewport.clientHeight
    }
  }
}

function drawMapOverlay() {
  const canvas = overlayCanvas.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  ctx.clearRect(0, 0, canvas.width, canvas.height)

  const map = mapStore.maps.find(m => m.id === selectedMapId.value)
  const homography = gameStore.homography
  const gridCols = gameStore.gridCols
  const gridRows = gameStore.gridRows

  if (!map || !homography || !gameStore.homographyReady) return
  if (map.cols !== gridCols || map.rows !== gridRows) {
    gameStore.setGridSize(map.cols, map.rows)
    requestRedraw()
    return
  }

  const invH = invertHomography(homography)
  if (!invH) return

  const stepX = 1 / gridCols
  const stepY = 1 / gridRows
  const grid = map.grid

  for (let row = 0; row < gridRows; row++) {
    for (let col = 0; col < gridCols; col++) {
      const cell = grid[row][col]
      const type = cell.type
      const info = CELL_TYPE_INFO[type] || CELL_TYPE_INFO.empty
      const emoji = cell.details?.emoji || info.emoji
      const bgColor = info.color || '#2a2a4a'

      const x0 = col * stepX
      const y0 = row * stepY
      const x1 = x0 + stepX
      const y1 = y0 + stepY

      const p0 = projectWorldToPixel(x0, y0, invH)
      const p1 = projectWorldToPixel(x1, y0, invH)
      const p2 = projectWorldToPixel(x1, y1, invH)
      const p3 = projectWorldToPixel(x0, y1, invH)

      const centerX = x0 + stepX/2
      const centerY = y0 + stepY/2
      const pCenter = projectWorldToPixel(centerX, centerY, invH)

      ctx.beginPath()
      ctx.moveTo(p0.u, p0.v)
      ctx.lineTo(p1.u, p1.v)
      ctx.lineTo(p2.u, p2.v)
      ctx.lineTo(p3.u, p3.v)
      ctx.closePath()
      ctx.fillStyle = bgColor
      ctx.fill()
      ctx.strokeStyle = '#3a3a6a'
      ctx.lineWidth = 1
      ctx.stroke()

      const widthCell = Math.hypot(p1.u - p0.u, p1.v - p0.v)
      const fontSize = Math.min(32, Math.max(12, widthCell * 0.6))
      ctx.font = `${fontSize}px "Segoe UI Emoji", "Apple Color Emoji", sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillStyle = '#ffffff'
      ctx.fillText(emoji, pCenter.u, pCenter.v)
    }
  }
}

function requestRedraw() {
  if (!selectedMapId.value || !showMapOverlay.value) {
    const canvas = overlayCanvas.value
    if (canvas) {
      const ctx = canvas.getContext('2d')
      ctx?.clearRect(0, 0, canvas.width, canvas.height)
    }
    return
  }
  if (animationFrameId) cancelAnimationFrame(animationFrameId)
  animationFrameId = requestAnimationFrame(() => {
    updateCanvasSize()
    drawMapOverlay()
    animationFrameId = null
  })
}

function selectMap(mapId) {
  selectedMapId.value = mapId
  showMapPicker.value = false
  if (mapId) {
    const map = mapStore.maps.find(m => m.id === mapId)
    if (map) {
      gameStore.setGridSize(map.cols, map.rows)
      voice.say(`Mappa ${map.name} attivata (${map.cols}×${map.rows})`, 'map_selected', 1)
    } else {
      voice.say('Mappa non trovata', 'map_error', 1)
      selectedMapId.value = null
    }
  } else {
    voice.say('Overlay mappa disattivato', 'map_disabled', 1)
  }
  requestRedraw()
}

function onHomographyUpdated() {
  requestRedraw()
}

// Funzioni per il controllo vocale e marker
const piecesList = computed(() => gameStore.pieces.filter(p => p.category !== MARKER_CATEGORIES.CORNER))

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

function onFrameProcessed(payload) {
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

// Watcher
watch(() => gameStore.homography, () => {
  if (gameStore.homographyReady) requestRedraw()
}, { deep: true })
watch(selectedMapId, () => requestRedraw())
watch(() => mapStore.maps, () => requestRedraw(), { deep: true })
watch(() => [gameStore.gridCols, gameStore.gridRows], () => requestRedraw())

onMounted(() => {
  updateCanvasSize()
  const viewport = document.querySelector('.viewport')
  if (viewport && window.ResizeObserver) {
    resizeObserver = new ResizeObserver(() => {
      updateCanvasSize()
      requestRedraw()
    })
    resizeObserver.observe(viewport)
  }
  window.addEventListener('resize', () => {
    updateCanvasSize()
    requestRedraw()
  })
})

onUnmounted(() => {
  if (animationFrameId) cancelAnimationFrame(animationFrameId)
  if (resizeObserver) resizeObserver.disconnect()
  window.removeEventListener('resize', updateCanvasSize)
})
</script>

<style scoped>
/* ===== STILI ORIGINALI (RIPRISTINATI) ===== */
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
.status-calibrating { color: #88ccff; display: flex; align-items: center; gap: 0.6rem; }
.status-ok { color: #7fff7f; display: flex; align-items: center; gap: 0.5rem; }

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
.piece-item small { color: #888; font-family: monospace; font-size: 0.8rem; }
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
  margin-top: 2.5rem;
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
}

/* Responsive */
@media (max-width: 768px) {
  .table-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
    margin-top: 4rem;
  }
  .pieces-table {
    min-width: 500px;
  }
  .indicator-dot {
    width: 2rem;
    height: 2rem;
    font-size: 0.7rem;
  }
}

/* AGGIUNTE PER OVERLAY MAPPA */
.viewport {
  position: relative;
}
.map-canvas-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 5;
}
.map-picker-btn {
  background: rgba(0,0,0,0.6);
  font-size: 1.2rem;
}

/* Bottom sheet per selezione mappa */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0,0,0,0.6);
  z-index: 1000;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}
.modal-sheet {
  background: #1a1a2e;
  border-radius: 20px 20px 0 0;
  width: 100%;
  max-width: 500px;
  max-height: 70vh;
  display: flex;
  flex-direction: column;
  animation: slideUp 0.2s ease;
}
@keyframes slideUp {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}
.modal-header {
  display: flex;
  justify-content: space-between;
  padding: 1rem;
  border-bottom: 1px solid #3a3a6a;
  font-weight: bold;
  color: #eee;
}
.modal-header button {
  background: none;
  border: none;
  color: #aaa;
  font-size: 1.2rem;
  cursor: pointer;
}
.modal-list {
  overflow-y: auto;
  padding: 0.5rem;
}
.map-option {
  display: flex;
  align-items: center;
  gap: 1rem;
  width: 100%;
  background: #2a2a4a;
  border: 1px solid #3a3a6a;
  border-radius: 12px;
  padding: 0.8rem;
  margin-bottom: 0.5rem;
  cursor: pointer;
  text-align: left;
  color: #eee;
  transition: all 0.1s;
}
.map-option.active {
  border-color: #4a7cf5;
  background: #2a2a5a;
}
.map-emoji {
  font-size: 1.8rem;
}
.map-details strong {
  display: block;
  font-size: 1rem;
}
.map-details small {
  color: #aaa;
  font-size: 0.75rem;
}
</style>