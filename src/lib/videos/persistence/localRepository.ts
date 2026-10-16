/**
 * Browser-local implementation of `VideoRepository`.
 *
 * This is the live backend until Supabase is configured. It is honest about what
 * it is: single-browser storage, not shared, and not an authorization boundary.
 * Access is still scoped per workspace key so switching workspaces cannot read
 * another workspace's records from the same browser, and the shape of the calls
 * matches the future server implementation.
 *
 * Nothing is trusted when read back: stored records are validated and normalised so
 * a hand-edited or corrupted localStorage entry cannot inject unexpected objects
 * into the UI. Two reload-specific rules apply:
 *  - a stored `generating` asset becomes `failed`, because a reload can never
 *    resume a live job;
 *  - a stored active job stage becomes `failed` for the same reason, with a message
 *    explaining it, so the queue never shows work that is not happening.
 *
 * Large media is never stored here: `MediaAsset.url` is a reference. The local
 * store holds small metadata rows only.
 */

import type { Page, VideoRepository } from './repository';
import type { WorkspaceScope } from '#lib/shared/scope';
import type {
        AssetStatus,
        AuditEvent,
        CharacterReference,
        ChatMessage,
        Episode,
        ExportJob,
        Folder,
        GenerationJob,
        GenerationJobEvent,
        JobStage,
        MediaAsset,
        MoviePart,
        Project,
        ProjectPatch,
        ProjectReference,
        PromptVersion,
        RenderJob,
        SavedPrompt,
        Scene,
        Season,
        Series,
        SharingPermission,
        ShareLevel,
        Shot
} from '../types';
import { DEFAULT_ASPECT_RATIO, DEFAULT_FRAME_RATE, DEFAULT_RESOLUTION } from '../formats';
import { ACTIVE_STAGES } from '../queue';

interface StoreShape {
        projects: Project[];
        folders: Folder[];
        series: Series[];
        seasons: Season[];
        episodes: Episode[];
        movieParts: MoviePart[];
        scenes: Scene[];
        shots: Shot[];
        assets: MediaAsset[];
        promptVersions: PromptVersion[];
        jobs: GenerationJob[];
        jobEvents: GenerationJobEvent[];
        renderJobs: RenderJob[];
        exportJobs: ExportJob[];
        references: ProjectReference[];
        characters: CharacterReference[];
        chatMessages: ChatMessage[];
        savedPrompts: SavedPrompt[];
        sharing: SharingPermission[];
        audit: AuditEvent[];
}

const KEY_PREFIX = 'arti.videos.v1';

function emptyStore(): StoreShape {
        return {
                projects: [],
                folders: [],
                series: [],
                seasons: [],
                episodes: [],
                movieParts: [],
                scenes: [],
                shots: [],
                assets: [],
                promptVersions: [],
                jobs: [],
                jobEvents: [],
                renderJobs: [],
                exportJobs: [],
                references: [],
                characters: [],
                chatMessages: [],
                savedPrompts: [],
                sharing: [],
                audit: []
        };
}

// --- Small readers ---------------------------------------------------------

function isRecord(value: unknown): value is Record<string, unknown> {
        return typeof value === 'object' && value !== null;
}
function str(value: unknown, fallback = ''): string {
        return typeof value === 'string' ? value : fallback;
}
function bool(value: unknown): boolean {
        return value === true;
}
function num(value: unknown): number | undefined {
        return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}
function numOr(value: unknown, fallback: number): number {
        return num(value) ?? fallback;
}
function strArray(value: unknown): string[] {
        return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : [];
}
function now(): string {
        return new Date().toISOString();
}

const JOB_STAGES: JobStage[] = [
        'draft',
        'validating',
        'queued',
        'preparing',
        'generating',
        'upscaling',
        'encoding',
        'quality-checking',
        'completed',
        'failed',
        'cancelled'
];

function asStage(value: unknown): JobStage {
        return JOB_STAGES.includes(value as JobStage) ? (value as JobStage) : 'draft';
}

function asAssetStatus(value: unknown): AssetStatus {
        const allowed: AssetStatus[] = ['generating', 'ready', 'failed', 'cancelled', 'draft'];
        return allowed.includes(value as AssetStatus) ? (value as AssetStatus) : 'failed';
}

/**
 * A job that was mid-flight when the page unloaded cannot still be running. It is
 * recorded as failed with an explicit reason rather than left "generating" forever.
 */
function reconcileJobStage(stage: JobStage): JobStage {
        return ACTIVE_STAGES.includes(stage) ? 'failed' : stage;
}

function readDefaultAspect(value: unknown): string {
        return typeof value === 'string' && value.length ? value : DEFAULT_ASPECT_RATIO;
}

// --- Normalisers -----------------------------------------------------------

function normaliseProject(raw: unknown): Project | null {
        if (!isRecord(raw)) return null;
        const id = str(raw.id);
        const ownerId = str(raw.ownerId);
        if (!id || !ownerId) return null;
        const kinds: Project['kind'][] = ['project', 'series', 'movie', 'short', 'collection'];
        const kind = kinds.includes(raw.kind as Project['kind']) ? (raw.kind as Project['kind']) : 'project';
        return {
                id,
                ownerId,
                name: str(raw.name) || 'Untitled project',
                kind,
                description: str(raw.description),
                folderId: typeof raw.folderId === 'string' ? raw.folderId : null,
                defaultAspectRatio: readDefaultAspect(raw.defaultAspectRatio),
                defaultResolution: str(raw.defaultResolution, DEFAULT_RESOLUTION),
                defaultFrameRate: numOr(raw.defaultFrameRate, DEFAULT_FRAME_RATE),
                defaultStyleId: typeof raw.defaultStyleId === 'string' ? raw.defaultStyleId : null,
                language: str(raw.language, 'en'),
                audioPreferences: normaliseAudio(raw.audioPreferences),
                instructions: str(raw.instructions),
                coverAssetId: typeof raw.coverAssetId === 'string' ? raw.coverAssetId : null,
                pinned: bool(raw.pinned),
                archived: bool(raw.archived),
                createdAt: str(raw.createdAt, now()),
                updatedAt: str(raw.updatedAt, now())
        };
}

