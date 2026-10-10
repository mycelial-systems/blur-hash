# blur hash
[![tests](https://img.shields.io/github/actions/workflow/status/substrate-system/blur-hash/nodejs.yml?style=flat-square)](https://github.com/substrate-system/blur-hash/actions/workflows/nodejs.yml)
[![types](https://img.shields.io/npm/types/@substrate-system/blur-hash?style=flat-square)](README.md)
[![module](https://img.shields.io/badge/module-ESM%2FCJS-blue?style=flat-square)](README.md)
[![Common Changelog](https://nichoth.github.io/badge/common-changelog.svg)](https://common-changelog.org)
[![semantic versioning](https://img.shields.io/badge/semver-2.0.0-blue?logo=semver&style=flat-square)](https://semver.org/)
[![install size](https://flat.badgen.net/packagephobia/install/@substrate-system/blur-hash?cache-control=no-cache)](https://packagephobia.com/result?p=@substrate-system/blur-hash)
[![GZip size](https://flat.badgen.net/bundlephobia/minzip/@substrate-system/blur-hash)](https://bundlephobia.com/package/@substrate-system/blur-hash)
[![license](https://img.shields.io/badge/license-Big_Time-blue?style=flat-square)](LICENSE)


This is the
["blur-up" image loading technique](https://css-tricks.com/the-blur-up-technique-for-loading-background-images/),
with the
[blur-hash algorithm](https://blurha.sh/),
as a
[web component](https://developer.mozilla.org/en-US/docs/Web/API/Web_components).

[See a live demonstration](https://mycelial-systems.github.io/blur-hash/).

> [!TIP]
> Throttle the internet speed with the dev tools.

The blur-up only runs when the image is slow to load. On mount (or
[`.reset`](#reset)), a debounce timer races the image's `load` event. If the
image is already cached, or loads within [`delay`](#delay) milliseconds
(default `100`), it is shown sharp immediately, with no blurry placeholder
and no animation. If the timer wins (a slow load), the blurry placeholder is
shown and the image cross-fades to sharp once it loads.

<details><summary><h2>Contents</h2></summary>

<!-- toc -->

- [Install](#install)
- [Modules](#modules)
  * [ESM](#esm)
  * [CJS](#cjs)
  * [Bundler](#bundler)
  * [pre-built JS](#pre-built-js)
    + [copy](#copy)
    + [HTML](#html)
- [Use](#use)
  * [Modes](#modes)
  * [Reveal states](#reveal-states)
  * [Upgrading from 0.1.x](#upgrading-from-01x)
  * [Server-side rendering](#server-side-rendering)
- [API](#api)
  * [Attributes](#attributes)
    + [other attributes](#other-attributes)
    + [time](#time)
    + [width & height](#width--height)
    + [delay](#delay)
  * [`.reset`](#reset)
    + [`.reset` example](#reset-example)
- [CSS](#css)
  * [Import CSS](#import-css)
  * [variables](#variables)
- [Create the blur-hash string](#create-the-blur-hash-string)
  * [1. Install the peer dependency](#1-install-the-peer-dependency)
  * [JS API](#js-api)
  * [From raw bytes (Cloudflare Workers)](#from-raw-bytes-cloudflare-workers)
  * [CLI](#cli)
    + [Print to system clipboard](#print-to-system-clipboard)

<!-- tocstop -->

</details>


## Install

```sh
npm i -S @substrate-system/blur-hash
```

## Modules

This exposes ESM and common JS via
[package.json `exports` field](https://nodejs.org/api/packages.html#exports).

### ESM
```js
import { BlurHash } from '@substrate-system/blur-hash'
```

### CJS
```js
const blurHash = require('@substrate-system/blur-hash')
```

### Bundler

Just import like normal.

### pre-built JS
This package exposes minified JS files too. Copy them to a location that is
accessible to your web server, then link to them in HTML.

#### copy
```sh
cp ./node_modules/@substrate-system/blur-hash/dist/index.min.js ./public/blur-hash.min.js
```

#### HTML
```html
<script type="module" src="./blur-hash.min.js"></script>
```

Use the tag in HTML.

```html
<div>
    <blur-hash
        time="600"
        alt="cool cat"
        placeholder="LEHV6nWB2yk8pyo0adR*.7kCMdnj"
        src="/example/cat.png"
        width="100"
        height="100"
    >
    </blur-hash>
</div>
```

## Use

Call the static method `.define` in JS, then use the tag in HTML.

```js
import { BlurHash } from '@substrate-system/blur-hash'

BlurHash.define()
```

```html
<blur-hash
  alt="cool cat"
  placeholder="LEHV6nWB2yk8pyo0adR*.7kCMdnj"
  width=100
  height=100
  src="/example/cat.png"
></blur-hash>
```

### Modes

The `placeholder` attribute picks the mode.

Placeholder mode sets `placeholder` to a blurhash string. The element paints
the hash into a `<canvas>` as the blurry placeholder. It also needs `width`
and `height`, and it throws on connect if either is missing. They set the
canvas aspect ratio. The hash is decoded at no more than 32px on the long
edge.

Fill mode leaves out `placeholder`. There is no canvas, and the image sits in
normal flow. While the element is waiting, its background is
`--blur-hash-fill`. Size the element with CSS in fill mode, because `width`
and `height` are only read in placeholder mode.

Unitless `width` and `height` values are ignored by CSS when they size the
host. Add a unit, like `width="100px"`, to size the element.

Calling [`.reset`](#reset) without a `placeholder` switches the element to
fill mode.

### Reveal states

The element sets a `data-reveal` attribute on itself to track the blur-up.
The stylesheet keys its rules off this attribute, and you can read it too.

1. `pending`: the image is loading, and the `delay` timer has not fired.
2. `instant`: the image was already complete (cached) when the element
   connected or was reset. It shows right away, with no animation.
3. `waiting`: the `delay` timer fired first. In placeholder mode, the blurhash
   is painted on the next frame. In fill mode, the host background is
   `--blur-hash-fill`.
4. `revealed`: the image loaded and decoded.
5. `error`: the image failed to load.

Once the element is defined, the `<img>` has opacity 0 until `data-reveal` is
`instant` or `revealed`, so it stays hidden until it has loaded and decoded.
A partly loaded image never paints.

The `data-waited` attribute is set when the timer fired before the image
loaded, and the image then revealed. The cross-fade only runs in that case,
and so does the sharpen animation, which is placeholder mode only. `.reset`
removes `data-waited` before it starts again.

A load error leaves the `<img>` hidden. In fill mode that is an empty box,
with no `--blur-hash-fill` background, because `data-reveal` is `error`, not
`waiting`. In placeholder mode, a load error after `delay` leaves the painted
blurhash visible, and an error before `delay` leaves an unpainted canvas.
Consumers who care should handle the native `error` event with a capturing
listener on an ancestor, like `document.addEventListener('error', fn, true)`.
The `error` event does not bubble.

### Upgrading from 0.1.x

Version 0.2.0 removes the `.blurry`, `.sharp`, and `.instant` classes. In
0.1.x, the JS toggled `.blurry` and `.sharp` on the inner `<img>`. `.instant`
was only in the stylesheet, and the JS never added it. Now the host carries
the `data-reveal` and `data-waited` attributes instead. See
[Reveal states](#reveal-states).

1. `blur-hash img.blurry` -> `blur-hash[data-reveal="waiting"] img`
2. `blur-hash img.sharp` -> `blur-hash[data-waited][data-reveal="revealed"] img`

If your CSS still targets the old classes, those rules stop matching. There is
no error, so check your stylesheets after you upgrade.

There is also a behavior change. Once the element is defined, the `<img>`
stays hidden (opacity 0) until it has loaded and decoded. In 0.1.x, the image
could paint while it was still loading.

### Server-side rendering

Import `outerHTML` from `/html` to get the whole element as a string. It
includes the `<blur-hash>` host, with its attributes.

```js
import { outerHTML } from '@substrate-system/blur-hash/html'

const htmlString = outerHTML({
    alt: 'hello',
    width: 30,
    height: 30,
    placeholder: 'UQGudvt700t3~XbIE1xt9Hazs:of.8s:V[Rj',
    src: 'abc.jpg'
})
```

Attribute values are escaped for double-quoted attributes (`& " ' < >`), so
it is safe to pass user-provided `alt` text. Pass a `classes` string to set
the host's `class` attribute.

Until the element is defined, or if JS never runs, the server-rendered
`<img>` paints normally. When the element connects, it reuses the
server-rendered children and does not render them again.

`innerHTML` returns only the children (a `<canvas>` in placeholder mode, then
the `<img>`), if you want to write the host yourself. `render` is kept for
compatibility. It returns `outerHTML` outside a browser and `innerHTML` in
one. Use `outerHTML` for SSR.

## API

### Attributes

The only required attribute is `src`. `width` and `height` are required in
placeholder mode.

```ts
type ImgAttrs = {
  src:string;
  alt?:string|null;
  placeholder?:string|null;
  width?:string|number|null;
  height?:string|number|null;
  srcset?:string|null;
  sizes?:string|null;
  time?:string|number|null;
  delay?:string|number|null;
  contentVisibility?:'visible'|'auto'|'hidden'|null;
  decoding?:'sync'|'async'|'auto'|null;
  loading?:'lazy'|'eager'|'auto'|null;
  referrerpolicy?:ReferrerPolicy|null;
  crossorigin?:''|'anonymous'|'use-credentials'|null;
}
```

`delay` is a plain HTML attribute, like the others. It is also part of the
type above, so it can go in the [SSR](#server-side-rendering) helpers.

--------------------------------------

#### other attributes

The element copies `alt`, `srcset`, `sizes`, `loading`, `decoding`,
`referrerpolicy`, and `crossorigin` from itself to the `<img>` it renders.
`loading` defaults to `lazy`, and `decoding` defaults to `async`.

#### time

The transition time for the blur-up, in milliseconds. Default is `800`.

Setting `time` writes `--blur-hash-time` onto the element as an inline style,
in seconds. For example, `time="600"` sets `0.6s`. An inline value overrides
any `--blur-hash-time` in your stylesheet. Without the attribute, the
stylesheet value applies, and if there is none, the default is `0.8s`.

#### width & height

Only used in placeholder mode, where both are required. Fill mode ignores
them. They set the canvas aspect ratio, and a value with a unit, like
`100px`, also sizes the host. See [Modes](#modes).

#### delay

Milliseconds to wait for the image to load before showing the blurry
placeholder. Default is `100`.

**It can be distracting** to have the images do the sharpen effect on every
page load, which is why the blur-up is debounced.

```html
<blur-hash
  alt="cool cat"
  placeholder="LEHV6nWB2yk8pyo0adR*.7kCMdnj"
  width=100
  height=100
  src="/example/cat.png"
  delay="500"
></blur-hash>
```

The blurry placeholder is only shown if the image takes longer than `delay`
to load. If the image is already cached, or loads before `delay` elapses, it
is shown sharp immediately and the placeholder/animation are skipped
entirely. If the timer fires first, the placeholder is shown and the image
cross-fades to sharp on `load`.

The attribute's value must be an integer number of milliseconds. Omitting
the attribute, or setting it with no value -- `<blur-hash delay>` -- uses
the default of `100`ms.

```html
<blur-hash
  alt="cool cat"
  placeholder="LEHV6nWB2yk8pyo0adR*.7kCMdnj"
  width=100
  height=100
  src="/example/cat.png"
  delay
></blur-hash>
```

----------------------------------------------

### `.reset`

Change the image, and do the blur-up thing again. Takes a new `src` string,
an optional new placeholder string, and all other attributes. Leave out
`placeholder` to switch the element to fill mode.

`.reset` ignores `time` and `delay`. Set them as attributes on the element.
The element reads them when it connects, and `.reset` keeps those values.
Changing `time` or `delay` after the element connects has no effect until
it connects again.

If `width` and `height` are not passed in, it will keep the existing width
and height.

```ts
reset (attributes:{
  src:string;
  alt?:string|null;
  placeholder?:string|null;
  width?:string|number;
  height?:string|number;
  srcset?:string|null;
  sizes?:string|null;
  time?:string|number|null;
  delay?:string|number|null;
  contentVisibility?:'visible'|'auto'|'hidden'|null;
  decoding?:'sync'|'async'|'auto'|null;
  loading?:'lazy'|'eager'|'auto'|null;
  referrerpolicy?:ReferrerPolicy|null;
  crossorigin?:''|'anonymous'|'use-credentials'|null;
}):void
```

#### `.reset` example

The `reset` method will be on the element once you call `define`.

```js
import { BlurHash } from '@substrate-system/blur-hash'

BlurHash.define()

const el = document.querySelector('blur-hash')

el?.reset({
  src: 'llamas.jpg',
  alt: 'some llamas',
  placeholder: 'UgI}q#%O%eNa?^I?awaf?aIVs*WBxZxaRjR*'
})
```

-------------------------------------------------


## CSS

### Import CSS

```js
import '@substrate-system/blur-hash/css'
```

Or minified:
```js
import '@substrate-system/blur-hash/min/css'
```

### variables

__CSS variables__

* `--blur-hash-time` -- the transition time for animating blurry -> sharp,
  default is `0.8s`. The [`time`](#time) attribute sets this inline, and an
  inline value overrides the stylesheet.
* `--blur-hash-opacity` -- the opacity to use for the placeholder canvas,
  default is `0.4`
* `--blur-hash-fill` -- the background behind the image in fill mode while
  the element is waiting, default is `transparent`


---


## Create the blur-hash string

Use Node to create the `placeholder` attribute, the string consumed
by blur-hash.

### 1. Install the peer dependency

The hash generator uses [`@cf-wasm/photon`][photon], a WASM build of the
Photon image library, to decode and resize images. It is an *optional* peer
dependency, so it is not installed automatically. Add it to your project to
use the `./hash` or `./photon` entrypoints:

```sh
npm i @cf-wasm/photon
```

Browser-only consumers of the `<blur-hash>` component do not need it.

[photon]: https://github.com/fineshopdesign/cf-wasm/tree/main/packages/photon

### JS API

Read an image file from disk (Node only) and get back the blurhash plus the
original image's dimensions:

```js
import { createBlurhash } from '@substrate-system/blur-hash/hash'

const { hash, width, height } = await createBlurhash('./example/100.jpg')
// hash   => 'UQGudvt700t3~XbIE1xt9Hazs:of.8s:V[Rj'
// width  => 750
// height => 600
```


### From raw bytes (Cloudflare Workers)

If you already have the image bytes in memory -- for example inside a
Cloudflare Worker -- use the `./photon` entrypoint, which takes a `Uint8Array`
and runs in `workerd`:

```js
import { encodeImage } from '@substrate-system/blur-hash/photon'

const { hash, width, height } = await encodeImage(bytes)
```

Both entrypoints run under plain Node and Cloudflare Workers -- the correct
`@cf-wasm/photon` build resolves automatically per runtime.

### CLI

This package includes a CLI tool to create the placeholder string. After
installing this as a dependency,

```sh
npx blur ./my-file.jpg
```

Will print a string to stdout that can be used as a placeholder attribute.

#### Print to system clipboard

On mac os,

```sh
npx blur ./my-file.jpg | pbcopy
```
