/**
 * Attachment validation and submission boundary.
 *
 * Two distinct stages, deliberately separated:
 *
 *  1. `validateFile` — fast client-side pre-checks for immediate feedback. It
 *     only reads the file name and declared MIME type, so it is a convenience,
 *     NOT a security control.
 *  2. `submitAttachments` — the real upload boundary. No storage service is
 *     configured, so it reports every file as non-uploaded. It never marks a
 *     file `ready`, and a real implementation must repeat the validation on the
 *     server because filenames and MIME types are attacker-controlled.
 */

import { ACCEPTED_FILE_TYPES, MAX_ATTACHMENT_BYTES } from './config';
import { newId } from './ids';
import type { Attachment, AttachmentKind } from './types';

function extensionOf(name: string): string {
	const dot = name.lastIndexOf('.');
	return dot === -1 ? '' : name.slice(dot).toLowerCase();
}

/** Maps a file to a supported kind, or null when nothing accepts it. */
export function classifyFile(file: File): AttachmentKind | null {
	const ext = extensionOf(file.name);
	const mime = (file.type || '').toLowerCase();
	for (const type of ACCEPTED_FILE_TYPES) {
		if (type.extensions.includes(ext)) return type.kind;
	}
	for (const type of ACCEPTED_FILE_TYPES) {
		if (mime && type.mimePrefixes.some((prefix) => mime.startsWith(prefix))) return type.kind;
	}
	return null;
}

export interface FileValidation {
	ok: boolean;
	kind: AttachmentKind | null;
	/** Reason shown to the user when `ok` is false. */
	reason?: string;
}

export function validateFile(file: File): FileValidation {
	if (file.size > MAX_ATTACHMENT_BYTES) {
		return {
			ok: false,
			kind: classifyFile(file),
			reason: `${file.name} is larger than ${Math.round(MAX_ATTACHMENT_BYTES / (1024 * 1024))} MB.`
		};
	}
	const kind = classifyFile(file);
	if (!kind) {
		return { ok: false, kind: null, reason: `${file.name} is not a supported file type.` };
	}
	return { ok: true, kind };
}

/**
 * Turns selected files into `selected` attachments, rejecting unsupported ones
 * with an explicit status so the composer can show exactly what happened.
 */
export function toAttachments(files: File[]): Attachment[] {
	return files.map((file) => {
		const validation = validateFile(file);
		return {
			id: newId(),
			name: file.name,
			size: file.size,
			mimeType: file.type || 'unknown',
			kind: validation.kind ?? 'other',
			status: validation.ok ? 'selected' : 'rejected',
			detail: validation.ok ? undefined : validation.reason
		};
	});
}

export interface SubmitResult {
	attachments: Attachment[];
	/** Uploads that the storage service confirmed. Empty until one exists. */
	uploaded: number;
	/** User-facing notice explaining why nothing was stored. */
	notice?: string;
}

/**
 * The upload boundary. With no storage service configured every attachment is
 * returned as `failed` with an explanatory detail, and the caller keeps the
 * user's message text so nothing is lost.
 */
export async function submitAttachments(
	attachments: Attachment[],
	notice: string
): Promise<SubmitResult> {
	const pending = attachments.filter((a) => a.status !== 'rejected');
	if (pending.length === 0) {
		return { attachments, uploaded: 0 };
	}

	const resolved = attachments.map((a) =>
		a.status === 'rejected'
			? a
			: { ...a, status: 'failed' as const, detail: notice }
	);

	return { attachments: resolved, uploaded: 0, notice };
}

/** Human-readable summary of a file-kind group, for menu labels. */
export function describeAcceptedTypes(): string {
	return ACCEPTED_FILE_TYPES.map((t) => t.label).join(', ');
}
