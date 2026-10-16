<script lang="ts">
        /**
         * Region container for the Videos workspace.
         *
         * Owns the layout (secondary navigation / working canvas / context panel), the
         * view switching, the dialogs (create project, delete confirmations, move,
         * pending style), the shared style library modal and the wiring between the
         * `videos` state object and the presentational pieces. No persistence or model
         * logic lives here.
         *
         * What is real here: every button calls a state method that persists through the
         * repository. What is honest here: with no video service configured the queue
         * shows an explicit configuration state, no clip is invented, and progress is
         * shown only when the backend reports it.
         */
        import Icon from './Icon.svelte';
        import Menu from './Menu.svelte';
        import Dialog from './Dialog.svelte';
        import type { MenuItem } from './menu.types';
        import VideoComposer from './VideoComposer.svelte';
        import VideoStyleLibrary from './VideoStyleLibrary.svelte';
        import VideoPreview from './VideoPreview.svelte';
        import VideosHeader from './VideosHeader.svelte';
        import type { IconName } from '#lib/data/icons';
        import { videos, type VideoView } from '#lib/videos/videosState.svelte';
        import { VIDEO_STATUS } from '#lib/videos/config';
        import { findExportFormat } from '#lib/videos/formats';
        import {
                ASPECT_RATIOS,
                describeDimensions,
                findAspectRatio,
                formatDuration,
                formatTimecode,
                languageLabel,
                LANGUAGES
        } from '#lib/videos/formats';
        import { stageLabel, jobProgress, canRetryJob, canCancelJob } from '#lib/videos/queue';
        import { relativeTime, formatBytes, formatCount } from '#lib/shared/text';
        import { copyText, downloadText } from '#lib/videos/actions';
        import type { Folder, GenerationJob, MediaAsset } from '#lib/videos/types';

        const VIEWS: { id: VideoView; label: string; icon: IconName }[] = [
                { id: 'studio', label: 'Studio', icon: 'film' },
                { id: 'projects', label: 'Projects', icon: 'grid' },
                { id: 'series', label: 'Series', icon: 'layers' },
                { id: 'movies', label: 'Movies', icon: 'movie' },
                { id: 'folders', label: 'Folders', icon: 'folder' },
                { id: 'styles', label: 'Styles', icon: 'palette' },
                { id: 'chat', label: 'Prompt Chat', icon: 'brain' },
                { id: 'queue', label: 'Generation Queue', icon: 'queue' },
                { id: 'library', label: 'Rendered Videos', icon: 'play' },
                { id: 'drafts', label: 'Drafts', icon: 'edit' },
                { id: 'assets', label: 'Reusable Assets', icon: 'image2' },
                { id: 'settings', label: 'Settings', icon: 'tools' }
        ];

        let stylesOpen = $state(false);
        let contextOpen = $state(false);
        let navOpen = $state(false);

        // --- Dialogs ------------------------------------------------------------
        type DialogKind =
                | null
                | { kind: 'new-project' }
                | { kind: 'delete-project'; id: string }
                | { kind: 'delete-folder'; id: string }
                | { kind: 'move-folder'; id: string }
                | { kind: 'new-series' }
                | { kind: 'new-movie-part' }
                | { kind: 'new-scene' }
                | { kind: 'rename'; target: 'project' | 'folder' | 'asset'; id: string; current: string }
                | { kind: 'share'; id: string };

        let dialog = $state<DialogKind>(null);
        let form = $state({ name: '', description: '', genre: '', premise: '', kind: 'project' as const });
        let moveTarget = $state<string | null>(null);
        let notice = $state('');
        let projectSearch = $state('');

        /** Pinned-first, search-filtered project list for the Projects view. */
        let filteredProjects = $derived.by(() => {
                const q = projectSearch.replace(/\s+/g, ' ').trim().toLowerCase();
                const list = [...videos.projects].sort(
                        (a, b) => Number(b.pinned) - Number(a.pinned) || b.updatedAt.localeCompare(a.updatedAt)
                );
                if (!q) return list;
                return list.filter((p) => p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q));
        });

        // --- Preview ------------------------------------------------------------
        let previewId = $state<string | null>(null);

        $effect(() => {
                void videos.init();
                return () => videos.dispose();
        });

        $effect(() => {
                notice = videos.notice;
        });

        let activeAsset = $derived(previewId ? (videos.assets.find((a) => a.id === previewId) ?? null) : null);

        function closeNotice(): void {
                notice = '';
                videos.clearNotice();
        }

        function openNewProject(): void {
                form.name = '';
                form.description = '';
                dialog = { kind: 'new-project' };
        }

        function submitDialog(): void {
                const current = dialog;
                if (!current) return;
                switch (current.kind) {
                        case 'new-project':
                                void videos.createProject({ name: form.name, kind: form.kind, description: form.description }).then(() => {
                                        videos.view = 'projects';
                                });
                                break;
                        case 'delete-project':
                                void videos.deleteProject(current.id);
                                break;
                        case 'delete-folder':
                                void videos.deleteFolder(current.id, true);
                                break;
                        case 'move-folder':
                                void videos.moveFolder(current.id, moveTarget);
                                break;
                        case 'new-series':
                                void videos.createSeries({
                                        title: form.name,
                                        description: form.description,
                                        genre: form.genre,
                                        premise: form.premise
                                });
                                break;
                        case 'new-movie-part':
                                void videos.createMoviePart(form.name);
                                break;
                        case 'new-scene':
                                void videos.createScene({ title: form.name, description: form.description });
                                break;
                        case 'rename':
                                if (current.target === 'project') void videos.renameProject(current.id, form.name);
                                else if (current.target === 'folder') void videos.renameFolder(current.id, form.name);
                                else void videos.renameAsset(current.id, form.name);
                                break;
                        case 'share':
                                videosSharePlaceholder();
                                break;
                }
                dialog = null;
        }

        /**
         * Sharing is not implemented: no account system exists yet. Recording an
         * explicit unavailable message is honest; granting a permission we cannot
         * enforce would not be.
         */
        function videosSharePlaceholder(): void {
                videos.notice =
                        'Sharing needs the workspace permission service, which is not configured yet. Nothing was shared.';
        }

        function openFolderMenuItems(folder: Folder): MenuItem[] {
                return [
                        { id: 'open', label: 'Open', icon: 'folder-open' },
                        { id: 'sub', label: 'New subfolder', icon: 'folder-plus' },
                        { id: 'rename', label: 'Rename', icon: 'edit' },
                        { id: 'move', label: 'Move…', icon: 'move' },
                        { id: 'up', label: 'Move up', icon: 'arrow-up' },
                        { id: 'down', label: 'Move down', icon: 'arrow-down' },
                        { id: 'pin', label: folder.pinned ? 'Unpin' : 'Pin', icon: 'pin' },
                        { id: 'archive', label: folder.archived ? 'Restore' : 'Archive', icon: 'archive' },
                        { id: 'delete', label: 'Delete', icon: 'trash', danger: true }
                ];
        }

        function onFolderMenu(folder: Folder, action: string): void {
                switch (action) {
                        case 'open':
                                videos.openFolder(folder.id);
                                break;
                        case 'sub':
                                void videos.createFolder({ name: 'New folder', parentId: folder.id });
                                break;
                        case 'rename':
                                form.name = folder.name;
                                dialog = { kind: 'rename', target: 'folder', id: folder.id, current: folder.name };
                                break;
                        case 'move':
                                moveTarget = folder.parentId;
                                dialog = { kind: 'move-folder', id: folder.id };
                                break;
                        case 'up':
                                void videos.reorderFolder(folder.id, 'up');
                                break;
                        case 'down':
                                void videos.reorderFolder(folder.id, 'down');
                                break;
                        case 'pin':
                                void videos.toggleFolderPin(folder.id);
                                break;
                        case 'archive':
                                void videos.setFolderArchived(folder.id, !folder.archived);
                                break;
                        case 'delete':
                                dialog = { kind: 'delete-folder', id: folder.id };
                                break;
                }
        }

        function jobMenuItems(job: GenerationJob): MenuItem[] {
                const items: MenuItem[] = [];
                if (canRetryJob(job)) items.push({ id: 'retry', label: 'Retry', icon: 'refresh-cw' });
                if (!job.assetIds.length && (job.stage === 'draft' || job.stage === 'failed' || job.stage === 'cancelled')) {
                        items.push({ id: 'run', label: 'Send to generator', icon: 'send' });
                }
                if (canCancelJob(job)) items.push({ id: 'cancel', label: 'Cancel', icon: 'stop' });
                items.push({ id: 'log', label: 'View stage log', icon: 'list' });
                items.push({ id: 'remove', label: 'Remove from queue', icon: 'trash', danger: true });
                return items;
        }

        function onJobMenu(job: GenerationJob, action: string): void {
                switch (action) {
                        case 'retry':
                                void videos.retryJob(job.id);
                                break;
                        case 'run':
                                void videos.runJob(job.id);
                                break;
                        case 'cancel':
                                videos.cancelJob(job.id);
                                break;
                        case 'log':
                                videos.view = 'queue';
                                break;
                        case 'remove':
                                void videos.deleteJob(job.id);
                                break;
                }
        }

        function exportMetadata(): void {
                if (!videos.activeProjectId) return;
                const json = videos.exportProjectMetadata(videos.activeProjectId);
                const name = `${videos.activeProject?.name.replace(/[^\w-]+/g, '-').toLowerCase() ?? 'project'}-metadata.json`;
                downloadText(json, name, 'application/json');
                void videos.requestExport('', 'metadata-json');
        }

        function folderOptionItems(excludeId: string): MenuItem[] {
                const items: MenuItem[] = [{ id: '__root__', label: 'Project root', icon: 'grid' }];
                for (const { folder, depth } of videos.folderTree) {
                        if (folder.id === excludeId) continue;
                        items.push({
                                id: folder.id,
                                label: `${'— '.repeat(depth)}${folder.name}`,
                                icon: 'folder'
                        });
                }
                return items;
        }

        let dialogTitle = $derived(
                dialog?.kind === 'new-project'
                        ? 'New project'
                        : dialog?.kind === 'delete-project'
                                ? 'Delete project'
                                : dialog?.kind === 'delete-folder'
                                        ? 'Delete folder'
                                        : dialog?.kind === 'move-folder'
                                                ? 'Move folder'
                                                : dialog?.kind === 'new-series'
                                                        ? 'New series'
                                                        : dialog?.kind === 'new-movie-part'
                                                                ? 'New movie part'
                                                                : dialog?.kind === 'new-scene'
                                                                        ? 'New scene'
                                                                        : dialog?.kind === 'rename'
                                                                                ? 'Rename'
                                                                                : dialog?.kind === 'share'
                                                                                        ? 'Share'
                                                                                        : ''
        );

        let dialogConfirmLabel = $derived(
                dialog?.kind === 'delete-project' || dialog?.kind === 'delete-folder'
                        ? 'Delete'
                        : dialog?.kind === 'move-folder'
                                ? 'Move'
                                : 'Create'
        );

        let dialogDestructive = $derived(dialog?.kind === 'delete-project' || dialog?.kind === 'delete-folder');

        let dialogDescription = $derived.by(() => {
                const current = dialog;
                if (current?.kind === 'delete-project') {
                        const project = videos.projects.find((p) => p.id === current.id);
                        return `Deleting “${project?.name}” removes its folders, series, scenes, shots, prompts and job records. Rendered clips are removed from this library too. This cannot be undone.`;
                }
                if (current?.kind === 'delete-folder') {
                        const impact = videos.folderDeleteImpact(current.id);
                        if (!impact) return '';
                        return `This folder contains ${formatCount(impact.subfolders, 'subfolder')}, ${formatCount(impact.projects, 'project')} and ${formatCount(impact.assets, 'clip')}. Nested subfolders are removed; projects and clips inside are moved to the project root rather than deleted.`;
                }
                if (current?.kind === 'share') {
                        return 'Sharing is not implemented yet — there is no account or workspace permission service configured.';
                }
                return undefined;
        });

        let dialogConfirmDisabled = $derived(
                (dialog?.kind === 'new-project' ||
                        dialog?.kind === 'new-series' ||
                        dialog?.kind === 'new-movie-part' ||
                        dialog?.kind === 'new-scene' ||
                        dialog?.kind === 'rename') &&
                        !form.name.trim()
        );
