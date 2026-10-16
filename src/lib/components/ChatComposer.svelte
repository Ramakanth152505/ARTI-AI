<script lang="ts">
        import Icon from './Icon.svelte';
        import type { IconName } from '#lib/data/icons';
        import { NOT_CONNECTED } from '#lib/data/statusMessages';

        interface Attachment {
                id: string;
                label: string;
                icon: IconName;
                /** The file kinds the control targets once uploads are wired up. */
                accept: string;
        }

        /**
         * Attachment controls from the reference. The file inputs are real and
         * functional; they hand off to a handler that is intentionally a no-op
         * until upload work exists, so nothing is ever claimed as "uploaded".
         */
        const attachments: Attachment[] = [
                { id: 'image', label: 'Attach Image', icon: 'image', accept: 'image/*' },
                { id: 'video', label: 'Attach Video', icon: 'video', accept: 'video/*' },
                { id: 'document', label: 'Attach Document', icon: 'document', accept: '.pdf,.doc,.docx,.txt,.md' }
        ];

        interface Props {
                /** Called when the user submits a non-empty message. */
                onsubmit?: (message: string) => void;
                /**
                 * Called when files are chosen. Returns an honest, user-facing
                 * status string (e.g. a rejection reason) or nothing on success.
                 */
                onattach?: (id: string, files: FileList) => string | void;
        }

        let { onsubmit, onattach }: Props = $props();

        let draft = $state('');
        let composer = $state('');
        let textarea = $state<HTMLTextAreaElement | null>(null);
        let moreOpen = $state(false);
        let moreRoot = $state<HTMLElement | null>(null);

        let canSend = $derived(draft.trim().length > 0);

        function submit(): void {
                const message = draft.trim();
                if (!message) return;
                onsubmit?.(message);
                // No send operation actually runs, so there is no real loading state;
                // the composer reports the honest "not connected" outcome instead.
                composer = `${NOT_CONNECTED.chat} Your text: “${message}”`;
                draft = '';
                if (textarea) textarea.style.height = 'auto';
        }

        function onKeydown(event: KeyboardEvent): void {
                // Enter sends; Shift+Enter inserts a newline.
                if (event.key === 'Enter' && !event.shiftKey) {
                        event.preventDefault();
                        submit();
                }
        }

        function autosize(): void {
                if (!textarea) return;
                textarea.style.height = 'auto';
                textarea.style.height = `${Math.min(textarea.scrollHeight, 168)}px`;
        }

        function onFiles(id: string, event: Event): void {
                const input = event.currentTarget as HTMLInputElement;
                if (input.files && input.files.length) {
                        composer = onattach?.(id, input.files) ?? '';
                }
                input.value = '';
        }

        function onDocumentPointerDown(event: PointerEvent): void {
                if (!moreOpen) return;
                const target = event.target as Node;
                if (moreRoot && !moreRoot.contains(target)) moreOpen = false;
        }

        function onDocumentKeydown(event: KeyboardEvent): void {
                if (event.key === 'Escape' && moreOpen) moreOpen = false;
        }
</script>

<svelte:document onpointerdown={onDocumentPointerDown} onkeydown={onDocumentKeydown} />

