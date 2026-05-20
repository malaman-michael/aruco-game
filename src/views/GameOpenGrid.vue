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

    <!-- Modalità Tabella Pedine (open map) -->
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

      <!-- CANVAS per la mappa (open map) -->
      <div v-if="homographyReady" class="map-canvas-container" ref="mapContainer">
        <canvas ref="mapCanvas" class="map-canvas"></canvas>
      </div>
      <div v-else class="map-placeholder">
        ⚠️ Calibrazione non pronta – inquadra i quattro angoli
      </div>

      <div class="table-header">
        <h2>📋 Pedine in gioco</h2>
        <span class="piece-count">{{ piecesList.length }} pedine rilevate</span>
      </div>
      <div class="table-container">
        <table class="pieces-table">
          <thead>
            <tr>
              <th scope="col">ID</th>
              <th scope="col">Nome</th>
              <th scope="col">Posizione</th>
              <th scope="col">Orientamento</th>
              <th scope="col">Linea di vista</th>
              <th scope="col">Linea di tiro</th>
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
              <td class="col-los">
                {{ getLosTargets(piece, piecesList).join(', ') || '—' }}
              </td>
              <td class="col-lof">
                {{ getLofTargets(piece, piecesList).join(', ') || '—' }}
              </td>
            </tr>
            <tr v-if="piecesList.length === 0">
              <td colspan="6" class="empty-table">Nessuna pedina visibile</td>
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
import { ref, computed, onMounted, watch, nextTick } from 'vue'
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

// Riferimenti canvas per open map
const mapCanvas = ref(null)
const mapContainer = ref(null)

// Helper per sapere se la calibrazione è pronta
const homographyReady = computed(() => gameStore.homographyReady)

// Lista delle sole pedine (esclusi corner e furniture)
const piecesList = computed(() => {
  return gameStore.pieces.filter(p => 
    p.category !== MARKER_CATEGORIES.CORNER && 
    p.category !== 'furniture'
  )
})

// ---- Funzioni per linea di vista e linea di tiro (basate sulla maschera, senza ostacoli di mappa) ----
function getLosTargets(piece, allPieces) {
  const markerData = markersStore.getMarker(piece.id)
  if (!markerData || !markerData.losMask) return []
  const mask = markerData.losMask
  const cols = gameStore.gridCols
  const rows = gameStore.gridRows
  const centerRow = rows
  const centerCol = cols
  const targets = []
  for (const other of allPieces) {
    if (other.id === piece.id) continue
    const dx = other.col - piece.col
    const dy = other.row - piece.row
    const maskRow = centerRow + dy
    const maskCol = centerCol + dx
    if (maskRow >= 0 && maskRow < mask.length && maskCol >= 0 && maskCol < mask[0].length) {
      if (mask[maskRow][maskCol]) {
        targets.push(other.id)
      }
    }
  }
  return targets
}

function getLofTargets(piece, allPieces) {
  const markerData = markersStore.getMarker(piece.id)
  if (!markerData || !markerData.lofMask) return []
  const mask = markerData.lofMask
  const cols = gameStore.gridCols
  const rows = gameStore.gridRows
  const centerRow = rows
  const centerCol = cols
  const targets = []
  for (const other of allPieces) {
    if (other.id === piece.id) continue
    const dx = other.col - piece.col
    const dy = other.row - piece.row
    const maskRow = centerRow + dy
    const maskCol = centerCol + dx
    if (maskRow >= 0 && maskRow < mask.length && maskCol >= 0 && maskCol < mask[0].length) {
      if (mask[maskRow][maskCol]) {
        targets.push(other.id)
      }
    }
  }
  return targets
}
// --------------------------------------------------

// --- Funzioni di disegno sulla canvas (open map) ---
function gridToPixel(col, row) {
  const corners = gameStore.cornerPositions
  if (!corners || Object.keys(corners).length < 4) return null
  const pNO = corners.NO
  const pNE = corners.NE
  const pSO = corners.SO
  const pSE = corners.SE
  if (!pNO || !pNE || !pSO || !pSE) return null

  const t = col / (gameStore.gridCols - 1)
  const u = row / (gameStore.gridRows - 1)

  // Interpolazione bilineare
  const topX = pNO.x * (1 - t) + pNE.x * t
  const topY = pNO.y * (1 - t) + pNE.y * t
  const bottomX = pSO.x * (1 - t) + pSE.x * t
  const bottomY = pSO.y * (1 - t) + pSE.y * t

  const x = topX * (1 - u) + bottomX * u
  const y = topY * (1 - u) + bottomY * u
  return { x, y }
}

