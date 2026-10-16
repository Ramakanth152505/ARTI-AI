/**
 * Chats module state.
 *
 * One class owns the conversation list, the folders, the per-conversation
 * message cache and the in-flight generation. Components only call methods and
 * read derived values; no component talks to the repository or the service
 * directly. That separation is what keeps UI, persistence and the model call
 * independently replaceable.
 *
 * Honesty rules encoded here:
 *  - A generation only becomes `complete` if a real service produced it.
 *  - With no model configured, a send produces an explicit failure record, never
 *    invented assistant text.
 *  - With no storage configured, records are marked browser-local and the UI is
 *    told, rather than implying shared persistence.
 */

import { CHAT_STATUS, isModelConfigured, isSupabaseConfigured } from './config';
import { newId, newRequestId } from './ids';
import {
	deriveTitle,
	normaliseQuery,
	searchConversations,
	type SearchResult
} from './search';
import {
	ChatServiceError,
	streamChatResponse,
	toUserSafeMessage,
	type StreamEvent
} from './service/chatService';
import { getChatRepository, WORKSPACE_ID } from './workspace';
import type { ChatRepository } from './persistence/repository';
import type {
	Attachment,
	ChatMessage,
	Citation,
	Conversation,
	Folder,
	ToolRun,
	WorkspaceScope
} from './types';

/** Which list the history sidebar is showing. */
export type HistoryFilter = 'all' | 'archived';

interface StorageNotice {
	tone: 'info' | 'warning';
	text: string;
}

export class ChatsState {
	private repository: ChatRepository = getChatRepository();

	/** Conversations for the current scope, most recently updated first. */
	conversations = $state<Conversation[]>([]);
	folders = $state<Folder[]>([]);

	/** Message cache keyed by conversation id. */
	messages = $state<Record<string, ChatMessage[]>>({});

	activeConversationId = $state<string | null>(null);

	loadingHistory = $state(true);
	loadingMessages = $state(false);

	/** Non-null when the last persistence operation failed. */
	storageError = $state<string | null>(null);

	/** Search. */
	searchQuery = $state('');
	searchResults = $state<SearchResult[]>([]);
	searching = $state(false);
	private searchToken = 0;

	/** Generation. */
	generating = $state(false);
	private abortController: AbortController | null = null;
	private activeRequestId: string | null = null;

	/** Whether the intelligence service is configured, resolved once at startup. */
	readonly modelConfigured = isModelConfigured();

	// --- Derived views ------------------------------------------------------

	activeConversation = $derived(
		this.conversations.find((c) => c.id === this.activeConversationId) ?? null
	);

	activeMessages = $derived(
		this.activeConversationId ? (this.messages[this.activeConversationId] ?? []) : []
	);

	pinnedConversations = $derived(
		this.conversations.filter((c) => c.pinned && !c.archived).sort(byUpdatedDesc)
	);

	unfiledConversations = $derived(
		this.conversations.filter((c) => !c.folderId && !c.pinned && !c.archived).sort(byUpdatedDesc)
	);

	archivedConversations = $derived(this.conversations.filter((c) => c.archived).sort(byUpdatedDesc));

	/** Conversations grouped by folder id, newest first. */
	folderContents = $derived.by(() => {
		const map: Record<string, Conversation[]> = {};
		for (const folder of this.folders) map[folder.id] = [];
		for (const conversation of this.conversations) {
			if (conversation.folderId && !conversation.archived && map[conversation.folderId]) {
				map[conversation.folderId].push(conversation);
			}
		}
		for (const id of Object.keys(map)) map[id].sort(byUpdatedDesc);
		return map;
	});

	/** Conversations that currently have any messages, for title/preview lookups. */
	previewFor(id: string): string {
		const list = this.messages[id] ?? [];
		const last = list[list.length - 1];
		if (!last) return '';
		return last.content.replace(/\s+/g, ' ').trim().slice(0, 100);
	}

