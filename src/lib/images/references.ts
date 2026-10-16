/**
 * Reference-image attachment validation.
 *
 * Two distinct stages, deliberately separated:
 *
 *  1. `validateReference` — fast client-side pre-checks for immediate feedback.
 *     It reads only the file name and declared MIME type, so it is a convenience,
 *     NOT a security control.
 *  2. `submitReference` — the real upload boundary. No storage service is
 *     configured, so it reports the file as non-uploaded. It never marks a file
 *     `ready`, and a real implementation must repeat validation on the server
 *     because filenames and MIME types are attacker-controlled.
 *
 * A reference image is always a *user* asset. It is never converted into a
 * generated result, and no local object URL is ever sent to the service.
 */

import { ACCEPTED_REFERENCE_TYPES, MAX_REFERENCE_BYTES } from './config';
import { newId } from '#lib/shared/ids';
import { formatBytes } from '#lib/shared/text';
import type { ImageAttachment } from './types';

function extensionOf(name: string): string {
        const dot = name.lastIndexOf('.');
        return dot === -1 ? '' : name.slice(dot).toLowerCase();
}

export interface ReferenceValidation {
        ok: boolean;
        reason?: string;
}

/** Pre-validates a candidate reference image against type and size limits. */
export function validateReference(file: File): ReferenceValidation {
        if (file.size > MAX_REFERENCE_BYTES) {
                return { ok: false, reason: `${file.name} is larger than ${formatBytes(MAX_REFERENCE_BYTES)}.` };
        }
        const ext = extensionOf(file.name);
        const mime = (file.type || '').toLowerCase();
        const accepted = ACCEPTED_REFERENCE_TYPES.some(
                (type) => type.extensions.includes(ext) || (mime && type.mimePrefixes.includes(mime))
        );
        if (!accepted) {
                return { ok: false, reason: `${file.name} is not a PNG, JPEG or WebP image.` };
        }
        return { ok: true };
}

/** Creates local preview URLs for the given files, revoking them via `release`. */
export function describeReferenceTypesList(): string {
        return ACCEPTED_REFERENCE_TYPES.map((t) => t.label).join(', ');
}

/**
 * Converts selected files into attachments. Only a single reference image is
 * supported by the composer, so the first file wins and any extra is rejected
 * with an explicit reason rather than being silently dropped.
 */
export function toReferenceAttachments(files: File[], createPreview: boolean): ImageAttachment[] {
        return files.map((file, index) => {
                const validation = validateReference(file);
                const rejected = index > 0 || !validation.ok;
                const reason = index > 0 ? 'Only one reference image can be attached.' : validation.reason;
                return {
                        id: newId(),
                        name: file.name,
                        size: file.size,
                        mimeType: file.type || 'unknown',
                        status: rejected ? 'rejected' : 'selected',
                        detail: rejected ? reason : undefined,
                        previewUrl:
                                createPreview && !rejected && typeof URL !== 'undefined'
                                        ? URL.createObjectURL(file)
                                        : undefined
                };
        });
}

/** Releases a local preview URL. Safe to call with an undefined value. */
export function releasePreview(url: string | undefined): void {
        if (!url || typeof URL === 'undefined') return;
        try {
                URL.revokeObjectURL(url);
        } catch {
                // Already revoked or unsupported; nothing further to do.
        }
}

export interface SubmitReferenceResult {
        attachments: ImageAttachment[];
        /** Uploads the storage service confirmed. Always 0 until one exists. */
        uploaded: number;
        notice?: string;
}

/**
 * The upload boundary. With no storage service configured every non-rejected
 * attachment is returned as `failed` with an explanatory detail, and the caller
 * keeps the user's prompt so nothing is lost.
 */
export async function submitReference(
        attachments: ImageAttachment[],
        notice: string
): Promise<SubmitReferenceResult> {
        const pending = attachments.filter((a) => a.status !== 'rejected');
        if (pending.length === 0) return { attachments, uploaded: 0 };
        return {
                attachments: attachments.map((a) =>
                        a.status === 'rejected' ? a : { ...a, status: 'failed' as const, detail: notice }
                ),
                uploaded: 0,
                notice
        };
}