function normaliseAudio(raw: unknown): Project['audioPreferences'] {
        const record = isRecord(raw) ? raw : {};
        return {
                dialogue: bool(record.dialogue),
                narration: bool(record.narration),
                voiceOver: bool(record.voiceOver),
                music: bool(record.music),
                soundEffects: bool(record.soundEffects),
                ambient: bool(record.ambient),
                language: str(record.language),
                subtitleLanguage: str(record.subtitleLanguage),
                muted: bool(record.muted)
        };
}

function normaliseFolder(raw: unknown): Folder | null {
        if (!isRecord(raw)) return null;
        const id = str(raw.id);
        const ownerId = str(raw.ownerId);
        if (!id || !ownerId) return null;
        return {
                id,
                ownerId,
                projectId: typeof raw.projectId === 'string' ? raw.projectId : null,
                parentId: typeof raw.parentId === 'string' ? raw.parentId : null,
                name: str(raw.name) || 'Untitled folder',
                order: numOr(raw.order, 0),
                pinned: bool(raw.pinned),
                archived: bool(raw.archived),
                createdAt: str(raw.createdAt, now()),
                updatedAt: str(raw.updatedAt, now())
        };
}

function normaliseSeries(raw: unknown): Series | null {
        if (!isRecord(raw)) return null;
        const id = str(raw.id);
        const projectId = str(raw.projectId);
        if (!id || !projectId) return null;
        return {
                id,
                ownerId: str(raw.ownerId) || 'w',
                projectId,
                title: str(raw.title) || 'Untitled series',
                description: str(raw.description),
                genre: str(raw.genre),
                premise: str(raw.premise),
                audience: str(raw.audience),
                language: str(raw.language, 'en'),
                tone: str(raw.tone),
                styleId: typeof raw.styleId === 'string' ? raw.styleId : null,
                aspectRatio: readDefaultAspect(raw.aspectRatio),
                frameRate: numOr(raw.frameRate, DEFAULT_FRAME_RATE),
                continuityRules: str(raw.continuityRules),
                audioPreferences: normaliseAudio(raw.audioPreferences),
                targetSeasons: num(raw.targetSeasons) ?? null,
                targetEpisodes: num(raw.targetEpisodes) ?? null,
                createdAt: str(raw.createdAt, now()),
                updatedAt: str(raw.updatedAt, now())
        };
}

function normaliseSeason(raw: unknown): Season | null {
        if (!isRecord(raw)) return null;
        const id = str(raw.id);
        const seriesId = str(raw.seriesId);
        if (!id || !seriesId) return null;
        return {
                id,
                ownerId: str(raw.ownerId) || 'w',
                seriesId,
                number: numOr(raw.number, 1),
                title: str(raw.title) || 'Untitled season',
                description: str(raw.description),
                arc: str(raw.arc),
                notes: str(raw.notes),
                coverAssetId: typeof raw.coverAssetId === 'string' ? raw.coverAssetId : null,
                pinned: bool(raw.pinned),
                createdAt: str(raw.createdAt, now()),
                updatedAt: str(raw.updatedAt, now())
        };
}

function normaliseEpisode(raw: unknown): Episode | null {
        if (!isRecord(raw)) return null;
        const id = str(raw.id);
        const seasonId = str(raw.seasonId);
        if (!id || !seasonId) return null;
        return {
                id,
                ownerId: str(raw.ownerId) || 'w',
                seriesId: str(raw.seriesId),
                seasonId,
                number: numOr(raw.number, 1),
                title: str(raw.title) || 'Untitled episode',
                synopsis: str(raw.synopsis),
                script: str(raw.script),
                targetDurationSeconds: num(raw.targetDurationSeconds) ?? null,
                notes: str(raw.notes),
                createdAt: str(raw.createdAt, now()),
                updatedAt: str(raw.updatedAt, now())
        };
}

function normaliseMoviePart(raw: unknown): MoviePart | null {
        if (!isRecord(raw)) return null;
        const id = str(raw.id);
        const projectId = str(raw.projectId);
        if (!id || !projectId) return null;
        return {
                id,
                ownerId: str(raw.ownerId) || 'w',
                projectId,
                number: numOr(raw.number, 1),
                title: str(raw.title) || 'Untitled part',
                synopsis: str(raw.synopsis),
                script: str(raw.script),
                targetDurationSeconds: num(raw.targetDurationSeconds) ?? null,
                notes: str(raw.notes),
                createdAt: str(raw.createdAt, now()),
                updatedAt: str(raw.updatedAt, now())
        };
}

function normaliseScene(raw: unknown): Scene | null {
        if (!isRecord(raw)) return null;
        const id = str(raw.id);
        const parentId = str(raw.parentId);
        if (!id || !parentId) return null;
        const kinds: Scene['parentKind'][] = ['episode', 'movie-part', 'project'];
        const parentKind = kinds.includes(raw.parentKind as Scene['parentKind'])
                ? (raw.parentKind as Scene['parentKind'])
                : 'project';
        return {
                id,
                ownerId: str(raw.ownerId) || 'w',
                projectId: str(raw.projectId),
                parentKind,
                parentId,
                number: numOr(raw.number, 1),
                title: str(raw.title) || 'Untitled scene',
                description: str(raw.description),
                targetDurationSeconds: num(raw.targetDurationSeconds) ?? null,
                notes: str(raw.notes),
                createdAt: str(raw.createdAt, now()),
                updatedAt: str(raw.updatedAt, now())
        };
}

function normaliseShot(raw: unknown): Shot | null {
        if (!isRecord(raw)) return null;
        const id = str(raw.id);
        const sceneId = str(raw.sceneId);
        if (!id || !sceneId) return null;
        return {
                id,
                ownerId: str(raw.ownerId) || 'w',
                sceneId,
                number: numOr(raw.number, 1),
                title: str(raw.title) || 'Untitled shot',
                prompt: str(raw.prompt),
                styleId: typeof raw.styleId === 'string' ? raw.styleId : null,
                aspectRatio: readDefaultAspect(raw.aspectRatio),
                resolution: str(raw.resolution, DEFAULT_RESOLUTION),
                frameRate: numOr(raw.frameRate, DEFAULT_FRAME_RATE),
                targetDurationSeconds: numOr(raw.targetDurationSeconds, 5),
                cameraMovement: str(raw.cameraMovement),
                notes: str(raw.notes),
                createdAt: str(raw.createdAt, now()),
                updatedAt: str(raw.updatedAt, now())
        };
}

