/**
 * Shared style-catalogue contracts.
 *
 * One catalogue serves both the Images and the Videos workspaces, so a style is
 * described here in media-neutral terms and each workspace layers its own
 * settings on top when it composes a prompt. Keeping a single catalogue is what
 * stops the two features from drifting into two incompatible style systems.
 *
 * Honesty notes carried by these types:
 *  - `execution` states what is actually known about a style against the
 *    configured models. Nothing is claimed to be verified while no model is
 *    connected.
 *  - There is no `preview` field. No preview artwork has been supplied or
 *    generated, so the UI renders a deliberate text fallback rather than a
 *    broken or fabricated thumbnail.
 */

/** Media a style can be applied to. */
export type MediaType = 'image' | 'video';

/**
 * How executable a style currently is.
 *
 *  - `available`         verified end to end against a configured model
 *  - `limited`           works, with documented limitations
 *  - `model-dependent`   only correct on specific models
 *  - `prompt-only`       usable as prompt guidance, not model-verified
 *  - `not-executable`    no configured path can produce it yet
 */
export type StyleExecution = 'available' | 'limited' | 'model-dependent' | 'prompt-only' | 'not-executable';

/** Organisational grouping for the catalogue. Order here is the display order. */
export interface StyleCategory {
        id: string;
        label: string;
        /** Short description shown when the category is selected. */
        description: string;
        /** Media the category is most relevant to; advisory only. */
        mediaTypes?: MediaType[];
}

export interface Style {
        id: string;
        /** Human-readable style name, e.g. "Cinematic Photorealism". */
        name: string;
        /** Category id this style belongs to. */
        categoryId: string;
        /** One-line explanation shown on the card. */
        summary: string;
        /**
         * Prompt guidance merged with the user's subject. Written as an
         * instruction so it composes cleanly with an arbitrary subject.
         */
        promptTemplate: string;
        /**
         * Optional video-specific guidance (camera, motion, pacing). When absent
         * the video prompt builder falls back to `promptTemplate`.
         */
        videoTemplate?: string;
        /** Optional negative-prompt guidance for models that accept one. */
        negativeTemplate?: string;
        /** Aspect ratios this style is known to suit; advisory only. */
        preferredAspectRatios?: string[];
        /** Aspect ratios this style is known to suit for video; advisory only. */
        videoAspectRatios?: string[];
        /** Media this style can be applied to. */
        mediaTypes: MediaType[];
        /** What is actually known about running this style today. */
        execution: StyleExecution;
        /** Generation capabilities the style benefits from, e.g. "camera-motion". */
        capabilities?: string[];
        /** Visual controls this style exposes, e.g. "Lighting", "Film grain". */
        controls?: string[];
        /** Extra generation hints shown in the style detail view. */
        hints?: string[];
        /** Search keywords beyond the name and summary. */
        keywords?: string[];
        /** Free-form tags for user-created groupings. */
        tags?: string[];
        /** True only for styles the user created in this workspace. */
        custom?: boolean;
}

/** Human-readable label for an execution state, shown on style cards. */
export const EXECUTION_LABELS: Record<StyleExecution, string> = {
        available: 'Available',
        limited: 'Available with limitations',
        'model-dependent': 'Model dependent',
        'prompt-only': 'Prompt-only preset',
        'not-executable': 'Not currently executable'
};

/** Short explanation of an execution state, shown in the style detail view. */
export const EXECUTION_NOTES: Record<StyleExecution, string> = {
        available: 'Verified end to end against the configured model.',
        limited: 'Supported, with limitations documented below.',
        'model-dependent': 'Only produces the intended look on specific models.',
        'prompt-only': 'Applied as prompt guidance. Not verified against a model yet.',
        'not-executable': 'No configured model or pipeline can produce this yet.'
};
