/**
 * Chat-level configuration and the honest "what is connected" flags.
 *
 * The whole module reads its availability from here. Nothing is hard-coded as
 * working: with no backend configured the UI renders explicit configuration and
 * unavailable states instead of fabricating responses, uploads or transcription.
 */

import { NOT_CONNECTED } from '#lib/data/statusMessages';
import {
	isChatModelConfigured,
	isSupabaseConfigured as isSupabaseConfiguredShared
} from '#lib/shared/env';

/** Surface-level status strings specific to the Chats workspace. */
export const CHAT_STATUS = {
	/** Shown beside the composer while no intelligence service is configured. */
	modelUnavailable: 'The ARTI intelligence service is not configured yet.',
	/** Composer notice after a send attempt hits the unconfigured boundary. */
	notSent: NOT_CONNECTED.chat,
	uploadUnavailable: 'File uploads are not configured yet.',
	voiceUnavailable: NOT_CONNECTED.voice,
	/** Persistence-layer notices. */
	localOnly: 'Saved in this browser only — shared storage is not configured yet.',
	storageUnavailable: 'Conversation storage is unavailable, so history is not being saved.'
} as const;

/**
 * Whether the hosted intelligence service is configured.
 *
 * There is intentionally no default endpoint. When ARTI's privately hosted model
 * service exists, point `VITE_ARTI_CHAT_ENDPOINT` at it and implement the SSE
 * contract described in `service/chatService.ts`.
 */
export function isModelConfigured(): boolean {
	return isChatModelConfigured();
}

/** Whether a Supabase project is configured for shared storage. */
export function isSupabaseConfigured(): boolean {
	return isSupabaseConfiguredShared();
}

/** Maximum accepted attachment size (25 MB). */
export const MAX_ATTACHMENT_BYTES = 25 * 1024 * 1024;

/**
 * File kinds accepted by the picker and client-side pre-validation.
 *
 * `accept` values are the extension/MIME patterns handed to the file input. The
 * `validate` predicate is a convenience check for immediate feedback only — the
 * repository/service boundary must re-validate every upload, because neither the
 * filename nor the browser MIME type can be trusted.
 */
export interface AcceptedFileType {
	kind: import('./types').AttachmentKind;
	label: string;
	accept: string;
	extensions: string[];
	mimePrefixes: string[];
}

export const ACCEPTED_FILE_TYPES: AcceptedFileType[] = [
	{ kind: 'image', label: 'Images', accept: 'image/*', extensions: ['.png', '.jpg', '.jpeg', '.gif', '.webp'], mimePrefixes: ['image/'] },
	{ kind: 'document', label: 'Documents & PDFs', accept: '.pdf,.doc,.docx,.rtf,.odt', extensions: ['.pdf', '.doc', '.docx', '.rtf', '.odt'], mimePrefixes: ['application/pdf'] },
	{ kind: 'text', label: 'Text & Markdown', accept: '.txt,.md,.markdown', extensions: ['.txt', '.md', '.markdown'], mimePrefixes: ['text/plain', 'text/markdown'] },
	{ kind: 'data', label: 'Data & spreadsheets', accept: '.csv,.tsv,.json,.xlsx', extensions: ['.csv', '.tsv', '.json', '.xlsx'], mimePrefixes: ['text/csv', 'application/json'] },
	{ kind: 'code', label: 'Source code', accept: '.ts,.tsx,.js,.jsx,.py,.rb,.go,.rs,.java,.c,.cpp,.h,.css,.html,.sh,.sql,.yml,.yaml', extensions: ['.ts', '.tsx', '.js', '.jsx', '.py', '.rb', '.go', '.rs', '.java', '.c', '.cpp', '.h', '.css', '.html', '.sh', '.sql', '.yml', '.yaml'], mimePrefixes: ['text/'] }
];

/** `accept` attribute for the composer's file input, derived from the table above. */
export const ATTACHMENT_ACCEPT = ACCEPTED_FILE_TYPES.map((t) => t.accept).join(',');
