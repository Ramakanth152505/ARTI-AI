<script lang="ts">
        import TopBar from '#lib/components/TopBar.svelte';
        import HomeBackground from '#lib/components/HomeBackground.svelte';
        import ChatComposer from '#lib/components/ChatComposer.svelte';
        import HomeFooter from '#lib/components/HomeFooter.svelte';
        import { NOT_CONNECTED } from '#lib/data/statusMessages';

        /**
         * Home UI. The chat backend is not connected yet, so `onsubmit` surfaces no
         * success. Attachment selections are validated against the control's accepted
         * types and acknowledged honestly as "not uploaded yet" rather than pretending
         * to work.
         */
        const ACCEPTED: Record<string, (file: File) => boolean> = {
                image: (f) => f.type.startsWith('image/'),
                video: (f) => f.type.startsWith('video/'),
                document: (f) => /\.(pdf|docx?|txt|md)$/i.test(f.name)
        };

        function handleSubmit(message: string): void {
                // Placeholder boundary for the future ARTI model service. Nothing is
                // sent anywhere; the composer shows the not-connected state to the user.
                void message;
        }

        function handleAttach(id: string, files: FileList): string {
                const list = Array.from(files);
                const check = ACCEPTED[id] ?? (() => true);
                const rejected = list.filter((f) => !check(f));

                if (rejected.length) {
                        return `Unsupported file(s): ${rejected.map((f) => f.name).join(', ')}.`;
                }

                const names = list.map((f) => f.name).join(', ');
                return `Selected for ${id}: ${names} — ${NOT_CONNECTED.upload}`;
        }
</script>

<TopBar />

<main class="home">
        <HomeBackground />

        <div class="home-content">
                <div class="composer-slot">
                        <ChatComposer onsubmit={handleSubmit} onattach={handleAttach} />
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

        /* Paints above the background layer (z-index 0) while the flex flow keeps
           the composer area sized and positioned below the central crest. */
        .home-content {
                position: relative;
                z-index: var(--z-composer);
                flex: 1;
                display: flex;
                flex-direction: column;
                justify-content: flex-end;
                align-items: center;
                padding: var(--space-6) var(--space-5) var(--space-3);
                min-height: 0;
        }

        .composer-slot {
                width: 100%;
                max-width: var(--composer-max-width);
        }

        @media (max-width: 900px) {
                .home {
                        min-height: calc(100vh - var(--topbar-height));
                }
        }
</style>