	/** Honest storage notice, shown in the history sidebar. */
	storageNotice = $derived.by((): StorageNotice => {
		if (this.storageError) return { tone: 'warning', text: this.storageError };
		if (!this.repository.persistent) return { tone: 'warning', text: CHAT_STATUS.storageUnavailable };
		if (!this.repository.shared) return { tone: 'info', text: CHAT_STATUS.localOnly };
		return { tone: 'info', text: '' };
	});

	readonly storageLabel = $derived(this.repository.label);

	// --- Lifecycle ----------------------------------------------------------

	async init(): Promise<void> {
		this.loadingHistory = true;
		this.storageError = null;
		try {
			const [conversations, folders] = await Promise.all([
				this.repository.listConversations(this.scope()),
				this.repository.listFolders(this.scope())
			]);
			this.conversations = conversations;
			this.folders = folders;

			const first = [...conversations].sort(byUpdatedDesc)[0];
			if (first) {
				await this.selectConversation(first.id);
			}
		} catch {
			this.storageError = CHAT_STATUS.storageUnavailable;
		} finally {
			this.loadingHistory = false;
		}
	}

	private scope(): WorkspaceScope {
		return this.currentScopeValue();
	}

	/**
	 * The scope every repository call is made under. A real authenticated user id
	 * is threaded in here once auth exists; until then it is explicitly null.
	 */
	private currentScopeValue(): WorkspaceScope {
		return { workspaceId: WORKSPACE_ID, userId: null };
	}

	// --- Conversation list --------------------------------------------------

	/**
	 * Creates or focuses an empty conversation.
	 *
	 * If the active conversation is already empty and still auto-titled, it is
	 * reused instead of creating a duplicate — repeated clicks on "New chat"
	 * cannot accumulate empty records.
	 */
	async newConversation(): Promise<string> {
		const active = this.conversations.find((c) => c.id === this.activeConversationId);
		if (active && active.titleIsAuto && (this.messages[active.id]?.length ?? 0) === 0) {
			return active.id;
		}

		const now = new Date().toISOString();
		const conversation: Conversation = {
			id: newId(),
			ownerId: this.currentScopeValue().workspaceId,
			title: 'New chat',
			titleIsAuto: true,
			createdAt: now,
			updatedAt: now,
			pinned: false,
			archived: false,
			folderId: null
		};

		try {
			await this.repository.createConversation(this.scope(), conversation);
		} catch {
			this.storageError = CHAT_STATUS.storageUnavailable;
		}
		this.conversations = [conversation, ...this.conversations];
		this.messages = { ...this.messages, [conversation.id]: [] };
		this.activeConversationId = conversation.id;
		this.storageError = null;
		return conversation.id;
	}

	async selectConversation(id: string): Promise<void> {
		this.activeConversationId = id;
		if (this.messages[id]) return;
		this.loadingMessages = true;
		try {
			const messages = await this.repository.listMessages(this.scope(), id);
			this.messages = { ...this.messages, [id]: messages };
		} catch {
			this.storageError = CHAT_STATUS.storageUnavailable;
			this.messages = { ...this.messages, [id]: [] };
		} finally {
			this.loadingMessages = false;
		}
	}

	private async patchConversation(id: string, patch: Partial<Conversation>): Promise<void> {
		const index = this.conversations.findIndex((c) => c.id === id);
		if (index === -1) return;
		const optimistic: Conversation = { ...this.conversations[index], ...patch, updatedAt: new Date().toISOString() };
		const next = [...this.conversations];
		next[index] = optimistic;
		this.conversations = next;
		try {
			await this.repository.updateConversation(this.scope(), id, patch);
		} catch {
			this.storageError = CHAT_STATUS.storageUnavailable;
		}
	}

	async renameConversation(id: string, title: string): Promise<void> {
		const trimmed = title.trim();
		if (!trimmed) return;
		await this.patchConversation(id, { title: trimmed, titleIsAuto: false });
	}

	async togglePin(id: string): Promise<void> {
		const conversation = this.conversations.find((c) => c.id === id);
		if (!conversation) return;
		await this.patchConversation(id, { pinned: !conversation.pinned });
	}

