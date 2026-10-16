/**
 * Images module view of the SHARED style catalogue.
 *
 * The catalogue itself lives in `#lib/shared/styles` so the Images and Videos
 * workspaces read exactly one source and cannot drift apart. This module adds
 * only what is image-specific:
 *
 *  - the output-shape (`AspectRatio`) options the image composer offers, and
 *  - the pixel-dimension helper used to reserve layout space before a result loads.
 *
 * It re-exports the shared catalogue filtered to image-capable styles, keeping the
 * historic imported names (`IMAGE_STYLES`, `STYLE_CATEGORIES`) working for every
 * existing caller and test.
 *
 * Honesty notes (unchanged from the original module):
 *  - This is a curated baseline, NOT the complete set of image styles.
 *  - No preview artwork is generated or faked, so no style carries a thumbnail.
 *  - `promptTemplate` is the guidance actually merged into the prompt sent to the
 *    generation service. It is not decorative copy.
 */

import {
        ALL_STYLES,
        categoryCounts as sharedCategoryCounts,
        findCategory as sharedFindCategory,
        findStyle as sharedFindStyle,
        searchStyles as sharedSearchStyles,
        stylesForMedia,
        stylesInCategory as sharedStylesInCategory,
        STYLE_CATEGORIES as SHARED_STYLE_CATEGORIES
} from '#lib/shared/styles';
import type { Style, StyleCategory } from '#lib/shared/styles';

/** Historical name for a catalogue entry; the shared record is the source. */
export type ImageStyle = Style;

export type { StyleCategory };

/**
 * Output shapes offered by the image composer. Labels are user-facing; `value` is
 * the literal "w:h" string that maps onto a `width`/`height` request.
 */
export type AspectRatio = '1:1' | '4:5' | '16:9' | '9:16' | '3:2' | '2:3';

export interface AspectRatioOption {
        value: AspectRatio;
        label: string;
        /** Numeric width/height ratio, used to reserve layout space before load. */
        ratio: number;
        hint: string;
}

export const ASPECT_RATIOS: AspectRatioOption[] = [
        { value: '1:1', label: 'Square', ratio: 1, hint: 'Profile, product, icon' },
        { value: '4:5', label: 'Portrait', ratio: 4 / 5, hint: 'Social, editorial' },
        { value: '3:2', label: 'Classic', ratio: 3 / 2, hint: 'Photography' },
        { value: '2:3', label: 'Tall', ratio: 2 / 3, hint: 'Poster, print' },
        { value: '16:9', label: 'Widescreen', ratio: 16 / 9, hint: 'Cinematic, desktop' },
        { value: '9:16', label: 'Vertical', ratio: 9 / 16, hint: 'Stories, mobile' }
];

export const DEFAULT_ASPECT_RATIO: AspectRatio = '1:1';

export function findAspectRatio(value: AspectRatio): AspectRatioOption {
        return ASPECT_RATIOS.find((a) => a.value === value) ?? ASPECT_RATIOS[0];
}

/** Pixel dimensions implied by an aspect ratio, rounded to multiples of 8. */
export function dimensionsFor(value: AspectRatio, longEdge = 1024): { width: number; height: number } {
        const [w, h] = value.split(':').map(Number);
        const round8 = (n: number) => Math.max(8, Math.round(n / 8) * 8);
        if (w >= h) {
                return { width: round8(longEdge), height: round8((longEdge * h) / w) };
        }
        return { width: round8((longEdge * w) / h), height: round8(longEdge) };
}

/**
 * Image-capable styles from the shared catalogue, in catalogue order.
 *
 * A video-only style (e.g. a purely animation-technique preset) is not shown in
 * the image library, and the reverse holds in Videos. Both read one catalogue.
 */
export const IMAGE_STYLES: ImageStyle[] = stylesForMedia('image');

/** The shared category list. Identical in both workspaces. */
export const STYLE_CATEGORIES: StyleCategory[] = SHARED_STYLE_CATEGORIES;

export function findCategory(id: string | null): StyleCategory | undefined {
        return sharedFindCategory(id);
}

export function findStyle(id: string | null | undefined): ImageStyle | undefined {
        return sharedFindStyle(id);
}

/** Styles belonging to a category. A null category returns every image style. */
export function stylesInCategory(categoryId: string | null): ImageStyle[] {
        return sharedStylesInCategory(categoryId, 'image');
}

/** Searches the catalogue, narrowed to image-capable styles. */
export function searchStyles(query: string, categoryId: string | null = null): ImageStyle[] {
        return sharedSearchStyles(query, categoryId, 'image');
}

/** Number of image-capable styles per category id, for the filter rail. */
export function categoryCounts(): Record<string, number> {
        return sharedCategoryCounts('image');
}

/** The complete shared catalogue, both media — used by the shared style library. */
export { ALL_STYLES };
