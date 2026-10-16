/**
 * Data contracts for the ARTI AI Videos module.
 *
 * These types are the single description of a video production: projects, the
 * recursive folder tree, series/seasons/episodes, movies/parts, scenes, shots,
 * clips (media assets), prompt versions, generation jobs, references and exports.
 * Persistence, services and components all import them from here, so the schema
 * exists in exactly one place.
 *
 * Two distinctions are kept throughout, because collapsing them would make the UI
 * lie:
 *
 *  1. A **planned** duration/size (what the user asked for) is separate from a
 *     **realised** one (what the backend actually produced). `GenerationJob`
 *     carries the requested values; `MediaAsset` carries the measured ones.
 *  2. A clip's `url` is only ever populated from a value the generation service
 *     actually returned. No placeholder is ever promoted into a real asset.
 */

import type { WorkspaceScope } from '#lib/shared/scope';

export type { WorkspaceScope };

/** What kind of production a project is. Helps the UI choose the right editor. */
export type ProjectKind = 'project' | 'series' | 'movie' | 'short' | 'collection';

// --- Folders ---------------------------------------------------------------

/**
 * A folder in the recursive production tree.
 *
 * `parentId` is null for a root folder. Depth is unbounded by the model; cycle
 * prevention is enforced in `tree.ts` (and by the database in the migration).
 */
export interface Folder {
        id: string;
        ownerId: string;
        /** Owning project, or null for a folder not yet placed in a project. */
        projectId: string | null;
        parentId: string | null;
        name: string;
        /** Sibling ordering key; lower sorts first. */
        order: number;
        pinned: boolean;
        archived: boolean;
        createdAt: string;
        updatedAt: string;
}

// --- Projects --------------------------------------------------------------

export interface Project {
        id: string;
        ownerId: string;
        name: string;
        kind: ProjectKind;
        description: string;
        /** Folder this project currently sits in, or null for the root. */
        folderId: string | null;
        /** Aspect ratio id from `formats.ts`, used as the project default. */
        defaultAspectRatio: string;
        /** Resolution id from `formats.ts`. */
        defaultResolution: string;
        defaultFrameRate: number;
        /** Shared style catalogue id, or null. */
        defaultStyleId: string | null;
        language: string;
        audioPreferences: AudioPreferences;
        /** Free-form production instructions kept with the project. */
        instructions: string;
        /** Reference to a cover media asset id, or null. */
        coverAssetId: string | null;
        pinned: boolean;
        archived: boolean;
        createdAt: string;
        updatedAt: string;
}

/** Project-level audio and voice preferences. */
export interface AudioPreferences {
        dialogue: boolean;
        narration: boolean;
        voiceOver: boolean;
        music: boolean;
        soundEffects: boolean;
        ambient: boolean;
        /** Language id for generated speech; empty until audio is configured. */
        language: string;
        /** Subtitle language id; empty when subtitles are not requested. */
        subtitleLanguage: string;
        muted: boolean;
}

export interface ProjectPatch {
        name?: string;
        description?: string;
        folderId?: string | null;
        defaultAspectRatio?: string;
        defaultResolution?: string;
        defaultFrameRate?: number;
        defaultStyleId?: string | null;
        language?: string;
        audioPreferences?: AudioPreferences;
        instructions?: string;
        coverAssetId?: string | null;
        pinned?: boolean;
        archived?: boolean;
}

// --- Series / seasons / episodes -------------------------------------------

export interface Series {
        id: string;
        ownerId: string;
        projectId: string;
        title: string;
        description: string;
        genre: string;
        /** Story premise carried across seasons. */
        premise: string;
        audience: string;
        language: string;
        tone: string;
        styleId: string | null;
        aspectRatio: string;
        frameRate: number;
        continuityRules: string;
        audioPreferences: AudioPreferences;
        /** Optional targets; deliberately not required to begin. */
        targetSeasons: number | null;
        targetEpisodes: number | null;
        createdAt: string;
        updatedAt: string;
}

export interface Season {
        id: string;
        ownerId: string;
        seriesId: string;
        number: number;
        title: string;
        description: string;
        /** Story arc for the season. */
        arc: string;
        notes: string;
        coverAssetId: string | null;
        pinned: boolean;
        createdAt: string;
        updatedAt: string;
}

export interface Episode {
        id: string;
        ownerId: string;
        seriesId: string;
        seasonId: string;
        number: number;
        title: string;
        synopsis: string;
        script: string;
        /** Target duration in seconds for the finished episode. */
        targetDurationSeconds: number | null;
        notes: string;
        createdAt: string;
        updatedAt: string;
}

// --- Movies ----------------------------------------------------------------

