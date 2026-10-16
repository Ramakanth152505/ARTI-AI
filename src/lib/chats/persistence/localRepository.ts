/**
 * Browser-local implementation of `ChatRepository`.
 *
 * This is the live backend until Supabase is configured. It is honest about what
 * it is: single-browser storage, not shared, and not an authorization boundary.
 * Access is still scoped per workspace key so that switching workspaces cannot
 * read another workspace's records from the same browser, and the shape of the
 * calls matches the future server implementation.
 *
 * Nothing here is considered trusted input when it is read back: stored records
 * are validated and normalised before use, so a hand-edited or corrupted
 * localStorage entry cannot inject unexpected objects into the UI.
 */

import type { ChatRepository } from './repository';
import type {
	ChatMessage,
	Conversation,
	ConversationPatch,
	Folder,
	MessagePatch,
	WorkspaceScope
} from '../types';

interface StoreShape {
	conversations: Conversation[];
	messages: ChatMessage[];
	folders: Folder[];
}

const EMPTY_STORE: StoreShape = { conversations: [], messages: [], folders: [] };
const KEY_PREFIX = 'arti.chats.v1';

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}

function asString(value: unknown, fallback = ''): string {
	return typeof value === 'string' ? value : fallback;
}

function asBoolean(value: unknown): boolean {
	return value === true;
}

/** Normalise a raw stored conversation; rejects anything without a usable id. */
function normaliseConversation(raw: unknown): Conversation | null {
	if (!isRecord(raw)) return null;
	const id = asString(raw.id);
	const ownerId = asString(raw.ownerId);
	if (!id || !ownerId) return null;
	return {
		id,
		ownerId,
		title: asString(raw.title) || 'New chat',
		titleIsAuto: asBoolean(raw.titleIsAuto),
		createdAt: asString(raw.createdAt, new Date().toISOString()),
		updatedAt: asString(raw.updatedAt, new Date().toISOString()),
		pinned: asBoolean(raw.pinned),
		archived: asBoolean(raw.archived),
		folderId: typeof raw.folderId === 'string' ? raw.folderId : null
	};
}

function normaliseMessage(raw: unknown): ChatMessage | null {
	if (!isRecord(raw)) return null;
	const id = asString(raw.id);
	const conversationId = asString(raw.conversationId);
	if (!id || !conversationId) return null;
	const role = raw.role === 'assistant' || raw.role === 'system' ? raw.role : 'user';
	const status =
		raw.status === 'streaming' || raw.status === 'stopped' || raw.status === 'error'
			? raw.status
			: 'complete';
	return {
		id,
		conversationId,
		role,
		content: asString(raw.content),
		// A reload can never resume a live stream, so an in-flight message is
		// recorded as stopped rather than left permanently "generating".
		status: status === 'streaming' ? 'stopped' : status,
		createdAt: asString(raw.createdAt, new Date().toISOString()),
		updatedAt: asString(raw.updatedAt, new Date().toISOString()),
		replyTo: typeof raw.replyTo === 'string' ? raw.replyTo : undefined,
		attachments: Array.isArray(raw.attachments) ? (raw.attachments as ChatMessage['attachments']) : [],
		toolIds: Array.isArray(raw.toolIds) ? (raw.toolIds as string[]) : [],
		toolRuns: Array.isArray(raw.toolRuns) ? (raw.toolRuns as ChatMessage['toolRuns']) : [],
		citations: Array.isArray(raw.citations) ? (raw.citations as ChatMessage['citations']) : [],
		error: typeof raw.error === 'string' ? raw.error : undefined
	};
}

function normaliseFolder(raw: unknown): Folder | null {
	if (!isRecord(raw)) return null;
	const id = asString(raw.id);
	const ownerId = asString(raw.ownerId);
	const name = asString(raw.name);
	if (!id || !ownerId || !name) return null;
	return {
		id,
		ownerId,
		name,
		createdAt: asString(raw.createdAt, new Date().toISOString()),
		updatedAt: asString(raw.updatedAt, new Date().toISOString())
	};
}

function normaliseStore(value: unknown): StoreShape {
	if (!isRecord(value)) return { ...EMPTY_STORE };
	const conversations = Array.isArray(value.conversations)
		? value.conversations.map(normaliseConversation).filter((c): c is Conversation => c !== null)
		: [];
	const messages = Array.isArray(value.messages)
		? value.messages.map(normaliseMessage).filter((m): m is ChatMessage => m !== null)
		: [];
	const folders = Array.isArray(value.folders)
		? value.folders.map(normaliseFolder).filter((f): f is Folder => f !== null)
		: [];
	return { conversations, messages, folders };
}

/** localStorage availability is probed once; private mode can make it throw. */
function storageAvailable(): boolean {
	try {
		const probe = '__arti_probe__';
		window.localStorage.setItem(probe, '1');
		window.localStorage.removeItem(probe);
		return true;
	} catch {
		return false;
	}
}

function scopeKey(scope: WorkspaceScope): string {
	return `${KEY_PREFIX}:${scope.workspaceId}:${scope.userId ?? 'anonymous'}`;
}

