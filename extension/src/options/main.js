import { createApp } from 'vue'
import { createPinia } from 'pinia'
import Antd from 'ant-design-vue'
import 'ant-design-vue/dist/reset.css'
import '../styles/main.css'
import OptionsApp from './OptionsApp.vue'

const app = createApp(OptionsApp)
const pinia = createPinia()

app.use(pinia)
app.use(Antd)

app.mount('#app')