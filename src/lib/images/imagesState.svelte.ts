/**
 * Images module state.
 *
 * One class owns the conversation list, the per-conversation message cache, the
 * composer draft, the active style, the reference attachment and the in-flight
 * generation. Components only call methods and read derived values; no component
 * talks to the repository or the services directly. That separation is what keeps
 * UI, persistence and the model call independently replaceable.
 *
 * Honesty rules encoded here:
 *  - An asset only becomes `ready` if the service returned a real URL.
 *  - With no image service configured, a generate request produces an explicit
 *    failure record and no asset — never an invented image.
 *  - With no storage configured, records are marked browser-local and the UI is
 *    told, rather than implying shared persistence.
 *  - Cancellation records a client-side `cancelled`/`stopped` state; it never
 *    claims the remote job was halted.
 */

import { IMAGE_STATUS, isImageModelConfigured, isPromptModelConfigured, isSupabaseConfigured, maxImageCount, supportsVariations } from './config';
import { newId, newRequestId } from '#lib/shared/ids';
import { releasePreview } from './references';
import {
        applyStyleTemplate,
        composePrompt,
        promptTitle,
        removeStyleTemplate,
        validateGenerationRequest,
        type ComposeMode
} from './prompt';
import { countReadyAssets, deriveTitle, searchImageConversations, type ImageSearchResult } from './search';
import {
        generateImages,
        ImageServiceError,
        toUserSafeMessage as toSafeImageMessage,
        type GenerationEvent
} from './service/imageService';
import {
        requestPrompt,
        toUserSafeMessage as toSafePromptMessage
} from './service/promptService';
import { dimensionsFor, findStyle, findAspectRatio, DEFAULT_ASPECT_RATIO, type AspectRatio, type ImageStyle } from './styles';
import { getImageRepository, imageScope, type WorkspaceScope } from './workspace';
import type { ImageRepository } from './persistence/repository';
import type {
        ImageAsset,
        ImageAttachment,
        ImageConversation,
        ImageConversationPatch,
        ImageMessage,
        ImageMessagePatch
} from './types';

/** The generation lifecycle, mirroring the backend job states. */
export type GenerationStage = 'idle' | 'preparing' | 'queued' | 'generating' | 'completed' | 'failed' | 'cancelled';

interface StorageNotice {
        tone: 'info' | 'warning';
        text: string;
}

/** A style the user chose that needs a decision because the draft is not empty. */
export interface PendingStyleApplication {
        style: ImageStyle;
        draft: string;
}

const HISTORY_PAGE_SIZE = 40;

export class ImagesState {
        private repository: ImageRepository = getImageRepository();

        // --- Conversation data --------------------------------------------------

        conversations = $state<ImageConversation[]>([]);
        /** Message cache keyed by conversation id. */
        messages = $state<Record<string, ImageMessage[]>>({});
        activeConversationId = $state<string | null>(null);

        loadingHistory = $state(true);
        loadingMessages = $state(false);
        /** True while more history is being appended (incremental loading). */
        loadingMore = $state(false);
        storageError = $state<string | null>(null);

        /** How many conversation rows are currently rendered, for incremental loading. */
        visibleHistoryCount = $state(HISTORY_PAGE_SIZE);

        // --- Search -------------------------------------------------------------

        searchQuery = $state('');
        searchResults = $state<ImageSearchResult[]>([]);
        searching = $state(false);
        private searchToken = 0;

        // --- Composer / selection ----------------------------------------------

        /** The composer draft. Owned here so the style library can insert into it. */
        draft = $state('');
        selectedStyleId = $state<string | null>(null);
        aspectRatio = $state<AspectRatio>(DEFAULT_ASPECT_RATIO);
        imageCount = $state(1);
        negativePrompt = $state('');
        /** The single reference image currently attached, or null. */
        reference = $state<ImageAttachment | null>(null);

        /** Set when a style selection needs the user to choose how to combine it. */
        pendingStyle = $state<PendingStyleApplication | null>(null);

        /** Transient composer/section notice, shown verbatim. */
        notice = $state('');

        /** True while a prompt enhancement request is in flight. */
        enhancing = $state(false);

        // --- Generation ---------------------------------------------------------

