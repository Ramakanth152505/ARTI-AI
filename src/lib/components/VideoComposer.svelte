<script lang="ts">
        /**
         * Video composer — compact by design.
         *
         * It matches the ARTI AI Home composer's visual language and keeps the
         * workspace width, but is deliberately shorter: a single-line-tall input that
         * grows only as the user types. Every control below performs a real operation:
         *
         *  - prompt input (auto-sizing, ⌘/Ctrl+Enter to queue, Enter for a newline)
         *  - style shortcut (opens the shared style library; the active style is a chip)
         *  - aspect ratio, resolution, frame rate and duration selectors
         *  - clip length for the duration plan
         *  - optional advanced settings (camera, lighting, palette, negative, audio)
         *  - reference attachment (validated; honestly reported as not uploaded)
         *  - prompt intelligence actions (Improve, Scene breakdown, Shot list) which
         *    report the honest unavailable state with no model configured
         *  - Queue generation (replaced by Stop while a supported job runs)
         *  - Save prompt and Save as project defaults
         *
         * The queue button is disabled for an empty prompt and never submits one.
         */
        import Icon from './Icon.svelte';
        import Menu from './Menu.svelte';
        import type { MenuItem } from './menu.types';
        import {
                ASPECT_RATIOS,
                DURATION_PRESETS,
                FRAME_RATES,
                LANGUAGES,
                RESOLUTIONS,
                describeDimensions,
                formatDuration,
                findAspectRatio,
                findFrameRate,
                findResolution
        } from '#lib/videos/formats';
        import { MAX_REFERENCE_BYTES, REFERENCE_ACCEPT, describeReferenceTypes } from '#lib/videos/config';
        import { toReferenceAttachments } from '#lib/videos/references';
        import { formatBytes } from '#lib/shared/text';
        import type { AttachedReference, ComposerStage } from '#lib/videos/videosState.svelte';

        interface Props {
                draft: string;
                styleName?: string;
                aspectRatio: string;
                resolution: string;
                frameRate: number;
                durationSeconds: number;
                clipSeconds: number;
                negativePrompt: string;
                cameraMovement: string;
                lighting: string;
                palette: string;
                audioNotes: string;
                references: AttachedReference[];
                generating: boolean;
                stage: ComposerStage;
                progress: number | null;
                configured: boolean;
                promptConfigured: boolean;
                /** Number of segments the current duration needs. */
                segmentCount: number;
                /** Whether the chosen resolution exceeds the native long edge. */
                needsUpscale: boolean;
                nativeLongEdge: number;
                maxClipSeconds: number;
                /** Measured width×height for the current settings. */
                outputDimensions: string;
                oninput: (value: string) => void;
                onopenstyles: () => void;
                onclearstyle: () => void;
                onaspect: (value: string) => void;
                onresolution: (value: string) => void;
                onframerate: (value: number) => void;
                onduration: (value: number) => void;
                onclipseconds: (value: number) => void;
                onnegative: (value: string) => void;
                oncamera: (value: string) => void;
                onlighting: (value: string) => void;
                onpalette: (value: string) => void;
                onaudio: (value: string) => void;
                onreferences: (files: AttachedReference[]) => void;
                ongeneration: () => void;
                onstop: () => void;
                onimprove: () => void;
                onbreakdown: () => void;
                onshotlist: () => void;
                onsaveprompt: () => void;
                onsavedefaults: () => void;
                onnotice: (notice: string) => void;
        }

        let {
                draft,
                styleName,
                aspectRatio,
                resolution,
                frameRate,
                durationSeconds,
                clipSeconds,
                negativePrompt,
                cameraMovement,
                lighting,
                palette,
                audioNotes,
                references,
                generating,
                stage,
                progress,
                configured,
                promptConfigured,
                segmentCount,
                needsUpscale,
                nativeLongEdge,
                maxClipSeconds,
                outputDimensions,
                oninput,
                onopenstyles,
                onclearstyle,
                onaspect,
                onresolution,
                onframerate,
                onduration,
                onclipseconds,
                onnegative,
                oncamera,
                onlighting,
                onpalette,
                onaudio,
                onreferences,
                ongeneration,
                onstop,
                onimprove,
                onbreakdown,
                onshotlist,
                onsaveprompt,
                onsavedefaults,
                onnotice
        }: Props = $props();

        let textarea = $state<HTMLTextAreaElement | null>(null);
        let settingsOpen = $state(false);

        let canGenerate = $derived(draft.trim().length > 0 && !generating);

        let ratioItems = $derived.by((): MenuItem[] =>
                ASPECT_RATIOS.map((o) => ({
                        id: o.value,
                        label: `${o.value} · ${o.label}`,
                        note: o.value === aspectRatio ? 'Active' : o.orientation
                }))
        );
        let resolutionItems = $derived.by((): MenuItem[] =>
                RESOLUTIONS.map((o) => ({
                        id: o.value,
                        label: o.label,
                        note: o.value === resolution ? 'Active' : `${o.width}×${o.height}`
                }))
        );
        let frameRateItems = $derived.by((): MenuItem[] =>
                FRAME_RATES.map((o) => ({
                        id: String(o.value),
                        label: o.label,
                        note: o.value === frameRate ? 'Active' : o.usage
                }))
        );
        let durationItems = $derived.by((): MenuItem[] =>
                DURATION_PRESETS.map((p) => ({
                        id: String(p.seconds),
                        label: p.label,
                        note: p.seconds === durationSeconds ? 'Active' : p.note
                }))
        );

        function autosize(): void {
                if (!textarea) return;
                textarea.style.height = 'auto';
                textarea.style.height = `${Math.min(textarea.scrollHeight, 150)}px`;
        }

        function onKeydown(event: KeyboardEvent): void {
                // ⌘/Ctrl+Enter queues the generation; a bare Enter inserts a newline so a
                // long cinematic prompt can be written across lines.
                if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
                        event.preventDefault();
                        if (canGenerate) ongeneration();
                }
        }

        function onFile(event: Event): void {
                const input = event.currentTarget as HTMLInputElement;
                const files = input.files ? Array.from(input.files) : [];
                input.value = '';
                if (files.length === 0) return;
                const created = toReferenceAttachments(files);
                const rejected = created.filter((a) => !a.accepted);
                if (rejected.length) onnotice(rejected[0].detail ?? 'That file cannot be attached.');
                onreferences([...references, ...created.filter((a) => a.accepted)]);
        }
