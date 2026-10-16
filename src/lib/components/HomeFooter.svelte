<script lang="ts">
	/**
	 * Home footer. The brand label and quotation are fixed by the approved
	 * reference and are reproduced verbatim.
	 */
	const quote = 'Not just an AI. A companion in your journey to build a better tomorrow.';
</script>

<footer class="home-footer">
	<span class="footer-brand">
		<span class="rule" aria-hidden="true"></span>
		<span class="footer-brand-text">ARTI</span>
		<span class="rule" aria-hidden="true"></span>
	</span>
	<p class="footer-quote">“{quote}”</p>
</footer>

<style>
	.home-footer {
		position: relative;
		z-index: var(--z-footer);
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-2);
		padding: var(--space-3) var(--space-5) var(--space-5);
		text-align: center;
	}

	.footer-brand {
		display: flex;
		align-items: center;
		gap: var(--space-3);
	}

	.footer-brand-text {
		font-family: var(--font-display);
		font-size: 15px;
		font-weight: 700;
		letter-spacing: 0.34em;
		color: var(--gold-bright);
		text-indent: 0.34em; /* balances the trailing letter-spacing */
	}

	.rule {
		width: 64px;
		height: 1px;
		background: linear-gradient(90deg, transparent, var(--border-gold));
	}

	.rule:last-child {
		background: linear-gradient(90deg, var(--border-gold), transparent);
	}

	.footer-quote {
		margin: 0;
		max-width: 640px;
		font-size: 13px;
		font-style: italic;
		color: var(--text-secondary);
		text-shadow: 0 1px 12px rgba(0, 0, 0, 0.8);
	}

	@media (max-width: 560px) {
		.rule {
			width: 32px;
		}
	}
</style>
