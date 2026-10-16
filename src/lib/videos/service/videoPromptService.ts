/**
 * Video prompt intelligence service boundary.
 *
 * Story and script generation, prompt refinement, scene breakdowns and shot lists
 * require a real configured text model. This module is that seam and nothing more:
 * with no endpoint configured the caller shows the honest unavailable state, and
 * the user keeps editing manually. NO prompt, story, breakdown or shot list is ever
 * fabricated locally and presented as if a model produced it.
 *
 * (A purely mechanical shot split on sentence boundaries exists in `prompt.ts` and
 * is labelled as mechanical in the UI — that is a text utility, not a model call.)
 *
 * ============================ CONTRACT TO IMPLEMENT ==========================
 *
 *   POST {VITE_ARTI_PROMPT_ENDPOINT}/video-prompt
 *   body: { requestId, task, prompt, styleId, aspectRatio, durationSeconds,
 *           context: { projectId, sceneTitle, references, continuity } }
 *   200 application/json
 *     enhance   -> { "prompt": "<improved prompt>", "negativePrompt": "…" }
 *     generate  -> { "prompt": "<new prompt from a brief>" }
 *     story     -> { "text": "<story or script>" }
 *     breakdown -> { "scenes": [ { "title","description","durationSeconds" } ] }
 *     shotlist  -> { "shots": [ { "text","suggestedSeconds" } ] }
 *
 * The server owns the model credentials; the browser never holds one.
 * ============================================================================
 */

import { isVideoPromptModelConfigured, videoPromptEndpoint } from '../config';

export type VideoPromptTask = 'enhance' | 'generate' | 'story' | 'breakdown' | 'shotlist';

export interface VideoPromptRequest {
        requestId: string;
        task: VideoPromptTask;
        /** The user's current prompt or brief. */
        prompt: string;
        styleId: string | null;
        aspectRatio: string;
        durationSeconds: number;
        context?: {
                projectId?: string;
                sceneTitle?: string;
                references?: string;
                continuity?: string;
        };
}

export interface VideoPromptResult {
        /** Improved or generated prompt, for `enhance` and `generate`. */
        prompt?: string;
        negativePrompt?: string;
        /** Story or script text, for `story`. */
        text?: string;
        /** Scene breakdown, for `breakdown`. */
        scenes?: { title: string; description: string; durationSeconds: number }[];
        /** Shot list, for `shotlist`. */
        shots?: { text: string; suggestedSeconds: number }[];
}

/** Error carrying a message that is already safe to display to the user. */
export class VideoPromptServiceError extends Error {
        constructor(message: string, readonly cause?: unknown) {
                super(message);
                this.name = 'VideoPromptServiceError';
        }
}

/**
 * Requests prompt intelligence for video.
 *
 * Not implemented: there is no configured endpoint. Callers must check
 * `isVideoPromptModelConfigured()` first and show the unavailable state; reaching
 * this function is a programming error, so it throws rather than returning
 * invented prompt text.
 */
export async function requestVideoPrompt(
        _request: VideoPromptRequest,
        _signal: AbortSignal
): Promise<VideoPromptResult> {
        if (videoPromptEndpoint().length === 0) {
                throw new VideoPromptServiceError('The ARTI intelligence service is not configured.');
        }
        throw new VideoPromptServiceError('Video prompt intelligence is not implemented for the configured endpoint yet.');
}

/** Turns a thrown value into user-safe text without leaking server internals. */
export function toUserSafeMessage(error: unknown): string {
        if (error instanceof VideoPromptServiceError) return error.message;
        return 'The prompt could not be improved. Please try again.';
}

export { isVideoPromptModelConfigured };
