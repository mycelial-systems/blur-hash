import { test } from '@substrate-system/tapzero'
import { waitFor } from '@substrate-system/dom'
import css from '../src/index.css'
import { outerHTML } from '../src/html.js'
import { BlurHash } from '../src/index.js'
import { decodeDimensions } from '../src/decode-dimensions.js'

// Inject the stylesheet before any element is defined, so the
// `blur-hash:defined` rules apply once the tests define the element.
const styles = document.createElement('style')
styles.textContent = css
document.head.appendChild(styles)

const PLACEHOLDER = 'UHGIM_X900xC~XWFE0xt00o3%1oz-;t7i|IV'

// 1x1 PNG, used by the reveal tests
const PNG_1X1 = 'data:image/png;base64,' +
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk' +
    'YAAAAAYAAjCB0C8AAAAASUVORK5CYII='

// A distinct 2x1 PNG
const PNG_2X1 = 'data:image/png;base64,' +
    'iVBORw0KGgoAAAANSUhEUgAAAAIAAAABCAYAAAD0In+KAAAADklEQVR4nGP4z8AA' +
    'Qv8BD/kD/YURmXYAAAAASUVORK5CYII='

const GIF = 'data:image/gif;base64,' +
    'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'

function mount (html:string):HTMLElement {
    const wrap = document.createElement('div')
    wrap.innerHTML = html
    document.body.appendChild(wrap)
    return wrap
}

function hostOf (wrap:HTMLElement):BlurHash {
    return wrap.querySelector('blur-hash') as BlurHash
}

function opacityOf (el:Element):string {
    return getComputedStyle(el).opacity
}

// Bailout for a wait that a regression would leave hanging. It must stay
// below tapout's idle auto-finish (1000ms for the default 5000ms run
// timeout). A longer wait lets tapout end the run silently, with exit 0,
// before the failure is reported.
const BAILOUT_MS = 800

// Resolve true when the promise settles, or false after BAILOUT_MS.
function settlesInTime (p:Promise<unknown>):Promise<boolean> {
    return new Promise(resolve => {
        const timer = setTimeout(() => resolve(false), BAILOUT_MS)
        p.then(() => {
            clearTimeout(timer)
            resolve(true)
        })
    })
}

// waitFor, bounded by BAILOUT_MS. A timeout resolves null instead of
// rejecting: a thrown error stops tapzero with no `not ok` line, so the
// caller asserts the result and the failure is reported by name.
function waitBounded (
    selector:string,
    args:{ visible?:boolean } = {},
    lambda?:() => Element|null
):Promise<HTMLElement|null> {
    return waitFor(selector, { ...args, timeout: BAILOUT_MS }, lambda)
        .catch(() => null)
}

// Decode an image so it is in the document's list of available images,
// which makes a later <img> with the same src complete synchronously.
async function preload (src:string):Promise<void> {
    const img = new Image()
    img.src = src
    await img.decode()
}

test('before define, the stylesheet leaves the SSR img visible', t => {
    const wrap = mount(outerHTML({ src: PNG_2X1, alt: '' }))
    const img = wrap.querySelector('img')!
    t.equal(opacityOf(img), '1', 'img is not hidden before define')
    wrap.remove()
    BlurHash.define()
})

// Resolve true once the canvas bottom-right pixel is painted, or false
// after BAILOUT_MS. If the canvas buffer size did not match the ImageData
// size, putImageData would fill only a corner and this pixel would stay
// transparent. The cap is a per-frame-polled bailout, not a fixed sleep.
function waitForPaint (canvas:HTMLCanvasElement):Promise<boolean> {
    return new Promise(resolve => {
        const ctx = canvas.getContext('2d')!
        const start = Date.now()
        const check = () => {
            const x = canvas.width - 1
            const y = canvas.height - 1
            if (ctx.getImageData(x, y, 1, 1).data[3] > 0) return resolve(true)
            if (Date.now() - start > BAILOUT_MS) return resolve(false)
            requestAnimationFrame(check)
        }
        check()
    })
}

test('BlurHash as HTML element', async t => {
    document.body.innerHTML += `
        <blur-hash
            class="test"
            alt="test image"
            width=30
            height=30
            src="/100.jpg"
            placeholder="UHGIM_X900xC~XWFE0xt00o3%1oz-;t7i|IV"
        ></blur-hash>
    `

    const el = await waitFor('blur-hash')

    t.ok(el, 'should find the element')
    t.ok(await waitFor('blur-hash canvas'), 'should contain a canvas')
})

