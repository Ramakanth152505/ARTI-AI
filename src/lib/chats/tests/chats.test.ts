/**
 * Unit tests for the pure Chats logic.
 *
 * These exercise the real modules (no mocks): search, titling, time formatting,
 * folder-name validation, attachment pre-validation and the honest upload
 * boundary. DOM-dependent code (markdown sanitisation, the reactive state class)
 * is covered by the browser QA pass instead, since it needs a real DOM.
 */

import { describe, expect, it } from 'vitest';
import {
	buildSnippet,
	deriveTitle,
	escapeRegExp,
	formatBytes,
	messageMatches,
	normaliseQuery,
	relativeTime,
	searchConversations,
	validateFolderName
} from '#lib/chats/search';
import { classifyFile, submitAttachments, toAttachments, validateFile } from '#lib/chats/attachments';
import { MAX_ATTACHMENT_BYTES } from '#lib/chats/config';
import type { ChatMessage, Conversation } from '#lib/chats/types';

function makeConversation(id: string, title: string): Conversation {
	const now = new Date().toISOString();
	return {
		id,
		ownerId: 'w',
		title,
		titleIsAuto: false,
		createdAt: now,
		updatedAt: now,
		pinned: false,
		archived: false,
		folderId: null
	};
}

function makeMessage(id: string, conversationId: string, content: string): ChatMessage {
	const now = new Date().toISOString();
	return {
		id,
		conversationId,
		role: 'user',
		content,
		status: 'complete',
		createdAt: now,
		updatedAt: now,
		attachments: [],
		toolIds: [],
		toolRuns: [],
		citations: []
	};
}

/** Minimal File stand-in: name, size and MIME type are all the logic reads. */
function fakeFile(name: string, type: string, size = 1024): File {
	return { name, type, size } as File;
}

describe('query normalisation', () => {
	it('trims and collapses whitespace', () => {
		expect(normaliseQuery('  hello   world  ')).toBe('hello world');
	});

	it('escapes regular-expression metacharacters', () => {
		expect(escapeRegExp('a.b*c(')).toBe('a\\.b\\*c\\(');
		// The escaped form must be safe to compile.
		expect(() => new RegExp(escapeRegExp('a.b*c('))).not.toThrow();
	});
});

describe('searchConversations', () => {
	const conversations = [
		makeConversation('c1', 'Quarterly plan'),
		makeConversation('c2', 'Unrelated title')
	];
	const messages = new Map<string, ChatMessage[]>([
		['c1', [makeMessage('m1', 'c1', 'Budget notes')]],
		['c2', [makeMessage('m2', 'c2', 'The QUARTERLY revenue figures')]]
	]);

	it('is case-insensitive', () => {
		const results = searchConversations(conversations, messages, 'quarterly');
		expect(results).toHaveLength(2);
	});

	it('matches titles first and reports which field matched', () => {
		const results = searchConversations(conversations, messages, 'plan');
		expect(results).toHaveLength(1);
		expect(results[0].matchedOn).toBe('title');
	});

	it('matches message content with a snippet', () => {
		const results = searchConversations(conversations, messages, 'revenue');
		expect(results).toHaveLength(1);
		expect(results[0].conversation.id).toBe('c2');
		expect(results[0].matchedOn).toBe('message');
		expect(results[0].snippet).toContain('revenue');
	});

	it('returns nothing for a blank query or no match', () => {
		expect(searchConversations(conversations, messages, '   ')).toHaveLength(0);
		expect(searchConversations(conversations, messages, 'zzz')).toHaveLength(0);
	});

	it('handles special characters without throwing', () => {
		expect(() => searchConversations(conversations, messages, 'a.b*c(')).not.toThrow();
	});

	it('only searches conversations it is given (scope is caller-enforced)', () => {
		const results = searchConversations([conversations[0]], messages, 'revenue');
		expect(results).toHaveLength(0);
	});
});

describe('messageMatches and buildSnippet', () => {
	it('does not match an empty query', () => {
		expect(messageMatches(makeMessage('m', 'c', 'text'), '')).toBe(false);
	});

	it('centres the snippet on the match', () => {
		const content = `${'x'.repeat(200)}needle${'y'.repeat(200)}`;
		const snippet = buildSnippet(content, 'needle', 20);
		expect(snippet).toContain('needle');
		expect(snippet.startsWith('…')).toBe(true);
		expect(snippet.endsWith('…')).toBe(true);
	});
});