function isPointInsideQuad(px, py, quad) {
  let inside = false
  for (let i = 0, j = quad.length-1; i < quad.length; j = i++) {
    const xi = quad[i].x, yi = quad[i].y
    const xj = quad[j].x, yj = quad[j].y
    const intersect = ((yi > py) != (yj > py)) &&
      (px < (xj - xi) * (py - yi) / (yj - yi) + xi)
    if (intersect) inside = !inside
  }
  return inside
}

function drawDirectionLine(ctx, start, angleDeg, quad, color, lineWidth = 3) {
  const angleRad = angleDeg * Math.PI / 180
  const dirX = Math.cos(angleRad)
  const dirY = Math.sin(angleRad)
  let tMax = 1
  let step = 10
  for (let i = 1; i <= 200; i++) {
    const testX = start.x + dirX * i * step
    const testY = start.y + dirY * i * step
    if (!isPointInsideQuad(testX, testY, quad)) {
      tMax = i * step
      break
    }
  }
  const endX = start.x + dirX * tMax
  const endY = start.y + dirY * tMax
  ctx.beginPath()
  ctx.moveTo(start.x, start.y)
  ctx.lineTo(endX, endY)
  ctx.strokeStyle = color
  ctx.lineWidth = lineWidth
  ctx.stroke()
}

function drawMap() {
  const canvas = mapCanvas.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  // Imposta dimensioni canvas uguali al contenitore
  const container = mapContainer.value
  if (!container) return
  const rect = container.getBoundingClientRect()
  if (rect.width === 0 || rect.height === 0) return
  canvas.width = rect.width
  canvas.height = rect.height
  ctx.clearRect(0, 0, canvas.width, canvas.height)

  const corners = gameStore.cornerPositions
  if (!corners || Object.keys(corners).length < 4) return

  const pNO = corners.NO
  const pNE = corners.NE
  const pSO = corners.SO
  const pSE = corners.SE
  const quad = [pNO, pNE, pSE, pSO]

  // 1. Linee gialle per il perimetro (spessore 3px)
  ctx.beginPath()
  ctx.moveTo(pNO.x, pNO.y)
  ctx.lineTo(pNE.x, pNE.y)
  ctx.lineTo(pSE.x, pSE.y)
  ctx.lineTo(pSO.x, pSO.y)
  ctx.closePath()
  ctx.strokeStyle = '#ffcc00'
  ctx.lineWidth = 3
  ctx.stroke()

  // 2. Trova giocatore e nemici
  const playerPiece = gameStore.pieces.find(p => p.category === 'player')
  const enemyPieces = gameStore.pieces.filter(p => p.category === 'enemy')

  // Disegna linea blu per giocatore
  if (playerPiece && playerPiece.col !== null && playerPiece.row !== null) {
    const start = gridToPixel(playerPiece.col, playerPiece.row)
    if (start) {
      drawDirectionLine(ctx, start, playerPiece.angle, quad, '#3399ff', 3)
    }
  }

  // Disegna linee rosse per nemici
  for (const enemy of enemyPieces) {
    if (enemy.col !== null && enemy.row !== null) {
      const start = gridToPixel(enemy.col, enemy.row)
      if (start) {
        drawDirectionLine(ctx, start, enemy.angle, quad, '#ff4444', 3)
      }
    }
  }

  // 3. Disegna i marker come cerchi colorati
  for (const piece of gameStore.pieces) {
    if (piece.col === null || piece.row === null) continue
    const pos = gridToPixel(piece.col, piece.row)
    if (!pos) continue
    ctx.beginPath()
    ctx.arc(pos.x, pos.y, 8, 0, 2 * Math.PI)
    if (piece.category === 'player') ctx.fillStyle = '#3399ff'
    else if (piece.category === 'enemy') ctx.fillStyle = '#ff4444'
    else ctx.fillStyle = '#ffaa44'
    ctx.fill()
    ctx.fillStyle = 'white'
    ctx.font = 'bold 14px monospace'
    ctx.shadowBlur = 0
    ctx.fillText(piece.id, pos.x - 6, pos.y - 6)
  }
}
// --------------------------------------------------

