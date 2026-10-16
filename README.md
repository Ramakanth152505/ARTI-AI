# ARTI AI

ARTI AI — Ideas • Code • Impact. A black-and-gold luxury AI workspace, built
with **SvelteKit** (mandatory framework) and TypeScript.

## Status

The **Home UI foundation** is implemented: sidebar navigation, top navigation
(Magic Mode, notifications, combined profile dropdown), background + central
crest layers, chat composer, and footer. The 18 non-Home sections render an
honest "coming soon" page — they are navigation placeholders, not finished
features.

No AI model, authentication, or chat backend is connected yet. The UI never
claims otherwise.

## Required brand assets (must be supplied)

The original brand artwork is **not** included in this repository and must be
added by the owner. No substitute logos are generated. Two supplied assets are
expected:

| Purpose | Path | Shown in |
| --- | --- | --- |
| Original phoenix emblem | `static/assets/brand/arti-phoenix.png` | Sidebar brand lockup, left of `ARTI AI` |
| Original cinematic Home background | `static/assets/background/home-background.jpg` | Full-bleed background |

The central crowned ARTI crest (`IDEAS • CODE • IMPACT`) is **baked into the
supplied background image**. It is not a separate asset and is never recreated
in HTML, SVG or CSS.

Until a file exists, the corresponding layer shows a clearly-labelled neutral
placeholder rather than a fabricated or broken image. Paths and readiness flags
are declared once in `src/lib/data/brandAssets.ts` (`PHOENIX_READY`,
`BACKGROUND_READY`); set a flag to `true` after adding its file.

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
    data/         navigation, icons, profiles, brandAssets
    state/        uiState.svelte.ts (drawer state)
    styles/       tokens.css, global.css
  routes/
    +layout.svelte
    +page.svelte              Home UI
    [section]/                dynamic "coming soon" section pages
static/
  assets/brand/               phoenix artwork (owner-supplied)
  assets/background/          Home environment artwork, incl. central crest (owner-supplied)
```

After adding the files, set the matching readiness flags in
`src/lib/data/brandAssets.ts` to `true` to swap the placeholders for the real
artwork.
