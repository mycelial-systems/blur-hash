/**
 * Compute the resolution to decode a BlurHash placeholder at.
 *
 * A placeholder is a low-frequency blur, and decode cost is
 * O(width * height * componentsX * componentsY). Decoding above a small
 * size wastes work with no visible benefit, because the canvas is stretched
 * to fill its host via CSS (`blur-hash canvas { width:100%; height:100% }`).
 *
 * This caps the long edge to `cap` pixels, preserves the aspect ratio, floors
 * each edge at 1px, and never upscales a source that is already small.
 *
 * @param width The layout/source width in pixels.
 * @param height The layout/source height in pixels.
 * @param cap Maximum pixels on the long edge. Default 32.
 * @returns The decode dimensions to pass to `decode` and `createImageData`.
 */
export function decodeDimensions (
    width:number,
    height:number,
    cap:number = 32
):{ width:number; height:number } {
    const longEdge = Math.max(width, height)

    // Never upscale: a source at or below the cap decodes as-is.
    if (longEdge <= cap) {
        return { width, height }
    }

    const scale = cap / longEdge
    return {
        width: Math.max(1, Math.round(width * scale)),
        height: Math.max(1, Math.round(height * scale))
    }
}