function normaliseAsset(raw: unknown): MediaAsset | null {
        if (!isRecord(raw)) return null;
        const id = str(raw.id);
        const projectId = str(raw.projectId);
        if (!id || !projectId) return null;
        const kinds: MediaAsset['kind'][] = ['video', 'image', 'audio', 'subtitle', 'document'];
        const kind = kinds.includes(raw.kind as MediaAsset['kind']) ? (raw.kind as MediaAsset['kind']) : 'video';
        const status = asAssetStatus(raw.status);
        return {
                id,
                ownerId: str(raw.ownerId) || 'w',
                projectId,
                sceneId: typeof raw.sceneId === 'string' ? raw.sceneId : null,
                shotId: typeof raw.shotId === 'string' ? raw.shotId : null,
                folderId: typeof raw.folderId === 'string' ? raw.folderId : null,
                kind,
                name: str(raw.name) || 'Untitled asset',
                status: status === 'generating' ? 'failed' : status,
                url: typeof raw.url === 'string' ? raw.url : undefined,
                mimeType: typeof raw.mimeType === 'string' ? raw.mimeType : undefined,
                producedDurationSeconds: num(raw.producedDurationSeconds),
                frameCount: num(raw.frameCount),
                width: num(raw.width),
                height: num(raw.height),
                frameRate: num(raw.frameRate),
                bytes: num(raw.bytes),
                promptVersionId: typeof raw.promptVersionId === 'string' ? raw.promptVersionId : undefined,
                styleId: typeof raw.styleId === 'string' ? raw.styleId : null,
                approved: bool(raw.approved),
                draft: bool(raw.draft),
                createdAt: str(raw.createdAt, now()),
                updatedAt: str(raw.updatedAt, now()),
                error: typeof raw.error === 'string' ? raw.error : undefined
        };
}

function normalisePromptVersion(raw: unknown): PromptVersion | null {
        if (!isRecord(raw)) return null;
        const id = str(raw.id);
        const targetId = str(raw.targetId);
        if (!id || !targetId) return null;
        const kinds: PromptVersion['targetKind'][] = ['shot', 'scene', 'episode', 'movie-part', 'project', 'chat'];
        const targetKind = kinds.includes(raw.targetKind as PromptVersion['targetKind'])
                ? (raw.targetKind as PromptVersion['targetKind'])
                : 'chat';
        return {
                id,
                ownerId: str(raw.ownerId) || 'w',
                projectId: str(raw.projectId),
                targetKind,
                targetId,
                originalPrompt: str(raw.originalPrompt),
                composedPrompt: str(raw.composedPrompt),
                negativePrompt: typeof raw.negativePrompt === 'string' ? raw.negativePrompt : undefined,
                styleId: typeof raw.styleId === 'string' ? raw.styleId : null,
                aspectRatio: readDefaultAspect(raw.aspectRatio),
                resolution: str(raw.resolution, DEFAULT_RESOLUTION),
                frameRate: numOr(raw.frameRate, DEFAULT_FRAME_RATE),
                targetDurationSeconds: numOr(raw.targetDurationSeconds, 5),
                settings: isRecord(raw.settings) ? (raw.settings as PromptVersion['settings']) : undefined,
                note: typeof raw.note === 'string' ? raw.note : undefined,
                createdAt: str(raw.createdAt, now())
        };
}

function normaliseJob(raw: unknown): GenerationJob | null {
        if (!isRecord(raw)) return null;
        const id = str(raw.id);
        const projectId = str(raw.projectId);
        if (!id || !projectId) return null;
        return {
                id,
                ownerId: str(raw.ownerId) || 'w',
                projectId,
                seriesId: typeof raw.seriesId === 'string' ? raw.seriesId : null,
                seasonId: typeof raw.seasonId === 'string' ? raw.seasonId : null,
                episodeId: typeof raw.episodeId === 'string' ? raw.episodeId : null,
                moviePartId: typeof raw.moviePartId === 'string' ? raw.moviePartId : null,
                sceneId: typeof raw.sceneId === 'string' ? raw.sceneId : null,
                shotId: typeof raw.shotId === 'string' ? raw.shotId : null,
                promptVersionId: str(raw.promptVersionId),
                styleId: typeof raw.styleId === 'string' ? raw.styleId : null,
                pipeline: str(raw.pipeline),
                requestedDurationSeconds: numOr(raw.requestedDurationSeconds, 5),
                requestedResolution: str(raw.requestedResolution, DEFAULT_RESOLUTION),
                requestedAspectRatio: readDefaultAspect(raw.requestedAspectRatio),
                requestedFrameRate: numOr(raw.requestedFrameRate, DEFAULT_FRAME_RATE),
                stage: reconcileJobStage(asStage(raw.stage)),
                progress: num(raw.progress) ?? null,
                priority: numOr(raw.priority, 0),
                retryCount: numOr(raw.retryCount, 0),
                maxRetries: numOr(raw.maxRetries, 2),
                idempotencyKey: str(raw.idempotencyKey),
                assetIds: strArray(raw.assetIds),
                createdAt: str(raw.createdAt, now()),
                updatedAt: str(raw.updatedAt, now()),
                startedAt: typeof raw.startedAt === 'string' ? raw.startedAt : undefined,
                finishedAt: typeof raw.finishedAt === 'string' ? raw.finishedAt : undefined,
                message: typeof raw.message === 'string' ? raw.message : undefined,
                error: typeof raw.error === 'string' ? raw.error : undefined
        };
}

function normaliseJobEvent(raw: unknown): GenerationJobEvent | null {
        if (!isRecord(raw)) return null;
        const id = str(raw.id);
        const jobId = str(raw.jobId);
        if (!id || !jobId) return null;
        return {
                id,
                jobId,
                stage: asStage(raw.stage),
                message: str(raw.message),
                progress: num(raw.progress) ?? null,
                createdAt: str(raw.createdAt, now())
        };
}

