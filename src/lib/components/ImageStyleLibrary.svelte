<script lang="ts">
        /**
         * Styles library.
         *
         * A dedicated, searchable, category-filtered browser over the catalog in
         * `#lib/images/styles.ts`. It is a modal dialog so it never permanently
         * consumes workspace width, and it is deliberately not a five-item dropdown:
         * the catalog is data, so it can grow to hundreds of entries without any
         * change here.
         *
         * Honesty notes:
         *  - No preview artwork is generated or faked. Because the catalog ships no
         *    preview assets, each card shows a deliberate monogram fallback.
         *  - Selecting a style never silently overwrites an existing prompt: the card
         *    reports the selection and the parent decides how to combine the text.
         */
        import Icon from './Icon.svelte';
        import {
                IMAGE_STYLES,
                STYLE_CATEGORIES,
                categoryCounts,
                findCategory,
                searchStyles,
                type ImageStyle
        } from '#lib/images/styles';

        interface Props {
                /** Id of the currently selected style, or null. */
                selectedId: string | null;
                /** Called when the user activates a style card. */
                onselect: (id: string) => void;
                /** Called when the user clears the active style. */
                onclear: () => void;
                onclose: () => void;
        }

        let { selectedId, onselect, onclear, onclose }: Props = $props();

        let query = $state('');
        let category = $state<string | null>(null);
        let dialog = $state<HTMLDivElement | null>(null);
        let searchInput = $state<HTMLInputElement | null>(null);

        const counts = categoryCounts();

        let results = $derived(searchStyles(query, category));
        let selectedStyle = $derived(IMAGE_STYLES.find((s) => s.id === selectedId) ?? null);

        /** Two-letter monogram for the preview fallback, e.g. "Cinematic Photorealism" -> "CP". */
        function monogram(style: ImageStyle): string {
                const words = style.name.split(/[\s-]+/).filter(Boolean);
                const letters = words.slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '');
                return letters.join('') || 'AI';
        }

        // Focus the search field on open, and restore focus on close.
        $effect(() => {
                const previous = document.activeElement as HTMLElement | null;
                queueMicrotask(() => searchInput?.focus());
                return () => previous?.focus?.();
        });

        function onKeydown(event: KeyboardEvent): void {
                if (event.key === 'Escape') {
                        event.stopPropagation();
                        onclose();
                        return;
                }
                if (event.key !== 'Tab' || !dialog) return;
                const items = Array.from(
                        dialog.querySelectorAll<HTMLElement>(
                                'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
                        )
                ).filter((el) => !el.hasAttribute('disabled'));
                if (items.length === 0) return;
                const first = items[0];
                const last = items[items.length - 1];
                if (event.shiftKey && document.activeElement === first) {
                        event.preventDefault();
                        last.focus();
                } else if (!event.shiftKey && document.activeElement === last) {
                        event.preventDefault();
                        first.focus();
                }
        }

        function activate(style: ImageStyle): void {
                onselect(style.id);
        }
</script>

