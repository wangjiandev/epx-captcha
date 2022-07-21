<template>
    <div class="mi-captchas">
        <mi-captcha ref="captcha" />
        <a @click="reset" style="margin-bottom: 24px; text-align: center; display: block">重置</a>
        <mi-captcha theme-color="#2F9688" border-color="#2F9688" box-shadow-color="#2F9688" />
        <mi-captcha
            theme-color="#be6be0"
            init-action="api/code"
            :image="initParams.image"
            :blockImage="initParams.blockImage"
            :secretKey="initParams.secretKey"
            :token="initParams.token"
            @init="initAfter"
            @success="successHandler"
            verify-action="api/code/check"
            :verify-params="params.verify" />
    </div>
</template>

<script setup>
import { ref, reactive } from 'vue'

const captcha = ref(null)

const params = reactive({
    verify: { key: null }
})
const initParams = reactive({
    image: '',
    blockImage: '',
    secretKey: '',
    token: ''
})

const initAfter = (res) => {
    initParams.image = 'data:image/png;base64,' + res.data.repData.originalImageBase64
    initParams.blockImage = 'data:image/png;base64,' + res.data.repData.jigsawImageBase64
    initParams.secretKey = res.data.repData.secretKey
    initParams.token = res.data.repData.token
    if (res?.ret?.code === 200) {
        localStorage.setItem('mi-captcha-key', res?.data?.key)
        params.verify.key = res?.data?.key
    }
}

const successHandler = (res) => {
    console.log('success:', res)
}

const reset = () => {
    console.log('reinitialize')
    captcha.value?.reset(false)
}
</script>
