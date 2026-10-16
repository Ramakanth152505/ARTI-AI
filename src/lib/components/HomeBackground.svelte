<script lang="ts">
	import { BRAND_ASSETS, BACKGROUND_READY, PLACEHOLDER_NOTE } from '#lib/data/brandAssets';

	/**
	 * The single supplied background image is the authoritative environment. It
	 * already contains the architectural interior AND the central ARTI crest, so
	 * no crest layer, gradient wash or second image is drawn over it. Only a
	 * bounded edge vignette keeps foreground text legible without shifting the
	 * artwork's colour grading.
	 *
	 * Until the file is added and `BACKGROUND_READY` is set, an honest labelled
	 * fallback is shown and no request is made for the missing file.
	 */
	const showBackground = BACKGROUND_READY;

	/** True when the image fails to load at runtime, so we fall back cleanly. */
	let failed = $state(false);
</script>

<div class="background-layer" aria-hidden="true">
	{#if showBackground && !failed}
		<img
			class="bg-img"
			src={BRAND_ASSETS.background}
			alt=""
			onerror={() => (failed = true)}
		/>
	{:else}
		<div class="bg-fallback"></div>
		<span class="asset-note">
			{failed ? 'Background failed to load' : `${PLACEHOLDER_NOTE} — background`}
		</span>
	{/if}
</div>

<style>
	.background-layer {
		position: absolute;
		inset: 0;
		z-index: var(--z-background);
		overflow: hidden;
		background: var(--surface-void);
	}

	.bg-img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		object-position: center;
		display: block;
	}

	/* Clean dark fallback when the artwork is missing or fails to load. */
	.bg-fallback {
		width: 100%;
		height: 100%;
		background:
			radial-gradient(120% 80% at 70% 30%, rgba(201, 154, 54, 0.07), transparent 60%),
			linear-gradient(180deg, #0b0d0e, #050505);
	}

	/* Neutral label so it is always clear when the artwork is still missing. */
	.asset-note {
		position: absolute;
		left: var(--space-4);
		bottom: var(--space-4);
		font-size: 11px;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--text-muted);
		opacity: 0.65;
	}

	/* Bounded vignette — keeps text legible without recolouring the artwork. */
	.background-layer::after {
		content: '';
		position: absolute;
		inset: 0;
		background: radial-gradient(140% 110% at 50% 42%, transparent 48%, rgba(0, 0, 0, 0.42) 100%);
		pointer-events: none;
	}
</style>
