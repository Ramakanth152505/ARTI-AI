<script lang="ts">
	import TopBar from '#lib/components/TopBar.svelte';
	import HomeBackground from '#lib/components/HomeBackground.svelte';
	import ChatComposer from '#lib/components/ChatComposer.svelte';
	import HomeFooter from '#lib/components/HomeFooter.svelte';

	/**
	 * Home UI. The chat backend is not connected yet. `handleSubmit` is the
	 * placeholder boundary for the future ARTI model service: nothing is sent
	 * anywhere, and the composer itself reports the honest "not connected" state.
	 */
	function handleSubmit(message: string, files: File[]): void {
		void message;
		void files;
	}
</script>

<TopBar />

<main class="home">
	<HomeBackground />

	<div class="home-content">
		<div class="composer-slot">
			<ChatComposer onsubmit={handleSubmit} />
		</div>
	</div>

	<HomeFooter />
</main>

<style>
	.home {
		position: relative;
		flex: 1;
		display: flex;
		flex-direction: column;
		min-height: 0;
		overflow: hidden;
	}

	/* Sits above the background layer (z-index 0) while the flex flow keeps the
	   composer area correctly sized. The composer is anchored to the lower-middle
	   of the workspace: below the central wall branding and above the footer. */
	.home-content {
		position: relative;
		z-index: var(--z-composer);
		flex: 1;
		display: flex;
		flex-direction: column;
		justify-content: flex-end;
		align-items: center;
		padding: var(--space-5) var(--space-5) 0;
		min-height: 0;
	}

	.composer-slot {
		width: 100%;
		max-width: var(--composer-max-width);
		margin-bottom: clamp(16px, 6vh, 72px);
	}

	/* Short viewports: reduce the gap so the composer stays clear of the footer. */
	@media (max-height: 720px) {
		.composer-slot {
			margin-bottom: var(--space-4);
		}
	}

	@media (max-width: 900px) {
		.home {
			min-height: calc(100vh - var(--topbar-height));
		}

		.home-content {
			padding: var(--space-5) var(--space-4) 0;
		}
	}
</style>
