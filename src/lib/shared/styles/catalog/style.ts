/**
 * Compact constructor for catalogue entries.
 *
 * Every authored style states its own name, category, summary and prompt
 * guidance. Everything else is defaulted here so the group files stay readable:
 *
 *  - `mediaTypes` defaults to both media, because the prompt guidance works for
 *    a still or a shot unless a style says otherwise.
 *  - `execution` defaults to `prompt-only`: no model is connected, so nothing is
 *    authored as verified. A style may only be raised above that with evidence.
 */

import type { MediaType, Style, StyleExecution } from '../types';

export interface StyleInput {
        id: string;
        name: string;
        categoryId: string;
        summary: string;
        promptTemplate: string;
        videoTemplate?: string;
        negativeTemplate?: string;
        preferredAspectRatios?: string[];
        videoAspectRatios?: string[];
        mediaTypes?: MediaType[];
        execution?: StyleExecution;
        capabilities?: string[];
        controls?: string[];
        hints?: string[];
        keywords?: string[];
        tags?: string[];
        custom?: boolean;
}

/** Fills the honest defaults so each group file states only what is specific. */
export function style(input: StyleInput): Style {
        return {
                mediaTypes: ['image', 'video'],
                execution: 'prompt-only',
                ...input
        };
}

/** Builds a group array with the same defaults applied to every entry. */
export function group(entries: StyleInput[]): Style[] {
        return entries.map(style);
}
