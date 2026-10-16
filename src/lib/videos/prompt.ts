/**
 * Video prompt composition.
 *
 * This module owns the interaction the specification makes mandatory: selecting a
 * style in the Styles library must transfer a detailed, STRUCTURED prompt into the
 * video Prompt Chat — not just the style's name.
 *
 * Rules encoded here (all pure, all unit-tested):
 *  - The user's subject is never discarded. A style contributes guidance; the
 *    subject always leads the composed prompt.
 *  - Building is idempotent: re-applying the same style does not stack its
 *    guidance twice.
 *  - Only the fields that make sense for the task are included. An irrelevant
 *    field is omitted rather than filled with a placeholder.
 *  - Removing a style strips exactly the guidance it added, leaving the user's
 *    words — including anything typed afterwards — intact.
 */

import { findStyle, type Style } from '#lib/shared/styles';
import {
        describeDimensions,
        findAspectRatio,
        findFrameRate,
        findResolution,
        formatDuration,
        languageLabel
} from './formats';

/** How a selected style's guidance is combined with existing prompt text. */
export type ComposeMode = 'insert' | 'append' | 'replace';

/** Maximum composed prompt length accepted before submission. */
export const MAX_PROMPT_LENGTH = 8000;

/** The header that marks the structured block so it can be found and removed. */
export const STRUCTURED_MARKER = 'STRUCTURED VIDEO BRIEF';

/**
 * The full set of video prompt fields the specification lists. Every field is
 * optional: the builder emits a field only when a value exists, so an unrelated
 * control is never padded into the prompt.
 */
export interface VideoPromptFields {
        subject?: string;
        scene?: string;
        style?: string;
        artisticReferences?: string;
        composition?: string;
        cameraFraming?: string;
        cameraMovement?: string;
        lens?: string;
        lighting?: string;
        palette?: string;
        texture?: string;
        characterAppearance?: string;
        characterMovement?: string;
        environmentMovement?: string;
        action?: string;
        mood?: string;
        motionContinuity?: string;
        transition?: string;
        temporalProgression?: string;
        durationSeconds?: number;
        aspectRatio?: string;
        resolution?: string;
        frameRate?: number;
        audio?: string;
        negative?: string;
        consistency?: string;
        references?: string;
        output?: string;
}

/** A labelled field, kept in prompt order. */
const FIELD_ORDER: { key: keyof VideoPromptFields; label: string }[] = [
        { key: 'subject', label: 'Subject' },
        { key: 'scene', label: 'Scene and environment' },
        { key: 'style', label: 'Visual style' },
        { key: 'artisticReferences', label: 'Artistic characteristics' },
        { key: 'composition', label: 'Composition' },
        { key: 'cameraFraming', label: 'Camera framing' },
        { key: 'cameraMovement', label: 'Camera movement' },
        { key: 'lens', label: 'Lens and depth of field' },
        { key: 'lighting', label: 'Lighting' },
        { key: 'palette', label: 'Colour palette' },
        { key: 'texture', label: 'Texture and materials' },
        { key: 'characterAppearance', label: 'Character appearance' },
        { key: 'characterMovement', label: 'Character movement' },
        { key: 'environmentMovement', label: 'Environmental movement' },
        { key: 'action', label: 'Scene action' },
        { key: 'mood', label: 'Mood and atmosphere' },
        { key: 'motionContinuity', label: 'Motion continuity' },
        { key: 'transition', label: 'Transition' },
        { key: 'temporalProgression', label: 'Temporal progression' },
        { key: 'durationSeconds', label: 'Duration' },
        { key: 'aspectRatio', label: 'Aspect ratio' },
        { key: 'resolution', label: 'Resolution target' },
        { key: 'frameRate', label: 'Frame rate' },
        { key: 'audio', label: 'Audio and dialogue' },
        { key: 'negative', label: 'Exclude' },
        { key: 'consistency', label: 'Consistency requirements' },
        { key: 'references', label: 'Reference assets' },
        { key: 'output', label: 'Output requirements' }
];

