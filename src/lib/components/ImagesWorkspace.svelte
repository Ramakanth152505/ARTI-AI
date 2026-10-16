<script lang="ts">
        /**
         * Region container for the Images workspace.
         *
         * Owns the three-region layout (history / conversation / context), the drawer
         * behaviour on narrow screens, the styles-library modal, the pending-style
         * confirmation and the wiring between the `images` state object and the
         * presentational components. No persistence or model logic lives here.
         */
        import Icon from './Icon.svelte';
        import ImageHistorySidebar from './ImageHistorySidebar.svelte';
        import ImagesHeader from './ImagesHeader.svelte';
        import ImageMessageList from './ImageMessageList.svelte';
        import ImagesComposer from './ImagesComposer.svelte';
        import ImageContextPanel from './ImageContextPanel.svelte';
        import ImageStyleLibrary from './ImageStyleLibrary.svelte';
        import ImagePreview from './ImagePreview.svelte';
        import { images } from '#lib/images/imagesState.svelte';
        import { copyText, downloadAsset, filenameFor } from '#lib/images/actions';
        import { currentScope } from '#lib/shared/scope';
        import type { ImageAsset, ImageAttachment } from '#lib/images/types';

        let historyOpen = $state(false);
        let contextOpen = $state(false);
        let stylesOpen = $state(false);
        let showArchived = $state(false);
        let previewId = $state<string | null>(null);

        $effect(() => {
                void images.init();
                // Release local preview URLs and cancel in-flight work when the
                // workspace is torn down, so nothing leaks between visits.
                return () => images.dispose();
        });

        let previewAsset = $derived(
                previewId ? images.activeMessages.flatMap((m) => m.assets).find((a) => a.id === previewId) ?? null : null
        );

        function selectConversation(id: string): void {
                void images.selectConversation(id);
                historyOpen = false;
        }

        function newConversation(): void {
                void images.newConversation();
                historyOpen = false;
                images.clearSearch();
        }

        /** The preview only ever shows a real, ready asset. */
        function openPreview(id: string): void {
                const asset = images.activeMessages.flatMap((m) => m.assets).find((a) => a.id === id);
                if (asset?.status === 'ready' && asset.url) previewId = id;
        }

        function previewFor(conversation: { id: string }): number {
                const messages = images.messages[conversation.id] ?? [];
                return messages.reduce((n, m) => n + m.assets.filter((a) => a.status === 'ready').length, 0);
        }

        function findAsset(id: string): ImageAsset | undefined {
                for (const list of Object.values(images.messages)) {
                        for (const message of list) {
                                const found = message.assets.find((a) => a.id === id);
                                if (found) return found;
                        }
                }
                return images.savedAssets.find((a) => a.id === id);
        }

        async function copyPrompt(id: string): Promise<void> {
                const asset = findAsset(id);
                if (!asset) return;
                const ok = await copyText(asset.prompt);
                images.notice = ok ? 'Prompt copied.' : 'The browser refused clipboard access. Copy it manually instead.';
        }

        async function download(id: string): Promise<void> {
                const asset = findAsset(id);
                if (!asset?.url) {
                        images.notice = 'This image has no downloadable file.';
                        return;
                }
                const result = await downloadAsset(asset.url, filenameFor(asset.url, asset.mimeType));
                if (!result.ok) images.notice = result.reason ?? 'The download could not be completed.';
        }

        function setReference(attachment: ImageAttachment | null): void {
                images.clearNotice();
                images.setReference(attachment);
        }

        function toggleStyles(): void {
                images.clearNotice();
                stylesOpen = !stylesOpen;
        }
</script>