test('decodeDimensions caps the long edge to 32', t => {
    t.deepEqual(decodeDimensions(1200, 630), { width: 32, height: 17 },
        'wide image caps the long edge, aspect preserved')
    t.deepEqual(decodeDimensions(630, 1200), { width: 17, height: 32 },
        'tall image caps the long edge, aspect preserved')
    t.deepEqual(decodeDimensions(1000, 1000), { width: 32, height: 32 },
        'square image caps symmetrically')
})

test('decodeDimensions floors the short edge at 1px', t => {
    t.deepEqual(decodeDimensions(2000, 10), { width: 32, height: 1 },
        'extreme aspect ratio never produces a zero edge')
})

test('decodeDimensions never upscales', t => {
    t.deepEqual(decodeDimensions(30, 30), { width: 30, height: 30 },
        'long edge at or below the cap is returned unchanged')
    t.deepEqual(decodeDimensions(20, 10), { width: 20, height: 10 },
        'small image is returned unchanged')
})

test('decodeDimensions honors a custom cap', t => {
    t.deepEqual(decodeDimensions(1200, 630, 64), { width: 64, height: 34 },
        'cap argument overrides the default of 32')
})

test('blur-hash decodes large dimensions at a capped canvas size', async t => {
    document.body.innerHTML += `
        <blur-hash
            id="big"
            alt="big image"
            width=1200
            height=630
            src="/100.jpg"
            placeholder="UHGIM_X900xC~XWFE0xt00o3%1oz-;t7i|IV"
        ></blur-hash>
    `
    const canvas = (await waitFor('#big canvas')) as HTMLCanvasElement
    t.equal(canvas.width, 32, 'canvas intrinsic width is capped to 32')
    t.equal(canvas.height, 17, 'canvas intrinsic height preserves aspect')
})

test('blur-hash paints the whole capped canvas buffer', async t => {
    // A source-less img never loads, so the placeholder timer is not
    // cancelled and the canvas gets painted.
    const wrap = mount(`
        <blur-hash
            id="painted"
            alt="painted"
            width=1200
            height=630
            delay="10"
            placeholder="UHGIM_X900xC~XWFE0xt00o3%1oz-;t7i|IV"
        >
            <canvas width="32" height="17"></canvas>
            <img alt="">
        </blur-hash>
    `)
    const canvas = hostOf(wrap).querySelector('canvas')!
    t.ok(await waitForPaint(canvas),
        'bottom-right pixel painted: buffer size == ImageData size')
    wrap.remove()
})

test('blur-hash leaves small dimensions unchanged', async t => {
    document.body.innerHTML += `
        <blur-hash
            id="small"
            alt="small image"
            width=30
            height=30
            src="/100.jpg"
            placeholder="UHGIM_X900xC~XWFE0xt00o3%1oz-;t7i|IV"
        ></blur-hash>
    `
    const canvas = (await waitFor('#small canvas')) as HTMLCanvasElement
    t.equal(canvas.width, 30, 'small canvas width is unchanged')
    t.equal(canvas.height, 30, 'small canvas height is unchanged')
})

test('reset twice in a tick: no throw, still paints', async t => {
    document.body.innerHTML += `
        <blur-hash
            id="resettwice"
            alt="reset"
            width="1200px"
            height="630px"
            src="/100.jpg"
            placeholder="UHGIM_X900xC~XWFE0xt00o3%1oz-;t7i|IV"
        ></blur-hash>
    `
    const el = (await waitFor('#resettwice')) as HTMLElement & {
        reset:(attrs:{ src:string; alt:string; placeholder:string }) => void;
    }

    let threw = false
    try {
        el.reset({
            src: '/100.jpg',
            alt: 'reset a',
            placeholder: 'UHGIM_X900xC~XWFE0xt00o3%1oz-;t7i|IV'
        })
        el.reset({
            src: '/100.jpg',
            alt: 'reset b',
            placeholder: 'UHGIM_X900xC~XWFE0xt00o3%1oz-;t7i|IV'
        })
    } catch (_err) {
        threw = true
    }

    t.ok(!threw, 'two resets in the same tick do not throw')
    t.ok(el.querySelector('canvas'), 'canvas is rendered after the resets')
    // /100.jpg 404s: the error state is reached and not overwritten
    const errored = await waitBounded('#resettwice[data-reveal="error"]')
    t.ok(errored, 'the last reset settles on error, not a stale state')
})

