import Vue from 'vue'
import Vuex from 'vuex'

import app from './modules/app'
import user from './modules/user'
import permission from './modules/permission'
import enhance from './modules/enhance'
import teaching from './modules/teaching'
import classroom from './modules/classroom'
import exam from './modules/exam'
import getters from './getters'

Vue.use(Vuex)

export default new Vuex.Store({
    modules: {
        app,
        user,
        permission,
        enhance,
        teaching,
        classroom,
        exam
    },
    state: {

    },
    mutations: {

    },
    actions: {

    },
    getters
})
