# blur hash
[![tests](https://img.shields.io/github/actions/workflow/status/substrate-system/blur-hash/nodejs.yml?style=flat-square)](https://github.com/substrate-system/blur-hash/actions/workflows/nodejs.yml)
[![types](https://img.shields.io/npm/types/@substrate-system/blur-hash?style=flat-square)](README.md)
[![module](https://img.shields.io/badge/module-ESM%2FCJS-blue?style=flat-square)](README.md)
[![Common Changelog](https://nichoth.github.io/badge/common-changelog.svg)](https://common-changelog.org)
[![semantic versioning](https://img.shields.io/badge/semver-2.0.0-blue?logo=semver&style=flat-square)](https://semver.org/)
[![install size](https://flat.badgen.net/packagephobia/install/@substrate-system/blur-hash?cache-control=no-cache)](https://packagephobia.com/result?p=@substrate-system/blur-hash)
[![GZip size](https://flat.badgen.net/bundlephobia/minzip/@substrate-system/blur-hash)](https://bundlephobia.com/package/@substrate-system/blur-hash)
[![license](https://img.shields.io/badge/license-Big_Time-blue?style=flat-square)](LICENSE)


This is the ["blur-up" image loading technique](https://css-tricks.com/the-blur-up-technique-for-loading-background-images/),
with the [blur-hash algorithm](https://blurha.sh/),
as a [web component](https://developer.mozilla.org/en-US/docs/Web/API/Web_components).

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
  * [JS API](#js-api)
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
Following convention, this module exposes `render` function at `/html`. It
returns a plain string of markup.

```js
import { render } from '@substrate-system/blur-hash/html'

const htmlString = render({
    alt: 'hello',
    width: 30,
    height: 30,
    placeholder: 'UHGIM_X900xC~XWFE0xt00o3%1oz-;t7i|IV',
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

Change the image, and do the blur-up thing again.

Takes a new `src` string, new placeholder string, and all other attributes.

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

## Create the blur-hash string

Use Node to create the `placeholder` attribute, the string consumed
by blur-hash.

### JS API

```js
import { createString } from '@substrate-system/blur-hash/hash'

const hash = await createString('../example/100.jpg')
// => 'UHGIM_X900xC~XWFE0xt00o3%1oz-;t7i|IV'
```

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

```
/ed3d-plan-and-execute:execute-implementation-plan /Users/nick/code/blur-hash/docs/implementation-plans/2026-07-04-photon-blurhash-generation/ /Users/nick/code/blur-hash/
```
