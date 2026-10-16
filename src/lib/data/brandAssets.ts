/**
 * Brand asset manifest.
 *
 * The three original brand assets are supplied by the project owner and must be
 * placed in `static/assets/`. This manifest is the single place that maps each
 * UI location to its file, so swapping in the real artwork is a one-line change
 * and no component hard-codes a path.
 *
 * No substitute artwork is generated here. While `ASSETS_READY` is false, the
 * components render an honest, clearly-labelled placeholder for each missing
 * layer and make no request for the file (so the console and network stay
 * clean). After adding the three files, set `ASSETS_READY = true`.
 */

/** The brand assets described by the approved Home UI reference. */
export interface BrandAssets {
	/** Original phoenix emblem, shown beside the `ARTI AI` wordmark (sidebar header). */
	phoenix: string;
	/** Original crowned ARTI shield crest, shown on the central wall. */
	crest: string;
	/** Original Home environment (marble wall, city view, furniture). */
	background: string;
}

export const BRAND_ASSETS: BrandAssets = {
	phoenix: '/assets/brand/arti-phoenix.png',
	crest: '/assets/brand/arti-crest.png',
	background: '/assets/background/home-background.jpg'
};

/**
 * Set to `true` once all three files above have been added to `static/assets/`.
 * Until then, placeholders are shown and no file requests are made.
 */
export const ASSETS_READY = false;

/** Short notice rendered inside each placeholder while an asset is missing. */
export const PLACEHOLDER_NOTE = 'Original asset not supplied yet';
