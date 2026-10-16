/**
 * Images module configuration and the honest "what is connected" flags.
 *
 * Nothing here is hard-coded as working. With no generation endpoint configured
 * the UI renders explicit configuration states and makes no request, rather than
 * fabricating an image or a prompt.
 *
 * Environment variables (all optional, none have a default endpoint):
 *   VITE_ARTI_IMAGE_ENDPOINT          image generation service
 *   VITE_ARTI_PROMPT_ENDPOINT         prompt intelligence service (falls back to
 *                                     VITE_ARTI_CHAT_ENDPOINT when unset)
 *   VITE_ARTI_IMAGE_MAX_COUNT         images per request, 1–4 (default 1)
 *   VITE_ARTI_IMAGE_SUPPORTS_NEGATIVE "true" when the model accepts a negative prompt
 *   VITE_ARTI_IMAGE_SUPPORTS_REFERENCE "true" when the model accepts a reference image
 */

import { isChatModelConfigured, isSupabaseConfigured, readEnv } from '#lib/shared/env';
import { NOT_CONNECTED } from '#lib/data/statusMessages';

export { isSupabaseConfigured };

/** Surface-level status strings specific to the Images workspace. */
export const IMAGE_STATUS = {
        /** Shown beside the composer while no generation service is configured. */
        generationUnavailable: 'Image generation is not configured yet.',
        /** Shown while no prompt intelligence service is configured. */
        promptUnavailable: 'Prompt enhancement needs the ARTI intelligence service, which is not configured yet.',
        referenceUnavailable: 'Reference images cannot be sent — the generation service is not configured yet.',
        /** Composer notice after a generate attempt hits the unconfigured boundary. */
        notGenerated: 'No image was generated — the ARTI image service is not connected yet.',
        /** Persistence-layer notices. */
        localOnly: 'Saved in this browser only — shared storage is not configured yet.',
        storageUnavailable: 'Image history storage is unavailable, so this conversation is not being saved.',
        saveFailed: 'The image could not be saved. Nothing was changed.'
} as const;

export { NOT_CONNECTED };

function flag(name: string): boolean {
        return readEnv(name).toLowerCase() === 'true';
}

/**
 * Whether a hosted image-generation service is configured.
 *
 * There is intentionally no default endpoint. When ARTI's privately hosted image
 * service exists, point `VITE_ARTI_IMAGE_ENDPOINT` at it and implement the
 * contract described in `service/imageService.ts`.
 */
export function isImageModelConfigured(): boolean {
        return readEnv('VITE_ARTI_IMAGE_ENDPOINT').length > 0;
}

/**
 * Whether a text intelligence service is available for prompt work.
 *
 * Prompt enhancement reuses the same privately hosted intelligence service as
 * Chats when no dedicated prompt endpoint is configured.
 */
export function isPromptModelConfigured(): boolean {
        return readEnv('VITE_ARTI_PROMPT_ENDPOINT').length > 0 || isChatModelConfigured();
}

/** Endpoint used for prompt work, or an empty string when none is configured. */
export function promptEndpoint(): string {
        return readEnv('VITE_ARTI_PROMPT_ENDPOINT') || readEnv('VITE_ARTI_CHAT_ENDPOINT');
}

/** Endpoint used for image generation, or an empty string when none is configured. */
export function imageEndpoint(): string {
        return readEnv('VITE_ARTI_IMAGE_ENDPOINT');
}

/** Whether the configured model accepts a negative prompt. */
export function supportsNegativePrompt(): boolean {
        return flag('VITE_ARTI_IMAGE_SUPPORTS_NEGATIVE');
}

/** Whether the configured model accepts a reference image (image-to-image). */
export function supportsReferenceImage(): boolean {
        return flag('VITE_ARTI_IMAGE_SUPPORTS_REFERENCE');
}

/**
 * Whether the configured model can produce variations of an existing result.
 * Variations are an image-to-image operation, so they follow reference support.
 */
export function supportsVariations(): boolean {
        return supportsReferenceImage();
}

/** Images the configured service accepts per request, clamped to a sane range. */
export function maxImageCount(): number {
        const raw = Number.parseInt(readEnv('VITE_ARTI_IMAGE_MAX_COUNT'), 10);
        if (!Number.isFinite(raw) || raw < 1) return 1;
        return Math.min(4, raw);
}

/** Maximum accepted reference-image size (15 MB). */
export const MAX_REFERENCE_BYTES = 15 * 1024 * 1024;

/**
 * Reference-image kinds accepted by the picker and client-side pre-validation.
 *
 * The `validate` predicate reads only the name and declared MIME type, so it is a
 * convenience for immediate feedback, NOT a security control. The service
 * boundary must re-validate, because neither the filename nor the browser MIME
 * type can be trusted.
 */
export interface AcceptedReferenceType {
        label: string;
        accept: string;
        extensions: string[];
        mimePrefixes: string[];
}

export const ACCEPTED_REFERENCE_TYPES: AcceptedReferenceType[] = [
        { label: 'Images', accept: 'image/png,image/jpeg,image/webp', extensions: ['.png', '.jpg', '.jpeg', '.webp'], mimePrefixes: ['image/png', 'image/jpeg', 'image/webp'] }
];

/** `accept` attribute for the composer's reference-image input. */
export const REFERENCE_ACCEPT = ACCEPTED_REFERENCE_TYPES.map((t) => t.accept).join(',');

/** Human-readable summary of accepted reference kinds, for menu and hint labels. */
export function describeReferenceTypes(): string {
        return ACCEPTED_REFERENCE_TYPES.map((t) => t.label).join(', ');
}
