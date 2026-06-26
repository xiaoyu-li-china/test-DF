import { createRouter, createWebHistory } from 'vue-router'
import InvoiceForm from '@/pages/InvoiceForm.vue'
import InvoiceResult from '@/pages/InvoiceResult.vue'

const routes = [
  {
    path: '/',
    name: 'invoice-form',
    component: InvoiceForm,
  },
  {
    path: '/result',
    name: 'invoice-result',
    component: InvoiceResult,
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router
