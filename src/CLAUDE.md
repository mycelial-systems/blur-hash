# blur-hash source

Last verified: 2026-05-29

## Decode resolution is decoupled from layout size

The `<blur-hash>` component's public `width`/`height` attributes drive
*layout* only. They are NOT the resolution the placeholder is decoded at.

`decodeDimensions(width, height, cap=32)` (`decode-dimensions.ts`) maps the
layout size to a small decode size, capping the long edge at 32px. The canvas
is decoded at that small size and stretched to fill its host via CSS
(`blur-hash canvas { width:100%; height:100% }`). A BlurHash placeholder is a
low-frequency blur, so decoding above ~32px is wasted O(w*h) work with no
visible difference.

This divergence between layout size and canvas intrinsic size is deliberate.
Do not "fix" the canvas back to full `width`/`height`.

## Invariants

- The canvas intrinsic `width`/`height` attributes, the `decode()` size, and
  the `createImageData()` size MUST all be the `decodeDimensions()` result —
  never the raw layout size. There are three call sites: `html.ts` (canvas
  attributes) and `index.ts` `scheduleDecode` (decode + createImageData).
  Image data dimensions must match the canvas, or `putImageData` mispaints.
- `decodeDimensions` never upscales and floors each edge at 1px.
- Decode/paint is deferred to a `requestAnimationFrame` in `scheduleDecode`.
  The pending frame is tracked in `rafId` and cancelled before scheduling a
  new one and in `disconnectedCallback`, so a rapid `reset` or a detach never
  leaves a stale decode painting to an orphaned canvas. The rAF callback bails
  if the element is no longer connected.

## The cap is internal

There is no attribute to override the 32px cap; it is an implementation
detail, not part of the component's public contract.
