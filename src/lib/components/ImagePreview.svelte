<script lang="ts">
        /**
         * Full-size image preview.
         *
         * Opened from a result card. Displays the real asset at as large a size as the
         * viewport allows while preserving its aspect ratio, and never upscales it
         * beyond its intrinsic size. Escape and a click on the surrounding scrim close
         * it; focus is trapped inside the dialog while it is open.
         */
        import Icon from './Icon.svelte';
        import { findAspectRatio } from '#lib/images/styles';
        import type { ImageAsset } from '#lib/images/types';

        interface Props {
                asset: ImageAsset;
                onclose: () => void;
                oncopy: (id: string) => void;
                ondownload: (id: string) => void;
        }

        let { asset, onclose, oncopy, ondownload }: Props = $props();

        let panel = $state<HTMLDivElement | null>(null);
        let ratio = $derived(findAspectRatio(asset.aspectRatio).ratio);

        $effect(() => {
                const previous = document.activeElement as HTMLElement | null;
                queueMicrotask(() => panel?.querySelector<HTMLElement>('button')?.focus());
                function onKeydown(event: KeyboardEvent): void {
                        if (event.key === 'Escape') {
                                event.stopPropagation();
                                onclose();
                        }
                }
                document.addEventListener('keydown', onKeydown, true);
                return () => {
                        document.removeEventListener('keydown', onKeydown, true);
                        previous?.focus?.();
                };
        });
</script>

<div class="overlay">
        <button class="scrim" aria-label="Close preview" onclick={onclose}></button>

        <div class="panel" bind:this={panel} role="dialog" aria-modal="true" aria-label="Image preview">
                <header class="head">
                        <div class="titles">
                                <h2>Preview</h2>
                                <p class="meta">
                                        <span>{asset.aspectRatio}</span>
                                        {#if asset.width && asset.height}<span>{asset.width} × {asset.height}</span>{/if}
                                        {#if asset.styleName}<span class="style">{asset.styleName}</span>{/if}
                                </p>
                        </div>
                        <div class="actions">
                                <button class="act" onclick={() => oncopy(asset.id)}>
                                        <Icon name="copy" size={14} /><span>Copy prompt</span>
                                </button>
                                {#if asset.url}
                                        <button class="act" onclick={() => ondownload(asset.id)}>
                                                <Icon name="download" size={14} /><span>Download</span>
                                        </button>
                                {/if}
                                <button class="close" aria-label="Close preview" onclick={onclose}>
                                        <Icon name="close" size={16} />
                                </button>
                        </div>
                </header>

                <div class="stage" style="--ratio: {ratio}">
                        {#if asset.url}
                                <img
                                        src={asset.url}
                                        alt={asset.prompt ? `Generated image: ${asset.prompt}` : 'Generated image'}
                                        width={asset.width}
                                        height={asset.height}
                                />
                        {:else}
                                <p class="missing">This image no longer has an available file.</p>
                        {/if}
                </div>

                {#if asset.prompt}
                        <p class="prompt">{asset.prompt}</p>
                {/if}
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
                background: rgba(0, 0, 0, 0.82);
                border: none;
        }

        .panel {
                position: relative;
                display: flex;
                flex-direction: column;
                width: min(1000px, 100%);
                max-height: 92vh;
                background: var(--surface-panel-solid);
                border: 1px solid var(--border-gold);
                border-radius: var(--radius-md);
                box-shadow: var(--shadow-panel);
                overflow: hidden;
        }

        .head {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: var(--space-3);
                padding: var(--space-3) var(--space-4);
                border-bottom: 1px solid var(--border-hair);
                flex-shrink: 0;
        }

        .titles {
                min-width: 0;
        }

        h2 {
                margin: 0;
                font-family: var(--font-display);
                font-size: 16px;
                letter-spacing: 0.04em;
                color: var(--text-primary);
        }

        .meta {
                display: flex;
                gap: var(--space-3);
                margin: 2px 0 0;
                font-size: 11.5px;
                color: var(--text-muted);
        }

        .meta .style {
                color: var(--gold);
        }

        .actions {
                display: flex;
                align-items: center;
                gap: var(--space-2);
                flex-shrink: 0;
        }

        .act {
                display: inline-flex;
                align-items: center;
                gap: 6px;
                padding: 6px 11px;
                border-radius: var(--radius-pill);
                border: 1px solid var(--border-hair);
                color: var(--text-secondary);
                font-size: 12px;
        }

        .act:hover {
                color: var(--gold-bright);
                border-color: var(--border-gold);
                background: rgba(201, 154, 54, 0.08);
        }

        .close {
                display: grid;
                place-items: center;
                width: 30px;
                height: 30px;
                border-radius: var(--radius-sm);
                color: var(--text-secondary);
        }

        .close:hover {
                color: var(--gold-bright);
                background: rgba(201, 154, 54, 0.1);
        }

        .stage {
                flex: 1;
                min-height: 0;
                display: grid;
                place-items: center;
                padding: var(--space-4);
                background: linear-gradient(160deg, #0a0c0e, #070706);
                overflow: auto;
        }

        .stage img {
                /* Never larger than the viewport box, never stretched; kept at or below
                   its intrinsic size. */
                max-width: 100%;
                max-height: min(72vh, 100%);
                width: auto;
                height: auto;
                object-fit: contain;
        }

        .missing {
                margin: 0;
                color: var(--text-muted);
                font-size: 13px;
        }

        .prompt {
                margin: 0;
                padding: var(--space-3) var(--space-4);
                border-top: 1px solid var(--border-hair);
                font-size: 12.5px;
                line-height: 1.55;
                color: var(--text-secondary);
                white-space: pre-wrap;
                max-height: 20vh;
                overflow-y: auto;
                flex-shrink: 0;
        }

        @media (max-width: 720px) {
                .overlay {
                        padding: var(--space-2);
                }

                .act span {
                        display: none;
                }
        }
</style>
