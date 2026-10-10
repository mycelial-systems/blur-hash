import { test } from '@substrate-system/tapzero'
import { render, outerHTML, innerHTML } from '../src/html.js'

const HASH = 'UHGIM_X900xC~XWFE0xt00o3%1oz-;t7i|IV'

/**
 * Pull the opening tag for `name`, e.g. the `<img ...>` or the
 * `<blur-hash ...>` host. Attribute values are escaped, so the first `>`
 * closes the tag.
 */
function openTag (markup:string, name:string):string|null {
    const match = markup.match(new RegExp(`<${name}\\b[^>]*>`))
    return match ? match[0] : null
}

/**
 * Read one attribute value from an opening tag. Returns null when the
 * attribute is absent. The value is un-escaped, so it can be compared
 * with the original input.
 */
function attrValue (tag:string, attr:string):string|null {
    const match = tag.match(new RegExp(`\\s${attr}="([^"]*)"`))
    if (!match) return null
    return unescapeAttribute(match[1]!)
}

function unescapeAttribute (value:string):string {
    return value
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
}

test('render() without a placeholder does not throw', t => {
    const out = render({ src: 'a.jpg', alt: 'x' })
    t.ok(out.includes('<img'), 'emits an img')
    t.ok(!out.includes('<canvas'), 'fill mode emits no canvas')
})

test('outerHTML() without placeholder, width, height does not throw', t => {
    const out = outerHTML({ src: 'a.jpg', alt: '' })
    t.ok(openTag(out, 'blur-hash'), 'emits the host')
    t.ok(!out.includes('<canvas'), 'fill mode emits no canvas')
})

test('outerHTML() in placeholder mode emits a canvas and the hash', t => {
    const out = outerHTML({
        src: 'a.jpg',
        alt: 'x',
        placeholder: HASH,
        width: 30,
        height: 30
    })
    t.ok(out.includes('<canvas'), 'emits a canvas')

    const host = openTag(out, 'blur-hash')!
    t.equal(attrValue(host, 'placeholder'), HASH,
        'host placeholder attribute equals the hash')
})

test('attribute values are escaped on the img and the host', t => {
    const alt = 'a "quoted" <b>'
    const src = 'https://x.test/a.jpg?a=1&b="2"'
    const out = outerHTML({ src, alt })

    t.ok(!out.includes('"quoted"'), 'no raw quoted alt')
    t.ok(!out.includes('<b>'), 'no raw <b> tag')

    const img = openTag(out, 'img')!
    t.equal(attrValue(img, 'alt'), alt, 'img alt round-trips')
    t.equal(attrValue(img, 'src'), src, 'img src round-trips')

    const host = openTag(out, 'blur-hash')!
    t.equal(attrValue(host, 'alt'), alt, 'host alt round-trips')
    t.equal(attrValue(host, 'src'), src, 'host src round-trips')
})

test('classes becomes a class attribute on the host', t => {
    const out = outerHTML({ src: 'a.jpg', alt: 'x', classes: 'ok' })
    const host = openTag(out, 'blur-hash')!
    t.equal(attrValue(host, 'class'), 'ok', 'host has class="ok"')
    t.equal(attrValue(host, 'classes'), null, 'no classes attribute')
})

test('referrerpolicy passes through to host and img', t => {
    const out = outerHTML({
        src: 'a.jpg',
        alt: 'x',
        referrerpolicy: 'no-referrer'
    })

    t.equal(attrValue(openTag(out, 'blur-hash')!, 'referrerpolicy'),
        'no-referrer', 'host has referrerpolicy')
    t.equal(attrValue(openTag(out, 'img')!, 'referrerpolicy'),
        'no-referrer', 'img has referrerpolicy')
})

test('crossorigin passes through to host and img', t => {
    const out = outerHTML({
        src: 'a.jpg',
        alt: 'x',
        crossorigin: 'anonymous'
    })

    t.equal(attrValue(openTag(out, 'blur-hash')!, 'crossorigin'),
        'anonymous', 'host has crossorigin')
    t.equal(attrValue(openTag(out, 'img')!, 'crossorigin'),
        'anonymous', 'img has crossorigin')
})

test('innerHTML() emits the img only in fill mode', t => {
    const out = innerHTML({ src: 'a.jpg', alt: 'x' })
    t.ok(out.startsWith('<img'), 'starts with the img')
    t.ok(!out.includes('<canvas'), 'no canvas')
})

test('render() in node (no window) returns host-wrapped output', t => {
    const out = render({
        src: 'a.jpg',
        alt: 'x',
        placeholder: HASH,
        width: 30,
        height: 30
    })
    t.ok(out.startsWith('<blur-hash'), 'host wraps the output')
    t.ok(out.includes('<canvas'), 'includes the canvas')
})
