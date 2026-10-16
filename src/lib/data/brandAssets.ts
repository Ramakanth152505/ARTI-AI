/**
 * Brand asset manifest.
 *
 * The project owner supplies two original brand assets:
 *
 *   1. The golden phoenix emblem (sidebar brand lockup, left of `ARTI AI`).
 *   2. The cinematic Home background, which already contains the architectural
 *      interior AND the central crowned ARTI crest with its `IDEAS • CODE • IMPACT`
 *      tagline baked into the artwork.
 *
 * Because the crest lives inside the background image, it is NOT a separate
 * layer and is never recreated in HTML, SVG or CSS.
 *
 * This manifest is the single place that maps each UI location to its file, so
 * swapping in the real artwork never requires editing a component. No substitute
 * artwork is generated here: while a file is missing, its layer renders an
 * honest, clearly-labelled placeholder and makes no request for the file (so the
 * console and network stay clean).
 *
 * To enable a supplied asset, drop the file at the path below and set the
 * matching `*_READY` flag to `true`.
 */

/** The supplied brand assets described by the approved Home UI reference. */
export interface BrandAssets {
	/** Original golden phoenix emblem, shown beside the `ARTI AI` wordmark. */
	phoenix: string;
	/** Original cinematic Home environment, including the central ARTI crest. */
	background: string;
}

export const BRAND_ASSETS: BrandAssets = {
	phoenix: '/assets/brand/arti-phoenix.png',
	background: '/assets/background/home-background.jpg'
};

/** Set to `true` once the phoenix file exists at `BRAND_ASSETS.phoenix`. */
export const PHOENIX_READY = false;

/** Set to `true` once the background file exists at `BRAND_ASSETS.background`. */
export const BACKGROUND_READY = false;

/** True only when every supplied asset is present. */
export const ASSETS_READY = PHOENIX_READY && BACKGROUND_READY;

/** Short notice rendered inside each placeholder while an asset is missing. */
export const PLACEHOLDER_NOTE = 'Original asset not supplied yet';
