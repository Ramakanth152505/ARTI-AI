/**
 * Video generation service boundary.
 *
 * This is the single seam between the Videos UI and ARTI's future privately hosted
 * video service. It is a PROVIDER-NEUTRAL contract: the interface below is what a
 * self-developed, privately hosted model adapter — or an explicitly approved
 * development adapter — must implement. No third-party model API is called here,
 * and no model credentials ever reach the browser.
 *
 * There is no model call in this file today. With no endpoint configured
 * (`isVideoModelConfigured()` is false) the caller renders an honest configuration
 * state. Nothing is simulated, and no placeholder video is ever produced in place
 * of a real result.
 *
 * ============================ CONTRACT TO IMPLEMENT ==========================
 *
 * Capability discovery
 *   GET  {VITE_ARTI_VIDEO_ENDPOINT}/capabilities
 *   200  { "pipeline": "arti-video-1", "modelVersion": "…",
 *          "nativeLongEdge": 1920,
 *          "resolutions": ["480p","720p","1080p"],
 *          "aspectRatios": ["16:9","9:16","1:1"],
 *          "minClipSeconds": 1, "maxClipSeconds": 10, "frameRates": [24,25,30],
 *          "conditioning": { "imageToVideo": true, "videoToVideo": false,
 *                            "cameraMotion": true, "negativePrompt": true },
 *          "audio": false, "upscale": false, "frameInterpolation": false }
 *
 * Submission (persistent job, NOT one long request)
 *   POST {VITE_ARTI_VIDEO_ENDPOINT}/jobs
 *   Idempotency-Key: <job idempotencyKey>
 *   body: { requestId, projectId, promptVersion, prompt, negativePrompt, styleId,
 *           durationSeconds, resolution, aspectRatio, frameRate, pipeline,
 *           conditioning: { imageRef?, videoRef?, firstFrame?, lastFrame? } }
 *   201  { "jobId": "…" }
 *
 * Status + progress (poll or SSE; the client must survive a reload)
 *   GET  {VITE_ARTI_VIDEO_ENDPOINT}/jobs/{jobId}
 *   200  { "stage": "queued|preparing|generating|upscaling|encoding|quality-checking|
 *                    completed|failed|cancelled",
 *          "progress": 42 | null,
 *          "message": "…",
 *          "outputs": [ { "id","url","mimeType","durationSeconds","frameCount",
 *                         "width","height","frameRate","bytes" } ],
 *          "error": "…" }
 *
 *   GET  {VITE_ARTI_VIDEO_ENDPOINT}/jobs/{jobId}/events   (SSE)
 *     event: stage    data: {"stage":"generating","progress":null}
 *     event: progress data: {"percent":40}
 *     event: output   data: { ...output record... }
 *     event: done     data: {"jobId":"…"}
 *     event: error    data: {"message":"<user-safe text>"}
 *
 * Cancellation (best effort; the server is the authority)
 *   POST {VITE_ARTI_VIDEO_ENDPOINT}/jobs/{jobId}/cancel
 *
 * Export/assembly boundary (encoding worker)
 *   POST {VITE_ARTI_VIDEO_EXPORT_ENDPOINT}/renders
 *   body: { requestId, projectId, targetKind, targetId, assetIds[], format }
 *   201  { "renderId": "…" }
 *   GET  {VITE_ARTI_VIDEO_EXPORT_ENDPOINT}/renders/{renderId}
 *
 * ============================================================================
 */

import { isVideoModelConfigured, maxClipSeconds, nativeLongEdge, pipelineId, videoCapabilities, videoEndpoint } from '../config';
import type { JobStage, PromptSettings } from '../types';

/** A reference asset as seen by the service — metadata only, never a local URL. */
export interface ServiceReference {
        /** Identifier returned by the storage service once it confirms the upload. */
        storageRef: string;
        mimeType: string;
        name: string;
}

/** Conditioning inputs the model may accept. Each is optional and capability-gated. */
export interface ConditioningInputs {
        imageRef?: ServiceReference;
        videoRef?: ServiceReference;
        firstFrame?: ServiceReference;
        lastFrame?: ServiceReference;
        /** URL of a previously generated asset used as a base (only that URL). */
        referenceUrl?: string;
        motionReferenceUrl?: string;
}

