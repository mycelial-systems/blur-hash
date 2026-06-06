import { test } from '@substrate-system/tapzero'
import { waitFor } from '@substrate-system/dom'
import { BlurHash } from '../src/index.js'
import { decodeDimensions } from '../src/decode-dimensions.js'

BlurHash.define()

// Resolve once the canvas bottom-right pixel is painted. If the canvas
// buffer size did not match the ImageData size, putImageData would fill
// only a corner and this pixel would stay transparent. The 4000ms cap is a
// per-frame-polled bailout ceiling, not a fixed sleep.
function waitForPaint (canvas:HTMLCanvasElement):Promise<void> {
    return new Promise((resolve, reject) => {
        const ctx = canvas.getContext('2d')!
        const start = Date.now()
        const check = () => {
            const x = canvas.width - 1
            const y = canvas.height - 1
            if (ctx.getImageData(x, y, 1, 1).data[3] > 0) return resolve()
            if (Date.now() - start > 4000) {
                return reject(new Error('timed out waiting for canvas paint'))
            }
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
    document.body.innerHTML += `
        <blur-hash
            id="painted"
            alt="painted"
            width=1200
            height=630
            src="/100.jpg"
            placeholder="UHGIM_X900xC~XWFE0xt00o3%1oz-;t7i|IV"
        ></blur-hash>
    `
    const canvas = (await waitFor('#painted canvas')) as HTMLCanvasElement
    await waitForPaint(canvas)
    t.ok(true, 'bottom-right pixel painted: buffer size == ImageData size')
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
    const canvas = (await waitFor('#resettwice canvas')) as HTMLCanvasElement
    await waitForPaint(canvas)
    t.ok(true, 'canvas is painted after a rapid double reset')
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

test('a complete image defers the sharpen swap (cross-fade)', async t => {
    // A 1x1 transparent GIF decodes from the data URI itself, so it becomes
    // `complete` without the (image-less) tapout server, unlike a network
    // src which 404s here.
    const dataUri = 'data:image/gif;base64,' +
        'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'

    document.body.innerHTML += `
        <blur-hash
            id="cached"
            alt="cached image"
            width=30
            height=30
            src="${dataUri}"
            placeholder="UHGIM_X900xC~XWFE0xt00o3%1oz-;t7i|IV"
        ></blur-hash>
    `

    const el = (await waitFor('#cached')) as BlurHash
    const img = (await waitFor('#cached img')) as HTMLImageElement

    // Drive the image to a known, fully-decoded state, then reset the reveal
    // classes so sharpen() starts from a clean blurry frame.
    await img.decode()
    img.classList.add('blurry')
    img.classList.remove('sharp')

    el.sharpen()

    // The fix defers the class swap behind a double rAF so the browser paints
    // the opacity:0 (blurry) frame before opacity:1 (sharp) is applied --
    // otherwise the opacity transition never runs. The buggy version swapped
    // synchronously right here.
    t.ok(img.classList.contains('blurry'),
        'complete image is still blurry right after sharpen (deferred)')
    t.ok(!img.classList.contains('sharp'),
        'complete image is not sharpened synchronously')

    // Let the two scheduled frames (plus a margin) elapse.
    await new Promise(resolve => {
        requestAnimationFrame(() =>
            requestAnimationFrame(() =>
                requestAnimationFrame(() => resolve(null))))
    })

    t.ok(img.classList.contains('sharp'),
        'image becomes sharp after the blurry frame has painted')
    t.ok(!img.classList.contains('blurry'),
        'blurry class is removed once sharpened')
})

test('all done', () => {
    // @ts-expect-error tests
    window.testsFinished = true
})
