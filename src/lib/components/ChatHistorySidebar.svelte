<script lang="ts">
	/**
	 * Region A — conversation history.
	 *
	 * Navigates conversations only. Global navigation stays in the application
	 * shell (the sidebar in `+layout.svelte`), so nothing here duplicates it.
	 * Every list item keys off a stable conversation id, never a list position.
	 */
	import Icon from './Icon.svelte';
	import Menu from './Menu.svelte';
	import Dialog from './Dialog.svelte';
	import type { MenuItem } from './menu.types';
	import { relativeTime, validateFolderName } from '#lib/chats/search';
	import type { Conversation, Folder } from '#lib/chats/types';

	interface Props {
		conversations: Conversation[];
		folders: Folder[];
		folderContents: Record<string, Conversation[]>;
		pinned: Conversation[];
		unfiled: Conversation[];
		archived: Conversation[];
		activeId: string | null;
		loading: boolean;
		storageNotice: { tone: 'info' | 'warning'; text: string };
		storageLabel: string;
		searchQuery: string;
		searchResults: import('#lib/chats/search').SearchResult[];
		searching: boolean;
		showArchived: boolean;
		previewFor: (id: string) => string;

		onnew: () => void;
		onselect: (id: string) => void;
		onsearch: (query: string) => void;
		onclearsearch: () => void;
		ontogglearchived: () => void;
		onpin: (id: string) => void;
		onrename: (id: string, title: string) => void;
		onarchive: (id: string, archived: boolean) => void;
		onmove: (id: string, folderId: string | null) => void;
		ondelete: (id: string) => void;
		oncreatefolder: (name: string) => void;
		onrenamefolder: (id: string, name: string) => void;
		ondeletefolder: (id: string) => void;
		oncollapse: () => void;
	}

	let {
		conversations,
		folders,
		folderContents,
		pinned,
		unfiled,
		archived,
		activeId,
		loading,
		storageNotice,
		storageLabel,
		searchQuery,
		searchResults,
		searching,
		showArchived,
		previewFor,
		onnew,
		onselect,
		onsearch,
		onclearsearch,
		ontogglearchived,
		onpin,
		onrename,
		onarchive,
		onmove,
		ondelete,
		oncreatefolder,
		onrenamefolder,
		ondeletefolder,
		oncollapse
	}: Props = $props();

	// --- Dialog state ---------------------------------------------------------
	type RenameTarget = { id: string; title: string; kind: 'conversation' | 'folder' };
	type DeleteTarget = { id: string; title: string; kind: 'conversation' | 'folder'; count?: number };
	type MoveTarget = { id: string; title: string };

	let renameTarget = $state<RenameTarget | null>(null);
	let renameValue = $state('');
	let deleteTarget = $state<DeleteTarget | null>(null);
	let moveTarget = $state<MoveTarget | null>(null);
	let moveFolderId = $state<string>('');
	let createOpen = $state(false);
	let createValue = $state('');
	let expandedFolders = $state<Record<string, boolean>>({});

	// --- Search debounce ------------------------------------------------------
	let searchTimer: ReturnType<typeof setTimeout> | undefined;

	function onSearchInput(event: Event): void {
		const value = (event.currentTarget as HTMLInputElement).value;
		clearTimeout(searchTimer);
		// Titles match instantly; the debounce covers message-content lookup, which
		// may need to load uncached message lists from the repository.
		searchTimer = setTimeout(() => onsearch(value), 220);
	}

	// --- Menu item builders ---------------------------------------------------
	type ConvAction = 'pin' | 'rename' | 'move' | 'archive' | 'delete';

	function conversationMenu(conversation: Conversation): MenuItem[] {
		const items: MenuItem[] = [
			{ id: 'pin', label: conversation.pinned ? 'Unpin' : 'Pin to top', icon: 'pin' },
			{ id: 'rename', label: 'Rename', icon: 'edit' },
			{ id: 'move', label: 'Move to folder…', icon: 'folder' },
			{
				id: 'archive',
				label: conversation.archived ? 'Unarchive' : 'Archive',
				icon: 'archive'
			}
		];
		items.push({ id: 'delete', label: 'Delete', icon: 'trash', danger: true });
		return items;
	}

	function onConversationAction(conversation: Conversation, action: string): void {
		switch (action as ConvAction) {
			case 'pin':
				onpin(conversation.id);
				break;
			case 'rename':
				renameTarget = { id: conversation.id, title: conversation.title, kind: 'conversation' };
				renameValue = conversation.title;
				break;
			case 'move':
				moveTarget = { id: conversation.id, title: conversation.title };
				moveFolderId = conversation.folderId ?? '';
				break;
			case 'archive':
				onarchive(conversation.id, !conversation.archived);
				break;
			case 'delete':
				deleteTarget = { id: conversation.id, title: conversation.title, kind: 'conversation' };
				break;
		}
	}

	type FolderAction = 'rename' | 'delete';

	function folderMenu(folder: Folder, count: number): MenuItem[] {
		return [
			{ id: 'rename', label: 'Rename folder', icon: 'edit' },
			{ id: 'delete', label: count > 0 ? 'Delete folder…' : 'Delete folder', icon: 'trash', danger: true }
		];
	}

	function onFolderAction(folder: Folder, count: number, action: string): void {
		if (action === 'rename') {
			renameTarget = { id: folder.id, title: folder.name, kind: 'folder' };
			renameValue = folder.name;
		} else {
			deleteTarget = { id: folder.id, title: folder.name, kind: 'folder', count };
		}
	}

	// --- Validation -----------------------------------------------------------
	let renameError = $derived.by(() => {
		if (!renameTarget) return null;
		if (renameTarget.kind === 'folder') {
			const error = validateFolderName(renameValue, folders, { ignoreId: renameTarget.id });
			return folderErrorText(error);
		}
		return renameValue.trim() ? null : 'A title is required.';
	});

	let createError = $derived(folderErrorText(validateFolderName(createValue, folders)));

	function folderErrorText(error: ReturnType<typeof validateFolderName>): string | null {
		switch (error) {
			case 'empty':
				return 'Enter a folder name.';
			case 'too-long':
				return 'Folder names are limited to 40 characters.';
			case 'duplicate':
				return 'A folder with this name already exists.';
			default:
				return null;
		}
	}

	function confirmRename(): void {
		if (!renameTarget || renameError) return;
		if (renameTarget.kind === 'folder') onrenamefolder(renameTarget.id, renameValue);
		else onrename(renameTarget.id, renameValue);
		renameTarget = null;
	}

	function confirmCreate(): void {
		if (createError) return;
		oncreatefolder(createValue);
		createOpen = false;
		createValue = '';
	}

	function confirmDelete(): void {
		if (!deleteTarget) return;
		if (deleteTarget.kind === 'folder') ondeletefolder(deleteTarget.id);
		else ondelete(deleteTarget.id);
		deleteTarget = null;
	}

	function confirmMove(): void {
		if (!moveTarget) return;
		onmove(moveTarget.id, moveFolderId || null);
		moveTarget = null;
	}

	function toggleFolder(id: string): void {
		expandedFolders = { ...expandedFolders, [id]: !(expandedFolders[id] ?? true) };
	}
