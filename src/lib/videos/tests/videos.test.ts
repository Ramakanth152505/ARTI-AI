/**
 * Unit tests for the Videos module's pure logic.
 *
 * These cover the properties the acceptance criteria depend on and that can be
 * verified without a configured model: recursive folder integrity and cycle
 * prevention, style→prompt transfer that preserves user text, aspect-ratio and
 * resolution accuracy, duration planning for long productions, and job
 * retry/progress semantics.
 *
 * They assert the honesty rules too: no style claims verification while no model
 * is connected, and an export format is not advertised until its encoder exists.
 */

import { describe, expect, it } from 'vitest';
import {
        ancestorsOf,
        breadcrumb,
        canMove,
        childFolders,
        deleteImpact,
        descendantsOf,
        flattenTree,
        maxDepth,
        reorderSiblings,
        uniqueName
} from '#lib/videos/tree';
import {
        applyStyleToDraft,
        composeVideoPrompt,
        hasStructuredBrief,
        removeStyleFromDraft,
        resolveStyle,
        splitIntoShots,
        structuredAlreadyApplied,
        validatePrompt
} from '#lib/videos/prompt';
import {
        ASPECT_RATIOS,
        EXPORT_FORMATS,
        MAX_SINGLE_CLIP_SECONDS,
        customAspectRatio,
        describeDimensions,
        findExportFormat,
        frameCount,
        isKnownAspectRatio,
        nearestSupportedResolution,
        planDuration,
        requiresUpscale,
        resolutionDimensions,
        sumMeasuredSeconds
} from '#lib/videos/formats';
import { ALL_STYLES, findStyle, stylesForMedia } from '#lib/shared/styles';
import { canRetryJob, jobProgress, shouldRetry, summariseQueue } from '#lib/videos/queue';
import type { Folder, GenerationJob } from '#lib/videos/types';

function folder(partial: Partial<Folder> & { id: string; name: string }): Folder {
        return {
                ownerId: 'ws',
                projectId: 'p1',
                parentId: null,
                order: 0,
                pinned: false,
                archived: false,
                createdAt: '2026-01-01T00:00:00.000Z',
                updatedAt: '2026-01-01T00:00:00.000Z',
                ...partial
        };
}

// A tree mirroring the spec's illustrative structure.
const folders: Folder[] = [
        folder({ id: 's1', name: '01 — Season 1', order: 0 }),
        folder({ id: 'e1', name: 'Episode 01', parentId: 's1', order: 0 }),
        folder({ id: 'sc1', name: 'Scene 01', parentId: 'e1', order: 0 }),
        folder({ id: 'e2', name: 'Episode 02', parentId: 's1', order: 1 }),
        folder({ id: 's2', name: '02 — Season 2', order: 1 }),
        folder({ id: 'ex', name: 'Exports', order: 2 })
];

// Deliberately nested four levels deep to prove depth is unbounded.
const deep: Folder[] = [
        folder({ id: 'a', name: 'A' }),
        folder({ id: 'b', name: 'B', parentId: 'a' }),
        folder({ id: 'c', name: 'C', parentId: 'b' }),
        folder({ id: 'd', name: 'D', parentId: 'c' }),
        folder({ id: 'e', name: 'E', parentId: 'd' })
];

describe('recursive folders', () => {
        it('keeps parent relationships in the flattened tree', () => {
                const flat = flattenTree(folders, null);
                expect(flat.find((n) => n.folder.id === 'sc1')?.depth).toBe(2);
                expect(flat.find((n) => n.folder.id === 's2')?.depth).toBe(0);
        });

        it('reports breadcrumbs from the root down', () => {
                const crumbs = breadcrumb(folders, 'sc1', 'Project');
                expect(crumbs.map((c) => c.id)).toEqual([null, 's1', 'e1', 'sc1']);
                expect(crumbs[0].name).toBe('Project');
        });

        it('lists only the direct children of a parent', () => {
                expect(childFolders(folders, 's1').map((f) => f.id)).toEqual(['e1', 'e2']);
                expect(childFolders(folders, null).map((f) => f.id)).toEqual(['s1', 's2', 'ex']);
        });

        it('supports arbitrary folder depth', () => {
                expect(ancestorsOf(deep, 'e')).toEqual(['d', 'c', 'b', 'a']);
                expect(descendantsOf(deep, 'a').sort()).toEqual(['b', 'c', 'd', 'e']);
                expect(maxDepth(deep)).toBe(4);
                expect(flattenTree(deep, null).find((n) => n.folder.id === 'e')?.depth).toBe(4);
        });

        it('prevents a folder from becoming its own descendant', () => {
                expect(canMove(folders, 's1', 'sc1').ok).toBe(false);
                expect(canMove(folders, 's1', 's1').ok).toBe(false);
                // Moving a leaf under another branch is fine.
                expect(canMove(folders, 'ex', 'e2').ok).toBe(true);
                expect(canMove(folders, 'ex', null).ok).toBe(true);
        });

        it('reorders siblings by returning order patches, never dropping a folder', () => {
                const patches = reorderSiblings(folders, 's2', 'up');
                expect(patches).not.toBeNull();
                const byId = new Map(patches!.map((p) => [p.id, p.order]));
                // s1 and s2 swap their order values.
                expect(byId.get('s2')).toBe(0);
                expect(byId.get('s1')).toBe(1);
                expect(patches!.length).toBe(3);
                expect(reorderSiblings(folders, 's1', 'up')).toBeNull();
        });

        it('names a folder uniquely among its siblings', () => {
                expect(uniqueName(folders, null, 'Exports')).toBe('Exports (2)');
                expect(uniqueName(folders, null, 'Trailers')).toBe('Trailers');
        });

        it('explains deletion impact with a real subtree count', () => {
                const impact = deleteImpact(folders, 's1', {
                        projectsByFolder: new Map(),
                        assetsByFolder: new Map()
                });
                expect(impact.subfolders).toBe(3);
                expect(impact.destructive).toBe(true);
        });
});

