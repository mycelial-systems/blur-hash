# blur-hash generation (bin/)

Last verified: 2026-07-04

## Purpose

Generate a BlurHash placeholder string from raw image bytes. This code
runs unchanged under plain Node and under Cloudflare Workers (workerd),
which is why it decodes with the `@cf-wasm/photon` WASM library rather
than a native addon.

## Contracts

Exposed via `package.json` `exports`:

- `./photon` -> `encodeImage(bytes:Uint8Array) ->
  Promise<{ hash, width, height }>`. The runtime-agnostic core.
  `width`/`height` are the ORIGINAL image's dimensions, not the resample
  size.
- `./hash` -> `createBlurhash(filepath:string) ->
  Promise<{ hash, width, height }>`. Node-only (reads a file from disk);
  delegates to `encodeImage`.
- `blur` CLI (`package.json` `bin.blur`) -> prints the hash to stdout.

Guarantees: the hash is a 4x4-component BlurHash computed from a 32x32
resample. `encodeImage` throws if the bytes are not a decodable image.

Expects: the consumer has installed `@cf-wasm/photon`. Under wrangler the
plain specifier resolves to the workerd build; under Node it resolves to
the node build.

## Dependencies

- Uses: `@cf-wasm/photon` (decode + resize), `blurhash` (encode).
  `index.ts` additionally uses `node:fs` and `yargs` for the CLI.
- Used by: package consumers importing `./photon` or `./hash`, and the
  `blur` CLI.
- Boundary: this is a leaf. Do NOT import from `src/` (the browser
  component) here, and do NOT import `bin/` from `src/`.

## Key Decisions

- photon (WASM) replaced sharp (native addon) so generation runs under
  workerd, which sharp cannot. `sharp`/`@types/sharp` were dropped.
- `@cf-wasm/photon` is an OPTIONAL peer dependency, not a hard
  dependency: consumers who only use the browser component should not be
  forced to install a WASM decoder.
- `createBlurhash` returns `{ hash, width, height }`. It previously was
  `createString`, returning a bare string. This is a BREAKING change.

## Invariants

- WASM memory is manually managed: both the original and the resized
  `PhotonImage` are `free()`d in a `finally`, even if `encode` throws.
- `get_raw_pixels()` returns an owned RGBA copy, so that buffer stays
  valid after `free()`.
- The resample is fixed at 32x32 with 4x4 components. Do not raise it --
  a BlurHash is a low-frequency blur, so larger is wasted work.

## Key Files

- `photon.ts` -- `encodeImage`, the runtime-agnostic core.
- `index.ts` -- `createBlurhash` plus the `blur` CLI entrypoint.

## Gotchas

- The `/// <reference types="node" />` in `index.ts` applies to the WHOLE
  compilation, not just `bin/`. It documents this file's dependency on
  `@types/node`; it does NOT scope Node globals to `bin/` alone. `src/`
  stays browser-facing by convention, not because of that directive.
- `tsconfig.json` type-checks `bin/`, but `tsconfig.build.json` excludes
  it -- `bin/` is built with esbuild, not tsc.
