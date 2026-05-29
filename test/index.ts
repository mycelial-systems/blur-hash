import { test } from '@substrate-system/tapzero'
import { waitFor } from '@substrate-system/dom'
import { BlurHash } from '../src/index.js'
import { decodeDimensions } from '../src/decode-dimensions.js'

BlurHash.define()

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
