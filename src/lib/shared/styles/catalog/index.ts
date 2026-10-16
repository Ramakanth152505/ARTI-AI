/**
 * The shared ARTI AI style catalogue.
 *
 * One catalogue serves Images and Videos. It is data, not UI: adding a style or a
 * whole category is a change to this file (or, later, to a database-backed
 * source) and never a UI rewrite.
 *
 * Composition:
 *  - `STYLE_CATEGORIES` are the eleven spec categories (A–K).
 *  - `LEGACY_IMAGE_STYLES` are the original image-only records, preserved
 *    verbatim and normalised here rather than rewritten, so their ids and wording
 *    survive exactly.
 *  - The authored group files add the broader spec catalogue.
 *
 * Honesty notes:
 *  - This is a curated baseline, NOT the complete set of visual styles that
 *    exist. It is structured so it can grow without bound.
 *  - Nothing is marked `available`: no model is connected, so every authored
 *    style is a `prompt-only` preset.
 *  - There is no preview field anywhere. No preview artwork exists, so the UI
 *    shows a deliberate text fallback instead of a fabricated thumbnail.
 */

import { LEGACY_IMAGE_STYLES } from './legacy';
import { GROUP_REALISM_CINEMATIC, GROUP_DIGITAL_ART, GROUP_ANIMATION, GROUP_ANIME_COMIC, GROUP_PAINTING, GROUP_PHOTOGRAPHY_SHARED } from './groups-a-f';
import { GROUP_DESIGN_GRAPHICS, GROUP_HISTORICAL_CULTURAL, GROUP_FANTASY_SCIFI, GROUP_SOCIAL_CREATOR, GROUP_EXPERIMENTAL } from './groups-g-k';
import type { MediaType, Style, StyleCategory } from '../types';

/** Display order is the spec's group order (A–K). */
export const STYLE_CATEGORIES: StyleCategory[] = [
        {
                id: 'realism-cinematic',
                label: 'Realism & Cinematic',
                description: 'Photographic realism, film looks and cinematic genre worlds.',
                mediaTypes: ['image', 'video']
        },
        {
                id: 'digital-art',
                label: 'Digital Art',
                description: 'Painted, rendered and illustrated digital imagery.',
                mediaTypes: ['image', 'video']
        },
        {
                id: 'animation',
                label: 'Animation',
                description: '2D, 3D and physical animation techniques.',
                mediaTypes: ['video']
        },
        {
                id: 'anime-comic',
                label: 'Anime & Comic',
                description: 'Anime, manga and comic-influenced visuals.',
                mediaTypes: ['image', 'video']
        },
        {
                id: 'painting-traditional',
                label: 'Painting & Traditional',
                description: 'Painterly media and hand-drawn techniques.',
                mediaTypes: ['image']
        },
        {
                id: 'photography',
                label: 'Photography',
                description: 'Lens-based imagery with realistic light and materials.',
                mediaTypes: ['image', 'video']
        },
        {
                id: 'design-graphics',
                label: 'Design & Graphics',
                description: 'Graphic design, typography, product and technical visuals.',
                mediaTypes: ['image', 'video']
        },
        {
                id: 'historical-cultural',
                label: 'Historical & Cultural',
                description: 'Period looks and cultural visual traditions.',
                mediaTypes: ['image', 'video']
        },
        {
                id: 'fantasy-scifi',
                label: 'Fantasy & Science Fiction',
                description: 'Imagined worlds, futures and mythic genres.',
                mediaTypes: ['image', 'video']
        },
        {
                id: 'social-creator',
                label: 'Social & Creator Formats',
                description: 'Formats built for social, brand and creator video.',
                mediaTypes: ['video']
        },
        {
                id: 'advanced-experimental',
                label: 'Advanced & Experimental',
                description: 'Simulation, generative and experimental visuals.',
                mediaTypes: ['image', 'video']
        }
];

/**
 * Legacy image categories folded into the spec categories.
 *
 * The original records keep their ids and wording; only the grouping changes so
 * both workspaces see one coherent set of eleven categories.
 */
const LEGACY_CATEGORY_MAP: Record<string, string> = {
        photography: 'photography',
        cinematic: 'realism-cinematic',
        'digital-art': 'digital-art',
        '3d': 'digital-art',
        illustration: 'digital-art',
        traditional: 'painting-traditional',
        genre: 'fantasy-scifi',
        stylised: 'design-graphics',
        commercial: 'social-creator',
        interior: 'design-graphics',
        nature: 'photography',
        graphic: 'design-graphics',
        educational: 'social-creator'
};

/** Individual legacy overrides, where the original category reads wrong today. */
const LEGACY_STYLE_CATEGORY_OVERRIDES: Record<string, string> = {
        anime: 'anime-comic',
        'manga-ink': 'anime-comic',
        'comic-book': 'anime-comic',
        'graphic-novel': 'anime-comic'
};