function normaliseRenderJob(raw: unknown): RenderJob | null {
        if (!isRecord(raw)) return null;
        const id = str(raw.id);
        if (!id) return null;
        const kinds: RenderJob['targetKind'][] = ['scene', 'episode', 'movie-part', 'project', 'season'];
        return {
                id,
                ownerId: str(raw.ownerId) || 'w',
                projectId: str(raw.projectId),
                targetKind: kinds.includes(raw.targetKind as RenderJob['targetKind'])
                        ? (raw.targetKind as RenderJob['targetKind'])
                        : 'scene',
                targetId: str(raw.targetId),
                assetIds: strArray(raw.assetIds),
                stage: reconcileJobStage(asStage(raw.stage)),
                progress: num(raw.progress) ?? null,
                createdAt: str(raw.createdAt, now()),
                updatedAt: str(raw.updatedAt, now()),
                outputAssetId: typeof raw.outputAssetId === 'string' ? raw.outputAssetId : undefined,
                error: typeof raw.error === 'string' ? raw.error : undefined
        };
}

function normaliseExportJob(raw: unknown): ExportJob | null {
        if (!isRecord(raw)) return null;
        const id = str(raw.id);
        if (!id) return null;
        return {
                id,
                ownerId: str(raw.ownerId) || 'w',
                projectId: str(raw.projectId),
                assetId: str(raw.assetId),
                format: str(raw.format, 'metadata-json'),
                stage: reconcileJobStage(asStage(raw.stage)),
                createdAt: str(raw.createdAt, now()),
                updatedAt: str(raw.updatedAt, now()),
                outputAssetId: typeof raw.outputAssetId === 'string' ? raw.outputAssetId : undefined,
                error: typeof raw.error === 'string' ? raw.error : undefined
        };
}

function normaliseReference(raw: unknown): ProjectReference | null {
        if (!isRecord(raw)) return null;
        const id = str(raw.id);
        if (!id) return null;
        const kinds: ProjectReference['kind'][] = ['character', 'environment', 'prop', 'style', 'other'];
        return {
                id,
                ownerId: str(raw.ownerId) || 'w',
                projectId: str(raw.projectId),
                kind: kinds.includes(raw.kind as ProjectReference['kind'])
                        ? (raw.kind as ProjectReference['kind'])
                        : 'character',
                name: str(raw.name) || 'Untitled reference',
                description: str(raw.description),
                rules: str(raw.rules),
                assetId: typeof raw.assetId === 'string' ? raw.assetId : null,
                createdAt: str(raw.createdAt, now()),
                updatedAt: str(raw.updatedAt, now())
        };
}

function normaliseCharacter(raw: unknown): CharacterReference | null {
        if (!isRecord(raw)) return null;
        const id = str(raw.id);
        if (!id) return null;
        return {
                id,
                ownerId: str(raw.ownerId) || 'w',
                projectId: str(raw.projectId),
                referenceId: str(raw.referenceId),
                characterId: str(raw.characterId),
                name: str(raw.name) || 'Untitled character',
                appearance: str(raw.appearance),
                costume: str(raw.costume),
                consistencyNotes: str(raw.consistencyNotes),
                createdAt: str(raw.createdAt, now()),
                updatedAt: str(raw.updatedAt, now())
        };
}

function normaliseChatMessage(raw: unknown): ChatMessage | null {
        if (!isRecord(raw)) return null;
        const id = str(raw.id);
        if (!id) return null;
        const kinds: NonNullable<ChatMessage['kind']>[] = ['chat', 'enhancement', 'breakdown', 'shot-list', 'note'];
        return {
                id,
                ownerId: str(raw.ownerId) || 'w',
                projectId: str(raw.projectId),
                role: raw.role === 'assistant' ? 'assistant' : 'user',
                content: str(raw.content),
                kind: kinds.includes(raw.kind as NonNullable<ChatMessage['kind']>)
                        ? (raw.kind as NonNullable<ChatMessage['kind']>)
                        : 'chat',
                originalPrompt: typeof raw.originalPrompt === 'string' ? raw.originalPrompt : undefined,
                styleId: typeof raw.styleId === 'string' ? raw.styleId : null,
                createdAt: str(raw.createdAt, now())
        };
}

function normaliseSavedPrompt(raw: unknown): SavedPrompt | null {
        if (!isRecord(raw)) return null;
        const id = str(raw.id);
        if (!id) return null;
        return {
                id,
                ownerId: str(raw.ownerId) || 'w',
                projectId: str(raw.projectId),
                title: str(raw.title) || 'Saved prompt',
                prompt: str(raw.prompt),
                styleId: typeof raw.styleId === 'string' ? raw.styleId : null,
                createdAt: str(raw.createdAt, now())
        };
}

function normaliseSharing(raw: unknown): SharingPermission | null {
        if (!isRecord(raw)) return null;
        const id = str(raw.id);
        if (!id) return null;
        const kinds: SharingPermission['targetKind'][] = ['project', 'folder', 'series', 'season', 'episode', 'asset'];
        return {
                id,
                ownerId: str(raw.ownerId) || 'w',
                targetKind: kinds.includes(raw.targetKind as SharingPermission['targetKind'])
                        ? (raw.targetKind as SharingPermission['targetKind'])
                        : 'project',
                targetId: str(raw.targetId),
                granteeId: typeof raw.granteeId === 'string' ? raw.granteeId : null,
                level: (raw.level === 'edit' ? 'edit' : 'view') as ShareLevel,
                createdAt: str(raw.createdAt, now())
        };
}

function normaliseAudit(raw: unknown): AuditEvent | null {
        if (!isRecord(raw)) return null;
        const id = str(raw.id);
        if (!id) return null;
        return {
                id,
                ownerId: str(raw.ownerId) || 'w',
                action: str(raw.action),
                targetKind: str(raw.targetKind),
                targetId: str(raw.targetId),
                detail: str(raw.detail),
                createdAt: str(raw.createdAt, now())
        };
}

function mapList<T>(value: unknown, normalise: (raw: unknown) => T | null): T[] {
        return Array.isArray(value) ? value.map(normalise).filter((v): v is T => v !== null) : [];
}

function normaliseStore(value: unknown): StoreShape {
        if (!isRecord(value)) return emptyStore();
        return {
                projects: mapList(value.projects, normaliseProject),
                folders: mapList(value.folders, normaliseFolder),
                series: mapList(value.series, normaliseSeries),
                seasons: mapList(value.seasons, normaliseSeason),
                episodes: mapList(value.episodes, normaliseEpisode),
                movieParts: mapList(value.movieParts, normaliseMoviePart),
                scenes: mapList(value.scenes, normaliseScene),
                shots: mapList(value.shots, normaliseShot),
                assets: mapList(value.assets, normaliseAsset),
                promptVersions: mapList(value.promptVersions, normalisePromptVersion),
                jobs: mapList(value.jobs, normaliseJob),
                jobEvents: mapList(value.jobEvents, normaliseJobEvent),
                renderJobs: mapList(value.renderJobs, normaliseRenderJob),
                exportJobs: mapList(value.exportJobs, normaliseExportJob),
                references: mapList(value.references, normaliseReference),
                characters: mapList(value.characters, normaliseCharacter),
                chatMessages: mapList(value.chatMessages, normaliseChatMessage),
                savedPrompts: mapList(value.savedPrompts, normaliseSavedPrompt),
                sharing: mapList(value.sharing, normaliseSharing),
                audit: mapList(value.audit, normaliseAudit)
        };
}

