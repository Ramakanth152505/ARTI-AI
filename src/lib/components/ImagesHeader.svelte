<script lang="ts">
        /**
         * Images workspace header.
         *
         * Compact by design: a title, one supporting line and only the actions the
         * workspace actually performs. It never grows into a dashboard band that eats
         * vertical space the conversation needs.
         */
        import Icon from './Icon.svelte';
        import { IMAGE_STATUS } from '#lib/images/config';

        interface Props {
                /** Opens the style library. */
                onopenstyles: () => void;
                /** Opens the history drawer (narrow screens) or focuses it. */
                onopenhistory: () => void;
                /** Starts a new image conversation. */
                onnew: () => void;
                /** Whether a generation service is configured, for the honest status line. */
                configured: boolean;
                /** Whether the context panel is open. */
                contextOpen: boolean;
                ontogglecontext: () => void;
        }

        let { onopenstyles, onopenhistory, onnew, configured, contextOpen, ontogglecontext }: Props = $props();
</script>

<header class="images-header">
        <button class="icon-btn history-btn" aria-label="Open image history" onclick={onopenhistory}>
                <Icon name="menu" size={19} />
        </button>

        <div class="titles">
                <h1>Images</h1>
                <p class="subtitle">Create images, explore styles, and turn your ideas into visuals.</p>
        </div>

        <div class="actions">
                <button class="chip" onclick={onopenstyles}>
                        <Icon name="palette" size={15} />
                        <span>Styles</span>
                </button>
                <button class="chip" onclick={onnew}>
                        <Icon name="plus" size={15} />
                        <span>New</span>
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
                        {IMAGE_STATUS.generationUnavailable} Prompts, styles and history work fully; connect an image service to
                        generate.
                </span>
        </p>
{/if}

<style>
        .images-header {
                display: flex;
                align-items: center;
                gap: var(--space-3);
                flex-shrink: 0;
                padding: var(--space-3) var(--space-5);
                border-bottom: 1px solid var(--border-hair);
                background: rgba(8, 8, 7, 0.6);
                backdrop-filter: blur(8px);
                /* The blur creates a stacking context, so a menu opened here would sit
                   beneath the scroller unless the header itself is raised. Kept below
                   --z-sidebar so mobile drawers still cover it. */
                position: relative;
                z-index: 2;
        }

        .history-btn {
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
                border: 1px solid var(--border-hair);
                color: var(--text-secondary);
        }

        .icon-btn:hover,
        .icon-btn[aria-pressed='true'] {
                color: var(--gold-bright);
                border-color: var(--border-gold);
                background: rgba(201, 154, 54, 0.08);
        }

        .status-note {
                display: flex;
                align-items: flex-start;
                gap: 6px;
                margin: 0;
                padding: var(--space-2) var(--space-5);
                font-size: 11.5px;
                line-height: 1.5;
                color: var(--text-muted);
                border-bottom: 1px solid var(--border-hair);
                flex-shrink: 0;
        }

        @media (max-width: 900px) {
                .history-btn {
                        display: grid;
                }
        }

        @media (max-width: 720px) {
                .images-header {
                        padding: var(--space-3) var(--space-4);
                }

                .chip span {
                        display: none;
                }

                .chip {
                        padding: 8px;
                }

                .subtitle {
                        display: none;
                }
        }
</style>
