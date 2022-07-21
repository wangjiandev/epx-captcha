import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import VueJsx from '@vitejs/plugin-vue-jsx'
import EslintPlugin from 'vite-plugin-eslint'
import Components from 'unplugin-vue-components/vite'
import { AntDesignVueResolver } from 'unplugin-vue-components/resolvers'
import path from 'path'
const resolve = (dir: string) => path.join(__dirname, dir)

export default defineConfig({
    alias: {
        '@': resolve('example'),
        '@src': resolve('src'),
        'makeit-captcha': resolve('src'),
        'makeit-captcha/style': resolve('src/style.ts')
    },
    css: {
        preprocessorOptions: {
            less: {
                javascriptEnabled: true
            }
        }
    },
    optimizeDeps: {
        include: ['vue', 'axios']
    },
    server: {
        proxy: {
            '/api': {
                target: 'http://192.168.1.73:9999',
                changeOrigin: true,
                rewrite: (path) => path.replace(/^\/api/, '')
            }
        }
    },
    plugins: [
        vue(),
        VueJsx(),
        EslintPlugin(),
        Components({
            resolvers: [AntDesignVueResolver()]
        })
    ],
    esbuild: {
        jsxFactory: 'h',
        jsxFragment: 'Fragment'
    }
})
