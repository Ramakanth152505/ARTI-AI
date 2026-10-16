/**
 * Videos module configuration and the honest "what is connected" flags.
 *
 * Nothing here is hard-coded as working. With no generation endpoint configured the
 * UI renders explicit configuration states and makes no request, rather than
 * fabricating a video, a prompt or a progress percentage.
 *
 * Environment variables (all optional; none has a default endpoint):
 *   VITE_ARTI_VIDEO_ENDPOINT            video generation service
 *   VITE_ARTI_PROMPT_ENDPOINT           prompt intelligence service (falls back to
 *                                       VITE_ARTI_CHAT_ENDPOINT when unset)
 *   VITE_ARTI_VIDEO_MAX_CLIP_SECONDS    longest single clip the model accepts
 *   VITE_ARTI_VIDEO_NATIVE_LONG_EDGE    highest native long edge in pixels
 *   VITE_ARTI_VIDEO_MAX_CONCURRENT      concurrent jobs the worker accepts
 *   VITE_ARTI_VIDEO_CAP_CAMERA_MOTION   "true" when the model supports camera moves
 *   VITE_ARTI_VIDEO_CAP_IMAGE_TO_VIDEO  "true" when image-to-video is supported
 *   VITE_ARTI_VIDEO_CAP_VIDEO_TO_VIDEO  "true" when video-to-video is supported
 *   VITE_ARTI_VIDEO_CAP_AUDIO           "true" when the model produces audio
 *   VITE_ARTI_VIDEO_CAP_NEGATIVE        "true" when a negative prompt is accepted
 *   VITE_ARTI_VIDEO_CAP_UPSCALE         "true" when an upscaler is configured
 *   VITE_ARTI_VIDEO_CAP_FRAME_INTERP    "true" when frame interpolation is available
 *
 * The capability flags default to FALSE on purpose: with no model connected the UI
 * must not imply a capability it cannot deliver.
 */

import { isChatModelConfigured, isSupabaseConfigured, readEnv } from '#lib/shared/env';
import { NOT_CONNECTED } from '#lib/data/statusMessages';

export { isSupabaseConfigured };

/** Surface-level status strings specific to the Videos workspace. */
export const VIDEO_STATUS = {
        generationUnavailable: 'Video generation is not configured yet.',
        promptUnavailable: 'Video prompt intelligence needs the ARTI intelligence service, which is not configured yet.',
        referenceUnavailable: 'Reference assets cannot be sent — the generation service is not configured yet.',
        notGenerated: 'No video was generated — the ARTI video service is not connected yet.',
        audioUnavailable: 'Audio generation is not configured, so a video-only clip can be drafted and audio attached later.',
        upscaleUnavailable: 'Upscaling and frame interpolation are not configured, so the native resolution is the final one.',
        localOnly: 'Saved in this browser only — shared storage is not configured yet.',
        storageUnavailable: 'Video storage is unavailable, so this production is not being saved.',
        saveFailed: 'The change could not be saved. Nothing was changed.',
        exportUnavailable: 'That export format needs the encoding worker, which is not configured yet.'
} as const;

export { NOT_CONNECTED };

function flag(name: string): boolean {
        return readEnv(name).toLowerCase() === 'true';
}

function positiveInt(name: string, fallback: number): number {
        const raw = Number.parseInt(readEnv(name), 10);
        return Number.isFinite(raw) && raw > 0 ? raw : fallback;
}

/**
 * Whether a hosted video-generation service is configured.
 *
 * There is intentionally no default endpoint: ARTI's model service is privately
 * hosted, so its address is deployment configuration, not source code.
 */
export function isVideoModelConfigured(): boolean {
        return readEnv('VITE_ARTI_VIDEO_ENDPOINT').length > 0;
}

/** Whether a text intelligence service is available for prompt work. */
export function isVideoPromptModelConfigured(): boolean {
        return readEnv('VITE_ARTI_PROMPT_ENDPOINT').length > 0 || isChatModelConfigured();
}

/** Endpoint used for video prompt work, or an empty string. */
export function videoPromptEndpoint(): string {
        return readEnv('VITE_ARTI_PROMPT_ENDPOINT') || readEnv('VITE_ARTI_CHAT_ENDPOINT');
}

/** Endpoint used for video generation, or an empty string. */
export function videoEndpoint(): string {
        return readEnv('VITE_ARTI_VIDEO_ENDPOINT');
}