test('blur-hash removed before its frame fires does not throw', async t => {
    const host = document.createElement('div')
    host.innerHTML = `
        <blur-hash
            alt="ephemeral"
            width="1200px"
            height="630px"
            src="/100.jpg"
            placeholder="UHGIM_X900xC~XWFE0xt00o3%1oz-;t7i|IV"
        ></blur-hash>
    `
    document.body.appendChild(host)
    // Remove synchronously, before the scheduled decode frame can run.
    host.remove()
    // Wait one frame: the cancelled callback must NOT run or throw.
    await new Promise(resolve => requestAnimationFrame(() => resolve(null)))
    t.ok(true, 'mount + immediate remove did not throw')

    // Verify the canvas was not painted (stays transparent).
    const canvas = host.querySelector('canvas') as HTMLCanvasElement
    t.ok(canvas, 'canvas exists in detached element')
    const ctx = canvas.getContext('2d')!
    const alpha = ctx.getImageData(
        canvas.width - 1,
        canvas.height - 1,
        1,
        1
    ).data[3]
    t.equal(alpha, 0, 'detached element was not painted (callback bailed)')
})

test('a complete (cached) image is revealed immediately, ' +
'no blur flash', async t => {
    await preload(GIF)

    const wrap = mount(`
        <blur-hash
            id="cached"
            alt="cached image"
            width=30
            height=30
            src="${GIF}"
            placeholder="${PLACEHOLDER}"
        ></blur-hash>
    `)

    const el = hostOf(wrap)
    const img = el.querySelector('img')!
    t.equal(el.getAttribute('data-reveal'), 'instant',
        'cached image is in the instant state')
    t.equal(opacityOf(img), '1', 'cached image is visible with no blur')
    t.equal(el.hasAttribute('data-waited'), false,
        'cached image is not marked as animated')
    wrap.remove()
})

test('a slow-loading image shows the placeholder after `delay`, ' +
'then sharpens on load', async t => {
    const wrap = mount(`
        <blur-hash
            id="slow"
            alt="slow image"
            width=30
            height=30
            delay="10"
            placeholder="${PLACEHOLDER}"
        >
            <canvas width="30" height="30"></canvas>
            <img alt="">
        </blur-hash>
    `)

    const host = hostOf(wrap)
    const waiting = await waitBounded('#slow[data-reveal="waiting"]')
    t.ok(waiting, 'host enters waiting once the delay fires')
    const img = host.querySelector('img')!
    t.equal(opacityOf(img), '0', 'img stays hidden while waiting')

    t.ok(await waitForPaint(host.querySelector('canvas')!),
        'placeholder canvas is painted once the timer fires')

    img.src = PNG_1X1
    const done = await waitBounded('#slow[data-reveal="revealed"][data-waited]')
    t.ok(done, 'image sharpens on load after showing the placeholder')
    wrap.remove()
})

test('delay defaults to 100ms', async t => {
    document.body.innerHTML += `
        <blur-hash
            id="defaultdelay"
            alt="default delay"
            width=30
            height=30
            src="/100.jpg"
            placeholder="UHGIM_X900xC~XWFE0xt00o3%1oz-;t7i|IV"
        ></blur-hash>
    `

    const el = (await waitFor('#defaultdelay')) as BlurHash

    t.equal(el.delay, 100,
        'delay defaults to 100 when no attribute is set')
})

test('without a `delay` attribute, cached images skip blur ' +
'(default 100ms debounce)', async t => {
    await preload(GIF)

    const wrap = mount(`
        <blur-hash
            id="defaultcached"
            alt="cached image, default delay"
            width=30
            height=30
            src="${GIF}"
            placeholder="${PLACEHOLDER}"
        ></blur-hash>
    `)

    const el = hostOf(wrap)

    t.equal(el.delay, 100,
        'delay defaults to 100 when the attribute is absent')
    t.equal(el.getAttribute('data-reveal'), 'instant',
        'cached image skips the blur state')
    t.equal(el.hasAttribute('data-waited'), false,
        'cached image is not marked as animated')
    wrap.remove()
})

