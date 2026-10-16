<script lang="ts">
        /**
         * Video preview dialog.
         *
         * Shows a real, service-provided file only. Every metadata line is MEASURED
         * from the asset (resolution, frame rate, duration, size, format) rather than
         * echoed from what the user requested. When a field was not reported by the
         * backend it reads "not reported", never a guess.
         *
         * Deliberately does not preload or buffer the whole file: the `<video>` element
         * streams, so a large clip is never pulled into memory just to preview it.
         */
        import Icon from './Icon.svelte';
        import Menu from './Menu.svelte';
        import { findExportFormat, formatDuration, formatTimecode } from '#lib/videos/formats';
        import { EXPORT_FORMATS } from '#lib/videos/formats';
        import { formatBytes, relativeTime } from '#lib/shared/text';
        import { copyText, downloadUrl } from '#lib/videos/actions';
        import type { MediaAsset, PromptVersion } from '#lib/videos/types';

        interface Props {
                asset: MediaAsset;
                promptVersion: PromptVersion | null;
                styleName: string | null;
                folderPath: string;
                projectName: string;
                onclose: () => void;
                onrequestexport: (format: string) => void;
                onnotice: (notice: string) => void;
        }

        let {
                asset,
                promptVersion,
                styleName,
                folderPath,
                projectName,
                onclose,
                onrequestexport,
                onnotice
        }: Props = $props();

        let dialog = $state<HTMLDivElement | null>(null);

        const exportItems = EXPORT_FORMATS.map((f) => ({
                id: f.id,
                label: f.label,
                icon: 'download' as const,
                note: f.implemented ? undefined : 'not implemented',
                disabled: !f.implemented
        }));

        $effect(() => {
                const previous = document.activeElement as HTMLElement | null;
                queueMicrotask(() => dialog?.querySelector<HTMLElement>('button')?.focus());
                function onKeydown(event: KeyboardEvent): void {
                        if (event.key === 'Escape') {
                                event.stopPropagation();
                                onclose();
                        }
                }
                document.addEventListener('keydown', onKeydown, true);
                return () => {
                        document.removeEventListener('keydown', onKeydown, true);
                        previous?.focus?.();
                };
        });

        async function copyPrompt(): Promise<void> {
                if (!promptVersion) return;
                const ok = await copyText(promptVersion.composedPrompt);
                onnotice(ok ? 'Prompt copied.' : 'The prompt could not be copied.');
        }

        function download(): void {
                if (!asset.url) return;
                const ext = asset.mimeType?.split('/')[1] ?? 'mp4';
                const ok = downloadUrl(asset.url, `${asset.name.replace(/[^\w-]+/g, '-')}.${ext}`);
                if (!ok) onnotice('The download could not be started.');
        }
</script>

