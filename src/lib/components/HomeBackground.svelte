<script lang="ts">
        import { BRAND_ASSETS, ASSETS_READY, PLACEHOLDER_NOTE } from '#lib/data/brandAssets';

        /**
         * The cinematic Home environment layer.
         *
         * The supplied image is the authoritative background: the marble wall, gold
         * architecture, skyline, furniture, reflections and the central ARTI crest
         * are all part of that one file, so nothing here redraws or duplicates them
         * and the artwork is never recoloured.
         *
         * Until the file is added and `ASSETS_READY` is set, an honest, clearly
         * labelled dark fallback is shown and no file request is made (so the
         * console and network stay clean). The dark surface below is what the user
         * sees if the real image ever fails to load.
         */
        const showBackground = ASSETS_READY;
</script>

<div class="background-layer" aria-hidden="true">
        {#if showBackground}
                <img class="bg-img" src={BRAND_ASSETS.background} alt="" decoding="async" />
        {:else}
                <span class="asset-note">{PLACEHOLDER_NOTE} — Home background</span>
        {/if}
</div>

<style>
        .background-layer {
                position: absolute;
                inset: 0;
                z-index: var(--z-background);
                overflow: hidden;
                background: var(--surface-void);
        }

        .bg-img {
                display: block;
                width: 100%;
                height: 100%;
                object-fit: cover;
                object-position: center;
        }

        /* Neutral label so it is always clear when the artwork is still missing. */
        .asset-note {
                position: absolute;
                left: var(--space-4);
                bottom: var(--space-4);
                font-size: 11px;
                letter-spacing: 0.12em;
                text-transform: uppercase;
                color: var(--text-muted);
                opacity: 0.65;
        }

        /* Bounded edge vignette — keeps foreground text legible without
           recolouring the supplied artwork (transparent across the centre). */
        .background-layer::after {
                content: '';
                position: absolute;
                inset: 0;
                background: radial-gradient(140% 110% at 50% 40%, transparent 45%, rgba(0, 0, 0, 0.45) 100%);
                pointer-events: none;
        }
</style>
