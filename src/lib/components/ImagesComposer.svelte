<script lang="ts">
        /**
         * Images composer — compact by design.
         *
         * It matches the ARTI AI Home composer's visual language and keeps the
         * workspace width, but is deliberately shorter: a single-line-tall input that
         * grows only as the user types, with one toolbar row.
         *
         * Contents, all of which actually work:
         *  - prompt input (auto-sizing, Enter to generate, Shift+Enter for a newline)
         *  - reference-image attach (validated, honestly reported as not uploaded)
         *  - style shortcut (opens the library; the active style is shown as a chip)
         *  - prompt enhancement (real request; honest unavailable state with no service)
         *  - aspect ratio and image-count controls, clamped to what the service accepts
         *  - Generate, replaced by Stop while a supported job is running
         *
         * The Generate button is disabled for an empty prompt, and never submits one.
         */
        import Icon from './Icon.svelte';
        import Menu from './Menu.svelte';
        import type { MenuItem } from './menu.types';
        import {
                REFERENCE_ACCEPT,
                MAX_REFERENCE_BYTES,
                describeReferenceTypes,
                isImageModelConfigured,
                isPromptModelConfigured,
                maxImageCount,
                supportsNegativePrompt,
                supportsReferenceImage
        } from '#lib/images/config';
        import { ASPECT_RATIOS, type AspectRatio, type ImageStyle } from '#lib/images/styles';
        import { toReferenceAttachments } from '#lib/images/references';
        import { formatBytes } from '#lib/shared/text';
        import type { ImageAttachment } from '#lib/images/types';

        interface Props {
                draft: string;
                selectedStyle: ImageStyle | null;
                aspectRatio: AspectRatio;
                imageCount: number;
                negativePrompt: string;
                reference: ImageAttachment | null;
                generating: boolean;
                /** True while a prompt enhancement is in flight. */
                enhancing: boolean;
                /** Whether a generation service is configured. */
                configured: boolean;
                oninput: (value: string) => void;
                onselectstyle: (id: string) => void;
                onclearstyle: () => void;
                onopenstyles: () => void;
                onaspect: (value: AspectRatio) => void;
                oncount: (value: number) => void;
                onnegative: (value: string) => void;
                onreference: (attachment: ImageAttachment | null) => void;
                ongenerate: () => void;
                onstop: () => void;
                onenhance: () => void;
                onnotice: (notice: string) => void;
        }

        let {
                draft,
                selectedStyle,
                aspectRatio,
                imageCount,
                negativePrompt,
                reference,
                generating,
                enhancing,
                configured,
                oninput,
                onselectstyle,
                onclearstyle,
                onopenstyles,
                onaspect,
                oncount,
                onnegative,
                onreference,
                ongenerate,
                onstop,
                onenhance,
                onnotice
        }: Props = $props();

        let textarea = $state<HTMLTextAreaElement | null>(null);
        let ratioMenu = $state(false);
        let settingsOpen = $state(false);

        let promptModel = isPromptModelConfigured();
        let referenceSupported = supportsReferenceImage();
        let negativeSupported = supportsNegativePrompt();
        let countMax = maxImageCount();

        let canGenerate = $derived(draft.trim().length > 0 && !generating && !enhancing);

        let ratioItems = $derived.by((): MenuItem[] =>
                ASPECT_RATIOS.map((option) => ({
                        id: option.value,
                        label: `${option.value} · ${option.label}`,
                        note: option.value === aspectRatio ? 'Active' : undefined
                }))
        );

        function autosize(): void {
                if (!textarea) return;
                textarea.style.height = 'auto';
                // Compact ceiling: the composer grows a little for multi-line prompts but
                // never becomes the oversized band the specification rules out.
                const max = 132;
                textarea.style.height = `${Math.min(textarea.scrollHeight, max)}px`;
        }

        function onKeydown(event: KeyboardEvent): void {
                if (event.key === 'Enter' && !event.shiftKey) {
                        event.preventDefault();
                        if (canGenerate) ongenerate();
                }
        }

        function onFile(event: Event): void {
                const input = event.currentTarget as HTMLInputElement;
                const files = input.files ? Array.from(input.files) : [];
                input.value = '';
                if (files.length === 0) return;

                // Only the first file is kept; extras are reported rather than dropped.
                const created = toReferenceAttachments(files, true);
                const accepted = created.find((a) => a.status === 'selected') ?? null;
                const rejected = created.filter((a) => a.status === 'rejected');
                if (rejected.length) {
                        onnotice(rejected[0].detail ?? 'That file cannot be attached.');
                }
                onreference(accepted);
        }

        function removeReference(): void {
                onreference(null);
        }
