<script lang="ts">
	/**
	 * Chats route.
	 *
	 * A real page, replacing the "[section] coming soon" placeholder for `/chats`.
	 * It renders inside the existing application shell (the layout keeps the global
	 * navigation sidebar), reuses the shared TopBar so Magic Mode and the profile
	 * controls behave exactly as on Home, and adds the three-region Chats workspace
	 * underneath.
	 */
	import TopBar from '#lib/components/TopBar.svelte';
	import ChatsWorkspace from '#lib/components/ChatsWorkspace.svelte';
</script>

<svelte:head>
	<title>Chats — ARTI AI</title>
</svelte:head>

<TopBar />

<main class="chats-page">
	<ChatsWorkspace />
</main>

<style>
	.chats-page {
		flex: 1;
		min-height: 0;
		height: calc(100vh - var(--topbar-height));
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	@supports (height: 100dvh) {
		.chats-page {
			height: calc(100dvh - var(--topbar-height));
		}
	}
</style>