describe('style → prompt transfer', () => {
        const style = findStyle('cyberpunk')!;

        it('preserves the user prompt when a style is applied', () => {
                const original = 'A lone courier crosses the rooftop at dawn.';
                const composed = applyStyleToDraft(original, style, 'append', {
                        aspectRatio: '16:9',
                        durationSeconds: 10
                });
                expect(composed).toContain(original);
                expect(composed).toContain(style.name);
                expect(hasStructuredBrief(composed)).toBe(true);
        });

        it('inserts without discarding the original text', () => {
                const original = 'A lighthouse in a storm.';
                expect(applyStyleToDraft(original, style, 'insert')).toContain(original);
        });

        it('is idempotent: applying the same style twice does not stack guidance', () => {
                const once = applyStyleToDraft('A desert highway.', style, 'append');
                const twice = applyStyleToDraft(once, style, 'append');
                expect(twice).toBe(once);
                expect(structuredAlreadyApplied(once, style)).toBe(true);
        });

        it('removes the structured brief while leaving the user text intact', () => {
                const original = 'A lighthouse in a storm.';
                const composed = applyStyleToDraft(original, style, 'append');
                const cleaned = removeStyleFromDraft(composed, style);
                expect(cleaned).toContain(original);
                expect(structuredAlreadyApplied(cleaned, style)).toBe(false);
        });

        it('replaces the prompt with a brief built from it when asked to', () => {
                const replaced = applyStyleToDraft('Old text.', style, 'replace');
                // Replace swaps free text for the structured brief; the words are carried
                // into the Subject field, not dropped on the floor.
                expect(replaced.startsWith('[STRUCTURED VIDEO BRIEF]')).toBe(true);
                expect(replaced).toContain('Old text.');
        });

        it('builds a detailed brief from the style template and video settings', () => {
                const brief = composeVideoPrompt('A botanist catalogs alien flora.', style, {
                        aspectRatio: '21:9',
                        resolution: '2160p',
                        frameRate: 24,
                        durationSeconds: 8
                });
                expect(brief).toContain('A botanist catalogs alien flora.');
                expect(brief).toContain(style.name);
                expect(brief).toContain('21:9');
                expect(brief.length).toBeGreaterThan(style.promptTemplate.length);
        });

        it('resolves a style id from the shared catalogue', () => {
                expect(resolveStyle('cyberpunk')?.id).toBe('cyberpunk');
                expect(resolveStyle('does-not-exist')).toBeNull();
                expect(resolveStyle(null)).toBeNull();
        });

        it('never claims a style is verified while no model is connected', () => {
                expect(ALL_STYLES.every((s) => s.execution !== 'available')).toBe(true);
        });

        it('exposes the same catalogue to video and image media types', () => {
                const video = stylesForMedia('video').map((s) => s.id).sort();
                const image = stylesForMedia('image').map((s) => s.id).sort();
                expect(video.length).toBeGreaterThan(0);
                expect(image.length).toBeGreaterThan(0);
                expect(video.filter((id) => image.includes(id)).length).toBeGreaterThan(0);
        });

        it('validates prompts honestly', () => {
                expect(validatePrompt('   ').ok).toBe(false);
                expect(validatePrompt('a'.repeat(9000)).ok).toBe(false);
                expect(validatePrompt('A ten second shot of rain on glass.').ok).toBe(true);
        });

        it('splits a description into numbered shots with time suggestions', () => {
                const shots = splitIntoShots('Shot one. Shot two. Shot three.', 5);
                expect(shots.map((s) => s.number)).toEqual([1, 2, 3]);
                expect(shots.every((s) => s.suggestedSeconds >= 1)).toBe(true);
        });
});

