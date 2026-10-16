<script lang="ts">
        /**
         * Images style library.
         *
         * A thin adapter over the SHARED `StyleLibrary` component, locked to the
         * image media type. The catalogue and the selection behaviour are shared with
         * Videos, so the two workspaces cannot drift apart; this wrapper only states
         * which media is browsing.
         *
         * Selecting a style never silently overwrites an existing prompt: the card
         * reports the selection and the parent decides how to combine the text.
         */
        import StyleLibrary from './StyleLibrary.svelte';

        interface Props {
                /** Id of the currently selected style, or null. */
                selectedId: string | null;
                /** Called when the user activates a style card. */
                onselect: (id: string) => void;
                /** Called when the user clears the active style. */
                onclear: () => void;
                onclose: () => void;
        }

        let { selectedId, onselect, onclear, onclose }: Props = $props();
</script>

<StyleLibrary media="image" {selectedId} {onselect} {onclear} {onclose} />