test('AC2.1: a host waiting on its image reports pending', t => {
    const wrap = mount(`
        <blur-hash id="pending" alt="" delay="60000">
            <img alt="">
        </blur-hash>
    `)
    const el = hostOf(wrap)
    t.equal(el.getAttribute('data-reveal'), 'pending',
        'state is pending before the delay')
    t.equal(opacityOf(el.querySelector('img')!), '0',
        'img is hidden while pending')
    wrap.remove()
})

test('AC2.1: after the delay, fill mode shows the --blur-hash-fill ' +
'background', async t => {
    const wrap = mount(`
        <blur-hash
            id="waiting"
            alt=""
            delay="10"
            style="--blur-hash-fill: rgb(1, 2, 3)"
        >
            <img alt="">
        </blur-hash>
    `)
    const el = hostOf(wrap)
    const waiting = await waitBounded('#waiting[data-reveal="waiting"]')
    t.ok(waiting, 'state moves to waiting after the delay')
    t.equal(opacityOf(el.querySelector('img')!), '0', 'img is still hidden')
    t.equal(getComputedStyle(el).backgroundColor, 'rgb(1, 2, 3)',
        'fill color is shown while waiting')
    wrap.remove()
})

test('AC2.1: a waited reveal is marked data-waited when it loads',
    async t => {
        const wrap = mount(`
            <blur-hash id="revealed" alt="" delay="10">
                <img alt="">
            </blur-hash>
        `)
        const waiting = await waitBounded('#revealed[data-reveal="waiting"]')
        t.ok(waiting, 'host reached waiting before the image was set')
        wrap.querySelector('img')!.src = PNG_1X1
        const done = await waitBounded(
            '#revealed[data-reveal="revealed"][data-waited]'
        )
        t.ok(done, 'reveal is marked data-waited after loading')
        wrap.remove()
    })

test('AC2.2: a preloaded src is revealed instantly with no transition',
    async t => {
        await preload(PNG_2X1)

        const wrap = mount(`
            <blur-hash id="instant" alt="" src="${PNG_2X1}"></blur-hash>
        `)
        const el = hostOf(wrap)
        const img = el.querySelector('img')!
        t.equal(el.getAttribute('data-reveal'), 'instant',
            'state is instant for a complete image')
        t.equal(opacityOf(img), '1', 'img is visible immediately')
        t.equal(getComputedStyle(img).transitionDuration, '0s',
            'instant reveal has no transition')
        wrap.remove()
    })

test('a reveal that loads before the delay has no transition', async t => {
    // Not used by any other test, so the img goes through `load`, not
    // `instant`. The 60000ms delay never fires before the load does.
    const svg = 'data:image/svg+xml,' + encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" width="3" height="1"/>'
    )
    const wrap = mount(`
        <blur-hash id="nowait" alt="" delay="60000">
            <img alt="">
        </blur-hash>
    `)
    const img = wrap.querySelector('img')!
    img.src = svg
    const revealed = await waitBounded('#nowait[data-reveal="revealed"]', {
        visible: false
    })
    t.ok(revealed, 'host is revealed after the load')
    t.equal(hostOf(wrap).hasAttribute('data-waited'), false,
        'a reveal before the delay is not marked data-waited')
    t.equal(getComputedStyle(img).transitionDuration, '0s',
        'a reveal before the delay has no transition')
    // Removing the host makes its pending delay timer a no-op
    wrap.remove()
})

test('AC2.3: fill mode with no width or height renders without a canvas',
    t => {
        // A throw in connectedCallback is reported as a window error event
        const errors:Event[] = []
        const onError = (ev:Event) => { errors.push(ev) }
        window.addEventListener('error', onError)
        const wrap = mount(`
            <blur-hash id="fill" alt="" src="${PNG_1X1}"></blur-hash>
        `)
        window.removeEventListener('error', onError)

        t.equal(errors.length, 0, 'appending a fill-mode host does not throw')
        const el = hostOf(wrap)
        t.ok(el.getAttribute('data-reveal'),
            'connectedCallback ran and set a reveal state')
        t.ok(el.querySelector('img'), 'the img is rendered')
        t.equal(el.querySelector('canvas'), null,
            'no canvas is rendered in fill mode')
        wrap.remove()
    })

