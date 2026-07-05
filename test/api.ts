import { test } from '@substrate-system/tapzero'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { readFile } from 'node:fs/promises'
import { isBlurhashValid } from 'blurhash'
import { createString } from '../bin/index.js'
import { encodeImage } from '../bin/photon.js'
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

test('Create the hash string', async t => {
    const hash = await createString(
        path.join(__dirname, '..', 'example', '100.jpg'),
    )

    t.equal(typeof hash, 'string', 'should return a string')
    t.equal(hash, 'UHGIM_X900xC~XWFE0xt00o3%1oz-;t7i|IV',
        'should return the expected string')
})

test('encodeImage from raw bytes', async t => {
    const bytes = new Uint8Array(
        await readFile(path.join(__dirname, '..', 'example', '100.jpg'))
    )
    const result = await encodeImage(bytes)

    t.equal(typeof result.hash, 'string', 'hash is a string')
    t.ok(isBlurhashValid(result.hash).result,
        'hash is a valid blurhash')
    t.equal(result.width, 750, 'width is the original image width')
    t.equal(result.height, 600, 'height is the original image height')
    t.equal(result.hash, 'UQGudvt700t3~XbIE1xt9Hazs:of.8s:V[Rj',
        'returns the expected (regenerated) hash')
})

test('encodeImage rejects undecodable bytes', async t => {
    try {
        await encodeImage(new Uint8Array([0, 1, 2, 3]))
        t.fail('should throw on bytes that are not a decodable image')
    } catch (_err) {
        t.ok(true, 'rejects/throws on undecodable input')
    }
})
