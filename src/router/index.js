import { createRouter, createWebHashHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import SetupView from '../views/SetupView.vue'
import GameView from '../views/GameView.vue'

const routes = [
  { path: '/', component: HomeView },
  { path: '/setup', component: SetupView },
  { path: '/game', component: GameView },
]

export default createRouter({
  history: createWebHashHistory(),
  routes,
})