/**
 * Unit tests for the pure Images logic.
 *
 * These exercise the real modules (no mocks): the style catalog, prompt
 * composition and the required "selecting a style inserts its template" behavior,
 * prompt validation, reference-image pre-validation, asset-action helpers and the
 * honest request validation boundary. DOM-dependent code (the reactive state
 * class, canvas rendering, downloads) is covered by the browser QA pass instead,
 * since it needs a real DOM and network.
 */

import { describe, expect, it } from 'vitest';
import {
        ASPECT_RATIOS,
        DEFAULT_ASPECT_RATIO,
        IMAGE_STYLES,
        STYLE_CATEGORIES,
        categoryCounts,
        dimensionsFor,
        findAspectRatio,
        findCategory,
        findStyle,
        searchStyles,
        stylesInCategory
} from '#lib/images/styles';
import { categoryCounts as categoryCountsAcrossAll } from '#lib/shared/styles';
import {
        applyStyleTemplate,
        composePrompt,
        MAX_PROMPT_LENGTH,
        mergeNegativePrompt,
        parseNegativePrompt,
        promptTitle,
        removeStyleTemplate,
        styleAlreadyApplied,
        validateGenerationRequest,
        validatePrompt
} from '#lib/images/prompt';
import { validateReference, toReferenceAttachments, submitReference } from '#lib/images/references';
import { MAX_REFERENCE_BYTES } from '#lib/images/config';
import { filenameFor } from '#lib/images/actions';
import { countReadyAssets, deriveTitle, searchImageConversations } from '#lib/images/search';
import { clampCount } from '#lib/images/service/imageService';
import { newId, newRequestId } from '#lib/shared/ids';
import { formatBytes, formatCount, relativeTime, truncate } from '#lib/shared/text';
import type { ImageConversation, ImageMessage } from '#lib/images/types';

const cinematic = findStyle('cinematic-photorealism')!;

describe('style catalog integrity', () => {
        it('gives every style a unique id', () => {
                const ids = IMAGE_STYLES.map((s) => s.id);
                expect(new Set(ids).size).toBe(ids.length);
        });

        it('gives every style a valid category and a prompt template', () => {
                const categoryIds = new Set(STYLE_CATEGORIES.map((c) => c.id));
                for (const style of IMAGE_STYLES) {
                        expect(categoryIds.has(style.categoryId), `${style.id} → ${style.categoryId}`).toBe(true);
                        expect(style.promptTemplate.trim().length).toBeGreaterThan(20);
                        expect(style.name.trim().length).toBeGreaterThan(0);
                }
        });

        it('covers every category with at least one style', () => {
                // The shared catalogue spans both media; category coverage is asserted
                // against the whole catalogue. A video-only category legitimately has
                // no image-capable style, so the image subset is not used here.
                const counts = categoryCountsAcrossAll();
                for (const category of STYLE_CATEGORIES) {
                        expect(counts[category.id], category.id).toBeGreaterThan(0);
                }
        });

        it('does not claim any style is verified, since no model is connected', () => {
                expect(IMAGE_STYLES.every((s) => s.execution !== 'available')).toBe(true);
        });

        it('does not invent preview images', () => {
                expect(IMAGE_STYLES.every((s) => !('preview' in s))).toBe(true);
        });

        it('filters by category without dropping styles from the catalog', () => {
                const inCategory = stylesInCategory('photography');
                expect(inCategory.length).toBeGreaterThan(0);
                expect(inCategory.every((s) => s.categoryId === 'photography')).toBe(true);
                // The catalog itself is untouched by filtering.
                expect(IMAGE_STYLES.length).toBeGreaterThan(inCategory.length);
        });
});