export interface MoviePart {
        id: string;
        ownerId: string;
        projectId: string;
        number: number;
        title: string;
        synopsis: string;
        script: string;
        targetDurationSeconds: number | null;
        notes: string;
        createdAt: string;
        updatedAt: string;
}

// --- Scenes and shots ------------------------------------------------------

/** A scene belongs to exactly one parent production unit. */
export interface Scene {
        id: string;
        ownerId: string;
        projectId: string;
        /** Parent: an episode, a movie part, or a project for a standalone film. */
        parentKind: 'episode' | 'movie-part' | 'project';
        parentId: string;
        number: number;
        title: string;
        /** What happens in the scene. */
        description: string;
        /** Target duration in seconds. */
        targetDurationSeconds: number | null;
        notes: string;
        createdAt: string;
        updatedAt: string;
}

export interface Shot {
        id: string;
        ownerId: string;
        sceneId: string;
        number: number;
        title: string;
        /** The generation prompt for this shot. */
        prompt: string;
        styleId: string | null;
        aspectRatio: string;
        resolution: string;
        frameRate: number;
        /** Target duration in seconds (a shot is typically a few seconds). */
        targetDurationSeconds: number;
        cameraMovement: string;
        notes: string;
        createdAt: string;
        updatedAt: string;
}

// --- Media assets (clips) --------------------------------------------------

export type AssetStatus = 'generating' | 'ready' | 'failed' | 'cancelled' | 'draft';

/**
 * A media asset is a real file the generation service or an upload produced.
 *
 * `url` is absent until a real file exists. `producedDurationSeconds` and the
 * pixel fields are MEASURED values, distinct from anything the user requested.
 */
export interface MediaAsset {
        id: string;
        ownerId: string;
        projectId: string;
        /** Placement in the tree. */
        sceneId: string | null;
        shotId: string | null;
        /** Folder the asset is filed under. */
        folderId: string | null;
        kind: 'video' | 'image' | 'audio' | 'subtitle' | 'document';
        name: string;
        status: AssetStatus;
        /** Real URL returned by the service. Never a placeholder. */
        url?: string;
        mimeType?: string;
        /** Measured duration in seconds, when the media was inspected. */
        producedDurationSeconds?: number;
        /** Measured frame count. */
        frameCount?: number;
        /** Measured pixel dimensions of the final encoded file. */
        width?: number;
        height?: number;
        frameRate?: number;
        /** Byte size of the final file, when known. */
        bytes?: number;
        /** The prompt version used to produce this asset. */
        promptVersionId?: string;
        styleId?: string | null;
        /** Whether this is the approved/final take for its shot. */
        approved: boolean;
        draft: boolean;
        createdAt: string;
        updatedAt: string;
        /** User-safe failure text; never a raw server exception. */
        error?: string;
}

// --- Prompt versions -------------------------------------------------------

/**
 * One immutable version of a prompt. Edits create a new version rather than
 * overwriting the previous one, so an approved prompt can never be silently lost.
 */
export interface PromptVersion {
        id: string;
        ownerId: string;
        projectId: string;
        /** What the prompt belongs to: a shot, a scene, an episode, or a chat turn. */
        targetKind: 'shot' | 'scene' | 'episode' | 'movie-part' | 'project' | 'chat';
        targetId: string;
        /** The prompt as the user wrote it, before style guidance. */
        originalPrompt: string;
        /** The composed prompt actually sent (subject plus style guidance). */
        composedPrompt: string;
        negativePrompt?: string;
        styleId: string | null;
        aspectRatio: string;
        resolution: string;
        frameRate: number;
        targetDurationSeconds: number;
        /** Settings snapshot, so a version is reproducible. */
        settings?: PromptSettings;
        note?: string;
        createdAt: string;
}

/** Video-generation controls captured with a prompt version. */
export interface PromptSettings {
        cameraMovement?: string;
        lighting?: string;
        palette?: string;
        audio?: string;
        references?: string;
        consistency?: string;
        negative?: string;
}

// --- Generation jobs -------------------------------------------------------

/**
 * The generation lifecycle. Stage-based, because a percentage is only shown when
 * the backend actually reports one.
 */
export type JobStage =
        | 'draft'
        | 'validating'
        | 'queued'
        | 'preparing'
        | 'generating'
        | 'upscaling'
        | 'encoding'
        | 'quality-checking'
        | 'completed'
        | 'failed'
        | 'cancelled';

