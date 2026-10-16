<script lang="ts">
        /**
         * Images history sidebar.
         *
         * Navigates image conversations only; global navigation stays in the
         * application shell. Every row keys off a stable conversation id, never a list
         * position. Large histories are paged: older conversations are revealed a page at
         * a time and are never deleted or hidden to keep the list fast.
         */
        import Icon from './Icon.svelte';
        import Menu from './Menu.svelte';
        import type { MenuItem } from './menu.types';
        import { relativeTime } from '#lib/shared/text';
        import type { ImageSearchResult } from '#lib/images/search';
        import type { ImageConversation } from '#lib/images/types';

        interface Props {
                conversations: ImageConversation[];
                archived: ImageConversation[];
                activeId: string | null;
                loading: boolean;
                storageNotice: { tone: 'info' | 'warning'; text: string };
                storageLabel: string;
                searchQuery: string;
                searchResults: ImageSearchResult[];
                searching: boolean;
                showArchived: boolean;
                hiddenCount: number;
                /** Ready-image count for a conversation row, used for the small badge. */
                previewFor: (conversation: ImageConversation) => number;
                onnew: () => void;
                onselect: (id: string) => void;
                onsearch: (query: string) => void;
                onclearsearch: () => void;
                ontogglearchived: () => void;
                onloadmore: () => void;
                onpin: (id: string) => void;
                onrename: (id: string, title: string) => void;
                onarchive: (id: string, archived: boolean) => void;
                ondelete: (id: string) => void;
                oncollapse: () => void;
        }

        let {
                conversations,
                archived,
                activeId,
                loading,
                storageNotice,
                storageLabel,
                searchQuery,
                searchResults,
                searching,
                showArchived,
                hiddenCount,
                previewFor,
                onnew,
                onselect,
                onsearch,
                onclearsearch,
                ontogglearchived,
                onloadmore,
                onpin,
                onrename,
                onarchive,
                ondelete,
                oncollapse
        }: Props = $props();

        type RenameTarget = { id: string; title: string };
        type DeleteTarget = { id: string; title: string };

        let renameTarget = $state<RenameTarget | null>(null);
        let renameValue = $state('');
        let deleteTarget = $state<DeleteTarget | null>(null);

        let searchTimer: ReturnType<typeof setTimeout> | undefined;
        function onSearchInput(event: Event): void {
                const value = (event.currentTarget as HTMLInputElement).value;
                clearTimeout(searchTimer);
                searchTimer = setTimeout(() => onsearch(value), 220);
        }

        function menuItems(conversation: ImageConversation): MenuItem[] {
                return [
                        { id: 'pin', label: conversation.pinned ? 'Unpin' : 'Pin to top', icon: 'pin' },
                        { id: 'rename', label: 'Rename', icon: 'edit' },
                        { id: 'archive', label: conversation.archived ? 'Unarchive' : 'Archive', icon: 'archive' },
                        { id: 'delete', label: 'Delete', icon: 'trash', danger: true }
                ];
        }

        function onAction(conversation: ImageConversation, action: string): void {
                switch (action) {
                        case 'pin':
                                onpin(conversation.id);
                                break;
                        case 'rename':
                                renameTarget = { id: conversation.id, title: conversation.title };
                                renameValue = conversation.title;
                                break;
                        case 'archive':
                                onarchive(conversation.id, !conversation.archived);
                                break;
                        case 'delete':
                                deleteTarget = { id: conversation.id, title: conversation.title };
                                break;
                }
        }
</script>