describe('style search', () => {
        it('matches on name, summary and keywords', () => {
                expect(searchStyles('cyberpunk').some((s) => s.id === 'cyberpunk')).toBe(true);
                expect(searchStyles('neon').some((s) => s.id === 'cyberpunk')).toBe(true);
        });

        it('is case- and whitespace-insensitive', () => {
                expect(searchStyles('  CINEMATIC  ').length).toBeGreaterThan(0);
        });

        it('returns the whole pool for an empty query (nothing is hidden)', () => {
                expect(searchStyles('').length).toBe(IMAGE_STYLES.length);
                expect(searchStyles('', 'photography').length).toBe(stylesInCategory('photography').length);
        });

        it('returns nothing for a term that matches no style', () => {
                expect(searchStyles('zzzznotastyle')).toHaveLength(0);
        });

        it('does not mutate the catalog', () => {
                const before = IMAGE_STYLES.length;
                searchStyles('neon');
                expect(IMAGE_STYLES.length).toBe(before);
        });
});

describe('prompt composition preserves the user subject', () => {
        it('returns the subject unchanged when no style is selected', () => {
                expect(composePrompt('A cat on a roof', null)).toBe('A cat on a roof');
        });

        it('uses the template alone when the subject is empty', () => {
                expect(composePrompt('', cinematic)).toBe(cinematic.promptTemplate);
        });

        it('keeps the subject and adds the style guidance', () => {
                const composed = composePrompt('A futuristic workspace', cinematic);
                expect(composed).toContain('A futuristic workspace');
                expect(composed).toContain(cinematic.promptTemplate);
        });

        it('is idempotent and never stacks the template twice', () => {
                const once = composePrompt('A subject', cinematic);
                const twice = composePrompt(once, cinematic);
                expect(twice).toBe(once);
                const occurrences = twice.split(cinematic.promptTemplate).length - 1;
                expect(occurrences).toBe(1);
        });
});

describe('selecting a style inserts its template (the required behavior)', () => {
        it('inserts directly into an empty draft', () => {
                expect(applyStyleTemplate('', cinematic, 'insert')).toBe(cinematic.promptTemplate);
        });

        it('adds the guidance to an existing draft without discarding it', () => {
                const result = applyStyleTemplate('A lighthouse at night', cinematic, 'append');
                expect(result).toContain('A lighthouse at night');
                expect(result).toContain(cinematic.promptTemplate);
        });

        it('does not duplicate an already-applied template', () => {
                const once = applyStyleTemplate('A subject', cinematic, 'insert');
                const again = applyStyleTemplate(once, cinematic, 'insert');
                expect(again).toBe(once);
        });

        it('only replaces when replace is explicitly chosen', () => {
                expect(applyStyleTemplate('My own words', cinematic, 'replace')).toBe(cinematic.promptTemplate);
        });

        it('detects when a template is already applied', () => {
                expect(styleAlreadyApplied(composePrompt('x', cinematic), cinematic)).toBe(true);
                expect(styleAlreadyApplied('x', cinematic)).toBe(false);
        });
});

describe('removing a style leaves the user words intact', () => {
        it('strips exactly the guidance it added', () => {
                const withStyle = applyStyleTemplate('A lonely tree', cinematic, 'append');
                expect(removeStyleTemplate(withStyle, cinematic)).toBe('A lonely tree');
        });

        it('keeps text the user typed after applying the style', () => {
                const withStyle = `${applyStyleTemplate('A lonely tree', cinematic, 'append')} and heavy fog`;
                const stripped = removeStyleTemplate(withStyle, cinematic);
                expect(stripped).toContain('A lonely tree');
                expect(stripped).toContain('and heavy fog');
                expect(stripped).not.toContain(cinematic.promptTemplate);
        });
});

describe('prompt validation', () => {
        it('rejects an empty or whitespace prompt', () => {
                expect(validatePrompt('').ok).toBe(false);
                expect(validatePrompt('   ').ok).toBe(false);
        });

        it('accepts a normal prompt', () => {
                expect(validatePrompt('A quiet harbour at dawn').ok).toBe(true);
        });

        it('rejects an over-long prompt', () => {
                const tooLong = 'a'.repeat(MAX_PROMPT_LENGTH + 1);
                expect(validatePrompt(tooLong).ok).toBe(false);
        });
});

