import { WebComponent } from '@substrate-system/web-component'
import { decode } from 'blurhash'
import { innerHTML } from './html.js'
import { decodeDimensions } from './decode-dimensions.js'

declare global {
    interface HTMLElementTagNameMap {
        'blur-hash':BlurHash
    }
}

export type ImgAttrs = {
    src:string;
    alt?:string|null;
    // Absent -> fill mode (no canvas)
    placeholder?:string|null;
    // Decode size of the placeholder canvas; only used with placeholder
    width?:string|number|null;
    height?:string|number|null;
    srcset?:string|null;
    sizes?:string|null;
    time?:string|number|null;
    delay?:string|number|null;
    contentVisibility?:'visible'|'auto'|'hidden'|null;
    decoding?:'sync'|'async'|'auto'|null;
    loading?:'lazy'|'eager'|'auto'|null;
    referrerpolicy?:ReferrerPolicy|null;
    crossorigin?:''|'anonymous'|'use-credentials'|null;
}

export class BlurHash extends WebComponent.create('blur-hash') {
    time:number
    rafId:number|null = null
    delay:number = 100
    blurTimer:ReturnType<typeof setTimeout>|null = null

    constructor () {
        super()
        const w = this.getAttribute('width')
        const h = this.getAttribute('height')
        const time = this.getAttribute('time')
        this.time = time ? parseInt(time) : 800

        this.style.width = '' + w
        this.style.height = '' + h

        document.body.style.setProperty('--blur-hash-time',
            time ? '.' + (parseInt(time) / 1000 + 's') : '0.8s')
    }

    /**
     * Change the image, and do the blur-up thing again.
     * Will use the existing width & height if they are not passed in.
     */
    reset (attrs:(Omit<Omit<ImgAttrs, 'width'>, 'height'> & {
        width?:string|number;
        height?:string|number;
    })):void {
        if (attrs.width) this.style.width = '' + attrs.width
        if (attrs.height) this.style.height = '' + attrs.height

        const width = (attrs.width ?
            (typeof attrs.width === 'string' ? parseInt(attrs.width, 10) : attrs.width) :
            parseInt(this.style.width, 10))
        const height = (attrs.height ?
            (typeof attrs.height === 'string' ? parseInt(attrs.height, 10) : attrs.height) :
            parseInt(this.style.height, 10))

        this.clearBlurTimer()

        this.innerHTML = BlurHash.html(Object.assign(attrs, { width, height }))

        const { placeholder, src: newSrc } = attrs

        this.setAttribute('src', newSrc)
        if (placeholder) {
            this.setAttribute('placeholder', placeholder)
        } else {
            this.removeAttribute('placeholder')
        }

        const img = this.querySelector('img')!
        if (attrs.srcset) img.setAttribute('srcset', attrs.srcset)
        if (attrs.sizes) img.setAttribute('sizes', attrs.sizes)

        this.blurUp(placeholder ?? null, width, height)
    }

    clearBlurTimer ():void {
        if (this.blurTimer !== null) {
            clearTimeout(this.blurTimer)
            this.blurTimer = null
        }
    }

    /**
     * Decode the placeholder and paint it to the canvas on the next frame.
     * Cancels any pending frame first, so a rapid re-call (e.g. a second
     * `reset`) never leaves a stale decode running. Bails if the element has
     * detached before the frame fires.
     */
    scheduleDecode (placeholder:string, width:number, height:number):void {
        if (this.rafId !== null) cancelAnimationFrame(this.rafId)

        const { width: dw, height: dh } = decodeDimensions(width, height)

        this.rafId = requestAnimationFrame(() => {
            this.rafId = null
            if (!this.isConnected) return
            const canvas = this.querySelector<HTMLCanvasElement>('canvas')
            if (!canvas) return
            const ctx = canvas.getContext('2d')
            if (!ctx) return
            const pixels = decode(placeholder, dw, dh)
            const imageData = ctx.createImageData(dw, dh)
            imageData.data.set(pixels)
            ctx.putImageData(imageData, 0, 0)
        })
    }

    disconnectedCallback ():void {
        if (this.rafId !== null) {
            cancelAnimationFrame(this.rafId)
            this.rafId = null
        }
        this.clearBlurTimer()
    }

    blurUp (placeholder:string|null, width:number, height:number):void {
        const img = this.qs('img')!

        if (img.complete && img.naturalWidth > 0) {
            img.classList.remove('blurry')
            return
        }

        let placeholderShown = false

        const onLoad = () => {
            this.clearBlurTimer()
            img.classList.remove('blurry')
            if (placeholderShown) img.classList.add('sharp')
        }
        img.addEventListener('load', onLoad, { once: true })

        this.blurTimer = setTimeout(() => {
            this.blurTimer = null
            if (!this.isConnected) return
            placeholderShown = true
            img.classList.add('blurry')
            if (placeholder) this.scheduleDecode(placeholder, width, height)
        }, this.delay)
    }

    connectedCallback () {
        const width = parseInt(this.getAttribute('width') ?? '')
        const height = parseInt(this.getAttribute('height') ?? '')
        const placeholder = this.getAttribute('placeholder')
        if (!placeholder) throw new Error('Missing placeholder')
        if (!width) throw new Error('Missing width')
        if (!height) throw new Error('Missing height')

        const d = this.getAttribute('delay')
        this.delay = d ? parseInt(d, 10) : 100

        // don't render again if we dont have to
        if (!this.innerHTML) {
            this.innerHTML = this.render()
        }

        this.blurUp(placeholder, width, height)
    }

    static html (attrs:ImgAttrs & { classes?:string|null }):string {
        return innerHTML(attrs)
    }

    /**
     * Use the attributes to create the children HTML.
     */
    render ():string {
        const src = this.getAttribute('src')
        if (!src) throw new Error('Not src')

        return BlurHash.html({
            src,
            alt: this.getAttribute('alt'),
            placeholder: this.getAttribute('placeholder'),
            width: this.getAttribute('width'),
            height: this.getAttribute('height'),
            srcset: this.getAttribute('srcset'),
            sizes: this.getAttribute('sizes'),
            loading: this.getAttribute('loading') as ImgAttrs['loading'],
            decoding: this.getAttribute('decoding') as ImgAttrs['decoding'],
            referrerpolicy: this.getAttribute('referrerpolicy') as
                ImgAttrs['referrerpolicy'],
            crossorigin: this.getAttribute('crossorigin') as
                ImgAttrs['crossorigin']
        })
    }
}
