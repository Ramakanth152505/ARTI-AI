<script lang="ts">
	/**
	 * Region B header — compact conversation header.
	 *
	 * Shows the title, an editable title control, honest conversation status and
	 * the context-panel toggle. Model information is only shown when a service is
	 * actually configured; otherwise it states that no model is connected.
	 */
	import Icon from './Icon.svelte';
	import Menu from './Menu.svelte';
	import Dialog from './Dialog.svelte';
	import type { MenuItem } from './menu.types';
	import { relativeTime } from '#lib/chats/search';
	import type { Conversation } from '#lib/chats/types';

	interface Props {
		conversation: Conversation | null;
		generating: boolean;
		modelConfigured: boolean;
		contextOpen: boolean;
		onopenhistory: () => void;
		onrename: (id: string, title: string) => void;
		ontogglepin: (id: string) => void;
		onarchive: (id: string, archived: boolean) => void;
		ondelete: (id: string) => void;
		ontogglecontext: () => void;
	}

	let {
		conversation,
		generating,
		modelConfigured,
		contextOpen,
		onopenhistory,
		onrename,
		ontogglepin,
		onarchive,
		ondelete,
		ontogglecontext
	}: Props = $props();

	let renameOpen = $state(false);
	let renameValue = $state('');
	let deleteOpen = $state(false);

	type HeaderAction = 'rename' | 'pin' | 'archive' | 'delete';

	let items = $derived.by((): MenuItem[] => {
		if (!conversation) return [];
		return [
			{ id: 'rename', label: 'Rename', icon: 'edit' },
			{ id: 'pin', label: conversation.pinned ? 'Unpin' : 'Pin to top', icon: 'pin' },
			{ id: 'archive', label: conversation.archived ? 'Unarchive' : 'Archive', icon: 'archive' },
			{ id: 'delete', label: 'Delete', icon: 'trash', danger: true }
		];
	});

	function onAction(action: string): void {
		if (!conversation) return;
		switch (action as HeaderAction) {
			case 'rename':
				renameValue = conversation.title;
				renameOpen = true;
				break;
			case 'pin':
				ontogglepin(conversation.id);
				break;
			case 'archive':
				onarchive(conversation.id, !conversation.archived);
				break;
			case 'delete':
				deleteOpen = true;
				break;
		}
	}

	function confirmRename(): void {
		if (!conversation || !renameValue.trim()) return;
		onrename(conversation.id, renameValue);
		renameOpen = false;
	}
</script>

<header class="chat-header">
	<button class="icon-btn history-btn" aria-label="Open conversation list" onclick={onopenhistory}>
		<Icon name="menu" size={19} />
	</button>

	<div class="title-block">
		<h1 title={conversation?.title ?? 'Chats'}>
			{conversation?.title ?? 'Chats'}
			{#if conversation?.pinned}<Icon name="pin" size={13} />{/if}
		</h1>
		<p class="status" role="status">
			{#if generating}
				<span class="dot live" aria-hidden="true"></span> Generating…
			{:else if conversation}
				<span class="dot" aria-hidden="true"></span>
				Updated {relativeTime(conversation.updatedAt)}
				<span class="sep" aria-hidden="true">·</span>
				<span class="model" class:off={!modelConfigured}>
					{modelConfigured ? 'ARTI intelligence connected' : 'No intelligence service connected'}
				</span>
			{:else}
				No conversation selected
			{/if}
		</p>
	</div>

	<div class="header-actions">
		{#if conversation}
			<Menu label="Conversation options" items={items} onselect={onAction} />
		{/if}
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

<Dialog
	open={renameOpen}
	title="Rename conversation"
	confirmLabel="Save"
	confirmDisabled={!renameValue.trim()}
	onconfirm={confirmRename}
	oncancel={() => (renameOpen = false)}
>
	<label class="field">
		<span>Title</span>
		<input type="text" bind:value={renameValue} onkeydown={(e) => e.key === 'Enter' && confirmRename()} />
	</label>
</Dialog>

<Dialog
	open={deleteOpen}
	title="Delete conversation"
	description={`“${conversation?.title ?? ''}” and its messages will be permanently deleted. This cannot be undone.`}
	confirmLabel="Delete"
	destructive
	onconfirm={() => {
		if (conversation) ondelete(conversation.id);
		deleteOpen = false;
	}}
	oncancel={() => (deleteOpen = false)}
></Dialog>

<style>
	.chat-header {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		height: var(--topbar-height);
		flex-shrink: 0;
		padding: 0 var(--space-4);
		border-bottom: 1px solid var(--border-hair);
		background: rgba(8, 8, 7, 0.6);
		backdrop-filter: blur(8px);
		/* The blur makes this a stacking context, so a menu opened here is
		   clamped beneath the scrolling message list unless the header itself
		   is raised. Kept below --z-sidebar (50) so mobile drawers still cover it. */
		position: relative;
		z-index: 2;
	}

	.history-btn {
		display: none;
	}

	.title-block {
		min-width: 0;
		flex: 1;
	}

	h1 {
		display: flex;
		align-items: center;
		gap: 6px;
		margin: 0;
		font-family: var(--font-display);
		font-size: 16.5px;
		font-weight: 600;
		letter-spacing: 0.02em;
		color: var(--text-primary);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.status {
		display: flex;
		align-items: center;
		gap: 6px;
		margin: 1px 0 0;
		font-size: 11.5px;
		color: var(--text-muted);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.dot {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: var(--text-muted);
		flex-shrink: 0;
	}

	.dot.live {
		background: var(--gold-bright);
		animation: live 1.4s ease-in-out infinite;
	}

	@keyframes live {
		0%, 100% { opacity: 0.35; }
		50% { opacity: 1; }
	}

	.sep {
		color: var(--text-muted);
	}

	.model.off {
		color: var(--text-muted);
	}

	.header-actions {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		flex-shrink: 0;
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

	@media (max-width: 900px) {
		.history-btn {
			display: grid;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.dot.live { animation: none; opacity: 1; }
	}
</style>
