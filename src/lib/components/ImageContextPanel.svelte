<script lang="ts">
        /**
         * Images context panel.
         *
         * Closed by default and never permanently consuming workspace width. Every
         * section renders only data that actually exists: the selected style, the real
         * request settings, the live job state and metadata reported by the service.
         * Where a subsystem does not exist (memory, prompt history) it says so instead
         * of showing invented entries.
         */
        import Icon from './Icon.svelte';
        import { relativeTime } from '#lib/shared/text';
        import { findStyle, findAspectRatio, type AspectRatio } from '#lib/images/styles';
        import { countReadyAssets } from '#lib/images/search';
        import type { ImageConversation, ImageMessage } from '#lib/images/types';
        import type { WorkspaceScope } from '#lib/shared/scope';

        interface Props {
                open: boolean;
                conversation: ImageConversation | null;
                messages: ImageMessage[];
                /** The composer's live settings, which may not be saved on a conversation yet. */
                settings: {
                        styleId: string | null;
                        aspectRatio: AspectRatio;
                        count: number;
                        negativePrompt: string;
                        hasReference: boolean;
                };
                scope: WorkspaceScope;
                configured: boolean;
                promptConfigured: boolean;
                sharedStorageConfigured: boolean;
                /** Live job state for the status section. */
                stage: string;
                progress: number | null;
                onclose: () => void;
        }

        let {
                open,
                conversation,
                messages,
                settings,
                scope,
                configured,
                promptConfigured,
                sharedStorageConfigured,
                stage,
                progress,
                onclose
        }: Props = $props();

        let style = $derived(findStyle(settings.styleId));
        let ratio = $derived(findAspectRatio(settings.aspectRatio));
        let imageCount = $derived(countReadyAssets(messages));

        /** Jobs actually observed in this conversation's messages. */
        let jobIds = $derived.by(() => {
                const ids = new Set<string>();
                for (const message of messages) {
                        for (const asset of message.assets) if (asset.jobId) ids.add(asset.jobId);
                }
                return [...ids];
        });
</script>

