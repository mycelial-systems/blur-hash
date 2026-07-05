import { WebComponent } from '@substrate-system/web-component'
import { decode } from 'blurhash'
import { render } from './html.js'
import { decodeDimensions } from './decode-dimensions.js'

// for docuement.querySelector
declare global {
    interface HTMLElementTagNameMap {
        'blur-hash':BlurHash
    }
}

export type ImgAttrs = {
    alt:string;
    width:string|number;
    height:string|number;
    placeholder:string;
    src:string;
    srcset?:string|null;
    sizes?:string|null;
    time?:number;
    contentVisibility?:'visible'|'auto'|'hidden'|null;
    decoding?:'sync'|'async'|'auto'|null;
    loading?:'lazy'|'eager'|'auto'|null;
}

export class BlurHash extends WebComponent.create('blur-hash') {
    time:number
    rafId:number|null = null

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

        this.innerHTML = BlurHash.html(Object.assign(attrs, { width, height }))

        const { placeholder, src: newSrc } = attrs

        this.scheduleDecode(placeholder, width, height)

        this.setAttribute('src', newSrc)
        this.setAttribute('placeholder', placeholder)

        const img = this.querySelector('img')!
        if (attrs.srcset) img.setAttribute('srcset', attrs.srcset)
        if (attrs.sizes) img.setAttribute('sizes', attrs.sizes)

        this.sharpen()
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
    }

    sharpen () {
        const img = this.qs('img')!
        const toSharp = () => {
            img.classList.remove('blurry')
            img.classList.add('sharp')
        }

        if (img.complete && img.naturalWidth > 0) {
            // The image is already decoded, so the class swap would run in
            // this same task -- before the browser ever paints the .blurry
            // (opacity:0) frame, and a CSS transition needs that start frame
            // to have painted or it does not run. Defer behind a double rAF
            // so one .blurry frame is rendered first; then the opacity fade
            // runs. A single rAF is not enough: it fires before the current
            // frame paints.
            requestAnimationFrame(() => requestAnimationFrame(toSharp))
        } else {
            // Still loading: the swap is deferred to `load`, which fires in a
            // later task after the .blurry frame has already painted.
            img.addEventListener('load', toSharp)
        }
    }

    connectedCallback () {
        const width = parseInt(this.getAttribute('width') ?? '')
        const height = parseInt(this.getAttribute('height') ?? '')
        const placeholder = this.getAttribute('placeholder')
        if (!placeholder) throw new Error('Missing placeholder')
        if (!width) throw new Error('Missing width')
        if (!height) throw new Error('Missing height')

        // don't render again if we dont have to
        if (!this.innerHTML) {
            this.innerHTML = this.render()
        }

        this.scheduleDecode(placeholder, width, height)
        this.sharpen()
    }

    static html (attrs:ImgAttrs & { classes?:string }) {
        return render(attrs)
    }

    /**
     * Use the attributes to create HTML.
     */
    render ():string {
        const srcset = this.getAttribute('srcset')
        const width = this.getAttribute('width')
        const height = this.getAttribute('height')
        const time = this.getAttribute('time')
        const classes = this.classList.toString()
        const placeholder = this.getAttribute('placeholder')
        this.time = time ? parseInt(time) : 800
        const src = this.getAttribute('src')
        const alt = this.getAttribute('alt')
        if (!placeholder) throw new Error('not placeholder')
        if (!width || !height) throw new Error('not width or not height')
        if (!src) throw new Error('Not src')
        if (!alt) throw new Error('Not alt')

        return BlurHash.html({
            classes,
            srcset,
            width,
            height,
            src,
            alt,
            placeholder
        })
    }
}