test('AC2.4: a rejected decode still reveals', async t => {
    const original = HTMLImageElement.prototype.decode
    HTMLImageElement.prototype.decode = () => {
        return Promise.reject(new Error('stub decode rejection'))
    }

    try {
        const wrap = mount(`
            <blur-hash id="reject" alt="" delay="10">
                <img alt="">
            </blur-hash>
        `)
        wrap.querySelector('img')!.src = PNG_1X1
        const done = await waitBounded('#reject[data-reveal="revealed"]')
        t.ok(done, 'a decode rejection still moves to revealed')
        wrap.remove()
    } finally {
        HTMLImageElement.prototype.decode = original
    }
})

test('AC2.5: a failed load sets data-reveal error and hides the img',
    async t => {
        let errorEvents = 0
        const wrap = document.createElement('div')
        wrap.addEventListener('error', () => { errorEvents++ }, true)
        wrap.innerHTML = `
            <blur-hash id="broken" alt="" loading="eager"
                src="/does-not-exist.png"></blur-hash>
        `
        document.body.appendChild(wrap)

        const el = await waitBounded('#broken[data-reveal="error"]', {
            visible: false
        })
        t.ok(el, 'state is error after a failed load')
        t.ok(errorEvents > 0,
            'a capturing error listener on an ancestor is called')
        t.equal(opacityOf(wrap.querySelector('img')!), '0',
            'img stays hidden on error')
        wrap.remove()
    })

test('passthrough: referrerpolicy and crossorigin reach the img', t => {
    const wrap = mount(`
        <blur-hash
            id="pass"
            alt=""
            src="${PNG_1X1}"
            referrerpolicy="no-referrer"
            crossorigin="anonymous"
        ></blur-hash>
    `)
    const img = hostOf(wrap).querySelector('img')!
    t.equal(img.referrerPolicy, 'no-referrer',
        'referrerpolicy is set on the img')
    t.equal(img.crossOrigin, 'anonymous',
        'crossorigin is set on the img')
    wrap.remove()
})

test('reset: a cached src is instant, and a stale load cannot flip it',
    async t => {
        const wrap = mount(`
            <blur-hash id="reset" alt="" delay="10">
                <img alt="">
            </blur-hash>
        `)
        const el = hostOf(wrap)
        const oldImg = wrap.querySelector('img')!
        // In flight: the old load is still pending when reset runs.
        oldImg.src = PNG_1X1
        el.reset({ src: PNG_2X1, alt: '' })
        t.equal(el.getAttribute('data-reveal'), 'instant',
            'reset to a cached src is instant')

        // Wait for the stale load, and for its decode callback to run
        await new Promise(resolve => {
            oldImg.addEventListener('load', resolve, { once: true })
        })
        await oldImg.decode().catch(() => {})
        t.equal(el.getAttribute('data-reveal'), 'instant',
            'the stale load did not flip the state')
        wrap.remove()
    })

test('reset: an old decode that settles after reset cannot reveal',
    async t => {
        // Control when decode settles, so reset can run after the old
        // img's load but before its decode resolves.
        const original = HTMLImageElement.prototype.decode
        let settleDecode:() => void = () => {}
        const oldDecode = new Promise<void>(resolve => {
            settleDecode = resolve
        })
        let onDecodeCalled:() => void = () => {}
        const decodeCalled = new Promise<void>(resolve => {
            onDecodeCalled = resolve
        })
        HTMLImageElement.prototype.decode = () => {
            onDecodeCalled()
            return oldDecode
        }

        try {
            const wrap = mount(`
                <blur-hash id="decode-window" alt="">
                    <img alt="">
                </blur-hash>
            `)
            const el = hostOf(wrap)
            wrap.querySelector('img')!.src = PNG_1X1
            t.ok(await settlesInTime(decodeCalled),
                'the old load called decode')

            // Uncached, so the new generation is pending
            el.reset({ src: '/decode-window.png', alt: '' })
            t.equal(el.getAttribute('data-reveal'), 'pending',
                'reset returns the state to pending')

            // The component's handlers on oldDecode were attached first,
            // so they run before this await resumes. Only microtasks run
            // in between, so no event from the new img can interleave.
            settleDecode()
            await oldDecode
            t.equal(el.getAttribute('data-reveal'), 'pending',
                'the old decode settling did not reveal the new image')
            wrap.remove()
        } finally {
            HTMLImageElement.prototype.decode = original
        }
    })

