/**
 * Data contracts for the ARTI AI Chats module.
 *
 * These types are the single description of a conversation, its messages, its
 * attachments and its folders. The persistence layer, the (future) hosted
 * intelligence service and every component import them from here so the schema
 * exists in exactly one place.
 */

export type MessageRole = 'user' | 'assistant' | 'system';

/**
 * `streaming` is an in-flight generation. `stopped` records a user cancellation
 * (remote work may or may not have actually halted — the UI only claims what the
 * client observed). `error` means the request failed and the content is partial.
 */
export type MessageStatus = 'complete' | 'streaming' | 'stopped' | 'error';

/** Lifecycle of a selected file. Nothing reaches `ready` without a real store. */
export type AttachmentStatus = 'selected' | 'uploading' | 'ready' | 'failed' | 'rejected';

export type AttachmentKind = 'image' | 'document' | 'text' | 'data' | 'code' | 'other';

export interface Attachment {
	id: string;
	/** Original file name, kept for display only — never used as a filesystem path. */
	name: string;
	/** Size in bytes as reported by the File object. */
	size: number;
	/** Browser-declared MIME type, treated as a hint and re-validated server-side. */
	mimeType: string;
	kind: AttachmentKind;
	status: AttachmentStatus;
	/** Human-readable outcome, e.g. the reason a file was rejected. */
	detail?: string;
	/** Identifier returned by the storage service once it confirms the upload. */
	storageRef?: string;
}

/** A source the assistant actually cited in its response. */
export interface Citation {
	id: string;
	title: string;
	url: string;
}

export type ToolRunState = 'waiting-approval' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface ToolRun {
	id: string;
	/** Capability id from the capability registry. */
	capabilityId: string;
	label: string;
	state: ToolRunState;
	detail?: string;
}

export interface ChatMessage {
	id: string;
	conversationId: string;
	role: MessageRole;
	content: string;
	status: MessageStatus;
	createdAt: string;
	updatedAt: string;
	/** For assistant messages: the user message this attempt answers. */
	replyTo?: string;
	attachments: Attachment[];
	/** Capability ids that were enabled for this request. */
	toolIds: string[];
	toolRuns: ToolRun[];
	citations: Citation[];
	/** Sanitised, user-safe failure text. Never a raw server exception. */
	error?: string;
}

export interface Conversation {
	id: string;
	ownerId: string;
	/** Always non-empty; starts as the "New chat" placeholder. */
	title: string;
	/** True while the title is still the automatic placeholder. */
	titleIsAuto: boolean;
	createdAt: string;
	updatedAt: string;
	pinned: boolean;
	archived: boolean;
	folderId: string | null;
}

export interface Folder {
	id: string;
	ownerId: string;
	name: string;
	createdAt: string;
	updatedAt: string;
}

/**
 * The workspace scope a record belongs to.
 *
 * `userId` is null until real authentication exists. It is deliberately NOT
 * derived from the presentation-only profile switcher, because that control is a
 * UI preference and not an identity — deriving it would imply an authorization
 * boundary the application does not yet have.
 */
export interface WorkspaceScope {
	workspaceId: string;
	userId: string | null;
}

/** Patch accepted by the conversation update call. */
export interface ConversationPatch {
	title?: string;
	pinned?: boolean;
	archived?: boolean;
	folderId?: string | null;
}

/** Patch accepted by the message update call. */
export interface MessagePatch {
	content?: string;
	status?: MessageStatus;
	attachments?: Attachment[];
	toolRuns?: ToolRun[];
	citations?: Citation[];
	error?: string | null;
}
