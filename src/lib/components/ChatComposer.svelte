<script lang="ts">
	import Icon from './Icon.svelte';
	import type { IconName } from '#lib/data/icons';

	type AttachKind = 'image' | 'video' | 'document';

	interface AttachmentTool {
		kind: AttachKind;
		label: string;
		icon: IconName;
		accept: string;
		/** Rejects files the control does not actually support. */
		validate: (file: File) => boolean;
	}

	const DOC_TYPES = [
		'application/pdf',
		'application/msword',
		'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
		'text/plain',
		'text/markdown'
	];
	const DOC_EXTENSIONS = ['.pdf', '.doc', '.docx', '.txt', '.md'];

	/**
	 * Attachment controls from the reference. The file inputs are real; selected
	 * files are validated and listed for review before sending. Nothing is
	 * uploaded anywhere — the composer never claims a file was sent.
	 */
	const attachmentTools: AttachmentTool[] = [
		{
			kind: 'image',
			label: 'Attach Image',
			icon: 'image',
			accept: 'image/*',
			validate: (file) => file.type.startsWith('image/')
		},
		{
			kind: 'video',
			label: 'Attach Video',
			icon: 'video',
			accept: 'video/*',
			validate: (file) => file.type.startsWith('video/')
		},
		{
			kind: 'document',
			label: 'Attach Document',
			icon: 'document',
			accept: '.pdf,.doc,.docx,.txt,.md',
			validate: (file) =>
				DOC_TYPES.includes(file.type) ||
				DOC_EXTENSIONS.some((ext) => file.name.toLowerCase().endsWith(ext))
		}
	];

	interface Picked {
		id: string;
		name: string;
	}

	interface Props {
		/** Called when the user submits a non-empty message. May be async. */
		onsubmit?: (message: string, files: File[]) => void | Promise<void>;
	}

	let { onsubmit }: Props = $props();

	let draft = $state('');
	let status = $state('');
	let sending = $state(false);
	let textarea = $state<HTMLTextAreaElement | null>(null);
	let picked = $state<Picked[]>([]);
	let filesById = new Map<string, File>();

	let canSend = $derived(draft.trim().length > 0 || picked.length > 0);

	function removePicked(id: string): void {
		picked = picked.filter((p) => p.id !== id);
		filesById.delete(id);
	}

	function addFiles(kind: AttachKind, fileList: FileList): void {
		const tool = attachmentTools.find((t) => t.kind === kind);
		if (!tool) return;
		const accepted: Picked[] = [];
		const rejected: string[] = [];

		for (const file of Array.from(fileList)) {
			if (!tool.validate(file)) {
				rejected.push(file.name);
				continue;
			}
			const id = `${kind}-${file.name}-${file.size}-${file.lastModified}-${crypto.randomUUID()}`;
			filesById.set(id, file);
			accepted.push({ id, name: file.name });
		}

		if (accepted.length) picked = [...picked, ...accepted];

		const parts: string[] = [];
		if (accepted.length) parts.push(`Added ${accepted.length} ${tool.label.toLowerCase()} file(s), not uploaded yet.`);
		if (rejected.length) parts.push(`Unsupported file(s) ignored: ${rejected.join(', ')}.`);
		status = parts.join(' ');
	}

	async function submit(): Promise<void> {
		if (sending) return;
		const message = draft.trim();
		const files = picked.map((p) => filesById.get(p.id)).filter((f): f is File => Boolean(f));
		if (!message && files.length === 0) return;

		sending = true;
		try {
			await onsubmit?.(message, files);
			status = `Message not sent — chat backend is not connected yet. Your text: “${message}”`;
			draft = '';
			if (textarea) textarea.style.height = 'auto';
		} finally {
			sending = false;
		}
	}

	function onKeydown(event: KeyboardEvent): void {
		// Enter sends; Shift+Enter inserts a newline.
		if (event.key === 'Enter' && !event.shiftKey) {
			event.preventDefault();
			void submit();
		}
	}

	function autosize(): void {
		if (!textarea) return;
		textarea.style.height = 'auto';
		textarea.style.height = `${Math.min(textarea.scrollHeight, 168)}px`;
	}

	/* ------------------------------- Voice input ------------------------------ */

	interface SpeechRecognitionLike {
		continuous: boolean;
		interimResults: boolean;
		lang: string;
		start(): void;
		stop(): void;
		onresult: ((event: SpeechRecognitionEventLike) => void) | null;
		onerror: ((event: { error: string }) => void) | null;
		onend: (() => void) | null;
	}
	interface SpeechRecognitionEventLike {
		resultIndex: number;
		results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }>;
	}
	type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

	function getSpeechCtor(): SpeechRecognitionCtor | null {
		if (typeof window === 'undefined') return null;
		const w = window as unknown as {
			SpeechRecognition?: SpeechRecognitionCtor;
			webkitSpeechRecognition?: SpeechRecognitionCtor;
		};
		return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
	}

	// Feature detection only — no microphone permission is requested on load.
	let speechSupported = $state(false);
	let listening = $state(false);
	let recognition: SpeechRecognitionLike | null = null;

	$effect(() => {
		speechSupported = getSpeechCtor() !== null;
		return () => recognition?.stop();
	});

	function toggleVoice(): void {
		const Ctor = getSpeechCtor();
		if (!Ctor) {
			status = 'Voice input is not supported in this browser.';
			return;
		}
		if (listening) {
			recognition?.stop();
			return;
		}

		recognition = new Ctor();
		recognition.continuous = false;
		recognition.interimResults = false;
		recognition.lang = navigator.language || 'en-US';

		recognition.onresult = (event) => {
			let transcript = '';
			for (let i = event.resultIndex; i < event.results.length; i += 1) {
				transcript += event.results[i][0].transcript;
			}
			draft = draft ? `${draft} ${transcript}`.trim() : transcript.trim();
			autosize();
		};
		recognition.onerror = (event) => {
			listening = false;
			status =
				event.error === 'not-allowed'
					? 'Microphone permission was denied.'
					: `Voice input stopped (${event.error}).`;
		};
		recognition.onend = () => {
			listening = false;
		};

		try {
			recognition.start();
			listening = true;
			status = 'Listening…';
		} catch {
			listening = false;
			status = 'Voice input could not start.';
		}
	}

	/* --------------------------------- More menu ------------------------------ */

	let moreOpen = $state(false);
	let moreRoot = $state<HTMLElement | null>(null);
	let moreTrigger = $state<HTMLButtonElement | null>(null);
	let moreFirst = $state<HTMLButtonElement | null>(null);

	function toggleMore(): void {
		moreOpen = !moreOpen;
		if (moreOpen) queueMicrotask(() => moreFirst?.focus());
	}

	function closeMore(restoreFocus = true): void {
		moreOpen = false;
		if (restoreFocus) moreTrigger?.focus();
	}

	function clearInput(): void {
		draft = '';
		if (textarea) textarea.style.height = 'auto';
		textarea?.focus();
		closeMore();
	}

	async function pasteFromClipboard(): Promise<void> {
		try {
			const text = await navigator.clipboard.readText();
			if (text) {
				draft = draft ? `${draft} ${text}` : text;
				autosize();
				status = 'Pasted from clipboard.';
			}
		} catch {
			status = 'Clipboard access was blocked by the browser.';
		}
		closeMore();
	}

	function onMoreKeydown(event: KeyboardEvent): void {
		if (event.key === 'Escape') {
			event.preventDefault();
			closeMore();
		}
	}

	function onDocumentPointerDown(event: PointerEvent): void {
		if (!moreOpen) return;
		const target = event.target as Node;
		if (moreRoot && !moreRoot.contains(target)) moreOpen = false;
	}