</script>

<div class="history" aria-label="Conversation history">
	<header class="head">
		<h2>Chats</h2>
		<button class="collapse" aria-label="Collapse conversation list" title="Collapse" onclick={oncollapse}>
			<Icon name="panel-right" size={16} />
		</button>
	</header>

	<div class="controls">
		<button class="new-chat" onclick={onnew}>
			<Icon name="plus" size={16} />
			<span>New chat</span>
		</button>

		<div class="search">
			<Icon name="search" size={15} />
			<input
				type="search"
				placeholder="Search conversations"
				aria-label="Search conversations"
				value={searchQuery}
				oninput={onSearchInput}
			/>
			{#if searchQuery}
				<button class="search-clear" aria-label="Clear search" onclick={onclearsearch}>
					<Icon name="close" size={13} />
				</button>
			{/if}
		</div>
	</div>

	<div class="scroll">
		{#if storageNotice.text}
			<p class="storage-note" class:warning={storageNotice.tone === 'warning'} role="status">
				<Icon name="info" size={13} />
				<span>{storageNotice.text}</span>
			</p>
		{/if}

		{#if searchQuery}
			<!-- Search results replace the grouped list while a query is active. -->
			<section aria-label="Search results">
				<h3 class="group-title">Results</h3>
				{#if searching}
					<p class="state" role="status">Searching…</p>
				{:else if searchResults.length === 0}
					<p class="state">No conversations match “{searchQuery}”.</p>
				{:else}
					<ul class="list">
						{#each searchResults as result (result.conversation.id)}
							<li>
								<button
									class="item"
									class:active={result.conversation.id === activeId}
									onclick={() => onselect(result.conversation.id)}
								>
									<span class="item-title">{result.conversation.title}</span>
									<span class="item-preview">
										{result.matchedOn === 'message' ? result.snippet : previewFor(result.conversation.id)}
									</span>
								</button>
							</li>
						{/each}
					</ul>
				{/if}
			</section>
		{:else if loading}
			<p class="state" role="status">Loading conversations…</p>
		{:else if conversations.length === 0}
			<p class="state">No conversations yet. Start one with New chat.</p>
		{:else}
			{#if pinned.length}
				<section aria-label="Pinned conversations">
					<h3 class="group-title"><Icon name="pin" size={12} /> Pinned</h3>
					<ul class="list">
						{#each pinned as conversation (conversation.id)}
							{@render conversationRow(conversation)}
						{/each}
					</ul>
				</section>
			{/if}

			{#each folders as folder (folder.id)}
				{@const contents = folderContents[folder.id] ?? []}
				<section aria-label="Folder {folder.name}">
					<div class="folder-head">
						<button
							class="folder-toggle"
							aria-expanded={expandedFolders[folder.id] ?? true}
							onclick={() => toggleFolder(folder.id)}
						>
							<Icon name="chevron-down" size={13} class="chev" />
							<Icon name="folder" size={13} />
							<span>{folder.name}</span>
							<span class="count">{contents.length}</span>
						</button>
						<Menu
							label="Folder {folder.name}"
							items={folderMenu(folder, contents.length)}
							onselect={(action) => onFolderAction(folder, contents.length, action)}
						/>
					</div>
					{#if expandedFolders[folder.id] ?? true}
						{#if contents.length}
							<ul class="list">
								{#each contents as conversation (conversation.id)}
									{@render conversationRow(conversation)}
								{/each}
							</ul>
						{:else}
							<p class="state small">Empty folder</p>
						{/if}
					{/if}
				</section>
			{/each}

			<section aria-label="Recent conversations">
				<h3 class="group-title">Recent</h3>
				{#if unfiled.length}
					<ul class="list">
						{#each unfiled as conversation (conversation.id)}
							{@render conversationRow(conversation)}
						{/each}
					</ul>
				{:else}
					<p class="state small">Nothing unfiled.</p>
				{/if}
			</section>

			{#if archived.length}
				<section aria-label="Archived conversations">
					<button class="archived-toggle" aria-expanded={showArchived} onclick={ontogglearchived}>
						<Icon name="archive" size={13} />
						<span>Archived</span>
						<span class="count">{archived.length}</span>
					</button>
					{#if showArchived}
						<ul class="list">
							{#each archived as conversation (conversation.id)}
								{@render conversationRow(conversation)}
							{/each}
						</ul>
					{/if}
				</section>
			{/if}

			<button class="new-folder" onclick={() => { createOpen = true; createValue = ''; }}>
				<Icon name="folder-plus" size={14} />
				<span>New folder</span>
			</button>
		{/if}
	</div>
</div>

<!-- Row snippet is local to this component so every list renders identically. -->
{#snippet conversationRow(conversation: Conversation)}
	<li>
		<div class="row" class:active={conversation.id === activeId}>
			<button class="item" onclick={() => onselect(conversation.id)}>
				<span class="item-title">
					{#if conversation.pinned}<Icon name="pin" size={11} />{/if}
					{conversation.title}
				</span>
				<span class="item-meta">
					<time datetime={conversation.updatedAt}>{relativeTime(conversation.updatedAt)}</time>
					{#if conversation.archived}<span class="tag">Archived</span>{/if}
				</span>
				{#if previewFor(conversation.id)}
					<span class="item-preview">{previewFor(conversation.id)}</span>
				{/if}
			</button>
			<Menu
				label={conversation.title}
				items={conversationMenu(conversation)}
				onselect={(action) => onConversationAction(conversation, action)}
			/>
		</div>
	</li>
{/snippet}

<!-- Rename (conversation or folder) -->
<Dialog
	open={renameTarget !== null}
	title={renameTarget?.kind === 'folder' ? 'Rename folder' : 'Rename conversation'}
	confirmLabel="Save"
	confirmDisabled={renameError !== null}
	onconfirm={confirmRename}
	oncancel={() => (renameTarget = null)}
>
	<label class="field">
		<span>{renameTarget?.kind === 'folder' ? 'Folder name' : 'Title'}</span>
		<input
			type="text"
			bind:value={renameValue}
			aria-invalid={renameError ? 'true' : undefined}
			onkeydown={(e) => e.key === 'Enter' && confirmRename()}
		/>
	</label>
	{#if renameError}<p class="field-error" role="alert">{renameError}</p>{/if}
</Dialog>

<!-- Delete conversation / folder -->
<Dialog
	open={deleteTarget !== null}
	title={deleteTarget?.kind === 'folder' ? 'Delete folder' : 'Delete conversation'}
	description={deleteTarget?.kind === 'folder'
		? deleteTarget.count
			? `“${deleteTarget.title}” contains ${deleteTarget.count} conversation${deleteTarget.count === 1 ? '' : 's'}. They will be moved to Unfiled — no conversations are deleted.`
			: `“${deleteTarget.title}” is empty and will be removed.`
		: `“${deleteTarget?.title ?? ''}” and its messages will be permanently deleted. This cannot be undone.`}
	confirmLabel={deleteTarget?.kind === 'folder' ? 'Delete folder' : 'Delete'}
	destructive
	onconfirm={confirmDelete}
	oncancel={() => (deleteTarget = null)}
></Dialog>

<!-- Move to folder -->
<Dialog
	open={moveTarget !== null}
	title="Move to folder"
	description={`Choose where “${moveTarget?.title ?? ''}” should appear.`}
	confirmLabel="Move"
	onconfirm={confirmMove}
	oncancel={() => (moveTarget = null)}
>
	<label class="field">
		<span>Folder</span>
		<select bind:value={moveFolderId}>
			<option value="">Unfiled</option>
			{#each folders as folder (folder.id)}
				<option value={folder.id}>{folder.name}</option>
			{/each}
		</select>
	</label>
	{#if folders.length === 0}
		<p class="field-hint">No folders yet — create one first to move this conversation.</p>
	{/if}
</Dialog>

<!-- Create folder -->
<Dialog
	open={createOpen}
	title="New folder"
	confirmLabel="Create"
	confirmDisabled={createError !== null}
	onconfirm={confirmCreate}
	oncancel={() => (createOpen = false)}
>
	<label class="field">
		<span>Folder name</span>
		<input
			type="text"
			bind:value={createValue}
			placeholder="e.g. Client work"
			aria-invalid={createError ? 'true' : undefined}
			onkeydown={(e) => e.key === 'Enter' && confirmCreate()}
		/>
	</label>
	{#if createError}<p class="field-error" role="alert">{createError}</p>{/if}
</Dialog>

<style>
	.history {
		display: flex;
		flex-direction: column;
		height: 100%;
		min-height: 0;
		background: linear-gradient(180deg, var(--surface-sidebar) 0%, var(--surface-sidebar-end) 100%);
		border-right: 1px solid var(--border-hair);
	}

	.head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-2);
		padding: var(--space-4) var(--space-4) var(--space-2);
	}

	h2 {
		margin: 0;
		font-family: var(--font-display);
		font-size: 18px;
		font-weight: 700;
		letter-spacing: 0.06em;
		color: var(--gold-bright);
	}

	.collapse {
		display: grid;
		place-items: center;
		width: 30px;
		height: 30px;
		border-radius: var(--radius-sm);
		border: 1px solid var(--border-hair);
		color: var(--text-secondary);
	}

	.collapse:hover {
		color: var(--gold-bright);
		border-color: var(--border-gold);
	}

	.controls {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
		padding: 0 var(--space-4) var(--space-3);
	}

	.new-chat {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: var(--space-2);
		padding: 10px 14px;
		border-radius: var(--radius-md);
		border: 1px solid var(--border-gold);
		background: linear-gradient(180deg, rgba(201, 154, 54, 0.16), rgba(201, 154, 54, 0.05));
		color: var(--gold-bright);
		font-size: 13.5px;
		font-weight: 600;
	}

	.new-chat:hover {
		background: linear-gradient(180deg, rgba(229, 193, 106, 0.24), rgba(201, 154, 54, 0.08));
	}

	.search {
		position: relative;
		display: flex;
		align-items: center;
		gap: var(--space-2);
		padding: 8px 12px;
		border-radius: var(--radius-md);
		border: 1px solid var(--border-hair);
		background: rgba(255, 255, 255, 0.03);
		color: var(--text-muted);
	}

	.search:focus-within {
		border-color: var(--border-gold);
	}

	.search input {
		flex: 1;
		min-width: 0;
		border: none;
		background: transparent;
		color: var(--text-primary);
		font: inherit;
		font-size: 13px;
	}

	.search input:focus {
		outline: none;
	}

	.search-clear {
		display: grid;
		place-items: center;
		width: 20px;
		height: 20px;
		border-radius: 50%;
		color: var(--text-muted);
	}

	.search-clear:hover {
		color: var(--gold-bright);
		background: rgba(201, 154, 54, 0.12);
	}

	.scroll {
		flex: 1;
		min-height: 0;
		overflow-y: auto;
		padding: 0 var(--space-3) var(--space-5);
	}

	.storage-note {
		display: flex;
		align-items: flex-start;
		gap: 6px;
		margin: 0 var(--space-1) var(--space-3);
		padding: var(--space-2) var(--space-3);
		border-radius: var(--radius-sm);
		border: 1px solid var(--border-hair);
		color: var(--text-muted);
		font-size: 11.5px;
		line-height: 1.45;
	}

	.storage-note.warning {
		border-color: rgba(212, 120, 96, 0.4);
		color: #e0a08c;
	}

	.group-title {
		display: flex;
		align-items: center;
		gap: 5px;
		margin: var(--space-3) var(--space-2) var(--space-1);
		font-size: 10.5px;
		font-weight: 600;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--text-muted);
	}

	.list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.row {
		display: flex;
		align-items: center;
		border-radius: var(--radius-md);
		border: 1px solid transparent;
	}

	.row:hover {
		background: rgba(201, 154, 54, 0.06);
	}

	.row.active {
		background: linear-gradient(90deg, rgba(201, 154, 54, 0.16), rgba(201, 154, 54, 0.03));
		border-color: var(--border-gold);
	}

	.item {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 2px;
		flex: 1;
		min-width: 0;
		padding: 8px var(--space-3);
		text-align: left;
		color: var(--text-secondary);
	}

	.item-title {
		display: flex;
		align-items: center;
		gap: 5px;
		max-width: 100%;
		font-size: 13px;
		font-weight: 600;
		color: var(--text-primary);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.row.active .item-title {
		color: var(--gold-bright);
	}

	.item-meta {
		display: flex;
		align-items: center;
		gap: 6px;
		font-size: 11px;
		color: var(--text-muted);
	}

	.tag {
		padding: 0 6px;
		border-radius: var(--radius-pill);
		border: 1px solid var(--border-hair);
	}

	.item-preview {
		max-width: 100%;
		font-size: 11.5px;
		color: var(--text-muted);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.folder-head {
		display: flex;
		align-items: center;
		gap: var(--space-1);
		margin-top: var(--space-3);
	}

	.folder-toggle,
	.archived-toggle {
		display: flex;
		align-items: center;
		gap: 6px;
		flex: 1;
		min-width: 0;
		padding: 6px var(--space-2);
		border-radius: var(--radius-sm);
		color: var(--text-secondary);
		font-size: 12px;
		font-weight: 600;
		text-align: left;
	}

	.folder-toggle:hover,
	.archived-toggle:hover {
		color: var(--gold-bright);
		background: rgba(201, 154, 54, 0.07);
	}

	.folder-toggle :global(.chev) {
		transition: transform 160ms ease;
	}

	.folder-toggle[aria-expanded='false'] :global(.chev) {
		transform: rotate(-90deg);
	}

	.count {
		margin-left: auto;
		font-size: 11px;
		color: var(--text-muted);
	}

	.archived-toggle {
		margin-top: var(--space-3);
	}

	.new-folder {
		display: flex;
		align-items: center;
		gap: 6px;
		width: 100%;
		margin-top: var(--space-3);
		padding: 7px var(--space-2);
		border-radius: var(--radius-sm);
		color: var(--text-muted);
		font-size: 12px;
	}

	.new-folder:hover {
		color: var(--gold-bright);
		background: rgba(201, 154, 54, 0.07);
	}

	.state {
		margin: var(--space-2) var(--space-2);
		font-size: 12.5px;
		line-height: 1.5;
		color: var(--text-muted);
	}

	.state.small {
		font-size: 11.5px;
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: 6px;
		font-size: 12.5px;
		color: var(--text-secondary);
	}

	.field input,
	.field select {
		padding: 9px 12px;
		border-radius: var(--radius-sm);
		border: 1px solid var(--border-hair);
		background: rgba(255, 255, 255, 0.03);
		color: var(--text-primary);
		font: inherit;
		font-size: 14px;
	}

	.field input:focus,
	.field select:focus {
		outline: none;
		border-color: var(--border-gold);
	}

	.field-error {
		margin: var(--space-2) 0 0;
		font-size: 12.5px;
		color: #e9a48f;
	}

	.field-hint {
		margin: var(--space-2) 0 0;
		font-size: 12px;
		color: var(--text-muted);
	}
</style>
