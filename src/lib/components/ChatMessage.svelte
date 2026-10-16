<script lang="ts">
	/**
	 * Renders a single conversation message.
	 *
	 * Assistant output is parsed from markdown and sanitised before it reaches the
	 * DOM (see `chats/markdown.ts`), so a model response can never inject script.
	 * Code blocks carry their own copy control; a single delegated click handler
	 * reads the raw source from `data-code`, so the copy action copies exactly what
	 * is displayed rather than the highlighted markup.
	 */
	import Icon from './Icon.svelte';
	import { renderMarkdown } from '#lib/chats/markdown';
	import { formatBytes } from '#lib/chats/search';
	import { relativeTime } from '#lib/chats/search';
	import type { ChatMessage as Message } from '#lib/chats/types';

	interface Props {
		message: Message;
		/** Whether this is the message currently being generated. */
		streaming?: boolean;
		onregenerate?: (id: string) => void;
		onretry?: (id: string) => void;
	}

	let { message, streaming = false, onregenerate, onretry }: Props = $props();

	let body = $state<HTMLElement | null>(null);
	let copied = $state(false);

	let html = $derived(renderMarkdown(message.content));

	let isAssistant = $derived(message.role === 'assistant');
	let hasContent = $derived(message.content.trim().length > 0);

	/** Copies the original code text from the clicked block's `data-code`. */
	async function onClick(event: MouseEvent): Promise<void> {
		const target = (event.target as HTMLElement).closest<HTMLButtonElement>('.code-copy');
		if (!target) return;
		const code = target.getAttribute('data-code') ?? '';
		try {
			await navigator.clipboard.writeText(code.replace(/&#10;/g, '\n'));
			target.textContent = 'Copied';
			target.classList.add('done');
			setTimeout(() => {
				target.textContent = 'Copy';
				target.classList.remove('done');
			}, 1600);
		} catch {
			target.textContent = 'Copy failed';
			setTimeout(() => (target.textContent = 'Copy'), 1600);
		}
	}

	async function copyMessage(): Promise<void> {
		try {
			await navigator.clipboard.writeText(message.content);
			copied = true;
			setTimeout(() => (copied = false), 1600);
		} catch {
			copied = false;
		}
	}
</script>

<article class="message" class:assistant={isAssistant} class:streaming aria-label={isAssistant ? 'ARTI response' : 'Your message'}>
	<div class="avatar" aria-hidden="true">
		{#if isAssistant}
			<Icon name="sparkle" size={15} />
		{:else}
			<span>You</span>
		{/if}
	</div>

	<div class="column">
		<div class="meta">
			<span class="who">{isAssistant ? 'ARTI' : 'You'}</span>
			<time datetime={message.createdAt}>{relativeTime(message.createdAt)}</time>
			{#if message.status === 'stopped'}
				<span class="flag"><Icon name="stop" size={11} /> Stopped</span>
			{:else if message.status === 'error'}
				<span class="flag error"><Icon name="alert" size={11} /> Failed</span>
			{/if}
		</div>

		{#if hasContent}
			<div class="bubble" class:error={message.status === 'error'}>
				<!-- Code-block copy uses a delegated listener; the container is marked
				     non-interactive for the accessibility tree because the only
				     interactive elements inside are real buttons. -->
				<div
					class="body"
					bind:this={body}
					role="presentation"
					onclick={onClick}
				>
					<!-- Sanitised markdown: parsed then passed through DOMPurify. -->
					{@html html}
				</div>
			</div>
		{:else if streaming}
			<div class="bubble">
				<div class="typing" role="status" aria-label="ARTI is responding">
					<span></span><span></span><span></span>
				</div>
			</div>
		{/if}

		{#if message.error}
			<p class="notice error" role="status">
				<Icon name="alert" size={14} />
				<span>{message.error}</span>
			</p>
		{/if}

		{#if message.attachments.length}
			<ul class="attachments" aria-label="Attachments">
				{#each message.attachments as file (file.id)}
					<li class="attachment" class:rejected={file.status === 'rejected'} class:failed={file.status === 'failed'}>
						<Icon name={file.kind === 'image' ? 'image' : file.kind === 'code' ? 'coding' : 'document'} size={14} />
						<span class="file-name">{file.name}</span>
						<span class="file-size">{formatBytes(file.size)}</span>
						{#if file.status === 'rejected' || file.status === 'failed'}
							<span class="file-state">{file.detail ?? 'Not processed'}</span>
						{:else if file.status === 'ready'}
							<span class="file-state ok">Uploaded</span>
						{/if}
					</li>
				{/each}
			</ul>
		{/if}

		{#if message.toolRuns.length}
			<ul class="tools" aria-label="Tool activity">
				{#each message.toolRuns as run (run.id)}
					<li class="tool-run" data-state={run.state}>
						<Icon name="tools" size={13} />
						<span>{run.label}</span>
						<span class="tool-state">{run.state}</span>
						{#if run.detail}<span class="tool-detail">{run.detail}</span>{/if}
					</li>
				{/each}
			</ul>
		{/if}

		{#if message.citations.length}
			<div class="citations">
				<span class="citations-title"><Icon name="link" size={13} /> Sources</span>
				<ol>
					{#each message.citations as citation (citation.id)}
						<li><a href={citation.url} rel="noopener noreferrer nofollow" target="_blank">{citation.title}</a></li>
					{/each}
				</ol>
			</div>
		{/if}

		{#if isAssistant && !streaming && hasContent}
			<div class="actions">
				<button type="button" class="action" onclick={copyMessage}>
					<Icon name="copy" size={14} />
					<span>{copied ? 'Copied' : 'Copy'}</span>
				</button>
				<button type="button" class="action" onclick={() => onregenerate?.(message.id)}>
					<Icon name="refresh" size={14} />
					<span>Regenerate</span>
				</button>
			</div>
		{/if}

		{#if isAssistant && message.status === 'error' && message.replyTo}
			<div class="actions">
				<button type="button" class="action" onclick={() => onretry?.(message.id)}>
					<Icon name="refresh" size={14} />
					<span>Retry</span>
				</button>
			</div>
		{/if}
	</div>
</article>

<style>
	.message {
		display: grid;
		grid-template-columns: 30px minmax(0, 1fr);
		gap: var(--space-3);
		padding: var(--space-3) 0;
	}

	.avatar {
		display: grid;
		place-items: center;
		width: 30px;
		height: 30px;
		border-radius: 50%;
		border: 1px solid var(--border-hair);
		background: rgba(255, 255, 255, 0.03);
		color: var(--text-secondary);
		font-size: 11px;
		font-weight: 600;
	}

	.message.assistant .avatar {
		border-color: var(--border-gold);
		color: var(--gold-bright);
		background: linear-gradient(160deg, rgba(201, 154, 54, 0.2), rgba(201, 154, 54, 0.04));
	}

	.column {
		min-width: 0;
	}

	.meta {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		margin-bottom: 5px;
		font-size: 11.5px;
		color: var(--text-muted);
	}

	.who {
		font-weight: 600;
		letter-spacing: 0.04em;
		color: var(--text-secondary);
	}

	.flag {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		padding: 1px 8px;
		border-radius: var(--radius-pill);
		border: 1px solid var(--border-hair);
		color: var(--text-muted);
	}

	.flag.error {
		border-color: rgba(212, 120, 96, 0.5);
		color: #e9a48f;
	}

	.bubble {
		padding: var(--space-3) var(--space-4);
		border-radius: var(--radius-md);
		border: 1px solid var(--border-hair);
		background: rgba(255, 255, 255, 0.028);
		overflow-wrap: anywhere;
	}

	.message.assistant .bubble {
		background: rgba(11, 13, 14, 0.6);
	}

	.bubble.error {
		border-color: rgba(212, 120, 96, 0.35);
	}

	.body {
		font-size: 14.5px;
		line-height: 1.62;
		color: var(--text-primary);
	}

	.body :global(p) {
		margin: 0 0 var(--space-3);
	}

	.body :global(p:last-child) {
		margin-bottom: 0;
	}

	.body :global(h1),
	.body :global(h2),
	.body :global(h3) {
		margin: var(--space-4) 0 var(--space-2);
		font-family: var(--font-display);
		font-weight: 600;
		color: var(--gold-bright);
		letter-spacing: 0.02em;
	}

	.body :global(h1) { font-size: 19px; }
	.body :global(h2) { font-size: 17px; }
	.body :global(h3) { font-size: 15.5px; }
	.body :global(h1:first-child),
	.body :global(h2:first-child),
	.body :global(h3:first-child) { margin-top: 0; }

	.body :global(ul),
	.body :global(ol) {
		margin: 0 0 var(--space-3);
		padding-left: 1.35em;
	}

	.body :global(li) { margin-bottom: 4px; }

	.body :global(a) {
		color: var(--gold-bright);
		text-decoration: underline;
		text-underline-offset: 2px;
	}

	.body :global(code) {
		font-family: ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace;
		font-size: 0.88em;
		padding: 1px 5px;
		border-radius: 5px;
		background: rgba(201, 154, 54, 0.12);
		color: var(--gold-bright);
	}

	.body :global(blockquote) {
		margin: 0 0 var(--space-3);
		padding-left: var(--space-4);
		border-left: 2px solid var(--border-gold);
		color: var(--text-secondary);
	}

	.body :global(table) {
		display: block;
		width: 100%;
		max-width: 100%;
		overflow-x: auto;
		border-collapse: collapse;
		margin-bottom: var(--space-3);
		font-size: 13.5px;
	}

	.body :global(th),
	.body :global(td) {
		border: 1px solid var(--border-hair);
		padding: 7px 11px;
		text-align: left;
	}

	.body :global(th) {
		background: rgba(201, 154, 54, 0.08);
		color: var(--gold-bright);
		font-weight: 600;
	}

	/* Code block shell produced by the markdown renderer. */
	.body :global(.code-block) {
		margin: 0 0 var(--space-3);
		border: 1px solid var(--border-hair);
		border-radius: var(--radius-sm);
		overflow: hidden;
		background: #08090a;
	}

	.body :global(.code-head) {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-3);
		padding: 6px var(--space-3);
		background: rgba(201, 154, 54, 0.07);
		border-bottom: 1px solid var(--border-hair);
	}

	.body :global(.code-lang) {
		font-size: 10.5px;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--text-muted);
	}

	.body :global(.code-copy) {
		padding: 3px 10px;
		border-radius: var(--radius-pill);
		border: 1px solid var(--border-hair);
		color: var(--text-secondary);
		font-size: 11.5px;
	}

	.body :global(.code-copy:hover),
	.body :global(.code-copy.done) {
		color: var(--gold-bright);
		border-color: var(--border-gold);
		background: rgba(201, 154, 54, 0.1);
	}

	.body :global(.code-pre) {
		margin: 0;
		padding: var(--space-3);
		overflow-x: auto;
		font-size: 13px;
		line-height: 1.55;
	}

	.body :global(.code-pre code) {
		background: none;
		padding: 0;
		color: var(--text-primary);
	}

	.body :global(.plain-fallback) {
		margin: 0;
		white-space: pre-wrap;
		font-family: inherit;
	}

	.typing {
		display: flex;
		gap: 5px;
		padding: 4px 0;
	}

	.typing span {
		width: 7px;
		height: 7px;
		border-radius: 50%;
		background: var(--gold);
		opacity: 0.5;
		animation: pulse 1.2s ease-in-out infinite;
	}

	.typing span:nth-child(2) { animation-delay: 0.18s; }
	.typing span:nth-child(3) { animation-delay: 0.36s; }

	@keyframes pulse {
		0%, 80%, 100% { opacity: 0.25; transform: scale(0.85); }
		40% { opacity: 0.9; transform: scale(1); }
	}

	.notice {
		display: flex;
		align-items: flex-start;
		gap: var(--space-2);
		margin: var(--space-2) 0 0;
		font-size: 13px;
		line-height: 1.5;
	}

	.notice.error { color: #e9a48f; }

	.attachments {
		list-style: none;
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2);
		margin: var(--space-2) 0 0;
		padding: 0;
	}

	.attachment {
		display: inline-flex;
		align-items: center;
		gap: var(--space-2);
		padding: 5px 10px;
		border-radius: var(--radius-pill);
		border: 1px solid var(--border-hair);
		background: rgba(255, 255, 255, 0.03);
		font-size: 12px;
		color: var(--text-secondary);
		max-width: 100%;
	}

	.attachment.rejected,
	.attachment.failed {
		border-color: rgba(212, 120, 96, 0.42);
		color: #e0a08c;
	}

	.file-name {
		max-width: 220px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.file-size { color: var(--text-muted); }
	.file-state { color: var(--text-muted); }
	.file-state.ok { color: var(--gold-bright); }

	.tools {
		list-style: none;
		margin: var(--space-2) 0 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 5px;
	}

	.tool-run {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		padding: 5px 10px;
		border-radius: var(--radius-sm);
		border: 1px solid var(--border-hair);
		background: rgba(255, 255, 255, 0.02);
		font-size: 12.5px;
		color: var(--text-secondary);
	}

	.tool-state {
		margin-left: auto;
		font-size: 10.5px;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--text-muted);
	}

	.tool-run[data-state='completed'] .tool-state { color: var(--gold-bright); }
	.tool-run[data-state='failed'] .tool-state,
	.tool-run[data-state='cancelled'] .tool-state { color: #e0a08c; }

	.tool-detail { color: var(--text-muted); }

	.citations {
		margin-top: var(--space-2);
		padding: var(--space-2) var(--space-3);
		border-radius: var(--radius-sm);
		border: 1px solid var(--border-hair);
		background: rgba(201, 154, 54, 0.05);
		font-size: 12.5px;
	}

	.citations-title {
		display: inline-flex;
		align-items: center;
		gap: 5px;
		color: var(--gold-bright);
		font-weight: 600;
	}

	.citations ol {
		margin: var(--space-1) 0 0;
		padding-left: 1.2em;
		color: var(--text-secondary);
	}

	.citations a {
		color: var(--gold-bright);
	}

	.actions {
		display: flex;
		gap: var(--space-1);
		margin-top: var(--space-2);
	}

	.action {
		display: inline-flex;
		align-items: center;
		gap: 5px;
		padding: 4px 10px;
		border-radius: var(--radius-pill);
		border: 1px solid transparent;
		color: var(--text-muted);
		font-size: 12px;
	}

	.action:hover {
		color: var(--gold-bright);
		border-color: var(--border-hair);
		background: rgba(201, 154, 54, 0.08);
	}

	@media (prefers-reduced-motion: reduce) {
		.typing span { animation: none; opacity: 0.6; }
	}
</style>
