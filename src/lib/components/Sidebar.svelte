<script lang="ts">
	import { page } from '$app/state';
	import Icon from './Icon.svelte';
	import { PRIMARY_NAV, SETTINGS_NAV, type NavItem } from '#lib/data/navigation';
	import { BRAND_ASSETS, ASSETS_READY, PLACEHOLDER_NOTE } from '#lib/data/brandAssets';
	import { ui } from '#lib/state/uiState.svelte';

	/** True when the current route matches the item's href. */
	function isActive(item: NavItem): boolean {
		if (item.href === '/') return page.url.pathname === '/';
		return page.url.pathname === item.href || page.url.pathname.startsWith(item.href + '/');
	}

	/**
	 * The phoenix is supplied artwork. Until the file is added and
	 * `ASSETS_READY` is set, a neutral placeholder is shown instead of a
	 * fabricated logo or a broken-image glyph.
	 */
	const showPhoenix = ASSETS_READY;
</script>

<aside class="sidebar" class:open={ui.sidebarOpen} aria-label="Primary">
	<div class="brand">
		{#if showPhoenix}
			<img class="brand-mark" src={BRAND_ASSETS.phoenix} alt="ARTI AI" width="40" height="40" />
		{:else}
			<span
				class="brand-mark is-empty"
				role="img"
				aria-label="ARTI AI emblem placeholder"
				title={PLACEHOLDER_NOTE}
			>
				<Icon name="sparkle" size={22} />
			</span>
		{/if}
		<span class="brand-text">
			<span class="brand-name">ARTI <span class="brand-ai">AI</span></span>
			<span class="brand-tag">Ideas • Code • Impact</span>
		</span>
	</div>

	<nav class="nav-scroll">
		<ul class="nav-list">
			{#each PRIMARY_NAV as item (item.href)}
				<li>
					<a
						class="nav-item"
						class:active={isActive(item)}
						href={item.href}
						aria-current={isActive(item) ? 'page' : undefined}
						onclick={() => ui.closeSidebar()}
					>
						<span class="nav-icon"><Icon name={item.icon} size={19} /></span>
						<span class="nav-label">{item.label}</span>
					</a>
				</li>
			{/each}
		</ul>
	</nav>

	<div class="nav-settings">
		<a
			class="nav-item"
			class:active={isActive(SETTINGS_NAV)}
			href={SETTINGS_NAV.href}
			aria-current={isActive(SETTINGS_NAV) ? 'page' : undefined}
			onclick={() => ui.closeSidebar()}
		>
			<span class="nav-icon"><Icon name={SETTINGS_NAV.icon} size={19} /></span>
			<span class="nav-label">{SETTINGS_NAV.label}</span>
		</a>
	</div>
</aside>

{#if ui.sidebarOpen}
	<button class="scrim" aria-label="Close navigation" onclick={() => ui.closeSidebar()}></button>
{/if}

<style>
	.sidebar {
		position: sticky;
		top: 0;
		z-index: var(--z-sidebar);
		display: flex;
		flex-direction: column;
		height: 100vh;
		width: var(--sidebar-width);
		background: linear-gradient(180deg, var(--surface-sidebar) 0%, var(--surface-sidebar-end) 100%);
		border-right: 1px solid var(--border-hair);
	}

	/* --- Brand header --- */
	.brand {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		height: var(--topbar-height);
		padding: 0 var(--space-5);
		border-bottom: 1px solid var(--border-hair);
		flex-shrink: 0;
	}

	.brand-mark {
		display: grid;
		place-items: center;
		width: 40px;
		height: 40px;
		flex-shrink: 0;
		object-fit: contain;
		color: var(--gold);
	}

	/* Placeholder styling applies only while the real asset is unavailable. */
	.brand-mark.is-empty {
		border: 1px dashed var(--border-gold);
		border-radius: var(--radius-sm);
		opacity: 0.7;
	}

	.brand-text {
		display: flex;
		flex-direction: column;
		min-width: 0;
	}

	.brand-name {
		font-family: var(--font-display);
		font-size: 19px;
		font-weight: 700;
		letter-spacing: 0.06em;
		color: var(--text-primary);
		line-height: 1.1;
	}

	.brand-ai {
		color: var(--gold-bright);
	}

	.brand-tag {
		font-size: 10px;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		color: var(--text-muted);
	}

	/* --- Navigation --- */
	.nav-scroll {
		flex: 1;
		overflow-y: auto;
		padding: var(--space-4) var(--space-3);
	}

	.nav-list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.nav-item {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		padding: 9px var(--space-3);
		border-radius: var(--radius-md);
		border: 1px solid transparent;
		color: var(--text-secondary);
		text-decoration: none;
		font-size: 14px;
		font-weight: 500;
		transition:
			background 160ms ease,
			color 160ms ease,
			border-color 160ms ease;
	}

	.nav-item:hover {
		background: rgba(201, 162, 39, 0.07);
		color: var(--text-primary);
	}

	.nav-icon {
		display: grid;
		place-items: center;
		width: 22px;
		flex-shrink: 0;
		color: inherit;
	}

	.nav-label {
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	/* Active = restrained gold border + subtle highlighted background. */
	.nav-item.active {
		background: linear-gradient(90deg, rgba(201, 162, 39, 0.16), rgba(201, 162, 39, 0.04));
		border-color: var(--border-gold);
		color: var(--gold-bright);
		box-shadow: inset 0 0 18px rgba(240, 210, 113, 0.08);
	}

	.nav-item.active .nav-icon {
		color: var(--gold-bright);
	}

	.nav-settings {
		padding: var(--space-3);
		border-top: 1px solid var(--border-hair);
		flex-shrink: 0;
	}

	/* --- Overlay drawer (small screens only) --- */
	.scrim {
		position: fixed;
		inset: 0;
		z-index: var(--z-topbar);
		background: rgba(0, 0, 0, 0.6);
		border: none;
	}

	@media (max-width: 900px) {
		.sidebar {
			position: fixed;
			top: 0;
			left: 0;
			transform: translateX(-100%);
			transition: transform 220ms ease;
		}

		.sidebar.open {
			transform: translateX(0);
		}

		.scrim {
			z-index: calc(var(--z-sidebar) - 1);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.sidebar,
		.nav-item {
			transition: none;
		}
	}
</style>
