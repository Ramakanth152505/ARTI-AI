<script lang="ts">
        /**
         * Renders a single Images conversation message.
         *
         * Deliberately lighter than the general Chats message: a compact prompt block
         * for the user and a results grid for ARTI. There are no AI avatars, no
         * repeated identity labels and no decorative images, because the subject here
         * is the images themselves.
         *
         * A user message only ever shows the reference image the user actually
         * attached; a generated asset is never injected into a user turn.
         */
        import Icon from './Icon.svelte';
        import ImageResult from './ImageResult.svelte';
        import { relativeTime, formatBytes } from '#lib/shared/text';
        import { IMAGE_STATUS, supportsVariations } from '#lib/images/config';
        import type { ImageAsset, ImageMessage } from '#lib/images/types';

        interface Props {
                message: ImageMessage;
                /** Whether a generation service is configured. */
                configured: boolean;
                onopenimage: (id: string) => void;
                oncopyasset: (id: string) => void;
                onreuseasset: (id: string) => void;
                ondownloadasset: (id: string) => void;
                onregenerate: (id: string) => void;
                onvary: (id: string) => void;
                onsaveasset: (id: string) => void;
                ondeleteasset: (id: string) => void;
                onreusemessage: (id: string) => void;
                onretry: (id: string) => void;
        }

        let {
                message,
                configured,
                onopenimage,
                oncopyasset,
                onreuseasset,
                ondownloadasset,
                onregenerate,
                onvary,
                onsaveasset,
                ondeleteasset,
                onreusemessage,
                onretry
        }: Props = $props();

        let isUser = $derived(message.role === 'user');
        let canVary = $derived(supportsVariations());

        /** Regenerate is possible when this assistant turn answers a stored prompt. */
        function canRegenerate(asset: ImageAsset): boolean {
                return !!message.replyTo && asset.status === 'ready';
        }
</script>

