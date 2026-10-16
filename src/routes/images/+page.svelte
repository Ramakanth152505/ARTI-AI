<script lang="ts">
        import TopBar from '#lib/components/TopBar.svelte';
        import ImagesWorkspace from '#lib/components/ImagesWorkspace.svelte';

        /**
         * Images route.
         *
         * A real page, replacing the "[section] coming soon" placeholder for
         * `/images`. It renders inside the existing application shell (the layout
         * keeps the global navigation sidebar), reuses the shared TopBar so Magic Mode
         * and the profile controls behave exactly as on Home and Chats, and adds the
         * Images workspace underneath.
         */
</script>

<svelte:head>
        <title>Images — ARTI AI</title>
</svelte:head>

<TopBar />

<main class="images-page">
        <ImagesWorkspace />
</main>

<style>
        .images-page {
                flex: 1;
                min-height: 0;
                height: calc(100vh - var(--topbar-height));
                display: flex;
                flex-direction: column;
                overflow: hidden;
        }

        @supports (height: 100dvh) {
                .images-page {
                        height: calc(100dvh - var(--topbar-height));
                }
        }
</style>
