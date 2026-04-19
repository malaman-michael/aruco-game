<template>
  <!-- SVG overlay posizionato sopra il feed camera, stesse dimensioni del video -->
  <svg
    class="game-overlay"
    :viewBox="`0 0 ${videoW} ${videoH}`"
    xmlns="http://www.w3.org/2000/svg"
  >
    <!-- Griglia (solo se l'omografia è disponibile) -->
    <g v-if="homography" class="grid-layer">
      <line
        v-for="line in gridLines"
        :key="line.key"
        :x1="line.x1" :y1="line.y1"
        :x2="line.x2" :y2="line.y2"
        stroke="rgba(100,200,255,0.3)"
        stroke-width="1"
      />
    </g>

    <!-- Marker corner: cerchio con etichetta NO/NE/SO/SE -->
    <g v-for="cm in visibleCorners" :key="'corner-' + cm.id" class="corner-marker">
      <circle
        :cx="cm.center.x" :cy="cm.center.y"
        r="18"
        fill="rgba(255,220,0,0.2)"
        stroke="#ffd700"
        stroke-width="2"
      />
      <text
        :x="cm.center.x" :y="cm.center.y + 5"
        text-anchor="middle"
        fill="#ffd700"
        font-size="13"
        font-weight="bold"
        font-family="monospace"
      >{{ cm.role }}</text>
    </g>

    <!-- Pedine giocatori / nemici / mobili -->
    <g
      v-for="piece in pieces"
      :key="'piece-' + piece.id"
      :transform="`translate(${piece.center.x}, ${piece.center.y}) rotate(${piece.angle})`"
    >
      <!-- Bounding box colorato per tipo -->
      <rect
        :width="markerSize(piece)" :height="markerSize(piece)"
        :x="-markerSize(piece)/2" :y="-markerSize(piece)/2"
        :fill="fillColor(piece)"
        stroke="white"
        stroke-width="2"
        rx="5"
        opacity="0.75"
      />
      <!-- Emoji / icona -->
      <text
        text-anchor="middle"
        :font-size="markerSize(piece) * 0.55"
        dominant-baseline="central"
        y="0"
      >{{ piece.emoji }}</text>
      <!-- Label nome -->
      <text
        text-anchor="middle"
        :y="markerSize(piece)/2 + 14"
        font-size="11"
        fill="white"
        font-weight="600"
        style="text-shadow: 0 1px 3px black"
      >{{ piece.label }}</text>
      <!-- Coordinata griglia (debug) -->
      <text
        v-if="showCoords && piece.col !== null"
        text-anchor="middle"
        :y="-markerSize(piece)/2 - 6"
        font-size="10"
        fill="rgba(255,255,255,0.7)"
      >{{ piece.col }},{{ piece.row }}</text>
    </g>
  </svg>
</template>

<script setup>
import { computed } from 'vue'
import { useMarkersStore, MARKER_CATEGORIES } from '../stores/markersStore.js'
import { useGameStore } from '../stores/gameStore.js'
import { applyHomography } from '../services/homographyService.js'

const props = defineProps({
  videoW: { type: Number, default: 1280 },
  videoH: { type: Number, default: 720 },
  homography: { type: Array, default: null },
  showCoords: { type: Boolean, default: false },
  markers: { type: Array, default: () => [] }, // marker raw dal detector
})

const markersStore = useMarkersStore()
const gameStore = useGameStore()

// Pedine non-corner visibili nel frame
const pieces = computed(() => gameStore.pieces)

// Corner marker visibili nel frame corrente
const visibleCorners = computed(() => {
  return props.markers
    .filter(m => {
      const d = markersStore.getMarker(m.id)
      return d?.category === MARKER_CATEGORIES.CORNER
    })
    .map(m => {
      const d = markersStore.getMarker(m.id)
      return { ...m, role: d.role }
    })
})

// Linee della griglia proiettata sul canvas camera
const gridLines = computed(() => {
  if (!props.homography) return []
  const H = props.homography
  const lines = []
  const cols = gameStore.gridCols
  const rows = gameStore.gridRows

  // Linee verticali
  for (let c = 0; c <= cols; c++) {
    const p1 = gridToPixel(H, c, 0)
    const p2 = gridToPixel(H, c, rows)
    lines.push({ key: `v${c}`, x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y })
  }
  // Linee orizzontali
  for (let r = 0; r <= rows; r++) {
    const p1 = gridToPixel(H, 0, r)
    const p2 = gridToPixel(H, cols, r)
    lines.push({ key: `h${r}`, x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y })
  }
  return lines
})

/** Trasforma coordinate griglia → pixel camera (omografia inversa) */
function gridToPixel(H, col, row) {
  // Usa la pseudoinversa della omografia
  // Per ora: approssima con una proiezione bilineare dai 4 corner
  // (la vera inversa richiederebbe la matrice inversa di H)
  const invH = invertH(H)
  return applyHomography(invH, { x: col, y: row })
}

// Cache per l'inversa
let _lastH = null
let _invH = null

function invertH(H) {
  if (H === _lastH) return _invH
  _lastH = H
  _invH = invert3x3(H)
  return _invH
}

function invert3x3(m) {
  const [a,b,c,d,e,f,g,h,i] = m
  const det = a*(e*i-f*h) - b*(d*i-f*g) + c*(d*h-e*g)
  if (Math.abs(det) < 1e-10) return m
  const inv = [
    (e*i-f*h)/det, (c*h-b*i)/det, (b*f-c*e)/det,
    (f*g-d*i)/det, (a*i-c*g)/det, (c*d-a*f)/det,
    (d*h-e*g)/det, (b*g-a*h)/det, (a*e-b*d)/det,
  ]
  return inv
}

function markerSize(piece) {
  return piece.category === MARKER_CATEGORIES.ENEMY ? 52 : 44
}

function fillColor(piece) {
  switch (piece.category) {
    case MARKER_CATEGORIES.PLAYER:    return 'rgba(30, 120, 255, 0.7)'
    case MARKER_CATEGORIES.ENEMY:     return 'rgba(200, 30, 30, 0.7)'
    case MARKER_CATEGORIES.FURNITURE: return 'rgba(120, 80, 20, 0.7)'
    default: return 'rgba(80, 80, 80, 0.7)'
  }
}
</script>

<style scoped>
.game-overlay {
  position: absolute;
  top: 0; left: 0;
  width: 100%; height: 100%;
  pointer-events: none;
}
</style>