describe('deriveTitle', () => {
	it('uses the placeholder for empty input', () => {
		expect(deriveTitle('   ')).toBe('New chat');
	});

	it('collapses whitespace and truncates long input', () => {
		expect(deriveTitle('hello\n\nworld')).toBe('hello world');
		expect(deriveTitle('a'.repeat(80)).endsWith('…')).toBe(true);
	});
});

describe('relativeTime', () => {
	const base = Date.parse('2026-01-01T12:00:00.000Z');
	it('formats recent times in human units', () => {
		expect(relativeTime(new Date(base - 5_000).toISOString(), base)).toBe('just now');
		expect(relativeTime(new Date(base - 5 * 60_000).toISOString(), base)).toBe('5m ago');
		expect(relativeTime(new Date(base - 3 * 3_600_000).toISOString(), base)).toBe('3h ago');
		expect(relativeTime(new Date(base - 2 * 86_400_000).toISOString(), base)).toBe('2d ago');
	});

	it('returns an empty string for an invalid date', () => {
		expect(relativeTime('not-a-date', base)).toBe('');
	});
});

describe('formatBytes', () => {
	it('formats sizes across units', () => {
		expect(formatBytes(0)).toBe('0 B');
		expect(formatBytes(512)).toBe('512 B');
		expect(formatBytes(2048)).toBe('2 KB');
		expect(formatBytes(5 * 1024 * 1024)).toBe('5 MB');
	});
});

describe('validateFolderName', () => {
	const existing = [{ id: 'f1', name: 'Work' }];

	it('rejects empty and whitespace-only names', () => {
		expect(validateFolderName('', existing)).toBe('empty');
		expect(validateFolderName('   ', existing)).toBe('empty');
	});

	it('rejects duplicates case-insensitively and ignoring surrounding space', () => {
		expect(validateFolderName('work', existing)).toBe('duplicate');
		expect(validateFolderName('  WORK ', existing)).toBe('duplicate');
	});

	it('allows the same name when renaming the folder itself', () => {
		expect(validateFolderName('Work', existing, { ignoreId: 'f1' })).toBeNull();
	});

	it('rejects overly long names', () => {
		expect(validateFolderName('a'.repeat(41), existing)).toBe('too-long');
	});

	it('accepts a valid new name', () => {
		expect(validateFolderName('Personal', existing)).toBeNull();
	});
});

describe('attachment pre-validation', () => {
	it('classifies supported files by extension', () => {
		expect(classifyFile(fakeFile('notes.md', ''))).toBe('text');
		expect(classifyFile(fakeFile('data.csv', ''))).toBe('data');
		expect(classifyFile(fakeFile('main.ts', ''))).toBe('code');
		expect(classifyFile(fakeFile('photo.png', 'image/png'))).toBe('image');
	});

	it('classifies by MIME type when the extension is unknown', () => {
		expect(classifyFile(fakeFile('blob', 'image/jpeg'))).toBe('image');
	});

	it('rejects unsupported files', () => {
		const result = validateFile(fakeFile('archive.zip', 'application/zip'));
		expect(result.ok).toBe(false);
		expect(result.reason).toContain('not a supported file type');
	});

	it('rejects files over the size limit', () => {
		const result = validateFile(fakeFile('big.csv', 'text/csv', MAX_ATTACHMENT_BYTES + 1));
		expect(result.ok).toBe(false);
		expect(result.reason).toContain('larger than');
	});

	it('marks unsupported selections as rejected, with a reason', () => {
		const attachments = toAttachments([fakeFile('ok.txt', 'text/plain'), fakeFile('bad.zip', 'application/zip')]);
		expect(attachments[0].status).toBe('selected');
		expect(attachments[1].status).toBe('rejected');
		expect(attachments[1].detail).toBeTruthy();
	});
});

describe('submitAttachments is honest about uploads', () => {
	it('never reports an upload as successful without a storage service', async () => {
		const attachments = toAttachments([fakeFile('ok.txt', 'text/plain')]);
		const result = await submitAttachments(attachments, 'Uploads are not configured.');
		expect(result.uploaded).toBe(0);
		expect(result.attachments[0].status).toBe('failed');
		expect(result.notice).toBe('Uploads are not configured.');
	});

	it('leaves rejected files rejected and untouched', async () => {
		const attachments = toAttachments([fakeFile('bad.zip', 'application/zip')]);
		const result = await submitAttachments(attachments, 'n/a');
		expect(result.attachments[0].status).toBe('rejected');
	});
});
