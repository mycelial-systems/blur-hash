import { toAttributes } from '@substrate-system/web-component/attributes'
import type { ImgAttrs } from './index.js'
import { decodeDimensions } from './decode-dimensions.js'

export type SSRAttrs = ImgAttrs & { classes?:string }

export function render (attrs:SSRAttrs) {
    const {
        width,
        height,
        alt,
        contentVisibility,
        placeholder,
        decoding,
        loading,
        srcset,
        sizes,
        src
    } = attrs

    if (!placeholder) throw new Error('not placeholder')

    const decodeWidth = typeof width === 'string' ? parseInt(width, 10) : width
    const decodeHeight = typeof height === 'string' ?
        parseInt(height, 10) :
        height
    const decodeSize = decodeDimensions(decodeWidth, decodeHeight)

    const htmlString = `<canvas
        alt="${alt}"
        width=${decodeSize.width}
        height=${decodeSize.height}
        class="blurry"
    ></canvas>

    <img class="blurry"
        alt="${alt}"
        content-visibility="${contentVisibility || 'auto'}"
        decoding="${decoding || 'async'}"
        loading="${loading || 'lazy'}"
        ${srcset ? `srcset="${srcset}"` : ''}
        ${sizes ? `sizes="${sizes}"` : ''}
        src="${src}"
    />`

    const attributeString = toAttributes(attrs)

    // running in node?
    return typeof window === 'undefined' ?
        `<blur-hash ${attributeString}>
            ${htmlString}
        </blur-hash>` :
        htmlString
}

export const outerHTML = (attrs:SSRAttrs) => {
    return `<blur-hash>${render(attrs)}</blur-hash>`
}
