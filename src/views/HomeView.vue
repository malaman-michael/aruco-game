<template>
  <div class="home-view">
    <div class="hero">
      <div class="hero-icon">🎲</div>
      <h1>ArUco Game</h1>
      <p>Gioco da tavolo in realtà aumentata.<br>Punta la fotocamera sulla plancia.</p>
    </div>

<div class="btn-group">
    <button class="btn-play-wo-map" @click="$router.push('/gameOpenGrid')">
    🏞️ Inizia gioco in campo aperto
  </button>
  <button class="btn-play-map" @click="$router.push('/gameWithMap')">
    🗺️ Inizia gioco con mappa
  </button>
  <button class="btn-setup" @click="$router.push('/setup')">
    ⚙️ Configurazione
  </button>
  <!-- 👇 Nuovo pulsante -->
  <button class="btn-map" @click="$router.push('/map-editor')">
    🗺️ Editor Mappa
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
/* LAYOUT */
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

.hero {
  text-align: center;
}

.hero-icon {
  font-size: clamp(3rem, 15vw, 5rem);
  margin-bottom: 0.5rem;
}

h1 {
  margin: 0 0 0.5rem;
  font-size: clamp(1.8rem, 8vw, 2.5rem);
  letter-spacing: 1px;
}

p {
  color: #aaa;
  line-height: 1.6;
  font-size: clamp(0.9rem, 4vw, 1.1rem);
}

/* BOTTONI */
.btn-group {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
  width: 100%;
  max-width: 320px;
}

/* BASE COMUNE */
.btn-play-map,
.btn-play-wo-map,
.btn-setup,
.btn-map {
  border-radius: 14px;
  padding: 1rem;
  font-size: 1rem;
  cursor: pointer;
  text-align: center;
  border: none;
  transition: all 0.2s ease;
}

/* 🟢 CAMPO APERTO */
.btn-play-wo-map {
  background: linear-gradient(135deg, #34d399, #059669);
  color: #fff;
  font-weight: 600;
}

/* 🔵 CON MAPPA */
.btn-play-map {
  background: linear-gradient(135deg, #4a7cf5, #1e40af);
  color: #fff;
  font-weight: 600;
}

/* ⚙️ CONFIG */
.btn-setup {
  background: #2a2a4a;
  color: #aaa;
  border: 2px solid #3a3a6a;
}

/* 🟠 EDITOR MAPPA */
.btn-map {
  background: linear-gradient(135deg, #f59e0b, #b45309);
  color: #fff;
}

/* HOVER */
.btn-play-map:hover,
.btn-play-wo-map:hover,
.btn-map:hover {
  transform: translateY(-2px);
  filter: brightness(1.1);
}

.btn-setup:hover {
  background: #3a3a6a;
  color: #fff;
}

/* INFO CARD */
.info-card {
  background: #1a1a2e;
  border-radius: 12px;
  padding: 0.8rem 1.2rem;
  text-align: center;
  font-size: 0.9rem;
  color: #888;
  max-width: 90%;
}

.hint-corners {
  color: #ffd700;
  margin-top: 0.4rem;
}

/* DESKTOP */
@media (min-width: 640px) {
  .btn-group {
    flex-direction: row;
    max-width: 500px;
  }

  .btn-play-map,
  .btn-play-wo-map,
  .btn-setup,
  .btn-map {
    flex: 1;
  }
}
</style>