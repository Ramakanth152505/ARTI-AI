<script lang="ts">
	import Icon from './Icon.svelte';
	import type { IconName } from '#lib/data/icons';

	interface Props {
		/** Section name shown to the user. */
		title: string;
		/** Icon for the section. */
		icon: IconName;
	}

	let { title, icon }: Props = $props();
</script>

<section class="coming-soon">
	<span class="badge"><Icon name={icon} size={26} /></span>
	<h1>{title}</h1>
	<p class="status">Coming soon — this section is not built yet.</p>
	<a class="back" href="/">Back to Home</a>
</section>

<style>
	.coming-soon {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: var(--space-3);
		padding: var(--space-7) var(--space-5);
		text-align: center;
	}

	.badge {
		display: grid;
		place-items: center;
		width: 64px;
		height: 64px;
		border-radius: 50%;
		border: 1px solid var(--border-gold);
		color: var(--gold-bright);
		background: rgba(201, 162, 39, 0.06);
	}

	h1 {
		margin: 0;
		font-family: var(--font-display);
		font-size: 30px;
		font-weight: 700;
		letter-spacing: 0.06em;
		color: var(--text-primary);
	}

	.status {
		margin: 0;
		color: var(--text-secondary);
	}

	.back {
		margin-top: var(--space-3);
		padding: 9px 20px;
		border-radius: var(--radius-pill);
		border: 1px solid var(--border-gold);
		color: var(--gold-bright);
		text-decoration: none;
		font-size: 14px;
		font-weight: 600;
	}

	.back:hover {
		background: rgba(201, 162, 39, 0.1);
	}
</style>
