# ARTI AI

ARTI AI — Ideas • Code • Impact. A black-and-gold luxury AI workspace, built
with **SvelteKit** (mandatory framework) and TypeScript.

## Status

The **Home UI foundation** is implemented: sidebar navigation, top navigation
(Magic Mode, notifications, combined profile dropdown), cinematic background,
chat composer, and footer. The 18 non-Home sections render an honest
"coming soon" page — they are navigation placeholders, not finished features.

No AI model, authentication, or chat backend is connected yet. The UI never
claims otherwise: Magic Mode and profiles are presentation-level preferences,
attachments and voice input report a clear "not connected" state, and nothing
is uploaded or sent anywhere.

## The supplied brand assets

The original brand artwork is **not** included in this repository. No substitute
logo is generated. Drop the two files at these exact paths, then set
`ASSETS_READY = true` in `src/lib/data/brandAssets.ts` — no component edits are
needed:

| Purpose | Path | Shown in |
| --- | --- | --- |
| Original phoenix emblem | `static/assets/brand/arti-phoenix.png` | Sidebar header, left of `ARTI AI` |
| Original Home background (with the central ARTI crest baked in) | `static/assets/background/home-background.jpg` | Full-bleed background |

The crowned shield, `ARTI` lettering, laurels and `IDEAS • CODE • IMPACT` tagline
are part of the background artwork itself, so there is no separate crest file and
the crest is never redrawn in HTML/SVG/CSS.

Until a file exists, the corresponding layer shows a clearly-labelled dark
fallback rather than a fabricated or broken image, and makes no request for the
missing file. Paths are declared once in `src/lib/data/brandAssets.ts`.

## Run

```sh
npm install
npm run dev
```

Production build and checks:

```sh
npm run build
npm run preview
npm run check   # svelte-check + TypeScript
```

## Project structure

```
src/
  app.html
  lib/
    components/   Sidebar, TopBar, ProfileDropdown, ChatComposer,
                  HomeBackground, HomeFooter, Icon, ComingSoon
    data/         navigation, icons, profiles, brandAssets, statusMessages
    state/        uiState.svelte.ts (drawer + collapse + magic-mode state)
    styles/       tokens.css, global.css
  routes/
    +layout.svelte
    +page.svelte              Home UI
    [section]/                dynamic "coming soon" section pages
static/
  assets/brand/               phoenix artwork (owner-supplied)
  assets/background/          Home environment artwork (owner-supplied)
```
