import { createRouter, createWebHashHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import SetupView from '../views/SetupView.vue'
import GameOpenGrid from '../views/GameOpenGrid.vue'
import GameWithMap from '../views/GameWithMap.vue'
import MapEditorView from '../views/MapEditorView.vue' // 👈 nuovo
import PlacementAssistantView from '../views/PlacementAssistantView.vue'
import GestureRecognitionView from '../views/GestureRecognitionView.vue'


const routes = [
  { path: '/', component: HomeView },
  { path: '/placement-assistant', component: PlacementAssistantView },
  { path: '/setup', component: SetupView },
  { path: '/gameOpenGrid', component: GameOpenGrid },
  { path: '/gameWithMap', component: GameWithMap },
  { path: '/map-editor', component: MapEditorView }, // 👈 nuova route
  { path: '/gesture-recognition', component: GestureRecognitionView },

]

export default createRouter({
  history: createWebHashHistory(),
  routes,
})