/**
 * Persistence boundary for the Videos module.
 *
 * Components and state never touch storage directly: they call a
 * `VideoRepository`. Today the only live implementation is browser-local; when
 * Supabase is configured a `supabaseVideoRepository.ts` becomes the implementation
 * and the rest of the module is unchanged. Keeping this interface narrow is what
 * makes that swap safe.
 *
 * Every method is scoped by `WorkspaceScope`, so an implementation is forced to
 * consider ownership rather than returning a global bag of records. Server-side
 * authorization (Supabase RLS, enforced by the migration) remains the real
 * enforcement point — the scope passed here echoes the authenticated identity and
 * is never a substitute for it.
 *
 * The interface is deliberately split by entity so a server implementation can map
 * each group onto its own table with server-side filtering and paging. Large media
 * files never pass through here: `MediaAsset.url` is a reference, and the migration
 * stores bytes in object storage, not in the database.
 */

import type {
        AuditEvent,
        CharacterReference,
        ChatMessage,
        Episode,
        ExportJob,
        Folder,
        GenerationJob,
        GenerationJobEvent,
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
        Shot
} from '../types';
import type { WorkspaceScope } from '#lib/shared/scope';

/** A page of results, for paged list reads. */
export interface Page<T> {
        items: T[];
        /** Opaque cursor for the next page, or null when the end is reached. */
        nextCursor: string | null;
        /** Total matching rows, when the backend can report it cheaply. */
        total?: number;
}

export interface VideoRepository {
        /** Short label for the storage backend, shown in the honest storage notice. */
        readonly label: string;
        /** Whether records survive a reload. */
        readonly persistent: boolean;
        /** Whether records may be visible to more than one person. */
        readonly shared: boolean;

        // --- Projects ---
        listProjects(scope: WorkspaceScope): Promise<Project[]>;
        getProject(scope: WorkspaceScope, id: string): Promise<Project | null>;
        createProject(scope: WorkspaceScope, project: Project): Promise<Project>;
        updateProject(scope: WorkspaceScope, id: string, patch: ProjectPatch): Promise<Project | null>;
        deleteProject(scope: WorkspaceScope, id: string): Promise<void>;

        // --- Folders ---
        listFolders(scope: WorkspaceScope, projectId?: string | null): Promise<Folder[]>;
        createFolder(scope: WorkspaceScope, folder: Folder): Promise<Folder>;
        updateFolder(scope: WorkspaceScope, id: string, patch: Partial<Folder>): Promise<Folder | null>;
        deleteFolder(scope: WorkspaceScope, id: string, cascade: boolean): Promise<void>;

        // --- Series / seasons / episodes ---
        listSeries(scope: WorkspaceScope, projectId: string): Promise<Series[]>;
        createSeries(scope: WorkspaceScope, series: Series): Promise<Series>;
        updateSeries(scope: WorkspaceScope, id: string, patch: Partial<Series>): Promise<Series | null>;
        deleteSeries(scope: WorkspaceScope, id: string): Promise<void>;

        listSeasons(scope: WorkspaceScope, seriesId: string): Promise<Season[]>;
        createSeason(scope: WorkspaceScope, season: Season): Promise<Season>;
        updateSeason(scope: WorkspaceScope, id: string, patch: Partial<Season>): Promise<Season | null>;
        deleteSeason(scope: WorkspaceScope, id: string): Promise<void>;

        listEpisodes(scope: WorkspaceScope, seasonId: string): Promise<Episode[]>;
        createEpisode(scope: WorkspaceScope, episode: Episode): Promise<Episode>;
        updateEpisode(scope: WorkspaceScope, id: string, patch: Partial<Episode>): Promise<Episode | null>;
        deleteEpisode(scope: WorkspaceScope, id: string): Promise<void>;

        // --- Movie parts ---
        listMovieParts(scope: WorkspaceScope, projectId: string): Promise<MoviePart[]>;
        createMoviePart(scope: WorkspaceScope, part: MoviePart): Promise<MoviePart>;
        updateMoviePart(scope: WorkspaceScope, id: string, patch: Partial<MoviePart>): Promise<MoviePart | null>;
        deleteMoviePart(scope: WorkspaceScope, id: string): Promise<void>;

        // --- Scenes / shots ---
        listScenes(scope: WorkspaceScope, projectId: string): Promise<Scene[]>;
        createScene(scope: WorkspaceScope, scene: Scene): Promise<Scene>;
        updateScene(scope: WorkspaceScope, id: string, patch: Partial<Scene>): Promise<Scene | null>;
        deleteScene(scope: WorkspaceScope, id: string): Promise<void>;

