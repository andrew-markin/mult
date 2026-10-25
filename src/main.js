import '@quasar/extras/roboto-font/roboto-font.css'
import 'quasar/src/css/index.sass'

import { Quasar } from 'quasar'
import { createApp } from 'vue'

import App from '@/App.vue'

// Safari ignores user-scalable=no in the viewport, so block pinch zoom directly
document.addEventListener('gesturestart', (event) => event.preventDefault())

const app = createApp(App)

app.use(Quasar, { plugins: {} })

app.mount('#app')

// Reveal the app once the fonts its text needs are loaded, so it doesn't flash
// in a fallback font. Hidden text is still laid out, which starts font loading,
// and fonts are matched to whatever characters are on the page. Give up waiting
// after a while in case the fonts can't be loaded at all.
const root = document.querySelector('#app')
void root.offsetHeight // Lay out right away, without waiting for a frame
const timeout = new Promise((resolve) => setTimeout(resolve, 3000))
Promise.race([document.fonts.ready, timeout]).then(() => root.classList.add('ready'))