describe('prompt titling and negative prompts', () => {
        it('derives a title from the subject, not the style template', () => {
                const composed = composePrompt('A neon alley in the rain', cinematic);
                expect(promptTitle(composed, cinematic)).toBe('A neon alley in the rain');
        });

        it('falls back to the style name when there is no subject', () => {
                expect(promptTitle('', cinematic)).toBe(cinematic.name);
        });

        it('parses and merges negative terms without duplicates', () => {
                expect(parseNegativePrompt('blurry, extra fingers\nlow quality')).toEqual([
                        'blurry',
                        'extra fingers',
                        'low quality'
                ]);
                expect(mergeNegativePrompt('blurry', ['Blurry', 'artifacts'])).toBe('blurry, artifacts');
        });
});

describe('generation request validation', () => {
        const base = {
                prompt: 'A subject',
                styleId: 'cyberpunk',
                aspectRatio: DEFAULT_ASPECT_RATIO,
                count: 1,
                hasReference: false
        };

        it('accepts a valid request and resolves its style', () => {
                const result = validateGenerationRequest(base);
                expect(result.ok).toBe(true);
                expect(result.value?.style?.id).toBe('cyberpunk');
        });

        it('rejects an empty prompt', () => {
                expect(validateGenerationRequest({ ...base, prompt: '   ' }).ok).toBe(false);
        });

        it('rejects an out-of-range image count', () => {
                expect(validateGenerationRequest({ ...base, count: 0 }).ok).toBe(false);
                expect(validateGenerationRequest({ ...base, count: 9 }).ok).toBe(false);
        });

        it('accepts a null style', () => {
                const result = validateGenerationRequest({ ...base, styleId: null });
                expect(result.ok).toBe(true);
                expect(result.value?.style).toBeNull();
        });
});

describe('aspect ratios and dimensions', () => {
        it('resolves a known ratio and falls back for an unknown one', () => {
                expect(findAspectRatio('16:9').ratio).toBeCloseTo(16 / 9);
                expect(findAspectRatio('nonsense' as never)).toBe(ASPECT_RATIOS[0]);
        });

        it('produces rounded dimensions that preserve orientation', () => {
                const wide = dimensionsFor('16:9', 1024);
                expect(wide.width).toBeGreaterThan(wide.height);
                const tall = dimensionsFor('9:16', 1024);
                expect(tall.height).toBeGreaterThan(tall.width);
                expect(wide.width % 8).toBe(0);
                expect(wide.height % 8).toBe(0);
        });
});

describe('reference-image pre-validation', () => {
        function fakeFile(name: string, type: string, size = 1024): File {
                return { name, type, size } as File;
        }

        it('accepts a supported image below the size limit', () => {
                expect(validateReference(fakeFile('photo.png', 'image/png')).ok).toBe(true);
                expect(validateReference(fakeFile('pic.jpg', 'image/jpeg')).ok).toBe(true);
        });

        it('rejects an unsupported type', () => {
                const result = validateReference(fakeFile('notes.pdf', 'application/pdf'));
                expect(result.ok).toBe(false);
                expect(result.reason).toContain('PNG, JPEG or WebP');
        });

        it('rejects an oversized image', () => {
                const result = validateReference(fakeFile('huge.png', 'image/png', MAX_REFERENCE_BYTES + 1));
                expect(result.ok).toBe(false);
                expect(result.reason).toContain('larger than');
        });

        it('keeps only one reference image and rejects extras with a reason', () => {
                const created = toReferenceAttachments(
                        [fakeFile('a.png', 'image/png'), fakeFile('b.png', 'image/png')],
                        false
                );
                expect(created[0].status).toBe('selected');
                expect(created[1].status).toBe('rejected');
                expect(created[1].detail).toContain('Only one');
        });

        it('never creates a preview URL when previews are disabled', () => {
                const created = toReferenceAttachments([fakeFile('a.png', 'image/png')], false);
                expect(created[0].previewUrl).toBeUndefined();
        });

        it('is honest that nothing was uploaded without a storage service', async () => {
                const created = toReferenceAttachments([fakeFile('a.png', 'image/png')], false);
                const result = await submitReference(created, 'not configured');
                expect(result.uploaded).toBe(0);
                expect(result.attachments[0].status).toBe('failed');
                expect(result.notice).toBe('not configured');
        });
});

