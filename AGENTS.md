# AGENTS.md — ARTI AI repository notes

## What this project is

ARTI AI Home UI: a black-and-gold luxury workspace built with **SvelteKit**
(locked) + TypeScript, Svelte 5 **runes mode is forced** in `vite.config.ts`.
Package manager: **npm** (see `package-lock.json`).

## Commands

- `npm install` — install (runs `svelte-kit sync` via `prepare`)
- `npm run dev` — dev server
- `npm run build` — production build
- `npm run check` — `svelte-kit sync && svelte-check` (must stay 0 errors/0 warnings)

## Conventions

- Components live in `src/lib/components`, imported via the `#lib/*` alias.
- All colours/spacing/radii/z-index resolve through `src/lib/styles/tokens.css`.
  Raw `--arti-*` values are the base palette; semantic aliases (`--gold`,
  `--surface-*`, `--text-*`) are what components use. Do not hard-code hex values
  in components.
- Navigation labels/order live once in `src/lib/data/navigation.ts`.
- Icons are inline SVG paths in `src/lib/data/icons.ts` (generic UI glyphs only —
  brand emblems are never drawn).

## Brand assets (important)

The two owner-supplied assets are **not committed** and are loaded only when
`ASSETS_READY = true` in `src/lib/data/brandAssets.ts`:

- `static/assets/brand/arti-phoenix.png` — sidebar emblem
- `static/assets/background/home-background.jpg` — cinematic background, with the
  central ARTI crest ("IDEAS • CODE • IMPACT") **baked into the image**

Never redraw the phoenix or crest in SVG/CSS, never recolor them, and never add a
second crest. While `ASSETS_READY` is false the UI shows a labelled dark fallback
and makes no request for the missing file.

## Honesty rule

No AI/chat/upload/voice/auth backend exists. Do not fake success. Magic Mode and
the profile switcher are presentation-level preferences only; central "not
connected" strings live in `src/lib/data/statusMessages.ts`.

## Layout targets (verified at 1920x1080)

Sidebar 252px (76px icon rail when collapsed), topbar 66px, composer <=768px wide
and horizontally centered in the workspace (not the whole viewport), placed below
the central crest and above the footer. No horizontal overflow at
1920x1080 / 1600x900 / 1440x900 / 1366x768. Mobile <=900px: sidebar becomes an
overlay drawer with a scrim.
