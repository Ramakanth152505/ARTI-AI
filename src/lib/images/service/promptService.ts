/**
 * Prompt intelligence service boundary.
 *
 * Prompt enhancement and prompt generation require a real configured text model.
 * This module is that seam and nothing more: with no endpoint configured the
 * caller shows the honest unavailable state and the user can keep editing the
 * prompt manually. No prompt is ever fabricated locally and presented as if a
 * model produced it.
 *
 * The contract to implement later:
 *
 *   POST {VITE_ARTI_PROMPT_ENDPOINT}/prompt
 *   body: { requestId, task, prompt, styleId, aspectRatio }
 *   response: application/json
 *     { "prompt": "<enhanced prompt>", "negativePrompt"?: "<optional>" }
 *
 * The server owns the model credentials; the browser never holds one.
 */

import { isPromptModelConfigured, promptEndpoint } from '../config';
import type { AspectRatio } from '../styles';

export type PromptTask = 'enhance' | 'generate' | 'negative';

export interface PromptRequest {
        requestId: string;
        task: PromptTask;
        /** The user's current prompt (empty for a pure `generate` request). */
        prompt: string;
        styleId: string | null;
        aspectRatio: AspectRatio;
}

export interface PromptResult {
        prompt: string;
        negativePrompt?: string;
}

/** Error carrying a message that is already safe to display to the user. */
export class PromptServiceError extends Error {
        constructor(message: string, readonly cause?: unknown) {
                super(message);
                this.name = 'PromptServiceError';
        }
}

/**
 * Requests an improved or generated prompt.
 *
 * Not implemented: there is no configured endpoint. Callers must check
 * `isPromptModelConfigured()` first and show the unavailable state; reaching this
 * function is a programming error, so it throws rather than returning invented
 * prompt text.
 */
export async function requestPrompt(
        _request: PromptRequest,
        _signal: AbortSignal
): Promise<PromptResult> {
        if (promptEndpoint().length === 0) {
                throw new PromptServiceError('The ARTI intelligence service is not configured.');
        }
        throw new PromptServiceError('Prompt enhancement is not implemented for the configured endpoint yet.');
}

/** Turns a thrown value into user-safe text without leaking server internals. */
export function toUserSafeMessage(error: unknown): string {
        if (error instanceof PromptServiceError) return error.message;
        return 'The prompt could not be improved. Please try again.';
}

export { isPromptModelConfigured };
