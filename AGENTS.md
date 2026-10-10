<!-- nightralph:start -->
## Agent skills

### Issue tracker

Issues are tracked as local markdown files under `.scratch/`. See `docs/agents/issue-tracker.md`.

### Triage labels

Default label vocabulary. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context layout. See `docs/agents/domain.md`.
<!-- nightralph:end -->

## Project context

Last verified: 2026-10-09

`<blur-hash>` web component (`src/`), SSR string builders (`src/html.ts`,
exported as `./html`), and Node/workerd hash generation (`bin/`).

### Reveal contract

- `src/index.ts` writes the host attributes `data-reveal`
  (`pending|instant|waiting|revealed|error`) and `data-waited`;
  `src/index.css` keys all image visibility off them. A new state or
  attribute is a two-file change.
- Each `blurUp` bumps `generation`. Every async callback it schedules
  (load, decode, error, delay timer) returns early on a stale generation,
  so an old `<img>` cannot flip a newer reveal.
- Visibility rules live under `blur-hash:defined`: before the element is
  defined (SSR, no JS) the `<img>` paints normally.
- `src/html.ts` stays DOM-free and runs `escapeAttribute` on every
  caller-supplied attribute value.

### Tests

- `test-gui` runs under tapout, which ends the run with exit 0 after
  ~1000 ms of silence, dropping any failure not yet printed. Bound every
  wait a regression could leave hanging by `BAILOUT_MS` (800) in
  `test/index.ts`; `waitFor` from `@substrate-system/dom` defaults to
  5000 ms.
- `test/pack.mjs` resolves `./html` from an `npm pack` tarball. Run
  `npm run test-pack` after touching `exports` or the build output layout.