/** Normalises a name/id for duplicate detection: lowercase alphanumerics only. */
function normaliseKey(value: string): string {
        return value.toLowerCase().replace(/[^a-z0-9]+/g, '');
}

/** Converts one preserved legacy record into a full `Style`, defaulting honestly. */
function toStyle(record: (typeof LEGACY_IMAGE_STYLES)[number]): Style {
        return {
                id: record.id,
                name: record.name,
                categoryId: LEGACY_STYLE_CATEGORY_OVERRIDES[record.id] ?? LEGACY_CATEGORY_MAP[record.categoryId] ?? record.categoryId,
                summary: record.summary,
                promptTemplate: record.promptTemplate,
                negativeTemplate: record.negativeTemplate,
                preferredAspectRatios: record.preferredAspectRatios,
                hints: record.hints,
                keywords: record.keywords,
                // Both media by default: the guidance reads correctly for a still
                // or a shot unless a style says otherwise.
                mediaTypes: ['image', 'video'],
                // Never `available`: no model is connected, so nothing is verified.
                execution: 'prompt-only'
        };
}

/** Newly authored groups, in display order after the preserved records. */
const AUTHORED_GROUPS: Style[][] = [
        GROUP_REALISM_CINEMATIC,
        GROUP_DIGITAL_ART,
        GROUP_ANIMATION,
        GROUP_ANIME_COMIC,
        GROUP_PAINTING,
        GROUP_PHOTOGRAPHY_SHARED,
        GROUP_DESIGN_GRAPHICS,
        GROUP_HISTORICAL_CULTURAL,
        GROUP_FANTASY_SCIFI,
        GROUP_SOCIAL_CREATOR,
        GROUP_EXPERIMENTAL
];

/**
 * Builds the catalogue.
 *
 * The preserved records come first so their ids always resolve. An authored
 * record is added only when it introduces a genuinely new style — a record whose
 * id or name duplicates an existing one is skipped rather than shipping a second
 * near-identical card.
 */
function buildCatalog(): Style[] {
        const catalog: Style[] = [];
        const ids = new Set<string>();
        const names = new Set<string>();

        for (const record of LEGACY_IMAGE_STYLES) {
                const style = toStyle(record);
                catalog.push(style);
                ids.add(style.id);
                names.add(normaliseKey(style.name));
        }

        for (const groupList of AUTHORED_GROUPS) {
                for (const style of groupList) {
                        if (ids.has(style.id) || names.has(normaliseKey(style.name))) continue;
                        catalog.push(style);
                        ids.add(style.id);
                        names.add(normaliseKey(style.name));
                }
        }

        return catalog;
}

/** The complete catalogue, newest additions last. */
export const ALL_STYLES: Style[] = buildCatalog();

/** Styles usable for a given media type. */
export function stylesForMedia(media: MediaType): Style[] {
        return ALL_STYLES.filter((s) => s.mediaTypes.includes(media));
}

export function findStyle(id: string | null | undefined): Style | undefined {
        if (!id) return undefined;
        return ALL_STYLES.find((s) => s.id === id);
}

export function findCategory(id: string | null | undefined): StyleCategory | undefined {
        if (!id) return undefined;
        return STYLE_CATEGORIES.find((c) => c.id === id);
}

function normaliseQuery(query: string): string {
        return query.replace(/\s+/g, ' ').trim().toLowerCase();
}

/** Styles in a category, optionally narrowed to one media type. */
export function stylesInCategory(categoryId: string | null, media?: MediaType): Style[] {
        const pool = media ? stylesForMedia(media) : ALL_STYLES;
        if (!categoryId) return pool;
        return pool.filter((s) => s.categoryId === categoryId);
}

/**
 * Searches the catalogue by name, summary, category label, keywords and tags.
 * Filtering only narrows the returned result — the catalogue itself is never
 * modified.
 */
export function searchStyles(query: string, categoryId: string | null = null, media?: MediaType): Style[] {
        const pool = stylesInCategory(categoryId, media);
        const q = normaliseQuery(query);
        if (!q) return pool;
        return pool.filter((style) => {
                const category = findCategory(style.categoryId)?.label ?? '';
                const haystack = normaliseQuery(
                        [
                                style.name,
                                style.summary,
                                category,
                                ...(style.keywords ?? []),
                                ...(style.tags ?? [])
                        ].join(' ')
                );
                return haystack.includes(q);
        });
}

/** Number of styles per category id, for the filter rail. */
export function categoryCounts(media?: MediaType): Record<string, number> {
        const counts: Record<string, number> = {};
        for (const category of STYLE_CATEGORIES) counts[category.id] = 0;
        for (const style of media ? stylesForMedia(media) : ALL_STYLES) {
                counts[style.categoryId] = (counts[style.categoryId] ?? 0) + 1;
        }
        return counts;
}
