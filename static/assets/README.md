# Brand assets (owner-supplied)

Place the two original ARTI AI assets here, then set `ASSETS_READY = true` in
`src/lib/data/brandAssets.ts`:

- `brand/arti-phoenix.png` — original golden phoenix emblem (with its black
  background and circular gold outline, unchanged).
- `background/home-background.jpg` — the complete cinematic Home background,
  including the central ARTI crest.

No substitute or generated artwork is stored here. If a file is absent the UI
shows a labelled dark fallback and never draws a replacement logo.

Filenames and paths are declared once in `src/lib/data/brandAssets.ts`.
