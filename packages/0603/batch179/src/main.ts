import { createApp } from 'vue'
import App from './App.vue'
import lazyDirective from './directives'
import './style.css'

const app = createApp(App)
app.use(lazyDirective)
app.mount('#app')