export interface VideoGenerationRequest {
        requestId: string;
        projectId: string;
        promptVersionId: string;
        /** The final composed prompt (subject plus style guidance). */
        prompt: string;
        negativePrompt?: string;
        styleId: string | null;
        durationSeconds: number;
        resolution: string;
        aspectRatio: string;
        frameRate: number;
        pipeline: string;
        settings?: PromptSettings;
        conditioning?: ConditioningInputs;
        /** Idempotency key so a refresh cannot create a second job. */
        idempotencyKey: string;
}

/** One produced output, with the MEASURED metadata the service reported. */
export interface GeneratedOutput {
        id: string;
        url: string;
        mimeType?: string;
        durationSeconds?: number;
        frameCount?: number;
        width?: number;
        height?: number;
        frameRate?: number;
        bytes?: number;
}

export type VideoGenerationEvent =
        | { type: 'stage'; stage: JobStage; message?: string }
        | { type: 'progress'; percent: number }
        | { type: 'output'; output: GeneratedOutput }
        | { type: 'done'; jobId?: string }
        | { type: 'error'; message: string };

export interface VideoGenerationHandlers {
        onEvent: (event: VideoGenerationEvent) => void;
        /** Called once the stream ends, however it ends. */
        onClose: (reason: 'done' | 'error' | 'aborted') => void;
}

/** Error carrying a message that is already safe to display to the user. */
export class VideoServiceError extends Error {
        constructor(message: string, readonly cause?: unknown) {
                super(message);
                this.name = 'VideoServiceError';
        }
}

/** Capability description a real adapter must return. */
export interface VideoCapabilitiesReport {
        pipeline: string;
        modelVersion: string;
        nativeLongEdge: number;
        resolutions: string[];
        aspectRatios: string[];
        minClipSeconds: number;
        maxClipSeconds: number;
        frameRates: number[];
        conditioning: { imageToVideo: boolean; videoToVideo: boolean; cameraMotion: boolean; negativePrompt: boolean };
        audio: boolean;
        upscale: boolean;
        frameInterpolation: boolean;
}

/**
 * Reports the configured pipeline's capabilities, or null when none is configured.
 *
 * Falls back to the honest local view (endpoint + env flags) so the UI can still
 * describe limits without inventing a model. A real adapter replaces this with the
 * `GET /capabilities` call shown in the contract above.
 */
export function discoverCapabilities(): VideoCapabilitiesReport | null {
        if (!isVideoModelConfigured()) return null;
        const caps = videoCapabilities();
        return {
                pipeline: pipelineId(),
                // Unknown until the adapter reports it; never invented.
                modelVersion: 'unreported',
                nativeLongEdge: nativeLongEdge(),
                resolutions: [],
                aspectRatios: [],
                minClipSeconds: 1,
                maxClipSeconds: maxClipSeconds(),
                frameRates: [],
                conditioning: {
                        imageToVideo: caps.imageToVideo,
                        videoToVideo: caps.videoToVideo,
                        cameraMotion: caps.cameraMotion,
                        negativePrompt: caps.negativePrompt
                },
                audio: caps.audio,
                upscale: caps.upscale,
                frameInterpolation: caps.frameInterpolation
        };
}

/**
 * Submits a generation job and streams its progress.
 *
 * Not implemented: there is no configured endpoint. Callers MUST check
 * `isVideoModelConfigured()` first and show the configuration state; reaching this
 * function is a programming error, so it throws rather than returning a fabricated
 * output that could be mistaken for a real video.
 */
export async function generateVideo(
        _request: VideoGenerationRequest,
        _handlers: VideoGenerationHandlers,
        _signal: AbortSignal
): Promise<void> {
        if (videoEndpoint().length === 0) {
                throw new VideoServiceError('The ARTI video service is not configured.');
        }
        throw new VideoServiceError('Video generation is not implemented for the configured endpoint yet.');
}

/**
 * Requests cancellation of a running job.
 *
 * Best effort only: the client stops waiting, and the server is the authority on
 * whether computation actually halted. The caller must record a cancelled state
 * rather than claiming a hard stop.
 */
export async function cancelVideoJob(_jobId: string): Promise<boolean> {
        return false;
}

/** Turns a thrown value into user-safe text without leaking server internals. */
export function toUserSafeMessage(error: unknown): string {
        if (error instanceof VideoServiceError) return error.message;
        return 'The video could not be generated. Please try again.';
}

/** Clamps a requested clip duration to what the configured pipeline accepts. */
export function clampClipSeconds(seconds: number): number {
        const max = maxClipSeconds();
        if (!Number.isFinite(seconds)) return 1;
        return Math.max(1, Math.min(max, Math.round(seconds)));
}