</script>

<div class="videos-shell">
        <nav class="vnav" class:open={navOpen} aria-label="Videos sections">
                <div class="vnav-head">
                        <span class="vnav-title">Videos</span>
                        <button class="vnav-close" aria-label="Close sections" onclick={() => (navOpen = false)}>
                                <Icon name="close" size={15} />
                        </button>
                </div>
                <ul>
                        {#each VIEWS as view (view.id)}
                                <li>
                                        <button
                                                class="vnav-item"
                                                class:on={videos.view === view.id}
                                                aria-current={videos.view === view.id ? 'page' : undefined}
                                                onclick={() => {
                                                        videos.view = view.id;
                                                        navOpen = false;
                                                }}
                                        >
                                                <Icon name={view.icon} size={16} />
                                                <span>{view.label}</span>
                                                {#if view.id === 'queue' && videos.queueSummary.total}
                                                        <span class="vnav-count">{videos.queueSummary.total}</span>
                                                {:else if view.id === 'library' && videos.readyAssets.length}
                                                        <span class="vnav-count">{videos.readyAssets.length}</span>
                                                {/if}
                                        </button>
                                </li>
                        {/each}
                </ul>
        </nav>

        <div class="vmain">
                <VideosHeader
                        onopenstyles={() => (stylesOpen = true)}
                        onopenmenu={() => (navOpen = true)}
                        onnewproject={openNewProject}
                        configured={videos.videoModelConfigured}
                        ontogglecontext={() => (contextOpen = !contextOpen)}
                        contextOpen={contextOpen}
                />

                {#if notice}
                        <div class="notice" role="status">
                                <Icon name="info" size={14} />
                                <span>{notice}</span>
                                <button aria-label="Dismiss" onclick={closeNotice}><Icon name="close" size={13} /></button>
                        </div>
                {/if}

                <div class="vbody" class:with-context={contextOpen}>
                        <section class="canvas" aria-live="polite">
                                {#if videos.loading}
                                        <p class="empty-note">Loading your productions…</p>
                                {:else if videos.view === 'studio'}
                                        <div class="studio">
                                                <div class="studio-head">
                                                        {#if videos.activeProject}
                                                                <div class="studio-titles">
                                                                        <span class="eyebrow">{videos.activeProject.kind}</span>
                                                                        <h2>{videos.activeProject.name}</h2>
                                                                        <p class="studio-desc">
                                                                                {videos.activeProject.description || 'No description yet.'}
                                                                        </p>

                                                                </div>
                                                                <Menu
                                                                        label="Project actions"
                                                                        triggerLabel="Project"
                                                                        triggerIcon="more"
                                                                        align="right"
                                                                        items={[
                                                                                { id: 'rename', label: 'Rename project', icon: 'edit' },
                                                                                { id: 'pin', label: videos.activeProject.pinned ? 'Unpin' : 'Pin to top', icon: 'pin' },
                                                                                { id: 'duplicate', label: 'Duplicate project', icon: 'copy' },
                                                                                { id: 'metadata', label: 'Export metadata (JSON)', icon: 'download' },
                                                                                { id: 'archive', label: 'Archive project', icon: 'archive' },
                                                                                { id: 'delete', label: 'Delete project', icon: 'trash', danger: true }
                                                                        ]}
                                                                        onselect={(id) => {
                                                                                const project = videos.activeProject;
                                                                                if (!project) return;
                                                                                if (id === 'rename') {
                                                                                        form.name = project.name;
                                                                                        dialog = { kind: 'rename', target: 'project', id: project.id, current: project.name };
                                                                                } else if (id === 'pin') void videos.toggleProjectPin(project.id);
                                                                                else if (id === 'duplicate') void videos.duplicateProject(project.id);
                                                                                else if (id === 'metadata') exportMetadata();
                                                                                else if (id === 'archive') void videos.setProjectArchived(project.id, true);
                                                                                else if (id === 'delete') dialog = { kind: 'delete-project', id: project.id };
                                                                        }}
                                                                />
                                                        {:else}
                                                                <div class="studio-titles">
                                                                        <h2>No project open</h2>
                                                                        <p class="studio-desc">Create a project to organise a film, a series or a set of clips.</p>
                                                                </div>
                                                                <button class="btn-gold" onclick={openNewProject}>
                                                                        <Icon name="plus" size={15} /> New project
                                                                </button>
                                                        {/if}
                                                </div>

                                                {#if videos.activeProject}
                                                        <div class="stats">
                                                                <div class="stat">
                                                                        <span class="stat-value">{formatDuration(videos.measuredSeconds)}</span>
                                                                        <span class="stat-label">measured (ready clips)</span>
                                                                </div>
                                                                <div class="stat">
                                                                        <span class="stat-value">{formatDuration(videos.plannedSeconds)}</span>
                                                                        <span class="stat-label">planned (queue)</span>
                                                                </div>
                                                                <div class="stat">
                                                                        <span class="stat-value">{videos.readyAssets.length}</span>
                                                                        <span class="stat-label">rendered clips</span>
                                                                </div>
                                                                <div class="stat">
                                                                        <span class="stat-value">{videos.projectFolders.length}</span>
                                                                        <span class="stat-label">folders</span>
                                                                </div>
                                                                <div class="stat">
                                                                        <span class="stat-value">{videos.queueSummary.active + videos.queueSummary.queued}</span>
                                                                        <span class="stat-label">active / queued</span>
                                                                </div>
                                                        </div>

                                                        <div class="panel">
                                                                <div class="panel-head">
                                                                        <h3>Structure</h3>
                                                                        <div class="panel-actions">
                                                                                <button class="chip" onclick={() => (dialog = { kind: 'new-scene' })}>
                                                                                        <Icon name="plus" size={14} /> Scene
                                                                                </button>
                                                                                <button class="chip" onclick={() => (dialog = { kind: 'new-series' })}>
                                                                                        <Icon name="layers" size={14} /> Series
                                                                                </button>
                                                                                <button class="chip" onclick={() => (dialog = { kind: 'new-movie-part' })}>
                                                                                        <Icon name="movie" size={14} /> Movie part
                                                                                </button>
                                                                        </div>
                                                                </div>
                                                                <div class="structure">
                                                                        <div class="structure-col">
                                                                                <h4>Folders</h4>
                                                                                {#if videos.visibleFolders.length === 0}
                                                                                        <p class="muted-note">No folders here yet.</p>
                                                                                {:else}
                                                                                        <ul class="mini-list">
                                                                                                {#each videos.visibleFolders as folder (folder.id)}
                                                                                                        <li>
                                                                                                                <button class="mini-item" onclick={() => videos.openFolder(folder.id)}>
                                                                                                                        <Icon name="folder" size={14} />
                                                                                                                        <span>{folder.name}</span>
                                                                                                                </button>
                                                                                                        </li>
                                                                                                {/each}
                                                                                        </ul>
                                                                                {/if}
                                                                        </div>
                                                                        <div class="structure-col">
                                                                                <h4>Series</h4>
                                                                                {#if videos.activeProjectSeries.length === 0}
                                                                                        <p class="muted-note">No series yet.</p>
                                                                                {:else}
                                                                                        <ul class="mini-list">
                                                                                                {#each videos.activeProjectSeries as s (s.id)}
                                                                                                        <li>
                                                                                                                <button class="mini-item" onclick={() => { videos.view = 'series'; videos.selectSeries(s.id); }}>
                                                                                                                        <Icon name="layers" size={14} />
                                                                                                                        <span>{s.title}</span>
                                                                                                                </button>
                                                                                                        </li>
                                                                                                {/each}
                                                                                        </ul>
                                                                                {/if}
                                                                        </div>
                                                                        <div class="structure-col">
                                                                                <h4>Movie parts</h4>
                                                                                {#if videos.activeProjectMovieParts.length === 0}
                                                                                        <p class="muted-note">No movie parts yet.</p>
                                                                                {:else}
                                                                                        <ul class="mini-list">
                                                                                                {#each videos.activeProjectMovieParts as p (p.id)}
                                                                                                        <li>
                                                                                                                <button class="mini-item" onclick={() => { videos.view = 'movies'; videos.selectMoviePart(p.id); }}>
                                                                                                                        <span>Part {p.number} — {p.title}</span>
                                                                                                                </button>
                                                                                                        </li>
                                                                                                {/each}
                                                                                        </ul>
                                                                                {/if}
                                                                        </div>
                                                                        <div class="structure-col">
                                                                                <h4>Recent scenes</h4>
                                                                                {#if videos.projectScenes.length === 0}
                                                                                        <p class="muted-note">No scenes yet.</p>
                                                                                {:else}
                                                                                        <ul class="mini-list">
                                                                                                {#each videos.projectScenes.slice(0, 6) as scene (scene.id)}
                                                                                                        <li>
                                                                                                                <button class="mini-item" onclick={() => { videos.view = 'series'; videos.selectScene(scene.id); }}>
                                                                                                                        <Icon name="film" size={14} />
                                                                                                                        <span>Scene {scene.number} — {scene.title}</span>
                                                                                                                </button>
                                                                                                        </li>
                                                                                                {/each}
                                                                                        </ul>
                                                                                {/if}
                                                                        </div>
                                                                </div>
                                                        </div>
                                                {/if}
                                        </div>
                                {:else if videos.view === 'projects'}
                                        <div class="projects-view">
                                                <div class="view-head">
                                                        <h2>Projects</h2>
                                                        <input class="search" type="search" placeholder="Search projects…" value={projectSearch} oninput={(e) => (projectSearch = (e.currentTarget as HTMLInputElement).value)} />
                                                        <button class="btn-gold" onclick={openNewProject}><Icon name="plus" size={15} /> New</button>
                                                </div>
                                                {#if filteredProjects.length === 0}
                                                        <p class="empty-note">No projects match. Create one to begin a production.</p>
                                                {:else}
                                                        <ul class="card-grid">
                                                                {#each filteredProjects as project (project.id)}
                                                                        <li class="pcard" class:on={project.id === videos.activeProjectId}>
                                                                                <button class="pcard-main" onclick={() => { void videos.openProject(project.id); videos.view = 'studio'; }}>
                                                                                        <span class="pcard-kind">{project.kind}</span>
                                                                                        <span class="pcard-name">{project.name}</span>
                                                                                        <span class="pcard-desc">{project.description || 'No description'}</span>
                                                                                        <span class="pcard-meta">
                                                                                                {findAspectRatio(project.defaultAspectRatio).value} · {project.defaultResolution} · {project.defaultFrameRate} fps
                                                                                        </span>
                                                                                        <span class="pcard-time">Updated {relativeTime(project.updatedAt)}</span>
                                                                                </button>
                                                                                <div class="pcard-actions">
                                                                                        <button class="icon-mini" aria-label="Pin project" aria-pressed={project.pinned} onclick={() => videos.toggleProjectPin(project.id)}>
                                                                                                <Icon name="pin" size={14} />
                                                                                        </button>
                                                                                        <Menu
                                                                                                label="Project actions"
                                                                                                triggerIcon="more"
                                                                                                align="right"
                                                                                                items={[
                                                                                                        { id: 'rename', label: 'Rename', icon: 'edit' },
                                                                                                        { id: 'duplicate', label: 'Duplicate', icon: 'copy' },
                                                                                                        { id: 'metadata', label: 'Export metadata', icon: 'download' },
                                                                                                        { id: 'archive', label: project.archived ? 'Restore' : 'Archive', icon: 'archive' },
                                                                                                        { id: 'delete', label: 'Delete', icon: 'trash', danger: true }
                                                                                                ]}
                                                                                                onselect={(id) => {
                                                                                                        if (id === 'rename') {
                                                                                                                form.name = project.name;
                                                                                                                dialog = { kind: 'rename', target: 'project', id: project.id, current: project.name };
                                                                                                        } else if (id === 'duplicate') void videos.duplicateProject(project.id);
                                                                                                        else if (id === 'metadata') {
                                                                                                                void videos.openProject(project.id).then(() => exportMetadata());
                                                                                                        } else if (id === 'archive') void videos.setProjectArchived(project.id, !project.archived);
                                                                                                        else if (id === 'delete') dialog = { kind: 'delete-project', id: project.id };
                                                                                                }}
                                                                                        />
                                                                                </div>
                                                                        </li>
                                                                {/each}
                                                        </ul>
                                                {/if}
                                        </div>
                                {:else if videos.view === 'folders'}
                                        <div class="folders-view">
                                                <div class="view-head">
                                                        <h2>Folders</h2>
                                                        <button class="chip" onclick={() => videos.createFolder({ name: 'New folder', parentId: videos.activeFolderId })}>
                                                                <Icon name="folder-plus" size={14} /> New folder
                                                        </button>
                                                </div>
                                                {#if !videos.activeProject}
                                                        <p class="empty-note">Open a project to organise it into folders.</p>
                                                {:else}
                                                        <nav class="crumbs" aria-label="Folder path">
                                                                {#each videos.crumbs as crumb, i (crumb.id ?? 'root')}
                                                                        {#if i > 0}<span class="crumb-sep">/</span>{/if}
                                                                        <button class="crumb" class:last={i === videos.crumbs.length - 1} onclick={() => videos.openFolder(crumb.id)}>
                                                                                {crumb.name}
                                                                        </button>
                                                                {/each}
                                                        </nav>

                                                        <div class="folder-layout">
                                                                <div class="tree" role="tree" aria-label="Project folders">
                                                                        {#if videos.folderTree.length === 0}
                                                                                <p class="muted-note">This project has no folders yet.</p>
                                                                        {:else}
                                                                                {#each videos.folderTree as node (node.folder.id)}
                                                                                        <div
                                                                                                class="tree-row"
                                                                                                class:on={node.folder.id === videos.activeFolderId}
                                                                                                style={`padding-left:${8 + node.depth * 16}px`}
                                                                                                role="treeitem"
                                                                                                aria-level={node.depth + 1}
                                                                                                aria-selected={node.folder.id === videos.activeFolderId}
                                                                                        >
                                                                                                <button class="tree-name" onclick={() => videos.openFolder(node.folder.id)}>
                                                                                                        <Icon name={node.folder.pinned ? 'pin' : 'folder'} size={14} />
                                                                                                        <span>{node.folder.name}</span>
                                                                                                        {#if node.folder.archived}<span class="tag">archived</span>{/if}
                                                                                                </button>
                                                                                                <Menu
                                                                                                        label={`Actions for ${node.folder.name}`}
                                                                                                        triggerIcon="more"
                                                                                                        align="right"
                                                                                                        items={openFolderMenuItems(node.folder)}
                                                                                                        onselect={(action) => onFolderMenu(node.folder, action)}
                                                                                                />
                                                                                        </div>
                                                                                {/each}
                                                                        {/if}
                                                                </div>

                                                                <div class="folder-contents">
                                                                        <h4>In “{videos.crumbs[videos.crumbs.length - 1]?.name}”</h4>
                                                                        {#if videos.visibleFolders.length === 0 && videos.folderAssets.length === 0}
                                                                                <p class="muted-note">Empty. Add a subfolder or a clip.</p>
                                                                        {/if}
                                                                        {#if videos.visibleFolders.length}
                                                                                <ul class="mini-list">
                                                                                        {#each videos.visibleFolders as folder (folder.id)}
                                                                                                <li>
                                                                                                        <button class="mini-item" onclick={() => videos.openFolder(folder.id)}>
                                                                                                                <Icon name="folder" size={14} /> <span>{folder.name}</span>
                                                                                                        </button>
                                                                                                </li>
                                                                                        {/each}
                                                                                </ul>
                                                                        {/if}
                                                                        {#if videos.folderAssets.length}
                                                                                <ul class="mini-list">
                                                                                        {#each videos.folderAssets as asset (asset.id)}
                                                                                                <li>
                                                                                                        <button class="mini-item" disabled={!asset.url} onclick={() => asset.url && (previewId = asset.id)}>
                                                                                                                <Icon name="film" size={14} /> <span>{asset.name}</span>
                                                                                                        </button>
                                                                                                </li>
                                                                                        {/each}
                                                                                </ul>
                                                                        {/if}
                                                                </div>
                                                        </div>
                                                {/if}
                                        </div>

                                {:else if videos.view === 'series'}
                                        <div class="series-view">
                                                <div class="view-head">
                                                        <h2>Series</h2>
                                                        <Menu
                                                                label="Series"
                                                                triggerLabel={videos.activeSeries?.title ?? 'Select series'}
                                                                triggerIcon="layers"
                                                                align="left"
                                                                items={videos.activeProjectSeries.map((s) => ({ id: s.id, label: s.title, note: s.genre || undefined }))}
                                                                onselect={(id) => videos.selectSeries(id)}
                                                        />
                                                        <button class="chip" onclick={() => (dialog = { kind: 'new-series' })}>
                                                                <Icon name="plus" size={14} /> New series
                                                        </button>
                                                </div>

                                                {#if !videos.activeSeries}
                                                        <p class="empty-note">
                                                                {videos.activeProjectSeries.length ? 'Select a series to open its seasons.' : 'No series yet. Create one to plan seasons and episodes.'}
                                                        </p>
                                                {:else}
                                                        <div class="series-meta">
                                                                <div class="meta-field">
                                                                        <label for="series-genre">Genre</label>
                                                                        <input id="series-genre" type="text" value={videos.activeSeries.genre} oninput={(e) => videos.updateSeries(videos.activeSeriesId!, { genre: (e.currentTarget as HTMLInputElement).value })} />
                                                                </div>
                                                                <div class="meta-field">
                                                                        <label for="series-tone">Tone</label>
                                                                        <input id="series-tone" type="text" value={videos.activeSeries.tone} oninput={(e) => videos.updateSeries(videos.activeSeriesId!, { tone: (e.currentTarget as HTMLInputElement).value })} />
                                                                </div>
                                                                <div class="meta-field">
                                                                        <label for="series-lang">Language</label>
                                                                        <select id="series-lang" value={videos.activeSeries.language} onchange={(e) => videos.updateSeries(videos.activeSeriesId!, { language: (e.currentTarget as HTMLSelectElement).value })}>
                                                                                {#each LANGUAGES as lang (lang.id)}<option value={lang.id}>{lang.label}</option>{/each}
                                                                        </select>
                                                                </div>
                                                                <div class="meta-field wide">
                                                                        <label for="series-premise">Premise</label>
                                                                        <textarea id="series-premise" rows="2" value={videos.activeSeries.premise} oninput={(e) => videos.updateSeries(videos.activeSeriesId!, { premise: (e.currentTarget as HTMLTextAreaElement).value })}></textarea>
                                                                </div>
                                                                <div class="meta-field wide">
                                                                        <label for="series-continuity">Continuity rules</label>
                                                                        <textarea id="series-continuity" rows="2" value={videos.activeSeries.continuityRules} oninput={(e) => videos.updateSeries(videos.activeSeriesId!, { continuityRules: (e.currentTarget as HTMLTextAreaElement).value })}></textarea>
                                                                </div>
                                                        </div>

                                                        <div class="seasons">
                                                                <div class="sub-head">
                                                                        <h3>Seasons</h3>
                                                                        <button class="chip" onclick={() => videos.createSeason()}><Icon name="plus" size={14} /> Season</button>
                                                                </div>
                                                                {#if videos.activeSeriesSeasons.length === 0}
                                                                        <p class="muted-note">No seasons yet.</p>
                                                                {:else}
                                                                        <ul class="season-list">
                                                                                {#each videos.activeSeriesSeasons as season (season.id)}
                                                                                        <li class="season" class:on={season.id === videos.activeSeasonId}>
                                                                                                <button class="season-head" onclick={() => videos.selectSeason(season.id)}>
                                                                                                        <span class="season-num">S{season.number}</span>
                                                                                                        <span class="season-title">{season.title}</span>
                                                                                                        <span class="season-count">
                                                                                                                {videos.episodes.filter((e) => e.seasonId === season.id).length} episodes
                                                                                                        </span>
                                                                                                </button>
                                                                                                <div class="season-actions">
                                                                                                        <Menu
                                                                                                                label={`Actions for ${season.title}`}
                                                                                                                triggerIcon="more"
                                                                                                                align="right"
                                                                                                                items={[
                                                                                                                        { id: 'episode', label: 'Add episode', icon: 'plus' },
                                                                                                                        { id: 'rename', label: 'Rename season', icon: 'edit' },
                                                                                                                        { id: 'delete', label: 'Delete season', icon: 'trash', danger: true }
                                                                                                                ]}
                                                                                                                onselect={(action) => {
                                                                                                                        if (action === 'episode') { videos.selectSeason(season.id); void videos.createEpisode(); }
                                                                                                                        else if (action === 'rename') {
                                                                                                                                const next = window.prompt('Season title', season.title);
                                                                                                                                if (next) void videos.updateSeason(season.id, { title: next });
                                                                                                                        } else if (action === 'delete') void videos.deleteSeason(season.id);
                                                                                                                }}
                                                                                                        />
                                                                                                </div>
                                                                                        </li>
                                                                                {/each}
                                                                        </ul>
                                                                {/if}
                                                        </div>

                                                        {#if videos.activeSeason}
                                                                <div class="episodes">
                                                                        <div class="sub-head">
                                                                                <h3>{videos.activeSeason.title} — episodes</h3>
                                                                                <button class="chip" onclick={() => videos.createEpisode()}><Icon name="plus" size={14} /> Episode</button>
                                                                        </div>
                                                                        {#if videos.activeSeasonEpisodes.length === 0}
                                                                                <p class="muted-note">No episodes yet.</p>
                                                                        {:else}
                                                                                <ul class="episode-list">
                                                                                        {#each videos.activeSeasonEpisodes as episode (episode.id)}
                                                                                                <li class="episode" class:on={episode.id === videos.activeEpisodeId}>
                                                                                                        <button class="episode-head" onclick={() => videos.selectEpisode(episode.id)}>
                                                                                                                <span class="episode-num">E{episode.number}</span>
                                                                                                                <span class="episode-title">{episode.title}</span>
                                                                                                                <span class="episode-scenes">
                                                                                                                        {videos.scenes.filter((s) => s.parentKind === 'episode' && s.parentId === episode.id).length} scenes
                                                                                                                </span>
                                                                                                        </button>
                                                                                                        <div class="episode-actions">
                                                                                                                <button class="icon-mini" aria-label="Move episode up" onclick={() => videos.reorderEpisode(episode.id, 'up')}>
                                                                                                                        <Icon name="arrow-up" size={13} />
                                                                                                                </button>
                                                                                                                <button class="icon-mini" aria-label="Move episode down" onclick={() => videos.reorderEpisode(episode.id, 'down')}>
                                                                                                                        <Icon name="arrow-down" size={13} />
                                                                                                                </button>
                                                                                                                <Menu
                                                                                                                        label={`Actions for ${episode.title}`}
                                                                                                                        triggerIcon="more"
                                                                                                                        align="right"
                                                                                                                        items={[
                                                                                                                                { id: 'scene', label: 'Add scene', icon: 'plus' },
                                                                                                                                { id: 'delete', label: 'Delete episode', icon: 'trash', danger: true }
                                                                                                                        ]}
                                                                                                                        onselect={(action) => {
                                                                                                                                if (action === 'scene') { videos.selectEpisode(episode.id); void videos.createScene({ title: 'New scene' }); }
                                                                                                                                else if (action === 'delete') void videos.deleteEpisode(episode.id);
                                                                                                                        }}
                                                                                                                />
                                                                                                        </div>
                                                                                                </li>
                                                                                        {/each}
                                                                                </ul>
                                                                        {/if}
                                                                </div>
                                                        {/if}
                                                {/if}
                                        </div>


                                {:else if videos.view === 'movies'}
                                        <div class="movies-view">
                                                <div class="view-head">
                                                        <h2>Movies</h2>
                                                        <button class="chip" onclick={() => (dialog = { kind: 'new-movie-part' })}>
                                                                <Icon name="plus" size={14} /> New part
                                                        </button>
                                                </div>
                                                {#if !videos.activeProject}
                                                        <p class="empty-note">Open a project to plan a movie.</p>
                                                {:else if videos.activeProjectMovieParts.length === 0}
                                                        <p class="empty-note">This project has no movie parts. A standalone film can use a single part.</p>
                                                {:else}
                                                        <ul class="part-list">
                                                                {#each videos.activeProjectMovieParts as part (part.id)}
                                                                        <li class="part" class:on={part.id === videos.activeMoviePartId}>
                                                                                <button class="part-head" onclick={() => videos.selectMoviePart(part.id)}>
                                                                                        <span class="part-num">Part {part.number}</span>
                                                                                        <span class="part-title">{part.title}</span>
                                                                                        <span class="part-scenes">
                                                                                                {videos.scenes.filter((s) => s.parentKind === 'movie-part' && s.parentId === part.id).length} scenes
                                                                                        </span>
                                                                                </button>
                                                                                <div class="part-actions">
                                                                                        <button class="icon-mini" aria-label="Move part up" onclick={() => videos.reorderMoviePart(part.id, 'up')}>
                                                                                                <Icon name="arrow-up" size={13} />
                                                                                        </button>
                                                                                        <button class="icon-mini" aria-label="Move part down" onclick={() => videos.reorderMoviePart(part.id, 'down')}>
                                                                                                <Icon name="arrow-down" size={13} />
                                                                                        </button>
                                                                                        <Menu
                                                                                                label={`Actions for ${part.title}`}
                                                                                                triggerIcon="more"
                                                                                                align="right"
                                                                                                items={[
                                                                                                        { id: 'scene', label: 'Add scene', icon: 'plus' },
                                                                                                        { id: 'rename', label: 'Rename part', icon: 'edit' },
                                                                                                        { id: 'delete', label: 'Delete part', icon: 'trash', danger: true }
                                                                                                ]}
                                                                                                onselect={(action) => {
                                                                                                        if (action === 'scene') { videos.selectMoviePart(part.id); void videos.createScene({ title: 'New scene' }); }
                                                                                                        else if (action === 'rename') {
                                                                                                                const next = window.prompt('Part title', part.title);
                                                                                                                if (next) void videos.updateMoviePart(part.id, { title: next });
                                                                                                        } else if (action === 'delete') void videos.deleteMoviePart(part.id);
                                                                                                }}
                                                                                        />
                                                                                </div>
                                                                        </li>
                                                                {/each}
                                                        </ul>
                                                {/if}
                                        </div>

                                {:else if videos.view === 'shorts'}
                                        <div class="shorts-view">
                                                <div class="view-head">
                                                        <h2>Short Videos</h2>
                                                        <span class="head-note">A short is a single-clip production.</span>
                                                </div>
                                                <div class="short-options">
                                                        {#each [1, 5, 10, 30] as seconds (seconds)}
                                                                <button
                                                                        class="short-preset"
                                                                        onclick={() => {
                                                                                videos.setDuration(seconds);
                                                                                videos.setClipSeconds(seconds);
                                                                                videos.view = 'studio';
                                                                                videos.notice = `${seconds}-second clip planned. Write the prompt and queue it.`;
                                                                        }}
                                                                >
                                                                        <span class="short-value">{formatDuration(seconds)}</span>
                                                                        <span class="short-note">{seconds <= 5 ? 'Hook' : seconds <= 10 ? 'Clip' : 'Advert'}</span>
                                                                </button>
                                                        {/each}
                                                </div>
                                                {#if videos.readyAssets.length}
                                                        <div class="sub-head"><h3>Latest shorts</h3></div>
                                                        <ul class="thumb-grid">
                                                                {#each videos.readyAssets.slice(0, 6) as asset (asset.id)}
                                                                        <li>
                                                                                <button class="thumb" onclick={() => (previewId = asset.id)}>
                                                                                        <span class="thumb-preview"><Icon name="play" size={20} /></span>
                                                                                        <span class="thumb-name">{asset.name}</span>
                                                                                        <span class="thumb-meta">{formatTimecode(asset.producedDurationSeconds ?? 0)}</span>
                                                                                </button>
                                                                        </li>
                                                                {/each}
                                                        </ul>
                                                {/if}
                                        </div>

                                {:else if videos.view === 'styles'}
                                        <div class="styles-view">
                                                <div class="view-head">
                                                        <h2>Styles</h2>
                                                        <button class="btn-gold" onclick={() => (stylesOpen = true)}>
                                                                <Icon name="palette" size={15} /> Browse style library
                                                        </button>
                                                </div>
                                                <p class="muted-note">
                                                        The style library is shared with Images. Selecting a style inserts its structured
                                                        brief into the Prompt Chat without overwriting what you have written.
                                                </p>
                                                {#if videos.selectedStyle}
                                                        <div class="current-style">
                                                                <div>
                                                                        <span class="eyebrow">Active style</span>
                                                                        <h3>{videos.selectedStyle.name}</h3>
                                                                        <p>{videos.selectedStyle.summary}</p>
                                                                </div>
                                                                <div class="current-style-actions">
                                                                        <button class="chip" onclick={() => videos.applyStyleToActiveShot()}>
                                                                                <Icon name="check" size={14} /> Apply to current shot
                                                                        </button>
                                                                        <button class="chip" onclick={() => videos.clearStyle()}>Remove</button>
                                                                </div>
                                                        </div>
                                                {/if}
                                        </div>

                                {:else if videos.view === 'chat'}
                                        <div class="chat-view">
                                                <div class="view-head">
                                                        <h2>Prompt Chat</h2>
                                                        <button class="chip" onclick={() => videos.clearChat()} disabled={!videos.chatMessages.length}>
                                                                <Icon name="trash" size={14} /> Clear
                                                        </button>
                                                </div>
                                                {#if !videos.promptModelConfigured}
                                                        <p class="status-line">
                                                                <Icon name="info" size={13} />
                                                                {VIDEO_STATUS.promptUnavailable}
                                                        </p>
                                                {/if}
                                                <div class="chat-log" role="log" aria-label="Prompt chat">
                                                        {#if videos.chatMessages.length === 0}
                                                                <p class="muted-note">
                                                                        Ask for a story, a scene breakdown or an improved prompt. Your messages are
                                                                        saved with the project.
                                                                </p>
                                                        {/if}
                                                        {#each videos.chatMessages as message (message.id)}
                                                                <div class="chat-msg" class:user={message.role === 'user'} class:note={message.kind === 'note'}>
                                                                        <span class="chat-role">{message.role === 'user' ? 'You' : 'ARTI AI'}</span>
                                                                        <p class="chat-text">{message.content}</p>
                                                                        {#if message.originalPrompt}
                                                                                <details class="chat-original">
                                                                                        <summary>Original prompt kept</summary>
                                                                                        <pre>{message.originalPrompt}</pre>
                                                                                </details>
                                                                        {/if}
                                                                </div>
                                                        {/each}
                                                </div>
                                                <div class="chat-compose">
                                                        <label class="visually-hidden" for="chat-input">Message the prompt assistant</label>
                                                        <textarea
                                                                id="chat-input"
                                                                rows="2"
                                                                placeholder="Describe the scene, or ask for a shot list…"
                                                                value={videos.chatDraft}
                                                                oninput={(e) => (videos.chatDraft = (e.currentTarget as HTMLTextAreaElement).value)}
                                                        ></textarea>
                                                        <div class="chat-actions">
                                                                {#if videos.chatBusy}
                                                                        <button class="chip" onclick={() => videos.stopChat()}><Icon name="stop" size={14} /> Stop</button>
                                                                {:else}
                                                                        <button class="btn-gold" disabled={!videos.chatDraft.trim()} onclick={() => { const v = videos.chatDraft; videos.chatDraft = ''; void videos.sendChat(v); }}>
                                                                                <Icon name="send" size={15} /> Send
                                                                        </button>
                                                                {/if}
                                                        </div>
                                                </div>
                                        </div>

                                {:else if videos.view === 'queue'}
                                        <div class="queue-view">
                                                <div class="view-head">
                                                        <h2>Generation Queue</h2>
                                                        <span class="head-note">
                                                                {videos.queueSummary.active} active · {videos.queueSummary.queued} queued · {videos.queueSummary.completed} completed · {videos.queueSummary.failed} failed
                                                        </span>
                                                </div>
                                                {#if !videos.videoModelConfigured}
                                                        <p class="status-line">
                                                                <Icon name="alert-circle" size={13} />
                                                                {VIDEO_STATUS.generationUnavailable} Jobs below record the plan and fail honestly; no clip is invented.
                                                        </p>
                                                {/if}
                                                {#if videos.pagedJobs.length === 0}
                                                        <p class="empty-note">The queue is empty. Write a prompt in the Studio and queue it.</p>
                                                {:else}
                                                        <ul class="job-list">
                                                                {#each videos.pagedJobs as job (job.id)}
                                                                        <li class="job" class:failed={job.stage === 'failed'}>
                                                                                <div class="job-main">
                                                                                        <div class="job-head">
                                                                                                <span class="job-stage" data-stage={job.stage}>{stageLabel(job.stage)}</span>
                                                                                                <span class="job-meta">
                                                                                                        {job.requestedResolution} · {job.requestedAspectRatio} · {formatDuration(job.requestedDurationSeconds)} · {job.requestedFrameRate} fps
                                                                                                </span>
                                                                                                <span class="job-time">{relativeTime(job.createdAt)}</span>
                                                                                        </div>
                                                                                        <p class="job-prompt">{videos.promptVersions.find((v) => v.id === job.promptVersionId)?.composedPrompt.slice(0, 180) ?? 'Prompt unavailable'}</p>
                                                                                        {#if jobProgress(job) !== null}
                                                                                                <div class="job-progress">
                                                                                                        <span class="bar"><span class="fill" style={`width:${jobProgress(job)}%`}></span></span>
                                                                                                        <span>{jobProgress(job)}%</span>
                                                                                                </div>
                                                                                        {:else if job.message}
                                                                                                <p class="job-message">{job.message}</p>
                                                                                        {/if}
                                                                                        {#if job.error}
                                                                                                <p class="job-error"><Icon name="alert-circle" size={12} /> {job.error}</p>
                                                                                        {/if}
                                                                                        {#if job.assetIds.length}
                                                                                                <div class="job-outputs">
                                                                                                        {#each job.assetIds as assetId (assetId)}
                                                                                                                <button class="chip" onclick={() => (previewId = assetId)}>
                                                                                                                        <Icon name="play" size={13} /> Open output
                                                                                                                </button>
                                                                                                        {/each}
                                                                                                </div>
                                                                                        {/if}
                                                                                </div>
                                                                                <Menu
                                                                                        label="Job actions"
                                                                                        triggerIcon="more"
                                                                                        align="right"
                                                                                        items={jobMenuItems(job)}
                                                                                        onselect={(action) => onJobMenu(job, action)}
                                                                                />
                                                                        </li>
                                                                {/each}
                                                        </ul>
                                                        {#if videos.hiddenJobCount}
                                                                <button class="chip load-more" onclick={() => videos.loadMoreQueue()}>
                                                                        Show {Math.min(40, videos.hiddenJobCount)} more
                                                                </button>
                                                        {/if}
                                                {/if}
                                        </div>

                                {:else if videos.view === 'library'}
                                        <div class="library-view">
                                                <div class="view-head">
                                                        <h2>Rendered Videos</h2>
                                                        <input class="search" type="search" placeholder="Search clips…" value={videos.librarySearch} oninput={(e) => (videos.librarySearch = (e.currentTarget as HTMLInputElement).value)} />
                                                </div>
                                                {#if videos.pagedAssets.length === 0}
                                                        <p class="empty-note">
                                                                No rendered clips yet. Completed generations appear here with their measured resolution,
                                                                duration and frame rate.
                                                        </p>
                                                {:else}
                                                        <ul class="thumb-grid wide">
                                                                {#each videos.pagedAssets as asset (asset.id)}
                                                                        <li>
                                                                                <div class="thumb-wrap" class:on={asset.id === videos.activeShotId}>
                                                                                        <button class="thumb" onclick={() => (previewId = asset.id)}>
                                                                                                <span class="thumb-preview"><Icon name="play" size={20} /></span>
                                                                                                <span class="thumb-name">{asset.name}</span>
                                                                                                <span class="thumb-meta">{asset.width && asset.height ? `${asset.width}×${asset.height}` : 'dimensions unknown'} · {formatTimecode(asset.producedDurationSeconds ?? 0)}</span>
                                                                                        </button>
                                                                                        <Menu
                                                                                                label={`Actions for ${asset.name}`}
                                                                                                triggerIcon="more"
                                                                                                align="right"
                                                                                                items={[
                                                                                                        { id: 'open', label: 'Preview', icon: 'play' },
                                                                                                        { id: 'approve', label: 'Approve as final take', icon: 'check' },
                                                                                                        { id: 'draft', label: asset.draft ? 'Move out of drafts' : 'Mark as draft', icon: 'edit' },
                                                                                                        { id: 'rename', label: 'Rename', icon: 'edit' },
                                                                                                        { id: 'folder', label: 'Move to folder', icon: 'move' },
                                                                                                        { id: 'export', label: 'Export…', icon: 'download' },
                                                                                                        { id: 'delete', label: 'Delete', icon: 'trash', danger: true }
                                                                                                ]}
                                                                                                onselect={(action) => {
                                                                                                        if (action === 'open') previewId = asset.id;
                                                                                                        else if (action === 'approve') void videos.approveAsset(asset.id);
                                                                                                        else if (action === 'draft') void videos.toggleAssetDraft(asset.id);
                                                                                                        else if (action === 'rename') {
                                                                                                                form.name = asset.name;
                                                                                                                dialog = { kind: 'rename', target: 'asset', id: asset.id, current: asset.name };
                                                                                                        } else if (action === 'folder') {
                                                                                                                const target = window.prompt('Folder id (blank for project root)', asset.folderId ?? '');
                                                                                                                if (target !== null) void videos.moveAssetToFolder(asset.id, target.trim() || null);
                                                                                                        } else if (action === 'export') void videos.requestExport(asset.id, 'mp4-h264');
                                                                                                        else if (action === 'delete') void videos.deleteAsset(asset.id);
                                                                                                }}
                                                                                        />
                                                                                </div>
                                                                        </li>
                                                                {/each}
                                                        </ul>
                                                        {#if videos.hiddenAssetCount}
                                                                <button class="chip load-more" onclick={() => videos.loadMoreLibrary()}>
                                                                        Show {Math.min(40, videos.hiddenAssetCount)} more
                                                                </button>
                                                        {/if}
                                                {/if}
                                        </div>

                                {:else if videos.view === 'drafts'}
                                        <div class="drafts-view">
                                                <div class="view-head">
                                                        <h2>Drafts</h2>
                                                        <span class="head-note">{videos.draftAssets.length} draft clips</span>
                                                </div>
                                                {#if videos.draftAssets.length === 0}
                                                        <p class="empty-note">No drafts. Clips you mark as draft appear here.</p>
                                                {:else}
                                                        <ul class="mini-list wide">
                                                                {#each videos.draftAssets as asset (asset.id)}
                                                                        <li>
                                                                                <button class="mini-item" disabled={!asset.url} onclick={() => asset.url && (previewId = asset.id)}>
                                                                                        <Icon name="film" size={14} />
                                                                                        <span>{asset.name}</span>
                                                                                        <span class="tag">draft</span>
                                                                                </button>
                                                                        </li>
                                                                {/each}
                                                        </ul>
                                                {/if}
                                        </div>

                                {:else if videos.view === 'assets'}
                                        <div class="assets-view">
                                                <div class="view-head">
                                                        <h2>Reusable Assets</h2>
                                                        <span class="head-note">Project bible: characters, environments and props.</span>
                                                </div>
                                                <div class="sub-head">
                                                        <h3>References</h3>
                                                        <button class="chip" onclick={() => {
                                                                const name = window.prompt('Reference name');
                                                                if (name) void videos.createReference({ name, kind: 'character' });
                                                        }}><Icon name="plus" size={14} /> Add reference</button>
                                                </div>
                                                {#if videos.activeReferences.length === 0}
                                                        <p class="muted-note">No references yet.</p>
                                                {:else}
                                                        <ul class="mini-list wide">
                                                                {#each videos.activeReferences as reference (reference.id)}
                                                                        <li class="ref-item">
                                                                                <Icon name={reference.kind === 'character' ? 'users' : reference.kind === 'environment' ? 'book' : 'image2'} size={15} />
                                                                                <div class="ref-info">
                                                                                        <span class="ref-title">{reference.name}</span>
                                                                                        <span class="ref-kind">{reference.kind}{reference.rules ? ` · ${reference.rules}` : ''}</span>
                                                                                </div>
                                                                                <button class="icon-mini" aria-label={`Delete ${reference.name}`} onclick={() => videos.deleteReference(reference.id)}>
                                                                                        <Icon name="trash" size={13} />
                                                                                </button>
                                                                        </li>
                                                                {/each}
                                                        </ul>
                                                {/if}
                                                {#if videos.activeCharacters.length}
                                                        <div class="sub-head"><h3>Characters</h3></div>
                                                        <ul class="mini-list wide">
                                                                {#each videos.activeCharacters as character (character.id)}
                                                                        <li class="ref-item">
                                                                                <Icon name="users" size={15} />
                                                                                <div class="ref-info">
                                                                                        <span class="ref-title">{character.name}</span>
                                                                                        <span class="ref-kind">{character.appearance || 'No appearance notes'}</span>
                                                                                </div>
                                                                        </li>
                                                                {/each}
                                                        </ul>
                                                {/if}
                                        </div>

                                {:else if videos.view === 'settings'}
                                        <div class="settings-view">
                                                <div class="view-head"><h2>Settings</h2></div>
                                                <dl class="settings-list">
                                                        <div><dt>Storage</dt><dd>{videos.storageLabel}{videos.storageNotice.text ? ` — ${videos.storageNotice.text}` : ''}</dd></div>
                                                        <div><dt>Video service</dt><dd>{videos.videoModelConfigured ? 'Configured' : 'Not configured'}</dd></div>
                                                        <div><dt>Prompt intelligence</dt><dd>{videos.promptModelConfigured ? 'Configured' : 'Not configured'}</dd></div>
                                                        <div><dt>Native long edge</dt><dd>{videos.nativeLongEdge}px</dd></div>
                                                        <div><dt>Max clip length</dt><dd>{videos.maxClipSeconds}s</dd></div>
                                                        <div><dt>Max concurrency</dt><dd>{videos.maxConcurrentJobs} jobs</dd></div>
                                                        <div><dt>16K definition</dt><dd>15360 × 8640 (16:9)</dd></div>
                                                        <div><dt>Camera motion</dt><dd>{videos.capabilities.cameraMotion ? 'Supported' : 'Not available'}</dd></div>
                                                        <div><dt>Image-to-video</dt><dd>{videos.capabilities.imageToVideo ? 'Supported' : 'Not available'}</dd></div>
                                                        <div><dt>Video-to-video</dt><dd>{videos.capabilities.videoToVideo ? 'Supported' : 'Not available'}</dd></div>
                                                        <div><dt>Model audio</dt><dd>{videos.capabilities.audio ? 'Supported' : 'Not available'}</dd></div>
                                                        <div><dt>Upscale</dt><dd>{videos.capabilities.upscale ? 'Configured' : 'Not configured'}</dd></div>
                                                        <div><dt>Frame interpolation</dt><dd>{videos.capabilities.frameInterpolation ? 'Configured' : 'Not configured'}</dd></div>
                                                </dl>
                                                <div class="sub-head"><h3>Export formats</h3></div>
                                                <ul class="format-list">
                                                        {#each ['mp4-h264', 'webm-vp9', 'mov-prores', 'subtitles-srt', 'metadata-json'] as id (id)}
                                                                {@const f = findExportFormat(id)}
                                                                {#if f}
                                                                        <li>
                                                                                <span class="format-name">{f.label}</span>
                                                                                <span class="format-state" class:ok={f.implemented}>{f.implemented ? 'available' : 'not implemented'}</span>
                                                                                <span class="format-note">{f.note}</span>
                                                                        </li>
                                                                {/if}
                                                        {/each}
                                                </ul>
                                                <div class="sub-head"><h3>Recent activity</h3></div>
                                                {#if videos.auditEvents.length === 0}
                                                        <p class="muted-note">No recorded activity yet.</p>
                                                {:else}
                                                        <ul class="audit-list">
                                                                {#each videos.auditEvents.slice(0, 12) as event (event.id)}
                                                                        <li><span class="audit-action">{event.action}</span> <span class="audit-detail">{event.detail}</span> <span class="audit-time">{relativeTime(event.createdAt)}</span></li>
                                                                {/each}
                                                        </ul>
                                                {/if}
                                        </div>

                                {/if}
                        </section>

                {#if contextOpen}
                        <aside class="context" aria-label="Production context">
                                <div class="context-head">
                                        <h3>Context</h3>
                                        <button class="icon-mini" aria-label="Close context panel" onclick={() => (contextOpen = false)}>
                                                <Icon name="close" size={14} />
                                        </button>
                                </div>

                                {#if videos.activeProject}
                                        <section class="ctx-block">
                                                <h4>Open project</h4>
                                                <p class="ctx-title">{videos.activeProject.name}</p>
                                                {#if videos.activeSeries}<p class="ctx-sub">Series: {videos.activeSeries.title}</p>{/if}
                                                {#if videos.activeSeason}<p class="ctx-sub">Season: {videos.activeSeason.title}</p>{/if}
                                                {#if videos.activeEpisode}<p class="ctx-sub">Episode {videos.activeEpisode.number}: {videos.activeEpisode.title}</p>{/if}
                                                {#if videos.activeMoviePart}<p class="ctx-sub">Part {videos.activeMoviePart.number}: {videos.activeMoviePart.title}</p>{/if}
                                                {#if videos.activeScene}<p class="ctx-sub">Scene {videos.activeScene.number}: {videos.activeScene.title}</p>{/if}
                                                {#if videos.activeShot}<p class="ctx-sub">Shot {videos.activeShot.number}: {videos.activeShot.title}</p>{/if}
                                        </section>

                                        <section class="ctx-block">
                                                <h4>Scenes {videos.activeEpisode || videos.activeMoviePart ? 'here' : 'in project'}</h4>
                                                {#if videos.activeScenes.length === 0}
                                                        <p class="muted-note">None yet.</p>
                                                {:else}
                                                        <ul class="mini-list">
                                                                {#each videos.activeScenes as scene (scene.id)}
                                                                        <li>
                                                                                <button class="mini-item" class:on={scene.id === videos.activeSceneId} onclick={() => videos.selectScene(scene.id)}>
                                                                                        <Icon name="film" size={13} /> <span>Scene {scene.number}</span>
                                                                                </button>
                                                                        </li>
                                                                {/each}
                                                        </ul>
                                                {/if}
                                        </section>

                                        {#if videos.activeScene}
                                                <section class="ctx-block">
                                                        <h4>Shots in scene {videos.activeScene.number}</h4>
                                                        <div class="ctx-actions">
                                                                <button class="chip" onclick={() => videos.createShot(videos.activeSceneId!, { title: 'New shot', prompt: videos.draft })}>
                                                                        <Icon name="plus" size={13} /> Shot
                                                                </button>
                                                                <button class="chip" title="Mechanical text split, not an AI shot list" onclick={() => videos.splitSceneIntoShots()}>
                                                                        <Icon name="scissors" size={13} /> Split text
                                                                </button>
                                                        </div>
                                                        {#if videos.activeShots.length === 0}
                                                                <p class="muted-note">No shots yet.</p>
                                                        {:else}
                                                                <ul class="mini-list">
                                                                        {#each videos.activeShots as shot (shot.id)}
                                                                                <li class="shot-row" class:on={shot.id === videos.activeShotId}>
                                                                                        <button class="mini-item" onclick={() => videos.selectShot(shot.id)}>
                                                                                                <Icon name="camera" size={13} /> <span>Shot {shot.number}</span>
                                                                                        </button>
                                                                                        <button class="icon-mini" aria-label="Move shot up" onclick={() => videos.reorderShot(shot.id, 'up')}><Icon name="arrow-up" size={12} /></button>
                                                                                        <button class="icon-mini" aria-label="Move shot down" onclick={() => videos.reorderShot(shot.id, 'down')}><Icon name="arrow-down" size={12} /></button>
                                                                                        <button class="icon-mini" aria-label="Delete shot" onclick={() => videos.deleteShot(shot.id)}><Icon name="trash" size={12} /></button>
                                                                                </li>
                                                                        {/each}
                                                                </ul>
                                                        {/if}
                                                </section>
                                        {/if}

                                        <section class="ctx-block">
                                                <div class="ctx-head-row">
                                                        <h4>References</h4>
                                                        <button class="chip tiny" onclick={() => {
                                                                const name = window.prompt('Reference name');
                                                                if (name) void videos.createReference({ name, kind: 'character' });
                                                        }}>Add</button>
                                                </div>
                                                {#if videos.activeReferences.length === 0}
                                                        <p class="muted-note">No approved references yet.</p>
                                                {:else}
                                                        <ul class="mini-list">
                                                                {#each videos.activeReferences as reference (reference.id)}
                                                                        <li><span class="mini-item static"><Icon name="users" size={13} /> <span>{reference.name}</span></span></li>
                                                                {/each}
                                                        </ul>
                                                {/if}
                                        </section>
                                {:else}
                                        <p class="muted-note">Open a project to see its production context.</p>
                                {/if}
                        </aside>
                {/if}

                </div>

                        <!-- The composer is a Studio affordance: it only appears where a prompt is being prepared. -->
                        {#if videos.view === 'studio' || videos.view === 'shorts'}
                                <div class="composer-dock">
                                        <VideoComposer
                                                draft={videos.draft}
                                                styleName={videos.selectedStyle?.name}
                                                aspectRatio={videos.aspectRatio}
                                                resolution={videos.resolution}
                                                frameRate={videos.frameRate}
                                                durationSeconds={videos.durationSeconds}
                                                clipSeconds={videos.clipSeconds}
                                                negativePrompt={videos.negativePrompt}
                                                cameraMovement={videos.cameraMovement}
                                                lighting={videos.lighting}
                                                palette={videos.palette}
                                                audioNotes={videos.audioNotes}
                                                references={videos.referenceAssets}
                                                generating={videos.generating}
                                                stage={videos.stage}
                                                progress={videos.progress}
                                                configured={videos.videoModelConfigured}
                                                promptConfigured={videos.promptModelConfigured}
                                                segmentCount={videos.durationPlan.segments.length}
                                                needsUpscale={videos.needsUpscale}
                                                nativeLongEdge={videos.nativeLongEdge}
                                                maxClipSeconds={videos.maxClipSeconds}
                                                outputDimensions={describeDimensions(videos.resolution, videos.aspectRatio)}
                                                oninput={(v) => videos.setDraft(v)}
                                                onopenstyles={() => (stylesOpen = true)}
                                                onclearstyle={() => videos.clearStyle()}
                                                onaspect={(v) => videos.setAspectRatio(v)}
                                                onresolution={(v) => videos.setResolution(v)}
                                                onframerate={(v) => videos.setFrameRate(v)}
                                                onduration={(v) => videos.setDuration(v)}
                                                onclipseconds={(v) => videos.setClipSeconds(v)}
                                                onnegative={(v) => (videos.negativePrompt = v)}
                                                oncamera={(v) => (videos.cameraMovement = v)}
                                                onlighting={(v) => (videos.lighting = v)}
                                                onpalette={(v) => (videos.palette = v)}
                                                onaudio={(v) => (videos.audioNotes = v)}
                                                onreferences={(files) => videos.setReferenceAssets(files)}
                                                ongeneration={() => videos.sendToGenerator()}
                                                onstop={() => videos.stopGeneration()}
                                                onimprove={() => videos.improvePrompt()}
                                                onbreakdown={() => videos.createSceneBreakdown()}
                                                onshotlist={() => videos.generateShotList()}
                                                onsaveprompt={() => videos.savePrompt()}
                                                onsavedefaults={() => videos.saveAsProjectDefaults()}
                                                onnotice={(n) => (videos.notice = n)}
                                        />
                                </div>
                        {/if}

        </div>
</div>


<!-- Modals and dialogs live outside the scrollable regions so they are never clipped. -->

{#if stylesOpen}
        <VideoStyleLibrary
                selectedId={videos.selectedStyleId}
                onselect={(id) => videos.selectStyle(id)}
                onclear={() => videos.clearStyle()}
                onclose={() => (stylesOpen = false)}
        />
{/if}

{#if videos.pendingStyle}
        <Dialog
                open={true}
                title="Keep your existing prompt?"
                description="You already have text in the prompt. The selected style adds guidance — choose how to combine them."
                confirmLabel="Apply to current prompt"
                oncancel={() => videos.cancelPendingStyle()}
                onconfirm={() => videos.resolvePendingStyle('insert')}
        >
                <div class="style-merge">
                        <p class="style-merge-name">Style: <strong>{videos.pendingStyle.style.name}</strong></p>
                        <p class="style-merge-preview">{videos.pendingStyle.style.summary}</p>
                        <div class="style-merge-actions">
                                <button class="merge-btn" onclick={() => videos.resolvePendingStyle('replace')}>
                                        Replace prompt (discards current text)
                                </button>
                                <button class="merge-btn" onclick={() => videos.resolvePendingStyle('append')}>
                                        Append guidance after the current text
                                </button>
                                <button class="merge-btn" onclick={() => videos.applyStyleToActiveShot()}>
                                        Apply to the selected shot instead
                                </button>
                        </div>
                </div>
        </Dialog>
{/if}

{#if dialog}
        <Dialog
                open={true}
                title={dialogTitle}
                description={dialogDescription}
                confirmLabel={dialogConfirmLabel}
                destructive={dialogDestructive}
                confirmDisabled={dialogConfirmDisabled}
                oncancel={() => (dialog = null)}
                onconfirm={submitDialog}
        >
                {#if dialog.kind === 'new-project'}
                        <div class="fields">
                                <label class="field">
                                        <span>Name</span>
                                        <input type="text" bind:value={form.name} placeholder="e.g. Galactic Universe" />
                                </label>
                                <label class="field">
                                        <span>Type</span>
                                        <select bind:value={form.kind}>
                                                <option value="project">Project</option>
                                                <option value="series">Series</option>
                                                <option value="movie">Movie</option>
                                                <option value="short">Short</option>
                                                <option value="collection">Collection</option>
                                        </select>
                                </label>
                                <label class="field">
                                        <span>Description</span>
                                        <textarea rows="2" bind:value={form.description} placeholder="What this production is"></textarea>
                                </label>
                        </div>
                {:else if dialog.kind === 'new-series'}
                        <div class="fields">
                                <label class="field"><span>Title</span><input type="text" bind:value={form.name} placeholder="Series title" /></label>
                                <label class="field"><span>Genre</span><input type="text" bind:value={form.genre} placeholder="e.g. science fiction" /></label>
                                <label class="field"><span>Premise</span><textarea rows="2" bind:value={form.premise} placeholder="The story premise"></textarea></label>
                        </div>
                {:else if dialog.kind === 'new-movie-part'}
                        <div class="fields">
                                <label class="field"><span>Part title</span><input type="text" bind:value={form.name} placeholder="e.g. Part 1 — Arrival" /></label>
                        </div>
                {:else if dialog.kind === 'new-scene'}
                        <div class="fields">
                                <label class="field"><span>Scene title</span><input type="text" bind:value={form.name} placeholder="e.g. The landing" /></label>
                                <label class="field"><span>Description</span><textarea rows="3" bind:value={form.description} placeholder="What happens in the scene"></textarea></label>
                        </div>
                {:else if dialog.kind === 'rename'}
                        <div class="fields">
                                <label class="field"><span>New name</span><input type="text" bind:value={form.name} /></label>
                        </div>
                {:else if dialog.kind === 'move-folder'}
                        <p class="move-hint">Choose a destination. A folder cannot be moved into its own subfolder.</p>
                        <Menu
                                label="Destination folder"
                                triggerLabel="Choose destination"
                                triggerIcon="move"
                                align="left"
                                placement="up"
                                items={folderOptionItems(dialog.id)}
                                onselect={(id) => (moveTarget = id === '__root__' ? null : id)}
                        />
                        <p class="move-current">Destination: {moveTarget ? (videos.projectFolders.find((f) => f.id === moveTarget)?.name ?? 'unknown') : 'Project root'}</p>
                {/if}
        </Dialog>
{/if}

{#if activeAsset}
        <VideoPreview
                asset={activeAsset}
                promptVersion={videos.promptVersions.find((v) => v.id === activeAsset.promptVersionId) ?? null}
                styleName={videos.selectedStyle?.name ?? null}
                folderPath={videos.projectFolders.find((f) => f.id === activeAsset.folderId)?.name ?? ''}
                projectName={videos.activeProject?.name ?? ''}
                onclose={() => (previewId = null)}
                onrequestexport={(format) => videos.requestExport(activeAsset.id, format)}
                onnotice={(n) => (videos.notice = n)}
        />
{/if}

<style>
        .videos-shell {
                flex: 1;
                min-height: 0;
                display: flex;
                overflow: hidden;
        }

        /* --- Secondary navigation --- */
        .vnav {
                width: var(--videos-nav-width);
                flex-shrink: 0;
                display: flex;
                flex-direction: column;
                border-right: 1px solid var(--border-hair);
                background: rgba(10, 10, 9, 0.5);
                overflow-y: auto;
        }

        .vnav-head {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: var(--space-3) var(--space-4) var(--space-2);
        }

        .vnav-title {
                font-family: var(--font-display);
                font-size: 12px;
                letter-spacing: 0.16em;
                text-transform: uppercase;
                color: var(--gold);
        }

        .vnav-close {
                display: none;
                place-items: center;
                width: 26px;
                height: 26px;
                border-radius: var(--radius-sm);
                color: var(--text-secondary);
        }

        .vnav ul {
                list-style: none;
                margin: 0;
                padding: 0 var(--space-2) var(--space-4);
                display: flex;
                flex-direction: column;
                gap: 2px;
        }

        .vnav-item {
                display: flex;
                align-items: center;
                gap: var(--space-3);
                width: 100%;
                padding: 9px var(--space-3);
                border-radius: var(--radius-sm);
                color: var(--text-secondary);
                font-size: 13px;
                text-align: left;
        }

        .vnav-item:hover {
                color: var(--text-primary);
                background: rgba(255, 255, 255, 0.04);
        }

        .vnav-item.on {
                color: var(--gold-bright);
                background: rgba(201, 154, 54, 0.12);
                border: 1px solid var(--border-gold);
        }

        .vnav-item span:first-of-type {
                flex: 1;
                min-width: 0;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
        }

        .vnav-count {
                font-size: 10.5px;
                padding: 1px 7px;
                border-radius: var(--radius-pill);
                background: rgba(201, 154, 54, 0.16);
                color: var(--gold-bright);
        }

        /* --- Main column --- */
        .vmain {
                flex: 1;
                min-width: 0;
                display: flex;
                flex-direction: column;
                overflow: hidden;
        }

        .notice {
                display: flex;
                align-items: center;
                gap: var(--space-2);
                padding: var(--space-2) var(--space-5);
                border-bottom: 1px solid var(--border-hair);
                background: rgba(201, 154, 54, 0.07);
                color: var(--gold-bright);
                font-size: 12.5px;
        }

        .notice span {
                flex: 1;
                min-width: 0;
        }

        .notice button {
                display: grid;
                place-items: center;
                width: 22px;
                height: 22px;
                border-radius: 50%;
                color: var(--text-secondary);
        }

        .vbody {
                flex: 1;
                min-height: 0;
                display: flex;
                overflow: hidden;
        }

        .canvas {
                flex: 1;
                min-width: 0;
                display: flex;
                flex-direction: column;
                overflow-y: auto;
                padding: var(--space-5) var(--space-5) var(--space-6);
        }

        /* --- Shared view chrome --- */
        .view-head,
        .studio-head {
                display: flex;
                align-items: flex-start;
                gap: var(--space-3);
                margin-bottom: var(--space-4);
        }

        .studio-head {
                justify-content: space-between;
        }

        .studio-titles {
                min-width: 0;
        }

        .eyebrow {
                font-size: 10.5px;
                letter-spacing: 0.16em;
                text-transform: uppercase;
                color: var(--gold);
        }

        h2 {
                margin: 2px 0 0;
                font-family: var(--font-display);
                font-size: 22px;
                font-weight: 600;
                color: var(--text-primary);
        }

        h3 {
                margin: 0;
                font-family: var(--font-display);
                font-size: 16px;
                color: var(--text-primary);
        }

        h4 {
                margin: 0 0 var(--space-2);
                font-size: 11px;
                letter-spacing: 0.12em;
                text-transform: uppercase;
                color: var(--gold);
        }

        .studio-desc,
        .view-head h2 + * {
                color: var(--text-muted);
                font-size: 13px;
        }

        .studio-desc {
                margin: 6px 0 0;
                max-width: 60ch;
        }

        .view-head {
                align-items: center;
                flex-wrap: wrap;
                border-bottom: 1px solid var(--border-hair);
                padding-bottom: var(--space-3);
        }

        .view-head h2 {
                margin: 0;
                flex: 1;
        }

        .head-note {
                font-size: 12px;
                color: var(--text-muted);
        }

        .stats {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
                gap: var(--space-3);
                margin-bottom: var(--space-5);
        }

        .stat {
                display: flex;
                flex-direction: column;
                gap: 3px;
                padding: var(--space-3);
                border-radius: var(--radius-md);
                border: 1px solid var(--border-hair);
                background: rgba(255, 255, 255, 0.02);
        }

        .stat-value {
                font-family: var(--font-display);
                font-size: 19px;
                color: var(--gold-bright);
        }

        .stat-label {
                font-size: 11.5px;
                color: var(--text-muted);
        }

        .panel {
                border: 1px solid var(--border-hair);
                border-radius: var(--radius-md);
                background: rgba(255, 255, 255, 0.02);
                padding: var(--space-4);
        }

        .panel-head,
        .sub-head {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: var(--space-3);
                margin-bottom: var(--space-3);
        }

        .panel-actions {
                display: flex;
                gap: var(--space-2);
                flex-wrap: wrap;
        }

        .structure {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
                gap: var(--space-4);
        }

        .chip {
                display: inline-flex;
                align-items: center;
                gap: 5px;
                padding: 6px 11px;
                border-radius: var(--radius-pill);
                border: 1px solid var(--border-hair);
                color: var(--text-secondary);
                font-size: 12px;
                font-weight: 500;
                white-space: nowrap;
        }

        .chip:hover:not(:disabled) {
                color: var(--gold-bright);
                border-color: var(--border-gold);
                background: rgba(201, 154, 54, 0.08);
        }

        .chip:disabled {
                opacity: 0.5;
                cursor: not-allowed;
        }

        .chip.tiny {
                padding: 3px 9px;
                font-size: 11px;
        }

        .btn-gold {
                display: inline-flex;
                align-items: center;
                gap: 6px;
                padding: 8px 15px;
                border-radius: var(--radius-pill);
                border: 1px solid var(--border-gold);
                background: linear-gradient(160deg, var(--gold-bright), var(--gold-deep));
                color: var(--text-on-gold);
                font-size: 12.5px;
                font-weight: 600;
                white-space: nowrap;
        }

        .btn-gold:hover:not(:disabled) {
                filter: brightness(1.06);
        }

        .btn-gold:disabled {
                opacity: 0.5;
                cursor: not-allowed;
        }

        .icon-mini {
                display: grid;
                place-items: center;
                width: 26px;
                height: 26px;
                border-radius: var(--radius-sm);
                color: var(--text-muted);
                flex-shrink: 0;
        }

        .icon-mini:hover {
                color: var(--gold-bright);
                background: rgba(201, 154, 54, 0.1);
        }

        .empty-note {
                margin: var(--space-6) auto;
                max-width: 460px;
                text-align: center;
                color: var(--text-muted);
                font-size: 13px;
                line-height: 1.6;
        }

        .muted-note {
                margin: 0;
                color: var(--text-muted);
                font-size: 12.5px;
        }

        .status-line {
                display: flex;
                align-items: center;
                gap: var(--space-2);
                margin: 0 0 var(--space-4);
                padding: var(--space-2) var(--space-3);
                border-radius: var(--radius-sm);
                border: 1px solid var(--border-hair);
                background: rgba(201, 154, 54, 0.05);
                color: var(--text-muted);
                font-size: 12px;
        }

        .search {
                padding: 8px 13px;
                border-radius: var(--radius-pill);
                border: 1px solid var(--border-hair);
                background: rgba(255, 255, 255, 0.03);
                color: var(--text-primary);
                font: inherit;
                font-size: 13px;
                min-width: 180px;
        }

        .search:focus {
                outline: none;
                border-color: var(--border-gold);
        }

        /* --- Lists --- */
        .mini-list {
                list-style: none;
                margin: 0;
                padding: 0;
                display: flex;
                flex-direction: column;
                gap: 2px;
        }

        .mini-item {
                display: flex;
                align-items: center;
                gap: var(--space-2);
                width: 100%;
                padding: 6px 8px;
                border-radius: var(--radius-sm);
                color: var(--text-secondary);
                font-size: 12.5px;
                text-align: left;
        }

        .mini-item span:first-of-type {
                flex: 1;
                min-width: 0;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
        }

        .mini-item:hover:not(:disabled),
        .mini-item.on {
                color: var(--gold-bright);
                background: rgba(201, 154, 54, 0.09);
        }

        .mini-item:disabled {
                opacity: 0.5;
                cursor: not-allowed;
        }

        .mini-item.static {
                cursor: default;
        }

        /* --- Projects --- */
        .card-grid {
                list-style: none;
                margin: 0;
                padding: 0;
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
                gap: var(--space-3);
        }

        .pcard {
                position: relative;
                border: 1px solid var(--border-hair);
                border-radius: var(--radius-md);
                background: rgba(255, 255, 255, 0.02);
                overflow: hidden;
        }

        .pcard.on {
                border-color: var(--border-gold);
                box-shadow: inset 0 0 20px rgba(229, 193, 106, 0.07);
        }

        .pcard-main {
                display: flex;
                flex-direction: column;
                gap: 5px;
                width: 100%;
                padding: var(--space-3) var(--space-3) var(--space-4);
                text-align: left;
        }

        .pcard-kind {
                font-size: 10px;
                letter-spacing: 0.14em;
                text-transform: uppercase;
                color: var(--gold);
        }

        .pcard-name {
                font-size: 15px;
                font-weight: 600;
                color: var(--text-primary);
        }

        .pcard-desc {
                font-size: 12px;
                color: var(--text-muted);
                display: -webkit-box;
                -webkit-line-clamp: 2;
                line-clamp: 2;
                -webkit-box-orient: vertical;
                overflow: hidden;
        }

        .pcard-meta {
                font-size: 11px;
                color: var(--text-secondary);
        }

        .pcard-time {
                font-size: 10.5px;
                color: var(--text-muted);
        }

        .pcard-actions {
                position: absolute;
                top: 6px;
                right: 6px;
                display: flex;
                gap: 2px;
        }

        /* --- Folders --- */
        .crumbs {
                display: flex;
                align-items: center;
                flex-wrap: wrap;
                gap: 4px;
                margin-bottom: var(--space-3);
                font-size: 12.5px;
        }

        .crumb {
                padding: 3px 8px;
                border-radius: var(--radius-sm);
                color: var(--text-secondary);
        }

        .crumb:hover {
                color: var(--gold-bright);
                background: rgba(201, 154, 54, 0.09);
        }

        .crumb.last {
                color: var(--gold-bright);
                font-weight: 600;
        }

        .crumb-sep {
                color: var(--text-muted);
        }

        .folder-layout {
                display: grid;
                grid-template-columns: minmax(260px, 1.2fr) 1fr;
                gap: var(--space-4);
        }

        .tree {
                border: 1px solid var(--border-hair);
                border-radius: var(--radius-md);
                background: rgba(255, 255, 255, 0.02);
                padding: var(--space-2);
                max-height: 60vh;
                overflow-y: auto;
        }

        .tree-row {
                display: flex;
                align-items: center;
                gap: var(--space-1);
                border-radius: var(--radius-sm);
        }

        .tree-row.on {
                background: rgba(201, 154, 54, 0.12);
        }

        .tree-name {
                display: flex;
                align-items: center;
                gap: var(--space-2);
                flex: 1;
                min-width: 0;
                padding: 6px 6px;
                border-radius: var(--radius-sm);
                color: var(--text-secondary);
                font-size: 12.5px;
                text-align: left;
        }

        .tree-name:hover {
                color: var(--gold-bright);
        }

        .tree-name span {
                min-width: 0;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
        }

        .tag {
                font-size: 9.5px;
                letter-spacing: 0.08em;
                text-transform: uppercase;
                color: var(--text-muted);
                border: 1px solid var(--border-hair);
                border-radius: var(--radius-pill);
                padding: 1px 7px;
        }

        .folder-contents {
                min-width: 0;
        }

        /* --- Series / seasons / episodes --- */
        .series-meta {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
                gap: var(--space-3);
                margin-bottom: var(--space-5);
        }

        .meta-field {
                display: flex;
                flex-direction: column;
                gap: 5px;
        }

        .meta-field.wide {
                grid-column: 1 / -1;
        }

        .meta-field label {
                font-size: 11px;
                letter-spacing: 0.08em;
                text-transform: uppercase;
                color: var(--text-muted);
        }

        .meta-field input,
        .meta-field select,
        .meta-field textarea {
                padding: 8px 11px;
                border-radius: var(--radius-sm);
                border: 1px solid var(--border-hair);
                background: rgba(255, 255, 255, 0.03);
                color: var(--text-primary);
                font: inherit;
                font-size: 13px;
                resize: vertical;
        }

        .meta-field input:focus,
        .meta-field select:focus,
        .meta-field textarea:focus {
                outline: none;
                border-color: var(--border-gold);
        }

        .season-list,
        .episode-list,
        .part-list,
        .job-list {
                list-style: none;
                margin: 0;
                padding: 0;
                display: flex;
                flex-direction: column;
                gap: var(--space-2);
        }

        .season,
        .episode,
        .part {
                display: flex;
                align-items: center;
                gap: var(--space-2);
                border: 1px solid var(--border-hair);
                border-radius: var(--radius-md);
                background: rgba(255, 255, 255, 0.02);
                padding: var(--space-2) var(--space-3);
        }

        .season.on,
        .episode.on,
        .part.on {
                border-color: var(--border-gold);
                background: rgba(201, 154, 54, 0.08);
        }

        .season-head,
        .episode-head,
        .part-head {
                display: flex;
                align-items: center;
                gap: var(--space-3);
                flex: 1;
                min-width: 0;
                padding: 4px 0;
                text-align: left;
                color: var(--text-secondary);
                font-size: 13px;
        }

        .season-num,
        .episode-num,
        .part-num {
                font-family: var(--font-display);
                color: var(--gold);
                font-size: 12.5px;
        }

        .season-title,
        .episode-title,
        .part-title {
                flex: 1;
                min-width: 0;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
                color: var(--text-primary);
        }

        .season-count,
        .episode-scenes,
        .part-scenes {
                font-size: 11.5px;
                color: var(--text-muted);
        }

        .season-actions,
        .episode-actions,
        .part-actions {
                display: flex;
                gap: 2px;
                flex-shrink: 0;
        }

        .seasons,
        .episodes {
                margin-bottom: var(--space-5);
        }

        /* --- Shorts --- */
        .short-options {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
                gap: var(--space-3);
                margin-bottom: var(--space-5);
        }

        .short-preset {
                display: flex;
                flex-direction: column;
                gap: 4px;
                padding: var(--space-4);
                border-radius: var(--radius-md);
                border: 1px solid var(--border-hair);
                background: rgba(255, 255, 255, 0.02);
                text-align: left;
        }

        .short-preset:hover {
                border-color: var(--border-gold);
                background: rgba(201, 154, 54, 0.07);
        }

        .short-value {
                font-family: var(--font-display);
                font-size: 17px;
                color: var(--gold-bright);
        }

        .short-note {
                font-size: 11.5px;
                color: var(--text-muted);
        }

        /* --- Thumbs --- */
        .thumb-grid {
                list-style: none;
                margin: 0;
                padding: 0;
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
                gap: var(--space-3);
        }

        .thumb-grid.wide {
                grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
        }

        .thumb-wrap {
                position: relative;
        }

        .thumb {
                display: flex;
                flex-direction: column;
                gap: 6px;
                width: 100%;
                padding: var(--space-2);
                border-radius: var(--radius-md);
                border: 1px solid var(--border-hair);
                background: rgba(255, 255, 255, 0.02);
                text-align: left;
        }

        .thumb:hover {
                border-color: var(--border-gold);
        }

        .thumb-preview {
                display: grid;
                place-items: center;
                height: 90px;
                border-radius: var(--radius-sm);
                color: var(--gold-deep);
                background: radial-gradient(circle at 50% 40%, rgba(201, 154, 54, 0.16), transparent 65%), linear-gradient(160deg, #0c0e10, #080807);
        }

        .thumb-name {
                font-size: 12.5px;
                color: var(--text-primary);
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
        }

        .thumb-meta {
                font-size: 10.5px;
                color: var(--text-muted);
        }

        /* --- Style view --- */
        .current-style {
                display: flex;
                align-items: flex-start;
                justify-content: space-between;
                gap: var(--space-4);
                margin-top: var(--space-4);
                padding: var(--space-4);
                border: 1px solid var(--border-gold);
                border-radius: var(--radius-md);
                background: rgba(201, 154, 54, 0.07);
        }

        .current-style h3 {
                margin: 2px 0 4px;
        }

        .current-style p {
                margin: 0;
                font-size: 12.5px;
                color: var(--text-secondary);
                max-width: 60ch;
        }

        .current-style-actions {
                display: flex;
                gap: var(--space-2);
                flex-shrink: 0;
        }

        /* --- Chat --- */
        .chat-view {
                flex: 1;
                display: flex;
                flex-direction: column;
                min-height: 0;
        }

        .chat-log {
                flex: 1;
                min-height: 0;
                overflow-y: auto;
                display: flex;
                flex-direction: column;
                gap: var(--space-3);
                padding: var(--space-2) 0 var(--space-4);
        }

        .chat-msg {
                max-width: 78%;
                padding: var(--space-3);
                border-radius: var(--radius-md);
                border: 1px solid var(--border-hair);
                background: rgba(255, 255, 255, 0.03);
        }

        .chat-msg.user {
                align-self: flex-end;
                border-color: var(--border-gold);
                background: rgba(201, 154, 54, 0.1);
        }

        .chat-msg.note {
                border-style: dashed;
                background: transparent;
        }

        .chat-role {
                font-size: 10px;
                letter-spacing: 0.12em;
                text-transform: uppercase;
                color: var(--gold);
        }

        .chat-text {
                margin: 4px 0 0;
                font-size: 13px;
                line-height: 1.6;
                color: var(--text-primary);
                white-space: pre-wrap;
        }

        .chat-original {
                margin-top: var(--space-2);
                font-size: 11.5px;
                color: var(--text-muted);
        }

        .chat-original summary {
                cursor: pointer;
                color: var(--gold);
        }

        .chat-original pre {
                margin: 6px 0 0;
                padding: var(--space-2);
                border-radius: var(--radius-sm);
                border: 1px solid var(--border-hair);
                font-size: 11px;
                white-space: pre-wrap;
                word-break: break-word;
        }

        .chat-compose {
                flex-shrink: 0;
                border: 1px solid var(--border-hair);
                border-radius: var(--radius-md);
                background: rgba(255, 255, 255, 0.02);
                padding: var(--space-3);
        }

        .chat-compose textarea {
                width: 100%;
                resize: vertical;
                border: none;
                background: transparent;
                color: var(--text-primary);
                font: inherit;
                font-size: 13.5px;
        }

        .chat-compose textarea:focus {
                outline: none;
        }

        .chat-actions {
                display: flex;
                justify-content: flex-end;
                margin-top: var(--space-2);
        }

        /* --- Queue --- */
        .job {
                display: flex;
                align-items: flex-start;
                gap: var(--space-3);
                padding: var(--space-3);
                border: 1px solid var(--border-hair);
                border-radius: var(--radius-md);
                background: rgba(255, 255, 255, 0.02);
        }

        .job.failed {
                border-color: rgba(212, 120, 96, 0.4);
        }

        .job-main {
                flex: 1;
                min-width: 0;
        }

        .job-head {
                display: flex;
                align-items: center;
                gap: var(--space-3);
                flex-wrap: wrap;
        }

        .job-stage {
                font-size: 11px;
                font-weight: 600;
                letter-spacing: 0.06em;
                text-transform: uppercase;
                padding: 2px 9px;
                border-radius: var(--radius-pill);
                border: 1px solid var(--border-hair);
                color: var(--text-secondary);
        }

        .job-stage[data-stage='completed'] {
                color: var(--gold-bright);
                border-color: var(--border-gold);
        }

        .job-stage[data-stage='failed'] {
                color: #e8a494;
                border-color: rgba(212, 120, 96, 0.5);
        }

        .job-meta,
        .job-time {
                font-size: 11px;
                color: var(--text-muted);
        }

        .job-time {
                margin-left: auto;
        }

        .job-prompt {
                margin: var(--space-2) 0 0;
                font-size: 12px;
                color: var(--text-secondary);
                display: -webkit-box;
                -webkit-line-clamp: 2;
                line-clamp: 2;
                -webkit-box-orient: vertical;
                overflow: hidden;
        }

        .job-progress {
                display: flex;
                align-items: center;
                gap: var(--space-2);
                margin-top: var(--space-2);
                font-size: 11px;
                color: var(--gold-bright);
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

        .job-message {
                margin: var(--space-2) 0 0;
                font-size: 11.5px;
                color: var(--text-muted);
        }

        .job-error {
                display: flex;
                align-items: center;
                gap: 5px;
                margin: var(--space-2) 0 0;
                font-size: 12px;
                color: #e8a494;
        }

        .job-outputs {
                display: flex;
                gap: var(--space-2);
                margin-top: var(--space-2);
        }

        .load-more {
                margin-top: var(--space-4);
        }

        /* --- Drafts / assets / settings --- */
        .mini-list.wide .mini-item {
                padding: 8px 10px;
        }

        .ref-item {
                display: flex;
                align-items: center;
                gap: var(--space-3);
                padding: 8px 10px;
                border-radius: var(--radius-sm);
                border: 1px solid var(--border-hair);
                background: rgba(255, 255, 255, 0.02);
                color: var(--text-secondary);
        }

        .ref-info {
                flex: 1;
                min-width: 0;
                display: flex;
                flex-direction: column;
                gap: 2px;
        }

        .ref-title {
                font-size: 13px;
                color: var(--text-primary);
        }

        .ref-kind {
                font-size: 11.5px;
                color: var(--text-muted);
        }

        .settings-view .settings-list {
                display: flex;
                flex-direction: column;
                margin: 0 0 var(--space-5);
        }

        .settings-list div {
                display: flex;
                justify-content: space-between;
                gap: var(--space-4);
                padding: 8px 0;
                border-bottom: 1px dotted var(--border-hair);
                font-size: 12.5px;
        }

        .settings-list dt {
                color: var(--text-muted);
        }

        .settings-list dd {
                margin: 0;
                color: var(--text-primary);
                text-align: right;
        }

        .format-list {
                list-style: none;
                margin: 0 0 var(--space-5);
                padding: 0;
                display: flex;
                flex-direction: column;
                gap: 4px;
        }

        .format-list li {
                display: flex;
                align-items: baseline;
                gap: var(--space-3);
                font-size: 12.5px;
        }

        .format-name {
                min-width: 180px;
                color: var(--text-primary);
        }

        .format-state {
                font-size: 10.5px;
                letter-spacing: 0.08em;
                text-transform: uppercase;
                color: var(--text-muted);
        }

        .format-state.ok {
                color: var(--gold-bright);
        }

        .format-note {
                flex: 1;
                min-width: 0;
                color: var(--text-muted);
                font-size: 11.5px;
        }

        .audit-list {
                list-style: none;
                margin: 0;
                padding: 0;
                display: flex;
                flex-direction: column;
                gap: 4px;
                font-size: 12px;
                color: var(--text-secondary);
        }

        .audit-action {
                color: var(--gold);
        }

        .audit-time {
                color: var(--text-muted);
                font-size: 11px;
        }

        /* --- Composer dock --- */
        .composer-dock {
                flex-shrink: 0;
                display: flex;
                justify-content: center;
                padding: 0 var(--space-5) var(--space-5);
                /* Sits above the scroller with a soft fade so the composer reads as a
                   floating tool, matching the Chats and Images workspaces. */
                background: linear-gradient(to top, var(--surface-void) 60%, transparent);
        }

        .composer-dock :global(.composer-wrap) {
                width: min(var(--videos-max-width), 100%);
        }

        /* --- Context panel --- */
        .context {
                width: var(--videos-context-width);
                flex-shrink: 0;
                border-left: 1px solid var(--border-hair);
                background: rgba(10, 10, 9, 0.4);
                overflow-y: auto;
                padding: var(--space-4);
        }

        .context-head {
                display: flex;
                align-items: center;
                justify-content: space-between;
                margin-bottom: var(--space-3);
        }

        .ctx-block {
                margin-bottom: var(--space-5);
        }

        .ctx-title {
                margin: 0;
                font-size: 13.5px;
                color: var(--text-primary);
                font-weight: 600;
        }

        .ctx-sub {
                margin: 3px 0 0;
                font-size: 12px;
                color: var(--text-secondary);
        }

        .ctx-actions {
                display: flex;
                gap: var(--space-2);
                margin-bottom: var(--space-2);
                flex-wrap: wrap;
        }

        .ctx-head-row {
                display: flex;
                align-items: center;
                justify-content: space-between;
                margin-bottom: var(--space-2);
        }

        .shot-row {
                display: flex;
                align-items: center;
                gap: 2px;
        }

        .shot-row .mini-item {
                flex: 1;
                min-width: 0;
        }

        /* --- Dialog helpers --- */
        .fields {
                display: flex;
                flex-direction: column;
                gap: var(--space-3);
        }

        .field {
                display: flex;
                flex-direction: column;
                gap: 5px;
                font-size: 12px;
                color: var(--text-muted);
        }

        .field input,
        .field select,
        .field textarea {
                padding: 9px 12px;
                border-radius: var(--radius-sm);
                border: 1px solid var(--border-hair);
                background: rgba(255, 255, 255, 0.03);
                color: var(--text-primary);
                font: inherit;
                font-size: 13px;
                resize: vertical;
        }

        .field input:focus,
        .field select:focus,
        .field textarea:focus {
                outline: none;
                border-color: var(--border-gold);
        }

        .style-merge-actions {
                display: flex;
                flex-direction: column;
                gap: var(--space-2);
                margin-top: var(--space-3);
        }

        .style-merge-name {
                margin: 0 0 4px;
                font-size: 13px;
                color: var(--text-primary);
        }

        .style-merge-preview {
                margin: 0;
                font-size: 12.5px;
                color: var(--text-muted);
        }

        .merge-btn {
                padding: 9px 13px;
                border-radius: var(--radius-sm);
                border: 1px solid var(--border-hair);
                background: rgba(255, 255, 255, 0.03);
                color: var(--text-secondary);
                font-size: 12.5px;
                text-align: left;
        }

        .merge-btn:hover {
                color: var(--gold-bright);
                border-color: var(--border-gold);
        }

        .move-hint,
        .move-current {
                margin: 0 0 var(--space-3);
                font-size: 12.5px;
                color: var(--text-muted);
        }

        /* --- Responsive --- */
        @media (max-width: 1100px) {
                .folder-layout {
                        grid-template-columns: 1fr;
                }
        }

        @media (max-width: 900px) {
                .vnav {
                        position: fixed;
                        inset: 0 auto 0 0;
                        z-index: var(--z-sidebar);
                        width: min(280px, 80vw);
                        transform: translateX(-102%);
                        transition: transform 180ms ease;
                        background: var(--surface-sidebar);
                        box-shadow: var(--shadow-panel);
                }

                .vnav.open {
                        transform: translateX(0);
                }

                .vnav-close {
                        display: grid;
                }

                .context {
                        position: fixed;
                        inset: 0 0 0 auto;
                        z-index: var(--z-sidebar);
                        width: min(340px, 88vw);
                        background: var(--surface-sidebar);
                        box-shadow: var(--shadow-panel);
                }

                .vbody.with-context .canvas {
                        padding-right: var(--space-5);
                }
        }

        @media (prefers-reduced-motion: reduce) {
                .vnav {
                        transition: none;
                }
        }
</style>


