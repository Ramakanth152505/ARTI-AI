<script lang="ts">
	import { ICONS, type IconName } from '#lib/data/icons';

	interface Props {
		/** Key into the shared icon table. */
		name: IconName;
		/** Rendered square size in pixels. */
		size?: number;
		/** Stroke width, tuned per placement. */
		stroke?: number;
		/** Decorative by default; pass a label when the icon carries meaning. */
		label?: string;
		class?: string;
	}

	let { name, size = 20, stroke = 1.6, label, class: cls = '' }: Props = $props();

	let def = $derived(ICONS[name]);
</script>

<svg
	class={cls}
	width={size}
	height={size}
	viewBox="0 0 24 24"
	fill="none"
	stroke="currentColor"
	stroke-width={stroke}
	stroke-linecap="round"
	stroke-linejoin="round"
	role={label ? 'img' : 'presentation'}
	aria-hidden={label ? undefined : 'true'}
	aria-label={label}
>
	{#each def.paths as d}
		<path {d} />
	{/each}
</svg>
