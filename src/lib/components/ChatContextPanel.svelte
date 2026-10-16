<script lang="ts">
	/**
	 * Region C — context panel.
	 *
	 * Closed by default; opened from the chat header. Every section renders only
	 * data that actually exists for the selected conversation. Where ARTI has no
	 * subsystem yet (memory, retrieval, context accounting) the section states that
	 * plainly instead of showing invented entries, sources or token counts.
	 */
	import Icon from './Icon.svelte';
	import { relativeTime, formatBytes } from '#lib/chats/search';
	import type { Attachment, ChatMessage, Conversation, WorkspaceScope } from '#lib/chats/types';

	interface Props {
		open: boolean;
		conversation: Conversation | null;
		messages: ChatMessage[];
		scope: WorkspaceScope;
		sharedStorageConfigured: boolean;
		onclose: () => void;
	}

	let { open, conversation, messages, scope, sharedStorageConfigured, onclose }: Props = $props();

	/** Files actually attached anywhere in this conversation. */
	let files = $derived.by((): Attachment[] => messages.flatMap((m) => m.attachments));

	/** Sources actually cited by responses in this conversation. */
	let citations = $derived.by(() => messages.flatMap((m) => m.citations));

	/** Tool activity actually reported for this conversation. */
	let toolRuns = $derived.by(() => messages.flatMap((m) => m.toolRuns));
</script>

<aside class="context" aria-label="Context panel" class:hidden={!open}>
	<header class="head">
		<h2>Context</h2>
		<button class="close" aria-label="Close context panel" onclick={onclose}>
			<Icon name="close" size={16} />
		</button>
	</header>

	<div class="body">
		{#if !conversation}
			<p class="empty">No conversation selected, so there is no context to show.</p>
		{:else}
			<section aria-labelledby="ctx-conversation">
				<h3 id="ctx-conversation"><Icon name="info" size={13} /> Conversation</h3>
				<dl class="facts">
					<dt>Title</dt>
					<dd>{conversation.title}{conversation.titleIsAuto ? ' (auto)' : ''}</dd>
					<dt>Created</dt>
					<dd>{relativeTime(conversation.createdAt)}</dd>
					<dt>Updated</dt>
					<dd>{relativeTime(conversation.updatedAt)}</dd>
					<dt>Messages</dt>
					<dd>{messages.length}</dd>
					<dt>Owner scope</dt>
					<dd>{scope.userId ?? 'Local workspace (no authenticated user)'}</dd>
				</dl>
			</section>

			<section aria-labelledby="ctx-files">
				<h3 id="ctx-files"><Icon name="document" size={13} /> Files</h3>
				{#if files.length === 0}
					<p class="empty">No files attached in this conversation.</p>
				{:else}
					<ul class="rows">
						{#each files as file (file.id)}
							<li class="row">
								<div class="row-main">
									<span class="row-title">{file.name}</span>
									<span class="row-sub">{formatBytes(file.size)} · {file.status}</span>
								</div>
								{#if file.detail}<span class="row-note">{file.detail}</span>{/if}
							</li>
						{/each}
					</ul>
				{/if}
			</section>

			<section aria-labelledby="ctx-sources">
				<h3 id="ctx-sources"><Icon name="link" size={13} /> Sources</h3>
				{#if citations.length === 0}
					<p class="empty">
						No sources have been retrieved for this conversation.
					</p>
				{:else}
					<ul class="rows">
						{#each citations as citation (citation.id)}
							<li class="row">
								<a href={citation.url} rel="noopener noreferrer nofollow" target="_blank">{citation.title}</a>
							</li>
						{/each}
					</ul>
				{/if}
			</section>

			<section aria-labelledby="ctx-memory">
				<h3 id="ctx-memory"><Icon name="brain" size={13} /> Memory</h3>
				<p class="empty">
					Personal and project memory is not connected yet. Conversation history is stored separately and is
					never treated as approved permanent memory.
				</p>
			</section>

			<section aria-labelledby="ctx-tasks">
				<h3 id="ctx-tasks"><Icon name="tools" size={13} /> Tasks &amp; tools</h3>
				{#if toolRuns.length === 0}
					<p class="empty">No tool executions in this conversation.</p>
				{:else}
					<ul class="rows">
						{#each toolRuns as run (run.id)}
							<li class="row" data-state={run.state}>
								<div class="row-main">
									<span class="row-title">{run.label}</span>
									<span class="row-sub">{run.state}</span>
								</div>
								{#if run.detail}<span class="row-note">{run.detail}</span>{/if}
							</li>
						{/each}
					</ul>
				{/if}
			</section>

			<section aria-labelledby="ctx-storage">
				<h3 id="ctx-storage"><Icon name="shield" size={13} /> Storage &amp; privacy</h3>
				<p class="empty">
					{#if sharedStorageConfigured}
						A shared storage project is configured. Conversations are scoped to the workspace and access must be
						enforced by the backend, not by hiding controls.
					{:else}
						Shared storage is not configured, so conversations live in this browser only. They are not shared
						between Ramakanth and Tejasree yet, and no cross-user boundary is implied.
					{/if}
				</p>
			</section>
		{/if}
	</div>
</aside>

<style>
	.context {
		display: flex;
		flex-direction: column;
		min-height: 0;
		height: 100%;
		width: 100%;
		background: var(--surface-panel-solid);
		border-left: 1px solid var(--border-hair);
	}

	.head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-2);
		height: var(--topbar-height);
		flex-shrink: 0;
		padding: 0 var(--space-4);
		border-bottom: 1px solid var(--border-hair);
	}

	h2 {
		margin: 0;
		font-family: var(--font-display);
		font-size: 15px;
		font-weight: 600;
		letter-spacing: 0.08em;
		color: var(--gold-bright);
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

	.body {
		flex: 1;
		min-height: 0;
		overflow-y: auto;
		padding: var(--space-4);
		display: flex;
		flex-direction: column;
		gap: var(--space-5);
	}

	section {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}

	h3 {
		display: flex;
		align-items: center;
		gap: 6px;
		margin: 0;
		font-size: 10.5px;
		font-weight: 600;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--gold);
	}

	.facts {
		display: grid;
		grid-template-columns: auto 1fr;
		gap: 5px var(--space-3);
		margin: 0;
		font-size: 12.5px;
	}

	.facts dt {
		color: var(--text-muted);
	}

	.facts dd {
		margin: 0;
		color: var(--text-secondary);
		overflow-wrap: anywhere;
	}

	.empty {
		margin: 0;
		font-size: 12px;
		line-height: 1.55;
		color: var(--text-muted);
	}

	.rows {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.row {
		display: flex;
		flex-direction: column;
		gap: 2px;
		padding: var(--space-2) var(--space-3);
		border-radius: var(--radius-sm);
		border: 1px solid var(--border-hair);
		background: rgba(255, 255, 255, 0.02);
		font-size: 12.5px;
	}

	.row-main {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: var(--space-2);
	}

	.row-title {
		color: var(--text-primary);
		overflow-wrap: anywhere;
	}

	.row-sub {
		color: var(--text-muted);
		font-size: 11px;
		text-transform: capitalize;
	}

	.row-note {
		color: var(--text-muted);
		font-size: 11px;
	}

	.row a {
		color: var(--gold-bright);
	}
</style>
