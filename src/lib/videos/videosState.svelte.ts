/**
 * Videos module state.
 *
 * One class owns the whole production: projects, the recursive folder tree,
 * series/seasons/episodes, movies/parts, scenes, shots, clips, prompt versions,
 * the generation queue, the Prompt Chat and the reusable references. Components
 * only call methods and read derived values; no component talks to the repository
 * or the services directly. That separation keeps UI, persistence and the model
 * call independently replaceable.
 *
 * Honesty rules encoded here:
 *  - A clip only becomes `ready` if the service returned a real URL; otherwise the
 *    asset is recorded as failed with an explicit reason and no fabricated output.
 *  - With no video service configured, a generate request creates a failed job and
 *    an explanatory message — never an invented video, prompt, story or shot list.
 *  - Progress is only shown when the backend reports it.
 *  - A retry never duplicates a completed output.
 *  - Applying a style never silently deletes the user's prompt.
 *  - Destructive operations record an audit event, and the UI states the impact
 *    before asking for confirmation.
 */

import { newId } from '#lib/shared/ids';
import type { Style } from '#lib/shared/styles';
import {
        DEFAULT_ASPECT_RATIO,
        DEFAULT_FRAME_RATE,
        DEFAULT_RESOLUTION,
        clampToMaxClip,
        findResolution,
        planDuration,
        sumMeasuredSeconds,
        type DurationPlan
} from './formats';
import {
        DEFAULT_MAX_RETRIES,
        PAGE_SIZE,
        VIDEO_STATUS,
        isSupabaseConfigured,
        isVideoModelConfigured,
        isVideoPromptModelConfigured,
        maxClipSeconds,
        maxConcurrentJobs,
        nativeLongEdge,
        pipelineId,
        videoCapabilities
} from './config';
import {
        applyStyleToDraft,
        composeVideoPrompt,
        promptTitle,
        removeStyleFromDraft,
        resolveStyle,
        splitIntoShots,
        validatePrompt,
        type ComposeMode,
        type StylePromptInput
} from './prompt';
import {
        canCancelJob,
        idempotencyKey as buildIdempotencyKey,
        shouldRetry,
        sortJobs,
        summariseQueue
} from './queue';
import {
        breadcrumb,
        canMove,
        childFolders,
        deleteImpact,
        descendantsOf,
        flattenTree,
        foldersForProject,
        isDuplicateName,
        nextOrder,
        reorderSiblings,
        uniqueName,
        type Crumb,
        type FlatFolder
} from './tree';
import { generateVideo, toUserSafeMessage as toSafeVideoMessage, type VideoGenerationEvent } from './service/videoService';
import { requestVideoPrompt, toUserSafeMessage as toSafePromptMessage } from './service/videoPromptService';
import { getVideoRepository, videoScope, type WorkspaceScope } from './workspace';
import type { VideoRepository } from './persistence/repository';
import type {
        AuditEvent,
        CharacterReference,
        ChatMessage,
        Episode,
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
        Shot
} from './types';

/** Which area of the Videos workspace is showing. */
export type VideoView =
        | 'studio'
        | 'projects'
        | 'series'
        | 'movies'
        | 'shorts'
        | 'folders'
        | 'styles'
        | 'chat'
        | 'queue'
        | 'library'
        | 'drafts'
        | 'assets'
        | 'settings';

/** The generation lifecycle for the current composer request. */
export type ComposerStage = 'idle' | 'preparing' | 'queued' | 'generating' | 'completed' | 'failed' | 'cancelled';

/** A style the user chose that needs a decision because the draft is not empty. */
export interface PendingStyleApplication {
        style: Style;
        draft: string;
}

/** An attached reference file (metadata only; never uploaded without a store). */
export interface AttachedReference {
        id: string;
        name: string;
        size: number;
        mimeType: string;
        kind: string;
        accepted: boolean;
        detail?: string;
}

interface StorageNotice {
        tone: 'info' | 'warning';
        text: string;
}

/** Default audio preferences for a new project. */
export function defaultAudioPreferences(): Project['audioPreferences'] {
        return {
                dialogue: false,
                narration: false,
                voiceOver: false,
                music: false,
                soundEffects: false,
                ambient: false,
                language: '',
                subtitleLanguage: '',
                muted: false
        };
}

function byNumber<T extends { number: number }>(a: T, b: T): number {
        return a.number - b.number;
}

function folderParentOrNull(folders: Folder[], id: string): string | null {
        return folders.find((f) => f.id === id)?.parentId ?? null;
}

export class VideosState {
        private repository: VideoRepository = getVideoRepository();

        // --- Core data ----------------------------------------------------------
        projects = $state<Project[]>([]);
        folders = $state<Folder[]>([]);
        series = $state<Series[]>([]);
        seasons = $state<Season[]>([]);
        episodes = $state<Episode[]>([]);
        movieParts = $state<MoviePart[]>([]);
        scenes = $state<Scene[]>([]);
        shots = $state<Shot[]>([]);
        assets = $state<MediaAsset[]>([]);
        promptVersions = $state<PromptVersion[]>([]);
        jobs = $state<GenerationJob[]>([]);
        jobEvents = $state<GenerationJobEvent[]>([]);
        references = $state<ProjectReference[]>([]);
        characters = $state<CharacterReference[]>([]);
        chatMessages = $state<ChatMessage[]>([]);
        savedPrompts = $state<SavedPrompt[]>([]);
        renderJobs = $state<RenderJob[]>([]);
        auditEvents = $state<AuditEvent[]>([]);

        // --- Selection / navigation --------------------------------------------
        view = $state<VideoView>('studio');
        activeProjectId = $state<string | null>(null);
        activeFolderId = $state<string | null>(null);
        activeSeriesId = $state<string | null>(null);
        activeSeasonId = $state<string | null>(null);
        activeEpisodeId = $state<string | null>(null);
        activeMoviePartId = $state<string | null>(null);
        activeSceneId = $state<string | null>(null);
        activeShotId = $state<string | null>(null);

        // --- Loading / errors ---------------------------------------------------
        loading = $state(true);
        storageError = $state<string | null>(null);

        // --- Composer -----------------------------------------------------------
        draft = $state('');
        selectedStyleId = $state<string | null>(null);
        aspectRatio = $state<string>(DEFAULT_ASPECT_RATIO);
        resolution = $state<string>(DEFAULT_RESOLUTION);
        frameRate = $state<number>(DEFAULT_FRAME_RATE);
        durationSeconds = $state<number>(5);
        clipSeconds = $state<number>(5);
        negativePrompt = $state('');
        cameraMovement = $state('');
        lighting = $state('');
        palette = $state('');
        audioNotes = $state('');
        referenceNote = $state('');
        referenceAssets = $state<AttachedReference[]>([]);
        pendingStyle = $state<PendingStyleApplication | null>(null);
        notice = $state('');

        // --- Prompt chat --------------------------------------------------------
        chatDraft = $state('');
        chatBusy = $state(false);
        private chatAbort: AbortController | null = null;

        // --- Generation ---------------------------------------------------------
        generating = $state(false);
        stage = $state<ComposerStage>('idle');
        progress = $state<number | null>(null);
        activeJobId = $state<string | null>(null);
        private abortController: AbortController | null = null;

        // --- Library / queue paging ---------------------------------------------
        visibleLibraryCount = $state(PAGE_SIZE);
        visibleQueueCount = $state(PAGE_SIZE);
        librarySearch = $state('');

        // --- Configuration, resolved once at startup ----------------------------
        readonly videoModelConfigured = isVideoModelConfigured();
        readonly promptModelConfigured = isVideoPromptModelConfigured();
        readonly capabilities = videoCapabilities();
        readonly nativeLongEdge = nativeLongEdge();
        readonly maxClipSeconds = maxClipSeconds();
        readonly maxConcurrentJobs = maxConcurrentJobs();
        readonly pipeline = pipelineId();

        // --- Derived: active project and its tree -------------------------------
        activeProject = $derived(this.projects.find((p) => p.id === this.activeProjectId) ?? null);
        projectFolders = $derived(foldersForProject(this.folders, this.activeProjectId));
        folderTree = $derived<FlatFolder[]>(flattenTree(this.projectFolders, null));
        crumbs = $derived<Crumb[]>(
                breadcrumb(this.projectFolders, this.activeFolderId, this.activeProject?.name ?? 'Project root')
        );
        visibleFolders = $derived(childFolders(this.projectFolders, this.activeFolderId));

        activeProjectSeries = $derived(this.series.filter((s) => s.projectId === this.activeProjectId));
        activeSeries = $derived(this.series.find((s) => s.id === this.activeSeriesId) ?? null);
        activeSeriesSeasons = $derived(this.seasons.filter((s) => s.seriesId === this.activeSeriesId).sort(byNumber));
        activeSeason = $derived(this.seasons.find((s) => s.id === this.activeSeasonId) ?? null);
        activeSeasonEpisodes = $derived(this.episodes.filter((e) => e.seasonId === this.activeSeasonId).sort(byNumber));
        activeEpisode = $derived(this.episodes.find((e) => e.id === this.activeEpisodeId) ?? null);
        activeProjectMovieParts = $derived(this.movieParts.filter((m) => m.projectId === this.activeProjectId).sort(byNumber));
        activeMoviePart = $derived(this.movieParts.find((m) => m.id === this.activeMoviePartId) ?? null);

        projectScenes = $derived(this.scenes.filter((s) => s.projectId === this.activeProjectId).sort(byNumber));
        activeScenes = $derived.by(() => {
                const parentKind = this.activeEpisodeId ? 'episode' : this.activeMoviePartId ? 'movie-part' : 'project';
                const parentId = this.activeEpisodeId ?? this.activeMoviePartId ?? this.activeProjectId;
                if (!parentId) return [];
                return this.scenes.filter((s) => s.parentKind === parentKind && s.parentId === parentId).sort(byNumber);
        });
        activeScene = $derived(this.scenes.find((s) => s.id === this.activeSceneId) ?? null);
        activeShots = $derived(this.shots.filter((s) => s.sceneId === this.activeSceneId).sort(byNumber));
        activeShot = $derived(this.shots.find((s) => s.id === this.activeShotId) ?? null);

        projectAssets = $derived(this.assets.filter((a) => a.projectId === this.activeProjectId));
        readyAssets = $derived(this.projectAssets.filter((a) => a.status === 'ready' && a.url));
        draftAssets = $derived(this.projectAssets.filter((a) => a.draft || a.status === 'draft'));
        folderAssets = $derived(this.projectAssets.filter((a) => a.folderId === this.activeFolderId));

        filteredAssets = $derived.by(() => {
                const q = this.librarySearch.replace(/\s+/g, ' ').trim().toLowerCase();
                const list = [...this.readyAssets].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
                if (!q) return list;
                return list.filter((a) => a.name.toLowerCase().includes(q));
        });
        pagedAssets = $derived(this.filteredAssets.slice(0, this.visibleLibraryCount));
        hiddenAssetCount = $derived(Math.max(0, this.filteredAssets.length - this.visibleLibraryCount));