</script>

<div class="composer-wrap">
        {#if selectedStyle}
                <div class="active-style" role="status">
                        <Icon name="palette" size={13} />
                        <span class="active-name">{selectedStyle.name}</span>
                        <button class="active-remove" aria-label="Remove {selectedStyle.name}" onclick={onclearstyle}>
                                <Icon name="close" size={12} />
                        </button>
                </div>
        {/if}

        {#if reference}
                <div class="ref-chip" class:rejected={reference.status === 'rejected'}>
                        {#if reference.previewUrl}
                                <img src={reference.previewUrl} alt="" width="22" height="22" />
                        {:else}
                                <Icon name="image" size={13} />
                        {/if}
                        <span class="ref-name">{reference.name}</span>
                        <span class="ref-size">{formatBytes(reference.size)}</span>
                        <button class="ref-remove" aria-label="Remove reference image {reference.name}" onclick={removeReference}>
                                <Icon name="close" size={12} />
                        </button>
                </div>
        {/if}

        <form
                class="composer"
                onsubmit={(e) => {
                        e.preventDefault();
                        if (canGenerate) ongenerate();
                }}
        >
                <label class="input-row">
                        <span class="visually-hidden">Describe the image you want</span>
                        <textarea
                                bind:this={textarea}
                                value={draft}
                                class="input"
                                rows="1"
                                placeholder="Describe the image you want to create…"
                                oninput={(e) => {
                                        oninput((e.currentTarget as HTMLTextAreaElement).value);
                                        autosize();
                                }}
                                onkeydown={onKeydown}
                        ></textarea>
                </label>

                <div class="toolbar">
                        {#if referenceSupported}
                                <label class="tool" title={`Attach a reference image (${describeReferenceTypes()}, up to ${formatBytes(MAX_REFERENCE_BYTES)})`}>
                                        <Icon name="paperclip" size={16} />
                                        <span class="tool-label">Reference</span>
                                        <input type="file" accept={REFERENCE_ACCEPT} class="visually-hidden" onchange={onFile} />
                                </label>
                        {/if}

                        <button type="button" class="tool" title="Open the style library" onclick={onopenstyles}>
                                <Icon name="palette" size={16} />
                                <span class="tool-label">Styles</span>
                        </button>

                        <Menu
                                label="Aspect ratio"
                                triggerLabel={aspectRatio}
                                triggerIcon="ratio"
                                align="left"
                                placement="up"
                                items={ratioItems}
                                onselect={(id) => onaspect(id as AspectRatio)}
                        />

                        <button
                                type="button"
                                class="tool"
                                class:on={settingsOpen}
                                aria-expanded={settingsOpen}
                                title="Output settings"
                                onclick={() => (settingsOpen = !settingsOpen)}
                        >
                                <Icon name="tools" size={16} />
                                <span class="tool-label">Options</span>
                        </button>

                        <button
                                type="button"
                                class="tool"
                                class:on={enhancing}
                                disabled={!promptModel || enhancing || !draft.trim()}
                                title={promptModel ? 'Improve this prompt' : 'Prompt enhancement needs the ARTI intelligence service'}
                                onclick={onenhance}
                        >
                                <Icon name="sparkle" size={16} />
                                <span class="tool-label">{enhancing ? 'Enhancing…' : 'Enhance'}</span>
                        </button>

                        {#if generating}
                                <button type="button" class="stop" onclick={onstop} aria-label="Stop generating">
                                        <Icon name="stop" size={15} />
                                        <span class="stop-label">Stop</span>
                                </button>
                        {:else}
                                <button
                                        type="submit"
                                        class="send"
                                        disabled={!canGenerate}
                                        aria-label="Generate image"
                                        title={canGenerate ? 'Generate' : 'Enter a prompt to generate'}
                                >
                                        <Icon name="send" size={17} stroke={1.9} />
                                </button>
                        {/if}
                </div>

                {#if settingsOpen}
                        <div class="settings">
                                {#if countMax > 1}
                                        <label class="setting">
                                                <span class="setting-label">Images</span>
                                                <input
                                                        type="range"
                                                        min="1"
                                                        max={countMax}
                                                        value={imageCount}
                                                        oninput={(e) => oncount(Number((e.currentTarget as HTMLInputElement).value))}
                                                />
                                                <span class="setting-value">{imageCount}</span>
                                        </label>
                                {:else}
                                        <p class="setting-note">One image per request while no service reports a higher limit.</p>
                                {/if}

                                {#if negativeSupported}
                                        <label class="setting stack">
                                                <span class="setting-label">Negative prompt</span>
                                                <input
                                                        type="text"
                                                        value={negativePrompt}
                                                        placeholder="What to avoid (optional)"
                                                        oninput={(e) => onnegative((e.currentTarget as HTMLInputElement).value)}
                                                />
                                        </label>
                                {/if}

                                <p class="setting-note">
                                        {#if configured}
                                                Aspect ratio and count are sent to the configured service.
                                        {:else}
                                                No image service is connected, so generation is disabled. Prompts and styles still work.
                                        {/if}
                                </p>
                        </div>
                {/if}

                {#if !promptModel}
                        <p class="hint">
                                <span>Enter to generate · Shift+Enter for a new line</span>
                                <span class="hint-note">Prompt enhancement is unavailable until the intelligence service is configured.</span>
                        </p>
                {:else}
                        <p class="hint">
                                <span>Enter to generate · Shift+Enter for a new line</span>
                                <span class="hint-note">Styles add guidance; your subject stays in the final prompt.</span>
                        </p>
                {/if}
        </form>
</div>

<style>
        .composer-wrap {
                width: 100%;
        }

        .active-style {
                display: inline-flex;
                align-items: center;
                gap: 6px;
                margin-bottom: var(--space-2);
                padding: 4px 6px 4px 10px;
                border-radius: var(--radius-pill);
                border: 1px solid var(--border-gold);
                background: rgba(201, 154, 54, 0.1);
                color: var(--gold-bright);
                font-size: 12px;
                max-width: 100%;
        }

        .active-name {
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
                max-width: 260px;
        }

        .active-remove,
        .ref-remove {
                display: grid;
                place-items: center;
                width: 18px;
                height: 18px;
                border-radius: 50%;
                color: var(--text-secondary);
        }

        .active-remove:hover,
        .ref-remove:hover {
                color: var(--gold-bright);
                background: rgba(201, 154, 54, 0.16);
        }

        .ref-chip {
                display: inline-flex;
                align-items: center;
                gap: 7px;
                margin-bottom: var(--space-2);
                padding: 3px 6px 3px 6px;
                border-radius: var(--radius-pill);
                border: 1px solid var(--border-hair);
                background: rgba(255, 255, 255, 0.04);
                font-size: 11.5px;
                color: var(--text-secondary);
                max-width: 100%;
        }

        .ref-chip.rejected {
                border-color: rgba(212, 120, 96, 0.45);
                color: #e0a08c;
        }

        .ref-chip img {
                width: 22px;
                height: 22px;
                border-radius: var(--radius-sm);
                object-fit: cover;
        }

        .ref-name {
                max-width: 180px;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
        }

        .ref-size {
                color: var(--text-muted);
        }

        .composer {
                width: 100%;
                background: var(--surface-input);
                border: 1px solid var(--border-gold);
                border-radius: var(--radius-lg);
                box-shadow: var(--shadow-panel), inset 0 0 30px rgba(0, 0, 0, 0.35);
                backdrop-filter: blur(8px);
                transition: border-color 160ms ease, box-shadow 160ms ease;
        }

        .composer:focus-within {
                border-color: var(--gold);
                box-shadow: var(--shadow-panel), var(--glow-gold);
        }

        /* Compact: a single line tall initially, growing only with the content. */
        .input-row {
                display: block;
                padding: var(--space-3) var(--space-5) var(--space-1);
        }

        .input {
                display: block;
                width: 100%;
                min-height: var(--images-composer-min-height, 46px);
                max-height: var(--images-composer-max-height, 132px);
                resize: none;
                border: none;
                background: transparent;
                color: var(--text-primary);
                font: inherit;
                font-size: 14.5px;
                line-height: 1.5;
                overflow-y: auto;
                padding: 0;
        }

        .input::placeholder {
                color: var(--text-muted);
        }

        .input:focus {
                outline: none;
        }

        .toolbar {
                display: flex;
                align-items: center;
                gap: var(--space-1);
                padding: var(--space-1) var(--space-3) var(--space-2) var(--space-4);
                flex-wrap: wrap;
        }

        .tool {
                display: inline-flex;
                align-items: center;
                gap: 6px;
                padding: 6px 10px;
                border-radius: var(--radius-pill);
                border: 1px solid transparent;
                color: var(--text-muted);
                font-size: 12.5px;
                font-weight: 500;
        }

        .tool:hover:not(:disabled) {
                color: var(--gold-bright);
                background: rgba(201, 154, 54, 0.08);
                border-color: var(--border-hair);
        }

        .tool.on {
                color: var(--gold-bright);
                border-color: var(--border-gold);
                background: rgba(201, 154, 54, 0.14);
        }

        .tool:disabled {
                opacity: 0.45;
                cursor: not-allowed;
        }

        .tool-label {
                white-space: nowrap;
        }

        .send {
                display: grid;
                place-items: center;
                width: 40px;
                height: 40px;
                margin-left: auto;
                flex-shrink: 0;
                border-radius: 50%;
                background: linear-gradient(160deg, var(--gold-bright), var(--gold-deep));
                color: var(--text-on-gold);
                box-shadow: var(--glow-gold);
                transition: transform 140ms ease, opacity 160ms ease;
        }

        .send:hover:not(:disabled) {
                transform: translateY(-1px);
        }

        .send:disabled {
                opacity: 0.45;
                cursor: not-allowed;
                box-shadow: none;
        }

        .stop {
                display: inline-flex;
                align-items: center;
                gap: 6px;
                margin-left: auto;
                padding: 8px 15px;
                border-radius: var(--radius-pill);
                border: 1px solid rgba(212, 120, 96, 0.55);
                background: rgba(180, 85, 63, 0.16);
                color: #f0b5a6;
                font-size: 13px;
                font-weight: 600;
        }

        .stop:hover {
                background: rgba(180, 85, 63, 0.26);
        }

        .settings {
                display: flex;
                flex-direction: column;
                gap: var(--space-2);
                padding: var(--space-2) var(--space-5) var(--space-3);
                border-top: 1px solid var(--border-hair);
        }

        .setting {
                display: flex;
                align-items: center;
                gap: var(--space-3);
                font-size: 12.5px;
                color: var(--text-secondary);
        }

        .setting.stack {
                flex-direction: column;
                align-items: stretch;
                gap: 5px;
        }

        .setting-label {
                min-width: 96px;
        }

        .setting input[type='range'] {
                flex: 1;
                accent-color: var(--gold);
        }

        .setting input[type='text'] {
                padding: 8px 11px;
                border-radius: var(--radius-sm);
                border: 1px solid var(--border-hair);
                background: rgba(255, 255, 255, 0.03);
                color: var(--text-primary);
                font: inherit;
                font-size: 13px;
        }

        .setting input[type='text']:focus {
                outline: none;
                border-color: var(--border-gold);
        }

        .setting-value {
                min-width: 20px;
                text-align: right;
                color: var(--gold-bright);
        }

        .setting-note {
                margin: 0;
                font-size: 11.5px;
                line-height: 1.5;
                color: var(--text-muted);
        }

        .hint {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: var(--space-3);
                margin: 0;
                padding: 0 var(--space-5) var(--space-3);
                font-size: 11px;
                color: var(--text-muted);
        }

        .hint-note {
                text-align: right;
        }

        @media (max-width: 720px) {
                .tool-label {
                        display: none;
                }

                .tool {
                        padding: 8px;
                }

                .hint-note {
                        display: none;
                }

                .input-row {
                        padding: var(--space-3) var(--space-4) var(--space-1);
                }
        }
</style>