export interface GenerationJob {
        id: string;
        ownerId: string;
        projectId: string;
        /** Placement references, any of which may be null for a loose clip. */
        seriesId: string | null;
        seasonId: string | null;
        episodeId: string | null;
        moviePartId: string | null;
        sceneId: string | null;
        shotId: string | null;
        /** The prompt version this job will render. */
        promptVersionId: string;
        styleId: string | null;
        /** Pipeline/model identifier, or empty while none is configured. */
        pipeline: string;
        /** Requested output — what the user asked for, not what was produced. */
        requestedDurationSeconds: number;
        requestedResolution: string;
        requestedAspectRatio: string;
        requestedFrameRate: number;
        stage: JobStage;
        /** Progress 0–100 when the backend reports it, else null. */
        progress: number | null;
        priority: number;
        retryCount: number;
        maxRetries: number;
        /** Idempotency key so a refresh cannot duplicate a job. */
        idempotencyKey: string;
        /** Media assets this job has produced so far. */
        assetIds: string[];
        createdAt: string;
        updatedAt: string;
        startedAt?: string;
        finishedAt?: string;
        /** User-safe stage message. */
        message?: string;
        error?: string;
}

/** One structured event in a job's history, for the per-stage log. */
export interface GenerationJobEvent {
        id: string;
        jobId: string;
        stage: JobStage;
        message: string;
        /** Progress at the time of the event, when known. */
        progress: number | null;
        createdAt: string;
}

// --- Render / assembly -----------------------------------------------------

/** An assembly job that combines completed clips into a longer production. */
export interface RenderJob {
        id: string;
        ownerId: string;
        projectId: string;
        /** What is being assembled. */
        targetKind: 'scene' | 'episode' | 'movie-part' | 'project' | 'season';
        targetId: string;
        /** Media asset ids in timeline order. */
        assetIds: string[];
        stage: JobStage;
        progress: number | null;
        createdAt: string;
        updatedAt: string;
        /** Output asset once assembly completes. */
        outputAssetId?: string;
        error?: string;
}

// --- References & continuity ----------------------------------------------

/** A reusable reference attached to a project (character, environment, prop). */
export interface ProjectReference {
        id: string;
        ownerId: string;
        projectId: string;
        kind: 'character' | 'environment' | 'prop' | 'style' | 'other';
        /** Display name, e.g. the character's name. */
        name: string;
        description: string;
        /** Costume/appearance or environment rules the model should honour. */
        rules: string;
        /** Media asset used as the visual reference, or null. */
        assetId: string | null;
        createdAt: string;
        updatedAt: string;
}

/**
 * A character reference with its own stable id, so episodes/scenes can inherit
 * exactly the approved character without copying free text around.
 */
export interface CharacterReference {
        id: string;
        ownerId: string;
        projectId: string;
        referenceId: string;
        characterId: string;
        name: string;
        appearance: string;
        costume: string;
        consistencyNotes: string;
        createdAt: string;
        updatedAt: string;
}

// --- Exports ---------------------------------------------------------------

/** A requested export of a produced asset. */
export interface ExportJob {
        id: string;
        ownerId: string;
        projectId: string;
        /** The media asset being exported. */
        assetId: string;
        /** Requested container/codec id from `formats.ts`. */
        format: string;
        stage: JobStage;
        createdAt: string;
        updatedAt: string;
        outputAssetId?: string;
        error?: string;
}

// --- Sharing ---------------------------------------------------------------

export type ShareLevel = 'view' | 'edit';

/** An explicit share grant on a project or folder. */
export interface SharingPermission {
        id: string;
        ownerId: string;
        /** What is shared. */
        targetKind: 'project' | 'folder' | 'series' | 'season' | 'episode' | 'asset';
        targetId: string;
        /** Who the grant is for. Null while no real account system exists. */
        granteeId: string | null;
        level: ShareLevel;
        createdAt: string;
}

// --- Audit -----------------------------------------------------------------

/** An important operation, recorded for accountability. */
export interface AuditEvent {
        id: string;
        ownerId: string;
        action: string;
        targetKind: string;
        targetId: string;
        /** User-safe detail; never a credential or a stack trace. */
        detail: string;
        createdAt: string;
}

// --- Aggregate views -------------------------------------------------------

/** Where a clip sits in the production, resolved for display. */
export interface AssetLocation {
        projectName: string;
        /** Breadcrumb labels from the project to the asset's folder. */
        path: string[];
        sceneTitle?: string;
        shotTitle?: string;
}

/** A conversation turn in the video Prompt Chat. */
export interface ChatMessage {
        id: string;
        ownerId: string;
        projectId: string;
        role: 'user' | 'assistant';
        content: string;
        /** Present when the turn is a saved prompt or a note rather than plain chat. */
        kind?: 'chat' | 'enhancement' | 'breakdown' | 'shot-list' | 'note';
        /** The prompt as the user wrote it, when this turn produced a prompt. */
        originalPrompt?: string;
        styleId?: string | null;
        createdAt: string;
}

/** A saved, reusable prompt the user kept from the chat or a shot. */
export interface SavedPrompt {
        id: string;
        ownerId: string;
        projectId: string;
        title: string;
        prompt: string;
        styleId: string | null;
        createdAt: string;
}