        activeProjectJobs = $derived(sortJobs(this.jobs.filter((j) => j.projectId === this.activeProjectId)));
        queueSummary = $derived(summariseQueue(this.activeProjectJobs));
        pagedJobs = $derived(this.activeProjectJobs.slice(0, this.visibleQueueCount));
        hiddenJobCount = $derived(Math.max(0, this.activeProjectJobs.length - this.visibleQueueCount));

        selectedStyle = $derived(resolveStyle(this.selectedStyleId));
        composedPrompt = $derived(composeVideoPrompt(this.draft, this.selectedStyle, this.settingsSnapshot()));
        durationPlan = $derived<DurationPlan>(planDuration(this.durationSeconds, this.clipSeconds));
        measuredSeconds = $derived(sumMeasuredSeconds(this.readyAssets));
        plannedSeconds = $derived(this.activeProjectJobs.reduce((t, j) => t + j.requestedDurationSeconds, 0));
        activeReferences = $derived(this.references.filter((r) => r.projectId === this.activeProjectId));
        activeCharacters = $derived(this.characters.filter((c) => c.projectId === this.activeProjectId));
        needsUpscale = $derived(findResolution(this.resolution).longEdge > this.nativeLongEdge);
        resolutionSize = $derived(findResolution(this.resolution));

        storageNotice = $derived.by((): StorageNotice => {
                if (this.storageError) return { tone: 'warning', text: this.storageError };
                if (!this.repository.persistent) return { tone: 'warning', text: VIDEO_STATUS.storageUnavailable };
                if (!this.repository.shared) return { tone: 'info', text: VIDEO_STATUS.localOnly };
                return { tone: 'info', text: '' };
        });
        readonly storageLabel = $derived(this.repository.label);

