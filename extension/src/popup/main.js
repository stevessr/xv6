import { createApp } from 'vue'
import { createPinia } from 'pinia'
import Antd from 'ant-design-vue'
import 'ant-design-vue/dist/reset.css'
import '../styles/main.css'
import PopupApp from './PopupApp.vue'

const app = createApp(PopupApp)
const pinia = createPinia()

app.use(pinia)
app.use(Antd)

app.mount('#app')