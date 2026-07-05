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

[See a live demonstration](https://substrate-system.github.io/blur-hash/)

> [!TIP]
> Throttle the internet speed with the dev tools.

<details><summary><h2>Contents</h2></summary>

<!-- toc -->

- [Install](#install)
- [Modules](#modules)
  * [ESM](#esm)
  * [CJS](#cjs)
  * [Bundler](#bundler)
  * [pre-built JS](#pre-built-js)
- [Use](#use)
  * [Server-side rendering](#server-side-rendering)
- [API](#api)
  * [Attributes](#attributes)
  * [`.reset`](#reset)
- [CSS](#css)
  * [Import CSS](#import-css)
  * [variables](#variables)
- [Create the blur-hash string](#create-the-blur-hash-string)
  * [1. Install the peer dependency](#1-install-the-peer-dependency)
  * [JS API](#js-api)
  * [From raw bytes (Cloudflare Workers)](#from-raw-bytes-cloudflare-workers)
  * [CLI](#cli)

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
        time="0.6s"
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

### Server-side rendering

This module exposes a `render` function at `/html`. It returns a plain string
of HTML.

```js
import { render } from '@substrate-system/blur-hash/html'

const htmlString = render({
    alt: 'hello',
    width: 30,
    height: 30,
    placeholder: 'UQGudvt700t3~XbIE1xt9Hazs:of.8s:V[Rj',
    src: 'abc.jpg'
})
```

## API

### Attributes

The required attributes are `alt`, `src`, `placeholder`, `width`, and `height`.

```ts
type Attrs = {
  alt:string;
  width:string|number;
  height:string|number;
  placeholder:string;
  src:string;
  srcset?:string|null;
  sizes?:string|null;
  time?:number;
  contentVisibility?:'visible'|'auto'|'hidden'|null;
  decoding?:'sync'|'async'|'auto'|null;
  loading?:'lazy'|'eager'|'auto'|null;
}
```

--------------------------------------

#### other attributes

#### time

The time for css transitions and animation. This is set as a CSS variable.

#### width & height

The dimensions for the image

----------------------------------------------

### `.reset`

Change the image, and do the blur-up thing again. Takes a new `src` string,
new placeholder string, and all other attributes.

If `width` and `height` are not passed in, it will keep the existing width
and height.

```ts
reset (attributes:{
  src:string;
  alt:string;
  placeholder:string;
  width?:string;
  height?:string;
  srcset?:string|null;
  sizes?:string|null;
  time?:number;
  contentVisibility?:'visible'|'auto'|'hidden'|null;
  decoding?:'sync'|'async'|'auto'|null;
  loading?:'lazy'|'eager'|'auto'|null;
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
import '@substrate-system/blur-hash/css/min'
```

### variables

__CSS variables__

* `--blur-hash-time` -- the transition time for animating blurry -> sharp,
  default is `0.8s`
* `--blur-hash-opactiy` -- the opacity to use for the placeholder image,
  default is `0.4`


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
