<script lang="ts">
	/**
	 * Region B composer — the advanced chat input.
	 *
	 * Distinct from the Home composer (which stays untouched as part of the locked
	 * Home UI): this one handles real attachments, a tools menu, voice input and
	 * generation state.
	 *
	 * Honesty guarantees:
	 *  - The send button is disabled unless there is text or a usable attachment.
	 *  - When generating, Send is replaced by Stop; Stop is client-side only and is
	 *    described as such.
	 *  - Attachments that the (absent) upload service did not confirm are shown as
	 *    failed, never as uploaded.
	 *  - Voice input reports unsupported/denied/error states instead of showing a
	 *    recording animation that records nothing.
	 */
	import Icon from './Icon.svelte';
	import Menu from './Menu.svelte';
	import type { MenuItem } from './menu.types';
	import { ATTACHMENT_ACCEPT, CHAT_STATUS, MAX_ATTACHMENT_BYTES, isModelConfigured } from '#lib/chats/config';
	import { describeAcceptedTypes, submitAttachments, toAttachments } from '#lib/chats/attachments';
	import { CAPABILITIES, availableCapabilityIds } from '#lib/chats/capabilities';
	import { formatBytes } from '#lib/chats/search';
	import { describeVoiceError, isVoiceSupported, startVoice, type VoiceSession } from '#lib/chats/voice';
	import type { Attachment } from '#lib/chats/types';

	interface Props {
		/** Sends the composed message with its attachments. */
		onsubmit: (text: string, attachments: Attachment[]) => Promise<void> | void;
		generating: boolean;
		onstop: () => void;
		/** Lets the parent (context panel) see attachment failures. */
		onnotice?: (notice: string) => void;
	}

	let { onsubmit, generating, onstop, onnotice }: Props = $props();

	let draft = $state('');
	let attachments = $state<Attachment[]>([]);
	let textarea = $state<HTMLTextAreaElement | null>(null);
	let fileInput = $state<HTMLInputElement | null>(null);
	let dragging = $state(false);
	let submitting = $state(false);
	let notice = $state('');
	let selectedTools = $state<string[]>([]);

	// Voice state is explicit so the UI can never imply it is recording silently.
	let voiceSupported = $state(false);
	let recording = $state(false);
	let voiceError = $state('');
	let voiceSession: VoiceSession | null = null;

	// Support is a client capability, so it can only be read after mount.
	$effect(() => {
		voiceSupported = isVoiceSupported();
		if (!voiceSupported && !voiceError) voiceError = CHAT_STATUS.voiceUnavailable;
		return () => voiceSession?.stop();
	});

	let acceptedCount = $derived(attachments.filter((a) => a.status !== 'rejected').length);
	let hasRejected = $derived(attachments.some((a) => a.status === 'rejected'));
	let canSend = $derived((draft.trim().length > 0 || acceptedCount > 0) && !submitting);

	let toolItems = $derived.by((): MenuItem[] =>
		CAPABILITIES.map((capability) => ({
			id: capability.id,
			label: selectedTools.includes(capability.id) ? `${capability.label} ✓` : capability.label,
			icon: capability.icon,
			disabled: !capability.available,
			note: capability.available ? undefined : 'Soon'
		}))
	);

	function report(message: string): void {
		notice = message;
		onnotice?.(message);
	}

	function autosize(): void {
		if (!textarea) return;
		textarea.style.height = 'auto';
		textarea.style.height = `${Math.min(textarea.scrollHeight, 180)}px`;
	}

	function addFiles(files: FileList | File[]): void {
		const list = Array.from(files);
		if (list.length === 0) return;
		const next = toAttachments(list);
		attachments = [...attachments, ...next];
		const rejected = next.filter((a) => a.status === 'rejected');
		if (rejected.length) {
			report(rejected.map((a) => a.detail).filter(Boolean).join(' '));
		} else {
			report(`${list.length} file${list.length === 1 ? '' : 's'} selected — ${CHAT_STATUS.uploadUnavailable}`);
		}
	}

	function removeAttachment(id: string): void {
		attachments = attachments.filter((a) => a.id !== id);
	}

	function onFileInput(event: Event): void {
		const input = event.currentTarget as HTMLInputElement;
		if (input.files) addFiles(input.files);
		input.value = '';
	}

	function onDrop(event: DragEvent): void {
		event.preventDefault();
		dragging = false;
		if (event.dataTransfer?.files) addFiles(event.dataTransfer.files);
	}

	async function submit(): Promise<void> {
		if (!canSend || generating) return;
		const text = draft.trim();
		const usable = attachments.filter((a) => a.status !== 'rejected');

		submitting = true;
		try {
			// Attempt the upload boundary. Nothing is stored yet, so failures are
			// surfaced and the message text is deliberately preserved below.
			const result = usable.length
				? await submitAttachments(usable, CHAT_STATUS.uploadUnavailable)
				: { attachments: [], uploaded: 0 };

			if (result.notice) report(result.notice);

			await onsubmit(text, result.attachments as Attachment[]);

			// Only clear what is safe to clear: with no upload service the failed
			// attachments stay visible so the user can see exactly what happened.
			draft = '';
			attachments = [];
			notice = result.notice ?? '';
			if (textarea) textarea.style.height = 'auto';
		} catch {
			report('The message could not be sent. Your text has been kept.');
		} finally {
			submitting = false;
		}
	}

	function onKeydown(event: KeyboardEvent): void {
		if (event.key !== 'Enter' || event.shiftKey) return;
		// Preserve composition/IME input: never send mid-composition.
		if (event.isComposing) return;
		event.preventDefault();
		void submit();
	}

	function toggleVoice(): void {
		if (recording) {
			voiceSession?.stop();
			recording = false;
			return;
		}
		voiceError = '';
		const session = startVoice((event) => {
			if (event.type === 'final') {
				draft = draft ? `${draft} ${event.transcript}` : event.transcript;
				autosize();
			} else if (event.type === 'interim') {
				notice = `Hearing: ${event.transcript}`;
			} else if (event.type === 'error') {
				voiceError = event.message;
				recording = false;
			} else if (event.type === 'end') {
				recording = false;
			}
		});
		if (session) {
			voiceSession = session;
			recording = true;
			notice = 'Listening… speak your message.';
		} else if (!voiceError) {
			voiceError = CHAT_STATUS.voiceUnavailable;
		}
	}

	function toggleTool(id: string): void {
		const capability = CAPABILITIES.find((c) => c.id === id);
		if (!capability?.available) return;
		selectedTools = selectedTools.includes(id)
			? selectedTools.filter((t) => t !== id)
			: [...selectedTools, id];
	}

	// Expose what the ready capability count actually is, so the UI cannot imply
	// more tools are live than the registry reports.
	const liveToolCount = availableCapabilityIds().length;
