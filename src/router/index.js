import { createRouter, createWebHashHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import SetupView from '../views/SetupView.vue'
import GameView from '../views/GameView.vue'
import MapEditorView from '../views/MapEditorView.vue' // 👈 nuovo

const routes = [
  { path: '/', component: HomeView },
  { path: '/setup', component: SetupView },
  { path: '/game', component: GameView },
  { path: '/map-editor', component: MapEditorView }, // 👈 nuova route
]

export default createRouter({
  history: createWebHashHistory(),
  routes,
})