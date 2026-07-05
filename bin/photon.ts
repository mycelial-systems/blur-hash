import { encode } from 'blurhash'
import {
    PhotonImage,
    SamplingFilter,
    resize
} from '@cf-wasm/photon'

//
// The blurhash is computed from a small resized copy of the image. 32x32 is
// enough detail for a 4x4-component blurhash and keeps WASM memory tiny.
//
const BLURHASH_SIZE = 32
const COMPONENTS = 4

/**
 * The result of blurhash encoding: the hash string and original image
 * dimensions.
 */
export type BlurhashResult = {
    hash:string;
    width:number;
    height:number;
}

/**
 * Decode raw image bytes and produce a blurhash string plus the original
 * image's dimensions. Runtime-agnostic: the plain `@cf-wasm/photon` specifier
 * resolves to the `node` build under Node and the `workerd` build under
 * wrangler, so this runs unchanged in both.
 *
 * Throws if the bytes cannot be decoded as an image.
 */
export async function encodeImage (
    bytes:Uint8Array
):Promise<BlurhashResult> {
    let original:PhotonImage|null = null
    let resized:PhotonImage|null = null

    try {
        original = PhotonImage.new_from_byteslice(bytes)
        const width = original.get_width()
        const height = original.get_height()

        resized = resize(
            original,
            BLURHASH_SIZE,
            BLURHASH_SIZE,
            SamplingFilter.Nearest
        )

        //
        // get_raw_pixels() returns an owned RGBA copy (4 bytes/pixel), so it
        // stays valid after free(). blurhash.encode requires Uint8ClampedArray.
        //
        const raw = resized.get_raw_pixels()
        const pixels = new Uint8ClampedArray(
            raw.buffer,
            raw.byteOffset,
            raw.byteLength
        )

        const hash = encode(
            pixels,
            BLURHASH_SIZE,
            BLURHASH_SIZE,
            COMPONENTS,
            COMPONENTS
        )

        return { hash, width, height }
    } finally {
        //
        // WASM memory is manually managed -- free both images (resize()
        // allocates a new one) even if encode throws.
        //
        resized?.free()
        original?.free()
    }
}
