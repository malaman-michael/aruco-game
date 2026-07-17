// src/views/HomeView.vue
<template>
  <div class="home-view">
    <div class="hero">
      <div class="hero-icon">🎲</div>
      <h1>ArUco Game</h1>
      <p>Gioco da tavolo in realtà aumentata.<br>Punta la fotocamera sulla plancia.</p>
      <p>Pagine di test per lo sviluppo</p>
    </div>

    <div class="info-card">
      <p>
        <strong>{{ registeredCount }}</strong> marker registrati ·
        <strong>{{ gameStore.gridCols }}×{{ gameStore.gridRows }}</strong> griglia
      </p>
    </div>

    <div class="btn-group">
      <button class="btn-primary btn-play-wo-map" @click="$router.push('/gameOpenGrid')"> 🏞️ Campo aperto </button>
      <button class="btn-primary btn-play-map" @click="$router.push('/gameWithMap')"> 🗺️ Con mappa </button>
      <button class="btn-secondary btn-setup" @click="$router.push('/setup')"> ⚙️ Configurazione mappa e pedine di gioco </button>
      <button class="btn-secondary btn-map" @click="$router.push('/map-editor')"> 🗺️ Editor Mappa </button>
      <button class="btn-accent btn-voice" @click="$router.push('/voice-color')"> 🎤 Cambia colore con la voce </button>
      <button class="btn-accent btn-gesture" @click="$router.push('/gesture-recognition')"> 🖐️ Riconoscimento gesti </button>
      <button class="btn-accent btn-assistant" @click="$router.push('/placement-assistant')"> 🎧 Guida al posizionamento </button>
      <button class="btn-accent btn-move" @click="$router.push('/voice-movement')"> 🎲 Muovi pedine con voce </button>
      <button class="btn-accent btn-settings" @click="$router.push('/settings')"> Personalizzazione messaggi audio </button>
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
</script>

<style scoped>
.home-view { min-height: 100vh; background: linear-gradient(160deg, #0f0f1e 0%, #1a1a3a 100%); display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 2rem 1.5rem; color: #eee; gap: 2rem; }
.hero { text-align: center; }
.hero-icon { font-size: clamp(3rem, 15vw, 5rem); margin-bottom: 2.5rem; }
h1 { margin: 0 0 0.5rem; font-size: clamp(1.8rem, 8vw, 2.5rem); letter-spacing: 1px; }
p { color: #aaa; line-height: 1.6; font-size: clamp(0.9rem, 4vw, 1.1rem); }
.btn-group { display: flex; flex-wrap: wrap; justify-content: center; gap: 0.8rem; width: 100%; max-width: 900px; margin: 0 auto; }
.btn-group button { border-radius: 14px; padding: 0.8rem 1.2rem; font-size: 1rem; cursor: pointer; text-align: center; border: none; transition: all 0.2s ease; flex: 1 1 auto; min-width: 140px; white-space: nowrap; font-weight: 500; }
.btn-primary { color: #fff; font-weight: 600; }
.btn-play-wo-map { background: linear-gradient(135deg, #34d399, #059669); }
.btn-play-map { background: linear-gradient(135deg, #4a7cf5, #1e40af); }
.btn-secondary { background: #2a2a4a; color: #aaa; border: 2px solid #3a3a6a; }
.btn-secondary:hover { background: #3a3a6a; color: #fff; }
.btn-accent { color: #fff; font-weight: 500; }
.btn-voice { background: linear-gradient(135deg, #a855f7, #7c3aed); }
.btn-gesture { background: linear-gradient(135deg, #7c5ef5, #4a2faf); }
.btn-assistant { background: linear-gradient(135deg, #f94316, #c53010); }
.btn-move { background: linear-gradient(135deg, #3b82f6, #1e40af); }
.btn-group button:hover { transform: translateY(-2px); filter: brightness(1.05); box-shadow: 0 6px 12px rgba(0,0,0,0.2); }
.info-card { background: #1a1a2e; border-radius: 12px; padding: 0.8rem 1.2rem; text-align: center; font-size: 0.9rem; color: #888; max-width: 90%; }
@media (min-width: 640px) { .btn-group { gap: 1rem; } .btn-group button { padding: 0.9rem 1.4rem; font-size: 1rem; min-width: 160px; } }
@media (min-width: 1024px) { .btn-group { max-width: 1000px; gap: 1rem; } .btn-group button { flex: 0 1 auto; min-width: 180px; padding: 1rem 1.5rem; font-size: 1.05rem; } }
@media (min-width: 1400px) { .btn-group { max-width: 1200px; } .btn-group button { min-width: 200px; padding: 1rem 2rem; } }
@media (max-width: 480px) { .btn-group button { flex: 1 1 100%; white-space: normal; word-break: keep-all; } }
</style>