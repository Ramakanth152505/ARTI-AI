/**
 * Brand asset manifest.
 *
 * Two original assets are supplied by the project owner and must be placed in
 * `static/assets/`. This manifest is the single place that maps each UI location
 * to its file, so swapping in the real artwork is a one-line change and no
 * component hard-codes a path.
 *
 * Note on the central crest: per the approved reference the crowned ARTI shield,
 * the ARTI lettering, the laurels and the `IDEAS • CODE • IMPACT` tagline are
 * baked into the background artwork itself. There is no separate crest file and
 * the crest is never redrawn in HTML/SVG/CSS.
 *
 * No substitute artwork is generated here. Until the real files exist the
 * components render an honest, clearly-labelled neutral placeholder and make no
 * request for the missing file, so the console and network stay clean.
 */

/** The brand assets described by the approved Home UI reference. */
export interface BrandAssets {
        /** Original phoenix emblem, shown beside the `ARTI AI` wordmark (sidebar header). */
        phoenix: string;
        /** Original Home environment, including the central ARTI crest on the wall. */
        background: string;
}

export const BRAND_ASSETS: BrandAssets = {
        phoenix: '/assets/brand/arti-phoenix.png',
        background: '/assets/background/home-background.jpg'
};

/**
 * Set to `true` once both files above have been added to `static/assets/`.
 * Until then, honest placeholders are shown and no file requests are made.
 * Flip this single flag after dropping the real artwork in — no component edits
 * are required.
 */
export const ASSETS_READY = false;

/** Short notice rendered inside each placeholder while an asset is missing. */
export const PLACEHOLDER_NOTE = 'Original asset not supplied yet';