describe('aspect ratios and resolutions', () => {
        it('offers the required ratios with orientation and intended use', () => {
                const values = ASPECT_RATIOS.map((r) => r.value);
                for (const required of ['9:16', '16:9', '1:1', '4:5', '5:4', '4:3', '3:2', '2:3', '3:4', '21:9', '2.39:1', '2.35:1', '17:9', '9:3']) {
                        expect(values, required).toContain(required);
                }
                expect(ASPECT_RATIOS.every((r) => r.orientation && r.usage)).toBe(true);
        });

        it('validates a custom ratio and rejects nonsense', () => {
                expect(customAspectRatio(1920, 800).ok).toBe(true);
                expect(customAspectRatio(0, 800).ok).toBe(false);
                expect(customAspectRatio(100, 1200).ok).toBe(false);
        });

        it('reports the actual output dimensions rather than a label', () => {
                expect(describeDimensions('2160p', '16:9')).toBe('3840 × 2160');
                expect(resolutionDimensions('1080p', '9:16')).toEqual({ width: 1080, height: 1920 });
        });

        it('does not pretend a lower-resolution model can output larger natively', () => {
                expect(requiresUpscale('2160p', 1920)).toBe(true);
                expect(requiresUpscale('1080p', 1920)).toBe(false);
                expect(nearestSupportedResolution(1920).value).toBe('1080p');
                expect(nearestSupportedResolution(1080).value).toBe('480p');
        });

        it('counts frames from real settings and recognises known ratios', () => {
                expect(frameCount(10, 24)).toBe(240);
                expect(isKnownAspectRatio('21:9')).toBe(true);
                expect(isKnownAspectRatio('7:3')).toBe(false);
        });
});

describe('long-form duration planning', () => {
        it('splits a long production into bounded clips', () => {
                const plan = planDuration(3600, MAX_SINGLE_CLIP_SECONDS);
                expect(plan.segments.length).toBe(60);
                expect(plan.needsAssembly).toBe(true);
                expect(plan.segments.every((s) => s.seconds <= MAX_SINGLE_CLIP_SECONDS)).toBe(true);
        });

        it('treats a one-second clip as a single clip', () => {
                const plan = planDuration(1, 5);
                expect(plan.segments.length).toBe(1);
                expect(plan.needsAssembly).toBe(false);
        });

        it('plans a 1000-hour aggregate as many clips rather than one job', () => {
                const plan = planDuration(1000 * 3600, 30);
                expect(plan.segments.length).toBe(120000);
                expect(plan.needsAssembly).toBe(true);
        });

        it('measures duration from assets, not user estimates', () => {
                expect(sumMeasuredSeconds([{ producedDurationSeconds: 5 }, { producedDurationSeconds: 10 }, {}])).toBe(15);
        });
});

describe('generation queue semantics', () => {
        function job(partial: Partial<GenerationJob>): GenerationJob {
                return {
                        id: 'j1',
                        ownerId: 'ws',
                        projectId: 'p1',
                        seriesId: null,
                        seasonId: null,
                        episodeId: null,
                        moviePartId: null,
                        sceneId: null,
                        shotId: null,
                        promptVersionId: 'v1',
                        styleId: null,
                        pipeline: '',
                        requestedDurationSeconds: 5,
                        requestedResolution: '1080p',
                        requestedAspectRatio: '16:9',
                        requestedFrameRate: 24,
                        stage: 'queued',
                        progress: null,
                        priority: 0,
                        retryCount: 0,
                        maxRetries: 3,
                        idempotencyKey: 'k',
                        assetIds: [],
                        createdAt: '2026-01-01T00:00:00.000Z',
                        updatedAt: '2026-01-01T00:00:00.000Z',
                        ...partial
                };
        }

        it('shows progress only when the backend reported it', () => {
                expect(jobProgress({ progress: 42, stage: 'generating' })).toBe(42);
                expect(jobProgress({ progress: null, stage: 'generating' })).toBeNull();
        });

        it('retries a failure but not a job that already has output', () => {
                expect(canRetryJob(job({ stage: 'failed' }))).toBe(true);
                expect(canRetryJob(job({ stage: 'failed', assetIds: ['a1'] }))).toBe(false);
                expect(shouldRetry(job({ stage: 'failed' })).ok).toBe(true);
                expect(shouldRetry(job({ stage: 'failed', retryCount: 3 })).ok).toBe(false);
                expect(shouldRetry(job({ stage: 'failed', assetIds: ['a1'] })).ok).toBe(false);
        });

        it('summarises a queue with partial success', () => {
                const summary = summariseQueue([
                        job({ id: 'a', stage: 'completed' }),
                        job({ id: 'b', stage: 'failed' }),
                        job({ id: 'c', stage: 'generating' }),
                        job({ id: 'd', stage: 'queued' })
                ]);
                expect(summary.completed).toBe(1);
                expect(summary.failed).toBe(1);
                expect(summary.active + summary.queued).toBe(2);
                expect(summary.total).toBe(4);
        });
});

describe('export honesty', () => {
        it('does not advertise a codec until its encoder exists', () => {
                for (const id of ['mp4-h264', 'webm-vp9', 'mov-prores', 'subtitles-srt']) {
                        expect(findExportFormat(id)!.implemented, id).toBe(false);
                }
        });

        it('marks the metadata export as implemented because it is real', () => {
                expect(findExportFormat('metadata-json')!.implemented).toBe(true);
                expect(EXPORT_FORMATS.every((f) => typeof f.note === 'string' && f.note.length > 0)).toBe(true);
        });
});
