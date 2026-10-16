/**
 * Image generation service boundary.
 *
 * This is the single seam between the Images UI and ARTI's future privately
 * hosted image service. There is no model call here today — with no endpoint
 * configured, `isImageModelConfigured()` is false and the caller renders an
 * honest configuration state. Nothing is simulated, and no placeholder image is
 * ever produced in place of a real result.
 *
 * The contract to implement later:
 *
 *   POST {VITE_ARTI_IMAGE_ENDPOINT}/images
 *   body: { requestId, conversationId, prompt, negativePrompt, styleId,
 *           aspectRatio, width, height, count, reference, referenceUrl }
 *   response: text/event-stream
 *     event: queued     data: {"jobId":"...","position":2}
 *     event: progress   data: {"percent":40}
 *     event: asset      data: {"id","url","width","height","mimeType"}
 *     event: done       data: {"jobId":"..."}
 *     event: error      data: {"message":"<user-safe text>"}
 *
 * The server is the only party allowed to hold model credentials. The client
 * sends a prompt and receives URLs; it never sees an API key.
 *
 * `AbortSignal` cancellation is client-side: it stops reading the stream. It
 * cannot guarantee the remote computation stopped, so callers must record a
 * "stopped" state rather than claiming a hard cancel.
 */

import { imageEndpoint, maxImageCount } from '../config';
import { dimensionsFor, type AspectRatio } from '../styles';

/** A reference image as seen by the service — metadata only, never a local URL. */
export interface ServiceReference {
        /** Identifier returned by the storage service once it confirms the upload. */
        storageRef: string;
        mimeType: string;
        name: string;
}

export interface GenerationRequest {
        requestId: string;
        conversationId: string;
        /** The final composed prompt (subject plus any style guidance). */
        prompt: string;
        negativePrompt?: string;
        styleId: string | null;
        aspectRatio: AspectRatio;
        width: number;
        height: number;
        /** Images requested, already clamped by `maxImageCount()`. */
        count: number;
        /** Present only when the model and storage both support a reference image. */
        reference?: ServiceReference;
        /**
         * URL of a previously generated asset to use as an image-to-image base,
         * for variations. Never a local object URL — only a URL the service itself
         * returned earlier.
         */
        referenceUrl?: string;
}

/** One generated image as returned by the service. */
export interface GeneratedAsset {
        /** Service-side asset id; the caller maps it onto a stable local record. */
        id: string;
        url: string;
        width?: number;
        height?: number;
        mimeType?: string;
}

export type GenerationEvent =
        | { type: 'queued'; jobId: string; position?: number }
        | { type: 'progress'; percent: number }
        | { type: 'asset'; asset: GeneratedAsset }
        | { type: 'done'; jobId?: string }
        | { type: 'error'; message: string };

export interface GenerationHandlers {
        onEvent: (event: GenerationEvent) => void;
        /** Called once the stream ends (normally, by error, or by abort). */
        onClose: (reason: 'done' | 'error' | 'aborted') => void;
}

/** Error carrying a message that is already safe to display to the user. */
export class ImageServiceError extends Error {
        constructor(message: string, readonly cause?: unknown) {
                super(message);
                this.name = 'ImageServiceError';
        }
}

/** Clamps a requested image count to what the configured service accepts. */
export function clampCount(count: number): number {
        const max = maxImageCount();
        if (!Number.isFinite(count)) return 1;
        return Math.max(1, Math.min(max, Math.floor(count)));
}

/** Reserves layout space for a result before its real dimensions are known. */
export function reserveSize(aspectRatio: AspectRatio): { width: number; height: number } {
        return dimensionsFor(aspectRatio);
}

/**
 * Requests image generation, streaming progress and results.
 *
 * Not implemented: there is no configured endpoint. Callers must check
 * `isImageModelConfigured()` first and show the configuration state; reaching
 * this function is a programming error, so it throws rather than returning a
 * fabricated asset that could be mistaken for a real result.
 */
export async function generateImages(
        _request: GenerationRequest,
        _handlers: GenerationHandlers,
        _signal: AbortSignal
): Promise<void> {
        if (!isImageModelConfiguredNow()) {
                throw new ImageServiceError('The ARTI image service is not configured.');
        }
        throw new ImageServiceError('The ARTI image service is not configured.');
}

/** Reads the endpoint at call time so configuration is not captured at load. */
function isImageModelConfiguredNow(): boolean {
        return imageEndpoint().length > 0;
}

/** Turns a thrown value into user-safe text without leaking server internals. */
export function toUserSafeMessage(error: unknown): string {
        if (error instanceof ImageServiceError) return error.message;
        return 'The image could not be generated. Please try again.';
}