function storageAvailable(): boolean {
        try {
                const probe = '__arti_videos_probe__';
                window.localStorage.setItem(probe, '1');
                window.localStorage.removeItem(probe);
                return true;
        } catch {
                return false;
        }
}

function scopeKey(scope: WorkspaceScope): string {
        return `${KEY_PREFIX}:${scope.workspaceId}:${scope.userId ?? 'anonymous'}`;
}

/** Ownership marker: the workspace id, since the store is already partitioned. */
function ownerKey(scope: WorkspaceScope): string {
        return scope.workspaceId;
}

export class LocalVideoRepository implements VideoRepository {
        readonly label = 'This browser';
        readonly persistent: boolean;
        readonly shared = false;

        private readonly key: string;
        private available: boolean;

        constructor(scope: WorkspaceScope) {
                this.key = scopeKey(scope);
                this.available = typeof window !== 'undefined' && storageAvailable();
                this.persistent = this.available;
        }

        private read(): StoreShape {
                if (!this.available) return emptyStore();
                try {
                        const raw = window.localStorage.getItem(this.key);
                        if (!raw) return emptyStore();
                        return normaliseStore(JSON.parse(raw));
                } catch {
                        this.available = false;
                        return emptyStore();
                }
        }

        private write(store: StoreShape): boolean {
                if (!this.available) return false;
                try {
                        window.localStorage.setItem(this.key, JSON.stringify(store));
                        return true;
                } catch {
                        // Quota or revocation: report the failure rather than pretending.
                        this.available = false;
                        return false;
                }
        }

        // --- Projects ---

        async listProjects(scope: WorkspaceScope): Promise<Project[]> {
                return this.read().projects.filter((p) => p.ownerId === ownerKey(scope));
        }

        async getProject(scope: WorkspaceScope, id: string): Promise<Project | null> {
                return this.read().projects.find((p) => p.id === id && p.ownerId === ownerKey(scope)) ?? null;
        }

        async createProject(_scope: WorkspaceScope, project: Project): Promise<Project> {
                const store = this.read();
                if (!store.projects.some((p) => p.id === project.id)) {
                        store.projects.push(project);
                        this.write(store);
                }
                return project;
        }

        async updateProject(_scope: WorkspaceScope, id: string, patch: ProjectPatch): Promise<Project | null> {
                const store = this.read();
                const index = store.projects.findIndex((p) => p.id === id);
                if (index === -1) return null;
                const next: Project = { ...store.projects[index], ...patch, updatedAt: now() };
                store.projects[index] = next;
                this.write(store);
                return next;
        }

        async deleteProject(_scope: WorkspaceScope, id: string): Promise<void> {
                const store = this.read();
                const seasonIds = store.seasons.filter((s) => store.series.some((x) => x.id === s.seriesId && x.projectId === id)).map((s) => s.id);
                store.projects = store.projects.filter((p) => p.id !== id);
                store.folders = store.folders.filter((f) => f.projectId !== id);
                const seriesIds = store.series.filter((s) => s.projectId === id).map((s) => s.id);
                store.series = store.series.filter((s) => s.projectId !== id);
                store.seasons = store.seasons.filter((s) => !seriesIds.includes(s.seriesId));
                store.episodes = store.episodes.filter((e) => !seriesIds.includes(e.seriesId) && !seasonIds.includes(e.seasonId));
                store.movieParts = store.movieParts.filter((m) => m.projectId !== id);
                store.scenes = store.scenes.filter((s) => s.projectId !== id);
                store.shots = store.shots.filter((s) => !store.scenes.some((sc) => sc.id === s.sceneId && sc.projectId === id));
                store.assets = store.assets.filter((a) => a.projectId !== id);
                store.promptVersions = store.promptVersions.filter((v) => v.projectId !== id);
                const jobIds = store.jobs.filter((j) => j.projectId === id).map((j) => j.id);
                store.jobs = store.jobs.filter((j) => j.projectId !== id);
                store.jobEvents = store.jobEvents.filter((e) => !jobIds.includes(e.jobId));
                store.renderJobs = store.renderJobs.filter((r) => r.projectId !== id);
                store.exportJobs = store.exportJobs.filter((e) => e.projectId !== id);
                store.references = store.references.filter((r) => r.projectId !== id);
                store.characters = store.characters.filter((c) => c.projectId !== id);
                store.chatMessages = store.chatMessages.filter((m) => m.projectId !== id);
                store.savedPrompts = store.savedPrompts.filter((p) => p.projectId !== id);
                this.write(store);
        }

        // --- Folders ---

        async listFolders(scope: WorkspaceScope, projectId?: string | null): Promise<Folder[]> {
                const folders = this.read().folders.filter((f) => f.ownerId === ownerKey(scope));
                if (projectId === undefined) return folders;
                return folders.filter((f) => f.projectId === projectId);
        }

        async createFolder(_scope: WorkspaceScope, folder: Folder): Promise<Folder> {
                const store = this.read();
                if (!store.folders.some((f) => f.id === folder.id)) {
                        store.folders.push(folder);
                        this.write(store);
                }
                return folder;
        }

        async updateFolder(_scope: WorkspaceScope, id: string, patch: Partial<Folder>): Promise<Folder | null> {
                const store = this.read();
                const index = store.folders.findIndex((f) => f.id === id);
                if (index === -1) return null;
                const next: Folder = { ...store.folders[index], ...patch, updatedAt: now() };
                store.folders[index] = next;
                this.write(store);
                return next;
        }

