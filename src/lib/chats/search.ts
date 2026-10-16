/**
 * Pure helpers for conversation search, titling and folder-name validation. Kept
 * free of DOM and storage so they are directly unit-testable.
 *
 * `relativeTime` and `formatBytes` are re-exported from the shared module so
 * Chats and Images format values identically; the existing `#lib/chats/search`
 * import path is preserved.
 */

import type { ChatMessage, Conversation } from './types';

export { formatBytes, relativeTime } from '#lib/shared/text';

/** Escapes user text before it is used inside a regular expression. */
export function escapeRegExp(input: string): string {
	return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Normalises a search query: trims ends and collapses internal whitespace. */
export function normaliseQuery(query: string): string {
	return query.replace(/\s+/g, ' ').trim();
}

/** Case-insensitive substring test over a message's content. */
export function messageMatches(message: ChatMessage, query: string): boolean {
	const q = normaliseQuery(query).toLowerCase();
	if (!q) return false;
	return message.content.toLowerCase().includes(q);
}

export interface SearchResult {
	conversation: Conversation;
	/** Which field matched: the title, or the content of a message. */
	matchedOn: 'title' | 'message';
	/** Short excerpt around the match for message hits. */
	snippet?: string;
}

/**
 * Searches the available data scope: conversation titles plus message content.
 * Callers supply only conversations already visible to the current user, so
 * results cannot cross a workspace boundary.
 */
export function searchConversations(
	conversations: Conversation[],
	messagesByConversation: Map<string, ChatMessage[]>,
	query: string
): SearchResult[] {
	const q = normaliseQuery(query).toLowerCase();
	if (!q) return [];

	const results: SearchResult[] = [];
	for (const conversation of conversations) {
		if (conversation.title.toLowerCase().includes(q)) {
			results.push({ conversation, matchedOn: 'title' });
			continue;
		}
		const messages = messagesByConversation.get(conversation.id) ?? [];
		const hit = messages.find((m) => messageMatches(m, q));
		if (hit) {
			results.push({
				conversation,
				matchedOn: 'message',
				snippet: buildSnippet(hit.content, q)
			});
		}
	}
	return results;
}

/** Excerpt of roughly `radius` characters around the first match. */
export function buildSnippet(content: string, query: string, radius = 60): string {
	const flat = content.replace(/\s+/g, ' ').trim();
	const index = flat.toLowerCase().indexOf(query.toLowerCase());
	if (index === -1) return flat.slice(0, radius * 2);
	const start = Math.max(0, index - radius);
	const end = Math.min(flat.length, index + query.length + radius);
	return `${start > 0 ? '…' : ''}${flat.slice(start, end)}${end < flat.length ? '…' : ''}`;
}

/**
 * Derives a conversation title from the first user message, used only as a
 * local convenience until a real title service exists.
 */
export function deriveTitle(content: string, max = 48): string {
	const flat = content.replace(/\s+/g, ' ').trim();
	if (!flat) return 'New chat';
	return flat.length > max ? `${flat.slice(0, max - 1)}…` : flat;
}



export type FolderNameError = 'empty' | 'too-long' | 'duplicate' | null;

/**
 * Validates a folder name against the existing folders.
 *
 * Comparison is case-insensitive and whitespace-trimmed so "Work" and " work "
 * are not allowed to become two look-alike folders.
 */
export function validateFolderName(
	name: string,
	existing: { id: string; name: string }[],
	options: { ignoreId?: string; maxLength?: number } = {}
): FolderNameError {
	const trimmed = name.trim();
	const max = options.maxLength ?? 40;
	if (!trimmed) return 'empty';
	if (trimmed.length > max) return 'too-long';
	const lower = trimmed.toLowerCase();
	const clash = existing.some((f) => f.id !== options.ignoreId && f.name.trim().toLowerCase() === lower);
	return clash ? 'duplicate' : null;
}