<form class="composer" onsubmit={(e) => { e.preventDefault(); submit(); }}>
        <label class="input-row">
                <span class="visually-hidden">Message ARTI</span>
                <textarea
                        bind:this={textarea}
                        bind:value={draft}
                        class="input"
                        rows="2"
                        placeholder="Ask ARTI anything..."
                        onkeydown={onKeydown}
                        oninput={autosize}
                ></textarea>
        </label>

        <div class="toolbar">
                <div class="attach-group">
                        {#each attachments as tool (tool.id)}
                                <label class="tool" title={tool.label}>
                                        <Icon name={tool.icon} size={17} />
                                        <span class="tool-label">{tool.label}</span>
                                        <input
                                                type="file"
                                                accept={tool.accept}
                                                class="visually-hidden"
                                                onchange={(e) => onFiles(tool.id, e)}
                                        />
                                </label>
                        {/each}

                        <button
                                type="button"
                                class="tool"
                                title={NOT_CONNECTED.voice}
                                onclick={() => (composer = NOT_CONNECTED.voice)}
                        >
                                <Icon name="mic" size={17} />
                                <span class="tool-label">Voice Input</span>
                        </button>

                        <div class="more" bind:this={moreRoot}>
                                <button
                                        type="button"
                                        class="tool"
                                        aria-haspopup="menu"
                                        aria-expanded={moreOpen}
                                        onclick={() => (moreOpen = !moreOpen)}
                                >
                                        <Icon name="more" size={17} />
                                        <span class="tool-label">More</span>
                                </button>

                                {#if moreOpen}
                                        <div class="more-menu" role="menu" aria-label="More options">
                                                <button type="button" role="menuitem" class="more-item" disabled>
                                                        <Icon name="sparkle" size={16} />
                                                        <span>Enhance prompt</span>
                                                        <span class="more-soon">Soon</span>
                                                </button>
                                                <button type="button" role="menuitem" class="more-item" disabled>
                                                        <Icon name="lock" size={16} />
                                                        <span>Web search</span>
                                                        <span class="more-soon">Soon</span>
                                                </button>
                                        </div>
                                {/if}
                        </div>
                </div>

                <button type="submit" class="send" disabled={!canSend} aria-label="Send message">
                        <Icon name="send" size={18} stroke={1.9} />
                </button>
        </div>
</form>

{#if composer}
        <p class="composer-status" role="status">{composer}</p>
{/if}

<style>
        .composer {
                width: 100%;
                background: var(--surface-input);
                border: 1px solid var(--border-gold);
                border-radius: var(--radius-lg);
                box-shadow: var(--shadow-panel), inset 0 0 30px rgba(0, 0, 0, 0.35);
                backdrop-filter: blur(8px);
                transition: border-color 160ms ease, box-shadow 160ms ease;
        }

        .composer:focus-within {
                border-color: var(--gold);
                box-shadow: var(--shadow-panel), var(--glow-gold);
        }

        .input-row {
                display: block;
                padding: var(--space-4) var(--space-5) var(--space-2);
        }

        .input {
                display: block;
                width: 100%;
                min-height: 74px;
                max-height: 168px;
                resize: none;
                border: none;
                background: transparent;
                color: var(--text-primary);
                font: inherit;
                font-size: 15px;
                line-height: 1.5;
                overflow-y: auto;
        }

        .input::placeholder {
                color: var(--text-muted);
        }

        .input:focus {
                outline: none;
        }

        .toolbar {
                display: flex;
                align-items: center;
                gap: var(--space-2);
                padding: var(--space-1) var(--space-3) var(--space-3) var(--space-4);
        }

        .attach-group {
                display: flex;
                align-items: center;
                gap: var(--space-1);
                flex-wrap: wrap;
                min-width: 0;
        }

        .tool {
                display: flex;
                align-items: center;
                gap: var(--space-2);
                padding: 6px 10px;
                border-radius: var(--radius-pill);
                border: 1px solid transparent;
                color: var(--text-muted);
                font-size: 12.5px;
                font-weight: 500;
                cursor: pointer;
                transition: color 160ms ease, background 160ms ease, border-color 160ms ease;
        }

        .tool:hover {
                color: var(--gold-bright);
                background: rgba(201, 154, 54, 0.08);
                border-color: var(--border-hair);
        }

        .tool-label {
                white-space: nowrap;
        }

        .more {
                position: relative;
        }

        .more-menu {
                position: absolute;
                bottom: calc(100% + 8px);
                left: 0;
                min-width: 200px;
                padding: var(--space-1);
                background: var(--surface-panel-solid);
                border: 1px solid var(--border-gold);
                border-radius: var(--radius-md);
                box-shadow: var(--shadow-panel);
                z-index: var(--z-dropdown);
        }

        .more-item {
                display: flex;
                align-items: center;
                gap: var(--space-2);
                width: 100%;
                padding: var(--space-2) var(--space-3);
                border-radius: var(--radius-sm);
                color: var(--text-secondary);
                font-size: 13px;
                text-align: left;
                cursor: not-allowed;
        }

        .more-soon {
                margin-left: auto;
                font-size: 10px;
                letter-spacing: 0.1em;
                text-transform: uppercase;
                color: var(--text-muted);
        }

        .send {
                display: grid;
                place-items: center;
                width: 42px;
                height: 42px;
                margin-left: auto;
                flex-shrink: 0;
                border-radius: 50%;
                background: linear-gradient(160deg, var(--gold-bright), var(--gold-deep));
                color: var(--text-on-gold);
                box-shadow: var(--glow-gold);
                transition: transform 140ms ease, opacity 160ms ease;
        }

        .send:hover:not(:disabled) {
                transform: translateY(-1px);
        }

        .send:disabled {
                opacity: 0.45;
                cursor: not-allowed;
                box-shadow: none;
        }

        .composer-status {
                margin: var(--space-2) auto 0;
                max-width: var(--composer-max-width);
                font-size: 12.5px;
                color: var(--text-secondary);
                text-align: center;
        }

        @media (max-width: 720px) {
                .tool-label {
                        display: none;
                }

                .tool {
                        padding: 8px;
                }
        }
</style>
