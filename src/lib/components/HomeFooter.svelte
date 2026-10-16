<script lang="ts">
	/**
	 * Home footer. The branding and quote are fixed by the approved reference
	 * and are reproduced verbatim.
	 */
	const quote = 'Not just an AI. A companion in your journey to build a better tomorrow.';
</script>

<footer class="home-footer">
	<span class="footer-brand">ARTI</span>
	<p class="footer-quote">“{quote}”</p>
</footer>

<style>
	.home-footer {
		position: relative;
		z-index: var(--z-footer);
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-1);
		padding: var(--space-4) var(--space-5) var(--space-5);
		text-align: center;
	}

	.footer-brand {
		font-family: var(--font-display);
		font-size: 15px;
		font-weight: 700;
		letter-spacing: 0.34em;
		color: var(--gold-bright);
	}

	.footer-quote {
		margin: 0;
		max-width: 620px;
		font-size: 13px;
		font-style: italic;
		color: var(--text-secondary);
		text-shadow: 0 1px 12px rgba(0, 0, 0, 0.8);
	}
</style>
