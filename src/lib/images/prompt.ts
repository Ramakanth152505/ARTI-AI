/**
 * Prompt composition and validation for the Images module.
 *
 * This module owns the one interaction the whole feature hinges on: turning a
 * selected style plus the user's own text into a single, coherent prompt that is
 * actually sent to the generation service.
 *
 * Design rules encoded here:
 *  - The user's subject is never discarded. A style contributes guidance, and the
 *    subject is always present in the composed prompt.
 *  - Composing is idempotent: re-applying the same style never stacks its
 *    template into the prompt a second time.
 *  - Removing a style strips exactly the guidance it added, leaving the user's
 *    own words — including anything they typed afterwards — intact.
 *  - All functions are pure, so they are directly unit-testable.
 */

import { findStyle, DEFAULT_ASPECT_RATIO, type AspectRatio, type ImageStyle } from './styles';

/** How a selected style's template is combined with existing prompt text. */
export type ComposeMode = 'insert' | 'append' | 'replace';

/** Maximum composed prompt length accepted before submission. */
export const MAX_PROMPT_LENGTH = 4000;

/** Default text inserted when a style is chosen and the composer is empty. */
export function styleTemplate(style: ImageStyle): string {
        return style.promptTemplate;
}

/**
 * True when `text` already contains the style's guidance, so it is not stacked
 * again. Compared case-insensitively on normalised whitespace.
 */
export function styleAlreadyApplied(text: string, style: ImageStyle): boolean {
        if (!text) return false;
        const normalised = text.replace(/\s+/g, ' ').trim().toLowerCase();
        const template = style.promptTemplate.replace(/\s+/g, ' ').trim().toLowerCase();
        return normalised.includes(template);
}

/**
 * Composes the prompt that will be sent to the service.
 *
 * With no style, the user's text is returned unchanged. With a style, the
 * guidance is placed after the subject so the subject remains the leading
 * instruction, and the operation is safe to repeat. The user's own formatting is
 * preserved — only leading and trailing whitespace is trimmed.
 */
export function composePrompt(subject: string, style: ImageStyle | null): string {
        const clean = subject.trim();
        if (!style) return clean;
        if (!clean) return style.promptTemplate;
        if (styleAlreadyApplied(clean, style)) return clean;
        return `${clean}\n\n${style.promptTemplate}`;
}

/**
 * Applies a style to the current draft according to `mode`.
 *
 * `insert` and `append` both preserve the draft and never duplicate an
 * already-applied template. `replace` is the explicit destructive choice and is
 * only ever reached after the caller confirms it with the user.
 */
export function applyStyleTemplate(
        draft: string,
        style: ImageStyle,
        mode: ComposeMode = 'insert'
): string {
        const current = draft.trim();
        if (mode === 'replace') return style.promptTemplate;
        if (!current) return style.promptTemplate;
        if (styleAlreadyApplied(current, style)) return current;
        // Subject first, guidance second — true for both insert and append.
        return `${current}\n\n${style.promptTemplate}`;
}

/**
 * Removes a style's guidance from the draft, returning the user's remaining text.
 * Anything the user typed after applying the style is preserved.
 */
export function removeStyleTemplate(draft: string, style: ImageStyle): string {
        const template = style.promptTemplate.replace(/\s+/g, ' ').trim();
        if (!template) return draft.trim();
        // Match the template allowing for arbitrary whitespace, then remove it and
        // tidy only the blank lines the removal leaves behind — the user's own
        // spacing and wording are left untouched.
        const pattern = new RegExp(
                template.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+'),
                'gi'
        );
        return draft
                .replace(pattern, '')
                .replace(/[ \t]+\n/g, '\n')
                .replace(/\n{3,}/g, '\n\n')
                .trim();
}

/** Prompt validation result, so the composer can disable submit honestly. */
export interface PromptValidation {
        ok: boolean;
        reason?: string;
}

/** Validates a composed prompt before it is sent to the service. */
export function validatePrompt(prompt: string): PromptValidation {
        const clean = prompt.trim();
        if (!clean) return { ok: false, reason: 'Enter a prompt describing the image you want.' };
        if (clean.length > MAX_PROMPT_LENGTH) {
                return { ok: false, reason: `Prompts are limited to ${MAX_PROMPT_LENGTH} characters.` };
        }
        return { ok: true };
}

/**
 * Derives a conversation title from the first prompt, used only as a local
 * convenience until a real title service exists. The style guidance is stripped
 * so the title reflects the user's own subject.
 */
export function promptTitle(subject: string, style: ImageStyle | null, max = 48): string {
        const base = style ? removeStyleTemplate(subject, style) : subject;
        const flat = base.replace(/\s+/g, ' ').trim();
        if (!flat) return style ? style.name : 'New image';
        return flat.length > max ? `${flat.slice(0, max - 1).trimEnd()}…` : flat;
}

/** Parses a comma or newline separated negative prompt into a clean list. */
export function parseNegativePrompt(input: string): string[] {
        return input
                .split(/[,\n]/)
                .map((part) => part.trim())
                .filter((part) => part.length > 0);
}

/** Joins negative terms into a single string, de-duplicated case-insensitively. */
export function mergeNegativePrompt(base: string | undefined, extra: string[]): string {
        const seen = new Set<string>();
        const out: string[] = [];
        for (const term of [...parseNegativePrompt(base ?? ''), ...extra]) {
                const key = term.toLowerCase();
                if (seen.has(key)) continue;
                seen.add(key);
                out.push(term);
        }
        return out.join(', ');
}

/**
 * A request descriptor validated before submission. Kept separate from the
 * service call so the composer can validate fields without touching the network.
 */
export interface GenerationRequestInput {
        prompt: string;
        styleId: string | null;
        aspectRatio: AspectRatio;
        count: number;
        negativePrompt?: string;
        hasReference: boolean;
}

export interface ValidatedGenerationRequest extends GenerationRequestInput {
        /** The style record resolved from `styleId`, if it still exists in the catalog. */
        style: ImageStyle | null;
}

export function validateGenerationRequest(input: GenerationRequestInput): {
        ok: boolean;
        reason?: string;
        value?: ValidatedGenerationRequest;
} {
        const promptCheck = validatePrompt(input.prompt);
        if (!promptCheck.ok) return { ok: false, reason: promptCheck.reason };

        if (!Number.isInteger(input.count) || input.count < 1 || input.count > 4) {
                return { ok: false, reason: 'Choose between 1 and 4 images per request.' };
        }

        return {
                ok: true,
                value: {
                        ...input,
                        prompt: input.prompt.trim(),
                        aspectRatio: input.aspectRatio ?? DEFAULT_ASPECT_RATIO,
                        style: findStyle(input.styleId) ?? null
                }
        };
}
