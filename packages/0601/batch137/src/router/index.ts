import { createRouter, createWebHistory } from 'vue-router'
import HomePage from '@/pages/HomePage.vue'
import ConfirmationPage from '@/pages/ConfirmationPage.vue'

const routes = [
  {
    path: '/',
    name: 'home',
    component: HomePage,
  },
  {
    path: '/confirmation',
    name: 'confirmation',
    component: ConfirmationPage,
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router