function renderField(key: keyof VideoPromptFields, value: string | number | undefined): string | null {
        if (value === undefined || value === null) return null;
        const spec = FIELD_ORDER.find((f) => f.key === key);
        if (!spec) return null;
        if (typeof value === 'number') {
                if (key === 'durationSeconds') return `${spec.label}: ${formatDuration(value)}`;
                if (key === 'frameRate') return `${spec.label}: ${findFrameRate(value).label}`;
                return `${spec.label}: ${value}`;
        }
        const text = value.trim();
        if (!text) return null;
        return `${spec.label}: ${text}`;
}

/** Renders the structured brief. Only fields with values are emitted. */
export function buildStructuredPrompt(fields: VideoPromptFields): string {
        const lines: string[] = [`[${STRUCTURED_MARKER}]`];
        for (const { key } of FIELD_ORDER) {
                const rendered = renderField(key, fields[key]);
                if (rendered) lines.push(`- ${rendered}`);
        }
        // A subject-only brief carries no structured value, so return it plainly.
        return lines.length > 1 ? lines.join('\n') : '';
}

/** The style-specific guidance for video: `videoTemplate` when present. */
export function videoStyleGuidance(style: Style): string {
        return style.videoTemplate?.trim() || style.promptTemplate;
}

export interface StylePromptInput {
        /** What the user has already typed, if anything. */
        subject: string;
        style: Style;
        aspectRatio?: string;
        resolution?: string;
        frameRate?: number;
        durationSeconds?: number;
        cameraMovement?: string;
        lighting?: string;
        palette?: string;
        audio?: string;
        consistency?: string;
        references?: string;
        language?: string;
}

/**
 * Builds the structured video prompt for a selected style.
 *
 * The style supplies its own guidance plus the style's recommended controls; the
 * caller supplies the user's subject and any explicit settings. Fields the caller
 * did not provide are omitted, and the aspect ratio/resolution/frame rate are
 * rendered with their real numbers so the brief is unambiguous.
 */
export function styleToStructuredPrompt(input: StylePromptInput): string {
        const { style } = input;
        const subject = input.subject.trim();
        const fields: VideoPromptFields = {
                subject: subject || undefined,
                scene: undefined,
                style: style.name,
                artisticReferences: style.promptTemplate,
                cameraMovement: input.cameraMovement,
                lighting: input.lighting ?? (style.controls?.includes('Lighting') ? 'Follow the style’s lighting guidance.' : undefined),
                palette: input.palette,
                durationSeconds: input.durationSeconds,
                aspectRatio: input.aspectRatio ? describeAspect(input.aspectRatio) : undefined,
                resolution: input.resolution ? describeResolution(input.resolution, input.aspectRatio) : undefined,
                frameRate: input.frameRate,
                audio: input.audio ?? (input.language ? `Spoken language: ${languageLabel(input.language)}.` : undefined),
                negative: style.negativeTemplate,
                consistency: input.consistency,
                references: input.references,
                output: style.videoTemplate
                        ? `Motion treatment: ${videoStyleGuidance(style)}`
                        : undefined
        };
        // Drop fields whose value repeats the artistic reference to avoid noise.
        if (fields.output && fields.output.includes(fields.artisticReferences ?? '\u0000')) fields.output = undefined;
        return buildStructuredPrompt(fields);
}

function describeAspect(value: string): string {
        const option = findAspectRatio(value);
        return `${value} (${option.label}, ${option.orientation})`;
}

function describeResolution(value: string, aspectRatio?: string): string {
        const option = findResolution(value);
        const dims = describeDimensions(value, aspectRatio ?? '16:9');
        return `${option.label} — ${dims}`;
}

/** True when the draft already contains the structured brief for this style. */
export function structuredAlreadyApplied(draft: string, style: Style): boolean {
        if (!draft) return false;
        const guidance = videoStyleGuidance(style);
        return normalised(draft).includes(normalised(guidance));
}

/** True when any structured brief is already present in the draft. */
export function hasStructuredBrief(draft: string): boolean {
        return draft.includes(`[${STRUCTURED_MARKER}]`);
}

function normalised(value: string): string {
        return value.replace(/\s+/g, ' ').trim().toLowerCase();
}

/**
 * Composes the prompt actually sent to the service: the user's subject followed by
 * the style guidance. Idempotent, and the subject always leads.
 */
