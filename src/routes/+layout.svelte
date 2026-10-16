<script lang="ts">
	import '../lib/styles/global.css';
	import Sidebar from '#lib/components/Sidebar.svelte';
	import { ui } from '#lib/state/uiState.svelte';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();
</script>

<svelte:head>
	<link rel="icon" href="/favicon.svg" type="image/svg+xml" />
	<title>ARTI AI — Ideas. Code. Impact.</title>
</svelte:head>

<div class="app-shell" class:collapsed={ui.sidebarCollapsed}>
	<Sidebar />
	<div class="app-main">{@render children()}</div>
</div>

<style>
	.app-shell {
		display: grid;
		grid-template-columns: var(--sidebar-width) 1fr;
		min-height: 100vh;
		transition: grid-template-columns 200ms ease;
	}

	.app-shell.collapsed {
		grid-template-columns: var(--sidebar-collapsed-width) 1fr;
	}

	.app-main {
		position: relative;
		min-width: 0; /* lets the grid track shrink instead of forcing overflow */
		display: flex;
		flex-direction: column;
	}

	/* Below the sidebar breakpoint, the sidebar becomes an overlay drawer and
	   the main column takes the full width. */
	@media (max-width: 900px) {
		.app-shell,
		.app-shell.collapsed {
			grid-template-columns: 1fr;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.app-shell {
			transition: none;
		}
	}
</style>
