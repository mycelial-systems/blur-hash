import { test } from '@substrate-system/tapzero'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { isBlurhashValid } from 'blurhash'
import { createBlurhash } from '../bin/index.js'
import { encodeImage } from '../bin/photon.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const IMG = path.join(__dirname, '..', 'example', '100.jpg')

test('createBlurhash from a file', async t => {
    const result = await createBlurhash(IMG)

    t.equal(typeof result.hash, 'string', 'hash is a string')
    t.ok(isBlurhashValid(result.hash).result,
        'hash is a valid blurhash')
    t.equal(result.width, 750, 'width is the original image width')
    t.equal(result.height, 600, 'height is the original image height')
    t.equal(result.hash, 'UQGudvt700t3~XbIE1xt9Hazs:of.8s:V[Rj',
        'returns the expected (regenerated) hash')
})

test('encodeImage from raw bytes', async t => {
    const bytes = new Uint8Array(await readFile(IMG))
    const result = await encodeImage(bytes)

    t.equal(typeof result.hash, 'string', 'hash is a string')
    t.ok(isBlurhashValid(result.hash).result,
        'hash is a valid blurhash')
    t.equal(result.width, 750, 'width matches the file width')
    t.equal(result.height, 600, 'height matches the file height')
    t.equal(result.hash, 'UQGudvt700t3~XbIE1xt9Hazs:of.8s:V[Rj',
        'same hash as createBlurhash')
})

test('encodeImage rejects undecodable bytes', async t => {
    try {
        await encodeImage(new Uint8Array([0, 1, 2, 3]))
        t.fail('should throw on bytes that are not a decodable image')
    } catch (_err) {
        t.ok(true, 'rejects/throws on undecodable input')
    }
})
