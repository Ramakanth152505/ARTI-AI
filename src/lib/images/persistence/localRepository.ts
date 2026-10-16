/**
 * Browser-local implementation of `ImageRepository`.
 *
 * This is the live backend until Supabase is configured. It is honest about what
 * it is: single-browser storage, not shared, and not an authorization boundary.
 * Access is still scoped per workspace key so switching workspaces cannot read
 * another workspace's records from the same browser, and the shape of the calls
 * matches the future server implementation.
 *
 * Nothing here is trusted when read back: stored records are validated and
 * normalised before use, so a hand-edited or corrupted localStorage entry cannot
 * inject unexpected objects into the UI. A stored `generating` asset is recorded
 * as `failed` on reload, because a browser reload can never resume a live job.
 */

import type { ImageRepository } from './repository';
import type {
        ImageAsset,
        ImageAssetStatus,
        ImageAttachment,
        ImageAttachmentStatus,
        ImageConversation,
        ImageConversationPatch,
        ImageMessage,
        ImageMessagePatch,
        ImageMessageStatus
} from '../types';
import { DEFAULT_ASPECT_RATIO, findAspectRatio, type AspectRatio } from '../styles';
import type { WorkspaceScope } from '#lib/shared/scope';

interface StoreShape {
        conversations: ImageConversation[];
        messages: ImageMessage[];
        savedAssets: ImageAsset[];
}

const EMPTY_STORE: StoreShape = { conversations: [], messages: [], savedAssets: [] };
const KEY_PREFIX = 'arti.images.v1';

function isRecord(value: unknown): value is Record<string, unknown> {
        return typeof value === 'object' && value !== null;
}

function asString(value: unknown, fallback = ''): string {
        return typeof value === 'string' ? value : fallback;
}

function asBoolean(value: unknown): boolean {
        return value === true;
}