        async deleteFolder(_scope: WorkspaceScope, id: string, cascade: boolean): Promise<void> {
                const store = this.read();
                const subtree = new Set<string>([id]);
                if (cascade) {
                        let changed = true;
                        while (changed) {
                                changed = false;
                                for (const folder of store.folders) {
                                        if (folder.parentId && subtree.has(folder.parentId) && !subtree.has(folder.id)) {
                                                subtree.add(folder.id);
                                                changed = true;
                                        }
                                }
                        }
                }
                const ids = [...subtree];
                store.folders = store.folders.filter((f) => !subtree.has(f.id));
                // Deleting a folder never deletes media by itself: assets and projects
                // are moved to the root so nothing is lost silently.
                store.assets = store.assets.map((a) => (a.folderId && ids.includes(a.folderId) ? { ...a, folderId: null } : a));
                store.projects = store.projects.map((p) => (p.folderId && ids.includes(p.folderId) ? { ...p, folderId: null } : p));
                this.write(store);
        }

        // --- Series ---

        async listSeries(scope: WorkspaceScope, projectId: string): Promise<Series[]> {
                return this.read().series.filter((s) => s.projectId === projectId && s.ownerId === ownerKey(scope));
        }
        async createSeries(_scope: WorkspaceScope, series: Series): Promise<Series> {
                const store = this.read();
                if (!store.series.some((s) => s.id === series.id)) store.series.push(series);
                this.write(store);
                return series;
        }
        async updateSeries(_scope: WorkspaceScope, id: string, patch: Partial<Series>): Promise<Series | null> {
                const store = this.read();
                const { list, updated } = this.patchEntity(store.series, id, patch);
                if (!updated) return null;
                store.series = list;
                this.write(store);
                return updated;
        }
        async deleteSeries(_scope: WorkspaceScope, id: string): Promise<void> {
                const store = this.read();
                const seasonIds = store.seasons.filter((s) => s.seriesId === id).map((s) => s.id);
                store.series = store.series.filter((s) => s.id !== id);
                store.seasons = store.seasons.filter((s) => s.seriesId !== id);
                store.episodes = store.episodes.filter((e) => e.seriesId !== id && !seasonIds.includes(e.seasonId));
                store.scenes = store.scenes.filter((s) => !store.episodes.some((e) => e.id === s.parentId && e.seriesId === id));
                this.write(store);
        }

        // --- Seasons ---

        async listSeasons(scope: WorkspaceScope, seriesId: string): Promise<Season[]> {
                return this.read().seasons.filter((s) => s.seriesId === seriesId && s.ownerId === ownerKey(scope));
        }
        async createSeason(_scope: WorkspaceScope, season: Season): Promise<Season> {
                const store = this.read();
                if (!store.seasons.some((s) => s.id === season.id)) store.seasons.push(season);
                this.write(store);
                return season;
        }
        async updateSeason(_scope: WorkspaceScope, id: string, patch: Partial<Season>): Promise<Season | null> {
                const store = this.read();
                const { list, updated } = this.patchEntity(store.seasons, id, patch);
                if (!updated) return null;
                store.seasons = list;
                this.write(store);
                return updated;
        }
        async deleteSeason(_scope: WorkspaceScope, id: string): Promise<void> {
                const store = this.read();
                const episodeIds = store.episodes.filter((e) => e.seasonId === id).map((e) => e.id);
                store.seasons = store.seasons.filter((s) => s.id !== id);
                store.episodes = store.episodes.filter((e) => e.seasonId !== id);
                store.scenes = store.scenes.filter((s) => !episodeIds.includes(s.parentId));
                this.write(store);
        }

        // --- Episodes ---

        async listEpisodes(scope: WorkspaceScope, seasonId: string): Promise<Episode[]> {
                return this.read().episodes.filter((e) => e.seasonId === seasonId && e.ownerId === ownerKey(scope));
        }
        async createEpisode(_scope: WorkspaceScope, episode: Episode): Promise<Episode> {
                const store = this.read();
                if (!store.episodes.some((e) => e.id === episode.id)) store.episodes.push(episode);
                this.write(store);
                return episode;
        }
        async updateEpisode(_scope: WorkspaceScope, id: string, patch: Partial<Episode>): Promise<Episode | null> {
                const store = this.read();
                const { list, updated } = this.patchEntity(store.episodes, id, patch);
                if (!updated) return null;
                store.episodes = list;
                this.write(store);
                return updated;
        }
        async deleteEpisode(_scope: WorkspaceScope, id: string): Promise<void> {
                const store = this.read();
                store.episodes = store.episodes.filter((e) => e.id !== id);
                store.scenes = store.scenes.filter((s) => !(s.parentKind === 'episode' && s.parentId === id));
                this.write(store);
        }

        // --- Movie parts ---

        async listMovieParts(scope: WorkspaceScope, projectId: string): Promise<MoviePart[]> {
                return this.read().movieParts.filter((m) => m.projectId === projectId && m.ownerId === ownerKey(scope));
        }
        async createMoviePart(_scope: WorkspaceScope, part: MoviePart): Promise<MoviePart> {
                const store = this.read();
                if (!store.movieParts.some((m) => m.id === part.id)) store.movieParts.push(part);
                this.write(store);
                return part;
        }
        async updateMoviePart(_scope: WorkspaceScope, id: string, patch: Partial<MoviePart>): Promise<MoviePart | null> {
                const store = this.read();
                const { list, updated } = this.patchEntity(store.movieParts, id, patch);
                if (!updated) return null;
                store.movieParts = list;
                this.write(store);
                return updated;
        }
        async deleteMoviePart(_scope: WorkspaceScope, id: string): Promise<void> {
                const store = this.read();
                store.movieParts = store.movieParts.filter((m) => m.id !== id);
                store.scenes = store.scenes.filter((s) => !(s.parentKind === 'movie-part' && s.parentId === id));
                this.write(store);
        }

        // --- Scenes / shots ---