</script>

<svelte:document onpointerdown={onDocumentPointerDown} />

<form
	class="composer"
	onsubmit={(e) => {
		e.preventDefault();
		void submit();
	}}
>
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

	{#if picked.length}
		<ul class="chips" aria-label="Selected attachments">
			{#each picked as file (file.id)}
				<li class="chip">
					<Icon name="paperclip" size={14} />
					<span class="chip-name" title={file.name}>{file.name}</span>
					<button
						type="button"
						class="chip-remove"
						aria-label={`Remove ${file.name}`}
						onclick={() => removePicked(file.id)}
					>
						<Icon name="close" size={13} />
					</button>
				</li>
			{/each}
		</ul>
	{/if}

	<div class="toolbar">
		<div class="attach-group">
			{#each attachmentTools as tool (tool.kind)}
				<label class="tool" title={tool.label}>
					<Icon name={tool.icon} size={17} />
					<span class="tool-label">{tool.label}</span>
					<input
						type="file"
						accept={tool.accept}
						multiple
						class="visually-hidden"
						onchange={(e) => {
							const input = e.currentTarget;
							if (input.files && input.files.length) addFiles(tool.kind, input.files);
							input.value = '';
						}}
					/>
				</label>
			{/each}

			<button
				type="button"
				class="tool"
				class:active={listening}
				disabled={!speechSupported}
				aria-pressed={listening}
				title={speechSupported
					? listening
						? 'Stop voice input'
						: 'Start voice input'
					: 'Voice input is not supported in this browser'}
				aria-label={speechSupported ? 'Voice Input' : 'Voice Input (unavailable in this browser)'}
				onclick={toggleVoice}
			>
				<Icon name="mic" size={17} />
				<span class="tool-label">Voice Input</span>
			</button>

			<div class="more" bind:this={moreRoot}>
				<button
					type="button"
					class="tool"
					bind:this={moreTrigger}
					aria-haspopup="menu"
					aria-expanded={moreOpen}
					aria-controls="composer-more-menu"
					aria-label="More options"
					onclick={toggleMore}
				>
					<Icon name="more" size={17} />
					<span class="tool-label">More</span>
				</button>

				{#if moreOpen}
					<div
						id="composer-more-menu"
						class="more-menu"
						role="menu"
						aria-label="More options"
						tabindex="-1"
						onkeydown={onMoreKeydown}
					>
						<button
							type="button"
							role="menuitem"
							class="more-item"
							bind:this={moreFirst}
							disabled={!draft}
							onclick={clearInput}
						>
							<Icon name="close" size={15} />
							<span>Clear input</span>
						</button>
						<button type="button" role="menuitem" class="more-item" onclick={pasteFromClipboard}>
							<Icon name="paperclip" size={15} />
							<span>Paste from clipboard</span>
						</button>
					</div>
				{/if}
			</div>
		</div>

		<button
			type="submit"
			class="send"
			disabled={!canSend || sending}
			aria-busy={sending}
			aria-label="Send message"
		>
			{#if sending}
				<span class="spinner" aria-hidden="true"></span>
			{:else}
				<Icon name="send" size={18} stroke={1.9} />
			{/if}
		</button>
	</div>
</form>

{#if status}
	<p class="composer-status" role="status">{status}</p>
{/if}

<style>
	.composer {
		width: 100%;
		background: var(--surface-input);
		border: 1px solid var(--border-gold);
		border-radius: var(--radius-lg);
		box-shadow: var(--shadow-panel), inset 0 0 30px rgba(0, 0, 0, 0.35);
		backdrop-filter: blur(8px);
		transition:
			border-color 160ms ease,
			box-shadow 160ms ease;
	}

	.composer:focus-within {
		border-color: var(--gold);
		box-shadow: var(--shadow-panel), var(--glow-gold);
	}

	.input-row {
		display: block;
		padding: var(--space-5) var(--space-5) var(--space-3);
	}

	.input {
		display: block;
		width: 100%;
		min-height: 62px;
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

	/* --- Selected attachment chips --- */
	.chips {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2);
		list-style: none;
		margin: 0;
		padding: 0 var(--space-5) var(--space-2);
	}

	.chip {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		max-width: 260px;
		padding: 4px 6px 4px 10px;
		border: 1px solid var(--border-hair);
		border-radius: var(--radius-pill);
		background: rgba(201, 154, 54, 0.08);
		color: var(--text-secondary);
		font-size: 12px;
	}

	.chip-name {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.chip-remove {
		display: grid;
		place-items: center;
		width: 20px;
		height: 20px;
		border-radius: 50%;
		color: var(--text-muted);
	}

	.chip-remove:hover {
		color: var(--gold-bright);
		background: rgba(201, 154, 54, 0.16);
	}

	/* --- Toolbar --- */
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
		transition:
			color 160ms ease,
			background 160ms ease,
			border-color 160ms ease;
	}

	.tool:hover:not(:disabled) {
		color: var(--gold-bright);
		background: rgba(201, 154, 54, 0.08);
		border-color: var(--border-hair);
	}

	.tool:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.tool.active {
		color: var(--gold-bright);
		border-color: var(--border-gold);
		background: rgba(201, 154, 54, 0.12);
	}

	.tool-label {
		white-space: nowrap;
	}

	/* --- More menu --- */
	.more {
		position: relative;
	}

	.more-menu {
		position: absolute;
		bottom: calc(100% + 8px);
		left: 0;
		min-width: 208px;
		padding: var(--space-2);
		background: var(--surface-panel-solid);
		border: 1px solid var(--border-gold);
		border-radius: var(--radius-md);
		box-shadow: var(--shadow-panel);
		z-index: var(--z-popover);
	}

	.more-item {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		width: 100%;
		padding: var(--space-2) var(--space-3);
		border-radius: var(--radius-sm);
		color: var(--text-secondary);
		font-size: 13.5px;
		text-align: left;
	}

	.more-item:hover:not(:disabled),
	.more-item:focus-visible {
		background: rgba(201, 154, 54, 0.1);
		color: var(--text-primary);
	}

	.more-item:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	/* --- Send --- */
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
		transition:
			transform 140ms ease,
			opacity 160ms ease;
	}

	.send:hover:not(:disabled) {
		transform: translateY(-1px);
	}

	.send:disabled {
		opacity: 0.45;
		cursor: not-allowed;
		box-shadow: none;
	}

	.spinner {
		width: 16px;
		height: 16px;
		border-radius: 50%;
		border: 2px solid rgba(26, 20, 7, 0.35);
		border-top-color: var(--text-on-gold);
		animation: spin 700ms linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
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

	@media (prefers-reduced-motion: reduce) {
		.composer,
		.tool,
		.send {
			transition: none;
		}

		.spinner {
			animation-duration: 1400ms;
		}
	}
</style>
