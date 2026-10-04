import Vue from 'vue'
import Viser from 'viser-vue'

let installed = false

if (!installed) {
    Vue.use(Viser)
    installed = true
}