	async setArchived(id: string, archived: boolean): Promise<void> {
		const conversation = this.conversations.find((c) => c.id === id);
		if (!conversation) return;
		// Archiving also clears the pin so an archived chat cannot sit in the
		// pinned section; unarchiving leaves the (now cleared) pin as-is.
		await this.patchConversation(id, archived ? { archived: true, pinned: false } : { archived: false });
	}

	async moveToFolder(id: string, folderId: string | null): Promise<void> {
		await this.patchConversation(id, { folderId });
	}

	/** Deletes a conversation and always leaves a valid selection behind. */
	async deleteConversation(id: string): Promise<void> {
		const remaining = this.conversations.filter((c) => c.id !== id);
		this.conversations = remaining;
		const nextMessages = { ...this.messages };
		delete nextMessages[id];
		this.messages = nextMessages;

		try {
			await this.repository.deleteConversation(this.scope(), id);
		} catch {
			this.storageError = CHAT_STATUS.storageUnavailable;
		}

		if (this.activeConversationId === id) {
			const next = [...remaining].sort(byUpdatedDesc)[0];
			this.activeConversationId = null;
			if (next) {
				await this.selectConversation(next.id);
			}
		}
	}

	// --- Folders ------------------------------------------------------------

	async createFolder(name: string): Promise<Folder | null> {
		const trimmed = name.trim();
		if (!trimmed) return null;
		const now = new Date().toISOString();
		const folder: Folder = {
			id: newId(),
			ownerId: this.currentScopeValue().workspaceId,
			name: trimmed,
			createdAt: now,
			updatedAt: now
		};
		try {
			await this.repository.createFolder(this.scope(), folder);
		} catch {
			this.storageError = CHAT_STATUS.storageUnavailable;
		}
		this.folders = [...this.folders, folder];
		return folder;
	}

	async renameFolder(id: string, name: string): Promise<void> {
		const trimmed = name.trim();
		if (!trimmed) return;
		this.folders = this.folders.map((f) => (f.id === id ? { ...f, name: trimmed } : f));
		try {
			await this.repository.updateFolder(this.scope(), id, { name: trimmed });
		} catch {
			this.storageError = CHAT_STATUS.storageUnavailable;
		}
	}

	/**
	 * Deletes a folder, moving any contained conversations to Unfiled.
	 * Conversations are never deleted as a side effect of removing a folder.
	 */
	async deleteFolder(id: string): Promise<void> {
		const contained = this.conversations.filter((c) => c.folderId === id);
		for (const conversation of contained) {
			await this.patchConversation(conversation.id, { folderId: null });
		}
		this.folders = this.folders.filter((f) => f.id !== id);
		try {
			await this.repository.deleteFolder(this.scope(), id);
		} catch {
			this.storageError = CHAT_STATUS.storageUnavailable;
		}
	}

	// --- Search -------------------------------------------------------------

	/**
	 * Searches titles and message content. Loads message lists for conversations
	 * that are not cached yet, which is why the result is asynchronous and the UI
	 * has a real loading state.
	 */
	async runSearch(query: string): Promise<void> {
		this.searchQuery = query;
		const normalised = normaliseQuery(query);
		if (!normalised) {
			this.searchResults = [];
			this.searching = false;
			return;
		}

		const token = ++this.searchToken;
		this.searching = true;

		const missing = this.conversations.filter((c) => !this.messages[c.id]);
		if (missing.length) {
			const loaded = await Promise.all(
				missing.map(async (c) => {
					try {
						const list = await this.repository.listMessages(this.scope(), c.id);
						return [c.id, list] as const;
					} catch {
						return [c.id, [] as ChatMessage[]] as const;
					}
				})
			);
			if (token !== this.searchToken) return;
			const next = { ...this.messages };
			for (const [id, list] of loaded) next[id] = list;
			this.messages = next;
		}

		const map = new Map<string, ChatMessage[]>();
		for (const conversation of this.conversations) {
			map.set(conversation.id, this.messages[conversation.id] ?? []);
		}
		const results = searchConversations(this.conversations, map, normalised);
		if (token !== this.searchToken) return;
		this.searchResults = results;
		this.searching = false;
	}

