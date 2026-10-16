<script lang="ts">
        /**
         * Videos workspace header.
         *
         * Compact by design: a title, one supporting line and only the actions the
         * workspace actually performs. It carries its own stacking context (blur +
         * raised z-index) so dropdowns opened from it stay above the scroller, matching
         * the Chats and Images headers.
         */
        import Icon from './Icon.svelte';
        import { VIDEO_STATUS } from '#lib/videos/config';

        interface Props {
                onopenstyles: () => void;
                onopenmenu: () => void;
                onnewproject: () => void;
                configured: boolean;
                contextOpen: boolean;
                ontogglecontext: () => void;
        }

        let { onopenstyles, onopenmenu, onnewproject, configured, contextOpen, ontogglecontext }: Props = $props();
</script>

<header class="videos-header">
        <button class="icon-btn menu-btn" aria-label="Open Videos sections" onclick={onopenmenu}>
                <Icon name="menu" size={19} />
        </button>

        <div class="titles">
                <h1>Videos</h1>
                <p class="subtitle">Plan, generate and assemble productions — clips, shorts, films and series.</p>
        </div>

        <div class="actions">
                <button class="chip" onclick={onopenstyles}>
                        <Icon name="palette" size={15} />
                        <span>Styles</span>
                </button>
                <button class="chip" onclick={onnewproject}>
                        <Icon name="plus" size={15} />
                        <span>New project</span>
                </button>
                <button
                        class="icon-btn"
                        aria-label={contextOpen ? 'Close context panel' : 'Open context panel'}
                        aria-pressed={contextOpen}
                        title={contextOpen ? 'Close context panel' : 'Open context panel'}
                        onclick={ontogglecontext}
                >
                        <Icon name="panel-right" size={18} />
                </button>
        </div>
</header>

{#if !configured}
        <p class="status-note" role="status">
                <Icon name="info" size={13} />
                <span>
                        {VIDEO_STATUS.generationUnavailable} Projects, folders, series, scenes, shots, prompts and the queue all
                        work and are saved; generation is disabled until a service is connected.
                </span>
        </p>
{/if}

<style>
        .videos-header {
                display: flex;
                align-items: center;
                gap: var(--space-3);
                flex-shrink: 0;
                padding: var(--space-3) var(--space-5);
                border-bottom: 1px solid var(--border-hair);
                background: rgba(8, 8, 7, 0.6);
                backdrop-filter: blur(8px);
                position: relative;
                z-index: 2;
        }

        .menu-btn {
                display: none;
        }

        .titles {
                min-width: 0;
                flex: 1;
        }

        h1 {
                margin: 0;
                font-family: var(--font-display);
                font-size: 19px;
                font-weight: 600;
                letter-spacing: 0.04em;
                color: var(--text-primary);
        }

        .subtitle {
                margin: 2px 0 0;
                font-size: 12.5px;
                color: var(--text-muted);
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
        }

        .actions {
                display: flex;
                align-items: center;
                gap: var(--space-2);
                flex-shrink: 0;
        }

        .chip {
                display: inline-flex;
                align-items: center;
                gap: 6px;
                padding: 7px 13px;
                border-radius: var(--radius-pill);
                border: 1px solid var(--border-hair);
                color: var(--text-secondary);
                font-size: 12.5px;
                font-weight: 500;
                white-space: nowrap;
        }

        .chip:hover {
                color: var(--gold-bright);
                border-color: var(--border-gold);
                background: rgba(201, 154, 54, 0.08);
        }

        .icon-btn {
                display: grid;
                place-items: center;
                width: 34px;
                height: 34px;
                border-radius: var(--radius-sm);
                color: var(--text-secondary);
        }

        .icon-btn:hover,
        .icon-btn[aria-pressed='true'] {
                color: var(--gold-bright);
                background: rgba(201, 154, 54, 0.1);
        }

        .status-note {
                display: flex;
                align-items: center;
                gap: var(--space-2);
                margin: 0;
                padding: var(--space-2) var(--space-5);
                flex-shrink: 0;
                border-bottom: 1px solid var(--border-hair);
                color: var(--text-muted);
                font-size: 12px;
                background: rgba(201, 154, 54, 0.05);
        }

        .status-note span {
                min-width: 0;
        }

        @media (max-width: 900px) {
                .menu-btn {
                        display: grid;
                }

                .chip span {
                        display: none;
                }

                .chip {
                        padding: 8px;
                }
        }
</style>
