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

## Chats module

`/chats` is the conversation workspace: history sidebar + conversation + opt-in
context panel. Its logic lives in `src/lib/chats` and its UI in
`src/lib/components/Chat*.svelte`.

- Availability is never hard-coded. `src/lib/chats/config.ts` reads
  `VITE_ARTI_CHAT_ENDPOINT` and `VITE_SUPABASE_*`; with neither set, the UI shows
  the honest "not configured" states and no request is made.
- The model seam is `src/lib/chats/service/chatService.ts` (SSE contract in the
  header comment). It throws rather than returning canned text — never add fake
  responses.
- Persistence goes through `ChatRepository` (`src/lib/chats/persistence/`). The
  live implementation is browser-local keyed by workspace scope; a
  `supabaseRepository` swaps in without touching components. Server-side
  authorization (RLS) is the real enforcement point, not the UI.
- Message HTML is `marked` -> `DOMPurify`. Keep that order; never `{@html}` raw
  model output.
- Attachments, voice and tools have real validation/permission handling but no
  backend, so they report unavailable rather than simulating success.

Commands: `npm test` (Vitest unit tests) and `npm run check:layout` (puppeteer
overflow check; needs a dev server). `scripts/check-interactions.mjs` smoke-tests
search, pin persistence and the context panel against a running server.

Note: `.chat-header` sits in its own stacking context (`backdrop-filter`). Its
children's dropdowns stay above the scroller because the header carries
`position: relative; z-index: 2`.

## Images module

`/images` is the image workspace: generation + image-focused conversation, prompt
generation/enhancement, an expandable style library, and generation history. Logic
lives in `src/lib/images` and its UI in `src/lib/components/Image*.svelte` and
`ImagesComposer.svelte` / `ImagesWorkspace.svelte`.

- Availability is read from `src/lib/images/config.ts`
  (`VITE_ARTI_IMAGE_ENDPOINT`, `VITE_ARTI_PROMPT_ENDPOINT`, `VITE_SUPABASE_*`).
  Unset means generation/enhancement are disabled with honest copy; no request is
  made and nothing is fabricated.
- The style catalog is data in `src/lib/images/styles.ts`. Picking a style inserts
  its template into the composer; an existing prompt is never silently overwritten
  (Add / Replace / Cancel confirmation). Add categories/styles to the catalog data,
  not to components.
- Model seams: `service/imageService.ts` (CLI-task contract in its header comment)
  and `service/promptService.ts`. Both throw instead of returning canned output.
- Persistence is `ImageRepository` (`persistence/repository.ts`); the live
  implementation is browser-local keyed by workspace scope, with a Supabase
  implementation swappable without touching components. No lifetime generation cap.
- Shared seams with Chats live in `src/lib/shared/` (`scope.ts`, env + text
  helpers); `src/lib/chats/types.ts` re-exports `WorkspaceScope` from there.

Commands: `npm run check:images` (puppeteer workspace checks; needs a dev server).

## Shared Styles Library

One catalogue serves both Images and Videos: `src/lib/shared/styles/` holds the
media-neutral contracts (`types.ts`) and the data (`catalog/`, eleven spec
categories A–K plus the preserved legacy image styles). It is data, not UI, so a
new style or category is a change to the catalogue and never a UI rewrite.

- `execution` records what is actually known about a style against the configured
  models. Nothing is `available` while no model is connected; every authored style
  defaults to `prompt-only`. Tests assert no style claims `available`.
- There is no `preview` field anywhere: no preview artwork exists, so the UI shows
  a deliberate text fallback rather than a fabricated thumbnail.
- `StyleLibrary.svelte` is the one UI, parameterised by `media`. `ImageStyleLibrary`
  and `VideoStyleLibrary` are thin wrappers that lock the media type, so the two
  workspaces cannot drift apart.
- Applying a style never starts generation and never silently overwrites an
  existing prompt: the card reports the selection and the workspace asks how to
  combine the guidance (insert / replace / append). `src/lib/images/styles.ts`
  re-exports the shared catalogue, keeping the historic `IMAGE_STYLES` /
  `STYLE_CATEGORIES` names working.

## Videos module

`/videos` is the AI film-production workspace: projects, recursive folders, series
→ seasons → episodes, movies → parts, scenes → shots, a prompt chat, generation
queue, library, drafts, assets and settings. Logic lives in `src/lib/videos` and
its UI in `src/lib/components/Videos*.svelte` / `VideoComposer.svelte`.

- Availability is read from `src/lib/videos/config.ts`
  (`VITE_ARTI_VIDEO_ENDPOINT`, `VITE_ARTI_PROMPT_ENDPOINT`, `VITE_SUPABASE_*`).
  Unset means generation is disabled with honest copy; no request is made and
  nothing is fabricated. Capability flags default to false on purpose.
- Model seams: `service/videoService.ts` and `service/videoPromptService.ts`
  (provider-neutral contracts in their header comments). Both throw instead of
  returning canned output.
- Recursive folders: `tree.ts` holds the pure rules. `canMove` is the single gate
  against a folder becoming its own descendant, and the migration enforces the
  same rule in the database.
- Persistence is `VideoRepository` (`persistence/repository.ts`); the live
  implementation is browser-local keyed by workspace scope, with a Supabase
  implementation swappable without touching components. Long jobs are staged and
  resumable — a percentage is shown only when the backend reports one.
- Requested values (what the user asked for) and produced values (what was
  measured) are separate fields, so a lower-resolution file is never labelled as
  native 16K.
- Schema + RLS live in `supabase/migrations/`; media bytes stay in private object
  storage and only references/metadata are stored in the database.

Commands: `npm run check:videos` (puppeteer workspace checks; needs a dev server).

## Layout targets (verified at 1920x1080)

Sidebar 252px (76px icon rail when collapsed), topbar 66px, composer <=768px wide
and horizontally centered in the workspace (not the whole viewport), placed below
the central crest and above the footer. No horizontal overflow at
1920x1080 / 1600x900 / 1440x900 / 1366x768. Mobile <=900px: sidebar becomes an
overlay drawer with a scrim.
