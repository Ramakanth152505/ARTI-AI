<script lang="ts">
        /**
         * A single generated image result.
         *
         * Only actions the application can actually perform are exposed:
         *  - Preview, copy prompt, reuse prompt and delete always work locally.
         *  - Regenerate works whenever a prompt message exists behind the asset.
         *  - Download works when the asset has a real URL.
         *  - Variation and Save appear only when the configured model / repository
         *    support them; there is no button that silently does nothing.
         *
         * The image keeps its true aspect ratio: the frame reserves the reported
         * ratio, and the image is `object-fit: contain` inside it, never stretched.
         */
        import Icon from './Icon.svelte';
        import { findAspectRatio } from '#lib/images/styles';
        import type { ImageAsset } from '#lib/images/types';

        interface Props {
                asset: ImageAsset;
                /** Whether download is available for this asset (a real URL exists). */
                canDownload: boolean;
                /** Whether variation is supported by the configured model. */
                canVary: boolean;
                /** Whether regenerate is possible (the source prompt still exists). */
                canRegenerate: boolean;
                onopen: (id: string) => void;
                oncopy: (id: string) => void;
                onreuse: (id: string) => void;
                ondownload: (id: string) => void;
                onregenerate: (id: string) => void;
                onvary: (id: string) => void;
                onsave: (id: string) => void;
                ondelete: (id: string) => void;
        }

        let {
                asset,
                canDownload,
                canVary,
                canRegenerate,
                onopen,
                oncopy,
                onreuse,
                ondownload,
                onregenerate,
                onvary,
                onsave,
                ondelete
        }: Props = $props();

        let ratio = $derived(findAspectRatio(asset.aspectRatio).ratio);
        let ready = $derived(asset.status === 'ready' && !!asset.url);

        /** Intrinsic size label, only shown when the service reported real dimensions. */
        let sizeLabel = $derived(asset.width && asset.height ? `${asset.width} × ${asset.height}` : '');
</script>

