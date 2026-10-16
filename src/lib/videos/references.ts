/**
 * Reference-asset validation.
 *
 * Client-side checks a user can see immediately. They are deliberately NOT the
 * security boundary: the migration scopes storage per owner and the server must
 * re-validate type and size, because a file extension (or even a browser-reported
 * MIME type) can be wrong. This module mirrors the server rules so the fast path
 * and the authoritative path agree.
 *
 * The accepted kinds and limits match `ACCEPTED_REFERENCE_TYPES` in `config.ts`.
 */

import { ACCEPTED_REFERENCE_TYPES, MAX_REFERENCE_BYTES } from './config';
import { newId } from '#lib/shared/ids';
import { formatBytes } from '#lib/shared/text';
import type { AttachedReference } from './videosState.svelte';

/** Which accepted type a file matches, by extension or MIME type. */
export function matchReferenceType(file: { name: string; type: string }): { kind: string; maxBytes: number } | null {
        const extension = `.${file.name.split('.').pop()?.toLowerCase() ?? ''}`;
        const mime = (file.type || '').toLowerCase();
        // Prefer a MIME match, then fall back to the extension. Neither is trusted
        // alone; the server validates the real content.
        const byMime = ACCEPTED_REFERENCE_TYPES.find((t) => mime && t.mimePrefixes.some((p) => mime === p || mime.startsWith(p)));
        if (byMime) return { kind: byMime.label, maxBytes: byMime.maxBytes };
        const byExtension = ACCEPTED_REFERENCE_TYPES.find((t) => t.extensions.includes(extension));
        if (byExtension) return { kind: byExtension.label, maxBytes: byExtension.maxBytes };
        return null;
}

export interface ReferenceValidation {
        accepted: boolean;
        kind: string;
        detail?: string;
}

/** Validates one reference file, returning a user-facing reason when rejected. */
export function validateReference(file: { name: string; type: string; size: number }): ReferenceValidation {
        if (file.size <= 0) return { accepted: false, kind: 'unknown', detail: `“${file.name}” is empty.` };
        if (file.size > MAX_REFERENCE_BYTES) {
                return { accepted: false, kind: 'unknown', detail: `“${file.name}” is larger than ${formatBytes(MAX_REFERENCE_BYTES)}.` };
        }
        const matched = matchReferenceType(file);
        if (!matched) return { accepted: false, kind: 'unknown', detail: `“${file.name}” is not a supported reference type.` };
        if (file.size > matched.maxBytes) {
                return {
                        accepted: false,
                        kind: matched.kind,
                        detail: `${matched.kind} references are limited to ${formatBytes(matched.maxBytes)}.`
                };
        }
        return { accepted: true, kind: matched.kind };
}

/** Maps a FileList into attachable reference records, validating each one. */
export function toReferenceAttachments(files: { name: string; type: string; size: number }[]): AttachedReference[] {
        return files.map((file) => {
                const result = validateReference(file);
                return {
                        id: newId(),
                        name: file.name,
                        size: file.size,
                        mimeType: file.type,
                        kind: result.kind === 'unknown' ? 'other' : result.kind.toLowerCase(),
                        accepted: result.accepted,
                        detail: result.detail
                };
        });
}

/** Maps an accepted reference kind onto the matching icon. */
export function referenceIcon(kind: string): 'film' | 'image' | 'document' {
        if (kind.includes('video')) return 'film';
        if (kind.includes('image')) return 'image';
        return 'document';
}