        generating = $state(false);
        stage = $state<GenerationStage>('idle');
        /** Progress reported by the service (0–100), or null when unknown. */
        progress = $state<number | null>(null);
        /** Message the current job is writing into. */
        activeMessageId = $state<string | null>(null);

        private abortController: AbortController | null = null;
        private promptAbort: AbortController | null = null;

        // --- Library ------------------------------------------------------------

        savedAssets = $state<ImageAsset[]>([]);

        // --- Configuration, resolved once at startup ----------------------------

        readonly imageModelConfigured = isImageModelConfigured();
        readonly promptModelConfigured = isPromptModelConfigured();
        readonly maxCount = maxImageCount();

        // --- Derived views ------------------------------------------------------

        activeConversation = $derived(
                this.conversations.find((c) => c.id === this.activeConversationId) ?? null
        );

        activeMessages = $derived(
                this.activeConversationId ? (this.messages[this.activeConversationId] ?? []) : []
        );

        selectedStyle = $derived(findStyle(this.selectedStyleId) ?? null);

        /** The prompt that would actually be sent, with style guidance applied. */
        composedPrompt = $derived(composePrompt(this.draft, this.selectedStyle));

        /** Conversations newest-first, respecting the incremental render budget. */
        orderedConversations = $derived(
                [...this.conversations].sort(byUpdatedDesc)
        );

        /** Active conversations, excluding archived, for the main list. */
        libraryConversations = $derived(
                this.orderedConversations.filter((c) => !c.archived)
        );

        archivedConversations = $derived(this.orderedConversations.filter((c) => c.archived));

        /** How many conversations exist beyond the current render budget. */
        hiddenHistoryCount = $derived(Math.max(0, this.libraryConversations.length - this.visibleHistoryCount));

        /** Images produced in the active conversation. */
        activeImageCount = $derived(countReadyAssets(this.activeMessages));

        storageNotice = $derived.by((): StorageNotice => {
                if (this.storageError) return { tone: 'warning', text: this.storageError };
                if (!this.repository.persistent) return { tone: 'warning', text: IMAGE_STATUS.storageUnavailable };
                if (!this.repository.shared) return { tone: 'info', text: IMAGE_STATUS.localOnly };
                return { tone: 'info', text: '' };
        });

        readonly storageLabel = $derived(this.repository.label);

        // --- Lifecycle ----------------------------------------------------------

        async init(): Promise<void> {
                this.loadingHistory = true;
                this.storageError = null;
                try {
                        const [conversations, saved] = await Promise.all([
                                this.repository.listConversations(this.scope()),
                                this.repository.listSavedAssets(this.scope())
                        ]);
                        this.conversations = conversations;
                        this.savedAssets = saved;

                        const first = [...conversations].sort(byUpdatedDesc).find((c) => !c.archived);
                        if (first) await this.selectConversation(first.id);
                } catch {
                        this.storageError = IMAGE_STATUS.storageUnavailable;
                } finally {
                        this.loadingHistory = false;
                }
        }

        private scope(): WorkspaceScope {
                return imageScope();
        }

        /** Reveals the next page of history. Never deletes or hides older records. */
        loadMoreHistory(): void {
                this.visibleHistoryCount += HISTORY_PAGE_SIZE;
        }

        // --- Composer -----------------------------------------------------------

        setDraft(value: string): void {
                this.draft = value;
        }

        setAspectRatio(value: AspectRatio): void {
                this.aspectRatio = value;
                if (this.activeConversationId) {
                        void this.patchConversation(this.activeConversationId, { aspectRatio: value });
                }
        }

        setImageCount(value: number): void {
                this.imageCount = Math.max(1, Math.min(this.maxCount, Math.floor(value) || 1));
        }

        clearNotice(): void {
                this.notice = '';
        }

        // --- Style selection ----------------------------------------------------

