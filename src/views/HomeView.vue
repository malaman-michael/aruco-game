<template>
  <div class="home-view">
    <div class="hero">
      <div class="hero-icon">🎲</div>
      <h1>ArUco Game</h1>
      <p>Gioco da tavolo in realtà aumentata.<br>Punta la fotocamera sulla plancia.</p>
    </div>

    <div class="btn-group">
      <button class="btn-play" @click="$router.push('/game')">
        ▶ Inizia gioco
      </button>
      <button class="btn-setup" @click="$router.push('/setup')">
        ⚙️ Configurazione
      </button>
    </div>

    <div class="info-card">
      <p>
        <strong>{{ registeredCount }}</strong> marker registrati ·
        <strong>{{ gameStore.gridCols }}×{{ gameStore.gridRows }}</strong> griglia
      </p>
      <p v-if="!allCornersAssigned" class="hint-corners">
        ⚠️ Imposta prima i 4 marker d'angolo (NO, NE, SO, SE)
      </p>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useMarkersStore } from '../stores/markersStore.js'
import { useGameStore } from '../stores/gameStore.js'

const markersStore = useMarkersStore()
const gameStore = useGameStore()

const registeredCount = computed(() => Object.keys(markersStore.registry).length)
const allCornersAssigned = computed(() => markersStore.allCornersAssigned)
</script>

<style scoped>
.home-view {
  min-height: 100vh;
  background: linear-gradient(160deg, #0f0f1e 0%, #1a1a3a 100%);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem 1.5rem;
  color: #eee;
  gap: 2rem;
}

.hero { text-align: center; }
.hero-icon { font-size: 4rem; margin-bottom: 0.5rem; }
h1 { margin: 0 0 0.5rem; font-size: 2rem; letter-spacing: 1px; }
p { color: #aaa; line-height: 1.6; }

.btn-group {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
  width: 100%;
  max-width: 300px;
}

.btn-play {
  background: #4a7cf5;
  color: #fff;
  border: none;
  border-radius: 14px;
  padding: 1rem;
  font-size: 1.1rem;
  font-weight: 600;
  cursor: pointer;
}

.btn-setup {
  background: #2a2a4a;
  color: #aaa;
  border: 2px solid #3a3a6a;
  border-radius: 14px;
  padding: 0.9rem;
  font-size: 1rem;
  cursor: pointer;
}

.info-card {
  background: #1a1a2e;
  border-radius: 12px;
  padding: 0.8rem 1.2rem;
  text-align: center;
  font-size: 0.9rem;
  color: #888;
}
.hint-corners { color: #ffd700; margin-top: 0.4rem; }
</style>