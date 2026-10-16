/**
 * Pure helpers for image-conversation search and titling. Kept free of DOM and
 * storage so they are directly unit-testable.
 */

import type { ImageConversation, ImageMessage } from './types';

/** Normalises a search query: trims ends and collapses internal whitespace. */
export function normaliseQuery(query: string): string {
        return query.replace(/\s+/g, ' ').trim();
}

/** Case-insensitive substring test over a message's content or prompt. */
export function messageMatches(message: ImageMessage, query: string): boolean {
        const q = normaliseQuery(query).toLowerCase();
        if (!q) return false;
        if (message.content.toLowerCase().includes(q)) return true;
        return message.assets.some((asset) => asset.prompt.toLowerCase().includes(q));
}

export interface ImageSearchResult {
        conversation: ImageConversation;
        /** Which field matched: the title, or a message/prompt. */
        matchedOn: 'title' | 'message';
        snippet?: string;
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
 * Searches conversation titles plus message content and prompts. Callers supply
 * only conversations already visible to the current user, so results cannot cross
 * a workspace boundary.
 */
export function searchImageConversations(
        conversations: ImageConversation[],
        messagesByConversation: Map<string, ImageMessage[]>,
        query: string
): ImageSearchResult[] {
        const q = normaliseQuery(query).toLowerCase();
        if (!q) return [];

        const results: ImageSearchResult[] = [];
        for (const conversation of conversations) {
                if (conversation.title.toLowerCase().includes(q)) {
                        results.push({ conversation, matchedOn: 'title' });
                        continue;
                }
                const messages = messagesByConversation.get(conversation.id) ?? [];
                const hit = messages.find((m) => messageMatches(m, q));
                if (hit) {
                        const source = hit.content || hit.assets[0]?.prompt || '';
                        results.push({
                                conversation,
                                matchedOn: 'message',
                                snippet: buildSnippet(source, q)
                        });
                }
        }
        return results;
}

/** Derives a conversation title from the first prompt, truncated on a word boundary. */
export function deriveTitle(content: string, max = 48): string {
        const flat = content.replace(/\s+/g, ' ').trim();
        if (!flat) return 'New image';
        return flat.length > max ? `${flat.slice(0, max - 1).trimEnd()}…` : flat;
}

/** Counts images actually produced across a set of messages. */
export function countReadyAssets(messages: ImageMessage[]): number {
        return messages.reduce((total, m) => total + m.assets.filter((a) => a.status === 'ready').length, 0);
}