<div class="images" class:context-open={contextOpen}>
        <!-- Region A: history. Inline on wide screens, a drawer below 1100px. -->
        <div class="history-region" class:drawer={historyOpen}>
                <ImageHistorySidebar
                        conversations={images.libraryConversations.slice(0, images.visibleHistoryCount)}
                        archived={images.archivedConversations}
                        activeId={images.activeConversationId}
                        loading={images.loadingHistory}
                        storageNotice={images.storageNotice}
                        storageLabel={images.storageLabel}
                        searchQuery={images.searchQuery}
                        searchResults={images.searchResults}
                        searching={images.searching}
                        {showArchived}
                        hiddenCount={images.hiddenHistoryCount}
                        {previewFor}
                        onnew={newConversation}
                        onselect={selectConversation}
                        onsearch={(q) => void images.runSearch(q)}
                        onclearsearch={() => images.clearSearch()}
                        ontogglearchived={() => (showArchived = !showArchived)}
                        onloadmore={() => images.loadMoreHistory()}
                        onpin={(id) => void images.togglePin(id)}
                        onrename={(id, title) => void images.renameConversation(id, title)}
                        onarchive={(id, archived) => void images.setArchived(id, archived)}
                        ondelete={(id) => void images.deleteConversation(id)}
                        oncollapse={() => (historyOpen = false)}
                />
        </div>

        {#if historyOpen}
                <button class="scrim" aria-label="Close image history" onclick={() => (historyOpen = false)}></button>
        {/if}

        <!-- Region B: the workspace. -->
        <section class="workspace" aria-label="Images workspace">
                <ImagesHeader
                        configured={images.imageModelConfigured}
                        {contextOpen}
                        onopenstyles={toggleStyles}
                        onopenhistory={() => (historyOpen = true)}
                        onnew={newConversation}
                        ontogglecontext={() => (contextOpen = !contextOpen)}
                />

                {#if images.storageError}
                        <p class="banner error" role="alert">
                                <Icon name="alert" size={14} />
                                <span>{images.storageError}</span>
                        </p>
                {/if}

                <ImageMessageList
                        conversation={images.activeConversation}
                        messages={images.activeMessages}
                        loading={images.loadingMessages}
                        generating={images.generating}
                        configured={images.imageModelConfigured}
                        styleName={images.selectedStyle?.name}
                        onopenstyles={toggleStyles}
                        onopenimage={openPreview}
                        oncopyasset={copyPrompt}
                        onreuseasset={(id) => images.reusePrompt(id)}
                        ondownloadasset={download}
                        onregenerate={(id) => void images.regenerate(id)}
                        onvary={(id) => void images.createVariation(id)}
                        onsaveasset={(id) => void images.saveAsset(id)}
                        ondeleteasset={(id) => void images.deleteAsset(id)}
                        onreusemessage={(id) => images.reuseMessagePrompt(id)}
                        onretry={(id) => void images.retry(id)}
                />

                {#if images.notice}
                        <p class="notice" role="status">
                                <span>{images.notice}</span>
                                <button class="notice-close" aria-label="Dismiss notice" onclick={() => images.clearNotice()}>
                                        <Icon name="close" size={12} />
                                </button>
                        </p>
                {/if}

                <div class="composer-slot">
                        <ImagesComposer
                                draft={images.draft}
                                selectedStyle={images.selectedStyle}
                                aspectRatio={images.aspectRatio}
                                imageCount={images.imageCount}
                                negativePrompt={images.negativePrompt}
                                reference={images.reference}
                                generating={images.generating}
                                enhancing={images.enhancing}
                                configured={images.imageModelConfigured}
                                oninput={(v) => images.setDraft(v)}
                                onselectstyle={(id) => images.selectStyle(id)}
                                onclearstyle={() => images.clearStyle()}
                                onopenstyles={toggleStyles}
                                onaspect={(v) => images.setAspectRatio(v)}
                                oncount={(v) => images.setImageCount(v)}
                                onnegative={(v) => (images.negativePrompt = v)}
                                onreference={setReference}
                                ongenerate={() => void images.generate()}
                                onstop={() => images.stopGeneration()}
                                onenhance={() => void images.enhancePrompt()}
                                onnotice={(n) => (images.notice = n)}
                        />
                </div>
        </section>

        <!-- Region C: context. Closed by default; a drawer below 1200px. -->
        <div class="context-region" class:drawer={contextOpen}>
                <ImageContextPanel
                        open={contextOpen}
                        conversation={images.activeConversation}
                        messages={images.activeMessages}
                        settings={{
                                styleId: images.selectedStyleId,
                                aspectRatio: images.aspectRatio,
                                count: images.imageCount,
                                negativePrompt: images.negativePrompt,
                                hasReference: !!images.reference
                        }}
                        scope={currentScope()}
                        configured={images.imageModelConfigured}
                        promptConfigured={images.promptModelConfigured}
                        sharedStorageConfigured={images.sharedStorageConfigured}
                        stage={images.stage}
                        progress={images.progress}
                        onclose={() => (contextOpen = false)}
                />
        </div>

        {#if contextOpen}
                <button class="scrim context-scrim" aria-label="Close context panel" onclick={() => (contextOpen = false)}></button>
        {/if}
</div>

{#if stylesOpen}
        <ImageStyleLibrary
                selectedId={images.selectedStyleId}
                onselect={(id) => {
                        images.selectStyle(id);
                        // Keep the library open so the user can compare styles; the composer
                        // shows the active chip immediately.
                }}
                onclear={() => images.clearStyle()}
                onclose={() => (stylesOpen = false)}
        />
{/if}

{#if images.pendingStyle}
        <div class="overlay" role="presentation">
                <button class="scrim" aria-label="Cancel" onclick={() => images.cancelPendingStyle()}></button>
                <div class="dialog" role="dialog" aria-modal="true" aria-label="Apply style">
                        <h3>Add this style?</h3>
                        <p class="dialog-text">
                                Your prompt already has text. Choose how “{images.pendingStyle.style.name}” should be combined —
                                your words are never discarded unless you pick Replace.
                        </p>
                        <div class="dialog-actions">
                                <button class="btn ghost" onclick={() => images.cancelPendingStyle()}>Cancel</button>
                                <button class="btn ghost" onclick={() => images.resolvePendingStyle('replace')}>Replace</button>
                                <button class="btn" onclick={() => images.resolvePendingStyle('append')}>Add to prompt</button>
                        </div>
                </div>
        </div>
{/if}

{#if previewAsset}
        <ImagePreview
                asset={previewAsset}
                onclose={() => (previewId = null)}
                oncopy={copyPrompt}
                ondownload={download}
        />
{/if}

<style>
        .images {
                position: relative;
                flex: 1;
                min-height: 0;
                display: grid;
                grid-template-columns: var(--images-history-width) minmax(0, 1fr);
                height: 100%;
                overflow: hidden;
        }

        .images.context-open {
                grid-template-columns: var(--images-history-width) minmax(0, 1fr) var(--images-context-width);
        }

        .history-region {
                min-width: 0;
                min-height: 0;
                height: 100%;
        }

        .workspace {
                display: flex;
                flex-direction: column;
                min-width: 0;
                min-height: 0;
                height: 100%;
        }

        .composer-slot {
                flex-shrink: 0;
                width: 100%;
                max-width: var(--images-max-width);
                margin: 0 auto;
                padding: var(--space-2) var(--space-6) var(--space-5);
        }

        .banner {
                display: flex;
                align-items: center;
                gap: var(--space-2);
                margin: var(--space-3) var(--space-6) 0;
                padding: var(--space-2) var(--space-3);
                border-radius: var(--radius-sm);
                font-size: 12.5px;
        }

        .banner.error {
                border: 1px solid rgba(212, 120, 96, 0.45);
                color: #e0a08c;
        }

        .notice {
                display: flex;
                align-items: center;
                gap: var(--space-2);
                max-width: var(--images-max-width);
                margin: 0 auto;
                padding: 6px var(--space-6) 0;
                width: 100%;
                font-size: 12px;
                color: var(--text-secondary);
        }

        .notice-close {
                display: grid;
                place-items: center;
                width: 20px;
                height: 20px;
                border-radius: 50%;
                color: var(--text-muted);
        }

        .notice-close:hover {
                color: var(--gold-bright);
        }

        .context-region {
                min-width: 0;
                min-height: 0;
                height: 100%;
        }

        .scrim {
                display: none;
        }

        /* Below 1200px the context panel becomes an overlay drawer. */
        @media (max-width: 1200px) {
                .images,
                .images.context-open {
                        grid-template-columns: var(--images-history-width) minmax(0, 1fr);
                }

                .context-region {
                        position: fixed;
                        top: 0;
                        right: 0;
                        z-index: var(--z-sidebar);
                        width: min(var(--images-context-width), 90vw);
                        transform: translateX(100%);
                        transition: transform 200ms ease;
                }

                .images.context-open .context-region {
                        transform: translateX(0);
                }

                .images.context-open .context-scrim {
                        display: block;
                        position: fixed;
                        inset: 0;
                        z-index: calc(var(--z-sidebar) - 1);
                        background: rgba(0, 0, 0, 0.6);
                        border: none;
                }
        }

        /* Below 1100px the history sidebar becomes an overlay drawer. */
        @media (max-width: 1100px) {
                .images,
                .images.context-open {
                        grid-template-columns: minmax(0, 1fr);
                }

                .history-region {
                        position: fixed;
                        top: 0;
                        left: 0;
                        z-index: var(--z-sidebar);
                        width: min(var(--images-history-width), 88vw);
                        transform: translateX(-100%);
                        transition: transform 200ms ease;
                }

                .history-region.drawer {
                        transform: translateX(0);
                }

                .images .scrim:not(.context-scrim) {
                        display: block;
                        position: fixed;
                        inset: 0;
                        z-index: calc(var(--z-sidebar) - 1);
                        background: rgba(0, 0, 0, 0.6);
                        border: none;
                }
        }

        @media (max-width: 720px) {
                .composer-slot {
                        padding: var(--space-1) var(--space-4) var(--space-4);
                }

                .banner,
                .notice {
                        margin-left: var(--space-4);
                        margin-right: var(--space-4);
                        padding-left: 0;
                        padding-right: var(--space-4);
                }
        }

        .overlay {
                position: fixed;
                inset: 0;
                z-index: var(--z-modal);
                display: grid;
                place-items: center;
                padding: var(--space-5);
        }

        .dialog {
                position: relative;
                width: min(460px, 100%);
                padding: var(--space-5);
                background: var(--surface-panel-solid);
                border: 1px solid var(--border-gold);
                border-radius: var(--radius-md);
                box-shadow: var(--shadow-panel);
        }

        .dialog h3 {
                margin: 0 0 var(--space-3);
                font-family: var(--font-display);
                font-size: 17px;
                color: var(--text-primary);
        }

        .dialog-text {
                margin: 0;
                font-size: 13.5px;
                line-height: 1.6;
                color: var(--text-secondary);
        }

        .dialog-actions {
                display: flex;
                flex-wrap: wrap;
                justify-content: flex-end;
                gap: var(--space-2);
                margin-top: var(--space-5);
        }

        .btn {
                padding: 9px 16px;
                border-radius: var(--radius-pill);
                border: 1px solid var(--border-gold);
                background: linear-gradient(160deg, var(--gold-bright), var(--gold-deep));
                color: var(--text-on-gold);
                font-size: 13px;
                font-weight: 600;
        }

        .btn.ghost {
                background: transparent;
                border-color: var(--border-hair);
                color: var(--text-secondary);
        }

        .btn.ghost:hover {
                color: var(--text-primary);
                border-color: var(--border-gold);
        }

        @media (prefers-reduced-motion: reduce) {
                .history-region,
                .context-region {
                        transition: none;
                }
        }
</style>
