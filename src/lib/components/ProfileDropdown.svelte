<script lang="ts">
	import Icon from './Icon.svelte';
	import { PROFILES, type Profile } from '#lib/data/profiles';

	let open = $state(false);
	let selected = $state<Profile>(PROFILES[0]);

	let root = $state<HTMLElement | null>(null);
	let trigger = $state<HTMLButtonElement | null>(null);
	let items = $state<HTMLButtonElement[]>([]);

	// Selected-profile text is announced politely when it changes.
	let announce = $state('');

	function openMenu(focusIndex = -1): void {
		open = true;
		if (focusIndex >= 0) {
			queueMicrotask(() => items[focusIndex]?.focus());
		}
	}

	function closeMenu(restoreFocus = true): void {
		open = false;
		if (restoreFocus) trigger?.focus();
	}

	function choose(profile: Profile): void {
		selected = profile;
		announce = `Selected profile: ${profile.name}`;
		closeMenu();
	}

	/** Arrow/Home/End navigation within the open menu. */
	function onMenuKeydown(event: KeyboardEvent): void {
		const count = items.length;
		if (count === 0) return;
		const current = items.findIndex((el) => el === document.activeElement);

		switch (event.key) {
			case 'ArrowDown':
				event.preventDefault();
				items[(current + 1 + count) % count]?.focus();
				break;
			case 'ArrowUp':
				event.preventDefault();
				items[(current - 1 + count) % count]?.focus();
				break;
			case 'Home':
				event.preventDefault();
				items[0]?.focus();
				break;
			case 'End':
				event.preventDefault();
				items[count - 1]?.focus();
				break;
			case 'Escape':
				event.preventDefault();
				closeMenu();
				break;
		}
	}

	function onDocumentPointerDown(event: PointerEvent): void {
		if (!open) return;
		const target = event.target as Node;
		if (root && !root.contains(target)) open = false;
	}

	function onDocumentFocusIn(event: FocusEvent): void {
		if (!open) return;
		const target = event.target as Node;
		if (root && !root.contains(target)) open = false;
	}
</script>

<svelte:document onpointerdown={onDocumentPointerDown} onfocusin={onDocumentFocusIn} />

<div class="profile" bind:this={root}>
	<button
		type="button"
		class="trigger"
		bind:this={trigger}
		aria-haspopup="menu"
		aria-expanded={open}
		aria-controls="profile-menu"
		onclick={() => (open ? closeMenu() : openMenu())}
		onkeydown={(e) => {
			if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
				e.preventDefault();
				openMenu(0);
			}
		}}
	>
		<span class="trigger-initial" aria-hidden="true">{selected.name.charAt(0)}</span>
		<span class="trigger-name">{selected.name}</span>
		<Icon name="chevron-down" size={16} class="trigger-chevron" />
	</button>

	{#if open}
		<div
			id="profile-menu"
			class="menu"
			role="menu"
			aria-label="Switch profile"
			tabindex="-1"
			onkeydown={onMenuKeydown}
		>
			<p class="menu-heading">Profiles</p>
			{#each PROFILES as profile, i (profile.id)}
				<button
					type="button"
					role="menuitemradio"
					aria-checked={profile.id === selected.id}
					class="menu-item"
					class:is-selected={profile.id === selected.id}
					bind:this={items[i]}
					onclick={() => choose(profile)}
				>
					<span class="menu-initial" aria-hidden="true">{profile.name.charAt(0)}</span>
					<span class="menu-text">
						<span class="menu-name">{profile.name}</span>
						<span class="menu-role">{profile.role}</span>
					</span>
					{#if profile.id === selected.id}
						<Icon name="check" size={16} class="menu-check" />
					{/if}
				</button>
			{/each}
		</div>
	{/if}
</div>

<span class="visually-hidden" aria-live="polite">{announce}</span>

<style>
	.profile {
		position: relative;
	}

	.trigger {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		padding: 6px 10px 6px 6px;
		border: 1px solid var(--border-hair);
		border-radius: var(--radius-pill);
		background: rgba(255, 255, 255, 0.03);
		color: var(--text-primary);
		transition: border-color 160ms ease, background 160ms ease;
	}

	.trigger:hover,
	.trigger[aria-expanded='true'] {
		border-color: var(--border-gold);
		background: rgba(201, 162, 39, 0.08);
	}

	/* Text-only monogram — deliberately not a photograph or avatar image. */
	.trigger-initial {
		display: grid;
		place-items: center;
		width: 28px;
		height: 28px;
		border-radius: 50%;
		background: linear-gradient(160deg, var(--gold-deep), var(--surface-panel-solid));
		border: 1px solid var(--border-gold);
		font-family: var(--font-display);
		font-size: 14px;
		font-weight: 700;
		color: var(--gold-bright);
	}

	.trigger-name {
		font-size: 14px;
		font-weight: 600;
	}

	.trigger :global(.trigger-chevron) {
		color: var(--text-secondary);
	}

	.menu {
		position: absolute;
		top: calc(100% + 8px);
		right: 0;
		min-width: 232px;
		padding: var(--space-2);
		background: var(--surface-panel-solid);
		border: 1px solid var(--border-gold);
		border-radius: var(--radius-md);
		box-shadow: var(--shadow-panel);
		z-index: var(--z-dropdown);
	}

	.menu-heading {
		margin: var(--space-1) var(--space-3) var(--space-2);
		font-size: 11px;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--text-muted);
	}

	.menu-item {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		width: 100%;
		padding: var(--space-2) var(--space-3);
		border-radius: var(--radius-sm);
		color: var(--text-secondary);
		text-align: left;
	}

	.menu-item:hover,
	.menu-item:focus-visible {
		background: rgba(201, 162, 39, 0.1);
		color: var(--text-primary);
	}

	.menu-item.is-selected {
		color: var(--gold-bright);
	}

	.menu-initial {
		display: grid;
		place-items: center;
		width: 30px;
		height: 30px;
		border-radius: 50%;
		border: 1px solid var(--border-hair);
		font-family: var(--font-display);
		font-size: 14px;
		font-weight: 600;
		flex-shrink: 0;
	}

	.menu-item.is-selected .menu-initial {
		border-color: var(--border-gold);
		color: var(--gold-bright);
	}

	.menu-text {
		display: flex;
		flex-direction: column;
		min-width: 0;
	}

	.menu-name {
		font-size: 14px;
		font-weight: 600;
		color: inherit;
	}

	.menu-role {
		font-size: 12px;
		color: var(--text-muted);
	}

	.menu-item :global(.menu-check) {
		margin-left: auto;
		color: var(--gold-bright);
	}

	@media (max-width: 520px) {
		.trigger-name {
			display: none;
		}
	}
</style>
