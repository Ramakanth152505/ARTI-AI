<script lang="ts">
	import { BRAND_ASSETS, ASSETS_READY, PLACEHOLDER_NOTE } from '#lib/data/brandAssets';

	/**
	 * Background + crest layers.
	 *
	 * The supplied environment image is the authoritative background; it is
	 * never recoloured and no gradient is layered over it that would shift its
	 * appearance. Only a bounded edge vignette is used to keep foreground text
	 * legible.
	 *
	 * The crest is supplied artwork placed on the central wall. Until the files
	 * are added and `ASSETS_READY` is set, honest text placeholders are shown
	 * and no file requests are made.
	 */
	const showBackground = ASSETS_READY;
	const showCrest = ASSETS_READY;
</script>

<div class="background-layer" aria-hidden="true">
	{#if showBackground}
		<img class="bg-img" src={BRAND_ASSETS.background} alt="" />
	{:else}
		<div class="bg-fallback"></div>
		<span class="asset-note">{PLACEHOLDER_NOTE} — background</span>
	{/if}
</div>

<div class="crest-layer" aria-hidden="true">
	{#if showCrest}
		<img class="crest" src={BRAND_ASSETS.crest} alt="" />
	{:else}
		<div class="crest-placeholder">
			<span class="crest-word">ARTI</span>
			<span class="crest-tag">Ideas • Code • Impact</span>
		</div>
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
		display: block;
	}

	.bg-fallback {
		width: 100%;
		height: 100%;
		background:
			radial-gradient(120% 80% at 70% 30%, rgba(201, 162, 39, 0.08), transparent 60%),
			linear-gradient(180deg, #0b0906, #050403);
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
		background: radial-gradient(140% 110% at 50% 40%, transparent 45%, rgba(0, 0, 0, 0.45) 100%);
		pointer-events: none;
	}

	.crest-layer {
		position: absolute;
		inset: 0;
		z-index: var(--z-crest);
		display: flex;
		align-items: center;
		justify-content: center;
		pointer-events: none;
		padding-bottom: 90px;
	}

	.crest {
		max-width: min(560px, 62%);
		max-height: 58vh;
		object-fit: contain;
		opacity: 0.96;
	}

	.crest-placeholder {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-2);
		padding: var(--space-6) var(--space-7);
		border: 1px dashed var(--border-gold);
		border-radius: var(--radius-lg);
		background: rgba(5, 4, 3, 0.35);
	}

	.crest-word {
		font-family: var(--font-display);
		font-size: 44px;
		font-weight: 700;
		letter-spacing: 0.22em;
		color: var(--gold-bright);
	}

	.crest-tag {
		font-size: 11px;
		letter-spacing: 0.28em;
		text-transform: uppercase;
		color: var(--text-muted);
	}
</style>
