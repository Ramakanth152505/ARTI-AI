<script lang="ts">
	import TopBar from '#lib/components/TopBar.svelte';
	import HomeBackground from '#lib/components/HomeBackground.svelte';
	import ChatComposer from '#lib/components/ChatComposer.svelte';
	import HomeFooter from '#lib/components/HomeFooter.svelte';

	/**
	 * Home UI. The chat backend is not connected yet, so `onsubmit` and
	 * `onattach` intentionally surface no success. Composer itself reports the
	 * honest "not connected" state; attachment selections are acknowledged as
	 * "not uploaded yet" rather than pretending to work.
	 */
	let attachNote = $state('');

	function handleSubmit(message: string): void {
		// Placeholder boundary for the future ARTI model service. Nothing is
		// sent anywhere; the composer shows the not-connected state to the user.
		void message;
	}

	function handleAttach(id: string, files: FileList): void {
		const names = Array.from(files)
			.map((f) => f.name)
			.join(', ');
		attachNote = `Selected for ${id}: ${names} — not uploaded yet.`;
	}
</script>

<TopBar />

<main class="home">
	<HomeBackground />

	<div class="home-content">
		<div class="composer-slot">
			<ChatComposer onsubmit={handleSubmit} onattach={handleAttach} />
			{#if attachNote}
				<p class="attach-note" role="status">{attachNote}</p>
			{/if}
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

	/* Absolute so it paints above the background/crest layers (z-index 0/1)
	   while the flex flow keeps the composer area correctly sized. */
	.home-content {
		position: relative;
		z-index: var(--z-composer);
		flex: 1;
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		padding: var(--space-6) var(--space-5) var(--space-3);
		min-height: 0;
	}

	.composer-slot {
		width: 100%;
		max-width: var(--composer-max-width);
	}

	.attach-note {
		margin: var(--space-3) 0 0;
		font-size: 12.5px;
		color: var(--text-secondary);
		text-align: center;
	}

	@media (max-width: 900px) {
		.home {
			min-height: calc(100vh - var(--topbar-height));
		}
	}
</style>
