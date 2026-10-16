<script lang="ts">
	import '../lib/styles/global.css';
	import Sidebar from '#lib/components/Sidebar.svelte';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();
</script>

<svelte:head>
	<link rel="icon" href="/favicon.svg" type="image/svg+xml" />
	<title>ARTI AI — Ideas. Code. Impact.</title>
</svelte:head>

<div class="app-shell">
	<Sidebar />
	<div class="app-main">{@render children()}</div>
</div>

<style>
	.app-shell {
		display: grid;
		grid-template-columns: var(--sidebar-width) 1fr;
		min-height: 100vh;
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
		.app-shell {
			grid-template-columns: 1fr;
		}
	}
</style>
