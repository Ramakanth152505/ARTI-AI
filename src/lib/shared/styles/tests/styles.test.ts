/**
 * Unit tests for the SHARED style catalogue.
 *
 * These guard the property the whole feature depends on: Images and Videos read
 * one catalogue, so the same style ids resolve in both workspaces and neither can
 * silently lose a style the other has.
 */

import { describe, expect, it } from 'vitest';
import {
        ALL_STYLES,
        STYLE_CATEGORIES,
        categoryCounts,
        findCategory,
        findStyle,
        searchStyles,
        stylesForMedia,
        stylesInCategory
} from '#lib/shared/styles';
import { IMAGE_STYLES, findStyle as findImageStyle } from '#lib/images/styles';

describe('shared catalogue integrity', () => {
        it('has a unique id for every style', () => {
                const ids = ALL_STYLES.map((s) => s.id);
                expect(new Set(ids).size).toBe(ids.length);
        });

        it('has a unique display name for every style', () => {
                const names = ALL_STYLES.map((s) => s.name.toLowerCase().replace(/[^a-z0-9]/g, ''));
                expect(new Set(names).size).toBe(names.length);
        });

        it('places every style in a known category', () => {
                const categoryIds = new Set(STYLE_CATEGORIES.map((c) => c.id));
                for (const style of ALL_STYLES) {
                        expect(categoryIds.has(style.categoryId), `${style.id} → ${style.categoryId}`).toBe(true);
                }
        });

        it('covers every category with at least one style', () => {
                const counts = categoryCounts();
                for (const category of STYLE_CATEGORIES) {
                        expect(counts[category.id], category.id).toBeGreaterThan(0);
                }
        });

        it('gives every style real prompt guidance, media types and an execution state', () => {
                for (const style of ALL_STYLES) {
                        expect(style.promptTemplate.trim().length, style.id).toBeGreaterThan(20);
                        expect(style.name.trim().length, style.id).toBeGreaterThan(0);
                        expect(style.mediaTypes.length, style.id).toBeGreaterThan(0);
                        expect(style.execution, style.id).toBeTruthy();
                }
        });

        it('claims nothing is verified while no model is connected', () => {
                expect(ALL_STYLES.every((s) => s.execution !== 'available')).toBe(true);
        });

        it('never invents a preview asset', () => {
                expect(ALL_STYLES.every((s) => !('preview' in s))).toBe(true);
        });

        it('spans the eleven spec categories', () => {
                expect(STYLE_CATEGORIES).toHaveLength(11);
        });

        it('offers a substantial catalogue for both media', () => {
                expect(stylesForMedia('image').length).toBeGreaterThan(80);
                expect(stylesForMedia('video').length).toBeGreaterThan(80);
        });
});

describe('media filtering', () => {
        it('excludes a video-only style from the image pool', () => {
                const imageIds = new Set(stylesForMedia('image').map((s) => s.id));
                const videoOnly = ALL_STYLES.filter((s) => s.mediaTypes.length === 1 && s.mediaTypes[0] === 'video');
                expect(videoOnly.length).toBeGreaterThan(0);
                for (const style of videoOnly) {
                        expect(imageIds.has(style.id), style.id).toBe(false);
                }
        });

        it('never grows the catalogue by filtering', () => {
                expect(stylesForMedia('image').length).toBeLessThanOrEqual(ALL_STYLES.length);
                expect(stylesInCategory('photography', 'image').every((s) => s.categoryId === 'photography')).toBe(true);
        });
});

describe('search', () => {
        it('matches on name, summary and keywords', () => {
                // The preserved image record keeps the plain "Cyberpunk" id; the
                // authored near-duplicate is skipped by the dedupe.
                expect(searchStyles('cyberpunk').some((s) => s.id === 'cyberpunk')).toBe(true);
                expect(searchStyles('neon').length).toBeGreaterThan(0);
        });

        it('is case- and whitespace-insensitive', () => {
                expect(searchStyles('  HYPERREALISTIC  ').length).toBeGreaterThan(0);
        });

        it('returns the whole pool for an empty query', () => {
                expect(searchStyles('').length).toBe(ALL_STYLES.length);
                expect(searchStyles('', 'photography', 'image').length).toBe(
                        stylesInCategory('photography', 'image').length
                );
        });

        it('returns nothing for a term that matches no style', () => {
                expect(searchStyles('zzzznotastyle')).toHaveLength(0);
        });
});

describe('one catalogue for both workspaces', () => {
        it('resolves an image style through the shared entry point', () => {
                expect(findStyle('cinematic-photorealism')?.name).toBe('Cinematic Photorealism');
                expect(findImageStyle('cinematic-photorealism')?.name).toBe('Cinematic Photorealism');
        });

        it('keeps every image style available in the shared catalogue', () => {
                for (const style of IMAGE_STYLES) {
                        expect(findStyle(style.id), style.id).toBeTruthy();
                }
        });

        it('resolves a video-oriented style (animation) that the image list narrows', () => {
                const animationStyle = findStyle('stop-motion');
                expect(animationStyle).toBeTruthy();
                expect(animationStyle!.categoryId).toBe('animation');
        });

        it('returns nothing for unknown ids and null categories', () => {
                expect(findStyle('does-not-exist')).toBeUndefined();
                expect(findStyle(null)).toBeUndefined();
                expect(findCategory(null)).toBeUndefined();
        });
});