{#if isUser}
        <article class="turn user" aria-label="Your prompt">
                <div class="prompt-block">
                        <p class="prompt">{message.content}</p>
                        {#if message.attachments.length}
                                <ul class="refs" aria-label="Reference image">
                                        {#each message.attachments as file (file.id)}
                                                <li class="ref" class:rejected={file.status === 'rejected'}>
                                                        <Icon name="image" size={14} />
                                                        <span class="ref-name">{file.name}</span>
                                                        <span class="ref-size">{formatBytes(file.size)}</span>
                                                        {#if file.status === 'rejected' || file.status === 'failed'}
                                                                <span class="ref-state">{file.detail ?? 'Not sent'}</span>
                                                        {/if}
                                                </li>
                                        {/each}
                                </ul>
                        {/if}
                        <div class="row-actions">
                                <span class="stamp">{relativeTime(message.createdAt)}</span>
                                <button class="row-action" onclick={() => onreusemessage(message.id)}>
                                        <Icon name="refresh" size={13} /><span>Reuse prompt</span>
                                </button>
                        </div>
                </div>
        </article>
{:else}
        <article class="turn assistant" aria-label="ARTI image result">
                {#if message.content}
                        <div class="note" class:error={message.status === 'error'}>
                                <p class="note-text">{message.content}</p>
                                {#if message.originalPrompt}
                                        <details class="compare">
                                                <summary>Compare with your original prompt</summary>
                                                <p class="original">{message.originalPrompt}</p>
                                        </details>
                                {/if}
                        </div>
                {/if}

                {#if message.assets.length}
                        <div class="results">
                                {#each message.assets as asset (asset.id)}
                                        <ImageResult
                                                {asset}
                                                canDownload={!!asset.url}
                                                {canVary}
                                                canRegenerate={canRegenerate(asset)}
                                                onopen={onopenimage}
                                                oncopy={oncopyasset}
                                                onreuse={onreuseasset}
                                                ondownload={ondownloadasset}
                                                onregenerate={() => onregenerate(message.id)}
                                                onvary={onvary}
                                                onsave={onsaveasset}
                                                ondelete={ondeleteasset}
                                        />
                                {/each}
                        </div>
                {:else if message.status === 'streaming'}
                        <p class="working" role="status">
                                <span class="dot" aria-hidden="true"></span> Preparing your image…
                        </p>
                {/if}

                {#if message.error}
                        <p class="notice error" role="status">
                                <Icon name="alert" size={14} />
                                <span>{message.error}</span>
                        </p>
                {/if}

                {#if message.status === 'error' && message.replyTo}
                        <div class="row-actions">
                                <button class="row-action" onclick={() => onretry(message.id)} disabled={!configured}>
                                        <Icon name="refresh" size={13} /><span>Try again</span>
                                </button>
                                {#if !configured}
                                        <span class="stamp">{IMAGE_STATUS.generationUnavailable}</span>
                                {/if}
                        </div>
                {/if}
        </article>
{/if}

<style>
        .turn {
                padding: var(--space-3) 0;
        }

        .prompt-block {
                padding: var(--space-3) var(--space-4);
                border-radius: var(--radius-md);
                border: 1px solid var(--border-hair);
                background: rgba(255, 255, 255, 0.028);
        }

        .prompt {
                margin: 0;
                font-size: 14.5px;
                line-height: 1.55;
                color: var(--text-primary);
                white-space: pre-wrap;
                overflow-wrap: anywhere;
        }

        .refs {
                list-style: none;
                display: flex;
                flex-wrap: wrap;
                gap: var(--space-2);
                margin: var(--space-2) 0 0;
                padding: 0;
        }

        .ref {
                display: inline-flex;
                align-items: center;
                gap: 6px;
                padding: 4px 10px;
                border-radius: var(--radius-pill);
                border: 1px solid var(--border-hair);
                font-size: 11.5px;
                color: var(--text-secondary);
        }

        .ref.rejected {
                border-color: rgba(212, 120, 96, 0.42);
                color: #e0a08c;
        }

        .ref-name {
                max-width: 200px;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
        }

        .ref-size,
        .ref-state {
                color: var(--text-muted);
        }

        .row-actions {
                display: flex;
                align-items: center;
                gap: var(--space-3);
                margin-top: var(--space-2);
        }

        .stamp {
                font-size: 11px;
                color: var(--text-muted);
        }

        .row-action {
                display: inline-flex;
                align-items: center;
                gap: 5px;
                padding: 4px 10px;
                border-radius: var(--radius-pill);
                border: 1px solid transparent;
                color: var(--text-muted);
                font-size: 11.5px;
        }

        .row-action:hover:not(:disabled) {
                color: var(--gold-bright);
                border-color: var(--border-hair);
                background: rgba(201, 154, 54, 0.08);
        }

        .row-action:disabled {
                opacity: 0.5;
                cursor: not-allowed;
        }

        .note {
                padding: var(--space-3) var(--space-4);
                border-radius: var(--radius-md);
                border: 1px solid var(--border-hair);
                background: rgba(11, 13, 14, 0.6);
        }

        .note.error {
                border-color: rgba(212, 120, 96, 0.35);
        }

        .note-text {
                margin: 0;
                font-size: 13.5px;
                line-height: 1.6;
                color: var(--text-secondary);
                white-space: pre-wrap;
                overflow-wrap: anywhere;
        }

        .compare {
                margin-top: var(--space-2);
                font-size: 12px;
        }

        .compare summary {
                cursor: pointer;
                color: var(--gold);
        }

        .original {
                margin: var(--space-2) 0 0;
                padding: var(--space-2) var(--space-3);
                border-left: 2px solid var(--border-gold);
                color: var(--text-muted);
                white-space: pre-wrap;
        }

        .results {
                display: flex;
                flex-wrap: wrap;
                gap: var(--space-3);
                margin-top: var(--space-3);
        }

        .results:first-child {
                margin-top: 0;
        }

        .working {
                display: flex;
                align-items: center;
                gap: var(--space-2);
                margin: 0;
                font-size: 12.5px;
                color: var(--text-muted);
        }

        .dot {
                width: 7px;
                height: 7px;
                border-radius: 50%;
                background: var(--gold-bright);
                animation: live 1.4s ease-in-out infinite;
        }

        @keyframes live {
                0%,
                100% {
                        opacity: 0.35;
                }
                50% {
                        opacity: 1;
                }
        }

        .notice {
                display: flex;
                align-items: flex-start;
                gap: var(--space-2);
                margin: var(--space-2) 0 0;
                font-size: 13px;
                line-height: 1.5;
        }

        .notice.error {
                color: #e9a48f;
        }

        @media (prefers-reduced-motion: reduce) {
                .dot {
                        animation: none;
                        opacity: 1;
                }
        }
</style>
