<script lang="ts">
	import Icon from './Icon.svelte';
	import type { IconName } from '#lib/data/icons';

	interface Attachment {
		id: string;
		label: string;
		icon: IconName;
		/** Describes the file kinds the control targets once wired up. */
		accept: string;
	}

	/**
	 * Attachment controls from the reference. The file inputs are real and
	 * functional; they hand off to a handler that is intentionally a no-op until
	 * backend/upload work exists, so nothing is ever claimed as "uploaded".
	 */
	const attachments: Attachment[] = [
		{ id: 'image', label: 'Attach Image', icon: 'image', accept: 'image/*' },
		{ id: 'video', label: 'Attach Video', icon: 'video', accept: 'video/*' },
		{ id: 'document', label: 'Attach Document', icon: 'document', accept: '.pdf,.doc,.docx,.txt,.md' }
	];

	interface Props {
		/** Called when the user submits a non-empty message. */
		onsubmit?: (message: string) => void;
		/** Called when files are chosen via an attachment control. */
		onattach?: (id: string, files: FileList) => void;
	}

	let { onsubmit, onattach }: Props = $props();

	let draft = $state('');
	let composer = $state('');
	let textarea = $state<HTMLTextAreaElement | null>(null);

	let canSend = $derived(draft.trim().length > 0);

	function submit(): void {
		const message = draft.trim();
		if (!message) return;
		onsubmit?.(message);
		composer = `Message not sent — chat backend is not connected yet. Your text: “${message}”`;
		draft = '';
		if (textarea) textarea.style.height = 'auto';
	}

	function onKeydown(event: KeyboardEvent): void {
		// Enter sends; Shift+Enter inserts a newline.
		if (event.key === 'Enter' && !event.shiftKey) {
			event.preventDefault();
			submit();
		}
	}

	function autosize(): void {
		if (!textarea) return;
		textarea.style.height = 'auto';
		textarea.style.height = `${Math.min(textarea.scrollHeight, 168)}px`;
	}
</script>

<form class="composer" onsubmit={(e) => { e.preventDefault(); submit(); }}>
	<label class="input-row">
		<span class="visually-hidden">Message ARTI</span>
		<textarea
			bind:this={textarea}
			bind:value={draft}
			class="input"
			rows="1"
			placeholder="Ask ARTI anything..."
			onkeydown={onKeydown}
			oninput={autosize}
		></textarea>
	</label>

	<div class="toolbar">
		<div class="attach-group">
			{#each attachments as tool (tool.id)}
				<label class="tool" title={tool.label}>
					<Icon name={tool.icon} size={17} />
					<span class="tool-label">{tool.label}</span>
					<input
						type="file"
						accept={tool.accept}
						class="visually-hidden"
						onchange={(e) => {
							const input = e.currentTarget;
							if (input.files && input.files.length) onattach?.(tool.id, input.files);
							input.value = '';
						}}
					/>
				</label>
			{/each}

			<button
				type="button"
				class="tool"
				title="Voice Input (not yet implemented)"
				aria-label="Voice Input (not yet implemented)"
			>
				<Icon name="mic" size={17} />
				<span class="tool-label">Voice Input</span>
			</button>

			<button
				type="button"
				class="tool"
				title="More (not yet implemented)"
				aria-label="More options (not yet implemented)"
			>
				<Icon name="more" size={17} />
				<span class="tool-label">More</span>
			</button>
		</div>

		<button type="submit" class="send" disabled={!canSend} aria-label="Send message">
			<Icon name="send" size={18} stroke={1.9} />
		</button>
	</div>
</form>

{#if composer}
	<p class="composer-status" role="status">{composer}</p>
{/if}

<style>
	.composer {
		width: 100%;
		background: var(--surface-input);
		border: 1px solid var(--border-gold);
		border-radius: var(--radius-lg);
		box-shadow: var(--shadow-panel), inset 0 0 30px rgba(0, 0, 0, 0.35);
		backdrop-filter: blur(8px);
		transition: border-color 160ms ease, box-shadow 160ms ease;
	}

	.composer:focus-within {
		border-color: var(--gold);
		box-shadow: var(--shadow-panel), var(--glow-gold);
	}

	.input-row {
		display: block;
		padding: var(--space-4) var(--space-5) var(--space-2);
	}

	.input {
		display: block;
		width: 100%;
		min-height: 30px;
		max-height: 168px;
		resize: none;
		border: none;
		background: transparent;
		color: var(--text-primary);
		font: inherit;
		font-size: 15px;
		line-height: 1.5;
		overflow-y: auto;
	}

	.input::placeholder {
		color: var(--text-muted);
	}

	.input:focus {
		outline: none;
	}

	.toolbar {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		padding: var(--space-2) var(--space-3) var(--space-3) var(--space-4);
	}

	.attach-group {
		display: flex;
		align-items: center;
		gap: var(--space-1);
		flex-wrap: wrap;
		min-width: 0;
	}

	.tool {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		padding: 6px 10px;
		border-radius: var(--radius-pill);
		border: 1px solid transparent;
		color: var(--text-muted);
		font-size: 12.5px;
		font-weight: 500;
		cursor: pointer;
		transition: color 160ms ease, background 160ms ease, border-color 160ms ease;
	}

	.tool:hover {
		color: var(--gold-bright);
		background: rgba(201, 162, 39, 0.08);
		border-color: var(--border-hair);
	}

	.tool-label {
		white-space: nowrap;
	}

	.send {
		display: grid;
		place-items: center;
		width: 42px;
		height: 42px;
		margin-left: auto;
		flex-shrink: 0;
		border-radius: 50%;
		background: linear-gradient(160deg, var(--gold-bright), var(--gold-deep));
		color: var(--text-on-gold);
		box-shadow: var(--glow-gold);
		transition: transform 140ms ease, opacity 160ms ease;
	}

	.send:hover:not(:disabled) {
		transform: translateY(-1px);
	}

	.send:disabled {
		opacity: 0.45;
		cursor: not-allowed;
		box-shadow: none;
	}

	.composer-status {
		margin: var(--space-3) auto 0;
		max-width: var(--composer-max-width);
		font-size: 12.5px;
		color: var(--text-secondary);
		text-align: center;
	}

	@media (max-width: 720px) {
		.tool-label {
			display: none;
		}

		.tool {
			padding: 8px;
		}
	}
</style>
