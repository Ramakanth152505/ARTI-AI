<script lang="ts">
	import Icon from './Icon.svelte';
	import ProfileDropdown from './ProfileDropdown.svelte';
	import { ui } from '#lib/state/uiState.svelte';

	/**
	 * There is no notification service wired up yet, so the bell always renders a
	 * neutral "no unread" state rather than a hard-coded count presented as real.
	 * Flip `hasUnread`/`count` only once a real source exists.
	 */
	const hasUnread = false;
	const notificationCount = 0;

	/** Below the drawer breakpoint the menu button opens the drawer; on desktop it
	 * collapses the sidebar to its icon rail. */
	const drawerQuery = '(max-width: 900px)';
	let isDrawer = $state(false);

	$effect(() => {
		const mql = window.matchMedia(drawerQuery);
		isDrawer = mql.matches;
		const onChange = (event: MediaQueryListEvent) => (isDrawer = event.matches);
		mql.addEventListener('change', onChange);
		return () => mql.removeEventListener('change', onChange);
	});

	function onMenuClick(): void {
		if (isDrawer) ui.openSidebar();
		else ui.toggleCollapsed();
	}
</script>

<header class="topbar">
	<button
		type="button"
		class="icon-btn menu-btn"
		aria-label={isDrawer ? 'Open navigation' : 'Toggle navigation'}
		aria-expanded={isDrawer ? ui.sidebarOpen : !ui.sidebarCollapsed}
		onclick={onMenuClick}
	>
		<Icon name="menu" size={20} />
	</button>

	<div class="topbar-spacer"></div>

	<!-- Magic Mode: visual placeholder; its behaviour is not implemented yet. -->
	<button type="button" class="magic" aria-pressed="false" title="Magic Mode (not yet implemented)">
		<Icon name="bolt" size={16} />
		<span>Magic Mode</span>
	</button>

	<button
		type="button"
		class="icon-btn bell"
		aria-label={hasUnread ? `Notifications (${notificationCount} unread)` : 'Notifications (none unread)'}
	>
		<Icon name="bell" size={20} />
		{#if hasUnread}
			<span class="badge" aria-hidden="true">{notificationCount}</span>
		{/if}
	</button>

	<ProfileDropdown />
</header>

<style>
	.topbar {
		position: relative;
		z-index: var(--z-topbar);
		display: flex;
		align-items: center;
		gap: var(--space-3);
		height: var(--topbar-height);
		padding: 0 var(--space-5);
		border-bottom: 1px solid var(--border-hair);
		background: rgba(5, 5, 5, 0.72);
		backdrop-filter: blur(10px);
	}

	.topbar-spacer {
		flex: 1;
	}

	.icon-btn {
		position: relative;
		display: grid;
		place-items: center;
		width: 38px;
		height: 38px;
		border-radius: var(--radius-pill);
		border: 1px solid var(--border-hair);
		color: var(--text-secondary);
		transition:
			color 160ms ease,
			border-color 160ms ease,
			background 160ms ease;
	}

	.icon-btn:hover {
		color: var(--gold-bright);
		border-color: var(--border-gold);
		background: rgba(201, 154, 54, 0.08);
	}

	.badge {
		position: absolute;
		top: -4px;
		right: -4px;
		min-width: 17px;
		height: 17px;
		padding: 0 4px;
		display: grid;
		place-items: center;
		border-radius: var(--radius-pill);
		background: var(--gold-bright);
		color: var(--text-on-gold);
		font-size: 10px;
		font-weight: 700;
	}

	.magic {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		padding: 8px 16px;
		border-radius: var(--radius-pill);
		border: 1px solid var(--border-gold);
		background: linear-gradient(180deg, rgba(201, 154, 54, 0.16), rgba(201, 154, 54, 0.05));
		color: var(--gold-bright);
		font-size: 13px;
		font-weight: 600;
		letter-spacing: 0.02em;
		box-shadow: var(--glow-gold);
		transition:
			box-shadow 160ms ease,
			background 160ms ease;
	}

	.magic:hover {
		background: linear-gradient(180deg, rgba(201, 154, 54, 0.24), rgba(201, 154, 54, 0.08));
	}

	@media (max-width: 560px) {
		.magic span {
			display: none;
		}

		.magic {
			padding: 8px 12px;
		}
	}
</style>