/**
 * Owner recorded on each record. The workspace id is the ownership marker, not
 * the presentation profile: the store is already partitioned by the full scope
 * key, so records can never leak between workspaces in the same browser.
 */
function ownerKey(scope: WorkspaceScope): string {
	return scope.workspaceId;
}

export class LocalChatRepository implements ChatRepository {
	readonly label = 'This browser';
	readonly persistent: boolean;
	readonly shared = false;

	private readonly key: string;
	private available: boolean;

	constructor(scope: WorkspaceScope) {
		this.key = scopeKey(scope);
		this.available = typeof window !== 'undefined' && storageAvailable();
		this.persistent = this.available;
	}

	private read(): StoreShape {
		if (!this.available) return { ...EMPTY_STORE };
		try {
			const raw = window.localStorage.getItem(this.key);
			if (!raw) return { ...EMPTY_STORE };
			return normaliseStore(JSON.parse(raw));
		} catch {
			// A corrupt payload must not break the page; start clean and remember
			// that writing is no longer safe for this session.
			this.available = false;
			return { ...EMPTY_STORE };
		}
	}

	private write(store: StoreShape): boolean {
		if (!this.available) return false;
		try {
			window.localStorage.setItem(this.key, JSON.stringify(store));
			return true;
		} catch {
			// Quota exceeded or storage revoked: report the failure rather than
			// pretending the record was saved.
			this.available = false;
			return false;
		}
	}

	async listConversations(scope: WorkspaceScope): Promise<Conversation[]> {
		return this.read().conversations.filter((c) => c.ownerId === ownerKey(scope));
	}

	async getConversation(scope: WorkspaceScope, id: string): Promise<Conversation | null> {
		const found = this.read().conversations.find((c) => c.id === id && c.ownerId === ownerKey(scope));
		return found ?? null;
	}

	async createConversation(_scope: WorkspaceScope, conversation: Conversation): Promise<Conversation> {
		const store = this.read();
		if (!store.conversations.some((c) => c.id === conversation.id)) {
			store.conversations.push(conversation);
			this.write(store);
		}
		return conversation;
	}

	async updateConversation(
		_scope: WorkspaceScope,
		id: string,
		patch: ConversationPatch
	): Promise<Conversation | null> {
		const store = this.read();
		const index = store.conversations.findIndex((c) => c.id === id);
		if (index === -1) return null;
		const next: Conversation = {
			...store.conversations[index],
			...patch,
			updatedAt: new Date().toISOString()
		};
		store.conversations[index] = next;
		this.write(store);
		return next;
	}

	async deleteConversation(_scope: WorkspaceScope, id: string): Promise<void> {
		const store = this.read();
		store.conversations = store.conversations.filter((c) => c.id !== id);
		store.messages = store.messages.filter((m) => m.conversationId !== id);
		this.write(store);
	}

	async listMessages(_scope: WorkspaceScope, conversationId: string): Promise<ChatMessage[]> {
		return this.read()
			.messages.filter((m) => m.conversationId === conversationId)
			.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
	}

	async appendMessage(_scope: WorkspaceScope, message: ChatMessage): Promise<ChatMessage> {
		const store = this.read();
		if (!store.messages.some((m) => m.id === message.id)) {
			store.messages.push(message);
			this.write(store);
		}
		return message;
	}

	async updateMessage(_scope: WorkspaceScope, id: string, patch: MessagePatch): Promise<ChatMessage | null> {
		const store = this.read();
		const index = store.messages.findIndex((m) => m.id === id);
		if (index === -1) return null;
		const next: ChatMessage = {
			...store.messages[index],
			...patch,
			error: patch.error === null ? undefined : (patch.error ?? store.messages[index].error),
			updatedAt: new Date().toISOString()
		};
		store.messages[index] = next;
		this.write(store);
		return next;
	}

	async deleteMessage(_scope: WorkspaceScope, id: string): Promise<void> {
		const store = this.read();
		store.messages = store.messages.filter((m) => m.id !== id);
		this.write(store);
	}

	async listFolders(scope: WorkspaceScope): Promise<Folder[]> {
		return this.read().folders.filter((f) => f.ownerId === ownerKey(scope));
	}

	async createFolder(_scope: WorkspaceScope, folder: Folder): Promise<Folder> {
		const store = this.read();
		if (!store.folders.some((f) => f.id === folder.id)) {
			store.folders.push(folder);
			this.write(store);
		}
		return folder;
	}

	async updateFolder(_scope: WorkspaceScope, id: string, patch: { name?: string }): Promise<Folder | null> {
		const store = this.read();
		const index = store.folders.findIndex((f) => f.id === id);
		if (index === -1) return null;
		const next: Folder = {
			...store.folders[index],
			...patch,
			updatedAt: new Date().toISOString()
		};
		store.folders[index] = next;
		this.write(store);
		return next;
	}

	async deleteFolder(_scope: WorkspaceScope, id: string): Promise<void> {
		const store = this.read();
		store.folders = store.folders.filter((f) => f.id !== id);
		// Conversations are intentionally untouched: deleting a folder never
		// silently deletes chats. The caller re-files them.
		this.write(store);
	}
}
