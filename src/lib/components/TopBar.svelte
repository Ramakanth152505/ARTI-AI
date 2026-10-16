<script lang="ts">
	import Icon from './Icon.svelte';
	import ProfileDropdown from './ProfileDropdown.svelte';
	import { ui } from '#lib/state/uiState.svelte';

	/**
	 * Notifications are illustrative only. There is no notification service
	 * wired up yet, so the count is an explicit placeholder rather than data
	 * presented as real.
	 */
	const notificationCount = 3;
</script>

<header class="topbar">
	<button class="icon-btn menu-btn" aria-label="Open navigation" onclick={() => ui.openSidebar()}>
		<Icon name="menu" size={20} />
	</button>

	<div class="topbar-spacer"></div>

	<!-- Magic Mode: visual placeholder, its behaviour is not implemented yet. -->
	<button type="button" class="magic" aria-pressed="false" title="Magic Mode (not yet implemented)">
		<Icon name="bolt" size={16} />
		<span>Magic Mode</span>
	</button>

	<button type="button" class="icon-btn bell" aria-label={`Notifications (${notificationCount} unread)`}>
		<Icon name="bell" size={20} />
		<span class="badge" aria-hidden="true">{notificationCount}</span>
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
		background: rgba(8, 7, 5, 0.72);
		backdrop-filter: blur(10px);
	}

	.topbar-spacer {
		flex: 1;
	}

	.menu-btn {
		display: none;
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
		transition: color 160ms ease, border-color 160ms ease, background 160ms ease;
	}

	.icon-btn:hover {
		color: var(--gold-bright);
		border-color: var(--border-gold);
		background: rgba(201, 162, 39, 0.08);
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
		background: linear-gradient(180deg, rgba(201, 162, 39, 0.16), rgba(201, 162, 39, 0.05));
		color: var(--gold-bright);
		font-size: 13px;
		font-weight: 600;
		letter-spacing: 0.02em;
		box-shadow: var(--glow-gold);
		transition: box-shadow 160ms ease, background 160ms ease;
	}

	.magic:hover {
		background: linear-gradient(180deg, rgba(201, 162, 39, 0.24), rgba(201, 162, 39, 0.08));
	}

	@media (max-width: 900px) {
		.menu-btn {
			display: grid;
		}
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