	clearSearch(): void {
		this.searchToken += 1;
		this.searchQuery = '';
		this.searchResults = [];
		this.searching = false;
	}

	// --- Messages and generation -------------------------------------------

	/**
	 * Sends a user message and starts a real assistant request when a service is
	 * configured. Without one, the user message is still saved and an explicit
	 * failure record is attached — the composer text is preserved by the caller
	 * until this resolves.
	 */
	async sendMessage(text: string, attachments: Attachment[] = []): Promise<void> {
		if (this.generating) return;
		const content = text.trim();
		if (!content && attachments.length === 0) return;

		const conversationId = this.activeConversationId ?? (await this.newConversation());
		const userMessage = this.buildMessage(conversationId, 'user', content, attachments);
		await this.appendMessage(userMessage);

		if (this.conversations.find((c) => c.id === conversationId)?.titleIsAuto) {
			await this.renameConversation(conversationId, deriveTitle(content || 'Attachment'));
		}

		await this.generateFor(userMessage);
	}

	/**
	 * Runs one assistant attempt for a user message. Shared by send, regenerate
	 * and retry so those three paths cannot drift apart.
	 */
	private async generateFor(userMessage: ChatMessage): Promise<void> {
		const conversationId = userMessage.conversationId;
		const assistant = this.buildMessage(conversationId, 'assistant', '', []);
		assistant.replyTo = userMessage.id;
		assistant.status = 'streaming';
		assistant.toolIds = userMessage.toolIds;

		if (!this.modelConfigured) {
			assistant.status = 'error';
			assistant.error = CHAT_STATUS.modelUnavailable;
			await this.appendMessage(assistant);
			return;
		}

		await this.appendMessage(assistant);
		this.generating = true;
		const controller = new AbortController();
		this.abortController = controller;
		const requestId = newRequestId();
		this.activeRequestId = requestId;

		let cancelled = false;
		let failed = false;
		let streamError: string | null = null;

		try {
			await streamChatResponse(
				{
					requestId,
					conversationId,
					messages: this.messages[conversationId] ?? [],
					toolIds: userMessage.toolIds,
					attachments: userMessage.attachments
				},
				{
					onEvent: (event) => this.applyStreamEvent(assistant.id, event),
					onClose: (reason) => {
						cancelled = reason === 'aborted';
						failed = reason === 'error';
					}
				},
				controller.signal
			);
		} catch (error) {
			failed = true;
			streamError = toUserSafeMessage(error);
		} finally {
			this.generating = false;
			this.abortController = null;
			this.activeRequestId = null;
		}

		await this.finaliseMessage(assistant.id, {
			status: cancelled ? 'stopped' : failed ? 'error' : 'complete',
			error: failed ? (streamError ?? 'The response could not be completed. Please try again.') : undefined
		});
	}

	private applyStreamEvent(messageId: string, event: StreamEvent): void {
		const message = this.findMessage(messageId);
		if (!message) return;
		switch (event.type) {
			case 'delta':
				this.replaceMessage({ ...message, content: message.content + event.text });
				break;
			case 'citation':
				this.replaceMessage({ ...message, citations: [...message.citations, event.citation] });
				break;
			case 'tool':
				this.replaceMessage({ ...message, toolRuns: upsertToolRun(message.toolRuns, event.run) });
				break;
			case 'error':
				this.replaceMessage({ ...message, status: 'error', error: event.message });
				break;
			case 'done':
				break;
		}
	}

	/** Stops the active generation and records the stopped state honestly. */
	stopGeneration(): void {
		if (!this.generating || !this.abortController) return;
		this.abortController.abort();
		this.abortController = null;
		this.generating = false;
	}