</script>

<div class="composer-wrap">
	{#if notice}
		<p class="notice" role="status">{notice}</p>
	{/if}
	{#if voiceError}
		<p class="notice error" role="status">
			<Icon name="alert" size={13} />
			<span>{voiceError}</span>
		</p>
	{/if}

	{#if attachments.length}
		<ul class="previews" aria-label="Attachments to send">
			{#each attachments as file (file.id)}
				<li class="preview" class:rejected={file.status === 'rejected'}>
					<Icon name={file.kind === 'image' ? 'image' : file.kind === 'code' ? 'coding' : 'document'} size={14} />
					<span class="preview-name">{file.name}</span>
					<span class="preview-size">{formatBytes(file.size)}</span>
					{#if file.status === 'rejected'}<span class="preview-state">Not supported</span>{/if}
					{#if file.status === 'failed'}<span class="preview-state">Not uploaded</span>{/if}
					<button class="preview-remove" aria-label="Remove {file.name}" onclick={() => removeAttachment(file.id)}>
						<Icon name="close" size={13} />
					</button>
				</li>
			{/each}
		</ul>
	{/if}

	<!-- Drop target with a keyboard-accessible picker alternative below. -->
	<form
		class="composer"
		class:dragging
		onsubmit={(e) => {
			e.preventDefault();
			void submit();
		}}
		ondragover={(e) => {
			e.preventDefault();
			dragging = true;
		}}
		ondragleave={() => (dragging = false)}
		ondrop={onDrop}
	>
		<label class="input-row">
			<span class="visually-hidden">Message ARTI</span>
			<textarea
				bind:this={textarea}
				bind:value={draft}
				class="input"
				rows="2"
				placeholder="Ask ARTI anything..."
				onkeydown={onKeydown}
				oninput={autosize}
			></textarea>
		</label>

		<div class="toolbar">
			<label class="tool" title="Attach files">
				<Icon name="paperclip" size={17} />
				<span class="tool-label">Attach</span>
				<input
					bind:this={fileInput}
					type="file"
					multiple
					accept={ATTACHMENT_ACCEPT}
					class="visually-hidden"
					onchange={onFileInput}
				/>
			</label>

			<button
				type="button"
				class="tool"
				class:on={recording}
				aria-pressed={recording}
				title={voiceSupported ? 'Voice input' : CHAT_STATUS.voiceUnavailable}
				onclick={toggleVoice}
			>
				<Icon name="mic" size={17} />
				<span class="tool-label">{recording ? 'Stop' : 'Voice'}</span>
			</button>

			<Menu
				label="Tools"
				triggerLabel="Tools"
				triggerIcon="tools"
				align="left"
				placement="up"
				items={toolItems}
				onselect={toggleTool}
			/>

			{#if selectedTools.length}
				<span class="tool-count" title="Enabled capabilities">{selectedTools.length} enabled</span>
			{:else if liveToolCount === 0}
				<span class="tool-count muted" title={CHAT_STATUS.modelUnavailable}>No tools available yet</span>
			{/if}

			{#if generating}
				<button type="button" class="stop" onclick={onstop} aria-label="Stop generating">
					<Icon name="stop" size={16} />
					<span class="stop-label">Stop</span>
				</button>
			{:else}
				<button
					type="submit"
					class="send"
					disabled={!canSend}
					aria-label="Send message"
					title={canSend ? 'Send' : 'Enter a message to send'}
				>
					<Icon name="send" size={18} stroke={1.9} />
				</button>
			{/if}
		</div>

		<p class="hint">
			<span>Enter to send · Shift+Enter for a new line</span>
			<span class="hint-types">Supports {describeAcceptedTypes()} · up to {formatBytes(MAX_ATTACHMENT_BYTES)}</span>
		</p>
	</form>
</div>

<style>
	.composer-wrap {
		width: 100%;
	}

	.notice {
		display: flex;
		align-items: flex-start;
		gap: 6px;
		margin: 0 0 var(--space-2);
		font-size: 12px;
		color: var(--text-secondary);
	}

	.notice.error {
		color: #e9a48f;
	}

	.previews {
		list-style: none;
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2);
		margin: 0 0 var(--space-2);
		padding: 0;
	}

	.preview {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 5px 6px 5px 10px;
		border-radius: var(--radius-pill);
		border: 1px solid var(--border-hair);
		background: rgba(255, 255, 255, 0.04);
		font-size: 12px;
		color: var(--text-secondary);
		max-width: 100%;
	}

	.preview.rejected {
		border-color: rgba(212, 120, 96, 0.45);
		color: #e0a08c;
	}

	.preview-name {
		max-width: 200px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.preview-size,
	.preview-state {
		color: var(--text-muted);
		font-size: 11px;
	}

	.preview-remove {
		display: grid;
		place-items: center;
		width: 20px;
		height: 20px;
		border-radius: 50%;
		color: var(--text-muted);
	}

	.preview-remove:hover {
		color: var(--gold-bright);
		background: rgba(201, 154, 54, 0.14);
	}

	.composer {
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

	.composer.dragging {
		border-color: var(--gold-bright);
		box-shadow: var(--shadow-panel), var(--glow-gold);
	}

	.input-row {
		display: block;
		padding: var(--space-4) var(--space-5) var(--space-2);
	}

	.input {
		display: block;
		width: 100%;
		min-height: 62px;
		max-height: 180px;
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
		gap: var(--space-1);
		padding: var(--space-1) var(--space-3) var(--space-2) var(--space-4);
		flex-wrap: wrap;
	}

	.tool {
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 6px 10px;
		border-radius: var(--radius-pill);
		border: 1px solid transparent;
		color: var(--text-muted);
		font-size: 12.5px;
		font-weight: 500;
		cursor: pointer;
	}

	.tool:hover {
		color: var(--gold-bright);
		background: rgba(201, 154, 54, 0.08);
		border-color: var(--border-hair);
	}

	.tool.on {
		color: var(--gold-bright);
		border-color: var(--border-gold);
		background: rgba(201, 154, 54, 0.14);
	}

	.tool-label {
		white-space: nowrap;
	}

	.tool-count {
		margin-left: var(--space-2);
		padding: 3px 9px;
		border-radius: var(--radius-pill);
		border: 1px solid var(--border-hair);
		font-size: 10.5px;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--gold-bright);
	}

	.tool-count.muted {
		color: var(--text-muted);
		text-transform: none;
		letter-spacing: 0;
		font-size: 11.5px;
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

	.stop {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		margin-left: auto;
		padding: 9px 16px;
		border-radius: var(--radius-pill);
		border: 1px solid rgba(212, 120, 96, 0.55);
		background: rgba(180, 85, 63, 0.16);
		color: #f0b5a6;
		font-size: 13px;
		font-weight: 600;
	}

	.stop:hover {
		background: rgba(180, 85, 63, 0.26);
	}

	.hint {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-3);
		margin: 0;
		padding: 0 var(--space-5) var(--space-3);
		font-size: 11px;
		color: var(--text-muted);
	}

	.hint-types {
		text-align: right;
	}

	@media (max-width: 720px) {
		.tool-label {
			display: none;
		}

		.tool {
			padding: 8px;
		}

		.hint-types {
			display: none;
		}
	}
</style>
