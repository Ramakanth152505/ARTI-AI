/**
 * Persistence boundary for the Chats module.
 *
 * Components and state never touch storage directly: they call a
 * `ChatRepository`. Today the only live implementation is browser-local; when
 * Supabase is configured, `supabaseRepository.ts` becomes the implementation and
 * the rest of the module is unchanged. Keeping this interface narrow is what
 * makes that swap safe.
 *
 * Every method is scoped by `WorkspaceScope`, so an implementation is forced to
 * consider ownership rather than returning a global bag of records. Server-side
 * authorization (e.g. Supabase Row Level Security) remains the real enforcement
 * point — the scope passed here is an echo of the authenticated identity, never a
 * substitute for it.
 */

import type { Conversation, ConversationPatch, Folder, MessagePatch, ChatMessage, WorkspaceScope } from '../types';

export interface ChatRepository {
	/** Short label for the storage backend, shown in the honest storage notice. */
	readonly label: string;
	/** Whether records survive a reload. */
	readonly persistent: boolean;
	/** Whether records may be visible to more than one person (shared storage). */
	readonly shared: boolean;

	listConversations(scope: WorkspaceScope): Promise<Conversation[]>;
	getConversation(scope: WorkspaceScope, id: string): Promise<Conversation | null>;
	createConversation(scope: WorkspaceScope, conversation: Conversation): Promise<Conversation>;
	updateConversation(scope: WorkspaceScope, id: string, patch: ConversationPatch): Promise<Conversation | null>;
	deleteConversation(scope: WorkspaceScope, id: string): Promise<void>;

	listMessages(scope: WorkspaceScope, conversationId: string): Promise<ChatMessage[]>;
	appendMessage(scope: WorkspaceScope, message: ChatMessage): Promise<ChatMessage>;
	updateMessage(scope: WorkspaceScope, id: string, patch: MessagePatch): Promise<ChatMessage | null>;
	deleteMessage(scope: WorkspaceScope, id: string): Promise<void>;

	listFolders(scope: WorkspaceScope): Promise<Folder[]>;
	createFolder(scope: WorkspaceScope, folder: Folder): Promise<Folder>;
	updateFolder(scope: WorkspaceScope, id: string, patch: { name?: string }): Promise<Folder | null>;
	deleteFolder(scope: WorkspaceScope, id: string): Promise<void>;
}
