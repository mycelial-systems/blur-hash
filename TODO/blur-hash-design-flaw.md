# Design flaw in `@substrate-system/blur-hash`: decode resolution is tied to display size

Discovered: 2026-05-29, while debugging multi-second jank navigating to the
home (`/`) route in rsss.

## Summary

The `<blur-hash>` web component uses a single pair of `width`/`height`
attributes for three unrelated jobs at once:

1. The pixel resolution it decodes the BlurHash placeholder to.
2. The pixel size of the backing `<canvas>`.
3. The element's inline layout size (`this.style.width/height`).

Because the decode resolution is the same number a caller naturally
reaches for (the source image's dimensions), the component decodes a
placeholder at full image resolution by default. BlurHash decoding is
`O(width * height * componentsX * componentsY)`, so a single 1200x630
placeholder is ~756,000 pixels each summed over the DCT basis -- tens of
millions of operations, synchronously, on the main thread, inside
`connectedCallback`. The result is then displayed at 80x80 after a CSS
downscale, so essentially all of that work is wasted.

There is no separate "decode at this small size, display at that larger
size" knob. A caller cannot ask for a cheap decode without also shrinking
the element.

## Where the flaw lives

`@substrate-system/blur-hash/dist/index.js`:

```js
connectedCallback() {
    const width = parseInt(this.getAttribute("width") ?? "");
    const height = parseInt(this.getAttribute("height") ?? "");
    const placeholder = this.getAttribute("placeholder");
    ...
    const pixels = decode(placeholder, width, height);   // <-- O(w*h*cx*cy)
    const canvas = this.querySelector("canvas");
    const ctx = canvas.getContext("2d");
    const imageData = ctx.createImageData(width, height); // <-- canvas at same size
    imageData.data.set(pixels);
    ctx.putImageData(imageData, 0, 0);
    this.sharpen();
}
```

and in the constructor:

```js
this.style.width = "" + w;    // layout size, also from the same attribute
this.style.height = "" + h;
```

The accompanying stylesheet scales the canvas to fill the host
regardless of its pixel dimensions, which is the crucial fact that makes
a small decode look identical to a large one:

```css
blur-hash canvas { width: 100%; height: 100%; }
```

So the canvas could be decoded at 32x17 and still fill an 80x80 (or any
size) host with no visible difference -- a BlurHash placeholder is a
low-frequency blur, it carries no detail that a higher decode resolution
would preserve.

## Why it is easy to trigger

The component's own type signatures and examples invite the caller to
pass the image's real dimensions as `width`/`height` (they are the
obvious values to have on hand, and they are needed to reserve correct
layout space and avoid layout shift). Doing the obvious thing produces a
full-resolution decode. The expensive path is the default path; the cheap
path requires the caller to know that `width`/`height` secretly means
"decode resolution" and to pass deliberately wrong (small) numbers.

The cost is also invisible in isolation. One element decoding once is a
few hundred milliseconds at most and is easy to miss. The problem only
becomes obvious when many elements mount in the same synchronous commit
(a list view), where the per-element cost stacks into a multi-second
main-thread block that delays paint.

## Impact observed in rsss

The home route renders a list of items, each with one `<blur-hash>`
thumbnail. Navigating to `/` mounted ~20 of them in one Preact commit.
Measured with a route-change-to-next-paint probe plus a `longtask`
observer:

```
/ -> /settings:        19 ms   (no blur-hash mounted)
/settings -> /:      6032 ms   (single longtask, starts at +0 ms)
/ -> /post/...:        13 ms   (item view, no list of blur-hashes)
/post/... -> /:      5745 ms   (single longtask, starts at +0 ms)
```

Each decode ran at the source image size (~1200x630). Displayed size was
80x80. The decode work was ~150x larger in each dimension than anything
the user could see.

## Workaround applied in the consumer

rsss now decodes at a bounded, aspect-preserved resolution (~32px on the
long edge) by passing small `width`/`height` to the element, relying on
the canvas's `width: 100%` CSS to scale it back up to the 80px thumbnail.
See `src/client/components/item-row.ts` (`blurhashDecodeSize`). This drops
the per-row decode from ~756,000 pixels to ~544, roughly a 1,390x
reduction, and the navigation longtask from ~6 s to a few ms.

This is a band-aid at the call site. It works because we happen to know
the component's internals and that the canvas is CSS-scaled. It is not
discoverable, and every other consumer of the package has the same trap
waiting for them.

## Proper fix (upstream, in the package)

Decouple the three concerns. Options, roughly in order of preference:

1. Add an explicit, optional decode-resolution attribute (e.g.
   `decode-width`/`decode-height` or a single `decode-size` cap), default
   it to a small value (32px on the long edge, aspect preserved from
   `width`/`height`), and keep `width`/`height` purely for layout sizing.
   This makes the cheap path the default and the expensive path opt-in.

2. Internally cap the decode resolution unconditionally. There is no
   visual reason to decode a BlurHash above ~32-64px on the long edge, so
   the component can clamp `decode(...)` and `createImageData(...)`
   dimensions while still honoring `width`/`height` for layout. This
   needs no API change and fixes every existing consumer on upgrade.

