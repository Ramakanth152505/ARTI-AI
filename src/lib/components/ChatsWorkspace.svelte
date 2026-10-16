<script lang="ts">
	/**
	 * Region container for the Chats workspace.
	 *
	 * Owns the three-region layout (history / conversation / context), the drawer
	 * behaviour on narrow screens and the wiring between the `chats` state object
	 * and the presentational components. No persistence or model logic lives here.
	 */
	import Icon from './Icon.svelte';
	import ChatHistorySidebar from './ChatHistorySidebar.svelte';
	import ChatHeader from './ChatHeader.svelte';
	import ChatMessageList from './ChatMessageList.svelte';
	import ChatContextPanel from './ChatContextPanel.svelte';
	import ChatsComposer from './ChatsComposer.svelte';
	import { chats } from '#lib/chats/chatsState.svelte';
	import type { Attachment } from '#lib/chats/types';

	let historyOpen = $state(false);
	let contextOpen = $state(false);
	let showArchived = $state(false);
	let notice = $state('');

	$effect(() => {
		void chats.init();
	});

	/** Closes mobile drawers after navigating, so the conversation is visible. */
	function selectConversation(id: string): void {
		void chats.selectConversation(id);
		historyOpen = false;
	}

	function newConversation(): void {
		void chats.newConversation();
		historyOpen = false;
		chats.clearSearch();
	}

	async function send(text: string, attachments: Attachment[]): Promise<void> {
		// The composer keeps the draft until this resolves; the state layer records
		// an explicit failure when no model is configured rather than inventing text.
		await chats.sendMessage(text, attachments);
	}
</script>

