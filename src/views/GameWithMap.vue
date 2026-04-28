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

    <!-- Modalità Tabella Pedine (con tre sezioni) -->
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
              :aria-label="`Angolo ${role} ${visibleCornersSet.has(role) ? 'visibile' : 'non visibile'}`"
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
        <table class="pieces-table" aria-label="Tabella delle pedine attualmente rilevate">
          <thead>
            <tr>
              <th scope="col">ID</th>
              <th scope="col">Nome</th>
              <th scope="col">Posizione</th>
              <th scope="col">Orientamento</th>
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

      <!-- Sezione 2: Contenuto statico della mappa (lista) -->
      <div class="table-header" style="margin-top: 2rem;">
        <h2>🗺️ Contenuto mappa: {{ selectedMapName }}</h2>
        <span class="piece-count">{{ staticCellsList.length }} celle occupate</span>
      </div>
      <div class="table-container">
        <table v-if="selectedMapId && currentStaticMap" class="pieces-table" aria-label="Elenco degli elementi statici della mappa">
          <thead>
            <tr>
              <th scope="col">Colonna</th>
              <th scope="col">Riga</th>
              <th scope="col">Tipo</th>
              <th scope="col">Dettaglio</th>
              <th scope="col">Emoji</th>
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

      <!-- Sezione 3: Visualizzazione a griglia della mappa (con assi X e Y) -->
      <div v-if="currentStaticMap" class="table-header" style="margin-top: 2rem;">
        <h2>🗺️ Mappa (griglia {{ currentStaticMap.cols }}×{{ currentStaticMap.rows }})</h2>
        <span class="piece-count">{{ currentStaticMap.cols * currentStaticMap.rows }} celle totali</span>
      </div>
      <div v-if="currentStaticMap" class="grid-table-container">
        <table class="grid-map-table" :aria-label="`Griglia della mappa ${currentStaticMap.name}, ${currentStaticMap.cols} colonne per ${currentStaticMap.rows} righe`">
          <thead>
            <tr>
              <th scope="col" aria-label="Intestazione riga"></th>
              <th v-for="col in currentStaticMap.cols" :key="'col-' + col" scope="col" class="grid-col-header">
                {{ String.fromCharCode(64 + col) }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in currentStaticMap.rows" :key="'row-' + row">
              <th scope="row" class="grid-row-header">{{ row + 1 }}</th>
              <td
                v-for="col in currentStaticMap.cols"
                :key="`${row}-${col}`"
                class="grid-cell"
                :class="{
                  'grid-cell-wall': currentStaticMap.grid[row]?.[col-1]?.type === 'wall',
                  'grid-cell-player': currentStaticMap.grid[row]?.[col-1]?.type === 'player',
                  'grid-cell-enemy': currentStaticMap.grid[row]?.[col-1]?.type === 'enemy',
                  'grid-cell-furniture': currentStaticMap.grid[row]?.[col-1]?.type === 'furniture'
                }"
                :aria-label="`Cella ${String.fromCharCode(64 + col)}${row + 1}: ${getCellDisplay(currentStaticMap.grid[row]?.[col-1])}`"
              >
                <span class="grid-emoji">{{ getCellEmoji(currentStaticMap.grid[row]?.[col-1]) }}</span>
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
      <button class="icon-btn" @click="$router.push('/')" aria-label="Esci">✕</button>
      <span class="hud-title">ArUco Game</span>
      <div class="hud-actions">
        <button class="icon-btn map-picker-btn" @click="showMapPicker = true" title="Seleziona mappa overlay" aria-label="Seleziona mappa overlay">🗺️</button>
        <button
          class="icon-btn"
          :class="{ 'icon-btn--active': voiceEnabled }"
          @click="toggleVoice"
          :aria-label="voiceEnabled ? 'Disattiva voce' : 'Attiva voce'"
        >🔊</button>
        <button
          class="icon-btn"
          :class="{ 'icon-btn--locked': !gameStore.allowNewMarkers }"
          @click="gameStore.toggleNewMarkers(); announceMarkerMode()"
          :aria-label="gameStore.allowNewMarkers ? 'Blocca aggiunta pedine' : 'Sblocca aggiunta pedine'"
        >{{ gameStore.allowNewMarkers ? '🔓' : '🔒' }}</button>
        <button class="icon-btn" @click="showSettings = true" aria-label="Impostazioni">⚙️</button>
        <button class="icon-btn" @click="viewMode = 'table'" aria-label="Visualizza tabella pedine">📋</button>
      </div>
    </div>

    <!-- HUD minimale per modalità tabella -->
    <div v-else class="hud-top table-hud">
      <button class="icon-btn" @click="$router.push('/')" aria-label="Esci">✕</button>
      <span class="hud-title">Tabella Pedine</span>
      <div class="hud-actions">
        <button class="icon-btn" @click="viewMode = 'camera'" aria-label="Torna alla fotocamera">🎥</button>
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
        <button class="reset-h-btn" @click="onResetHomography" title="Ricalibra griglia" aria-label="Ricalibra griglia">↺</button>
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
          <button @click="showPieceList = false" aria-label="Chiudi">✕</button>
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
    <button v-if="viewMode === 'camera'" class="fab" @click="showPieceList = !showPieceList" aria-label="Mostra/nascondi elenco pedine">
      🎲 {{ gameStore.pieces.length }}
    </button>

    <!-- Bottom sheet per selezione mappa -->
    <div v-if="showMapPicker" class="modal-overlay" @click.self="showMapPicker = false">
      <div class="modal-sheet" role="dialog" aria-modal="true" aria-label="Selezione mappa">
        <div class="modal-header">
          <span>Scegli una mappa</span>
          <button @click="showMapPicker = false" aria-label="Chiudi">✕</button>
        </div>
        <div class="modal-list">
          <button
            v-for="map in mapStore.maps"
            :key="map.id"
            class="map-option"
            :class="{ active: selectedMapId === map.id }"
            @click="selectMap(map.id)"
            :aria-label="`Seleziona mappa ${map.name} (${map.cols}×${map.rows})`"
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
            aria-label="Disabilita overlay mappa"
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

// Helper per visualizzazione griglia (con gestione di cella undefined)
function getCellEmoji(cell) {
  if (!cell) return '⬜'
  if (cell.details?.emoji) return cell.details.emoji
  return CELL_TYPE_INFO[cell.type]?.emoji || '⬜'
}

function getCellDisplay(cell) {
  if (!cell) return 'vuoto'
  if (cell.details?.label) return cell.details.label
  return CELL_TYPE_INFO[cell.type]?.label || cell.type || 'vuoto'
}

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
      const cell = map.grid[row]?.[col]
      if (!cell) continue
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
      const cell = grid[row]?.[col] || { type: CELL_TYPES.EMPTY, details: null }
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
// MODIFICA: escludi anche 'furniture' (se mai presenti nel registro)
const piecesList = computed(() => 
  gameStore.pieces.filter(p => 
    p.category !== MARKER_CATEGORIES.CORNER && 
    p.category !== 'furniture'
  )
)

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
/* ===== STILI ORIGINALI ===== */
/* (mantieni esattamente gli stessi stili del tuo file GameWithMap.vue originale) */
/* ... */
/* Per brevità non li riscrivo, ma sono identici a quelli che hai già */
</style>