3. Defer or chunk the decode (e.g. off the synchronous
   `connectedCallback`, or via a worker / `OffscreenCanvas`) so a list of
   elements cannot block paint even if someone forces a large decode.
   Useful as defense in depth but secondary to not decoding large in the
   first place.

Recommended: do (2) as the immediate, no-API-change fix, and optionally
expose (1) for callers who want a specific decode size. Decoding small is
correct in all cases for a placeholder; the only thing the source
dimensions are legitimately needed for is reserving layout space.

## Decision (2026-05-29)

Fix approach: an internal, unconditional decode-resolution cap (option 2),
plus a `requestAnimationFrame` deferral of the decode. No new attributes;
`width`/`height` stay layout-only. The opt-in decode-size attribute (option
1) and a Web Worker / `OffscreenCanvas` (option 3) are both rejected.

### Cap

- Decode and canvas buffer are capped to 32px on the long edge, short edge
  scaled to preserve aspect ratio, floor of 1px.
- No upscaling: if the long edge is already <= 32, decode at the real size.
- A single pure helper, `decodeDimensions(width, height, cap = 32)`, is the
  source of truth for both `index.ts` and `html.ts`.

### Cost model (corrected)

Decode is `O(W*H*Cx*Cy)`, not `O(W*H)` -- the reference `blurhash` decode
runs `Cx*Cy` iterations with two `Math.cos` per output pixel and no
precomputation.

- Full res 1200x630 is the `W*H` blowup that produced the ~6s block.
- Capped 32x17 removes ~1390x of the `W*H` factor: a 4x4 hash is ~0.5-1ms,
  a worst-case 9x9 hash is ~88k cos calls, a few ms.
- The cap alone fixes the reported bug. The rAF deferral exists because even
  capped, a synchronous batch of N high-component hashes can still reach
  ~100ms. The justification is the batch, not any single decode.

### Canvas buffer size is a correctness invariant

`putImageData` fills only the region matching the ImageData's dimensions. If
the `<canvas>` intrinsic `width`/`height` (set in `html.ts`) differ from the
`createImageData(...)` size (in `index.ts`), the result is a partially
filled canvas -- a small blur in the top-left, blank elsewhere -- then
CSS-stretched across the host. So `html.ts` MUST size the canvas to the
capped decode dims, exactly equal to the `createImageData` size. This is
required, not tidying; the shared helper enforces
`canvas-buffer-size == imageData-size`.

### Deferral primitive: requestAnimationFrame

- rAF runs before the next paint, so the blur still appears on the first
  visible paint, accepting a small pre-paint cost for the batch.
- `setTimeout` / `requestIdleCallback` run after first paint, fully off the
  critical path, but flash one empty frame. With the cap shrinking the
  batch, rAF (blur-on-first-paint, no flash) is the deliberate choice.
- Chunking the batch across frames is the only thing that fully prevents a
  pre-paint longtask; it is a non-goal here (YAGNI given the cap).
- `sharpen()` stays synchronous -- it keys off `img` load, independent of
  the decode -- so a fast image load is not missed.

### Pending-handle lifecycle (the real complexity async adds)

Once the decode is scheduled rather than inline:

- Store the rAF handle on the instance.
- A second `reset()` before it fires must `cancelAnimationFrame` the stale
  handle and reschedule.
- `disconnectedCallback` must cancel any pending handle.
- The callback must bail if the element is detached (`!this.isConnected`)
  or its canvas is gone.

This cancellation discipline -- not the decode itself -- is the cost of
going async. It is in scope and accounted for up front.

### Definition of Done

1. `<blur-hash>` decodes the placeholder at <= 32px on the long edge (aspect
   preserved, min 1px, never upscaled), regardless of `width`/`height`, in
   both `connectedCallback` and `reset`.
2. The canvas intrinsic dimensions equal the `createImageData` size exactly
   (via the shared helper); rendered output is visually identical to before.
3. The decode + paint run in a `requestAnimationFrame` callback, with handle
   cancellation on re-`reset()` and `disconnectedCallback`, and a detached
   bail-out.
4. `width`/`height` remain layout-only; no new public API; existing tests
   stay green.
5. The pure `decodeDimensions` helper is unit-tested (aspect preservation,
   long-edge cap, 1px floor, no upscaling, square input). CHANGELOG
   documents the behavior change.

### Out of scope

- A new decode-size attribute (rejected: small is always correct).
- Web Worker / `OffscreenCanvas`.
- Cross-frame chunking of the decode batch.
- The pre-existing unitless-`width` quirk (`this.style.width = '100'` is
  ignored by browsers); flagged for a separate follow-up.

## References

- Component: `node_modules/@substrate-system/blur-hash/dist/index.js`
  (`connectedCallback`, constructor), `dist/style.css`.
- `blurhash` decode complexity: `decode(hash, width, height)` is linear
  in `width * height` and in the number of DCT components encoded.
- Consumer workaround: `src/client/components/item-row.ts`,
  `test/item-row.ts` (bounded-decode-resolution assertions).