<figure class="result" data-state={asset.status} aria-label={asset.prompt || 'Generated image'}>
        <div class="frame" style="aspect-ratio: {ratio}">
                {#if ready}
                        <button class="open" onclick={() => onopen(asset.id)} aria-label="Open image preview">
                                <img
                                        src={asset.url}
                                        alt={asset.prompt ? `Generated image: ${asset.prompt}` : 'Generated image'}
                                        loading="lazy"
                                        decoding="async"
                                        width={asset.width}
                                        height={asset.height}
                                />
                                <span class="zoom" aria-hidden="true"><Icon name="expand" size={16} /></span>
                        </button>
                {:else if asset.status === 'generating'}
                        <div class="pending" role="status" aria-label="Generating image">
                                <span class="pulse" aria-hidden="true"></span>
                                <span class="pending-text">{asset.jobId ? `Queued · ${asset.jobId.slice(0, 8)}` : 'Generating…'}</span>
                        </div>
                {:else if asset.status === 'cancelled'}
                        <div class="state">
                                <Icon name="stop" size={18} />
                                <span>Stopped before this image was ready.</span>
                        </div>
                {:else}
                        <div class="state error">
                                <Icon name="alert" size={18} />
                                <span>{asset.error ?? 'This image could not be produced.'}</span>
                        </div>
                {/if}
        </div>

        <div class="meta">
                <span class="ratio" title="Aspect ratio">{asset.aspectRatio}{#if sizeLabel} · {sizeLabel}{/if}</span>
                {#if asset.styleName}<span class="style">{asset.styleName}</span>{/if}
        </div>

        {#if ready}
                <div class="actions" role="group" aria-label="Image actions">
                        <button class="action" onclick={() => oncopy(asset.id)} title="Copy the prompt that made this image">
                                <Icon name="copy" size={14} /><span>Copy prompt</span>
                        </button>
                        <button class="action" onclick={() => onreuse(asset.id)} title="Load the prompt back into the composer">
                                <Icon name="refresh" size={14} /><span>Reuse</span>
                        </button>
                        {#if canDownload}
                                <button class="action" onclick={() => ondownload(asset.id)} title="Download the original image">
                                        <Icon name="download" size={14} /><span>Download</span>
                                </button>
                        {/if}
                        {#if canRegenerate}
                                <button class="action" onclick={() => onregenerate(asset.id)} title="Generate again with the same prompt">
                                        <Icon name="refresh" size={14} /><span>Regenerate</span>
                                </button>
                        {/if}
                        {#if canVary}
                                <button class="action" onclick={() => onvary(asset.id)} title="Create a variation of this image">
                                        <Icon name="sparkle" size={14} /><span>Variation</span>
                                </button>
                        {/if}
                        <button
                                class="action"
                                class:on={asset.saved}
                                onclick={() => onsave(asset.id)}
                                title={asset.saved ? 'Saved to your library' : 'Save to your library'}
                                aria-pressed={asset.saved}
                        >
                                <Icon name={asset.saved ? 'check' : 'pin'} size={14} />
                                <span>{asset.saved ? 'Saved' : 'Save'}</span>
                        </button>
                        <button class="action danger" onclick={() => ondelete(asset.id)} title="Delete this image">
                                <Icon name="trash" size={14} /><span>Delete</span>
                        </button>
                </div>
        {/if}
</figure>

<style>
        .result {
                margin: 0;
                width: min(420px, 100%);
                border: 1px solid var(--border-hair);
                border-radius: var(--radius-md);
                background: rgba(255, 255, 255, 0.02);
                overflow: hidden;
        }

        .result[data-state='failed'] {
                border-color: rgba(212, 120, 96, 0.35);
        }

        .frame {
                position: relative;
                width: 100%;
                display: grid;
                place-items: center;
                background:
                        radial-gradient(circle at 50% 40%, rgba(201, 154, 54, 0.06), transparent 70%),
                        linear-gradient(160deg, #0a0c0e, #070706);
                overflow: hidden;
        }

        .open {
                position: relative;
                display: block;
                width: 100%;
                height: 100%;
        }

        .open img {
                display: block;
                width: 100%;
                height: 100%;
                /* Contain, never stretch: the true aspect ratio is preserved. */
                object-fit: contain;
        }

        .zoom {
                position: absolute;
                right: var(--space-2);
                bottom: var(--space-2);
                display: grid;
                place-items: center;
                width: 30px;
                height: 30px;
                border-radius: var(--radius-sm);
                border: 1px solid var(--border-hair);
                background: rgba(8, 8, 7, 0.72);
                color: var(--text-secondary);
                opacity: 0;
                transition: opacity 160ms ease;
        }

        .open:hover .zoom,
        .open:focus-visible .zoom {
                opacity: 1;
        }

        .pending,
        .state {
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: var(--space-2);
                padding: var(--space-5);
                text-align: center;
                font-size: 12.5px;
                color: var(--text-muted);
                min-height: 120px;
                justify-content: center;
        }

        .state.error {
                color: #e0a08c;
        }

        .pulse {
                width: 34px;
                height: 34px;
                border-radius: 50%;
                border: 2px solid var(--border-gold);
                border-top-color: var(--gold-bright);
                animation: spin 900ms linear infinite;
        }

        @keyframes spin {
                to {
                        transform: rotate(360deg);
                }
        }

        .meta {
                display: flex;
                align-items: center;
                gap: var(--space-3);
                padding: var(--space-2) var(--space-3);
                font-size: 11px;
                color: var(--text-muted);
                border-top: 1px solid var(--border-hair);
        }

        .style {
                color: var(--gold);
                margin-left: auto;
        }

        .actions {
                display: flex;
                flex-wrap: wrap;
                gap: 4px;
                padding: var(--space-2) var(--space-2) var(--space-3);
                border-top: 1px solid var(--border-hair);
        }

        .action {
                display: inline-flex;
                align-items: center;
                gap: 5px;
                padding: 4px 9px;
                border-radius: var(--radius-pill);
                border: 1px solid transparent;
                color: var(--text-muted);
                font-size: 11.5px;
        }

        .action:hover {
                color: var(--gold-bright);
                border-color: var(--border-hair);
                background: rgba(201, 154, 54, 0.08);
        }

        .action.on {
                color: var(--gold-bright);
                border-color: var(--border-hair);
        }

        .action.danger:hover {
                color: #f0b5a6;
                border-color: rgba(212, 120, 96, 0.5);
                background: rgba(180, 85, 63, 0.16);
        }

        @media (prefers-reduced-motion: reduce) {
                .pulse {
                        animation: none;
                }
        }
</style>
