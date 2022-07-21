<template>
    <div class="mi-captchas">
        <!-- <mi-captcha ref="captcha" /> init-action="api/code"-->
        <!-- <mi-captcha theme-color="#2F9688" border-color="#2F9688" box-shadow-color="#2F9688" /> -->
        <mi-captcha
            ref="captcha"
            theme-color="#2F9688"
            check-action="api/code"
            verify-action="api/code/check"
            @success="successHandler" />
        <a
            @click="reset"
            style="
                padding-top: 10px;
                padding-bottom: 10px;
                margin-bottom: 24px;
                text-align: center;
                border: 1px solid #2f9688;
                display: block;
                cursor: pointer;
            ">
            重置
        </a>
    </div>
</template>

<script setup>
import { ref } from 'vue'

const captcha = ref(null)

const successHandler = (res) => {
    console.log('success:', res)
}

const reset = () => {
    console.log('reset')
    captcha.value?.reset()
}
</script>
