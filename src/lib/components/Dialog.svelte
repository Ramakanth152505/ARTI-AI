<script lang="ts">
	import Icon from './Icon.svelte';

	interface Props {
		open: boolean;
		title: string;
		/** Optional explanatory line under the heading. */
		description?: string;
		/** Label of the confirming action. */
		confirmLabel?: string;
		/** Renders the confirm button in a destructive tone. */
		destructive?: boolean;
		/** Disables confirm (e.g. an invalid or empty required field). */
		confirmDisabled?: boolean;
		onconfirm: () => void;
		oncancel: () => void;
		/** Optional extra content (fields, options) rendered in the body. */
		children?: import('svelte').Snippet;
	}

	let {
		open,
		title,
		description,
		confirmLabel = 'Confirm',
		destructive = false,
		confirmDisabled = false,
		onconfirm,
		oncancel,
		children
	}: Props = $props();

	let panel = $state<HTMLDivElement | null>(null);

	/**
	 * Keep focus inside the dialog while it is open and restore it on close, so
	 * keyboard users cannot tab into the page behind the modal.
	 */
	$effect(() => {
		if (!open || !panel) return;
		const previous = document.activeElement as HTMLElement | null;
		const focusable = () =>
			Array.from(
				panel!.querySelectorAll<HTMLElement>(
					'button, [href], input, textarea, select, [tabindex]:not([tabindex="-1"])'
				)
			).filter((el) => !el.hasAttribute('disabled'));

		queueMicrotask(() => focusable()[0]?.focus());

		function onKeydown(event: KeyboardEvent): void {
			if (event.key === 'Escape') {
				event.stopPropagation();
				oncancel();
				return;
			}
			if (event.key !== 'Tab') return;
			const items = focusable();
			if (items.length === 0) return;
			const first = items[0];
			const last = items[items.length - 1];
			if (event.shiftKey && document.activeElement === first) {
				event.preventDefault();
				last.focus();
			} else if (!event.shiftKey && document.activeElement === last) {
				event.preventDefault();
				first.focus();
			}
		}

		document.addEventListener('keydown', onKeydown, true);
		return () => {
			document.removeEventListener('keydown', onKeydown, true);
			previous?.focus?.();
		};
	});
</script>

{#if open}
	<div class="overlay">
		<button class="scrim" aria-label="Close dialog" onclick={oncancel}></button>
		<div
			class="panel"
			bind:this={panel}
			role="dialog"
			aria-modal="true"
			aria-labelledby="dialog-title"
			{...description ? { 'aria-describedby': 'dialog-desc' } : {}}
		>
			<div class="head">
				<h2 id="dialog-title">{title}</h2>
				<button class="close" aria-label="Close" onclick={oncancel}><Icon name="close" size={16} /></button>
			</div>
			{#if description}
				<p id="dialog-desc" class="desc">{description}</p>
			{/if}
			{#if children}
				<div class="body">{@render children()}</div>
			{/if}
			<div class="actions">
				<button class="btn ghost" onclick={oncancel}>Cancel</button>
				<button class="btn" class:destructive disabled={confirmDisabled} onclick={onconfirm}>
					{confirmLabel}
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.overlay {
		position: fixed;
		inset: 0;
		z-index: var(--z-modal, 80);
		display: grid;
		place-items: center;
		padding: var(--space-5);
	}

	.scrim {
		position: absolute;
		inset: 0;
		background: rgba(0, 0, 0, 0.68);
		border: none;
	}

	.panel {
		position: relative;
		width: min(440px, 100%);
		max-height: min(80vh, 640px);
		overflow-y: auto;
		padding: var(--space-5);
		background: var(--surface-panel-solid);
		border: 1px solid var(--border-gold);
		border-radius: var(--radius-md);
		box-shadow: var(--shadow-panel);
	}

	.head {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: var(--space-3);
	}

	h2 {
		margin: 0;
		font-family: var(--font-display);
		font-size: 19px;
		letter-spacing: 0.02em;
		color: var(--text-primary);
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

	.desc {
		margin: var(--space-3) 0 0;
		font-size: 13.5px;
		line-height: 1.55;
		color: var(--text-secondary);
	}

	.body {
		margin-top: var(--space-4);
	}

	.actions {
		display: flex;
		justify-content: flex-end;
		gap: var(--space-2);
		margin-top: var(--space-5);
	}

	.btn {
		padding: 9px 18px;
		border-radius: var(--radius-pill);
		border: 1px solid var(--border-gold);
		background: linear-gradient(160deg, var(--gold-bright), var(--gold-deep));
		color: var(--text-on-gold);
		font-size: 13.5px;
		font-weight: 600;
	}

	.btn.ghost {
		background: transparent;
		border-color: var(--border-hair);
		color: var(--text-secondary);
	}

	.btn.ghost:hover {
		color: var(--text-primary);
		border-color: var(--border-gold);
	}

	.btn.destructive {
		background: linear-gradient(160deg, #b4553f, #7d3324);
		border-color: rgba(212, 120, 96, 0.6);
		color: #fdf3f0;
	}

	.btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
</style>
