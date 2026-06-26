import { createRouter, createWebHistory } from 'vue-router'
import ShiftBoard from '@/views/ShiftBoard.vue'

const routes = [
  {
    path: '/',
    name: 'shift-board',
    component: ShiftBoard,
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router
