# AGENTS.md

Repository-specific notes for ARTI AI (SvelteKit + TypeScript).

## Commands

- `npm run dev` — Vite dev server (`--port 12000 --host` in the sandbox).
- `npm run check` — `svelte-kit sync && svelte-check`. Must stay at 0 errors, 0 warnings.
- `npm run build` — production build. `adapter-auto` warns "could not detect a
  production environment"; that is expected and not an error.

## Architecture

- Framework is locked to **SvelteKit** with Svelte 5 runes (forced via
  `vite.config.ts` `compilerOptions.runes`). Do not migrate frameworks.
- Design tokens live in `src/lib/styles/tokens.css` (raw spec palette → semantic
  tokens). Components must use tokens, never hard-coded hex.
- Data/state: `src/lib/data/*` (navigation, icons, profiles, brandAssets) and
  `src/lib/state/uiState.svelte.ts` (sidebar drawer + desktop collapse).
- Home UI: `src/routes/+page.svelte` composes `TopBar`, `HomeBackground`,
  `ChatComposer`, `HomeFooter`. Other routes: `src/routes/[section]/`.

## Brand assets (important)

Only **two** assets are supplied and must be preserved as-is:

1. Phoenix emblem → `static/assets/brand/arti-phoenix.png`
2. Cinematic Home background → `static/assets/background/home-background.jpg`

The central crowned ARTI crest (`IDEAS • CODE • IMPACT`) is **baked into the
background image** — there is no separate crest layer or crest file, and it must
never be recreated in HTML/SVG/CSS. Paths + `PHOENIX_READY` / `BACKGROUND_READY`
flags are centralized in `src/lib/data/brandAssets.ts`. While a flag is `false`,
an honest labelled placeholder is shown and no file request is made.

## Honesty constraints

The chat backend, Magic Mode, notifications, and profile auth are **not
implemented**. UI must surface honest "not connected / not yet implemented"
states instead of faking success. Attachment files are validated and listed but
never uploaded. Voice input is feature-detected and only requests the microphone
after an explicit user click.

## Verification

`vite.config.ts` `server.allowedHosts` is not set; the sandbox preview host is
blocked by Vite. For headless visual checks, run the dev server and screenshot
with chromium at the target viewport, e.g.
`chromium --headless=new --no-sandbox --window-size=1920,1080 --screenshot=... http://localhost:12000/`.