<div class="chats" class:context-open={contextOpen}>
	<!-- Region A: history. Present inline on wide screens, a drawer below 1100px. -->
	<div class="history-region" class:drawer={historyOpen}>
		<ChatHistorySidebar
			conversations={chats.conversations}
			folders={chats.folders}
			folderContents={chats.folderContents}
			pinned={chats.pinnedConversations}
			unfiled={chats.unfiledConversations}
			archived={chats.archivedConversations}
			activeId={chats.activeConversationId}
			loading={chats.loadingHistory}
			storageNotice={chats.storageNotice}
			storageLabel={chats.storageLabel}
			searchQuery={chats.searchQuery}
			searchResults={chats.searchResults}
			searching={chats.searching}
			{showArchived}
			previewFor={(id) => chats.previewFor(id)}
			onnew={newConversation}
			onselect={selectConversation}
			onsearch={(q) => void chats.runSearch(q)}
			onclearsearch={() => chats.clearSearch()}
			ontogglearchived={() => (showArchived = !showArchived)}
			onpin={(id) => void chats.togglePin(id)}
			onrename={(id, title) => void chats.renameConversation(id, title)}
			onarchive={(id, archived) => void chats.setArchived(id, archived)}
			onmove={(id, folderId) => void chats.moveToFolder(id, folderId)}
			ondelete={(id) => void chats.deleteConversation(id)}
			oncreatefolder={(name) => void chats.createFolder(name)}
			onrenamefolder={(id, name) => void chats.renameFolder(id, name)}
			ondeletefolder={(id) => void chats.deleteFolder(id)}
			oncollapse={() => (historyOpen = false)}
		/>
	</div>

	{#if historyOpen}
		<button class="scrim" aria-label="Close conversation list" onclick={() => (historyOpen = false)}></button>
	{/if}

	<!-- Region B: the conversation. -->
	<section class="conversation" aria-label="Conversation">
		<ChatHeader
			conversation={chats.activeConversation}
			generating={chats.generating}
			modelConfigured={chats.modelConfigured}
			{contextOpen}
			onopenhistory={() => (historyOpen = true)}
			onrename={(id, title) => void chats.renameConversation(id, title)}
			ontogglepin={(id) => void chats.togglePin(id)}
			onarchive={(id, archived) => void chats.setArchived(id, archived)}
			ondelete={(id) => void chats.deleteConversation(id)}
			ontogglecontext={() => (contextOpen = !contextOpen)}
		/>

		{#if chats.storageError}
			<p class="banner error" role="alert">
				<Icon name="alert" size={14} />
				<span>{chats.storageError}</span>
			</p>
		{/if}

		<ChatMessageList
			conversation={chats.activeConversation}
			messages={chats.activeMessages}
			loading={chats.loadingMessages}
			generating={chats.generating}
			modelConfigured={chats.modelConfigured}
			onregenerate={(id) => void chats.regenerate(id)}
			onretry={(id) => void chats.retry(id)}
		/>

		<div class="composer-slot">
			<ChatsComposer
				onsubmit={send}
				generating={chats.generating}
				onstop={() => chats.stopGeneration()}
				onnotice={(n) => (notice = n)}
			/>
			{#if !chats.modelConfigured}
				<p class="model-note" role="status">
					<Icon name="info" size={12} />
					<span>
						The ARTI intelligence service is not configured, so messages are saved and no reply is generated.
						Connect a privately hosted endpoint to enable responses.
					</span>
				</p>
			{/if}
		</div>
	</section>

	<!-- Region C: context. Closed by default; a drawer below 1100px. -->
	<div class="context-region" class:drawer={contextOpen}>
		<ChatContextPanel
			open={contextOpen}
			conversation={chats.activeConversation}
			messages={chats.activeMessages}
			scope={{ workspaceId: 'arti-home', userId: null }}
			sharedStorageConfigured={chats.sharedStorageConfigured}
			onclose={() => (contextOpen = false)}
		/>
	</div>

	{#if contextOpen}
		<button class="scrim context-scrim" aria-label="Close context panel" onclick={() => (contextOpen = false)}></button>
	{/if}
</div>

<style>
	.chats {
		position: relative;
		flex: 1;
		min-height: 0;
		display: grid;
		grid-template-columns: var(--chat-history-width) minmax(0, 1fr);
		height: 100%;
		overflow: hidden;
	}

	.chats.context-open {
		grid-template-columns: var(--chat-history-width) minmax(0, 1fr) var(--chat-context-width);
	}

	.history-region {
		min-width: 0;
		min-height: 0;
		height: 100%;
	}

	.conversation {
		display: flex;
		flex-direction: column;
		min-width: 0;
		min-height: 0;
		height: 100%;
	}

	.composer-slot {
		flex-shrink: 0;
		width: 100%;
		max-width: var(--chat-max-width);
		margin: 0 auto;
		padding: var(--space-2) var(--space-6) var(--space-5);
	}

	.model-note {
		display: flex;
		align-items: flex-start;
		gap: 6px;
		margin: var(--space-2) 0 0;
		font-size: 11.5px;
		line-height: 1.5;
		color: var(--text-muted);
	}

	.banner {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		margin: var(--space-3) var(--space-6) 0;
		padding: var(--space-2) var(--space-3);
		border-radius: var(--radius-sm);
		font-size: 12.5px;
	}

	.banner.error {
		border: 1px solid rgba(212, 120, 96, 0.45);
		color: #e0a08c;
	}

	.context-region {
		min-width: 0;
		min-height: 0;
		height: 100%;
	}

	.scrim {
		display: none;
	}

	/* Below 1200px the context panel becomes an overlay drawer. */
	@media (max-width: 1200px) {
		.chats,
		.chats.context-open {
			grid-template-columns: var(--chat-history-width) minmax(0, 1fr);
		}

		.context-region {
			position: fixed;
			top: 0;
			right: 0;
			z-index: var(--z-sidebar);
			width: min(var(--chat-context-width), 90vw);
			transform: translateX(100%);
			transition: transform 200ms ease;
		}

		.chats.context-open .context-region {
			transform: translateX(0);
		}

		.chats.context-open .context-scrim {
			display: block;
			position: fixed;
			inset: 0;
			z-index: calc(var(--z-sidebar) - 1);
			background: rgba(0, 0, 0, 0.6);
			border: none;
		}
	}

	/* Below 1100px the history sidebar becomes an overlay drawer. */
	@media (max-width: 1100px) {
		.chats,
		.chats.context-open {
			grid-template-columns: minmax(0, 1fr);
		}

		.history-region {
			position: fixed;
			top: 0;
			left: 0;
			z-index: var(--z-sidebar);
			width: min(var(--chat-history-width), 88vw);
			transform: translateX(-100%);
			transition: transform 200ms ease;
		}

		.history-region.drawer {
			transform: translateX(0);
		}

		.chats .scrim:not(.context-scrim) {
			display: block;
			position: fixed;
			inset: 0;
			z-index: calc(var(--z-sidebar) - 1);
			background: rgba(0, 0, 0, 0.6);
			border: none;
		}
	}

	@media (max-width: 720px) {
		.composer-slot {
			padding: var(--space-1) var(--space-4) var(--space-4);
		}

		.banner {
			margin: var(--space-2) var(--space-4) 0;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.history-region,
		.context-region {
			transition: none;
		}
	}
</style>
