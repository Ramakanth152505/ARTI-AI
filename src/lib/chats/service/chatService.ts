/**
 * Intelligence service boundary.
 *
 * This is the single seam between the Chats UI and ARTI's future privately
 * hosted model service. There is no model call here today — with no endpoint
 * configured, `isModelConfigured()` is false and the caller renders an honest
 * configuration state. Nothing is simulated.
 *
 * The contract to implement later:
 *
 *   POST {VITE_ARTI_CHAT_ENDPOINT}/chat
 *   body: { conversationId, requestId, messages, tools, attachments }
 *   response: text/event-stream
 *     event: delta      data: {"text":"..."}
 *     event: citation   data: {"id","title","url"}
 *     event: tool       data: {"id","capabilityId","label","state","detail"}
 *     event: done       data: {"stopReason":"complete"}
 *     event: error      data: {"message":"<user-safe text>"}
 *
 * `AbortSignal` cancellation is client-side: it stops reading the stream. It
 * cannot guarantee the remote computation stopped, so callers must record a
 * "stopped" state rather than claiming a hard cancel.
 */

import type { Attachment, ChatMessage, Citation, ToolRun } from '../types';

export interface StreamRequest {
	requestId: string;
	conversationId: string;
	/** Conversation history in order, oldest first. */
	messages: ChatMessage[];
	/** Capability ids enabled for this request. */
	toolIds: string[];
	attachments: Attachment[];
}

export type StreamEvent =
	| { type: 'delta'; text: string }
	| { type: 'citation'; citation: Citation }
	| { type: 'tool'; run: ToolRun }
	| { type: 'done' }
	| { type: 'error'; message: string };

export interface StreamHandlers {
	onEvent: (event: StreamEvent) => void;
	/** Called once the stream ends (normally, by error, or by abort). */
	onClose: (reason: 'done' | 'error' | 'aborted') => void;
}

/** Error carrying a message that is already safe to display to the user. */
export class ChatServiceError extends Error {
	constructor(message: string, readonly cause?: unknown) {
		super(message);
		this.name = 'ChatServiceError';
	}
}

/**
 * Streams an assistant response.
 *
 * Not implemented: there is no configured endpoint. Callers must check
 * `isModelConfigured()` first and show the configuration state; reaching this
 * function is a programming error, so it throws rather than returning fake text
 * that could be mistaken for a real model response.
 */
export async function streamChatResponse(
	_request: StreamRequest,
	_handlers: StreamHandlers,
	_signal: AbortSignal
): Promise<void> {
	throw new ChatServiceError('The ARTI intelligence service is not configured.');
}

/**
 * Regeneration is a fresh request against the same user message. It maps onto
 * `streamChatResponse` once a service exists; the separate name keeps the intent
 * (never a duplicate user message) explicit at the call site.
 */
export const regenerateResponse = streamChatResponse;

/** Turns a thrown value into user-safe text without leaking server internals. */
export function toUserSafeMessage(error: unknown): string {
	if (error instanceof ChatServiceError) return error.message;
	return 'The request could not be completed. Please try again.';
}
