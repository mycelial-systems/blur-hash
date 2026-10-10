import type { ImgAttrs } from './index.js'
import { decodeDimensions } from './decode-dimensions.js'

export type SSRAttrs = ImgAttrs & { classes?:string|null }

/**
 * Escape a value for use inside a double-quoted HTML attribute.
 */
export function escapeAttribute (value:string|number):string {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
}

function attr (
    name:string,
    value:string|number|null|undefined
):string {
    if (value === null || value === undefined) return ''
    return ` ${name}="${escapeAttribute(value)}"`
}

function toInt (value:string|number|null|undefined):number {
    if (typeof value === 'number') return value
    return value ? parseInt(value, 10) : NaN
}

/**
 * Children of <blur-hash>: a <canvas> in placeholder mode, then the <img>.
 * Fill mode (no placeholder) emits no canvas.
 */
export function innerHTML (attrs:SSRAttrs):string {
    const { placeholder, src } = attrs
    if (!src) throw new Error('Not src')

    let canvas = ''
    if (placeholder) {
        const width = toInt(attrs.width)
        const height = toInt(attrs.height)
        if (!width || !height) {
            throw new Error('not width or not height')
        }
        const size = decodeDimensions(width, height)
        canvas = `<canvas width="${size.width}" ` +
            `height="${size.height}"></canvas>`
    }

    return canvas + '<img' +
        attr('alt', attrs.alt ?? '') +
        attr('content-visibility', attrs.contentVisibility || 'auto') +
        attr('decoding', attrs.decoding || 'async') +
        attr('loading', attrs.loading || 'lazy') +
        attr('srcset', attrs.srcset || null) +
        attr('sizes', attrs.sizes || null) +
        attr('referrerpolicy', attrs.referrerpolicy || null) +
        attr('crossorigin', attrs.crossorigin ?? null) +
        attr('src', src) +
        '>'
}

/**
 * The <blur-hash> host with escaped attributes, around innerHTML.
 * Same output in every environment.
 */
export function outerHTML (attrs:SSRAttrs):string {
    const hasPlaceholder = !!attrs.placeholder
    const host = attr('class', attrs.classes || null) +
        attr('placeholder', attrs.placeholder || null) +
        attr('width', hasPlaceholder ? (attrs.width ?? null) : null) +
        attr('height', hasPlaceholder ? (attrs.height ?? null) : null) +
        attr('src', attrs.src) +
        attr('alt', attrs.alt ?? '') +
        attr('time', attrs.time ?? null) +
        attr('delay', attrs.delay ?? null) +
        attr('loading', attrs.loading || null) +
        attr('decoding', attrs.decoding || null) +
        attr('srcset', attrs.srcset || null) +
        attr('sizes', attrs.sizes || null) +
        attr('referrerpolicy', attrs.referrerpolicy || null) +
        attr('crossorigin', attrs.crossorigin ?? null)

    return `<blur-hash${host}>${innerHTML(attrs)}</blur-hash>`
}

/**
 * Host-wrapped markup outside a browser (no `window`), children only in
 * a browser. Kept for compatibility; prefer `outerHTML` for SSR.
 */
export function render (attrs:SSRAttrs):string {
    return typeof window === 'undefined' ?
        outerHTML(attrs) :
        innerHTML(attrs)
}
