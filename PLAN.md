# Only blur-up when the image is not already cached

## Context

Today `<blur-hash>` always plays the blur-up: the markup ships an
`<img class="blurry">` (opacity 0, blur 30px) over a painted canvas
placeholder, and `sharpen()` deliberately forces the animation even when the
image is already in the browser cache (it double-`requestAnimationFrame`s so a
blurry frame paints before swapping to `.sharp`). The result is a distracting
blur -> sharpen flash on images the browser could show instantly.

We want the blur-up to run only when the image genuinely takes time to load.
If the image is cached, or loads within a short window, show it sharp
immediately -- no placeholder flash, no animation. Implement this as a
`setTimeout` debounce racing the image `load` event: load wins -> reveal
sharp, no blur; the timer wins (slow load) -> show the blurry placeholder and
run the existing sharpen cross-fade on load.

Delay: default **100ms**, overridable via a **`blur-delay`** attribute.

## Approach

Replace `sharpen()` with a `blurUp()` method that gates both the canvas paint
(`scheduleDecode`) and the `.blurry` placeholder behind the debounce timer.
Start the `<img>` with no class so cached/fast images (and no-JS/SSR) show the
real image with no flash; JS adds `.blurry` only when the timer fires.

### `src/index.ts`

New fields and helper:

```ts
blurDelay:number = 100
blurTimer:ReturnType<typeof setTimeout>|null = null

clearBlurTimer ():void {
    if (this.blurTimer !== null) {
        clearTimeout(this.blurTimer)
        this.blurTimer = null
    }
}
```

`blurUp()` (replaces `sharpen()`):

```ts
blurUp (placeholder:string, width:number, height:number):void {
    const img = this.qs('img')!

    // Already decoded from cache -> reveal now, no blur, no animation.
    if (img.complete && img.naturalWidth > 0) {
        img.classList.remove('blurry')
        return
    }

    let placeholderShown = false

    const onLoad = () => {
        this.clearBlurTimer()
        img.classList.remove('blurry')
        // Only animate if we actually showed the placeholder.
        if (placeholderShown) img.classList.add('sharp')
    }
    img.addEventListener('load', onLoad, { once: true })

    this.blurTimer = setTimeout(() => {
        this.blurTimer = null
        if (!this.isConnected) return
        placeholderShown = true
        img.classList.add('blurry')                      // fade to placeholder
        this.scheduleDecode(placeholder, width, height)  // paint canvas now
    }, this.blurDelay)
}
```

`connectedCallback()`: drop the eager `scheduleDecode`; read `blur-delay`;
call `blurUp` instead of `scheduleDecode` + `sharpen`:

```ts
const d = this.getAttribute('blur-delay')
this.blurDelay = d ? parseInt(d, 10) : 100
if (!this.innerHTML) this.innerHTML = this.render()
this.blurUp(placeholder, width, height)
```

`reset()`: call `this.clearBlurTimer()` first (rapid re-call safety), keep the
width/height/innerHTML/attribute logic, then end with
`this.blurUp(placeholder, width, height)` instead of the direct
`scheduleDecode` + `sharpen`.

`disconnectedCallback()`: add `this.clearBlurTimer()` alongside the existing
`rafId` cancel.

`scheduleDecode()` is unchanged (still cancels a stale `rafId`, still bails if
detached). Remove the old `sharpen()` method entirely.

### `src/html.ts`

Change the initial `<img class="blurry"` to no class, so cached/fast images
and the no-JS/SSR path render the real image at full opacity. `.blurry` is now
added only by `blurUp()`. (The canvas's `opacity:0.4` comes from a plain
`canvas` rule, so the placeholder still behaves as before; the unused
`class="blurry"` on the canvas can be dropped for clarity.)

### `src/index.css`

No functional change. Base `img` (no class) is already `opacity:1` with an
opacity transition; `.blurry` and `.sharp` still drive the slow-path
cross-fade. Optional: drop the unused canvas `.blurry` reference.

### `test/index.ts`

Rewrite `a complete image defers the sharpen swap (cross-fade)` (lines
189-238). It currently asserts the OLD forced-blur behavior for a complete
image; that intent is reversed. New assertion: a complete image is revealed
immediately -- call `el.blurUp(placeholder, 30, 30)` and assert synchronously
that `img` has neither `.blurry` nor `.sharp`. Optionally add a slow-path test
(unloaded img + small `blur-delay`) that waits past the delay, asserts
`.blurry` and canvas paint, then simulates `load` and asserts `.sharp`. Follow
the repo rule: no brittle assertions on text/HTML content.

The other GUI tests use `src="/100.jpg"`, which 404s in the harness, so the
image never loads and the timer always wins -> placeholder shown, canvas
painted (just after `blurDelay`, well within the 4000ms cap). The
double-reset and removed-before-frame tests still pass (the latter relies on
`disconnectedCallback` clearing the timer so `scheduleDecode` never runs).

## Files to modify

1. `src/index.ts` -- add `blurDelay`/`blurTimer` + `clearBlurTimer()`, add
   `blurUp()`, remove `sharpen()`, update `connectedCallback`, `reset`,
   `disconnectedCallback`.
2. `src/html.ts` -- remove `blurry` from the initial `<img>` (and optionally
   the canvas).
3. `test/index.ts` -- rewrite the line-189 test; optionally add a slow-path
   test.
4. `src/index.css` -- optional cleanup only.

## Verification

1. `npm test` -- runs build, GUI, bin, api, ssr suites. All must pass
   (the rewritten cached test asserts the new no-flash behavior).
2. `npm start` (vite on :8888) and check `example/`:
   - Reload with the cat image already cached (hard-reload once to warm
     cache, then normal reload): the image should appear sharp with no blur
     flash.
   - Throttle the network in devtools (Slow 3G) and reload: the blurry
     placeholder should appear after ~100ms and cross-fade to sharp on load.
   - Click "Reset image src" (loads a fresh/uncached image): should show the
     blur-up; clicking again after it caches should not.
   - Try a `blur-delay="500"` attribute to confirm the debounce is tunable.
   Remember to stop the dev server when done.