test('reset: an uncached src returns a settled host to pending',
    async t => {
        const wrap = mount(`
            <blur-hash id="repending" alt="" src="${PNG_1X1}"></blur-hash>
        `)
        const el = hostOf(wrap)
        // The PNG may already be cached, so the host can be `instant`
        // before any load event. Wait for a settled (non-pending) state.
        const settled = await waitBounded('#repending', { visible: false },
            () => {
                const host = document.querySelector<HTMLElement>(
                    '#repending'
                )
                const state = host?.getAttribute('data-reveal')
                return (state && state !== 'pending') ? host : null
            })
        t.ok(settled, 'host is settled before reset')

        el.reset({ src: '/reset-pending.png', alt: '' })
        t.equal(el.getAttribute('data-reveal'), 'pending',
            'reset returns the state to pending synchronously')
        wrap.remove()
    })

// Mount a host with an img, then replace that img with one that has no
// src. A src-less img never fires load or error, so the new generation's
// delay is the only thing that can settle the host. The old img is stale.
// The 300ms delay must stay below BAILOUT_MS.
function mountStaleImg ():{
    wrap:HTMLElement;
    el:BlurHash;
    oldImg:HTMLImageElement;
} {
    const wrap = mount(`
        <blur-hash id="stale" alt="" delay="300"
            src="/stale-old.png"></blur-hash>
    `)
    const el = hostOf(wrap)
    const oldImg = el.querySelector('img')!
    el.innerHTML = '<img alt="">'
    el.blurUp(null, 0, 0)
    return { wrap, el, oldImg }
}

test('stale load: a late load of a replaced img keeps the new delay',
    async t => {
        const { wrap, el, oldImg } = mountStaleImg()
        // The replaced img fires its load listener after reset
        oldImg.dispatchEvent(new Event('load'))
        t.equal(el.getAttribute('data-reveal'), 'pending',
            'the stale load did not change the state')
        const waiting = await waitBounded('#stale[data-reveal="waiting"]', {
            visible: false
        })
        t.ok(waiting, 'the new delay still moves the host to waiting')
        wrap.remove()
    })

test('stale error: a late error on a replaced img keeps the new delay',
    async t => {
        const { wrap, el, oldImg } = mountStaleImg()
        // The replaced img fires its error listener after reset
        oldImg.dispatchEvent(new Event('error'))
        t.equal(el.getAttribute('data-reveal'), 'pending',
            'the stale error did not change the state')
        const waiting = await waitBounded('#stale[data-reveal="waiting"]', {
            visible: false
        })
        t.ok(waiting, 'the new delay still moves the host to waiting')
        wrap.remove()
    })

test('time: a CSS --blur-hash-time applies when no time attribute is set',
    t => {
        const style = document.createElement('style')
        style.textContent = '#css-time { --blur-hash-time: 2s }'
        document.head.appendChild(style)
        const wrap = mount(`
            <blur-hash id="css-time" alt="" width="100px" height="100px"
                placeholder="${PLACEHOLDER}" src="/held-time.png"
                loading="lazy"></blur-hash>
        `)
        const canvas = hostOf(wrap).querySelector('canvas')!
        t.equal(getComputedStyle(canvas).transitionDuration, '2s',
            'the canvas uses the duration from the stylesheet')
        wrap.remove()
        style.remove()
    })

test('time: the time attribute overrides a CSS --blur-hash-time',
    t => {
        const style = document.createElement('style')
        style.textContent = '#attr-time { --blur-hash-time: 2s }'
        document.head.appendChild(style)
        const wrap = mount(`
            <blur-hash id="attr-time" alt="" width="100px" height="100px"
                time="300" placeholder="${PLACEHOLDER}"
                src="/held-time.png" loading="lazy"></blur-hash>
        `)
        const canvas = hostOf(wrap).querySelector('canvas')!
        t.equal(getComputedStyle(canvas).transitionDuration, '0.3s',
            'the time attribute wins over the stylesheet')
        wrap.remove()
        style.remove()
    })

test('all done', () => {
    // @ts-expect-error tests
    window.testsFinished = true
})
