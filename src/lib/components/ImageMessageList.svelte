<script lang="ts">
        /**
         * Images conversation scroller.
         *
         * New content only auto-scrolls when the user is already near the bottom, so
         * reading an older result is never interrupted by an incoming job. A "jump to
         * latest" control appears when scrolled away. When the conversation is empty it
         * shows a focused, honest start state (including the unconfigured notice).
         */
        import Icon from './Icon.svelte';
        import ImageMessageView from './ImageMessage.svelte';
        import { IMAGE_STATUS } from '#lib/images/config';
        import type { ImageConversation, ImageMessage } from '#lib/images/types';

        interface Props {
                conversation: ImageConversation | null;
                messages: ImageMessage[];
                loading: boolean;
                generating: boolean;
                configured: boolean;
                styleName?: string;
                onopenstyles: () => void;
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
                conversation,
                messages,
                loading,
                generating,
                configured,
                styleName,
                onopenstyles,
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

        let scroller = $state<HTMLElement | null>(null);
        let atBottom = $state(true);

        function nearBottom(el: HTMLElement): boolean {
                return el.scrollHeight - el.scrollTop - el.clientHeight < 80;
        }

        function scrollToBottom(smooth = false): void {
                if (!scroller) return;
                scroller.scrollTo({ top: scroller.scrollHeight, behavior: smooth ? 'smooth' : 'auto' });
        }

        function onScroll(): void {
                if (!scroller) return;
                atBottom = nearBottom(scroller);
        }

        // Follow new content only while the user is at the bottom.
        $effect(() => {
                const length = messages.length;
                const lastAssets = messages[messages.length - 1]?.assets.length ?? 0;
                void length;
                void lastAssets;
                void generating;
                if (atBottom) queueMicrotask(() => scrollToBottom());
        });

        // Reset scroll position when switching conversations.
        $effect(() => {
                if (conversation?.id) {
                        atBottom = true;
                        queueMicrotask(() => scrollToBottom());
                }
        });
</script>

<div class="messages" bind:this={scroller} onscroll={onScroll}>
        <div class="inner">
                {#if loading}
                        <p class="state" role="status">Loading conversation…</p>
                {:else if !conversation}
                        <div class="empty">
                                <span class="emblem" aria-hidden="true"><Icon name="image" size={26} /></span>
                                <h2>Create your first image</h2>
                                <p>Describe an idea, choose a style, and generate when an image service is connected.</p>
                                <button class="cta" onclick={onopenstyles}>
                                        <Icon name="palette" size={15} /><span>Browse styles</span>
                                </button>
                        </div>
                {:else if messages.length === 0}
                        <div class="empty">
                                <span class="emblem" aria-hidden="true"><Icon name="sparkle" size={26} /></span>
                                <h2>Describe what you want to see</h2>
                                <p>
                                        Write a prompt, or pick a style to insert its guidance. Your subject always stays in the
                                        final prompt.
                                </p>
                                <button class="cta" onclick={onopenstyles}>
                                        <Icon name="palette" size={15} /><span>Browse styles</span>
                                </button>
                                {#if !configured}
                                        <p class="empty-note">
                                                <Icon name="info" size={13} />
                                                {IMAGE_STATUS.generationUnavailable}
                                        </p>
                                {/if}
                                {#if styleName}
                                        <p class="active-style">Active style: {styleName}</p>
                                {/if}
                        </div>
                {:else}
                        {#each messages as message (message.id)}
                                <ImageMessageView
                                        {message}
                                        {configured}
                                        onopenimage={onopenimage}
                                        oncopyasset={oncopyasset}
                                        onreuseasset={onreuseasset}
                                        ondownloadasset={ondownloadasset}
                                        {onregenerate}
                                        {onvary}
                                        onsaveasset={onsaveasset}
                                        ondeleteasset={ondeleteasset}
                                        onreusemessage={onreusemessage}
                                        {onretry}
                                />
                        {/each}
                {/if}
        </div>

        {#if !atBottom && messages.length > 0}
                <button class="jump" onclick={() => scrollToBottom(true)}>
                        <Icon name="chevron-down" size={14} />
                        <span>Jump to latest</span>
                </button>
        {/if}
</div>

<style>
        .messages {
                position: relative;
                flex: 1;
                min-height: 0;
                overflow-y: auto;
                padding: var(--space-4) var(--space-6) 0;
        }

        .inner {
                max-width: var(--images-max-width, 768px);
                margin: 0 auto;
                padding-bottom: var(--space-4);
        }

        .state {
                margin: var(--space-6) auto;
                text-align: center;
                color: var(--text-muted);
                font-size: 13.5px;
        }

        .empty {
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: var(--space-2);
                margin: clamp(var(--space-5), 9vh, 96px) auto 0;
                max-width: 460px;
                text-align: center;
        }

        .emblem {
                display: grid;
                place-items: center;
                width: 58px;
                height: 58px;
                border-radius: 50%;
                border: 1px solid var(--border-gold);
                color: var(--gold-bright);
                background: rgba(201, 154, 54, 0.05);
        }

        .empty h2 {
                margin: var(--space-2) 0 0;
                font-family: var(--font-display);
                font-size: 21px;
                font-weight: 600;
                letter-spacing: 0.04em;
                color: var(--text-primary);
        }

        .empty p {
                margin: 0;
                font-size: 13.5px;
                line-height: 1.6;
                color: var(--text-secondary);
        }

        .cta {
                display: inline-flex;
                align-items: center;
                gap: 7px;
                margin-top: var(--space-2);
                padding: 8px 16px;
                border-radius: var(--radius-pill);
                border: 1px solid var(--border-gold);
                color: var(--gold-bright);
                font-size: 13px;
                font-weight: 600;
        }

        .cta:hover {
                background: rgba(201, 154, 54, 0.1);
        }

        .empty-note {
                display: inline-flex;
                align-items: center;
                gap: 6px;
                margin-top: var(--space-2);
                padding: var(--space-2) var(--space-3);
                border-radius: var(--radius-sm);
                border: 1px solid var(--border-hair);
                color: var(--text-muted) !important;
                font-size: 12px !important;
        }

        .active-style {
                margin-top: var(--space-2) !important;
                font-size: 12px !important;
                color: var(--gold) !important;
        }

        .jump {
                position: sticky;
                bottom: var(--space-3);
                left: 50%;
                transform: translateX(-50%);
                display: inline-flex;
                align-items: center;
                gap: 6px;
                padding: 7px 14px;
                border-radius: var(--radius-pill);
                border: 1px solid var(--border-gold);
                background: var(--surface-panel-solid);
                color: var(--gold-bright);
                font-size: 12px;
                box-shadow: var(--shadow-soft);
        }

        @media (max-width: 720px) {
                .messages {
                        padding: var(--space-3) var(--space-4) 0;
                }
        }
</style>
