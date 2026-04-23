import { createRouter, createWebHashHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import SetupView from '../views/SetupView.vue'
import GameOpenGrid from '../views/gameOpenGrid.vue'
import GameWithMap from '../views/gameWithMap.vue'
import MapEditorView from '../views/MapEditorView.vue' // 👈 nuovo

const routes = [
  { path: '/', component: HomeView },
  { path: '/setup', component: SetupView },
  { path: '/gameOpenGrid', component: GameOpenGrid },
  { path: '/gameWithMap', component: GameWithMap },
  { path: '/map-editor', component: MapEditorView }, // 👈 nuova route
]

export default createRouter({
  history: createWebHashHistory(),
  routes,
})