	/** Regenerates: a fresh attempt tied to the same user message, no new prompt. */
	async regenerate(assistantMessageId: string): Promise<void> {
		const message = this.findMessage(assistantMessageId);
		if (!message || message.role !== 'assistant' || !message.replyTo) return;
		const prompt = this.findMessage(message.replyTo);
		if (!prompt) return;
		await this.removeMessage(assistantMessageId);
		await this.generateFor(prompt);
	}

	/** Retries a failed attempt without duplicating the user message. */
	async retry(assistantMessageId: string): Promise<void> {
		await this.regenerate(assistantMessageId);
	}

	// --- Message helpers ----------------------------------------------------

	private buildMessage(
		conversationId: string,
		role: ChatMessage['role'],
		content: string,
		attachments: Attachment[]
	): ChatMessage {
		const now = new Date().toISOString();
		return {
			id: newId(),
			conversationId,
			role,
			content,
			status: 'complete',
			createdAt: now,
			updatedAt: now,
			attachments,
			toolIds: [],
			toolRuns: [],
			citations: []
		};
	}

	private findMessage(id: string): ChatMessage | undefined {
		for (const list of Object.values(this.messages)) {
			const found = list.find((m) => m.id === id);
			if (found) return found;
		}
		return undefined;
	}

	private replaceMessage(message: ChatMessage): void {
		const list = this.messages[message.conversationId];
		if (!list) return;
		const index = list.findIndex((m) => m.id === message.id);
		if (index === -1) return;
		const next = [...list];
		next[index] = message;
		this.messages = { ...this.messages, [message.conversationId]: next };
	}

	private async appendMessage(message: ChatMessage): Promise<void> {
		const list = this.messages[message.conversationId] ?? [];
		this.messages = { ...this.messages, [message.conversationId]: [...list, message] };
		this.touchConversation(message.conversationId);
		try {
			await this.repository.appendMessage(this.scope(), message);
		} catch {
			this.storageError = CHAT_STATUS.storageUnavailable;
		}
	}

	private async removeMessage(id: string): Promise<void> {
		for (const [conversationId, list] of Object.entries(this.messages)) {
			const index = list.findIndex((m) => m.id === id);
			if (index === -1) continue;
			const next = [...list];
			next.splice(index, 1);
			this.messages = { ...this.messages, [conversationId]: next };
			try {
				await this.repository.deleteMessage(this.scope(), id);
			} catch {
				this.storageError = CHAT_STATUS.storageUnavailable;
			}
			return;
		}
	}

	private async finaliseMessage(
		id: string,
		patch: { status: ChatMessage['status']; error?: string }
	): Promise<void> {
		const message = this.findMessage(id);
		if (!message) return;
		const next: ChatMessage = {
			...message,
			status: patch.status,
			error: patch.error,
			updatedAt: new Date().toISOString()
		};
		this.replaceMessage(next);
		try {
			await this.repository.updateMessage(this.scope(), id, {
				status: next.status,
				content: next.content,
				citations: next.citations,
				toolRuns: next.toolRuns,
				error: patch.error ?? null
			});
		} catch {
			this.storageError = CHAT_STATUS.storageUnavailable;
		}
	}

	private touchConversation(id: string): void {
		const index = this.conversations.findIndex((c) => c.id === id);
		if (index === -1) return;
		const next = [...this.conversations];
		next[index] = { ...next[index], updatedAt: new Date().toISOString() };
		this.conversations = next;
	}

	/** Whether shared, server-enforced storage is configured (for the panel copy). */
	get sharedStorageConfigured(): boolean {
		return isSupabaseConfigured();
	}
}

function byUpdatedDesc(a: Conversation, b: Conversation): number {
	return b.updatedAt.localeCompare(a.updatedAt);
}

function upsertToolRun(runs: ToolRun[], run: ToolRun): ToolRun[] {
	const index = runs.findIndex((r) => r.id === run.id);
	if (index === -1) return [...runs, run];
	const next = [...runs];
	next[index] = run;
	return next;
}

export const chats = new ChatsState();