<div class="overlay">
        <button class="scrim" aria-label="Close preview" onclick={onclose}></button>
        <div class="panel" bind:this={dialog} role="dialog" aria-modal="true" aria-labelledby="preview-title">
                <header class="head">
                        <h2 id="preview-title">{asset.name}</h2>
                        <button class="close" aria-label="Close preview" onclick={onclose}><Icon name="close" size={16} /></button>
                </header>

                <div class="stage">
                        {#if asset.url}
                                <!-- Streams from the real URL; nothing is loaded into memory up front. -->
                                <video src={asset.url} controls preload="none" playsinline>
                                        <!-- No caption track exists: these are silent generated clips, so none is fabricated. -->
                                        <track kind="captions" src="data:text/vtt,WEBVTT" label="No captions" />
                                </video>
                        {:else}
                                <p class="missing">This asset has no file URL, so it cannot be played.</p>
                        {/if}
                </div>

                <div class="meta">
                        <dl>
                                <div><dt>Resolution</dt><dd>{asset.width && asset.height ? `${asset.width} × ${asset.height}` : 'not reported'}</dd></div>
                                <div><dt>Duration</dt><dd>{asset.producedDurationSeconds != null ? formatTimecode(asset.producedDurationSeconds) : 'not reported'}</dd></div>
                                <div><dt>Frame rate</dt><dd>{asset.frameRate ? `${asset.frameRate} fps` : 'not reported'}</dd></div>
                                <div><dt>Frames</dt><dd>{asset.frameCount ? asset.frameCount.toLocaleString() : 'not reported'}</dd></div>
                                <div><dt>Format</dt><dd>{asset.mimeType ?? 'not reported'}</dd></div>
                                <div><dt>Size</dt><dd>{asset.bytes ? formatBytes(asset.bytes) : 'not reported'}</dd></div>
                                <div><dt>Created</dt><dd>{relativeTime(asset.createdAt)}</dd></div>
                                <div><dt>Project</dt><dd>{projectName}{folderPath ? ` / ${folderPath}` : ''}</dd></div>
                                <div><dt>Style</dt><dd>{styleName ?? 'none'}</dd></div>
                                <div><dt>Status</dt><dd>{asset.approved ? 'approved take' : asset.draft ? 'draft' : 'ready'}</dd></div>
                        </dl>

                        {#if promptVersion}
                                <details class="prompt">
                                        <summary>Generation prompt (version {new Date(promptVersion.createdAt).toLocaleString()})</summary>
                                        <pre>{promptVersion.composedPrompt}</pre>
                                        <div class="prompt-actions">
                                                <button class="chip" onclick={copyPrompt}><Icon name="copy" size={13} /> Copy prompt</button>
                                        </div>
                                        {#if promptVersion.originalPrompt && promptVersion.originalPrompt !== promptVersion.composedPrompt}
                                                <details class="orig">
                                                        <summary>Original text before the style was applied</summary>
                                                        <pre>{promptVersion.originalPrompt}</pre>
                                                </details>
                                        {/if}
                                </details>
                        {:else}
                                <p class="muted">No prompt version is recorded for this asset.</p>
                        {/if}
                </div>

                <footer class="foot">
                        <button class="chip" onclick={download} disabled={!asset.url}><Icon name="download" size={14} /> Download original</button>
                        <Menu label="Export as" triggerLabel="Export" triggerIcon="download" align="right" placement="up" items={exportItems} onselect={(id) => onrequestexport(id)} />
                </footer>
        </div>
</div>

<style>
        .overlay {
                position: fixed;
                inset: 0;
                z-index: var(--z-modal);
                display: grid;
                place-items: center;
                padding: var(--space-5);
        }

        .scrim {
                position: absolute;
                inset: 0;
                background: rgba(0, 0, 0, 0.72);
                border: none;
        }

        .panel {
                position: relative;
                display: flex;
                flex-direction: column;
                width: min(860px, 100%);
                max-height: 90vh;
                overflow: hidden;
                background: var(--surface-panel-solid);
                border: 1px solid var(--border-gold);
                border-radius: var(--radius-md);
                box-shadow: var(--shadow-panel);
        }

        .head {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: var(--space-3);
                padding: var(--space-3) var(--space-5);
                border-bottom: 1px solid var(--border-hair);
        }

        h2 {
                margin: 0;
                font-family: var(--font-display);
                font-size: 17px;
                color: var(--text-primary);
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
        }

        .close {
                display: grid;
                place-items: center;
                width: 30px;
                height: 30px;
                border-radius: var(--radius-sm);
                color: var(--text-secondary);
                flex-shrink: 0;
        }

        .close:hover {
                color: var(--gold-bright);
                background: rgba(201, 154, 54, 0.1);
        }

        .stage {
                background: #000;
                display: grid;
                place-items: center;
                max-height: 46vh;
        }

        video {
                width: 100%;
                max-height: 46vh;
                display: block;
        }

        .missing {
                margin: var(--space-6);
                color: var(--text-muted);
                font-size: 13px;
        }

        .meta {
                flex: 1;
                min-height: 0;
                overflow-y: auto;
                padding: var(--space-4) var(--space-5);
        }

        dl {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
                gap: var(--space-2) var(--space-4);
                margin: 0;
        }

        dl div {
                display: flex;
                justify-content: space-between;
                gap: var(--space-3);
                padding: 5px 0;
                border-bottom: 1px dotted var(--border-hair);
                font-size: 12.5px;
        }

        dt {
                color: var(--text-muted);
        }

        dd {
                margin: 0;
                color: var(--text-primary);
                text-align: right;
        }

        .prompt {
                margin-top: var(--space-4);
                font-size: 12.5px;
                color: var(--text-secondary);
        }

        .prompt summary,
        .orig summary {
                cursor: pointer;
                color: var(--gold);
        }

        pre {
                margin: var(--space-2) 0 0;
                padding: var(--space-3);
                border-radius: var(--radius-sm);
                border: 1px solid var(--border-hair);
                background: rgba(255, 255, 255, 0.03);
                color: var(--text-secondary);
                font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
                font-size: 11.5px;
                line-height: 1.6;
                white-space: pre-wrap;
                word-break: break-word;
        }

        .prompt-actions {
                margin-top: var(--space-2);
        }

        .muted {
                color: var(--text-muted);
                font-size: 12.5px;
        }

        .foot {
                display: flex;
                justify-content: flex-end;
                gap: var(--space-2);
                padding: var(--space-3) var(--space-5);
                border-top: 1px solid var(--border-hair);
        }

        .chip {
                display: inline-flex;
                align-items: center;
                gap: 6px;
                padding: 7px 13px;
                border-radius: var(--radius-pill);
                border: 1px solid var(--border-hair);
                color: var(--text-secondary);
                font-size: 12.5px;
        }

        .chip:hover:not(:disabled) {
                color: var(--gold-bright);
                border-color: var(--border-gold);
        }

        .chip:disabled {
                opacity: 0.5;
                cursor: not-allowed;
        }

        @media (max-width: 620px) {
                dl {
                        grid-template-columns: 1fr;
                }
        }
</style>
