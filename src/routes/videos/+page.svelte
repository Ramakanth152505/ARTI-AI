<script lang="ts">
        import TopBar from '#lib/components/TopBar.svelte';
        import VideosWorkspace from '#lib/components/VideosWorkspace.svelte';

        /**
         * Videos route.
         *
         * A real page, replacing the "[section] coming soon" placeholder for
         * `/videos`. It renders inside the existing application shell (the layout
         * keeps the global navigation sidebar), reuses the shared TopBar so Magic Mode
         * and the profile controls behave exactly as on Home, Chats and Images, and
         * adds the videos production workspace underneath.
         */
</script>

<svelte:head>
        <title>Videos — ARTI AI</title>
</svelte:head>

<TopBar />

<main class="videos-page">
        <VideosWorkspace />
</main>

<style>
        .videos-page {
                flex: 1;
                min-height: 0;
                height: calc(100vh - var(--topbar-height));
                display: flex;
                flex-direction: column;
                overflow: hidden;
        }

        @supports (height: 100dvh) {
                .videos-page {
                        height: calc(100dvh - var(--topbar-height));
                }
        }
</style>
