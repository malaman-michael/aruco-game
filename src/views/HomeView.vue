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

.btn-map {
  background: #2a2a4a;
  color: #aaa;
  border: 2px solid #3a3a6a;
  border-radius: 14px;
  padding: 0.9rem;
  font-size: 1rem;
  cursor: pointer;
}


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

.btn-play-map {
  background: #4a7cf5;
  color: #fff;
  border: none;
  border-radius: 14px;
  padding: 1rem;
  font-size: 1.1rem;
  font-weight: 600;
  cursor: pointer;
}

.btn-play-wo-map {
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
.hero-icon { font-size: clamp(3rem, 15vw, 5rem); margin-bottom: 0.5rem; }
h1 { margin: 0 0 0.5rem; font-size: clamp(1.8rem, 8vw, 2.5rem); letter-spacing: 1px; }
p { color: #aaa; line-height: 1.6; font-size: clamp(0.9rem, 4vw, 1.1rem); }

.btn-group {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
  width: 100%;
  max-width: 320px;
}

.btn-play-map,.btn-play-wo-map, .btn-setup, .btn-map {
  border-radius: 14px;
  padding: 1rem;
  font-size: 1rem;
  cursor: pointer;
  text-align: center;
  border: none;
  transition: background 0.2s;
}
.btn-play-wo-map {
  background: #4a7cf5;
  color: #fff;
  font-weight: 600;
}
.btn-play-map {
  background: #4a7cf5;
  color: #fff;
  font-weight: 600;
}
.btn-setup, .btn-map {
  background: #2a2a4a;
  color: #aaa;
  border: 2px solid #3a3a6a;
}

.info-card {
  background: #1a1a2e;
  border-radius: 12px;
  padding: 0.8rem 1.2rem;
  text-align: center;
  font-size: 0.9rem;
  color: #888;
  max-width: 90%;
}
.hint-corners { color: #ffd700; margin-top: 0.4rem; }

/* Desktop: pulsanti affiancati */
@media (min-width: 640px) {
  .btn-group {
    flex-direction: row;
    max-width: 500px;
  }
  .btn-play-map,.btn-play-wo-map, .btn-setup, .btn-map {
    flex: 1;
  }
}

</style>