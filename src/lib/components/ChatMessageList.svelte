<script lang="ts">
	/**
	 * Region B — the message list.
	 *
	 * Scroll behaviour is deliberate: new content only auto-scrolls when the user
	 * is already at the bottom, so reading older messages is never interrupted by
	 * an incoming stream. A "jump to latest" control appears when scrolled away.
	 */
	import Icon from './Icon.svelte';
	import ChatMessageView from './ChatMessage.svelte';
	import type { Conversation, ChatMessage } from '#lib/chats/types';

	interface Props {
		conversation: Conversation | null;
		messages: ChatMessage[];
		loading: boolean;
		generating: boolean;
		modelConfigured: boolean;
		onregenerate: (id: string) => void;
		onretry: (id: string) => void;
	}

	let { conversation, messages, loading, generating, modelConfigured, onregenerate, onretry }: Props = $props();

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
		// Track length and last content so streaming updates keep the view pinned.
		const length = messages.length;
		const lastLength = messages[messages.length - 1]?.content.length ?? 0;
		void length;
		void lastLength;
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
			<p class="state" role="status">Loading messages…</p>
		{:else if !conversation}
			<p class="state">Select a conversation, or start a new one.</p>
		{:else if messages.length === 0}
			<div class="empty">
				<span class="emblem" aria-hidden="true"><Icon name="sparkle" size={26} /></span>
				<h2>Start the conversation</h2>
				<p>Ask a question, describe a task, or attach a file to give ARTI something to work with.</p>
				{#if !modelConfigured}
					<p class="empty-note">
						<Icon name="alert" size={13} />
						No intelligence service is configured yet, so messages are saved but no reply is generated.
					</p>
				{/if}
			</div>
		{:else}
			{#each messages as message (message.id)}
				<ChatMessageView
					{message}
					streaming={generating && message.status === 'streaming'}
					{onregenerate}
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
		max-width: var(--chat-max-width, 820px);
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
		margin: clamp(var(--space-6), 12vh, 120px) auto 0;
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
		font-size: 22px;
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