onMounted(() => {
  gameStore.startGame()
  voice.announceCornerStatus(gameStore.cornersAcquired, gameStore.cornerPositions)
  window.addEventListener('resize', () => {
    if (viewMode.value === 'table' && homographyReady.value) {
      drawMap()
    }
  })
})

// Aggiorna canvas quando cambiano i dati o la vista tabella
watch([() => gameStore.pieces, () => gameStore.cornerPositions, homographyReady, viewMode], () => {
  if (viewMode.value === 'table' && homographyReady.value) {
    nextTick(() => {
      drawMap()
    })
  }
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
</script>

<style scoped>
.game-view { position: fixed; inset: 0; background: #000; display: flex; flex-direction: column; overflow: hidden; }
.viewport { flex: 1; position: relative; overflow: hidden; }
.hud-top { position: absolute; top: env(safe-area-inset-top, 12px); left: 0; right: 0; display: flex; align-items: center; justify-content: space-between; padding: 0.5rem 1rem; z-index: 10; }
.table-hud { position: relative; top: 0; background: #1a1a2e; }
.hud-title { color: #fff; font-weight: 700; font-size: 1.1rem; text-shadow: 0 1px 4px rgba(0,0,0,0.7); }
.hud-actions { display: flex; gap: 0.3rem; }
.icon-btn { background: rgba(0,0,0,0.5); border: none; color: #fff; font-size: 1.1rem; padding: 0.4rem 0.6rem; border-radius: 8px; cursor: pointer; transition: background 0.15s; }
.icon-btn--active { background: rgba(80,180,80,0.7); }
.icon-btn--locked { background: rgba(180,60,60,0.7); }
.status-bar { position: absolute; bottom: 80px; left: 50%; transform: translateX(-50%); z-index: 10; background: rgba(0,0,0,0.6); border-radius: 20px; padding: 0.4rem 1rem; font-size: 0.85rem; white-space: nowrap; }
.status-warning { color: #ffd700; }
.status-calibrating { color: #88ccff; display: flex; align-items: center; gap: 0.6rem; }
.status-ok { color: #7fff7f; display: flex; align-items: center; gap: 0.5rem; }
.corner-dots { display: flex; gap: 0.3rem; }
.corner-dot { font-size: 0.7rem; padding: 0.1rem 0.3rem; border-radius: 4px; background: rgba(255,255,255,0.15); color: #aaa; }
.corner-dot.acquired { background: rgba(100,200,100,0.4); color: #7fff7f; }
.reset-h-btn { background: none; border: 1px solid rgba(127,255,127,0.4); border-radius: 6px; color: #7fff7f; font-size: 0.85rem; padding: 0.1rem 0.4rem; cursor: pointer; line-height: 1; }
.fab { position: absolute; bottom: 24px; right: 20px; z-index: 10; background: #4a7cf5; color: #fff; border: none; border-radius: 50px; padding: 0.6rem 1.2rem; font-size: 1rem; cursor: pointer; box-shadow: 0 4px 12px rgba(0,0,0,0.4); }
.piece-panel { position: absolute; bottom: 0; left: 0; right: 0; z-index: 20; background: #1a1a2e; border-radius: 16px 16px 0 0; padding: 1rem; max-height: 50vh; overflow-y: auto; }
.piece-panel-header { display: flex; justify-content: space-between; color: #eee; font-weight: 600; margin-bottom: 0.8rem; }
.piece-panel-header button { background: none; border: none; color: #aaa; font-size: 1rem; cursor: pointer; }
.piece-list { display: flex; flex-direction: column; gap: 0.5rem; }
.piece-item { display: flex; align-items: center; gap: 0.8rem; background: #2a2a4a; border-radius: 10px; padding: 0.6rem 0.8rem; color: #eee; }
.piece-item.player { border-left: 3px solid #4a7cf5; }
.piece-item.enemy { border-left: 3px solid #e54040; }
.piece-item.furniture { border-left: 3px solid #b87820; }
.piece-emoji { font-size: 1.6rem; }
.piece-item strong { display: block; font-size: 0.95rem; }
.piece-item small { color: #888; font-family: monospace; font-size: 0.8rem; }
.no-pieces { color: #666; text-align: center; padding: 1rem; }
.slide-up-enter-active, .slide-up-leave-active { transition: transform 0.25s ease; }
.slide-up-enter-from, .slide-up-leave-to { transform: translateY(100%); }
.table-view { flex: 1; display: flex; flex-direction: column; background: #0f0f1e; color: #eee; padding: 1rem; overflow: hidden; position: relative; }
.corner-indicator { position: absolute; top: 1rem; left: 1rem; z-index: 5; }
.corner-box { background: rgba(26, 26, 46, 0.9); border-radius: 12px; padding: 0.6rem 1rem; backdrop-filter: blur(4px); border: 1px solid #3a3a6a; }
.corner-label { display: block; font-size: 0.7rem; color: #aaa; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.4rem; }
.corner-dots-indicator { display: flex; gap: 0.5rem; }
.indicator-dot { width: 2.2rem; height: 2.2rem; border-radius: 8px; background: #2a2a4a; border: 2px solid #3a3a6a; display: flex; align-items: center; justify-content: center; font-size: 0.8rem; font-weight: bold; color: #888; transition: all 0.2s; }
.indicator-dot.active { background: #ff4444; border-color: #ff8888; color: #fff; box-shadow: 0 0 12px rgba(255, 68, 68, 0.5); }
.map-canvas-container {
  width: 100%;
  height: 300px;
  margin-bottom: 1rem;
  background: #1e1e2e;
  border-radius: 12px;
  overflow: hidden;
  position: relative;
  border: 1px solid #3a3a6a;
}
.map-canvas {
  width: 100%;
  height: 100%;
  display: block;
}
.map-placeholder {
  background: #1a1a2e;
  border-radius: 12px;
  padding: 1.5rem;
  text-align: center;
  color: #aaa;
  margin-bottom: 1rem;
  border: 1px solid #3a3a6a;
}
.table-header { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 1rem; padding: 0 0.5rem; margin-top: 2.5rem; }
.table-header h2 { margin: 0; font-size: 1.5rem; color: #fff; }
.piece-count { color: #7c9ef5; font-size: 1rem; }
.table-container { flex: 1; overflow-y: auto; border-radius: 12px; background: #1a1a2e; }
.pieces-table { width: 100%; border-collapse: collapse; font-size: 1rem; }
.pieces-table thead { position: sticky; top: 0; background: #2a2a4a; z-index: 2; }
.pieces-table th { padding: 1rem 0.8rem; text-align: left; color: #aaa; font-weight: 600; font-size: 0.9rem; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 2px solid #3a3a6a; }
.pieces-table td { padding: 0.9rem 0.8rem; border-bottom: 1px solid #222244; vertical-align: middle; }
.pieces-table tbody tr:last-child td { border-bottom: none; }
.pieces-table tr.player td:first-child { border-left: 4px solid #4a7cf5; }
.pieces-table tr.enemy td:first-child { border-left: 4px solid #e54040; }
.pieces-table tr.furniture td:first-child { border-left: 4px solid #b87820; }
.col-id { font-family: monospace; color: #888; width: 80px; }
.col-name { display: flex; align-items: center; gap: 0.5rem; font-weight: 500; }
.col-name .piece-emoji { font-size: 1.4rem; width: 1.8rem; text-align: center; }
.col-pos { font-family: monospace; color: #7cb8ff; width: 120px; }
.col-dir { font-weight: bold; color: #ffd700; width: 80px; }
.col-los, .col-lof { min-width: 100px; font-family: monospace; color: #7fff7f; }
.empty-table { text-align: center; color: #666; padding: 3rem !important; font-style: italic; }
.table-footer { margin-top: 1rem; display: flex; justify-content: center; }
.btn-back { background: #2a2a4a; border: 2px solid #3a3a6a; border-radius: 12px; color: #ccc; padding: 0.8rem 2rem; font-size: 1rem; cursor: pointer; transition: background 0.15s; }
.btn-back:hover { background: #3a3a6a; }
@media (max-width: 768px) { .table-header { flex-direction: column; align-items: flex-start; gap: 0.5rem; margin-top: 4rem; } .pieces-table { min-width: 500px; } .indicator-dot { width: 2rem; height: 2rem; font-size: 0.7rem; } }
@media (min-width: 768px) { .table-container { overflow-x: visible; } .pieces-table { min-width: auto; } .table-header { flex-direction: row; justify-content: space-between; margin-top: 2.5rem; } .hud-top { padding: 0.5rem 1.5rem; } }
</style>