        /**
         * Applies a style to the composer.
         *
         * Empty draft → the template is inserted directly. Non-empty draft that
         * does not already contain the template → the caller must confirm how to
         * combine them (no silent overwrite). Already-applied template → selection
         * is recorded without duplicating the text.
         */
        selectStyle(styleId: string): void {
                const style = findStyle(styleId);
                if (!style) return;
                this.selectedStyleId = styleId;
                this.notice = '';

                const current = this.draft.trim();
                if (!current) {
                        this.draft = applyStyleTemplate(this.draft, style, 'insert');
                        this.pendingStyle = null;
                        return;
                }

                const applied = applyStyleTemplate(this.draft, style, 'insert');
                if (applied === current) {
                        // Template already present; nothing to add.
                        this.pendingStyle = null;
                        return;
                }

                this.pendingStyle = { style, draft: this.draft };
        }

        /** Resolves a pending style application with the user's chosen mode. */
        resolvePendingStyle(mode: ComposeMode): void {
                const pending = this.pendingStyle;
                if (!pending) return;
                this.draft = applyStyleTemplate(pending.draft, pending.style, mode);
                this.pendingStyle = null;
        }

        cancelPendingStyle(): void {
                this.pendingStyle = null;
        }

        /** Clears the active style, stripping only its guidance from the draft. */
        clearStyle(): void {
                const style = this.selectedStyle;
                this.selectedStyleId = null;
                this.pendingStyle = null;
                if (style) this.draft = removeStyleTemplate(this.draft, style);
        }

        // --- Reference image ----------------------------------------------------

        setReference(attachment: ImageAttachment | null): void {
                if (this.reference && this.reference.previewUrl !== attachment?.previewUrl) {
                        releasePreview(this.reference.previewUrl);
                }
                this.reference = attachment;
        }

        clearReference(): void {
                if (this.reference) releasePreview(this.reference.previewUrl);
                this.reference = null;
        }

        // --- Conversation list --------------------------------------------------

        /**
         * Creates or focuses an empty conversation. If the active conversation is
         * already empty and still auto-titled it is reused, so repeated clicks on
         * "New image" cannot accumulate empty records.
         */
        async newConversation(): Promise<string> {
                const active = this.conversations.find((c) => c.id === this.activeConversationId);
                if (active && active.titleIsAuto && (this.messages[active.id]?.length ?? 0) === 0) {
                        return active.id;
                }

                const now = new Date().toISOString();
                const conversation: ImageConversation = {
                        id: newId(),
                        ownerId: this.scope().workspaceId,
                        title: 'New image',
                        titleIsAuto: true,
                        createdAt: now,
                        updatedAt: now,
                        pinned: false,
                        archived: false,
                        styleId: this.selectedStyleId,
                        aspectRatio: this.aspectRatio
                };

                try {
                        await this.repository.createConversation(this.scope(), conversation);
                } catch {
                        this.storageError = IMAGE_STATUS.storageUnavailable;
                }
                this.conversations = [conversation, ...this.conversations];
                this.messages = { ...this.messages, [conversation.id]: [] };
                this.activeConversationId = conversation.id;
                this.storageError = null;
                return conversation.id;
        }

        async selectConversation(id: string): Promise<void> {
                this.activeConversationId = id;
                const conversation = this.conversations.find((c) => c.id === id);
                if (conversation) {
                        this.selectedStyleId = conversation.styleId;
                        this.aspectRatio = conversation.aspectRatio ?? DEFAULT_ASPECT_RATIO;
                }
                if (this.messages[id]) return;
                this.loadingMessages = true;
                try {
                        const messages = await this.repository.listMessages(this.scope(), id);
                        this.messages = { ...this.messages, [id]: messages };
                } catch {
                        this.storageError = IMAGE_STATUS.storageUnavailable;
                        this.messages = { ...this.messages, [id]: [] };
                } finally {
                        this.loadingMessages = false;
                }
        }

