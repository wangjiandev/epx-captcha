import { defineComponent, computed, reactive, Teleport, ref, onMounted, onBeforeUnmount } from 'vue'
import { VerifiedOutlined } from '@ant-design/icons-vue'
import { captchaProps } from './props'
import { getPrefixCls } from '../utils/props-tools'
import { $tools } from '../utils/tools'
import { $g } from '../utils/global'
import { $request } from '../utils/request'
import MiCaptchaModal from './modal'

const POWERED = 'Powered By Epx'
const AVATAR = 'https://www.naiveui.com/assets/naivelogo.93278402.svg'
const TARGET = 'https://github.com/wangjiandev/epx-captcha'

export default defineComponent({
    name: 'MiCaptcha',
    inheritAttrs: false,
    props: captchaProps(),
    emits: ['init', 'checked', 'success'],
    setup(props, { emit, attrs, expose }) {
        const prefixCls = getPrefixCls('captcha', props.prefixCls)
        const captchaRef = ref(null)
        const captchaModalRef = ref(null)
        const themeColorStyle = computed(() => {
            return (
                props.themeColor
                    ? {
                          backgroundColor: props.themeColor,
                          boxShadow: `inset 0 0 0 1px ${props.themeColor}`
                      }
                    : null
            ) as any
        })
        const params = reactive({
            avatar: AVATAR,
            powered: POWERED,
            target: TARGET,
            init: false,
            failed: false,
            pass: false,
            tip: props.initAction ? '正在初始化验证码 ···' : '点击按钮进行验证',
            timer: null,
            status: {
                ready: true,
                scanning: false,
                being: false,
                success: false
            },
            offset: {
                top: 22.5,
                left: 48
            },
            modal: {
                show: false,
                pos: {}
            },
            image: '',
            block: '',
            verifyParams: { ...props.verifyParams }
        }) as { [index: string]: any }

        onBeforeUnmount(() => {
            closeCaptchaModal({ status: 'close' })
            $tools.off(window, 'resize', resize)
        })

        onMounted(() => {
            initCaptcha()
            $tools.on(window, 'resize', resize)
        })

        const initCaptcha = () => {
            const afterInit = (tip = '点击按钮进行验证') => {
                params.failed = false
                params.init = true
                params.tip = tip
            }
            if (props.initAction) {
                if (typeof props.initAction === 'function') {
                    afterInit()
                    props.initAction()
                } else {
                    $request[props.initMethod.toLowerCase()](props.initAction, props.initParams)
                        .then((res: any) => {
                            afterInit()
                            if (res?.data?.repCode && res?.data?.repCode === '0000') {
                                emit('init', res)
                            } else {
                                afterInit('初始化接口有误，请稍候再试')
                            }
                        })
                        .catch(() => {
                            afterInit('初始化接口有误，请稍候再试')
                        })
                }
            } else afterInit()
        }

        const showCaptchaModal = () => {
            if (!params.init || params.status.success) return
            params.tip = '智能检测中 ···'
            params.status.ready = false
            params.status.scanning = true
            if (props.checkAction) {
                $request[props.checkMethod.toLowerCase()](props.checkAction, props.checkParams)
                    .then((res: any) => {
                        if (res?.data?.repCode && res?.data?.repCode === '0000') {
                            params.image =
                                'data:image/png;base64,' + res.data.repData.originalImageBase64
                            params.blockImage =
                                'data:image/png;base64,' + res.data.repData.jigsawImageBase64
                            params.verifyParams.secretKey = res.data.repData.secretKey
                            params.verifyParams.token = res.data.repData.token
                            initCaptchaModal()
                        } else {
                            params.pass = true
                        }
                        emit('checked', res)
                    })
                    .catch(() => {
                        params.pass = false
                        initCaptchaModal()
                    })
            } else initCaptchaModal()
        }

        const initCaptchaModal = () => {
            params.status.scanning = false
            params.status.being = true
            params.modal.pos = getCaptchaModalPosition()
            params.modal.show = true
            params.tip = '请移动滑块，完成验证'
        }

        const closeCaptchaModal = (data: any) => {
            if (data) {
                if (data.status === 'close') resetCaptcha()
                if (data.status === 'success') success(data.data)
                if (data.status === 'frequently') {
                    resetCaptcha()
                    showMessage(`验证失败`, 5)
                }
            }
        }

        const getCaptchaModalPosition = () => {
            const elem = captchaRef.value as any
            let pos = { left: 0, top: 0 }
            if (elem) {
                const rect = elem.getBoundingClientRect()
                const top = Math.round(rect.top * 1000) / 1000 + params.offset.top
                const left = Math.round(rect.left * 1000) / 1000 + params.offset.left
                pos = { left, top }
            }
            return pos
        }

        const renderSuccessShow = () => {
            const hex = /^#([0-9a-fA-f]{3}|[0-9a-fA-f]{6})$/
            const rgb = /^(rgb|RGB)/
            const successCls = `${prefixCls}-success`
            const cls = `${successCls}${params.status.success ? ` ${successCls}-show` : ''}`
            const backgroundColor = props.themeColor
                ? hex.test(props.themeColor)
                    ? $tools.colorHex2Rgba(props.themeColor, 0.2)
                    : rgb.test(props.themeColor)
                    ? $tools.colorHex2Rgba($tools.colorRgb2Hex(props.themeColor), 0.2)
                    : props.themeColor
                : null
            const style = {
                borderRadius: props.radius ? $tools.convert2Rem(props.radius) : null,
                background: backgroundColor,
                borderColor: props.themeColor ?? null
            } as { [index: string]: any }
            return <div class={cls} style={style}></div>
        }

        const showMessage = (msg = '错误提示', duration = 3) => {
            const name = `${prefixCls}-message`
            const exist = document.getElementById(name)
            if (exist) exist.remove()
            const elem = document.createElement('div') as HTMLElement
            elem.id = name
            elem.className = name
            elem.innerHTML = `
                <div class="${name}-content">
                    <span>${msg}</span>
                </div>
            `
            document.body.appendChild(elem)
            if (params.timer) clearTimeout(params.timer)
            params.timer = setTimeout(() => {
                elem.remove()
            }, duration * 1000)
        }

        const success = (data: any) => {
            params.tip = '通过验证'
            emit('success', data)
            setTimeout(() => {
                params.modal.show = false
                params.status.being = false
                params.status.success = true
            })
        }

        const reset = () => {
            params.modal.show = false
            params.status.being = false
            params.status.success = false
            params.status.scanning = false
            params.status.ready = true
            params.tip = '点击按钮进行验证'
        }

        const resize = () => {
            params.modal.pos = getCaptchaModalPosition()
        }

        const renderContent = () => {
            const width = $tools.convert2Rem(props.width)
            const height = $tools.convert2Rem(props.height)
            const modal = params.modal.show ? (
                <Teleport to="body" ref={captchaModalRef}>
                    <MiCaptchaModal
                        position={params.modal.pos}
                        maxTries={props.maxTries}
                        show={params.modal.show}
                        mask={props.mask}
                        maskClosable={props.maskClosable}
                        boxShadow={props.modalBoxShadow}
                        boxShadowBlur={props.modalBoxShadowBlur}
                        boxShadowColor={props.modalBoxShadowColor}
                        themeColor={props.themeColor}
                        bgColor={props.modalBgColor}
                        verifyMethod={props.verifyMethod}
                        verifyParams={params.verifyParams}
                        verifyAction={props.verifyAction}
                        onModalClose={closeCaptchaModal}
                        image={params.image}
                        blockImage={params.blockImage}
                    />
                </Teleport>
            ) : null
            return (
                <>
                    <div class={`${prefixCls}-content`} style={{ width, height }}>
                        {renderRadar()}
                        {renderSuccessShow()}
                    </div>
                    {modal}
                </>
            )
        }

        const renderRadar = () => {
            const cls = `${prefixCls}-radar${
                params.status.success ? ` ${prefixCls}-radar-pass` : ''
            }`
            const style = {
                borderRadius: props.radius ? $tools.convert2Rem(props.radius) : null,
                borderColor: props.borderColor ?? props.themeColor ?? null,
                background: props.bgColor ?? null,
                boxShadow: props.boxShadow
                    ? props.boxShadowColor || props.themeColor
                        ? `0 0 ${$tools.convert2Rem(props.boxShadowBlur)} ${
                              props.boxShadowColor || props.themeColor
                          }`
                        : 'none'
                    : 'none'
            }
            return (
                <div class={cls} style={style}>
                    {renderRadarReady()}
                    {renderRadarScan()}
                    {renderRadarBeing()}
                    {renderRadarSuccess()}
                    {renderRadarTip()}
                    {renderRadarLogo()}
                </div>
            )
        }

        const renderRadarReady = () => {
            return params.status.ready ? (
                <div class={`${prefixCls}-radar-ready`}>
                    <div class={`${prefixCls}-radar-ring`} style={themeColorStyle.value} />
                    <div
                        class={`${prefixCls}-radar-dot`}
                        style={themeColorStyle.value}
                        ref={`${prefixCls}-radar-dot`}
                    />
                </div>
            ) : null
        }

        const renderRadarScan = () => {
            const borderColor = (
                props.themeColor
                    ? `${props.themeColor} transparent ${props.themeColor} transparent`
                    : null
            ) as any
            const borderColor2 = (
                props.themeColor
                    ? `transparent ${props.themeColor} transparent ${props.themeColor}`
                    : null
            ) as any
            return params.status.scanning ? (
                <div class={`${prefixCls}-radar-scan`}>
                    <div class="double-ring">
                        <div style={{ borderColor }} />
                        <div style={{ borderColor: borderColor2 }} />
                    </div>
                </div>
            ) : null
        }

        const renderRadarBeing = () => {
            return params.status.being ? (
                <div class={`${prefixCls}-radar-being`} style={{ color: props.textColor ?? null }}>
                    ···
                </div>
            ) : null
        }

        const renderRadarSuccess = () => {
            const iconStyle = {
                fontSize: $tools.convert2Rem(20),
                color: props.themeColor ?? null
            }
            const radarSuccessCls = `${prefixCls}-radar-success`
            return params.status.success ? (
                <div class={`${radarSuccessCls} ${radarSuccessCls}-icon`}>
                    <VerifiedOutlined style={iconStyle} />
                </div>
            ) : null
        }

        const renderRadarTip = () => {
            const radarTipCls = `${prefixCls}-radar-tip`
            const errCls = params.failed ? ` ${radarTipCls}-error` : ''
            const cls = `${radarTipCls}${errCls}`
            const style = {
                height: $tools.convert2Rem(props.height),
                color:
                    params.status.success && props.themeColor
                        ? props.themeColor
                        : props.textColor ?? null
            } as any
            return <div class={cls} style={style} innerHTML={params.tip} />
        }

        const renderRadarLogo = () => {
            const height = props.height && props.height > 40 ? props.height : null
            const top = height ? Math.round(((height - 20) / 2) * 100) / 100 - 1 : null
            const style = { top: height ? $tools.convert2Rem(top) : null }
            return (
                <div class={`${prefixCls}-radar-logo`} style={style}>
                    <a href={params.target} target="_blank">
                        <img src={props.logo ?? params.avatar} alt={params.powered} />
                    </a>
                </div>
            )
        }

        const resetCaptcha = (reinit = true) => {
            reset()
            if (reinit) initCaptcha()
        }
        expose({ reset: (reinit = true) => resetCaptcha(reinit) })

        return () => (
            <div
                class={`${prefixCls}${$g.isMobile ? ` ${prefixCls}-mobile` : ''}`}
                {...attrs}
                onClick={showCaptchaModal}
                key={`${prefixCls}-${$tools.uid()}`}
                ref={captchaRef}>
                {renderContent()}
            </div>
        )
    }
})