<aside class="history" aria-label="Image history">
        <div class="head">
                <h2>History</h2>
                <button class="icon-btn collapse" aria-label="Close history" onclick={oncollapse}>
                        <Icon name="close" size={16} />
                </button>
        </div>

        <div class="controls">
                <button class="new" onclick={onnew}>
                        <Icon name="plus" size={15} />
                        <span>New image</span>
                </button>

                <label class="search">
                        <span class="visually-hidden">Search image conversations</span>
                        <Icon name="search" size={14} />
                        <input
                                type="search"
                                value={searchQuery}
                                placeholder="Search conversations"
                                autocomplete="off"
                                oninput={onSearchInput}
                        />
                </label>
        </div>

        {#if storageNotice.text}
                <p class="notice" class:warning={storageNotice.tone === 'warning'} role="status">
                        <Icon name={storageNotice.tone === 'warning' ? 'alert' : 'info'} size={12} />
                        <span>{storageNotice.text}</span>
                </p>
        {/if}

        <div class="list">
                {#if loading}
                        <p class="state" role="status">Loading history…</p>
                {:else if searchQuery.trim()}
                        {#if searching}
                                <p class="state" role="status">Searching…</p>
                        {:else if searchResults.length === 0}
                                <p class="state">No conversations match “{searchQuery}”.</p>
                        {:else}
                                <ul>
                                        {#each searchResults as result (result.conversation.id)}
                                                <li>
                                                        <button
                                                                class="row"
                                                                class:active={result.conversation.id === activeId}
                                                                onclick={() => onselect(result.conversation.id)}
                                                        >
                                                                <span class="row-title">{result.conversation.title}</span>
                                                                <span class="row-sub">{result.snippet ?? 'Title match'}</span>
                                                        </button>
                                                </li>
                                        {/each}
                                </ul>
                                <button class="clear-search" onclick={onclearsearch}>Clear search</button>
                        {/if}
                {:else if conversations.length === 0}
                        <p class="state">No image conversations yet. Start one with “New image”.</p>
                {:else}
                        <ul>
                                {#each conversations as conversation (conversation.id)}
                                        {@const imageCount = previewFor(conversation)}
                                        <li class="item">
                                                <button
                                                        class="row"
                                                        class:active={conversation.id === activeId}
                                                        onclick={() => onselect(conversation.id)}
                                                >
                                                        <span class="row-body">
                                                                <span class="row-title">
                                                                        {#if conversation.pinned}<Icon name="pin" size={11} />{/if}
                                                                        {conversation.title}
                                                                </span>
                                                                <span class="row-sub">
                                                                        {relativeTime(conversation.updatedAt)}
                                                                        {#if imageCount > 0}
                                                                                <span class="sep" aria-hidden="true">·</span>
                                                                                <span class="count">
                                                                                        <Icon name="image" size={11} />{imageCount}
                                                                                </span>
                                                                        {/if}
                                                                </span>
                                                        </span>
                                                </button>
                                                <Menu
                                                        label="Conversation options"
                                                        triggerIcon="more"
                                                        items={menuItems(conversation)}
                                                        onselect={(action) => onAction(conversation, action)}
                                                />
                                        </li>
                                {/each}
                        </ul>

                        {#if hiddenCount > 0}
                                <button class="load-more" onclick={onloadmore}>
                                        Show {hiddenCount} older conversation{hiddenCount === 1 ? '' : 's'}
                                </button>
                        {/if}
                {/if}
        </div>

        <div class="foot">
                <button class="archive-toggle" class:on={showArchived} aria-pressed={showArchived} onclick={ontogglearchived}>
                        <Icon name="archive" size={14} />
                        <span>Archived ({archived.length})</span>
                </button>
                {#if showArchived}
                        {#if archived.length === 0}
                                <p class="state small">No archived conversations.</p>
                        {:else}
                                <ul>
                                        {#each archived as conversation (conversation.id)}
                                                <li class="item">
                                                        <button
                                                                class="row"
                                                                class:active={conversation.id === activeId}
                                                                onclick={() => onselect(conversation.id)}
                                                        >
                                                                <span class="row-body">
                                                                        <span class="row-title">{conversation.title}</span>
                                                                        <span class="row-sub">Archived</span>
                                                                </span>
                                                        </button>
                                                        <Menu
                                                                label="Conversation options"
                                                                triggerIcon="more"
                                                                items={menuItems(conversation)}
                                                                onselect={(action) => onAction(conversation, action)}
                                                        />
                                                </li>
                                        {/each}
                                </ul>
                        {/if}
                {/if}
                <p class="storage-label" title="Where image conversations are stored">Stored: {storageLabel}</p>
        </div>
</aside>

{#if renameTarget}
        <div class="overlay" role="presentation">
                <button class="scrim" aria-label="Cancel rename" onclick={() => (renameTarget = null)}></button>
                <div class="dialog" role="dialog" aria-modal="true" aria-label="Rename conversation">
                        <h3>Rename conversation</h3>
                        <label class="field">
                                <span>Title</span>
                                <input
                                        type="text"
                                        bind:value={renameValue}
                                        onkeydown={(e) => {
                                                if (e.key === 'Enter' && renameTarget && renameValue.trim()) {
                                                        onrename(renameTarget.id, renameValue);
                                                        renameTarget = null;
                                                }
                                                if (e.key === 'Escape') renameTarget = null;
                                        }}
                                />
                        </label>
                        <div class="dialog-actions">
                                <button class="btn ghost" onclick={() => (renameTarget = null)}>Cancel</button>
                                <button
                                        class="btn"
                                        disabled={!renameValue.trim()}
                                        onclick={() => {
                                                if (renameTarget && renameValue.trim()) onrename(renameTarget.id, renameValue);
                                                renameTarget = null;
                                        }}
                                >
                                        Save
                                </button>
                        </div>
                </div>
        </div>
{/if}

{#if deleteTarget}
        <div class="overlay" role="presentation">
                <button class="scrim" aria-label="Cancel delete" onclick={() => (deleteTarget = null)}></button>
                <div class="dialog" role="dialog" aria-modal="true" aria-label="Delete conversation">
                        <h3>Delete conversation</h3>
                        <p class="dialog-text">
                                “{deleteTarget.title}” and its images will be permanently deleted. This cannot be undone.
                        </p>
                        <div class="dialog-actions">
                                <button class="btn ghost" onclick={() => (deleteTarget = null)}>Cancel</button>
                                <button
                                        class="btn destructive"
                                        onclick={() => {
                                                if (deleteTarget) ondelete(deleteTarget.id);
                                                deleteTarget = null;
                                        }}
                                >
                                        Delete
                                </button>
                        </div>
                </div>
        </div>
{/if}

<style>
        .history {
                display: flex;
                flex-direction: column;
                min-height: 0;
                height: 100%;
                width: 100%;
                background: var(--surface-panel-solid);
                border-right: 1px solid var(--border-hair);
        }

        .head {
                display: flex;
                align-items: center;
                justify-content: space-between;
                height: var(--topbar-height);
                flex-shrink: 0;
                padding: 0 var(--space-4);
                border-bottom: 1px solid var(--border-hair);
        }

        h2 {
                margin: 0;
                font-family: var(--font-display);
                font-size: 15px;
                font-weight: 600;
                letter-spacing: 0.08em;
                color: var(--gold-bright);
        }

        .icon-btn {
                display: grid;
                place-items: center;
                width: 30px;
                height: 30px;
                border-radius: var(--radius-sm);
                color: var(--text-secondary);
        }

        .icon-btn:hover {
                color: var(--gold-bright);
                background: rgba(201, 154, 54, 0.1);
        }

        .collapse {
                display: none;
        }

        .controls {
                display: flex;
                flex-direction: column;
                gap: var(--space-2);
                padding: var(--space-3) var(--space-3) var(--space-2);
                flex-shrink: 0;
        }

        .new {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                gap: 7px;
                padding: 9px 12px;
                border-radius: var(--radius-md);
                border: 1px solid var(--border-gold);
                background: rgba(201, 154, 54, 0.1);
                color: var(--gold-bright);
                font-size: 13px;
                font-weight: 600;
        }

        .new:hover {
                background: rgba(201, 154, 54, 0.18);
        }

        .search {
                display: flex;
                align-items: center;
                gap: 6px;
                padding: 7px 11px;
                border-radius: var(--radius-pill);
                border: 1px solid var(--border-hair);
                background: rgba(255, 255, 255, 0.03);
                color: var(--text-muted);
        }

        .search:focus-within {
                border-color: var(--border-gold);
        }

        .search input {
                flex: 1;
                min-width: 0;
                border: none;
                background: transparent;
                color: var(--text-primary);
                font: inherit;
                font-size: 12.5px;
        }

        .search input:focus {
                outline: none;
        }

        .notice {
                display: flex;
                align-items: flex-start;
                gap: 6px;
                margin: 0 var(--space-3) var(--space-2);
                padding: var(--space-2) var(--space-3);
                border-radius: var(--radius-sm);
                border: 1px solid var(--border-hair);
                font-size: 11px;
                line-height: 1.5;
                color: var(--text-muted);
        }

        .notice.warning {
                color: #e0a08c;
                border-color: rgba(212, 120, 96, 0.35);
        }

        .list {
                flex: 1;
                min-height: 0;
                overflow-y: auto;
                padding: 0 var(--space-2) var(--space-3);
        }

        ul {
                list-style: none;
                margin: 0;
                padding: 0;
                display: flex;
                flex-direction: column;
                gap: 2px;
        }

        .item {
                display: flex;
                align-items: center;
                gap: 2px;
        }

        .row {
                display: flex;
                flex-direction: column;
                align-items: flex-start;
                gap: 2px;
                flex: 1;
                min-width: 0;
                padding: 8px 10px;
                border-radius: var(--radius-md);
                border: 1px solid transparent;
                text-align: left;
        }

        .row:hover {
                background: rgba(201, 154, 54, 0.07);
        }

        .row.active {
                background: linear-gradient(90deg, rgba(201, 154, 54, 0.16), rgba(201, 154, 54, 0.04));
                border-color: var(--border-gold);
        }

        .row-body {
                display: flex;
                flex-direction: column;
                gap: 1px;
                min-width: 0;
                width: 100%;
        }

        .row-title {
                display: flex;
                align-items: center;
                gap: 5px;
                font-size: 13px;
                color: var(--text-primary);
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                max-width: 100%;
        }

        .row.active .row-title {
                color: var(--gold-bright);
        }

        .row-sub {
                display: flex;
                align-items: center;
                gap: 5px;
                font-size: 11px;
                color: var(--text-muted);
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                max-width: 100%;
        }

        .count {
                display: inline-flex;
                align-items: center;
                gap: 3px;
                color: var(--gold);
        }

        .state {
                margin: var(--space-4) var(--space-3);
                font-size: 12px;
                line-height: 1.55;
                color: var(--text-muted);
        }

        .state.small {
                margin: var(--space-2) var(--space-3);
        }

        .clear-search,
        .load-more {
                display: block;
                width: 100%;
                margin: var(--space-2) 0 0;
                padding: 8px;
                border-radius: var(--radius-sm);
                border: 1px solid var(--border-hair);
                color: var(--text-secondary);
                font-size: 12px;
        }

        .clear-search:hover,
        .load-more:hover {
                color: var(--gold-bright);
                border-color: var(--border-gold);
        }

        .foot {
                flex-shrink: 0;
                border-top: 1px solid var(--border-hair);
                padding: var(--space-2) var(--space-3) var(--space-3);
        }

        .archive-toggle {
                display: inline-flex;
                align-items: center;
                gap: 6px;
                padding: 7px 10px;
                border-radius: var(--radius-sm);
                color: var(--text-secondary);
                font-size: 12.5px;
        }

        .archive-toggle:hover,
        .archive-toggle.on {
                color: var(--gold-bright);
                background: rgba(201, 154, 54, 0.08);
        }

        .storage-label {
                margin: var(--space-2) 0 0;
                padding: 0 var(--space-2);
                font-size: 10.5px;
                color: var(--text-muted);
        }

        .overlay {
                position: fixed;
                inset: 0;
                z-index: var(--z-modal);
                display: grid;
                place-items: center;
                padding: var(--space-5);
        }

        .scrim {
                position: absolute;
                inset: 0;
                background: rgba(0, 0, 0, 0.68);
                border: none;
        }

        .dialog {
                position: relative;
                width: min(400px, 100%);
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
                margin: 0 0 var(--space-3);
                font-size: 13.5px;
                line-height: 1.55;
                color: var(--text-secondary);
        }

        .field {
                display: flex;
                flex-direction: column;
                gap: 6px;
                font-size: 12.5px;
                color: var(--text-secondary);
        }

        .field input {
                padding: 9px 12px;
                border-radius: var(--radius-sm);
                border: 1px solid var(--border-hair);
                background: rgba(255, 255, 255, 0.03);
                color: var(--text-primary);
                font: inherit;
                font-size: 14px;
        }

        .field input:focus {
                outline: none;
                border-color: var(--border-gold);
        }

        .dialog-actions {
                display: flex;
                justify-content: flex-end;
                gap: var(--space-2);
                margin-top: var(--space-4);
        }

        .btn {
                padding: 9px 18px;
                border-radius: var(--radius-pill);
                border: 1px solid var(--border-gold);
                background: linear-gradient(160deg, var(--gold-bright), var(--gold-deep));
                color: var(--text-on-gold);
                font-size: 13.5px;
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

        .btn.destructive {
                background: linear-gradient(160deg, #b4553f, #7d3324);
                border-color: rgba(212, 120, 96, 0.6);
                color: #fdf3f0;
        }

        .btn:disabled {
                opacity: 0.5;
                cursor: not-allowed;
        }

        @media (max-width: 1100px) {
                .collapse {
                        display: grid;
                }
        }
</style>