        private async patchConversation(id: string, patch: ImageConversationPatch): Promise<void> {
                const index = this.conversations.findIndex((c) => c.id === id);
                if (index === -1) return;
                const optimistic: ImageConversation = {
                        ...this.conversations[index],
                        ...patch,
                        updatedAt: new Date().toISOString()
                };
                const next = [...this.conversations];
                next[index] = optimistic;
                this.conversations = next;
                try {
                        await this.repository.updateConversation(this.scope(), id, patch);
                } catch {
                        this.storageError = IMAGE_STATUS.storageUnavailable;
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
                await this.patchConversation(
                        id,
                        archived ? { archived: true, pinned: false } : { archived: false }
                );
        }

        /** Deletes a conversation and always leaves a valid selection behind. */
        async deleteConversation(id: string): Promise<void> {
                const remaining = this.conversations.filter((c) => c.id !== id);
                this.conversations = remaining;
                const nextMessages = { ...this.messages };
                delete nextMessages[id];
                this.messages = nextMessages;
                this.savedAssets = this.savedAssets.filter((a) => a.conversationId !== id);

                try {
                        await this.repository.deleteConversation(this.scope(), id);
                } catch {
                        this.storageError = IMAGE_STATUS.storageUnavailable;
                }

                if (this.activeConversationId === id) {
                        const next = [...remaining].sort(byUpdatedDesc).find((c) => !c.archived);
                        this.activeConversationId = null;
                        if (next) await this.selectConversation(next.id);
                }
        }

        // --- Search -------------------------------------------------------------

        async runSearch(query: string): Promise<void> {
                this.searchQuery = query;
                const normalised = query.replace(/\s+/g, ' ').trim();
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
                                                return [c.id, [] as ImageMessage[]] as const;
                                        }
                                })
                        );
                        if (token !== this.searchToken) return;
                        const next = { ...this.messages };
                        for (const [id, list] of loaded) next[id] = list;
                        this.messages = next;
                }

                const map = new Map<string, ImageMessage[]>();
                for (const conversation of this.conversations) {
                        map.set(conversation.id, this.messages[conversation.id] ?? []);
                }
                const results = searchImageConversations(this.conversations, map, normalised);
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

        // --- Prompt enhancement -------------------------------------------------

        /**
         * Requests an improved prompt from the configured intelligence service.
         *
         * With no service configured this reports the honest unavailable state and
         * leaves the draft untouched, so the user keeps editing manually. The
         * original prompt is preserved on an enhancement message for comparison.
         */
        async enhancePrompt(): Promise<void> {
                const source = this.draft.trim();
                if (!source) {
                        this.notice = 'Write or insert a prompt first, then enhance it.';
                        return;
                }
                if (!this.promptModelConfigured) {
                        this.notice = IMAGE_STATUS.promptUnavailable;
                        return;
                }

                const conversationId = this.activeConversationId ?? (await this.newConversation());
                this.notice = '';
                this.enhancing = true;
                const controller = new AbortController();
                this.promptAbort = controller;
                try {
                        const result = await requestPrompt(
                                {
                                        requestId: newRequestId(),
                                        task: 'enhance',
                                        prompt: source,
                                        styleId: this.selectedStyleId,
                                        aspectRatio: this.aspectRatio
                                },
                                controller.signal
                        );
                        const message = this.buildMessage(conversationId, 'assistant', result.prompt, []);
                        message.kind = 'enhancement';
                        message.originalPrompt = source;
                        message.styleId = this.selectedStyleId;
                        message.styleName = this.selectedStyle?.name;
                        message.aspectRatio = this.aspectRatio;
                        message.negativePrompt = result.negativePrompt;
                        await this.appendMessage(message);

                        // Adopt the enhanced prompt so the user can edit it before generating.
                        this.draft = result.prompt;
                        if (result.negativePrompt) this.negativePrompt = result.negativePrompt;
                        if (this.conversations.find((c) => c.id === conversationId)?.titleIsAuto) {
                                await this.renameConversation(conversationId, promptTitle(source, this.selectedStyle));
                        }
                } catch (error) {
                        this.notice = toSafePromptMessage(error);
                } finally {
                        this.promptAbort = null;
                        this.enhancing = false;
                }
        }

        /** Cancels an in-flight prompt enhancement. Client-side only. */
        cancelEnhance(): void {
                this.promptAbort?.abort();
                this.promptAbort = null;
                this.enhancing = false;
        }

        // --- Generation ---------------------------------------------------------

        /**
         * Submits the composed prompt for generation.
         *
         * The user message is saved first, so the prompt is never lost even when
         * generation fails. With no image service configured the assistant record
         * carries an explicit failure and no asset is created.
         */
        async generate(): Promise<void> {
                if (this.generating) return;

                const style = this.selectedStyle;
                const composed = composePrompt(this.draft, style);
                const request = validateGenerationRequest({
                        prompt: composed,
                        styleId: this.selectedStyleId,
                        aspectRatio: this.aspectRatio,
                        count: Math.max(1, Math.min(this.maxCount, this.imageCount)),
                        negativePrompt: this.negativePrompt.trim() || undefined,
                        hasReference: this.reference?.status === 'selected'
                });

                if (!request.ok) {
                        this.notice = request.reason ?? 'The request is not valid.';
                        return;
                }

                const conversationId = this.activeConversationId ?? (await this.newConversation());
                const userMessage = this.buildMessage(conversationId, 'user', composed, []);
                userMessage.styleId = this.selectedStyleId;
                userMessage.styleName = style?.name;
                userMessage.aspectRatio = this.aspectRatio;
                userMessage.originalPrompt = this.draft.trim();
                userMessage.negativePrompt = request.value?.negativePrompt;
                if (this.reference) userMessage.attachments = [this.reference];
                await this.appendMessage(userMessage);

                if (this.conversations.find((c) => c.id === conversationId)?.titleIsAuto) {
                        await this.renameConversation(conversationId, promptTitle(composed, style));
                }

                await this.runGeneration(userMessage);
        }

        /**
         * Runs one generation attempt for a user message. Shared by generate,
         * regenerate and variation so those paths cannot drift apart.
         */
        private async runGeneration(
                userMessage: ImageMessage,
                options: { referenceAsset?: ImageAsset } = {}
        ): Promise<void> {
                const conversationId = userMessage.conversationId;
                const assistant = this.buildMessage(conversationId, 'assistant', '', []);
                assistant.replyTo = userMessage.id;
                assistant.status = 'streaming';
                assistant.styleId = userMessage.styleId ?? null;
                assistant.styleName = userMessage.styleName;
                assistant.aspectRatio = userMessage.aspectRatio;
                assistant.negativePrompt = userMessage.negativePrompt;

                if (!this.imageModelConfigured) {
                        assistant.status = 'error';
                        assistant.error = IMAGE_STATUS.notGenerated;
                        await this.appendMessage(assistant);
                        this.stage = 'failed';
                        this.notice = IMAGE_STATUS.generationUnavailable;
                        return;
                }

                const count = Math.max(1, Math.min(this.maxCount, this.imageCount));
                const dims = dimensionsFor(userMessage.aspectRatio ?? this.aspectRatio);
                // Create the placeholder asset records up front so the UI can show real
                // per-asset progress. They are NOT results: status stays `generating`
                // until the service returns an actual URL.
                assistant.assets = Array.from({ length: count }, () => this.buildAsset(assistant, userMessage, dims));

                await this.appendMessage(assistant);

                this.generating = true;
                this.stage = 'preparing';
                this.progress = null;
                this.activeMessageId = assistant.id;

                const controller = new AbortController();
                this.abortController = controller;
                const requestId = newRequestId();

                let cancelled = false;
                let failed = false;
                let streamError: string | null = null;
                let returned = 0;

                try {
                        await generateImages(
                                {
                                        requestId,
                                        conversationId,
                                        prompt: userMessage.content,
                                        negativePrompt: userMessage.negativePrompt,
                                        styleId: userMessage.styleId ?? null,
                                        aspectRatio: userMessage.aspectRatio ?? this.aspectRatio,
                                        width: dims.width,
                                        height: dims.height,
                                        count,
                                        reference:
                                                userMessage.attachments[0]?.storageRef
                                                        ? {
                                                                storageRef: userMessage.attachments[0].storageRef,
                                                                mimeType: userMessage.attachments[0].mimeType,
                                                                name: userMessage.attachments[0].name
                                                        }
                                                        : undefined,
                                        // Variations pass a previously generated asset's real URL as
                                        // the image-to-image base. Only a URL the service returned.
                                        referenceUrl: options.referenceAsset?.url
                                },
                                {
                                        onEvent: (event) => {
                                                const produced = this.applyGenerationEvent(assistant.id, event);
                                                if (produced) returned += 1;
                                        },
                                        onClose: (reason) => {
                                                cancelled = reason === 'aborted';
                                                failed = reason === 'error';
                                        }
                                },
                                controller.signal
                        );
                } catch (error) {
                        failed = true;
                        streamError = toSafeImageMessage(error);
                } finally {
                        this.generating = false;
                        this.abortController = null;
                        this.activeMessageId = null;
                }

                await this.finaliseGeneration(assistant.id, {
                        cancelled,
                        failed,
                        error: streamError,
                        produced: returned
                });
        }

        private applyGenerationEvent(messageId: string, event: GenerationEvent): boolean {
                const message = this.findMessage(messageId);
                if (!message) return false;

                switch (event.type) {
                        case 'queued':
                                this.stage = 'queued';
                                this.replaceMessage({ ...message, assets: message.assets.map((a) => ({ ...a, jobId: event.jobId })) });
                                return false;
                        case 'progress':
                                this.stage = 'generating';
                                this.progress = Math.max(0, Math.min(100, Math.round(event.percent)));
                                return false;
                        case 'asset': {
                                this.stage = 'generating';
                                // Fill the first still-generating placeholder, or append if the
                                // service returned more images than were requested.
                                const index = message.assets.findIndex((a) => a.status === 'generating');
                                const assets = [...message.assets];
                                const record: ImageAsset = {
                                        ...(index === -1 ? this.placeholderFor(message, event.asset.url) : assets[index]),
                                        id: event.asset.id || newId(),
                                        url: event.asset.url,
                                        width: event.asset.width,
                                        height: event.asset.height,
                                        mimeType: event.asset.mimeType,
                                        status: 'ready',
                                        error: undefined,
                                        updatedAt: new Date().toISOString()
                                };
                                if (index === -1) assets.push(record);
                                else assets[index] = record;
                                this.replaceMessage({ ...message, assets });
                                return true;
                        }
                        case 'done':
                                return false;
                        case 'error':
                                this.stage = 'failed';
                                this.replaceMessage({
                                        ...message,
                                        status: 'error',
                                        error: event.message
                                });
                                return false;
                }
        }

        /** A minimal asset record used when the service returns an unexpected extra image. */
        private placeholderFor(message: ImageMessage, prompt: string): ImageAsset {
                const now = new Date().toISOString();
                return {
                        id: newId(),
                        messageId: message.id,
                        conversationId: message.conversationId,
                        prompt: message.content || prompt,
                        styleId: message.styleId ?? null,
                        styleName: message.styleName,
                        aspectRatio: message.aspectRatio ?? DEFAULT_ASPECT_RATIO,
                        status: 'generating',
                        saved: false,
                        createdAt: now,
                        updatedAt: now
                };
        }

        private async finaliseGeneration(
                messageId: string,
                result: { cancelled: boolean; failed: boolean; error: string | null; produced: number }
        ): Promise<void> {
                const message = this.findMessage(messageId);
                if (!message) return;

                let status: ImageMessage['status'] = result.cancelled ? 'stopped' : result.failed ? 'error' : 'complete';
                // A stream that closed "cleanly" but produced no image is still a failure.
                if (!result.cancelled && !result.failed && result.produced === 0) {
                        status = 'error';
                }

                const assets = message.assets.map((asset) =>
                        asset.status === 'generating'
                                ? {
                                        ...asset,
                                        status: (result.cancelled ? 'cancelled' : 'failed') as ImageAsset['status'],
                                        error: result.cancelled
                                                ? 'Generation was stopped before this image was ready.'
                                                : (result.error ?? 'The service did not return this image.'),
                                        updatedAt: new Date().toISOString()
                                }
                                : asset
                );

                const errorText =
                        status === 'error'
                                ? (result.error ??
                                        (result.produced === 0
                                                ? 'No image was returned. The service may be unavailable. Please retry.'
                                                : null))
                                : undefined;

                const next: ImageMessage = {
                        ...message,
                        status,
                        assets,
                        error: errorText ?? undefined,
                        updatedAt: new Date().toISOString()
                };
                this.replaceMessage(next);

                this.stage = status === 'complete' ? 'completed' : status === 'stopped' ? 'cancelled' : 'failed';
                this.progress = null;
                if (errorText) this.notice = errorText;

                try {
                        await this.repository.updateMessage(this.scope(), messageId, {
                                status: next.status,
                                content: next.content,
                                assets,
                                error: errorText ?? null
                        });
                } catch {
                        this.storageError = IMAGE_STATUS.storageUnavailable;
                }
        }

        /** Stops the active generation and records the cancelled state honestly. */
        stopGeneration(): void {
                if (!this.generating || !this.abortController) return;
                this.abortController.abort();
                this.abortController = null;
                this.generating = false;
        }

        /** Regenerates: a fresh attempt tied to the same user message, no new prompt. */
        async regenerate(assistantMessageId: string): Promise<void> {
                if (this.generating) return;
                const message = this.findMessage(assistantMessageId);
                if (!message || message.role !== 'assistant' || !message.replyTo) return;
                const promptMessage = this.findMessage(message.replyTo);
                if (!promptMessage) return;
                await this.removeMessage(assistantMessageId);
                await this.runGeneration(promptMessage);
        }

        /** Retries a failed attempt without duplicating the user message. */
        async retry(assistantMessageId: string): Promise<void> {
                await this.regenerate(assistantMessageId);
        }

        /**
         * Creates a variation of a ready result when the model supports it. With no
         * service (or no reference support) this reports the honest limitation rather
         * than pretending a variation was produced.
         */
        async createVariation(assetId: string): Promise<void> {
                if (this.generating) return;
                const asset = this.findAsset(assetId);
                if (!asset || asset.status !== 'ready') return;
                const message = this.findMessage(asset.messageId);
                const promptMessage = message?.replyTo ? this.findMessage(message.replyTo) : undefined;
                if (!promptMessage) {
                        this.notice = 'The original prompt for this image is no longer available.';
                        return;
                }
                if (!this.imageModelConfigured) {
                        this.notice = IMAGE_STATUS.generationUnavailable;
                        return;
                }
                if (!supportsVariations()) {
                        this.notice = 'The configured model does not support variations yet.';
                        return;
                }
                await this.runGeneration(promptMessage, { referenceAsset: asset });
        }

        // --- Assets and library -------------------------------------------------

        /** Loads a ready result's prompt back into the composer for editing. */
        reusePrompt(assetId: string): void {
                const asset = this.findAsset(assetId);
                if (!asset) return;
                this.draft = asset.prompt;
                this.selectedStyleId = asset.styleId;
                this.negativePrompt = asset.negativePrompt ?? this.negativePrompt;
                this.notice = '';
        }

        /** Restores a whole previous user prompt from a message. */
        reuseMessagePrompt(messageId: string): void {
                const message = this.findMessage(messageId);
                if (!message) return;
                this.draft = message.originalPrompt ?? message.content;
                this.selectedStyleId = message.styleId ?? null;
                this.notice = '';
        }

        /**
         * Saves a ready result to the library. The save is only reported as
         * successful after the repository confirms it.
         */
        async saveAsset(assetId: string): Promise<void> {
                const asset = this.findAsset(assetId);
                if (!asset || asset.status !== 'ready' || !asset.url) {
                        this.notice = IMAGE_STATUS.saveFailed;
                        return;
                }
                try {
                        const saved = await this.repository.saveAsset(this.scope(), { ...asset, saved: true });
                        this.savedAssets = [saved, ...this.savedAssets.filter((a) => a.id !== saved.id)];
                        this.updateAsset(assetId, { saved: true });
                        this.notice = 'Saved to your library.';
                } catch {
                        this.notice = IMAGE_STATUS.saveFailed;
                }
        }

        async removeSavedAsset(assetId: string): Promise<void> {
                this.savedAssets = this.savedAssets.filter((a) => a.id !== assetId);
                this.updateAsset(assetId, { saved: false });
                try {
                        await this.repository.removeSavedAsset(this.scope(), assetId);
                } catch {
                        this.notice = IMAGE_STATUS.saveFailed;
                }
        }

        /** Deletes a single generated image record (and its saved library entry). */
        async deleteAsset(assetId: string): Promise<void> {
                const asset = this.findAsset(assetId);
                if (!asset) return;
                const message = this.findMessage(asset.messageId);
                if (!message) return;
                const assets = message.assets.filter((a) => a.id !== assetId);
                const next: ImageMessage = { ...message, assets, updatedAt: new Date().toISOString() };
                this.replaceMessage(next);
                this.savedAssets = this.savedAssets.filter((a) => a.id !== assetId);
                try {
                        await this.repository.updateMessage(this.scope(), message.id, { assets });
                        if (asset.saved) await this.repository.removeSavedAsset(this.scope(), assetId);
                } catch {
                        this.storageError = IMAGE_STATUS.storageUnavailable;
                }
        }

        // --- Message helpers ----------------------------------------------------

        private buildMessage(
                conversationId: string,
                role: ImageMessage['role'],
                content: string,
                attachments: ImageAttachment[]
        ): ImageMessage {
                const now = new Date().toISOString();
                return {
                        id: newId(),
                        conversationId,
                        role,
                        content,
                        status: 'complete',
                        createdAt: now,
                        updatedAt: now,
                        assets: [],
                        attachments
                };
        }

        private buildAsset(
                message: ImageMessage,
                userMessage: ImageMessage,
                dims: { width: number; height: number }
        ): ImageAsset {
                const now = new Date().toISOString();
                return {
                        id: newId(),
                        messageId: message.id,
                        conversationId: message.conversationId,
                        prompt: userMessage.content,
                        negativePrompt: userMessage.negativePrompt,
                        styleId: userMessage.styleId ?? null,
                        styleName: userMessage.styleName,
                        aspectRatio: userMessage.aspectRatio ?? this.aspectRatio,
                        width: dims.width,
                        height: dims.height,
                        status: 'generating',
                        referenceAttachmentId: userMessage.attachments[0]?.id,
                        saved: false,
                        createdAt: now,
                        updatedAt: now
                };
        }

        private findMessage(id: string): ImageMessage | undefined {
                for (const list of Object.values(this.messages)) {
                        const found = list.find((m) => m.id === id);
                        if (found) return found;
                }
                return undefined;
        }

        private findAsset(id: string): ImageAsset | undefined {
                for (const list of Object.values(this.messages)) {
                        for (const message of list) {
                                const found = message.assets.find((a) => a.id === id);
                                if (found) return found;
                        }
                }
                return this.savedAssets.find((a) => a.id === id);
        }

        private replaceMessage(message: ImageMessage): void {
                const list = this.messages[message.conversationId];
                if (!list) return;
                const index = list.findIndex((m) => m.id === message.id);
                if (index === -1) return;
                const next = [...list];
                next[index] = message;
                this.messages = { ...this.messages, [message.conversationId]: next };
        }

        private updateAsset(assetId: string, patch: Partial<ImageAsset>): void {
                for (const [conversationId, list] of Object.entries(this.messages)) {
                        const index = list.findIndex((m) => m.assets.some((a) => a.id === assetId));
                        if (index === -1) continue;
                        const message = list[index];
                        const assets = message.assets.map((a) => (a.id === assetId ? { ...a, ...patch } : a));
                        const next = [...list];
                        next[index] = { ...message, assets };
                        this.messages = { ...this.messages, [conversationId]: next };
                        return;
                }
        }

        private async appendMessage(message: ImageMessage): Promise<void> {
                const list = this.messages[message.conversationId] ?? [];
                this.messages = { ...this.messages, [message.conversationId]: [...list, message] };
                this.touchConversation(message.conversationId);
                try {
                        await this.repository.appendMessage(this.scope(), message);
                } catch {
                        this.storageError = IMAGE_STATUS.storageUnavailable;
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
                                this.storageError = IMAGE_STATUS.storageUnavailable;
                        }
                        return;
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

        /** Releases local preview URLs when the workspace is torn down. */
        dispose(): void {
                this.abortController?.abort();
                this.promptAbort?.abort();
                this.clearReference();
        }
}

function byUpdatedDesc(a: ImageConversation, b: ImageConversation): number {
        return b.updatedAt.localeCompare(a.updatedAt);
}

/** Aspect-ratio helper re-exported for components that render the ratio chip. */
export { findAspectRatio };

export const images = new ImagesState();