<div class="overlay" role="presentation">
        <button class="scrim" aria-label="Close style library" onclick={onclose}></button>

        <div
                class="panel"
                bind:this={dialog}
                role="dialog"
                aria-modal="true"
                aria-labelledby="styles-title"
                tabindex="-1"
                onkeydown={onKeydown}
        >
                <header class="head">
                        <div>
                                <h2 id="styles-title">Styles</h2>
                                <p class="head-sub">
                                        {IMAGE_STYLES.length} styles across {STYLE_CATEGORIES.length} categories.
                                        A curated starter set, not the full universe of styles.
                                </p>
                        </div>
                        <button class="close" aria-label="Close style library" onclick={onclose}>
                                <Icon name="close" size={16} />
                        </button>
                </header>

                <div class="toolbar">
                        <label class="search">
                                <span class="visually-hidden">Search styles</span>
                                <Icon name="search" size={15} />
                                <input
                                        bind:this={searchInput}
                                        type="search"
                                        bind:value={query}
                                        placeholder="Search styles…"
                                        autocomplete="off"
                                />
                                {#if query}
                                        <button class="clear" aria-label="Clear search" onclick={() => (query = '')}>
                                                <Icon name="close" size={13} />
                                        </button>
                                {/if}
                        </label>

                        {#if selectedStyle}
                                <div class="active" role="status">
                                        <span class="active-dot" aria-hidden="true"></span>
                                        <span class="active-name">{selectedStyle.name}</span>
                                        <button class="active-clear" onclick={onclear}>Remove</button>
                                </div>
                        {/if}
                </div>

                <div class="categories" role="tablist" aria-label="Style categories">
                        <button
                                role="tab"
                                class="cat"
                                class:on={category === null}
                                aria-selected={category === null}
                                onclick={() => (category = null)}
                        >
                                All <span class="cat-count">{IMAGE_STYLES.length}</span>
                        </button>
                        {#each STYLE_CATEGORIES as group (group.id)}
                                <button
                                        role="tab"
                                        class="cat"
                                        class:on={category === group.id}
                                        aria-selected={category === group.id}
                                        title={group.description}
                                        onclick={() => (category = group.id)}
                                >
                                        {group.label} <span class="cat-count">{counts[group.id] ?? 0}</span>
                                </button>
                        {/each}
                </div>

                <div class="results" role="region" aria-label="Style results" aria-live="polite">
                        {#if results.length === 0}
                                <p class="empty">
                                        No styles match “{query}”{category ? ` in ${findCategory(category)?.label}` : ''}. Try a different
                                        term or browse all categories.
                                </p>
                        {:else}
                                <ul class="grid">
                                        {#each results as style (style.id)}
                                                <li>
                                                        <button
                                                                class="card"
                                                                class:selected={style.id === selectedId}
                                                                aria-pressed={style.id === selectedId}
                                                                onclick={() => activate(style)}
                                                        >
                                                                <span class="card-preview" aria-hidden="true">
                                                                        <!-- No preview asset exists; a deliberate monogram stands in
                                                                             rather than a broken or fabricated image. -->
                                                                        <span class="monogram">{monogram(style)}</span>
                                                                </span>
                                                                <span class="card-body">
                                                                        <span class="card-head">
                                                                                <span class="card-name">{style.name}</span>
                                                                                {#if style.id === selectedId}
                                                                                        <span class="tick" title="Selected">
                                                                                                <Icon name="check" size={13} />
                                                                                        </span>
                                                                                {/if}
                                                                        </span>
                                                                        <span class="card-cat">{findCategory(style.categoryId)?.label}</span>
                                                                        <span class="card-summary">{style.summary}</span>
                                                                </span>
                                                        </button>
                                                </li>
                                        {/each}
                                </ul>
                        {/if}
                </div>
        </div>
</div>

<style>
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

        .panel {
                position: relative;
                display: flex;
                flex-direction: column;
                width: min(880px, 100%);
                height: min(78vh, 720px);
                background: var(--surface-panel-solid);
                border: 1px solid var(--border-gold);
                border-radius: var(--radius-md);
                box-shadow: var(--shadow-panel);
                overflow: hidden;
        }

        .head {
                display: flex;
                align-items: flex-start;
                justify-content: space-between;
                gap: var(--space-3);
                padding: var(--space-4) var(--space-5) var(--space-3);
                border-bottom: 1px solid var(--border-hair);
                flex-shrink: 0;
        }

        h2 {
                margin: 0;
                font-family: var(--font-display);
                font-size: 20px;
                letter-spacing: 0.04em;
                color: var(--text-primary);
        }

        .head-sub {
                margin: 3px 0 0;
                font-size: 12px;
                color: var(--text-muted);
        }

        .close {
                display: grid;
                place-items: center;
                width: 32px;
                height: 32px;
                border-radius: var(--radius-sm);
                color: var(--text-secondary);
                flex-shrink: 0;
        }

        .close:hover {
                color: var(--gold-bright);
                background: rgba(201, 154, 54, 0.1);
        }

        .toolbar {
                display: flex;
                align-items: center;
                gap: var(--space-3);
                padding: var(--space-3) var(--space-5);
                flex-shrink: 0;
                flex-wrap: wrap;
        }

        .search {
                display: flex;
                align-items: center;
                gap: var(--space-2);
                flex: 1;
                min-width: 180px;
                padding: 8px 12px;
                border-radius: var(--radius-pill);
                border: 1px solid var(--border-hair);
                background: rgba(255, 255, 255, 0.03);
                color: var(--text-secondary);
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
                font-size: 13.5px;
        }

        .search input:focus {
                outline: none;
        }

        .clear {
                display: grid;
                place-items: center;
                width: 20px;
                height: 20px;
                border-radius: 50%;
                color: var(--text-muted);
        }

        .clear:hover {
                color: var(--gold-bright);
        }

        .active {
                display: inline-flex;
                align-items: center;
                gap: var(--space-2);
                padding: 6px 8px 6px 12px;
                border-radius: var(--radius-pill);
                border: 1px solid var(--border-gold);
                background: rgba(201, 154, 54, 0.1);
                font-size: 12.5px;
                color: var(--gold-bright);
        }

        .active-dot {
                width: 6px;
                height: 6px;
                border-radius: 50%;
                background: var(--gold-bright);
        }

        .active-clear {
                padding: 3px 10px;
                border-radius: var(--radius-pill);
                border: 1px solid var(--border-hair);
                color: var(--text-secondary);
                font-size: 11.5px;
        }

        .active-clear:hover {
                color: var(--gold-bright);
                border-color: var(--border-gold);
        }

        .categories {
                display: flex;
                gap: var(--space-2);
                padding: 0 var(--space-5) var(--space-3);
                overflow-x: auto;
                flex-shrink: 0;
        }

        .cat {
                display: inline-flex;
                align-items: center;
                gap: 6px;
                padding: 6px 12px;
                border-radius: var(--radius-pill);
                border: 1px solid var(--border-hair);
                color: var(--text-secondary);
                font-size: 12.5px;
                white-space: nowrap;
        }

        .cat:hover {
                color: var(--text-primary);
                border-color: var(--border-gold);
        }

        .cat.on {
                color: var(--gold-bright);
                border-color: var(--border-gold);
                background: rgba(201, 154, 54, 0.12);
        }

        .cat-count {
                font-size: 10.5px;
                color: var(--text-muted);
        }

        .cat.on .cat-count {
                color: var(--gold-bright);
        }

        .results {
                flex: 1;
                min-height: 0;
                overflow-y: auto;
                padding: 0 var(--space-5) var(--space-5);
        }

        .empty {
                margin: var(--space-6) auto;
                max-width: 420px;
                text-align: center;
                font-size: 13px;
                line-height: 1.6;
                color: var(--text-muted);
        }

        .grid {
                list-style: none;
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
                gap: var(--space-3);
                margin: 0;
                padding: 0;
        }

        .card {
                display: flex;
                flex-direction: column;
                gap: var(--space-2);
                width: 100%;
                height: 100%;
                text-align: left;
                padding: var(--space-2);
                border-radius: var(--radius-md);
                border: 1px solid var(--border-hair);
                background: rgba(255, 255, 255, 0.02);
                transition: border-color 160ms ease, background 160ms ease;
        }

        .card:hover {
                border-color: var(--border-gold);
                background: rgba(201, 154, 54, 0.06);
        }

        .card.selected {
                border-color: var(--border-gold);
                background: rgba(201, 154, 54, 0.12);
                box-shadow: inset 0 0 18px rgba(229, 193, 106, 0.08);
        }

        .card-preview {
                display: grid;
                place-items: center;
                height: 72px;
                border-radius: var(--radius-sm);
                border: 1px solid var(--border-hair);
                background:
                        radial-gradient(circle at 30% 25%, rgba(201, 154, 54, 0.16), transparent 60%),
                        linear-gradient(160deg, #0c0e10, #080807);
        }

        .monogram {
                font-family: var(--font-display);
                font-size: 20px;
                letter-spacing: 0.14em;
                color: var(--gold-deep);
        }

        .card.selected .monogram {
                color: var(--gold-bright);
        }

        .card-body {
                display: flex;
                flex-direction: column;
                gap: 3px;
                padding: 0 4px 4px;
                min-width: 0;
        }

        .card-head {
                display: flex;
                align-items: center;
                gap: var(--space-2);
        }

        .card-name {
                font-size: 13.5px;
                font-weight: 600;
                color: var(--text-primary);
                min-width: 0;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
        }

        .tick {
                display: grid;
                place-items: center;
                width: 18px;
                height: 18px;
                margin-left: auto;
                border-radius: 50%;
                border: 1px solid var(--border-gold);
                color: var(--gold-bright);
                flex-shrink: 0;
        }

        .card-cat {
                font-size: 10px;
                letter-spacing: 0.1em;
                text-transform: uppercase;
                color: var(--gold);
        }

        .card-summary {
                font-size: 12px;
                line-height: 1.5;
                color: var(--text-muted);
        }

        @media (max-width: 720px) {
                .overlay {
                        padding: var(--space-2);
                }

                .panel {
                        height: min(88vh, 720px);
                }

                .head,
                .toolbar,
                .categories,
                .results {
                        padding-left: var(--space-4);
                        padding-right: var(--space-4);
                }

                .grid {
                        grid-template-columns: 1fr;
                }
        }

        @media (prefers-reduced-motion: reduce) {
                .card {
                        transition: none;
                }
        }
</style>
