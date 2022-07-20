import { defineComponent, ref, reactive, onMounted, onBeforeUnmount, Transition } from 'vue'
import { Tooltip } from 'ant-design-vue'
import { CloseCircleOutlined, ReloadOutlined, QuestionCircleOutlined } from '@ant-design/icons-vue'
import { getPrefixCls } from '../utils/props-tools'
import { $tools } from '../utils/tools'
import { $g } from '../utils/global'
import { $request } from '../utils/request'
import { captchaModalProps } from './props'

const BACKGROUND = 'https://file.makeit.vip/MIIT/M00/00/00/ajRkHV7d0JOAJYSMAAFwUxGzMIc287.jpg'
const POWERED = 'Powered By makeit.vip'
const AVATAR = 'https://file.makeit.vip/MIIT/M00/00/00/ajRkHV_pUyOALE2LAAAtlj6Tt_s370.png'
const TARGET = 'https://admin.makeit.vip/components/captcha'

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
                width: 260,
                height: 160
            },
            block: {
                size: 42,
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
                tries: props.maxTries ?? 5,
                num: 0,
                correct: false,
                show: false,
                tip: null,
                being: false,
                value: null
            },
            _background: null
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
            const image = imageRef.value as HTMLCanvasElement | null
            const block = blockRef.value as HTMLCanvasElement | null
            const imageCtx = image ? image.getContext('2d') : null
            const blockCtx = block ? block.getContext('2d') : null
            params.ctx = { image: imageCtx, block: blockCtx }
            /**
             * 图片统一转为 base64, 避免跨域问题.
             * 也可采用xhr异步请求图片地址.
             * ```
             * if (this.$g.regExp.url.test(this.background)) {
             *     const xhr = new XMLHttpRequest();
             *     xhr.onload = function() {
             *         if (this.status === 200) {
             *             // 注意 this 指向.
             *             const url = URL.createObjectURL(this.response);
             *             vm.background = url;
             *             vm.initImageElem();
             *             // ...
             *             URL.revokeObjectURL(url);
             *         }
             *     }
             *     xhr.open('GET', this.background, true);
             *     xhr.responseType = 'blob';
             *     xhr.send();
             * } else {
             *     this.initImageElem();
             * }
             * ```
             */
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
                params.ctx.block.save()
                params.ctx.block.globalCompositeOperation = 'destination-over'
                drawBlockPosition()
                params.ctx.block.drawImage(elem, 0, 0, params.size.width, params.size.height)
                /** image data */
                const coordinateY = params.coordinate.y - params.block.radius * 2 + 1
                const imageData = params.ctx.block.getImageData(
                    params.coordinate.x,
                    coordinateY,
                    params.block.real,
                    params.block.real
                )
                const block = blockRef.value as HTMLCanvasElement | null
                if (block) block.width = params.block.real
                params.ctx.block.putImageData(imageData, params.coordinate.offset, coordinateY)
                params.ctx.block.restore()
                params.loading = false
            }
        }

        const initImageElem = () => {
            const elem = new Image()
            elem.src = params._background
            elem.onload = () => initImage(elem)
        }

        const drawBlock = (
            ctx: CanvasRenderingContext2D,
            direction: any = {},
            operation: string
        ) => {
            ctx.beginPath()
            ctx.moveTo(params.coordinate.x, params.coordinate.y)
            const direct = direction.direction
            const type = direction.type
            /** top */
            if (direct === 'top') {
                ctx.arc(
                    params.coordinate.x + params.block.size / 2,
                    params.coordinate.y,
                    params.block.radius,
                    -params.block.PI,
                    0,
                    type === 'inner'
                )
            }
            ctx.lineTo(params.coordinate.x + params.block.size, params.coordinate.y)
            /** right */
            if (direct === 'right') {
                ctx.arc(
                    params.coordinate.x + params.block.size,
                    params.coordinate.y + params.block.size / 2,
                    params.block.radius,
                    1.5 * params.block.PI,
                    0.5 * params.block.PI,
                    type === 'inner'
                )
            }
            ctx.lineTo(
                params.coordinate.x + params.block.size,
                params.coordinate.y + params.block.size
            )
            /** bottom */
            ctx.arc(
                params.coordinate.x + params.block.size / 2,
                params.coordinate.y + params.block.size,
                params.block.radius,
                0,
                params.block.PI,
                true
            )
            ctx.lineTo(params.coordinate.x, params.coordinate.y + params.block.size)
            /** left */
            ctx.arc(
                params.coordinate.x,
                params.coordinate.y + params.block.size / 2,
                params.block.radius,
                0.5 * params.block.PI,
                1.5 * params.block.PI,
                true
            )
            ctx.lineTo(params.coordinate.x, params.coordinate.y)
            ctx.shadowColor = 'rgba(0, 0, 0, .001)'
            ctx.shadowBlur = 20
            ctx.lineWidth = 1.5
            ctx.fillStyle = 'rgba(0, 0, 0, .4)'
            ctx.strokeStyle = 'rgba(255, 255, 255, .8)'
            ctx.stroke()
            ctx.closePath()
            ctx[operation]()
        }

        const drawBlockPosition = () => {
            const x = $tools.randomNumberInRange(
                params.block.real + 20,
                params.size.width - (params.block.real + 20)
            )
            const y = $tools.randomNumberInRange(55, params.size.height - 55)
            const direction = drawBlockDirection()
            params.coordinate.x = x
            params.coordinate.y = y
            drawBlock(params.ctx.image, direction, 'fill')
            drawBlock(params.ctx.block, direction, 'clip')
        }

        const drawBlockDirection = () => {
            const direction = { top: 'top', right: 'right' }
            const from = ['inner', 'outer']
            const result: any = {}
            const keys = Object.keys(direction)
            const key = keys[Math.floor(Math.random() * keys.length)]
            result.direction = direction[key]
            result.type = from[Math.floor(Math.random() * from.length)]
            return result
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
                }, 1000)
                params.check.num++
                params.check.correct = false
                if (msg) params.check.tip = msg
            }
            if (params.coordinate.x - 2 <= coordinateX && params.coordinate.x + 2 >= coordinateX) {
                const succcess = (data: any = {}) => {
                    setTimeout(() => {
                        closeModal('success', data)
                    }, 500)
                }
                const take = Math.round((params.time.end - params.time.start) / 10) / 100
                params.check.tip = `${take}s速度完成图片拼合验证`
                if (props.verifyAction) {
                    await $request[props.verifyMethod.toLowerCase()](
                        props.verifyAction,
                        props.verifyParams
                    )
                        .then((res: any) => {
                            if (res.ret.code === 200) {
                                params.check.correct = true
                                succcess(res.data)
                            } else error(res.ret.message)
                        })
                        .catch((err: any) => {
                            error(err.message)
                        })
                } else {
                    params.check.correct = true
                    succcess()
                }
            } else error()
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
                        width={params.size.width}
                        height={params.size.height}
                        ref={imageRef}></canvas>
                    <canvas
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