export function composeVideoPrompt(subject: string, style: Style | null, settings?: Partial<StylePromptInput>): string {
        const clean = subject.trim();
        if (!style) return clean;
        const structured = styleToStructuredPrompt({ subject: clean, style, ...settings });
        if (!structured) return clean;
        if (!clean) return structured;
        if (normalised(clean).includes(normalised(videoStyleGuidance(style)))) return clean;
        return `${clean}\n\n${structured}`;
}

/**
 * Applies a style to the current draft.
 *
 * `insert`/`append` both preserve the draft and never duplicate guidance.
 * `replace` is explicitly destructive and must only be reached after the user
 * confirms it. This is the function that satisfies "applying a style does not
 * silently delete the user's text".
 */
export function applyStyleToDraft(
        draft: string,
        style: Style,
        mode: ComposeMode = 'insert',
        settings?: Partial<StylePromptInput>
): string {
        const current = draft.trim();
        const structured = styleToStructuredPrompt({ subject: current, style, ...settings });
        if (mode === 'replace') return structured || videoStyleGuidance(style);
        if (!current) return structured || videoStyleGuidance(style);
        if (structuredAlreadyApplied(current, style)) return current;
        return structured ? `${current}\n\n${structured}` : current;
}

/**
 * Removes a style's guidance from the draft, preserving the user's own words and
 * anything typed after the style was applied.
 */
export function removeStyleFromDraft(draft: string, style: Style): string {
        const guidance = videoStyleGuidance(style);
        let result = draft;
        // Strip the whole structured block when it is the block this style produced.
        const blockPattern = new RegExp(
                `\\[${STRUCTURED_MARKER}\\][\\s\\S]*?(?=\\n\\n(?![\\s\\S]*\\[${STRUCTURED_MARKER}\\])|$)`,
                'g'
        );
        result = result.replace(blockPattern, (block) =>
                normalised(block).includes(normalised(guidance)) ? '' : block
        );
        // Also strip a bare guidance line for a style applied without a brief.
        if (guidance) {
                const pattern = new RegExp(escapeRegExp(guidance).replace(/\s+/g, '\\s+'), 'gi');
                result = result.replace(pattern, '');
        }
        return result
                .replace(/[ \t]+\n/g, '\n')
                .replace(/\n{3,}/g, '\n\n')
                .trim();
}

function escapeRegExp(value: string): string {
        return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export interface PromptValidation {
        ok: boolean;
        reason?: string;
}

/** Validates a composed prompt before submission. */
export function validatePrompt(prompt: string): PromptValidation {
        const clean = prompt.trim();
        if (!clean) return { ok: false, reason: 'Describe the shot you want to create first.' };
        if (clean.length > MAX_PROMPT_LENGTH) {
                return { ok: false, reason: `Prompts are limited to ${MAX_PROMPT_LENGTH} characters.` };
        }
        return { ok: true };
}

/** Derives a short title from a prompt, stripping style guidance. */
export function promptTitle(subject: string, style: Style | null, max = 56): string {
        const base = style ? removeStyleFromDraft(subject, style) : subject;
        const flat = base.replace(/\s+/g, ' ').trim();
        if (!flat) return style ? style.name : 'New video';
        return flat.length > max ? `${flat.slice(0, max - 1).trimEnd()}…` : flat;
}

/** Resolves a style id to the shared catalogue record, or null. */
export function resolveStyle(styleId: string | null | undefined): Style | null {
        return findStyle(styleId) ?? null;
}

/**
 * Splits a scene description into a shot list.
 *
 * Purely mechanical: it breaks the text into beats on sentence and line
 * boundaries and labels them, so a shot list can be produced locally WITHOUT
 * pretending an AI model wrote it. The UI labels the result as a mechanical split.
 */
export interface DraftShot {
        number: number;
        text: string;
        suggestedSeconds: number;
}

export function splitIntoShots(description: string, defaultSeconds = 5): DraftShot[] {
        const beats = description
                .split(/(?<=[.!?])\s+|\n+/)
                .map((part) => part.replace(/\s+/g, ' ').trim())
                .filter(Boolean);
        return beats.map((text, index) => ({
                number: index + 1,
                text,
                // A rough reading-time estimate, clearly a suggestion: ~2.5 words/sec.
                suggestedSeconds: Math.max(1, Math.round((text.split(/\s+/).length / 2.5) * 10) / 10) || defaultSeconds
        }));
}