<aside class="context" aria-label="Image context" class:hidden={!open}>
        <header class="head">
                <h2>Context</h2>
                <button class="close" aria-label="Close context panel" onclick={onclose}>
                        <Icon name="close" size={16} />
                </button>
        </header>

        <div class="body">
                <section aria-labelledby="ctx-style">
                        <h3 id="ctx-style"><Icon name="palette" size={13} /> Style</h3>
                        {#if style}
                                <div class="style-card">
                                        <span class="style-name">{style.name}</span>
                                        <span class="style-summary">{style.summary}</span>
                                        <span class="style-template">{style.promptTemplate}</span>
                                </div>
                        {:else}
                                <p class="empty">No style selected. The prompt is sent exactly as written.</p>
                        {/if}
                </section>

                <section aria-labelledby="ctx-settings">
                        <h3 id="ctx-settings"><Icon name="ratio" size={13} /> Request</h3>
                        <dl class="facts">
                                <dt>Aspect</dt>
                                <dd>{ratio.value} · {ratio.label}</dd>
                                <dt>Images</dt>
                                <dd>{settings.count} per request</dd>
                                <dt>Negative</dt>
                                <dd>{settings.negativePrompt ? settings.negativePrompt : 'None'}</dd>
                                <dt>Reference</dt>
                                <dd>{settings.hasReference ? 'Attached' : 'None'}</dd>
                        </dl>
                </section>

                <section aria-labelledby="ctx-job">
                        <h3 id="ctx-job"><Icon name="bolt" size={13} /> Generation</h3>
                        <dl class="facts">
                                <dt>State</dt>
                                <dd><span class="stage" data-stage={stage}>{stage}</span></dd>
                                {#if progress !== null}
                                        <dt>Progress</dt>
                                        <dd>{progress}%</dd>
                                {/if}
                                <dt>Images here</dt>
                                <dd>{imageCount}</dd>
                        </dl>
                        {#if jobIds.length}
                                <p class="job-ids">Job ids: {jobIds.join(', ')}</p>
                        {/if}
                </section>

                {#if conversation}
                        <section aria-labelledby="ctx-conversation">
                                <h3 id="ctx-conversation"><Icon name="info" size={13} /> Conversation</h3>
                                <dl class="facts">
                                        <dt>Title</dt>
                                        <dd>{conversation.title}{conversation.titleIsAuto ? ' (auto)' : ''}</dd>
                                        <dt>Created</dt>
                                        <dd>{relativeTime(conversation.createdAt)}</dd>
                                        <dt>Updated</dt>
                                        <dd>{relativeTime(conversation.updatedAt)}</dd>
                                        <dt>Messages</dt>
                                        <dd>{messages.length}</dd>
                                        <dt>Owner scope</dt>
                                        <dd>{scope.userId ?? 'Local workspace (no authenticated user)'}</dd>
                                </dl>
                        </section>
                {/if}

                <section aria-labelledby="ctx-services">
                        <h3 id="ctx-services"><Icon name="shield" size={13} /> Services</h3>
                        <ul class="flags">
                                <li class:off={!configured}>
                                        <Icon name={configured ? 'check' : 'close'} size={12} />
                                        <span>Image generation {configured ? 'configured' : 'not configured'}</span>
                                </li>
                                <li class:off={!promptConfigured}>
                                        <Icon name={promptConfigured ? 'check' : 'close'} size={12} />
                                        <span>Prompt intelligence {promptConfigured ? 'configured' : 'not configured'}</span>
                                </li>
                                <li class:off={!sharedStorageConfigured}>
                                        <Icon name={sharedStorageConfigured ? 'check' : 'close'} size={12} />
                                        <span>{sharedStorageConfigured ? 'Shared storage configured' : 'Browser-local storage only'}</span>
                                </li>
                        </ul>
                        <p class="empty">
                                {#if sharedStorageConfigured}
                                        Images are scoped to the workspace; access must be enforced by the backend, not by hiding
                                        controls.
                                {:else}
                                        Images live in this browser only. They are not shared between the two workspace profiles, and
                                        no cross-user boundary is implied.
                                {/if}
                        </p>
                </section>
        </div>
</aside>

<style>
        .context {
                display: flex;
                flex-direction: column;
                min-height: 0;
                height: 100%;
                width: 100%;
                background: var(--surface-panel-solid);
                border-left: 1px solid var(--border-hair);
        }

        .head {
                display: flex;
                align-items: center;
                justify-content: space-between;
                height: var(--topbar-height);
                flex-shrink: 0;
                padding: 0 var(--space-4);
                border-bottom: 1px solid var(--border-hair);
        }

        h2 {
                margin: 0;
                font-family: var(--font-display);
                font-size: 15px;
                font-weight: 600;
                letter-spacing: 0.08em;
                color: var(--gold-bright);
        }

        .close {
                display: grid;
                place-items: center;
                width: 30px;
                height: 30px;
                border-radius: var(--radius-sm);
                color: var(--text-secondary);
        }

        .close:hover {
                color: var(--gold-bright);
                background: rgba(201, 154, 54, 0.1);
        }

        .body {
                flex: 1;
                min-height: 0;
                overflow-y: auto;
                padding: var(--space-4);
                display: flex;
                flex-direction: column;
                gap: var(--space-5);
        }

        section {
                display: flex;
                flex-direction: column;
                gap: var(--space-2);
        }

        h3 {
                display: flex;
                align-items: center;
                gap: 6px;
                margin: 0;
                font-size: 10.5px;
                font-weight: 600;
                letter-spacing: 0.14em;
                text-transform: uppercase;
                color: var(--gold);
        }

        .style-card {
                display: flex;
                flex-direction: column;
                gap: 5px;
                padding: var(--space-3);
                border-radius: var(--radius-sm);
                border: 1px solid var(--border-hair);
                background: rgba(201, 154, 54, 0.05);
        }

        .style-name {
                font-size: 13px;
                font-weight: 600;
                color: var(--text-primary);
        }

        .style-summary {
                font-size: 11.5px;
                color: var(--text-secondary);
        }

        .style-template {
                font-size: 11px;
                line-height: 1.55;
                color: var(--text-muted);
                border-top: 1px solid var(--border-hair);
                padding-top: 6px;
        }

        .facts {
                display: grid;
                grid-template-columns: auto 1fr;
                gap: 5px var(--space-3);
                margin: 0;
                font-size: 12.5px;
        }

        .facts dt {
                color: var(--text-muted);
        }

        .facts dd {
                margin: 0;
                color: var(--text-secondary);
                overflow-wrap: anywhere;
        }

        .stage {
                text-transform: capitalize;
                color: var(--gold-bright);
        }

        .job-ids {
                margin: 0;
                font-size: 10.5px;
                color: var(--text-muted);
                overflow-wrap: anywhere;
        }

        .flags {
                list-style: none;
                margin: 0;
                padding: 0;
                display: flex;
                flex-direction: column;
                gap: 5px;
                font-size: 12px;
        }

        .flags li {
                display: flex;
                align-items: center;
                gap: 6px;
                color: var(--text-secondary);
        }

        .flags li.off {
                color: var(--text-muted);
        }

        .empty {
                margin: 0;
                font-size: 12px;
                line-height: 1.55;
                color: var(--text-muted);
        }
</style>
