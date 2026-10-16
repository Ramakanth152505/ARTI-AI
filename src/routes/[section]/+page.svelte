<script lang="ts">
	import TopBar from '#lib/components/TopBar.svelte';
	import ComingSoon from '#lib/components/ComingSoon.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<TopBar />
<ComingSoon title={data.title} icon={data.icon} />
