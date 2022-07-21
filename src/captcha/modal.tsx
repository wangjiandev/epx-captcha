import { defineComponent, ref, reactive, onMounted, onBeforeUnmount, Transition } from 'vue'
import { Tooltip } from 'ant-design-vue'
import { CloseCircleOutlined, ReloadOutlined, QuestionCircleOutlined } from '@ant-design/icons-vue'
import { getPrefixCls } from '../utils/props-tools'
import { $tools } from '../utils/tools'
import { $g } from '../utils/global'
import { $request } from '../utils/request'
import { captchaModalProps } from './props'
import { aesEncrypt } from '../utils/ase'

const BACKGROUND = 'https://file.makeit.vip/MIIT/M00/00/00/ajRkHV7d0JOAJYSMAAFwUxGzMIc287.jpg'
const POWERED = 'Powered By epx'
const AVATAR = 'https://www.naiveui.com/assets/naivelogo.93278402.svg'
const TARGET = 'https://github.com/wangjiandev/epx-captcha'

export default defineComponent({
    name: 'MiCaptchaModal',
    inheritAttrs: false,
    props: captchaModalProps(),
    emits: ['modalClose'],
    setup(props, { emit }) {
        const prefixCls = getPrefixCls('captcha-modal', props.prefixCls)
        const langCls = getPrefixCls(`lang-zh-cn`, props.prefixCls)
        const animation = getPrefixCls('anim-scale')

        const modalRef = ref(null)
        const maskRef = ref(null)
        const contentRef = ref(null)
        const sliderRef = ref(null)
        const sliderBtnRef = ref(null)
        const imageRef = ref(null)
        const blockRef = ref(null)
        const resultRef = ref(null)

        const show = ref<boolean>(props.show)

        const classes = {
            modal: prefixCls,
            image: `${prefixCls}-image`,
            block: `${prefixCls}-block`,
            slider: `${prefixCls}-slider`,
            mask: `${prefixCls}-mask`,
            result: `${prefixCls}-result`,
            content: `${prefixCls}-content`
        } as { [index: string]: any }
        const params = reactive({
            loading: true,
            background: BACKGROUND,
            avatar: AVATAR,
            powered: POWERED,
            target: TARGET,
            ctx: {
                image: null,
                block: null
            },
            elements: {
                slider: null,
                block: null
            },
            coordinate: {
                x: 0,
                y: 0,
                offset: 6
            },
            size: {
                width: 310,
                height: 155
            },
            block: {
                size: 50,
                radius: 8,
                PI: Math.PI,
                real: 0
            },
            drag: {
                moving: false,
                originX: 0,
                originY: 0,
                offset: 0
            },
            time: {
                start: null,
                end: null
            },
            check: {
                tries: props.maxTries ?? 1,
                num: 0,
                correct: false,
                show: false,
                tip: null,
                being: false,
                value: null
            },
            _background: null,
            _blockImage: null
        }) as { [index: string]: any }

        onMounted(() => {
            init()
        })

        onBeforeUnmount(() => {
            $tools.off(params.elements.slider, 'pointerdown', dragStart)
            $tools.off(params.elements.slider, 'touchstart', dragStart)
            $tools.off(params.elements.slider, 'pointermove', dragMoving)
            $tools.off(params.elements.slider, 'touchmove', dragMoving)
            $tools.off(params.elements.slider, 'pointerup', dragEnd)
            $tools.off(params.elements.slider, 'touchend', dragEnd)
        })

        const init = () => {
            params._background = props.image ?? params.background
            params._blockImage = props.blockImage ?? params.background
            initModal()
        }

        const initModal = () => {
            params.elements = {
                slider: sliderBtnRef.value as any,
                block: blockRef.value as any
            }
            params.block.real = params.block.size + params.block.radius * 2 + 2
            setCheckData()
            initCaptcha()
            $tools.on(params.elements.slider, 'pointerdown', dragStart)
            $tools.on(params.elements.slider, 'touchstart', dragStart)
            $tools.on(params.elements.slider, 'pointermove', dragMoving)
            $tools.on(params.elements.slider, 'touchmove', dragMoving)
            $tools.on(params.elements.slider, 'pointerup', dragEnd)
            $tools.on(params.elements.slider, 'touchend', dragEnd)
        }

        const setCheckData = () => {
            params.check = {
                tries: props.maxTries ?? 5,
                num: 0,
                being: false,
                value: null,
                correct: false,
                tip: '拖动滑块将悬浮图像正确拼合',
                show: false
            }
        }

        const initCaptcha = () => {
            // 背景画布
            const image = imageRef.value as HTMLCanvasElement | null
            // 滑动画布
            const block = blockRef.value as HTMLCanvasElement | null
            const imageCtx = image ? image.getContext('2d') : null
            const blockCtx = block ? block.getContext('2d') : null
            params.ctx = { image: imageCtx, block: blockCtx }
            if ($g.regExp.url.test(params._background)) image2Base64(initImageElem)
            else initImageElem()
        }

        const refreshCaptcha = () => {
            params.loading = true
            setCheckData()
            const block = blockRef.value as any
            block.width = params.size.width
            params.ctx.image.clearRect(0, 0, params.size.width, params.size.height)
            params.ctx.block.clearRect(0, 0, params.size.width, params.size.height)
            initImageElem()
        }

        const closeModal = (status?: any, data?: any) => {
            params.loading = true
            if (typeof status !== 'string') status = 'close'
            if (props.maskClosable) {
                show.value = false
                setTimeout(() => {
                    emit('modalClose', {
                        status,
                        data
                    })
                }, 400)
            }
        }

        const image2Base64 = (callback: Function) => {
            const elem = new Image() as HTMLImageElement
            const canvas = document.createElement('canvas')
            const ctx = canvas.getContext('2d') as CanvasRenderingContext2D
            canvas.width = params.size.width
            canvas.height = params.size.height
            elem.crossOrigin = ''
            elem.src = params._background
            elem.onload = () => {
                ctx.drawImage(elem, 0, 0, params.size.width, params.size.height)
                params._background = canvas.toDataURL()
                callback && callback()
            }
        }

        const initImage = (elem: HTMLElement) => {
            if (params.ctx.image && params.ctx.block) {
                /** image */
                params.ctx.image.drawImage(elem, 0, 0, params.size.width, params.size.height)
                /** text */
                params.ctx.image.beginPath()
                params.ctx.image.fillStyle = '#FFF'
                params.ctx.image.shadowColor = 'transparent'
                params.ctx.image.shadowBlur = 0
                params.ctx.image.font = 'bold 24px MicrosoftYaHei'
                params.ctx.image.fillText('拖动滑块拼合图片', 12, 30)
                params.ctx.image.font = '16px MicrosoftYaHei'
                params.ctx.image.fillText('就能验证成功哦', 12, 55)
                params.ctx.image.closePath()
                /** block */
                const block_elem = new Image()
                block_elem.src = params._blockImage
                block_elem.onload = () => initBlockImage(block_elem)
                params.loading = false
            }
        }

        const initBlockImage = (elem: HTMLElement) => {
            const block = blockRef.value as HTMLCanvasElement | null
            if (block) block.width = params.block.size
            params.ctx.block.drawImage(elem, 0, 0, params.block.size, params.size.height)
            params.ctx.block.restore()
        }

        const initImageElem = () => {
            const elem = new Image()
            elem.src = params._background
            elem.onload = () => initImage(elem)
        }

        const getBoundingClientRect = (elem: HTMLElement, specific = null) => {
            const rect = elem.getBoundingClientRect()
            if (specific && rect[specific]) return rect[specific]
            return rect
        }

        const dragStart = (evt: any) => {
            const x = evt.clientX || evt.touches[0].clientX
            const sliderRect = getBoundingClientRect(sliderRef.value as any)
            const sliderBtnRect = getBoundingClientRect(sliderBtnRef.value as any)
            params.drag.originX = Math.round(sliderRect.left * 10) / 10
            params.drag.originY = Math.round(sliderRect.top * 10) / 10
            params.drag.offset = Math.round((x - sliderBtnRect.left) * 10) / 10
            params.drag.moving = true
            params.time.start = Date.now()
        }

        const dragMoving = (evt: any) => {
            if (!params.drag.moving || params.check.being) return
            const x = evt.clientX || evt.touches[0].clientX
            const moveX = Math.round((x - params.drag.originX - params.drag.offset) * 10) / 10
            if (moveX < 0 || moveX + 54 >= params.size.width) {
                checkVerificationCode()
                return false
            }
            params.elements.slider.style.left = `${moveX}px`
            params.elements.block.style.left = `${moveX}px`
            params.check.value = moveX
        }

        const dragEnd = () => {
            if (!params.drag.moving) return
            params.time.end = Date.now()
            checkVerificationCode()
        }

        const dragReset = () => {
            params.elements.slider.style.left = 0
            params.elements.block.style.left = 0
            params.drag.originX = 0
            params.drag.originY = 0
        }

        const checkVerificationCode = async () => {
            const coordinateX = Math.round(params.check.value + params.coordinate.offset)
            if (params.check.being) return
            params.check.being = true
            const error = (msg = null) => {
                setTimeout(() => {
                    dragReset()
                    closeModal('frequently', '')
                }, 500)
                params.check.num++
                params.check.correct = false
                if (msg) params.check.tip = msg
            }
            const moveLeftDistance = (coordinateX * 310) / parseInt(params.size.width)
            const succcess = (data: any = {}) => {
                setTimeout(() => {
                    closeModal('success', data)
                }, 500)
            }
            const take = Math.round((params.time.end - params.time.start) / 10) / 100
            params.check.tip = `${take}s速度完成图片拼合验证`
            if (props.verifyAction) {
                const verifyParams = {
                    captchaType: 'blockPuzzle',
                    pointJson: props.verifyParams.secretKey
                        ? aesEncrypt(
                              JSON.stringify({ x: moveLeftDistance, y: 5.0 }),
                              props.verifyParams.secretKey
                          )
                        : JSON.stringify({ x: moveLeftDistance, y: 5.0 }),
                    token: props.verifyParams.token
                }

                await $request[props.verifyMethod.toLowerCase()](props.verifyAction, verifyParams)
                    .then((res: any) => {
                        if (res.data.repCode === '0000') {
                            params.check.correct = true
                            const captchaVerification = props.verifyParams.secretKey
                                ? aesEncrypt(
                                      props.verifyParams.token +
                                          '---' +
                                          JSON.stringify({ x: moveLeftDistance, y: 5.0 }),
                                      props.verifyParams.secretKey
                                  )
                                : props.verifyParams.token +
                                  '---' +
                                  JSON.stringify({ x: moveLeftDistance, y: 5.0 })
                            succcess(captchaVerification)
                        } else error(res.msg)
                    })
                    .catch((err: any) => {
                        error(err.message)
                    })
            } else {
                params.check.correct = true
                succcess()
            }

            // if (params.coordinate.x - 2 <= coordinateX && params.coordinate.x + 2 >= coordinateX) {

            // } else error()
            const result = resultRef.value as HTMLElement | null
            if (result) result.style.bottom = '0'
            if (params.check.num <= params.check.tries) params.check.show = true
            setTimeout(() => {
                params.drag.moving = false
                if (result) result.style.bottom = $tools.convert2Rem(-32)
            }, 1000)
            setTimeout(() => {
                params.check.show = false
                params.check.being = false
                if (params.check.num >= params.check.tries) closeModal('frequently')
            }, 1600)
        }

        const renderMask = () => {
            return props.mask && props.show ? (
                <div class={classes.mask} onClick={closeModal} ref={maskRef} />
            ) : null
        }

        const renderArrow = () => {
            const arrowCls = `${prefixCls}-arrow`
            const style = {
                borderColor: props.themeColor
                    ? `transparent ${props.themeColor} transparent transparent`
                    : null
            } as { [index: string]: any }
            return (
                <div class={arrowCls}>
                    <div class={`${arrowCls}-out`} style={style} />
                    <div class={`${arrowCls}-in`} style={style} />
                </div>
            )
        }

        const renderContent = () => {
            const style = {
                borderColor: props.themeColor ?? null,
                background: props.bgColor ?? null,
                boxShadow:
                    props.boxShadow && (props.boxShadowColor || props.themeColor)
                        ? `0 0 ${$tools.convert2Rem(props.boxShadowBlur)} ${
                              props.boxShadowColor || props.themeColor
                          }`
                        : null
            } as { [index: string]: any }
            return (
                <div class={classes.content} style={style} ref={contentRef}>
                    <div class={`${prefixCls}-wrap`}>
                        <div class={`${prefixCls}-embed`}>
                            {renderContentLoading()}
                            {renderContentInfo()}
                            {renderContentResult()}
                        </div>
                        <div
                            ref={sliderRef}
                            class={`${classes.slider}${
                                params.drag.moving ? ` ${classes.slider}-moving` : ''
                            }`}>
                            {renderSliderTrack()}
                            {renderSliderBtn()}
                        </div>
                    </div>
                    <div class={`${prefixCls}-panel`}>
                        {renderPanelAction()}
                        {renderPanelCopyright()}
                    </div>
                </div>
            )
        }

        const renderContentLoading = () => {
            const loadingCls = `${prefixCls}-loading`
            const style1 = { borderColor: props.themeColor ?? null }
            const style2 = { background: props.themeColor ?? null }
            return params.loading ? (
                <div class={loadingCls}>
                    <div class={`${loadingCls}-spinner`}>
                        <div class="load">
                            <div>
                                <div>
                                    <div style={style1}></div>
                                    <div style={style2}></div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class={`${loadingCls}-tip`}>正在加载验证码 ···</div>
                </div>
            ) : null
        }

        const renderContentInfo = () => {
            return (
                <div class={`${prefixCls}-info`}>
                    <canvas
                        id="image"
                        width={params.size.width}
                        height={params.size.height}
                        ref={imageRef}></canvas>
                    <canvas
                        id="block"
                        width={params.size.width}
                        height={params.size.height}
                        ref={blockRef}></canvas>
                </div>
            )
        }

        const renderContentResult = () => {
            const cls = `${classes.result} ${
                params.check.correct ? `${classes.result}-success` : `${classes.result}-error`
            }`
            return <div class={cls} ref={resultRef} innerHTML={params.check.tip}></div>
        }

        const renderSliderTrack = () => {
            const sliderTrackCls = `${classes.slider}-track`
            const style = { borderColor: props.themeColor ?? null }
            return (
                <div class={sliderTrackCls} style={style}>
                    <span class={`${sliderTrackCls}-tip${params.drag.moving ? ' hide' : ''}`}>
                        拖动左边滑块完成上方拼图
                    </span>
                </div>
            )
        }

        const renderSliderBtn = () => {
            const sliderBtnCls = `${classes.slider}-btn`
            const style = { borderColor: props.themeColor ?? null }
            return (
                <div class={sliderBtnCls} style={style} ref={sliderBtnRef}>
                    <div class={`${sliderBtnCls}-icon`} style={style}>
                        <div class={`${sliderBtnCls}-vertical`} />
                        <div
                            class={`${sliderBtnCls}-horizontal`}
                            style={{ background: props.themeColor ?? null }}
                        />
                    </div>
                </div>
            )
        }

        const renderPanelAction = () => {
            const panelActionCls = `${prefixCls}-panel-action`
            return (
                <div class={panelActionCls}>
                    <Tooltip
                        title="关闭验证"
                        autoAdjustOverflow={false}
                        overlayClassName={`${prefixCls}-tooltip`}
                        color={props.themeColor}>
                        <CloseCircleOutlined onClick={closeModal} />
                    </Tooltip>

                    <Tooltip
                        title="刷新验证"
                        autoAdjustOverflow={false}
                        overlayClassName={`${prefixCls}-tooltip`}
                        color={props.themeColor}>
                        <ReloadOutlined onClick={refreshCaptcha} />
                    </Tooltip>

                    <Tooltip
                        title="帮助反馈"
                        autoAdjustOverflow={false}
                        overlayClassName={`${prefixCls}-tooltip`}
                        color={props.themeColor}>
                        <a href={params.target} target="_blank">
                            <QuestionCircleOutlined />
                        </a>
                    </Tooltip>
                </div>
            )
        }

        const renderPanelCopyright = () => {
            const copyrightCls = `${prefixCls}-copyright`
            return (
                <div class={copyrightCls}>
                    <div class={`${copyrightCls}-text`}>
                        <>
                            <a href={params.target} target="_blank">
                                <img src={params.avatar} alt={params.powered} />
                            </a>
                            <span>提供技术支持</span>
                        </>
                    </div>
                </div>
            )
        }

        return () => (
            <>
                {renderMask()}
                <Transition name={animation} appear={true}>
                    <div
                        class={`${prefixCls} ${langCls}${
                            !params.check.correct && params.check.show ? ` ${prefixCls}-error` : ''
                        }`}
                        style={{
                            top: `${$tools.convert2Rem(props.position.top)}`,
                            left: `${$tools.convert2Rem(props.position.left)}`
                        }}
                        v-show={show.value}
                        ref={modalRef}>
                        {renderArrow()}
                        {renderContent()}
                    </div>
                </Transition>
            </>
        )
    }
})