/** Longest single clip the configured model accepts, in seconds. */
export function maxClipSeconds(): number {
        // Hard ceiling regardless of configuration: a single generation call is never
        // allowed to represent a multi-hour production.
        return Math.min(60, positiveInt('VITE_ARTI_VIDEO_MAX_CLIP_SECONDS', 10));
}

/** Highest long edge (px) the model can generate natively. */
export function nativeLongEdge(): number {
        return positiveInt('VITE_ARTI_VIDEO_NATIVE_LONG_EDGE', 1920);
}

/** Concurrent jobs the worker accepts. Used for queue guidance, not enforcement. */
export function maxConcurrentJobs(): number {
        return positiveInt('VITE_ARTI_VIDEO_MAX_CONCURRENT', 2);
}

/** A model/pipeline identifier for the queue record; empty while unconfigured. */
export function pipelineId(): string {
        return readEnv('VITE_ARTI_VIDEO_PIPELINE') || (isVideoModelConfigured() ? 'arti-video-default' : '');
}

/**
 * Capability discovery.
 *
 * These are read from configuration, not assumed. With nothing configured every
 * capability is false and the UI says so; it never advertises a conditioning input
 * or a post-processing stage the pipeline cannot perform.
 */
export interface VideoCapabilities {
        cameraMotion: boolean;
        imageToVideo: boolean;
        videoToVideo: boolean;
        audio: boolean;
        negativePrompt: boolean;
        upscale: boolean;
        frameInterpolation: boolean;
}

export function videoCapabilities(): VideoCapabilities {
        return {
                cameraMotion: flag('VITE_ARTI_VIDEO_CAP_CAMERA_MOTION'),
                imageToVideo: flag('VITE_ARTI_VIDEO_CAP_IMAGE_TO_VIDEO'),
                videoToVideo: flag('VITE_ARTI_VIDEO_CAP_VIDEO_TO_VIDEO'),
                audio: flag('VITE_ARTI_VIDEO_CAP_AUDIO'),
                negativePrompt: flag('VITE_ARTI_VIDEO_CAP_NEGATIVE'),
                upscale: flag('VITE_ARTI_VIDEO_CAP_UPSCALE'),
                frameInterpolation: flag('VITE_ARTI_VIDEO_CAP_FRAME_INTERP')
        };
}

/** Reference-asset kinds the picker accepts, with their client-side pre-checks. */
export interface AcceptedReferenceType {
        label: string;
        accept: string;
        extensions: string[];
        mimePrefixes: string[];
        /** Largest accepted file size in bytes. */
        maxBytes: number;
}

export const ACCEPTED_REFERENCE_TYPES: AcceptedReferenceType[] = [
        {
                label: 'Images',
                accept: 'image/png,image/jpeg,image/webp',
                extensions: ['.png', '.jpg', '.jpeg', '.webp'],
                mimePrefixes: ['image/png', 'image/jpeg', 'image/webp'],
                maxBytes: 15 * 1024 * 1024
        },
        {
                label: 'Video',
                accept: 'video/mp4,video/webm,video/quicktime',
                extensions: ['.mp4', '.webm', '.mov'],
                mimePrefixes: ['video/mp4', 'video/webm', 'video/quicktime'],
                maxBytes: 512 * 1024 * 1024
        },
        {
                label: 'Documents',
                accept: 'text/plain,application/pdf',
                extensions: ['.txt', '.md', '.pdf'],
                mimePrefixes: ['text/plain', 'text/markdown', 'application/pdf'],
                maxBytes: 25 * 1024 * 1024
        }
];

/** `accept` attribute for the reference input. */
export const REFERENCE_ACCEPT = ACCEPTED_REFERENCE_TYPES.map((t) => t.accept).join(',');

/** Human-readable summary of accepted reference kinds. */
export function describeReferenceTypes(): string {
        return ACCEPTED_REFERENCE_TYPES.map((t) => t.label).join(', ');
}

/** Maximum accepted reference size across all kinds (server must re-validate). */
export const MAX_REFERENCE_BYTES = Math.max(...ACCEPTED_REFERENCE_TYPES.map((t) => t.maxBytes));

/** Default retry bound for a generation job, so a failure is bounded, not infinite. */
export const DEFAULT_MAX_RETRIES = 2;

/** Page size for paged lists (library, queue, folders), for server-side paging. */
export const PAGE_SIZE = 40;