</script>

<div class="composer-wrap">
        {#if styleName}
                <div class="active-style" role="status">
                        <Icon name="palette" size={13} />
                        <span class="active-name">{styleName}</span>
                        <button class="active-remove" aria-label="Remove style {styleName}" onclick={onclearstyle}>
                                <Icon name="close" size={12} />
                        </button>
                </div>
        {/if}

        {#if references.length}
                <div class="ref-row">
                        {#each references as ref (ref.id)}
                                <span class="ref-chip" title={`${ref.name} · ${formatBytes(ref.size)}`}>
                                        <Icon name={ref.kind === 'video' ? 'film' : ref.kind === 'document' ? 'document' : 'image'} size={12} />
                                        <span class="ref-name">{ref.name}</span>
                                        <span class="ref-size">{formatBytes(ref.size)}</span>
                                        <span class="ref-state">not uploaded</span>
                                </span>
                        {/each}
                </div>
        {/if}

        <form
                class="composer"
                onsubmit={(e) => {
                        e.preventDefault();
                        if (canGenerate) ongeneration();
                }}
        >
                <label class="input-row">
                        <span class="visually-hidden">Describe the video you want to create</span>
                        <textarea
                                bind:this={textarea}
                                value={draft}
                                class="input"
                                rows="1"
                                placeholder="Describe the shot — subject, action, camera, lighting…"
                                oninput={(e) => {
                                        oninput((e.currentTarget as HTMLTextAreaElement).value);
                                        autosize();
                                }}
                                onkeydown={onKeydown}
                        ></textarea>
                </label>

                {#if generating}
                        <div class="progress-row" role="status">
                                <span class="stage">{stage === 'generating' ? 'Generating' : stage === 'queued' ? 'Queued' : 'Preparing'}</span>
                                {#if progress !== null}
                                        <span class="bar" aria-hidden="true"><span class="fill" style={`width:${progress}%`}></span></span>
                                        <span class="pct">{progress}%</span>
                                {:else}
                                        <span class="pct muted">stage-based</span>
                                {/if}
                        </div>
                {/if}

                <div class="toolbar">
                        <button type="button" class="tool" title="Open the shared style library" onclick={onopenstyles}>
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
                                onselect={(id) => onaspect(id)}
                        />

                        <Menu
                                label="Resolution"
                                triggerLabel={findResolution(resolution).value}
                                triggerIcon="film"
                                align="left"
                                placement="up"
                                items={resolutionItems}
                                onselect={(id) => onresolution(id)}
                        />

                        <Menu
                                label="Frame rate"
                                triggerLabel={`${frameRate}`}
                                triggerIcon="clock"
                                align="left"
                                placement="up"
                                items={frameRateItems}
                                onselect={(id) => onframerate(Number(id))}
                        />

                        <Menu
                                label="Duration"
                                triggerLabel={formatDuration(durationSeconds)}
                                triggerIcon="clock2"
                                align="left"
                                placement="up"
                                items={durationItems}
                                onselect={(id) => onduration(Number(id))}
                        />

                        <button
                                type="button"
                                class="tool"
                                class:on={settingsOpen}
                                aria-expanded={settingsOpen}
                                title="Advanced settings"
                                onclick={() => (settingsOpen = !settingsOpen)}
                        >
                                <Icon name="tools" size={16} />
                                <span class="tool-label">Options</span>
                        </button>

                        {#if generating}
                                <button type="button" class="stop" onclick={onstop} aria-label="Stop generating">
                                        <Icon name="stop" size={15} />
                                        <span class="stop-label">Stop</span>
                                </button>
                        {:else}
                                <button type="submit" class="send" disabled={!canGenerate} aria-label="Queue generation" title={canGenerate ? 'Queue generation' : 'Write a prompt first'}>
                                        <Icon name="send" size={17} stroke={1.9} />
                                </button>
                        {/if}
                </div>

                {#if settingsOpen}
                        <div class="settings">
                                <div class="setting-row">
                                        <label class="setting">
                                                <span class="setting-label">Clip length</span>
                                                <input
                                                        type="range"
                                                        min="1"
                                                        max={maxClipSeconds}
                                                        value={clipSeconds}
                                                        oninput={(e) => onclipseconds(Number((e.currentTarget as HTMLInputElement).value))}
                                                />
                                                <span class="setting-value">{clipSeconds}s</span>
                                        </label>
                                        <label class="setting stack">
                                                <span class="setting-label">Camera movement</span>
                                                <input type="text" value={cameraMovement} placeholder="e.g. slow dolly in" oninput={(e) => oncamera((e.currentTarget as HTMLInputElement).value)} />
                                        </label>
                                </div>
                                <div class="setting-row">
                                        <label class="setting stack">
                                                <span class="setting-label">Lighting</span>
                                                <input type="text" value={lighting} placeholder="e.g. low-key rim light" oninput={(e) => onlighting((e.currentTarget as HTMLInputElement).value)} />
                                        </label>
                                        <label class="setting stack">
                                                <span class="setting-label">Colour palette</span>
                                                <input type="text" value={palette} placeholder="e.g. teal and amber" oninput={(e) => onpalette((e.currentTarget as HTMLInputElement).value)} />
                                        </label>
                                </div>
                                <label class="setting stack">
                                        <span class="setting-label">Audio and dialogue</span>
                                        <input type="text" value={audioNotes} placeholder="Dialogue, narration, music, sound effects" oninput={(e) => onaudio((e.currentTarget as HTMLInputElement).value)} />
                                </label>
                                <label class="setting stack">
                                        <span class="setting-label">Negative constraints</span>
                                        <input type="text" value={negativePrompt} placeholder="What to exclude (optional)" oninput={(e) => onnegative((e.currentTarget as HTMLInputElement).value)} />
                                </label>
                                <div class="setting-stats">
                                        <span>Planned {formatDuration(durationSeconds)} → {segmentCount} clip{segmentCount === 1 ? '' : 's'} at up to {clipSeconds}s</span>
                                        <span>Output {outputDimensions}</span>
                                </div>
                        </div>
                {/if}

                <div class="actions-row">
                        <label class="tool attach" title={`Attach a reference (${describeReferenceTypes()}, up to ${formatBytes(MAX_REFERENCE_BYTES)})`}>
                                <Icon name="paperclip" size={15} />
                                <span class="tool-label">Reference</span>
                                <input type="file" accept={REFERENCE_ACCEPT} class="visually-hidden" onchange={onFile} />
                        </label>
                        <button type="button" class="tool" disabled={!promptConfigured || !draft.trim()} title={promptConfigured ? 'Improve this prompt' : 'Prompt intelligence needs the ARTI intelligence service'} onclick={onimprove}>
                                <Icon name="sparkle" size={15} />
                                <span class="tool-label">Improve Prompt</span>
                        </button>
                        <button type="button" class="tool" disabled={!promptConfigured} title={promptConfigured ? 'Create a scene breakdown' : 'Needs the intelligence service'} onclick={onbreakdown}>
                                <Icon name="layers" size={15} />
                                <span class="tool-label">Scene Breakdown</span>
                        </button>
                        <button type="button" class="tool" disabled={!promptConfigured} title={promptConfigured ? 'Generate a shot list' : 'Needs the intelligence service'} onclick={onshotlist}>
                                <Icon name="list" size={15} />
                                <span class="tool-label">Shot List</span>
                        </button>
                        <button type="button" class="tool" disabled={!draft.trim()} onclick={onsaveprompt}>
                                <Icon name="archive" size={15} />
                                <span class="tool-label">Save Prompt</span>
                        </button>
                        <button type="button" class="tool" onclick={onsavedefaults} title="Save these settings as the project defaults">
                                <Icon name="check" size={15} />
                                <span class="tool-label">Save as Defaults</span>
                        </button>
                </div>

                <p class="hint">
                        <span>⌘/Ctrl + Enter queues · Enter for a new line</span>
                        {#if !configured}
                                <span class="hint-note">
                                        No video service is connected, so generation is disabled. The queue, projects, folders and
                                        prompts all work and are saved.
                                </span>
                        {:else if needsUpscale}
                                <span class="hint-note">
                                        {resolution} exceeds the {nativeLongEdge}px native long edge — this needs a separate upscale stage.
                                </span>
                        {:else}
                                <span class="hint-note">Styles add guidance; your prompt stays in the final text.</span>
                        {/if}
                </p>
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

        .active-remove {
                display: grid;
                place-items: center;
                width: 18px;
                height: 18px;
                border-radius: 50%;
                color: var(--text-secondary);
        }

        .active-remove:hover {
                color: var(--gold-bright);
                background: rgba(201, 154, 54, 0.16);
        }

        .ref-row {
                display: flex;
                flex-wrap: wrap;
                gap: var(--space-2);
                margin-bottom: var(--space-2);
        }

        .ref-chip {
                display: inline-flex;
                align-items: center;
                gap: 6px;
                padding: 3px 9px;
                border-radius: var(--radius-pill);
                border: 1px solid var(--border-hair);
                background: rgba(255, 255, 255, 0.04);
                font-size: 11.5px;
                color: var(--text-secondary);
                max-width: 320px;
        }

        .ref-name {
                max-width: 150px;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
        }

        .ref-size,
        .ref-state {
                color: var(--text-muted);
        }

        .ref-state {
                font-style: italic;
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

        .input-row {
                display: block;
                padding: var(--space-3) var(--space-5) var(--space-1);
        }

        .input {
                display: block;
                width: 100%;
                min-height: var(--videos-composer-min-height, 46px);
                max-height: var(--videos-composer-max-height, 150px);
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

        .progress-row {
                display: flex;
                align-items: center;
                gap: var(--space-2);
                padding: 0 var(--space-5) var(--space-1);
                font-size: 11.5px;
                color: var(--gold-bright);
        }

        .stage {
                font-weight: 600;
        }

        .bar {
                flex: 1;
                height: 4px;
                border-radius: 2px;
                background: rgba(255, 255, 255, 0.08);
                overflow: hidden;
        }

        .fill {
                display: block;
                height: 100%;
                background: linear-gradient(90deg, var(--gold-deep), var(--gold-bright));
        }

        .pct {
                min-width: 68px;
                text-align: right;
        }

        .pct.muted {
                color: var(--text-muted);
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

        .setting-row {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: var(--space-3);
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
                min-width: 92px;
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
                min-width: 30px;
                text-align: right;
                color: var(--gold-bright);
        }

        .setting-stats {
                display: flex;
                flex-wrap: wrap;
                justify-content: space-between;
                gap: var(--space-3);
                font-size: 11.5px;
                color: var(--text-muted);
        }

        .actions-row {
                display: flex;
                flex-wrap: wrap;
                gap: var(--space-1);
                padding: var(--space-1) var(--space-4) 0;
                border-top: 1px solid var(--border-hair);
        }

        .attach {
                cursor: pointer;
        }

        .hint {
                display: flex;
                align-items: flex-start;
                justify-content: space-between;
                gap: var(--space-3);
                margin: 0;
                padding: var(--space-2) var(--space-5) var(--space-3);
                font-size: 11px;
                color: var(--text-muted);
        }

        .hint-note {
                max-width: 62%;
                text-align: right;
        }

        @media (max-width: 900px) {
                .setting-row {
                        grid-template-columns: 1fr;
                }
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
