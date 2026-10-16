<script lang="ts">
	/**
	 * Accessible dropdown menu, reusable across the history sidebar, the chat
	 * header and the composer.
	 *
	 * Rendered inside a positioned wrapper so it never gets clipped by the
	 * scrolling sidebar. Handles pointer-outside dismissal, focus-out dismissal,
	 * Escape, and Up/Down/Home/End navigation between items. The trigger receives
	 * the correct `aria-haspopup`/`aria-expanded` state.
	 */
	import Icon from './Icon.svelte';
	import type { IconName } from '#lib/data/icons';
	import type { MenuItem } from './menu.types';

	interface Props {
		label: string;
		items: MenuItem[];
		onselect: (id: string) => void;
		/** Where the panel opens relative to the trigger. */
		align?: 'left' | 'right';
		/** Whether the panel opens below or above the trigger. */
		placement?: 'down' | 'up';
		/** Icon-only trigger when no visible text is supplied. */
		triggerLabel?: string;
		triggerIcon?: IconName;
	}

	let {
		label,
		items,
		onselect,
		align = 'right',
		placement = 'down',
		triggerLabel,
		triggerIcon = 'more'
	}: Props = $props();

	let open = $state(false);
	let root = $state<HTMLElement | null>(null);
	let buttons = $state<HTMLButtonElement[]>([]);

	function close(restore = false): void {
		open = false;
		if (restore) root?.querySelector<HTMLButtonElement>('.trigger')?.focus();
	}

	function onMenuKeydown(event: KeyboardEvent): void {
		const list = buttons.filter(Boolean);
		if (list.length === 0) return;
		const current = list.findIndex((el) => el === document.activeElement);
		switch (event.key) {
			case 'ArrowDown':
				event.preventDefault();
				list[(current + 1 + list.length) % list.length]?.focus();
				break;
			case 'ArrowUp':
				event.preventDefault();
				list[(current - 1 + list.length) % list.length]?.focus();
				break;
			case 'Home':
				event.preventDefault();
				list[0]?.focus();
				break;
			case 'End':
				event.preventDefault();
				list[list.length - 1]?.focus();
				break;
			case 'Escape':
				event.preventDefault();
				close(true);
				break;
		}
	}

	function onDocumentPointerDown(event: PointerEvent): void {
		if (!open) return;
		if (root && !root.contains(event.target as Node)) open = false;
	}

	function onDocumentFocusIn(event: FocusEvent): void {
		if (!open) return;
		if (root && !root.contains(event.target as Node)) open = false;
	}

	function choose(id: string): void {
		open = false;
		onselect(id);
	}
</script>

<svelte:document onpointerdown={onDocumentPointerDown} onfocusin={onDocumentFocusIn} />

<div class="menu-root" bind:this={root}>
	<button
		type="button"
		class="trigger"
		class:icon-only={!triggerLabel}
		aria-haspopup="menu"
		aria-expanded={open}
		aria-label={triggerLabel ?? label}
		title={triggerLabel ?? `${label} options`}
		onclick={() => (open = !open)}
		onkeydown={(e) => {
			if (e.key === 'ArrowDown') {
				e.preventDefault();
				open = true;
				queueMicrotask(() => buttons.find(Boolean)?.focus());
			}
		}}
	>
		<Icon name={triggerIcon} size={16} />
		{#if triggerLabel}<span>{triggerLabel}</span>{/if}
	</button>

	{#if open}
		<div
			class="panel"
			class:align-left={align === 'left'}
			class:up={placement === 'up'}
			role="menu"
			aria-label={label}
			tabindex="-1"
			onkeydown={onMenuKeydown}
		>
			{#each items as item, i (item.id)}
				<button
					type="button"
					role="menuitem"
					class="item"
					class:danger={item.danger}
					disabled={item.disabled}
					bind:this={buttons[i]}
					onclick={() => choose(item.id)}
				>
					{#if item.icon}<Icon name={item.icon} size={15} />{/if}
					<span class="item-label">{item.label}</span>
					{#if item.note}<span class="item-note">{item.note}</span>{/if}
				</button>
			{/each}
		</div>
	{/if}
</div>

<style>
	.menu-root {
		position: relative;
		display: inline-flex;
	}

	.trigger {
		display: inline-flex;
		align-items: center;
		gap: var(--space-2);
		padding: 6px 10px;
		border-radius: var(--radius-sm);
		border: 1px solid transparent;
		color: var(--text-secondary);
		font-size: 13px;
		font-weight: 500;
	}

	.trigger.icon-only {
		padding: 6px;
	}

	.trigger:hover,
	.trigger[aria-expanded='true'] {
		color: var(--gold-bright);
		background: rgba(201, 154, 54, 0.1);
		border-color: var(--border-hair);
	}

	.panel {
		position: absolute;
		top: calc(100% + 6px);
		right: 0;
		min-width: 208px;
		max-width: min(280px, 80vw);
		padding: var(--space-1);
		background: var(--surface-panel-solid);
		border: 1px solid var(--border-gold);
		border-radius: var(--radius-md);
		box-shadow: var(--shadow-panel);
		z-index: var(--z-dropdown);
	}

	.panel.align-left {
		right: auto;
		left: 0;
	}

	.panel.up {
		top: auto;
		bottom: calc(100% + 6px);
	}

	.item {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		width: 100%;
		padding: var(--space-2) var(--space-3);
		border-radius: var(--radius-sm);
		color: var(--text-secondary);
		font-size: 13px;
		text-align: left;
	}

	.item:hover:not(:disabled),
	.item:focus-visible {
		background: rgba(201, 154, 54, 0.1);
		color: var(--text-primary);
	}

	.item.danger:hover,
	.item.danger:focus-visible {
		background: rgba(180, 85, 63, 0.16);
		color: #f0b5a6;
	}

	.item:disabled {
		opacity: 0.45;
		cursor: not-allowed;
	}

	.item-label {
		flex: 1;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.item-note {
		font-size: 10px;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--text-muted);
	}
</style>