function asNumber(value: unknown): number | undefined {
        return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function asAspectRatio(value: unknown): AspectRatio {
        return typeof value === 'string' && findAspectRatio(value as AspectRatio).value === value
                ? (value as AspectRatio)
                : DEFAULT_ASPECT_RATIO;
}

function normaliseAttachment(raw: unknown): ImageAttachment | null {
        if (!isRecord(raw)) return null;
        const id = asString(raw.id);
        const name = asString(raw.name);
        if (!id || !name) return null;
        const status: ImageAttachmentStatus =
                raw.status === 'failed' || raw.status === 'rejected' ? raw.status : 'selected';
        return {
                id,
                name,
                size: asNumber(raw.size) ?? 0,
                mimeType: asString(raw.mimeType, 'unknown'),
                status,
                detail: typeof raw.detail === 'string' ? raw.detail : undefined,
                storageRef: typeof raw.storageRef === 'string' ? raw.storageRef : undefined
                // `previewUrl` is intentionally dropped: an object URL from a previous
                // session is dead, and re-showing it would look like the file still exists.
        };
}

function normaliseAsset(raw: unknown): ImageAsset | null {
        if (!isRecord(raw)) return null;
        const id = asString(raw.id);
        const messageId = asString(raw.messageId);
        const conversationId = asString(raw.conversationId);
        if (!id || !messageId || !conversationId) return null;
        const status: ImageAssetStatus =
                raw.status === 'ready' || raw.status === 'cancelled' || raw.status === 'generating'
                        ? raw.status
                        : 'failed';
        return {
                id,
                messageId,
                conversationId,
                prompt: asString(raw.prompt),
                negativePrompt: typeof raw.negativePrompt === 'string' ? raw.negativePrompt : undefined,
                styleId: typeof raw.styleId === 'string' ? raw.styleId : null,
                styleName: typeof raw.styleName === 'string' ? raw.styleName : undefined,
                aspectRatio: asAspectRatio(raw.aspectRatio),
                width: asNumber(raw.width),
                height: asNumber(raw.height),
                // A reload can never resume an in-flight job, so it is recorded as failed.
                status: status === 'generating' ? 'failed' : status,
                url: typeof raw.url === 'string' ? raw.url : undefined,
                mimeType: typeof raw.mimeType === 'string' ? raw.mimeType : undefined,
                jobId: typeof raw.jobId === 'string' ? raw.jobId : undefined,
                referenceAttachmentId:
                        typeof raw.referenceAttachmentId === 'string' ? raw.referenceAttachmentId : undefined,
                saved: asBoolean(raw.saved),
                createdAt: asString(raw.createdAt, new Date().toISOString()),
                updatedAt: asString(raw.updatedAt, new Date().toISOString()),
                error: typeof raw.error === 'string' ? raw.error : undefined
        };
}

function normaliseConversation(raw: unknown): ImageConversation | null {
        if (!isRecord(raw)) return null;
        const id = asString(raw.id);
        const ownerId = asString(raw.ownerId);
        if (!id || !ownerId) return null;
        return {
                id,
                ownerId,
                title: asString(raw.title) || 'New image',
                titleIsAuto: asBoolean(raw.titleIsAuto),
                createdAt: asString(raw.createdAt, new Date().toISOString()),
                updatedAt: asString(raw.updatedAt, new Date().toISOString()),
                pinned: asBoolean(raw.pinned),
                archived: asBoolean(raw.archived),
                styleId: typeof raw.styleId === 'string' ? raw.styleId : null,
                aspectRatio: asAspectRatio(raw.aspectRatio)
        };
}

function normaliseMessage(raw: unknown): ImageMessage | null {
        if (!isRecord(raw)) return null;
        const id = asString(raw.id);
        const conversationId = asString(raw.conversationId);
        if (!id || !conversationId) return null;
        const role = raw.role === 'assistant' ? 'assistant' : 'user';
        const status: ImageMessageStatus =
                raw.status === 'streaming' || raw.status === 'stopped' || raw.status === 'error'
                        ? raw.status
                        : 'complete';
        return {
                id,
                conversationId,
                role,
                content: asString(raw.content),
                status: status === 'streaming' ? 'stopped' : status,
                createdAt: asString(raw.createdAt, new Date().toISOString()),
                updatedAt: asString(raw.updatedAt, new Date().toISOString()),
                replyTo: typeof raw.replyTo === 'string' ? raw.replyTo : undefined,
                assets: Array.isArray(raw.assets)
                        ? raw.assets.map(normaliseAsset).filter((a): a is ImageAsset => a !== null)
                        : [],
                attachments: Array.isArray(raw.attachments)
                        ? raw.attachments.map(normaliseAttachment).filter((a): a is ImageAttachment => a !== null)
                        : [],
                styleId: typeof raw.styleId === 'string' ? raw.styleId : null,
                styleName: typeof raw.styleName === 'string' ? raw.styleName : undefined,
                aspectRatio: typeof raw.aspectRatio === 'string' ? asAspectRatio(raw.aspectRatio) : undefined,
                negativePrompt: typeof raw.negativePrompt === 'string' ? raw.negativePrompt : undefined,
                originalPrompt: typeof raw.originalPrompt === 'string' ? raw.originalPrompt : undefined,
                kind: raw.kind === 'enhancement' || raw.kind === 'note' ? raw.kind : undefined,
                error: typeof raw.error === 'string' ? raw.error : undefined
        };
}

function normaliseStore(value: unknown): StoreShape {
        if (!isRecord(value)) return { ...EMPTY_STORE };
        const conversations = Array.isArray(value.conversations)
                ? value.conversations
                                .map(normaliseConversation)
                                .filter((c): c is ImageConversation => c !== null)
                : [];
        const messages = Array.isArray(value.messages)
                ? value.messages.map(normaliseMessage).filter((m): m is ImageMessage => m !== null)
                : [];
        const savedAssets = Array.isArray(value.savedAssets)
                ? value.savedAssets.map(normaliseAsset).filter((a): a is ImageAsset => a !== null)
                : [];
        return { conversations, messages, savedAssets };
}

/** localStorage availability is probed once; private mode can make it throw. */
function storageAvailable(): boolean {
        try {
                const probe = '__arti_images_probe__';
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

export class LocalImageRepository implements ImageRepository {
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

        async listConversations(scope: WorkspaceScope): Promise<ImageConversation[]> {
                return this.read().conversations.filter((c) => c.ownerId === ownerKey(scope));
        }

        async createConversation(_scope: WorkspaceScope, conversation: ImageConversation): Promise<ImageConversation> {
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
                patch: ImageConversationPatch
        ): Promise<ImageConversation | null> {
                const store = this.read();
                const index = store.conversations.findIndex((c) => c.id === id);
                if (index === -1) return null;
                const next: ImageConversation = {
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
                store.savedAssets = store.savedAssets.filter((a) => a.conversationId !== id);
                this.write(store);
        }

        async listMessages(_scope: WorkspaceScope, conversationId: string): Promise<ImageMessage[]> {
                return this.read()
                        .messages.filter((m) => m.conversationId === conversationId)
                        .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
        }

        async appendMessage(_scope: WorkspaceScope, message: ImageMessage): Promise<ImageMessage> {
                const store = this.read();
                if (!store.messages.some((m) => m.id === message.id)) {
                        store.messages.push(message);
                        this.write(store);
                }
                return message;
        }

        async updateMessage(_scope: WorkspaceScope, id: string, patch: ImageMessagePatch): Promise<ImageMessage | null> {
                const store = this.read();
                const index = store.messages.findIndex((m) => m.id === id);
                if (index === -1) return null;
                const next: ImageMessage = {
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
                store.savedAssets = store.savedAssets.filter((a) => a.messageId !== id);
                this.write(store);
        }

        async listSavedAssets(_scope: WorkspaceScope): Promise<ImageAsset[]> {
                return this.read()
                        .savedAssets.filter((a) => a.saved)
                        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        }

        async saveAsset(_scope: WorkspaceScope, asset: ImageAsset): Promise<ImageAsset> {
                const store = this.read();
                const index = store.savedAssets.findIndex((a) => a.id === asset.id);
                const next = { ...asset, saved: true, updatedAt: new Date().toISOString() };
                if (index === -1) store.savedAssets.push(next);
                else store.savedAssets[index] = next;
                this.write(store);
                return next;
        }

        async removeSavedAsset(_scope: WorkspaceScope, assetId: string): Promise<void> {
                const store = this.read();
                store.savedAssets = store.savedAssets.filter((a) => a.id !== assetId);
                this.write(store);
        }
}