        listShots(scope: WorkspaceScope, sceneId: string): Promise<Shot[]>;
        createShot(scope: WorkspaceScope, shot: Shot): Promise<Shot>;
        updateShot(scope: WorkspaceScope, id: string, patch: Partial<Shot>): Promise<Shot | null>;
        deleteShot(scope: WorkspaceScope, id: string): Promise<void>;

        // --- Media assets (clips and references) ---
        listAssets(scope: WorkspaceScope, projectId: string): Promise<MediaAsset[]>;
        listAssetsPaged(scope: WorkspaceScope, projectId: string, cursor: string | null, limit: number): Promise<Page<MediaAsset>>;
        createAsset(scope: WorkspaceScope, asset: MediaAsset): Promise<MediaAsset>;
        updateAsset(scope: WorkspaceScope, id: string, patch: Partial<MediaAsset>): Promise<MediaAsset | null>;
        deleteAsset(scope: WorkspaceScope, id: string): Promise<void>;

        // --- Prompt versions ---
        listPromptVersions(scope: WorkspaceScope, projectId: string): Promise<PromptVersion[]>;
        createPromptVersion(scope: WorkspaceScope, version: PromptVersion): Promise<PromptVersion>;

        // --- Generation jobs / events ---
        listJobs(scope: WorkspaceScope, projectId: string): Promise<GenerationJob[]>;
        createJob(scope: WorkspaceScope, job: GenerationJob): Promise<GenerationJob>;
        updateJob(scope: WorkspaceScope, id: string, patch: Partial<GenerationJob>): Promise<GenerationJob | null>;
        deleteJob(scope: WorkspaceScope, id: string): Promise<void>;
        findJobByIdempotencyKey(scope: WorkspaceScope, key: string): Promise<GenerationJob | null>;
        listJobEvents(scope: WorkspaceScope, jobId: string): Promise<GenerationJobEvent[]>;
        appendJobEvent(scope: WorkspaceScope, event: GenerationJobEvent): Promise<GenerationJobEvent>;

        // --- Render / export jobs ---
        listRenderJobs(scope: WorkspaceScope, projectId: string): Promise<RenderJob[]>;
        createRenderJob(scope: WorkspaceScope, job: RenderJob): Promise<RenderJob>;
        updateRenderJob(scope: WorkspaceScope, id: string, patch: Partial<RenderJob>): Promise<RenderJob | null>;

        listExportJobs(scope: WorkspaceScope, projectId: string): Promise<ExportJob[]>;
        createExportJob(scope: WorkspaceScope, job: ExportJob): Promise<ExportJob>;
        updateExportJob(scope: WorkspaceScope, id: string, patch: Partial<ExportJob>): Promise<ExportJob | null>;

        // --- References ---
        listReferences(scope: WorkspaceScope, projectId: string): Promise<ProjectReference[]>;
        createReference(scope: WorkspaceScope, reference: ProjectReference): Promise<ProjectReference>;
        updateReference(scope: WorkspaceScope, id: string, patch: Partial<ProjectReference>): Promise<ProjectReference | null>;
        deleteReference(scope: WorkspaceScope, id: string): Promise<void>;

        listCharacters(scope: WorkspaceScope, projectId: string): Promise<CharacterReference[]>;
        createCharacter(scope: WorkspaceScope, character: CharacterReference): Promise<CharacterReference>;
        updateCharacter(scope: WorkspaceScope, id: string, patch: Partial<CharacterReference>): Promise<CharacterReference | null>;
        deleteCharacter(scope: WorkspaceScope, id: string): Promise<void>;

        // --- Prompt chat ---
        listChatMessages(scope: WorkspaceScope, projectId: string): Promise<ChatMessage[]>;
        appendChatMessage(scope: WorkspaceScope, message: ChatMessage): Promise<ChatMessage>;
        deleteChatMessage(scope: WorkspaceScope, id: string): Promise<void>;

        listSavedPrompts(scope: WorkspaceScope, projectId: string): Promise<SavedPrompt[]>;
        createSavedPrompt(scope: WorkspaceScope, prompt: SavedPrompt): Promise<SavedPrompt>;
        deleteSavedPrompt(scope: WorkspaceScope, id: string): Promise<void>;

        // --- Sharing / audit ---
        listSharingPermissions(scope: WorkspaceScope): Promise<SharingPermission[]>;
        createSharingPermission(scope: WorkspaceScope, permission: SharingPermission): Promise<SharingPermission>;
        deleteSharingPermission(scope: WorkspaceScope, id: string): Promise<void>;

        listAuditEvents(scope: WorkspaceScope, limit?: number): Promise<AuditEvent[]>;
        appendAuditEvent(scope: WorkspaceScope, event: AuditEvent): Promise<AuditEvent>;
}
