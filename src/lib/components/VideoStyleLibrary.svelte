<script lang="ts">
        /**
         * Videos style library.
         *
         * A thin adapter over the SHARED `StyleLibrary` component, locked to the video
         * media type. The catalogue and the selection behaviour are shared with Images,
         * so the two workspaces cannot drift apart; this wrapper only states which
         * media is browsing.
         *
         * Selecting a style never starts generation and never silently overwrites an
         * existing prompt: the card reports the selection and the workspace decides
         * how to combine the guidance.
         */
        import StyleLibrary from './StyleLibrary.svelte';

        interface Props {
                selectedId: string | null;
                onselect: (id: string) => void;
                onclear: () => void;
                onclose: () => void;
        }

        let { selectedId, onselect, onclear, onclose }: Props = $props();
</script>

<StyleLibrary media="video" {selectedId} {onselect} {onclear} {onclose} />
