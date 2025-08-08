import DefaultTheme from 'vitepress/theme'
import './style.css'
import './custom.css'
import { onMounted } from 'vue'
import { initTooltips } from './floating-comments.js'

export default {
  ...DefaultTheme,
  setup() {
    onMounted(() => {
      initTooltips()
    })
  }
}