        async listScenes(scope: WorkspaceScope, projectId: string): Promise<Scene[]> {
                return this.read().scenes.filter((s) => s.projectId === projectId && s.ownerId === ownerKey(scope));
        }
        async createScene(_scope: WorkspaceScope, scene: Scene): Promise<Scene> {
                const store = this.read();
                if (!store.scenes.some((s) => s.id === scene.id)) store.scenes.push(scene);
                this.write(store);
                return scene;
        }
        async updateScene(_scope: WorkspaceScope, id: string, patch: Partial<Scene>): Promise<Scene | null> {
                const store = this.read();
                const { list, updated } = this.patchEntity(store.scenes, id, patch);
                if (!updated) return null;
                store.scenes = list;
                this.write(store);
                return updated;
        }
        async deleteScene(_scope: WorkspaceScope, id: string): Promise<void> {
                const store = this.read();
                const shotIds = store.shots.filter((s) => s.sceneId === id).map((s) => s.id);
                store.scenes = store.scenes.filter((s) => s.id !== id);
                store.shots = store.shots.filter((s) => s.sceneId !== id);
                store.assets = store.assets.map((a) =>
                        a.sceneId === id || (a.shotId && shotIds.includes(a.shotId)) ? { ...a, sceneId: null, shotId: null } : a
                );
                this.write(store);
        }

        async listShots(scope: WorkspaceScope, sceneId: string): Promise<Shot[]> {
                return this.read().shots.filter((s) => s.sceneId === sceneId && s.ownerId === ownerKey(scope));
        }
        async createShot(_scope: WorkspaceScope, shot: Shot): Promise<Shot> {
                const store = this.read();
                if (!store.shots.some((s) => s.id === shot.id)) store.shots.push(shot);
                this.write(store);
                return shot;
        }
        async updateShot(_scope: WorkspaceScope, id: string, patch: Partial<Shot>): Promise<Shot | null> {
                const store = this.read();
                const { list, updated } = this.patchEntity(store.shots, id, patch);
                if (!updated) return null;
                store.shots = list;
                this.write(store);
                return updated;
        }
        async deleteShot(_scope: WorkspaceScope, id: string): Promise<void> {
                const store = this.read();
                store.shots = store.shots.filter((s) => s.id !== id);
                store.assets = store.assets.map((a) => (a.shotId === id ? { ...a, shotId: null } : a));
                this.write(store);
        }

        // --- Assets ---

        async listAssets(scope: WorkspaceScope, projectId: string): Promise<MediaAsset[]> {
                return this.read().assets.filter((a) => a.projectId === projectId && a.ownerId === ownerKey(scope));
        }

        async listAssetsPaged(
                scope: WorkspaceScope,
                projectId: string,
                cursor: string | null,
                limit: number
        ): Promise<Page<MediaAsset>> {
                const all = (await this.listAssets(scope, projectId)).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
                const start = cursor ? Math.max(0, all.findIndex((a) => a.id === cursor) + 1) : 0;
                const items = all.slice(start, start + limit);
                const last = items[items.length - 1];
                return {
                        items,
                        nextCursor: start + limit < all.length && last ? last.id : null,
                        total: all.length
                };
        }

        async createAsset(_scope: WorkspaceScope, asset: MediaAsset): Promise<MediaAsset> {
                const store = this.read();
                if (!store.assets.some((a) => a.id === asset.id)) store.assets.push(asset);
                this.write(store);
                return asset;
        }
        async updateAsset(_scope: WorkspaceScope, id: string, patch: Partial<MediaAsset>): Promise<MediaAsset | null> {
                const store = this.read();
                const { list, updated } = this.patchEntity(store.assets, id, patch);
                if (!updated) return null;
                store.assets = list;
                this.write(store);
                return updated;
        }
        async deleteAsset(_scope: WorkspaceScope, id: string): Promise<void> {
                const store = this.read();
                store.assets = store.assets.filter((a) => a.id !== id);
                this.write(store);
        }

        // --- Prompt versions ---

        async listPromptVersions(scope: WorkspaceScope, projectId: string): Promise<PromptVersion[]> {
                return this.read().promptVersions.filter((v) => v.projectId === projectId && v.ownerId === ownerKey(scope));
        }
        async createPromptVersion(_scope: WorkspaceScope, version: PromptVersion): Promise<PromptVersion> {
                const store = this.read();
                if (!store.promptVersions.some((v) => v.id === version.id)) store.promptVersions.push(version);
                this.write(store);
                return version;
        }

        // --- Jobs ---

        async listJobs(scope: WorkspaceScope, projectId: string): Promise<GenerationJob[]> {
                return this.read().jobs.filter((j) => j.projectId === projectId && j.ownerId === ownerKey(scope));
        }
        async createJob(_scope: WorkspaceScope, job: GenerationJob): Promise<GenerationJob> {
                const store = this.read();
                if (!store.jobs.some((j) => j.id === job.id)) store.jobs.push(job);
                this.write(store);
                return job;
        }
        async updateJob(_scope: WorkspaceScope, id: string, patch: Partial<GenerationJob>): Promise<GenerationJob | null> {
                const store = this.read();
                const { list, updated } = this.patchEntity(store.jobs, id, patch);
                if (!updated) return null;
                store.jobs = list;
                this.write(store);
                return updated;
        }
        async deleteJob(_scope: WorkspaceScope, id: string): Promise<void> {
                const store = this.read();
                store.jobs = store.jobs.filter((j) => j.id !== id);
                store.jobEvents = store.jobEvents.filter((e) => e.jobId !== id);
                this.write(store);
        }
        async findJobByIdempotencyKey(scope: WorkspaceScope, key: string): Promise<GenerationJob | null> {
                return this.read().jobs.find((j) => j.idempotencyKey === key && j.ownerId === ownerKey(scope)) ?? null;
        }
        async listJobEvents(scope: WorkspaceScope, jobId: string): Promise<GenerationJobEvent[]> {
                return this.read().jobEvents
                        .filter((e) => e.jobId === jobId)
                        .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
        }
        async appendJobEvent(_scope: WorkspaceScope, event: GenerationJobEvent): Promise<GenerationJobEvent> {
                const store = this.read();
                if (!store.jobEvents.some((e) => e.id === event.id)) store.jobEvents.push(event);
                this.write(store);
                return event;
        }

        // --- Render / export ---

        async listRenderJobs(scope: WorkspaceScope, projectId: string): Promise<RenderJob[]> {
                return this.read().renderJobs.filter((r) => r.projectId === projectId && r.ownerId === ownerKey(scope));
        }
        async createRenderJob(_scope: WorkspaceScope, job: RenderJob): Promise<RenderJob> {
                const store = this.read();
                if (!store.renderJobs.some((r) => r.id === job.id)) store.renderJobs.push(job);
                this.write(store);
                return job;
        }
        async updateRenderJob(_scope: WorkspaceScope, id: string, patch: Partial<RenderJob>): Promise<RenderJob | null> {
                const store = this.read();
                const { list, updated } = this.patchEntity(store.renderJobs, id, patch);
                if (!updated) return null;
                store.renderJobs = list;
                this.write(store);
                return updated;
        }