describe('clampCount honours the configured limit', () => {
        it('never returns less than one image', () => {
                expect(clampCount(0)).toBe(1);
                expect(clampCount(-5)).toBe(1);
                expect(clampCount(Number.NaN)).toBe(1);
        });

        it('never exceeds the configured maximum', () => {
                expect(clampCount(99)).toBeLessThanOrEqual(4);
        });
});

describe('download filenames follow the asset type', () => {
        it('uses the mime type when available', () => {
                expect(filenameFor('https://x/y', 'image/jpeg')).toBe('arti-image.jpg');
                expect(filenameFor('https://x/y', 'image/webp')).toBe('arti-image.webp');
        });

        it('falls back to the URL extension, then to png', () => {
                expect(filenameFor('https://x/y.jpg')).toBe('arti-image.jpg');
                expect(filenameFor('https://x/y')).toBe('arti-image.png');
        });
});

describe('image conversation search', () => {
        function makeConversation(id: string, title: string): ImageConversation {
                const now = new Date().toISOString();
                return {
                        id,
                        ownerId: 'w',
                        title,
                        titleIsAuto: false,
                        createdAt: now,
                        updatedAt: now,
                        pinned: false,
                        archived: false,
                        styleId: null,
                        aspectRatio: DEFAULT_ASPECT_RATIO
                };
        }

        it('matches titles first', () => {
                const conversations = [makeConversation('c1', 'Neon city')];
                const results = searchImageConversations(conversations, new Map(), 'neon');
                expect(results).toHaveLength(1);
                expect(results[0].matchedOn).toBe('title');
        });

        it('returns nothing for a blank query', () => {
                expect(searchImageConversations([makeConversation('c1', 'x')], new Map(), '  ')).toHaveLength(0);
        });

        it('derives a placeholder title for empty input', () => {
                expect(deriveTitle('   ')).toBe('New image');
        });
});

describe('shared helpers', () => {
        it('mints unique ids', () => {
                expect(newId()).not.toBe(newId());
                expect(newRequestId().startsWith('req_')).toBe(true);
        });

        it('formats bytes and counts', () => {
                expect(formatBytes(0)).toBe('0 B');
                expect(formatBytes(2048)).toBe('2 KB');
                expect(formatCount(1, 'image')).toBe('1 image');
                expect(formatCount(3, 'image')).toBe('3 images');
        });

        it('truncates with an ellipsis', () => {
                expect(truncate('a'.repeat(50), 10).endsWith('…')).toBe(true);
        });

        it('formats relative time', () => {
                const base = Date.parse('2026-01-01T12:00:00.000Z');
                expect(relativeTime(new Date(base - 5_000).toISOString(), base)).toBe('just now');
        });
});

describe('counts only ready assets', () => {
        it('ignores generating and failed assets', () => {
                const message = {
                        assets: [
                                { status: 'ready' },
                                { status: 'generating' },
                                { status: 'failed' },
                                { status: 'ready' }
                        ]
                } as unknown as ImageMessage;
                expect(countReadyAssets([message])).toBe(2);
        });
});

describe('findCategory and findStyle', () => {
        it('resolves known ids and returns nothing for unknown ones', () => {
                expect(findCategory('photography')?.label).toBe('Photography');
                expect(findCategory(null)).toBeUndefined();
                expect(findStyle('does-not-exist')).toBeUndefined();
                expect(findStyle(null)).toBeUndefined();
        });
});