        // --- Lifecycle ----------------------------------------------------------
        async init(): Promise<void> {
                this.loading = true;
                this.storageError = null;
                try {
                        const [projects, folders, audit] = await Promise.all([
                                this.repository.listProjects(this.scope()),
                                this.repository.listFolders(this.scope()),
                                this.repository.listAuditEvents(this.scope(), 50)
                        ]);
                        this.projects = projects;
                        this.folders = folders;
                        this.auditEvents = audit;
                        const first = [...projects]
                                .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.updatedAt.localeCompare(a.updatedAt))
                                .find((p) => !p.archived);
                        if (first) await this.openProject(first.id);
                } catch {
                        this.storageError = VIDEO_STATUS.storageUnavailable;
                } finally {
                        this.loading = false;
                }
        }

        private scope(): WorkspaceScope {
                return videoScope();
        }

        private settingsSnapshot(): Partial<StylePromptInput> {
                return {
                        aspectRatio: this.aspectRatio,
                        resolution: this.resolution,
                        frameRate: this.frameRate,
                        durationSeconds: this.durationSeconds,
                        cameraMovement: this.cameraMovement || undefined,
                        lighting: this.lighting || undefined,
                        palette: this.palette || undefined,
                        audio: this.audioNotes || undefined,
                        consistency: this.activeProject?.instructions || undefined,
                        references: this.referenceNote || undefined
                };
        }

        private async recordAudit(action: string, targetKind: string, targetId: string, detail = ''): Promise<void> {
                const event: AuditEvent = {
                        id: newId(),
                        ownerId: this.scope().workspaceId,
                        action,
                        targetKind,
                        targetId,
                        detail,
                        createdAt: new Date().toISOString()
                };
                try {
                        const stored = await this.repository.appendAuditEvent(this.scope(), event);
                        this.auditEvents = [stored, ...this.auditEvents].slice(0, 200);
                } catch {
                        /* audit is best-effort and must not roll back the operation */
                }
        }

        clearNotice(): void {
                this.notice = '';
        }

        get sharedStorageConfigured(): boolean {
                return isSupabaseConfigured();
        }
        // --- Project loading ----------------------------------------------------

        /** Opens a project and loads everything that belongs to it. */
        async openProject(id: string): Promise<void> {
                this.activeProjectId = id;
                this.activeFolderId = null;
                this.activeSeriesId = null;
                this.activeSeasonId = null;
                this.activeEpisodeId = null;
                this.activeMoviePartId = null;
                this.activeSceneId = null;
                this.activeShotId = null;
                this.librarySearch = '';
                this.visibleLibraryCount = PAGE_SIZE;

                const project = this.projects.find((p) => p.id === id);
                if (project) {
                        this.aspectRatio = project.defaultAspectRatio;
                        this.resolution = project.defaultResolution;
                        this.frameRate = project.defaultFrameRate;
                        this.selectedStyleId = project.defaultStyleId;
                }

                try {
                        const [series, movieParts, scenes, assets, promptVersions, jobs, references, characters, chatMessages, savedPrompts, renderJobs] =
                                await Promise.all([
                                        this.repository.listSeries(this.scope(), id),
                                        this.repository.listMovieParts(this.scope(), id),
                                        this.repository.listScenes(this.scope(), id),
                                        this.repository.listAssets(this.scope(), id),
                                        this.repository.listPromptVersions(this.scope(), id),
                                        this.repository.listJobs(this.scope(), id),
                                        this.repository.listReferences(this.scope(), id),
                                        this.repository.listCharacters(this.scope(), id),
                                        this.repository.listChatMessages(this.scope(), id),
                                        this.repository.listSavedPrompts(this.scope(), id),
                                        this.repository.listRenderJobs(this.scope(), id)
                                ]);
                        this.series = series;
                        this.movieParts = movieParts;
                        this.scenes = scenes;
                        this.assets = assets;
                        this.promptVersions = promptVersions;
                        this.jobs = jobs;
                        this.references = references;
                        this.characters = characters;
                        this.chatMessages = chatMessages;
                        this.savedPrompts = savedPrompts;
                        this.renderJobs = renderJobs;

                        // Load the first series' seasons on demand; the rest load when opened,
                        // so a huge tree is never read all at once.
                        const firstSeries = series[0];
                        if (firstSeries) {
                                this.activeSeriesId = firstSeries.id;
                                await this.loadSeasons(firstSeries.id);
                        } else {
                                this.seasons = [];
                                this.episodes = [];
                        }
                        const shotLists = await Promise.all(scenes.map((s) => this.repository.listShots(this.scope(), s.id)));
                        this.shots = shotLists.flat();
                } catch {
                        this.storageError = VIDEO_STATUS.storageUnavailable;
                }
        }

        /** Loads a series' seasons and their episodes on demand. */
        async loadSeasons(seriesId: string): Promise<void> {
                try {
                        const seasons = await this.repository.listSeasons(this.scope(), seriesId);
                        const episodeLists = await Promise.all(seasons.map((s) => this.repository.listEpisodes(this.scope(), s.id)));
                        const seasonIds = new Set(seasons.map((s) => s.id));
                        this.seasons = [...this.seasons.filter((s) => s.seriesId !== seriesId), ...seasons];
                        this.episodes = [...this.episodes.filter((e) => !seasonIds.has(e.seasonId)), ...episodeLists.flat()];
                } catch {
                        this.storageError = VIDEO_STATUS.storageUnavailable;
                }
        }

        /** Loads a scene's shots on demand. */
        async loadShots(sceneId: string): Promise<void> {
                try {
                        const shots = await this.repository.listShots(this.scope(), sceneId);
                        this.shots = [...this.shots.filter((s) => s.sceneId !== sceneId), ...shots];
                } catch {
                        this.storageError = VIDEO_STATUS.storageUnavailable;
                }
        }

        /** Reveals the next page of the library. */
        loadMoreLibrary(): void {
                this.visibleLibraryCount += PAGE_SIZE;
        }

        /** Reveals the next page of the queue. */
        loadMoreQueue(): void {
                this.visibleQueueCount += PAGE_SIZE;
        }

        // --- Projects -----------------------------------------------------------

        async createProject(input: { name: string; kind: Project['kind']; description?: string }): Promise<string | null> {
                const name = input.name.replace(/\s+/g, ' ').trim();
                if (!name) {
                        this.notice = 'Give the project a name first.';
                        return null;
                }
                const now = new Date().toISOString();
                const project: Project = {
                        id: newId(),
                        ownerId: this.scope().workspaceId,
                        name,
                        kind: input.kind,
                        description: input.description?.trim() ?? '',
                        folderId: null,
                        defaultAspectRatio: this.aspectRatio,
                        defaultResolution: this.resolution,
                        defaultFrameRate: this.frameRate,
                        defaultStyleId: this.selectedStyleId,
                        language: 'en',
                        audioPreferences: defaultAudioPreferences(),
                        instructions: '',
                        coverAssetId: null,
                        pinned: false,
                        archived: false,
                        createdAt: now,
                        updatedAt: now
                };
                try {
                        await this.repository.createProject(this.scope(), project);
                } catch {
                        this.storageError = VIDEO_STATUS.storageUnavailable;
                        this.notice = VIDEO_STATUS.saveFailed;
                        return null;
                }
                this.projects = [project, ...this.projects];
                await this.recordAudit('project.create', 'project', project.id, name);
                await this.openProject(project.id);
                this.notice = `“${name}” created.`;
                return project.id;
        }

        async updateProject(id: string, patch: ProjectPatch): Promise<void> {
                const index = this.projects.findIndex((p) => p.id === id);
                if (index === -1) return;
                const optimistic: Project = { ...this.projects[index], ...patch, updatedAt: new Date().toISOString() };
                const next = [...this.projects];
                next[index] = optimistic;
                this.projects = next;
                try {
                        await this.repository.updateProject(this.scope(), id, patch);
                        await this.recordAudit('project.update', 'project', id, Object.keys(patch).join(', '));
                } catch {
                        this.storageError = VIDEO_STATUS.storageUnavailable;
                        this.notice = VIDEO_STATUS.saveFailed;
                }
        }

        async renameProject(id: string, name: string): Promise<void> {
                const clean = name.replace(/\s+/g, ' ').trim();
                if (!clean) return;
                await this.updateProject(id, { name: clean });
        }

        async toggleProjectPin(id: string): Promise<void> {
                const project = this.projects.find((p) => p.id === id);
                if (!project) return;
                await this.updateProject(id, { pinned: !project.pinned });
        }

        async setProjectArchived(id: string, archived: boolean): Promise<void> {
                await this.updateProject(id, archived ? { archived: true, pinned: false } : { archived: false });
                if (archived && this.activeProjectId === id) {
                        const next = this.projects.find((p) => p.id !== id && !p.archived);
                        if (next) await this.openProject(next.id);
                        else {
                                this.activeProjectId = null;
                                this.clearProjectData();
                        }
                }
        }

        /**
         * Duplicates a project's metadata and production plan into a new project.
         *
         * Generated media is deliberately NOT copied: duplicating a project
         * duplicates folders, scenes, shots and references, not the rendered files,
         * which are large and owned by the original.
         */
        async duplicateProject(id: string): Promise<string | null> {
                const source = this.projects.find((p) => p.id === id);
                if (!source) return null;
                const created = await this.createProject({
                        name: `${source.name} (copy)`,
                        kind: source.kind,
                        description: source.description
                });
                if (!created) return null;
                await this.updateProject(created, {
                        defaultAspectRatio: source.defaultAspectRatio,
                        defaultResolution: source.defaultResolution,
                        defaultFrameRate: source.defaultFrameRate,
                        defaultStyleId: source.defaultStyleId,
                        language: source.language,
                        audioPreferences: source.audioPreferences,
                        instructions: source.instructions
                });

                const folders = this.folders.filter((f) => f.projectId === id);
                const idMap = new Map<string, string>();
                for (const folder of folders) idMap.set(folder.id, newId());
                for (const folder of folders) {
                        await this.createFolder({
                                name: folder.name,
                                parentId: folder.parentId ? (idMap.get(folder.parentId) ?? null) : null,
                                projectId: created,
                                silent: true
                        });
                }
                for (const scene of this.scenes.filter((s) => s.projectId === id)) {
                        const copy = await this.createScene({
                                title: scene.title,
                                description: scene.description,
                                parentKind: scene.parentKind,
                                parentId: scene.parentId,
                                targetDurationSeconds: scene.targetDurationSeconds,
                                silent: true
                        });
                        if (!copy) continue;
                        for (const shot of this.shots.filter((s) => s.sceneId === scene.id)) {
                                await this.createShot(copy, {
                                        title: shot.title,
                                        prompt: shot.prompt,
                                        styleId: shot.styleId,
                                        aspectRatio: shot.aspectRatio,
                                        resolution: shot.resolution,
                                        frameRate: shot.frameRate,
                                        targetDurationSeconds: shot.targetDurationSeconds,
                                        cameraMovement: shot.cameraMovement
                                });
                        }
                }
                for (const reference of this.references.filter((r) => r.projectId === id)) {
                        await this.createReference({
                                kind: reference.kind,
                                name: reference.name,
                                description: reference.description,
                                rules: reference.rules
                        });
                }
                this.notice = `Duplicated “${source.name}” — production plan copied, media not duplicated.`;
                return created;
        }

        /** Deletes a project and everything belonging to it, after confirmation. */
        async deleteProject(id: string): Promise<void> {
                const source = this.projects.find((p) => p.id === id);
                const remaining = this.projects.filter((p) => p.id !== id);
                this.projects = remaining;
                try {
                        await this.repository.deleteProject(this.scope(), id);
                        await this.recordAudit('project.delete', 'project', id, source?.name ?? '');
                } catch {
                        this.storageError = VIDEO_STATUS.storageUnavailable;
                }
                this.folders = this.folders.filter((f) => f.projectId !== id);
                if (this.activeProjectId === id) {
                        this.activeProjectId = null;
                        const next = remaining.find((p) => !p.archived);
                        if (next) await this.openProject(next.id);
                        else this.clearProjectData();
                }
        }

        /** Clears per-project caches when no project is open. */
        private clearProjectData(): void {
                this.series = [];
                this.seasons = [];
                this.episodes = [];
                this.movieParts = [];
                this.scenes = [];
                this.shots = [];
                this.assets = [];
                this.jobs = [];
                this.jobEvents = [];
                this.references = [];
                this.characters = [];
                this.chatMessages = [];
                this.savedPrompts = [];
                this.renderJobs = [];
        }

        /** Exports the active project's metadata as a JSON string. */
        exportProjectMetadata(id: string): string {
                const project = this.projects.find((p) => p.id === id);
                if (!project) return '{}';
                return JSON.stringify(
                        {
                                exportedAt: new Date().toISOString(),
                                note: 'Production metadata only. Media files are referenced by URL, not included.',
                                project,
                                folders: this.folders.filter((f) => f.projectId === id),
                                series: this.series.filter((s) => s.projectId === id),
                                movieParts: this.movieParts.filter((m) => m.projectId === id),
                                scenes: this.scenes.filter((s) => s.projectId === id),
                                shots: this.shots.filter((sh) => this.scenes.some((sc) => sc.id === sh.sceneId && sc.projectId === id)),
                                promptVersions: this.promptVersions.filter((v) => v.projectId === id),
                                jobs: this.jobs.filter((j) => j.projectId === id),
                                references: this.references.filter((r) => r.projectId === id),
                                characters: this.characters.filter((c) => c.projectId === id)
                        },
                        null,
                        2
                );
        }
        // --- Folders ------------------------------------------------------------

        /** Creates a folder. `silent` suppresses the audit/notice for internal copies. */
        async createFolder(input: {
                name: string;
                parentId: string | null;
                projectId?: string | null;
                silent?: boolean;
        }): Promise<string | null> {
                const projectId = input.projectId ?? this.activeProjectId;
                const siblings = this.folders.filter((f) => f.projectId === projectId);
                const name = uniqueName(siblings, input.parentId, input.name || 'Untitled folder');
                const now = new Date().toISOString();
                const folder: Folder = {
                        id: newId(),
                        ownerId: this.scope().workspaceId,
                        projectId,
                        parentId: input.parentId,
                        name,
                        order: nextOrder(siblings, input.parentId),
                        pinned: false,
                        archived: false,
                        createdAt: now,
                        updatedAt: now
                };
                try {
                        await this.repository.createFolder(this.scope(), folder);
                } catch {
                        this.storageError = VIDEO_STATUS.storageUnavailable;
                        return null;
                }
                this.folders = [...this.folders, folder];
                if (!input.silent) {
                        await this.recordAudit('folder.create', 'folder', folder.id, name);
                        this.notice = `Folder “${name}” created.`;
                }
                return folder.id;
        }

        async renameFolder(id: string, name: string): Promise<void> {
                const folder = this.folders.find((f) => f.id === id);
                if (!folder) return;
                const clean = name.replace(/\s+/g, ' ').trim();
                if (!clean) return;
                const siblings = this.folders.filter((f) => f.projectId === folder.projectId);
                if (isDuplicateName(siblings, folder.parentId, clean, id)) {
                        this.notice = `A folder named “${clean}” already exists here.`;
                        return;
                }
                await this.patchFolder(id, { name: clean });
        }

        private async patchFolder(id: string, patch: Partial<Folder>): Promise<void> {
                const index = this.folders.findIndex((f) => f.id === id);
                if (index === -1) return;
                const optimistic: Folder = { ...this.folders[index], ...patch, updatedAt: new Date().toISOString() };
                const next = [...this.folders];
                next[index] = optimistic;
                this.folders = next;
                try {
                        await this.repository.updateFolder(this.scope(), id, patch);
                } catch {
                        this.storageError = VIDEO_STATUS.storageUnavailable;
                        this.notice = VIDEO_STATUS.saveFailed;
                }
        }

        /**
         * Moves a folder under a new parent.
         *
         * The cycle check runs here too, not only in the UI: a folder must never
         * become its own descendant, and the migration enforces the same rule.
         */
        async moveFolder(id: string, newParentId: string | null): Promise<void> {
                const check = canMove(this.projectFolders, id, newParentId);
                if (!check.ok) {
                        this.notice = check.reason ?? 'That move is not allowed.';
                        return;
                }
                const siblings = this.projectFolders.filter((f) => f.parentId === newParentId);
                await this.patchFolder(id, { parentId: newParentId, order: nextOrder(siblings, newParentId) });
                await this.recordAudit('folder.move', 'folder', id, newParentId ?? 'root');
        }

        /** Moves a clip into a folder. */
        async moveAssetToFolder(assetId: string, folderId: string | null): Promise<void> {
                const asset = this.assets.find((a) => a.id === assetId);
                if (!asset) return;
                const index = this.assets.findIndex((a) => a.id === assetId);
                const next = [...this.assets];
                next[index] = { ...asset, folderId, updatedAt: new Date().toISOString() };
                this.assets = next;
                try {
                        await this.repository.updateAsset(this.scope(), assetId, { folderId });
                } catch {
                        this.storageError = VIDEO_STATUS.storageUnavailable;
                }
        }

        /** Reorders a folder among its siblings. */
        async reorderFolder(id: string, direction: 'up' | 'down'): Promise<void> {
                const patches = reorderSiblings(this.projectFolders, id, direction);
                if (!patches) return;
                for (const patch of patches) await this.patchFolder(patch.id, { order: patch.order });
        }

        async toggleFolderPin(id: string): Promise<void> {
                const folder = this.folders.find((f) => f.id === id);
                if (!folder) return;
                await this.patchFolder(id, { pinned: !folder.pinned });
        }

        async setFolderArchived(id: string, archived: boolean): Promise<void> {
                await this.patchFolder(id, { archived });
                if (archived && this.activeFolderId === id) {
                        this.activeFolderId = folderParentOrNull(this.projectFolders, id);
                }
        }

        /** Opens a folder (navigates the tree to it). */
        openFolder(id: string | null): void {
                this.activeFolderId = id;
        }

        /**
         * Describes what deleting a folder would remove, so the confirmation can
         * state the impact rather than asking a bare "are you sure?".
         */
        folderDeleteImpact(id: string): ReturnType<typeof deleteImpact> {
                const projectsByFolder = new Map<string | null, number>();
                for (const project of this.projects) {
                        projectsByFolder.set(project.folderId, (projectsByFolder.get(project.folderId) ?? 0) + 1);
                }
                const assetsByFolder = new Map<string | null, number>();
                for (const asset of this.assets) {
                        assetsByFolder.set(asset.folderId, (assetsByFolder.get(asset.folderId) ?? 0) + 1);
                }
                return deleteImpact(this.projectFolders, id, { projectsByFolder, assetsByFolder });
        }

        /**
         * Deletes a folder. Media and projects inside are moved to the project root
         * rather than deleted, so removing a container never destroys rendered work.
         */
        async deleteFolder(id: string, cascade: boolean): Promise<void> {
                const subtree = new Set([id, ...descendantsOf(this.projectFolders, id)]);
                this.folders = this.folders.filter((f) => !subtree.has(f.id));
                this.assets = this.assets.map((a) => (a.folderId && subtree.has(a.folderId) ? { ...a, folderId: null } : a));
                this.projects = this.projects.map((p) => (p.folderId && subtree.has(p.folderId) ? { ...p, folderId: null } : p));
                if (this.activeFolderId && subtree.has(this.activeFolderId)) this.activeFolderId = null;
                try {
                        await this.repository.deleteFolder(this.scope(), id, cascade);
                        await this.recordAudit('folder.delete', 'folder', id, cascade ? 'with subfolders' : 'single');
                } catch {
                        this.storageError = VIDEO_STATUS.storageUnavailable;
                }
                this.notice = 'Folder removed. Its contents were moved to the project root.';
        }

        // --- Series / seasons / episodes ---------------------------------------

        async createSeries(input: Partial<Series> & { title: string }): Promise<string | null> {
                const projectId = this.activeProjectId;
                if (!projectId) {
                        this.notice = 'Open or create a project first.';
                        return null;
                }
                const now = new Date().toISOString();
                const series: Series = {
                        id: newId(),
                        ownerId: this.scope().workspaceId,
                        projectId,
                        title: input.title.trim() || 'Untitled series',
                        description: input.description ?? '',
                        genre: input.genre ?? '',
                        premise: input.premise ?? '',
                        audience: input.audience ?? '',
                        language: input.language ?? 'en',
                        tone: input.tone ?? '',
                        styleId: input.styleId ?? this.selectedStyleId,
                        aspectRatio: input.aspectRatio ?? this.aspectRatio,
                        frameRate: input.frameRate ?? this.frameRate,
                        continuityRules: input.continuityRules ?? '',
                        audioPreferences: input.audioPreferences ?? defaultAudioPreferences(),
                        targetSeasons: input.targetSeasons ?? null,
                        targetEpisodes: input.targetEpisodes ?? null,
                        createdAt: now,
                        updatedAt: now
                };
                try {
                        await this.repository.createSeries(this.scope(), series);
                } catch {
                        this.storageError = VIDEO_STATUS.storageUnavailable;
                        return null;
                }
                this.series = [...this.series, series];
                this.activeSeriesId = series.id;
                await this.recordAudit('series.create', 'series', series.id, series.title);
                this.notice = `Series “${series.title}” created.`;
                return series.id;
        }

        async updateSeries(id: string, patch: Partial<Series>): Promise<void> {
                await this.patchEntity('series', id, patch);
        }

        async deleteSeries(id: string): Promise<void> {
                const seasonIds = this.seasons.filter((s) => s.seriesId === id).map((s) => s.id);
                this.series = this.series.filter((s) => s.id !== id);
                this.seasons = this.seasons.filter((s) => s.seriesId !== id);
                this.episodes = this.episodes.filter((e) => !seasonIds.includes(e.seasonId) && e.seriesId !== id);
                if (this.activeSeriesId === id) this.activeSeriesId = null;
                try {
                        await this.repository.deleteSeries(this.scope(), id);
                        await this.recordAudit('series.delete', 'series', id, '');
                } catch {
                        this.storageError = VIDEO_STATUS.storageUnavailable;
                }
        }

        /** Adds a season, numbering it after the existing ones. */
        async createSeason(title = ''): Promise<string | null> {
                const seriesId = this.activeSeriesId;
                if (!seriesId) {
                        this.notice = 'Open a series first.';
                        return null;
                }
                const existing = this.seasons.filter((s) => s.seriesId === seriesId);
                const number = existing.length ? Math.max(...existing.map((s) => s.number)) + 1 : 1;
                const now = new Date().toISOString();
                const season: Season = {
                        id: newId(),
                        ownerId: this.scope().workspaceId,
                        seriesId,
                        number,
                        title: title.trim() || `Season ${number}`,
                        description: '',
                        arc: '',
                        notes: '',
                        coverAssetId: null,
                        pinned: false,
                        createdAt: now,
                        updatedAt: now
                };
                try {
                        await this.repository.createSeason(this.scope(), season);
                } catch {
                        this.storageError = VIDEO_STATUS.storageUnavailable;
                        return null;
                }
                this.seasons = [...this.seasons, season];
                this.activeSeasonId = season.id;
                await this.recordAudit('season.create', 'season', season.id, season.title);
                return season.id;
        }

        async updateSeason(id: string, patch: Partial<Season>): Promise<void> {
                await this.patchEntity('season', id, patch);
        }

        async deleteSeason(id: string): Promise<void> {
                const episodeIds = this.episodes.filter((e) => e.seasonId === id).map((e) => e.id);
                this.seasons = this.seasons.filter((s) => s.id !== id);
                this.episodes = this.episodes.filter((e) => e.seasonId !== id);
                this.scenes = this.scenes.filter((s) => !(s.parentKind === 'episode' && episodeIds.includes(s.parentId)));
                if (this.activeSeasonId === id) this.activeSeasonId = null;
                try {
                        await this.repository.deleteSeason(this.scope(), id);
                        await this.recordAudit('season.delete', 'season', id, '');
                } catch {
                        this.storageError = VIDEO_STATUS.storageUnavailable;
                }
        }

        async createEpisode(title = ''): Promise<string | null> {
                const seasonId = this.activeSeasonId;
                const season = this.seasons.find((s) => s.id === seasonId);
                if (!seasonId || !season) {
                        this.notice = 'Open a season first.';
                        return null;
                }
                const existing = this.episodes.filter((e) => e.seasonId === seasonId);
                const number = existing.length ? Math.max(...existing.map((e) => e.number)) + 1 : 1;
                const now = new Date().toISOString();
                const episode: Episode = {
                        id: newId(),
                        ownerId: this.scope().workspaceId,
                        seriesId: season.seriesId,
                        seasonId,
                        number,
                        title: title.trim() || `Episode ${number}`,
                        synopsis: '',
                        script: '',
                        targetDurationSeconds: null,
                        notes: '',
                        createdAt: now,
                        updatedAt: now
                };
                try {
                        await this.repository.createEpisode(this.scope(), episode);
                } catch {
                        this.storageError = VIDEO_STATUS.storageUnavailable;
                        return null;
                }
                this.episodes = [...this.episodes, episode];
                this.activeEpisodeId = episode.id;
                this.activeMoviePartId = null;
                await this.recordAudit('episode.create', 'episode', episode.id, episode.title);
                return episode.id;
        }

        async updateEpisode(id: string, patch: Partial<Episode>): Promise<void> {
                await this.patchEntity('episode', id, patch);
        }

        async deleteEpisode(id: string): Promise<void> {
                this.episodes = this.episodes.filter((e) => e.id !== id);
                this.scenes = this.scenes.filter((s) => !(s.parentKind === 'episode' && s.parentId === id));
                if (this.activeEpisodeId === id) this.activeEpisodeId = null;
                try {
                        await this.repository.deleteEpisode(this.scope(), id);
                        await this.recordAudit('episode.delete', 'episode', id, '');
                } catch {
                        this.storageError = VIDEO_STATUS.storageUnavailable;
                }
        }

        /**
         * Reorders an episode within its season by swapping numbers. Media
         * references are untouched: only `number` changes, so no clip is orphaned.
         */
        async reorderEpisode(id: string, direction: 'up' | 'down'): Promise<void> {
                const episode = this.episodes.find((e) => e.id === id);
                if (!episode) return;
                const siblings = this.episodes.filter((e) => e.seasonId === episode.seasonId).sort(byNumber);
                const index = siblings.findIndex((e) => e.id === id);
                const targetIndex = direction === 'up' ? index - 1 : index + 1;
                if (targetIndex < 0 || targetIndex >= siblings.length) return;
                const other = siblings[targetIndex];
                await this.updateEpisode(id, { number: other.number });
                await this.updateEpisode(other.id, { number: episode.number });
        }

        /** Stores the episode number a user typed, renumbering siblings to keep it unique. */
        async setEpisodeNumber(id: string, number: number): Promise<void> {
                const episode = this.episodes.find((e) => e.id === id);
                if (!episode || !Number.isFinite(number) || number < 1) return;
                const target = Math.floor(number);
                const siblings = this.episodes.filter((e) => e.seasonId === episode.seasonId).sort(byNumber);
                const occupant = siblings.find((e) => e.number === target && e.id !== id);
                await this.updateEpisode(id, { number: target });
                if (occupant) await this.updateEpisode(occupant.id, { number: episode.number });
        }

        // --- Movie parts --------------------------------------------------------

        async createMoviePart(title = ''): Promise<string | null> {
                const projectId = this.activeProjectId;
                if (!projectId) {
                        this.notice = 'Open or create a project first.';
                        return null;
                }
                const existing = this.movieParts.filter((m) => m.projectId === projectId);
                const number = existing.length ? Math.max(...existing.map((m) => m.number)) + 1 : 1;
                const now = new Date().toISOString();
                const part: MoviePart = {
                        id: newId(),
                        ownerId: this.scope().workspaceId,
                        projectId,
                        number,
                        title: title.trim() || `Part ${number}`,
                        synopsis: '',
                        script: '',
                        targetDurationSeconds: null,
                        notes: '',
                        createdAt: now,
                        updatedAt: now
                };
                try {
                        await this.repository.createMoviePart(this.scope(), part);
                } catch {
                        this.storageError = VIDEO_STATUS.storageUnavailable;
                        return null;
                }
                this.movieParts = [...this.movieParts, part];
                this.activeMoviePartId = part.id;
                this.activeEpisodeId = null;
                await this.recordAudit('movie-part.create', 'movie-part', part.id, part.title);
                return part.id;
        }

        async updateMoviePart(id: string, patch: Partial<MoviePart>): Promise<void> {
                await this.patchEntity('moviePart', id, patch);
        }

        async deleteMoviePart(id: string): Promise<void> {
                this.movieParts = this.movieParts.filter((m) => m.id !== id);
                this.scenes = this.scenes.filter((s) => !(s.parentKind === 'movie-part' && s.parentId === id));
                if (this.activeMoviePartId === id) this.activeMoviePartId = null;
                try {
                        await this.repository.deleteMoviePart(this.scope(), id);
                        await this.recordAudit('movie-part.delete', 'movie-part', id, '');
                } catch {
                        this.storageError = VIDEO_STATUS.storageUnavailable;
                }
        }

        /** Reorders a movie part by swapping numbers, preserving scene references. */
        async reorderMoviePart(id: string, direction: 'up' | 'down'): Promise<void> {
                const part = this.movieParts.find((m) => m.id === id);
                if (!part) return;
                const siblings = this.movieParts.filter((m) => m.projectId === part.projectId).sort(byNumber);
                const index = siblings.findIndex((m) => m.id === id);
                const targetIndex = direction === 'up' ? index - 1 : index + 1;
                if (targetIndex < 0 || targetIndex >= siblings.length) return;
                const other = siblings[targetIndex];
                await this.updateMoviePart(id, { number: other.number });
                await this.updateMoviePart(other.id, { number: part.number });
        }

        // --- Scenes / shots -----------------------------------------------------

        async createScene(input: {
                title: string;
                description?: string;
                parentKind?: Scene['parentKind'];
                parentId?: string;
                targetDurationSeconds?: number | null;
                silent?: boolean;
        }): Promise<string | null> {
                const projectId = this.activeProjectId;
                if (!projectId) return null;
                const parentKind =
                        input.parentKind ?? (this.activeEpisodeId ? 'episode' : this.activeMoviePartId ? 'movie-part' : 'project');
                const parentId = input.parentId ?? this.activeEpisodeId ?? this.activeMoviePartId ?? projectId;
                const siblings = this.scenes.filter((s) => s.parentKind === parentKind && s.parentId === parentId);
                const number = siblings.length ? Math.max(...siblings.map((s) => s.number)) + 1 : 1;
                const now = new Date().toISOString();
                const scene: Scene = {
                        id: newId(),
                        ownerId: this.scope().workspaceId,
                        projectId,
                        parentKind,
                        parentId,
                        number,
                        title: input.title.trim() || `Scene ${number}`,
                        description: input.description ?? '',
                        targetDurationSeconds: input.targetDurationSeconds ?? null,
                        notes: '',
                        createdAt: now,
                        updatedAt: now
                };
                try {
                        await this.repository.createScene(this.scope(), scene);
                } catch {
                        this.storageError = VIDEO_STATUS.storageUnavailable;
                        return null;
                }
                this.scenes = [...this.scenes, scene];
                this.activeSceneId = scene.id;
                if (!input.silent) await this.recordAudit('scene.create', 'scene', scene.id, scene.title);
                return scene.id;
        }

        async updateScene(id: string, patch: Partial<Scene>): Promise<void> {
                await this.patchEntity('scene', id, patch);
        }

        async deleteScene(id: string): Promise<void> {
                const shotIds = this.shots.filter((s) => s.sceneId === id).map((s) => s.id);
                this.scenes = this.scenes.filter((s) => s.id !== id);
                this.shots = this.shots.filter((s) => s.sceneId !== id);
                // Clips are unfiled, not deleted, so no rendered work is destroyed.
                this.assets = this.assets.map((a) =>
                        a.sceneId === id || (a.shotId && shotIds.includes(a.shotId)) ? { ...a, sceneId: null, shotId: null } : a
                );
                if (this.activeSceneId === id) this.activeSceneId = null;
                try {
                        await this.repository.deleteScene(this.scope(), id);
                        await this.recordAudit('scene.delete', 'scene', id, '');
                } catch {
                        this.storageError = VIDEO_STATUS.storageUnavailable;
                }
        }

        async reorderScene(id: string, direction: 'up' | 'down'): Promise<void> {
                const scene = this.scenes.find((s) => s.id === id);
                if (!scene) return;
                const siblings = this.scenes
                        .filter((s) => s.parentKind === scene.parentKind && s.parentId === scene.parentId)
                        .sort(byNumber);
                const index = siblings.findIndex((s) => s.id === id);
                const targetIndex = direction === 'up' ? index - 1 : index + 1;
                if (targetIndex < 0 || targetIndex >= siblings.length) return;
                const other = siblings[targetIndex];
                await this.updateScene(id, { number: other.number });
                await this.updateScene(other.id, { number: scene.number });
        }

        async createShot(sceneId: string, input: Partial<Shot> & { title: string }): Promise<string | null> {
                const siblings = this.shots.filter((s) => s.sceneId === sceneId);
                const number = siblings.length ? Math.max(...siblings.map((s) => s.number)) + 1 : 1;
                const now = new Date().toISOString();
                const shot: Shot = {
                        id: newId(),
                        ownerId: this.scope().workspaceId,
                        sceneId,
                        number,
                        title: input.title.trim() || `Shot ${number}`,
                        prompt: input.prompt ?? '',
                        styleId: input.styleId ?? this.selectedStyleId,
                        aspectRatio: input.aspectRatio ?? this.aspectRatio,
                        resolution: input.resolution ?? this.resolution,
                        frameRate: input.frameRate ?? this.frameRate,
                        targetDurationSeconds: clampToMaxClip(input.targetDurationSeconds ?? this.clipSeconds, this.maxClipSeconds),
                        cameraMovement: input.cameraMovement ?? this.cameraMovement,
                        notes: input.notes ?? '',
                        createdAt: now,
                        updatedAt: now
                };
                try {
                        await this.repository.createShot(this.scope(), shot);
                } catch {
                        this.storageError = VIDEO_STATUS.storageUnavailable;
                        return null;
                }
                this.shots = [...this.shots, shot];
                return shot.id;
        }

        async updateShot(id: string, patch: Partial<Shot>): Promise<void> {
                await this.patchEntity('shot', id, patch);
        }

        async deleteShot(id: string): Promise<void> {
                this.shots = this.shots.filter((s) => s.id !== id);
                this.assets = this.assets.map((a) => (a.shotId === id ? { ...a, shotId: null } : a));
                if (this.activeShotId === id) this.activeShotId = null;
                try {
                        await this.repository.deleteShot(this.scope(), id);
                } catch {
                        this.storageError = VIDEO_STATUS.storageUnavailable;
                }
        }

        async reorderShot(id: string, direction: 'up' | 'down'): Promise<void> {
                const shot = this.shots.find((s) => s.id === id);
                if (!shot) return;
                const siblings = this.shots.filter((s) => s.sceneId === shot.sceneId).sort(byNumber);
                const index = siblings.findIndex((s) => s.id === id);
                const targetIndex = direction === 'up' ? index - 1 : index + 1;
                if (targetIndex < 0 || targetIndex >= siblings.length) return;
                const other = siblings[targetIndex];
                await this.updateShot(id, { number: other.number });
                await this.updateShot(other.id, { number: shot.number });
        }

        // --- Selection helpers --------------------------------------------------

        selectSeries(id: string | null): void {
                this.activeSeriesId = id;
                this.activeSeasonId = null;
                this.activeEpisodeId = null;
                this.activeMoviePartId = null;
                this.activeSceneId = null;
                if (id) void this.loadSeasons(id);
        }

        selectSeason(id: string | null): void {
                this.activeSeasonId = id;
                this.activeEpisodeId = null;
                this.activeSceneId = null;
        }

        selectEpisode(id: string | null): void {
                this.activeEpisodeId = id;
                this.activeMoviePartId = null;
                this.activeSceneId = null;
                this.activeShotId = null;
                if (id) void this.loadShotsForParent('episode', id);
        }

        private async loadShotsForParent(parentKind: 'episode' | 'movie-part' | 'project', parentId: string): Promise<void> {
                const scenes = this.scenes.filter((s) => s.parentKind === parentKind && s.parentId === parentId);
                if (!scenes.length) return;
                try {
                        const shotLists = await Promise.all(scenes.map((s) => this.repository.listShots(this.scope(), s.id)));
                        const sceneIds = new Set(scenes.map((s) => s.id));
                        this.shots = [...this.shots.filter((s) => !sceneIds.has(s.sceneId)), ...shotLists.flat()];
                } catch {
                        this.storageError = VIDEO_STATUS.storageUnavailable;
                }
        }

        selectMoviePart(id: string | null): void {
                this.activeMoviePartId = id;
                this.activeEpisodeId = null;
                this.activeSceneId = null;
                this.activeShotId = null;
                if (id) void this.loadShotsForParent('movie-part', id);
        }

        selectScene(id: string | null): void {
                this.activeSceneId = id;
                this.activeShotId = null;
                if (id) void this.loadShots(id);
        }

        selectShot(id: string | null): void {
                this.activeShotId = id;
                const shot = this.shots.find((s) => s.id === id);
                if (shot) {
                        this.draft = shot.prompt;
                        this.selectedStyleId = shot.styleId;
                        this.aspectRatio = shot.aspectRatio;
                        this.resolution = shot.resolution;
                        this.frameRate = shot.frameRate;
                        this.clipSeconds = shot.targetDurationSeconds;
                        this.cameraMovement = shot.cameraMovement;
                }
        }
        // --- Composer -----------------------------------------------------------

        setDraft(value: string): void {
                this.draft = value;
        }

        setAspectRatio(value: string): void {
                this.aspectRatio = value;
        }

        setResolution(value: string): void {
                this.resolution = value;
        }

        setFrameRate(value: number): void {
                this.frameRate = value;
        }

        setDuration(seconds: number): void {
                this.durationSeconds = Math.max(1, Math.floor(seconds) || 1);
        }

        setClipSeconds(seconds: number): void {
                this.clipSeconds = clampToMaxClip(seconds, this.maxClipSeconds);
        }

        // --- Style selection ----------------------------------------------------

        /**
         * Applies a style to the composer.
         *
         * Empty draft → the structured brief is inserted directly. Non-empty draft
         * that does not already contain the style's guidance → the caller must
         * confirm how to combine them (no silent overwrite). Already-applied
         * guidance → the selection is recorded without duplicating the text.
         */
        selectStyle(styleId: string): void {
                const style = resolveStyle(styleId);
                if (!style) return;
                this.selectedStyleId = styleId;
                this.notice = '';

                const current = this.draft.trim();
                if (!current) {
                        this.draft = applyStyleToDraft(this.draft, style, 'insert', this.settingsSnapshot());
                        this.pendingStyle = null;
                        return;
                }
                const applied = applyStyleToDraft(this.draft, style, 'insert', this.settingsSnapshot());
                if (applied === current) {
                        this.pendingStyle = null;
                        return;
                }
                this.pendingStyle = { style, draft: this.draft };
        }

        /** Resolves a pending style application with the user's chosen mode. */
        resolvePendingStyle(mode: ComposeMode): void {
                const pending = this.pendingStyle;
                if (!pending) return;
                this.draft = applyStyleToDraft(pending.draft, pending.style, mode, this.settingsSnapshot());
                this.pendingStyle = null;
        }

        cancelPendingStyle(): void {
                this.pendingStyle = null;
        }

        /** Clears the active style, stripping only its guidance from the draft. */
        clearStyle(): void {
                const style = this.selectedStyle;
                this.selectedStyleId = null;
                this.pendingStyle = null;
                if (style) this.draft = removeStyleFromDraft(this.draft, style);
        }

        /** Applies the active style's guidance to the current shot's stored prompt. */
        async applyStyleToActiveShot(): Promise<void> {
                const shot = this.activeShot;
                const style = this.selectedStyle;
                if (!shot) {
                        this.notice = 'Select a shot first.';
                        return;
                }
                if (!style) {
                        this.notice = 'Select a style first.';
                        return;
                }
                const prompt = applyStyleToDraft(shot.prompt, style, 'insert', this.settingsSnapshot());
                await this.updateShot(shot.id, { prompt, styleId: style.id });
                this.notice = `Style “${style.name}” applied to shot ${shot.number}.`;
        }

        /** Saves the current composer settings as the active project's defaults. */
        async saveAsProjectDefaults(): Promise<void> {
                if (!this.activeProjectId) return;
                await this.updateProject(this.activeProjectId, {
                        defaultAspectRatio: this.aspectRatio,
                        defaultResolution: this.resolution,
                        defaultFrameRate: this.frameRate,
                        defaultStyleId: this.selectedStyleId
                });
                this.notice = 'Saved as this project’s defaults.';
        }

        // --- Prompt chat --------------------------------------------------------

        async sendChat(content: string): Promise<void> {
                const text = content.trim();
                if (!text) return;
                const projectId = this.activeProjectId;
                if (!projectId) {
                        this.notice = 'Open or create a project first.';
                        return;
                }
                await this.appendChat({
                        id: newId(),
                        ownerId: this.scope().workspaceId,
                        projectId,
                        role: 'user',
                        content: text,
                        kind: 'chat',
                        styleId: this.selectedStyleId,
                        createdAt: new Date().toISOString()
                });

                if (!this.promptModelConfigured) {
                        // No model: record the honest state rather than inventing a reply.
                        await this.appendChat({
                                id: newId(),
                                ownerId: this.scope().workspaceId,
                                projectId,
                                role: 'assistant',
                                content: VIDEO_STATUS.promptUnavailable,
                                kind: 'note',
                                createdAt: new Date().toISOString()
                        });
                        this.notice = VIDEO_STATUS.promptUnavailable;
                        return;
                }

                this.chatBusy = true;
                const controller = new AbortController();
                this.chatAbort = controller;
                try {
                        const result = await requestVideoPrompt(
                                {
                                        requestId: newId(),
                                        task: 'story',
                                        prompt: text,
                                        styleId: this.selectedStyleId,
                                        aspectRatio: this.aspectRatio,
                                        durationSeconds: this.durationSeconds,
                                        context: {
                                                projectId,
                                                sceneTitle: this.activeScene?.title,
                                                continuity: this.activeProject?.instructions
                                        }
                                },
                                controller.signal
                        );
                        await this.appendChat({
                                id: newId(),
                                ownerId: this.scope().workspaceId,
                                projectId,
                                role: 'assistant',
                                content: result.text ?? result.prompt ?? '',
                                kind: result.prompt ? 'enhancement' : 'chat',
                                styleId: this.selectedStyleId,
                                createdAt: new Date().toISOString()
                        });
                        if (result.prompt) this.draft = result.prompt;
                } catch (error) {
                        this.notice = toSafePromptMessage(error);
                } finally {
                        this.chatAbort = null;
                        this.chatBusy = false;
                }
        }

        stopChat(): void {
                this.chatAbort?.abort();
                this.chatAbort = null;
                this.chatBusy = false;
        }

        /**
         * Requests an improved prompt without losing the original.
         *
         * The original text is kept on the chat turn, and the draft is only replaced
         * once the model returns something.
         */
        async improvePrompt(): Promise<void> {
                const source = this.draft.trim();
                if (!source) {
                        this.notice = 'Write or insert a prompt first.';
                        return;
                }
                if (!this.promptModelConfigured) {
                        this.notice = VIDEO_STATUS.promptUnavailable;
                        return;
                }
                const projectId = this.activeProjectId;
                if (!projectId) return;
                this.chatBusy = true;
                const controller = new AbortController();
                this.chatAbort = controller;
                try {
                        const result = await requestVideoPrompt(
                                {
                                        requestId: newId(),
                                        task: 'enhance',
                                        prompt: source,
                                        styleId: this.selectedStyleId,
                                        aspectRatio: this.aspectRatio,
                                        durationSeconds: this.durationSeconds
                                },
                                controller.signal
                        );
                        await this.appendChat({
                                id: newId(),
                                ownerId: this.scope().workspaceId,
                                projectId,
                                role: 'assistant',
                                content: result.prompt ?? '',
                                kind: 'enhancement',
                                originalPrompt: source,
                                styleId: this.selectedStyleId,
                                createdAt: new Date().toISOString()
                        });
                        if (result.prompt) this.draft = result.prompt;
                        if (result.negativePrompt) this.negativePrompt = result.negativePrompt;
                } catch (error) {
                        this.notice = toSafePromptMessage(error);
                } finally {
                        this.chatAbort = null;
                        this.chatBusy = false;
                }
        }

        /** Requests a scene breakdown from the model; never invents scenes. */
        async createSceneBreakdown(): Promise<void> {
                await this.requestChatArtifact('breakdown');
        }

        /** Requests a shot list from the model. */
        async generateShotList(): Promise<void> {
                await this.requestChatArtifact('shotlist');
        }

        private async requestChatArtifact(task: 'breakdown' | 'shotlist'): Promise<void> {
                const projectId = this.activeProjectId;
                const source = (this.activeScene?.description || this.draft).trim();
                if (!projectId) return;
                if (!source) {
                        this.notice = 'Describe the scene or write a prompt first.';
                        return;
                }
                if (!this.promptModelConfigured) {
                        this.notice = VIDEO_STATUS.promptUnavailable;
                        return;
                }
                this.chatBusy = true;
                const controller = new AbortController();
                this.chatAbort = controller;
                try {
                        const result = await requestVideoPrompt(
                                {
                                        requestId: newId(),
                                        task,
                                        prompt: source,
                                        styleId: this.selectedStyleId,
                                        aspectRatio: this.aspectRatio,
                                        durationSeconds: this.durationSeconds,
                                        context: { projectId, sceneTitle: this.activeScene?.title }
                                },
                                controller.signal
                        );
                        const content =
                                task === 'breakdown'
                                        ? (result.scenes ?? [])
                                                        .map((s, i) => `${i + 1}. ${s.title} — ${s.description} (${s.durationSeconds}s)`)
                                                        .join('\n')
                                        : (result.shots ?? []).map((s, i) => `${i + 1}. ${s.text} (~${s.suggestedSeconds}s)`).join('\n');
                        await this.appendChat({
                                id: newId(),
                                ownerId: this.scope().workspaceId,
                                projectId,
                                role: 'assistant',
                                content,
                                kind: task === 'breakdown' ? 'breakdown' : 'shot-list',
                                originalPrompt: source,
                                createdAt: new Date().toISOString()
                        });
                } catch (error) {
                        this.notice = toSafePromptMessage(error);
                } finally {
                        this.chatAbort = null;
                        this.chatBusy = false;
                }
        }

        /**
         * Splits the current scene description into shots MECHANICALLY (on sentence
         * boundaries) and creates the shot records.
         *
         * This is a local text utility, labelled as such in the UI: it does not claim
         * a model produced the shot list.
         */
        async splitSceneIntoShots(): Promise<void> {
                const scene = this.activeScene;
                if (!scene) {
                        this.notice = 'Select a scene first.';
                        return;
                }
                const source = scene.description || this.draft;
                if (!source.trim()) {
                        this.notice = 'Write a scene description first.';
                        return;
                }
                const drafts = splitIntoShots(source, this.clipSeconds);
                for (const draft of drafts) {
                        await this.createShot(scene.id, {
                                title: `Shot ${draft.number}`,
                                prompt: draft.text,
                                targetDurationSeconds: Math.min(draft.suggestedSeconds, this.maxClipSeconds)
                        });
                }
                this.notice = `Created ${drafts.length} shots from the scene text (mechanical text split, not an AI shot list).`;
        }

        async savePrompt(title = ''): Promise<void> {
                const prompt = this.composedPrompt.trim();
                if (!prompt) {
                        this.notice = 'There is no prompt to save.';
                        return;
                }
                const projectId = this.activeProjectId;
                if (!projectId) return;
                const saved: SavedPrompt = {
                        id: newId(),
                        ownerId: this.scope().workspaceId,
                        projectId,
                        title: title.trim() || promptTitle(this.draft, this.selectedStyle),
                        prompt,
                        styleId: this.selectedStyleId,
                        createdAt: new Date().toISOString()
                };
                try {
                        await this.repository.createSavedPrompt(this.scope(), saved);
                } catch {
                        this.storageError = VIDEO_STATUS.storageUnavailable;
                        return;
                }
                this.savedPrompts = [saved, ...this.savedPrompts];
                this.notice = 'Prompt saved.';
        }

        async deleteSavedPrompt(id: string): Promise<void> {
                this.savedPrompts = this.savedPrompts.filter((p) => p.id !== id);
                try {
                        await this.repository.deleteSavedPrompt(this.scope(), id);
                } catch {
                        this.storageError = VIDEO_STATUS.storageUnavailable;
                }
        }

        /** Loads a saved prompt back into the composer. */
        reuseSavedPrompt(id: string): void {
                const saved = this.savedPrompts.find((p) => p.id === id);
                if (!saved) return;
                this.draft = saved.prompt;
                this.selectedStyleId = saved.styleId;
                this.notice = 'Saved prompt loaded into the composer.';
        }

        private async appendChat(message: ChatMessage): Promise<void> {
                this.chatMessages = [...this.chatMessages, message];
                try {
                        await this.repository.appendChatMessage(this.scope(), message);
                } catch {
                        this.storageError = VIDEO_STATUS.storageUnavailable;
                }
        }

        async clearChat(): Promise<void> {
                const ids = this.chatMessages.map((m) => m.id);
                this.chatMessages = [];
                for (const id of ids) {
                        try {
                                await this.repository.deleteChatMessage(this.scope(), id);
                        } catch {
                                /* non-fatal */
                        }
                }
                this.notice = 'Chat cleared.';
        }

        // --- Generation ---------------------------------------------------------

        /** Sends the composed prompt to the video generator (creates a job). */
        async sendToGenerator(): Promise<void> {
                await this.generate();
        }

        /**
         * Submits the composed prompt as a generation job.
         *
         * The prompt version and the job are persisted FIRST, so the prompt and the
         * plan survive a failure. With no service configured the job is recorded as
         * failed with an explicit reason and no asset is created.
         */
        async generate(): Promise<void> {
                if (this.generating) return;

                const projectId = this.activeProjectId;
                if (!projectId) {
                        this.notice = 'Open or create a project first.';
                        return;
                }

                const style = this.selectedStyle;
                const composed = composeVideoPrompt(this.draft, style, this.settingsSnapshot());
                const validation = validatePrompt(composed);
                if (!validation.ok) {
                        this.notice = validation.reason ?? 'The request is not valid.';
                        return;
                }

                const sceneId = this.activeSceneId;
                const shotId = this.activeShotId;

                // Persist the prompt version before anything else, so it is never lost.
                const version: PromptVersion = {
                        id: newId(),
                        ownerId: this.scope().workspaceId,
                        projectId,
                        targetKind: shotId ? 'shot' : sceneId ? 'scene' : 'project',
                        targetId: shotId ?? sceneId ?? projectId,
                        originalPrompt: this.draft.trim(),
                        composedPrompt: composed,
                        negativePrompt: this.negativePrompt.trim() || undefined,
                        styleId: this.selectedStyleId,
                        aspectRatio: this.aspectRatio,
                        resolution: this.resolution,
                        frameRate: this.frameRate,
                        targetDurationSeconds: this.durationSeconds,
                        settings: {
                                cameraMovement: this.cameraMovement || undefined,
                                lighting: this.lighting || undefined,
                                palette: this.palette || undefined,
                                audio: this.audioNotes || undefined,
                                references: this.referenceNote || undefined,
                                consistency: this.activeProject?.instructions || undefined,
                                negative: this.negativePrompt.trim() || undefined
                        },
                        createdAt: new Date().toISOString()
                };
                try {
                        await this.repository.createPromptVersion(this.scope(), version);
                        this.promptVersions = [version, ...this.promptVersions];
                } catch {
                        this.storageError = VIDEO_STATUS.storageUnavailable;
                }

                const key = buildIdempotencyKey({
                        projectId,
                        shotId,
                        sceneId,
                        promptVersionId: version.id,
                        requestedDurationSeconds: this.durationSeconds,
                        requestedResolution: this.resolution
                });

                // Idempotency: a refresh or double-click must not duplicate a job.
                try {
                        const existing = await this.repository.findJobByIdempotencyKey(this.scope(), key);
                        if (existing) {
                                this.notice = 'That exact request is already in the queue.';
                                this.activeJobId = existing.id;
                                return;
                        }
                } catch {
                        /* proceed; a duplicate check failure must not block the user */
                }

                const now = new Date().toISOString();
                const job: GenerationJob = {
                        id: newId(),
                        ownerId: this.scope().workspaceId,
                        projectId,
                        seriesId: this.activeSeriesId,
                        seasonId: this.activeSeasonId,
                        episodeId: this.activeEpisodeId,
                        moviePartId: this.activeMoviePartId,
                        sceneId,
                        shotId,
                        promptVersionId: version.id,
                        styleId: this.selectedStyleId,
                        pipeline: this.pipeline,
                        requestedDurationSeconds: this.durationSeconds,
                        requestedResolution: this.resolution,
                        requestedAspectRatio: this.aspectRatio,
                        requestedFrameRate: this.frameRate,
                        stage: 'queued',
                        progress: null,
                        priority: 0,
                        retryCount: 0,
                        maxRetries: DEFAULT_MAX_RETRIES,
                        idempotencyKey: key,
                        assetIds: [],
                        createdAt: now,
                        updatedAt: now
                };

                this.jobs = [job, ...this.jobs];

                if (!this.videoModelConfigured) {
                        job.stage = 'failed';
                        job.error = VIDEO_STATUS.notGenerated;
                        job.finishedAt = now;
                        this.jobs = this.jobs.map((j) => (j.id === job.id ? { ...job } : j));
                        this.stage = 'failed';
                        this.notice = VIDEO_STATUS.generationUnavailable;
                        try {
                                await this.repository.createJob(this.scope(), job);
                                await this.logJobEvent(job.id, 'failed', job.error);
                        } catch {
                                this.storageError = VIDEO_STATUS.storageUnavailable;
                        }
                        return;
                }

                try {
                        await this.repository.createJob(this.scope(), job);
                } catch {
                        this.storageError = VIDEO_STATUS.storageUnavailable;
                        this.notice = VIDEO_STATUS.saveFailed;
                        return;
                }
                await this.logJobEvent(job.id, 'queued', 'Submitted to the generation service.');
                await this.runGeneration(job, version);
        }

        /**
         * Runs one generation attempt for a job, streaming stage and output events.
         * Shared by generate, retry and re-run so those paths cannot drift apart.
         */
        private async runGeneration(job: GenerationJob, version: PromptVersion): Promise<void> {
                this.generating = true;
                this.stage = 'preparing';
                this.progress = null;
                this.activeJobId = job.id;

                const controller = new AbortController();
                this.abortController = controller;

                let cancelled = false;
                let failed = false;
                let streamError: string | null = null;

                try {
                        await generateVideo(
                                {
                                        requestId: newId(),
                                        projectId: job.projectId,
                                        promptVersionId: version.id,
                                        prompt: version.composedPrompt,
                                        negativePrompt: version.negativePrompt,
                                        styleId: job.styleId,
                                        durationSeconds: job.requestedDurationSeconds,
                                        resolution: job.requestedResolution,
                                        aspectRatio: job.requestedAspectRatio,
                                        frameRate: job.requestedFrameRate,
                                        pipeline: this.pipeline,
                                        settings: version.settings,
                                        idempotencyKey: job.idempotencyKey
                                },
                                {
                                        onEvent: (event) => this.applyGenerationEvent(job.id, event),
                                        onClose: (reason) => {
                                                cancelled = reason === 'aborted';
                                                failed = reason === 'error';
                                        }
                                },
                                controller.signal
                        );
                } catch (error) {
                        failed = true;
                        streamError = toSafeVideoMessage(error);
                } finally {
                        this.generating = false;
                        this.abortController = null;
                }

                await this.finaliseGeneration(job.id, { cancelled, failed, error: streamError });
        }

        private applyGenerationEvent(jobId: string, event: VideoGenerationEvent): void {
                const job = this.jobs.find((j) => j.id === jobId);
                if (!job) return;
                switch (event.type) {
                        case 'stage':
                                this.stage = mapStage(event.stage);
                                this.patchJob(jobId, { stage: event.stage, message: event.message });
                                void this.logJobEvent(jobId, event.stage, event.message ?? '');
                                break;
                        case 'progress':
                                this.progress = Math.max(0, Math.min(100, Math.round(event.percent)));
                                this.patchJob(jobId, { progress: this.progress });
                                break;
                        case 'output':
                                this.recordOutput(jobId, event.output);
                                break;
                        case 'done':
                                break;
                        case 'error':
                                this.patchJob(jobId, { error: event.message });
                                break;
                }
        }

        /** Records a real output as a media asset. Only a real URL is stored. */
        private recordOutput(jobId: string, output: { id: string; url: string; mimeType?: string; durationSeconds?: number; frameCount?: number; width?: number; height?: number; frameRate?: number; bytes?: number }): void {
                const job = this.jobs.find((j) => j.id === jobId);
                if (!job) return;
                const asset: MediaAsset = {
                        id: newId(),
                        ownerId: this.scope().workspaceId,
                        projectId: job.projectId,
                        sceneId: job.sceneId,
                        shotId: job.shotId,
                        folderId: this.activeFolderId,
                        kind: 'video',
                        name: this.assetName(job),
                        status: 'ready',
                        url: output.url,
                        mimeType: output.mimeType,
                        producedDurationSeconds: output.durationSeconds,
                        frameCount: output.frameCount,
                        width: output.width,
                        height: output.height,
                        frameRate: output.frameRate,
                        bytes: output.bytes,
                        promptVersionId: job.promptVersionId,
                        styleId: job.styleId,
                        approved: false,
                        draft: false,
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString()
                };
                this.assets = [...this.assets, asset];
                this.patchJob(jobId, { assetIds: [...job.assetIds, asset.id] });
                void this.persistAsset(asset);
        }

        private assetName(job: GenerationJob): string {
                const shot = this.shots.find((s) => s.id === job.shotId);
                const scene = this.scenes.find((s) => s.id === job.sceneId);
                if (shot) return `Shot ${shot.number} — ${shot.title}`;
                if (scene) return `Scene ${scene.number} — ${scene.title}`;
                return `Clip ${new Date(job.createdAt).toLocaleString()}`;
        }

        private async persistAsset(asset: MediaAsset): Promise<void> {
                try {
                        await this.repository.createAsset(this.scope(), asset);
                } catch {
                        this.storageError = VIDEO_STATUS.storageUnavailable;
                }
        }

        /**
         * Finalises a job after its stream ends.
         *
         * A stream that closed cleanly but produced nothing is still a failure: no
         * output is invented to cover the gap.
         */
        private async finaliseGeneration(
                jobId: string,
                result: { cancelled: boolean; failed: boolean; error: string | null }
        ): Promise<void> {
                const job = this.jobs.find((j) => j.id === jobId);
                if (!job) return;
                const produced = job.assetIds.length > 0;
                const stage: JobStage = result.cancelled ? 'cancelled' : result.failed || !produced ? 'failed' : 'completed';
                const errorText =
                        stage === 'failed'
                                ? (result.error ??
                                        (produced ? 'Some outputs were not returned. The completed clips were kept.' : 'No output was returned. The service may be unavailable. Please retry.'))
                                : undefined;

                this.patchJob(jobId, {
                        stage,
                        progress: stage === 'completed' ? 100 : null,
                        error: errorText,
                        finishedAt: new Date().toISOString()
                });
                this.stage = mapStage(stage);
                this.progress = null;
                if (errorText) this.notice = errorText;

                await this.logJobEvent(jobId, stage, errorText ?? (stage === 'completed' ? 'Completed.' : ''));

                const updated = this.jobs.find((j) => j.id === jobId);
                if (updated) {
                        try {
                                await this.repository.updateJob(this.scope(), jobId, {
                                        stage: updated.stage,
                                        progress: updated.progress,
                                        error: updated.error,
                                        finishedAt: updated.finishedAt
                                });
                        } catch {
                                this.storageError = VIDEO_STATUS.storageUnavailable;
                        }
                }
        }

        /** Updates a job in state only; persistence happens at the stage boundary. */
        private patchJob(id: string, patch: Partial<GenerationJob>): void {
                this.jobs = this.jobs.map((j) => (j.id === id ? { ...j, ...patch, updatedAt: new Date().toISOString() } : j));
        }

        private async logJobEvent(jobId: string, stage: JobStage, message: string): Promise<void> {
                const event: GenerationJobEvent = {
                        id: newId(),
                        jobId,
                        stage,
                        message,
                        progress: this.progress,
                        createdAt: new Date().toISOString()
                };
                this.jobEvents = [...this.jobEvents, event];
                try {
                        await this.repository.appendJobEvent(this.scope(), event);
                } catch {
                        /* per-stage logging is best-effort */
                }
        }

        /** Stops the active generation and records the cancelled state honestly. */
        stopGeneration(): void {
                if (!this.generating || !this.abortController) return;
                this.abortController.abort();
                this.abortController = null;
                this.generating = false;
        }

        /**
         * Retries a failed or cancelled job.
         *
         * Refuses to retry a job that already produced output, so a retry cannot
         * duplicate a completed render.
         */
        async retryJob(jobId: string): Promise<void> {
                const job = this.jobs.find((j) => j.id === jobId);
                if (!job) return;
                const decision = shouldRetry(job);
                if (!decision.ok) {
                        this.notice = decision.reason ?? 'That job cannot be retried.';
                        return;
                }
                const version = this.promptVersions.find((v) => v.id === job.promptVersionId);
                if (!version) {
                        this.notice = 'The prompt version for this job is no longer available.';
                        return;
                }
                this.patchJob(jobId, { stage: 'queued', retryCount: decision.retryCount ?? job.retryCount + 1, error: undefined });
                await this.logJobEvent(jobId, 'queued', `Retry ${decision.retryCount}.`);

                if (!this.videoModelConfigured) {
                        this.patchJob(jobId, { stage: 'failed', error: VIDEO_STATUS.notGenerated });
                        this.notice = VIDEO_STATUS.generationUnavailable;
                        return;
                }
                await this.runGeneration(this.jobs.find((j) => j.id === jobId)!, version);
        }

        /** Runs an existing draft/queued job (re-submits it deliberately). */
        async runJob(jobId: string): Promise<void> {
                const job = this.jobs.find((j) => j.id === jobId);
                if (!job) return;
                if (job.assetIds.length > 0) {
                        this.notice = 'That job already produced an output. Re-run the shot for a new take.';
                        return;
                }
                const version = this.promptVersions.find((v) => v.id === job.promptVersionId);
                if (!version) {
                        this.notice = 'The prompt version for this job is no longer available.';
                        return;
                }
                if (!this.videoModelConfigured) {
                        this.patchJob(jobId, { stage: 'failed', error: VIDEO_STATUS.notGenerated });
                        this.notice = VIDEO_STATUS.generationUnavailable;
                        return;
                }
                this.patchJob(jobId, { stage: 'queued', error: undefined });
                await this.runGeneration(this.jobs.find((j) => j.id === jobId)!, version);
        }

        /** Cancels a queued or running job. */
        cancelJob(jobId: string): void {
                const job = this.jobs.find((j) => j.id === jobId);
                if (!job || !canCancelJob(job)) return;
                if (this.activeJobId === jobId) {
                        this.stopGeneration();
                }
                this.patchJob(jobId, { stage: 'cancelled', finishedAt: new Date().toISOString() });
                void this.logJobEvent(jobId, 'cancelled', 'Cancelled by the user.');
        }

        /** Removes a job record from the queue (its outputs are kept). */
        async deleteJob(jobId: string): Promise<void> {
                this.jobs = this.jobs.filter((j) => j.id !== jobId);
                this.jobEvents = this.jobEvents.filter((e) => e.jobId !== jobId);
                try {
                        await this.repository.deleteJob(this.scope(), jobId);
                } catch {
                        this.storageError = VIDEO_STATUS.storageUnavailable;
                }
        }

        /** Marks a clip as the approved take for its shot. */
        async approveAsset(assetId: string): Promise<void> {
                const asset = this.assets.find((a) => a.id === assetId);
                if (!asset) return;
                // Only one approved take per shot.
                this.assets = this.assets.map((a) =>
                        a.shotId && a.shotId === asset.shotId ? { ...a, approved: a.id === assetId } : a
                );
                try {
                        await this.repository.updateAsset(this.scope(), assetId, { approved: true });
                } catch {
                        this.storageError = VIDEO_STATUS.storageUnavailable;
                }
                await this.recordAudit('asset.approve', 'asset', assetId, asset.name);
        }

        async toggleAssetDraft(assetId: string): Promise<void> {
                const asset = this.assets.find((a) => a.id === assetId);
                if (!asset) return;
                const draft = !asset.draft;
                this.assets = this.assets.map((a) => (a.id === assetId ? { ...a, draft } : a));
                try {
                        await this.repository.updateAsset(this.scope(), assetId, { draft });
                } catch {
                        this.storageError = VIDEO_STATUS.storageUnavailable;
                }
        }

        async deleteAsset(assetId: string): Promise<void> {
                this.assets = this.assets.filter((a) => a.id !== assetId);
                try {
                        await this.repository.deleteAsset(this.scope(), assetId);
                        await this.recordAudit('asset.delete', 'asset', assetId, '');
                } catch {
                        this.storageError = VIDEO_STATUS.storageUnavailable;
                }
        }

        async renameAsset(assetId: string, name: string): Promise<void> {
                const clean = name.replace(/\s+/g, ' ').trim();
                if (!clean) return;
                this.assets = this.assets.map((a) => (a.id === assetId ? { ...a, name: clean } : a));
                try {
                        await this.repository.updateAsset(this.scope(), assetId, { name: clean });
                } catch {
                        this.storageError = VIDEO_STATUS.storageUnavailable;
                }
        }

        // --- References / continuity -------------------------------------------

        async createReference(input: Partial<ProjectReference> & { name: string }): Promise<string | null> {
                const projectId = this.activeProjectId;
                if (!projectId) return null;
                const now = new Date().toISOString();
                const reference: ProjectReference = {
                        id: newId(),
                        ownerId: this.scope().workspaceId,
                        projectId,
                        kind: input.kind ?? 'character',
                        name: input.name.trim() || 'Untitled reference',
                        description: input.description ?? '',
                        rules: input.rules ?? '',
                        assetId: input.assetId ?? null,
                        createdAt: now,
                        updatedAt: now
                };
                try {
                        await this.repository.createReference(this.scope(), reference);
                } catch {
                        this.storageError = VIDEO_STATUS.storageUnavailable;
                        return null;
                }
                this.references = [...this.references, reference];
                if (reference.kind === 'character') {
                        const character: CharacterReference = {
                                id: newId(),
                                ownerId: this.scope().workspaceId,
                                projectId,
                                referenceId: reference.id,
                                characterId: newId(),
                                name: reference.name,
                                appearance: reference.description,
                                costume: '',
                                consistencyNotes: reference.rules,
                                createdAt: now,
                                updatedAt: now
                        };
                        try {
                                await this.repository.createCharacter(this.scope(), character);
                                this.characters = [...this.characters, character];
                        } catch {
                                /* non-fatal */
                        }
                }
                await this.recordAudit('reference.create', 'reference', reference.id, reference.name);
                return reference.id;
        }

        async updateReference(id: string, patch: Partial<ProjectReference>): Promise<void> {
                await this.patchEntity('reference', id, patch);
        }

        async deleteReference(id: string): Promise<void> {
                this.references = this.references.filter((r) => r.id !== id);
                this.characters = this.characters.filter((c) => c.referenceId !== id);
                try {
                        await this.repository.deleteReference(this.scope(), id);
                } catch {
                        this.storageError = VIDEO_STATUS.storageUnavailable;
                }
        }

        async updateCharacter(id: string, patch: Partial<CharacterReference>): Promise<void> {
                await this.patchEntity('character', id, patch);
        }

        /** Sets an attached reference file's accepted state (metadata only). */
        setReferenceAssets(files: AttachedReference[]): void {
                this.referenceAssets = files;
        }

        removeReferenceAsset(id: string): void {
                this.referenceAssets = this.referenceAssets.filter((f) => f.id !== id);
        }

        // --- Generic entity patch ----------------------------------------------

        /**
         * Patches one of the flat entity lists optimistically and persists it.
         * Used by the simple entities whose edits are a single field group.
         */
        private async patchEntity(
                kind: 'series' | 'season' | 'episode' | 'moviePart' | 'scene' | 'shot' | 'reference' | 'character',
                id: string,
                patch: object
        ): Promise<void> {
                const now = new Date().toISOString();
                switch (kind) {
                        case 'series': {
                                this.series = this.series.map((x) => (x.id === id ? { ...x, ...patch, updatedAt: now } : x));
                                await this.safe(() => this.repository.updateSeries(this.scope(), id, patch));
                                break;
                        }
                        case 'season': {
                                this.seasons = this.seasons.map((x) => (x.id === id ? { ...x, ...patch, updatedAt: now } : x));
                                await this.safe(() => this.repository.updateSeason(this.scope(), id, patch));
                                break;
                        }
                        case 'episode': {
                                this.episodes = this.episodes.map((x) => (x.id === id ? { ...x, ...patch, updatedAt: now } : x));
                                await this.safe(() => this.repository.updateEpisode(this.scope(), id, patch));
                                break;
                        }
                        case 'moviePart': {
                                this.movieParts = this.movieParts.map((x) => (x.id === id ? { ...x, ...patch, updatedAt: now } : x));
                                await this.safe(() => this.repository.updateMoviePart(this.scope(), id, patch));
                                break;
                        }
                        case 'scene': {
                                this.scenes = this.scenes.map((x) => (x.id === id ? { ...x, ...patch, updatedAt: now } : x));
                                await this.safe(() => this.repository.updateScene(this.scope(), id, patch));
                                break;
                        }
                        case 'shot': {
                                this.shots = this.shots.map((x) => (x.id === id ? { ...x, ...patch, updatedAt: now } : x));
                                await this.safe(() => this.repository.updateShot(this.scope(), id, patch));
                                break;
                        }
                        case 'reference': {
                                this.references = this.references.map((x) => (x.id === id ? { ...x, ...patch, updatedAt: now } : x));
                                await this.safe(() => this.repository.updateReference(this.scope(), id, patch));
                                break;
                        }
                        case 'character': {
                                this.characters = this.characters.map((x) => (x.id === id ? { ...x, ...patch, updatedAt: now } : x));
                                await this.safe(() => this.repository.updateCharacter(this.scope(), id, patch));
                                break;
                        }
                }
        }

        private async safe(action: () => Promise<unknown>): Promise<void> {
                try {
                        await action();
                } catch {
                        this.storageError = VIDEO_STATUS.storageUnavailable;
                }
        }

        // --- Export / assembly --------------------------------------------------

        /**
         * Records an export request. The metadata (JSON) export is the only format
         * genuinely implemented locally; every video container requires the encoding
         * worker, so it is reported as unavailable rather than appearing to succeed.
         */
        async requestExport(assetId: string, format: string): Promise<void> {
                const projectId = this.activeProjectId;
                if (!projectId) return;
                const request: import('./types').ExportJob = {
                        id: newId(),
                        ownerId: this.scope().workspaceId,
                        projectId,
                        assetId,
                        format,
                        stage: format === 'metadata-json' ? 'completed' : 'failed',
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString(),
                        error: format === 'metadata-json' ? undefined : VIDEO_STATUS.exportUnavailable
                };
                try {
                        await this.repository.createExportJob(this.scope(), request);
                } catch {
                        this.storageError = VIDEO_STATUS.storageUnavailable;
                }
                if (format !== 'metadata-json') this.notice = VIDEO_STATUS.exportUnavailable;
                await this.recordAudit('export.request', 'asset', assetId, format);
        }

        /** Releases in-flight work when the workspace is torn down. */
        dispose(): void {
                this.abortController?.abort();
                this.chatAbort?.abort();
        }
}

function mapStage(stage: JobStage): ComposerStage {
        switch (stage) {
                case 'preparing':
                case 'validating':
                        return 'preparing';
                case 'queued':
                        return 'queued';
                case 'generating':
                case 'upscaling':
                case 'encoding':
                case 'quality-checking':
                        return 'generating';
                case 'completed':
                        return 'completed';
                case 'failed':
                        return 'failed';
                case 'cancelled':
                        return 'cancelled';
                default:
                        return 'idle';
        }
}

export const videos = new VideosState();