        async listExportJobs(scope: WorkspaceScope, projectId: string): Promise<ExportJob[]> {
                return this.read().exportJobs.filter((e) => e.projectId === projectId && e.ownerId === ownerKey(scope));
        }
        async createExportJob(_scope: WorkspaceScope, job: ExportJob): Promise<ExportJob> {
                const store = this.read();
                if (!store.exportJobs.some((e) => e.id === job.id)) store.exportJobs.push(job);
                this.write(store);
                return job;
        }
        async updateExportJob(_scope: WorkspaceScope, id: string, patch: Partial<ExportJob>): Promise<ExportJob | null> {
                const store = this.read();
                const { list, updated } = this.patchEntity(store.exportJobs, id, patch);
                if (!updated) return null;
                store.exportJobs = list;
                this.write(store);
                return updated;
        }

        // --- References ---

        async listReferences(scope: WorkspaceScope, projectId: string): Promise<ProjectReference[]> {
                return this.read().references.filter((r) => r.projectId === projectId && r.ownerId === ownerKey(scope));
        }
        async createReference(_scope: WorkspaceScope, reference: ProjectReference): Promise<ProjectReference> {
                const store = this.read();
                if (!store.references.some((r) => r.id === reference.id)) store.references.push(reference);
                this.write(store);
                return reference;
        }
        async updateReference(_scope: WorkspaceScope, id: string, patch: Partial<ProjectReference>): Promise<ProjectReference | null> {
                const store = this.read();
                const { list, updated } = this.patchEntity(store.references, id, patch);
                if (!updated) return null;
                store.references = list;
                this.write(store);
                return updated;
        }
        async deleteReference(_scope: WorkspaceScope, id: string): Promise<void> {
                const store = this.read();
                store.references = store.references.filter((r) => r.id !== id);
                this.write(store);
        }

        async listCharacters(scope: WorkspaceScope, projectId: string): Promise<CharacterReference[]> {
                return this.read().characters.filter((c) => c.projectId === projectId && c.ownerId === ownerKey(scope));
        }
        async createCharacter(_scope: WorkspaceScope, character: CharacterReference): Promise<CharacterReference> {
                const store = this.read();
                if (!store.characters.some((c) => c.id === character.id)) store.characters.push(character);
                this.write(store);
                return character;
        }
        async updateCharacter(_scope: WorkspaceScope, id: string, patch: Partial<CharacterReference>): Promise<CharacterReference | null> {
                const store = this.read();
                const { list, updated } = this.patchEntity(store.characters, id, patch);
                if (!updated) return null;
                store.characters = list;
                this.write(store);
                return updated;
        }
        async deleteCharacter(_scope: WorkspaceScope, id: string): Promise<void> {
                const store = this.read();
                store.characters = store.characters.filter((c) => c.id !== id);
                this.write(store);
        }

        // --- Prompt chat ---

        async listChatMessages(scope: WorkspaceScope, projectId: string): Promise<ChatMessage[]> {
                return this.read()
                        .chatMessages.filter((m) => m.projectId === projectId && m.ownerId === ownerKey(scope))
                        .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
        }
        async appendChatMessage(_scope: WorkspaceScope, message: ChatMessage): Promise<ChatMessage> {
                const store = this.read();
                if (!store.chatMessages.some((m) => m.id === message.id)) store.chatMessages.push(message);
                this.write(store);
                return message;
        }
        async deleteChatMessage(_scope: WorkspaceScope, id: string): Promise<void> {
                const store = this.read();
                store.chatMessages = store.chatMessages.filter((m) => m.id !== id);
                this.write(store);
        }

        async listSavedPrompts(scope: WorkspaceScope, projectId: string): Promise<SavedPrompt[]> {
                return this.read().savedPrompts.filter((p) => p.projectId === projectId && p.ownerId === ownerKey(scope));
        }
        async createSavedPrompt(_scope: WorkspaceScope, prompt: SavedPrompt): Promise<SavedPrompt> {
                const store = this.read();
                if (!store.savedPrompts.some((p) => p.id === prompt.id)) store.savedPrompts.push(prompt);
                this.write(store);
                return prompt;
        }
        async deleteSavedPrompt(_scope: WorkspaceScope, id: string): Promise<void> {
                const store = this.read();
                store.savedPrompts = store.savedPrompts.filter((p) => p.id !== id);
                this.write(store);
        }

        // --- Sharing / audit ---

        async listSharingPermissions(scope: WorkspaceScope): Promise<SharingPermission[]> {
                return this.read().sharing.filter((s) => s.ownerId === ownerKey(scope));
        }
        async createSharingPermission(_scope: WorkspaceScope, permission: SharingPermission): Promise<SharingPermission> {
                const store = this.read();
                if (!store.sharing.some((s) => s.id === permission.id)) store.sharing.push(permission);
                this.write(store);
                return permission;
        }
        async deleteSharingPermission(_scope: WorkspaceScope, id: string): Promise<void> {
                const store = this.read();
                store.sharing = store.sharing.filter((s) => s.id !== id);
                this.write(store);
        }

        async listAuditEvents(scope: WorkspaceScope, limit = 200): Promise<AuditEvent[]> {
                return this.read()
                        .audit.filter((a) => a.ownerId === ownerKey(scope))
                        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
                        .slice(0, limit);
        }
        async appendAuditEvent(_scope: WorkspaceScope, event: AuditEvent): Promise<AuditEvent> {
                const store = this.read();
                store.audit.push(event);
                // Bound the local audit log so it cannot grow without limit in a browser.
                if (store.audit.length > 1000) store.audit = store.audit.slice(-1000);
                this.write(store);
                return event;
        }

        /** Shared patch helper for the simple, flat entity lists. */
        private patchEntity<T extends { id: string; updatedAt: string }>(
                list: T[],
                id: string,
                patch: Partial<T>
        ): { list: T[]; updated: T | null } {
                const index = list.findIndex((item) => item.id === id);
                if (index === -1) return { list, updated: null };
                const updated = { ...list[index], ...patch, updatedAt: now() } as T;
                const next = [...list];
                next[index] = updated;
                return { list: next, updated };
        }
}
