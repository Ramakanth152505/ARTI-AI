-- ARTI AI — Videos workspace schema.
--
-- This migration is the server-side counterpart to `src/lib/videos/`. The
-- TypeScript repository interface (`persistence/repository.ts`) is deliberately
-- narrow so a `supabaseVideoRepository` can map each entity group onto the tables
-- below without touching components.
--
-- Design rules reflected here:
--   * Folders are recursive: `parent_id` self-reference, with a trigger that
--     rejects a cycle (a folder may never become its own ancestor/descendant)
--     and a depth guard so a runaway tree cannot be built accidentally.
--   * Media bytes never live in the database. `media_assets.storage_path` points
--     at a private bucket row; only metadata, permissions and processing status
--     are stored here.
--   * Every table carries `owner_id` and RLS policies so authorization is
--     enforced in the database, not merely hidden in the UI.
--   * Requested values (what the user asked for) and produced values (what was
--     actually measured) are separate columns, so the app can never label a
--     1080p file as native 16K.
--   * Stable text ids are generated client-side; timestamps are always recorded.
--
-- Apply with the Supabase CLI: `supabase db push` (or `supabase migration up`).

-- ---------------------------------------------------------------------------
-- Enum types
-- ---------------------------------------------------------------------------

create type project_kind as enum ('project', 'series', 'movie', 'short', 'collection');
create type scene_parent_kind as enum ('episode', 'movie-part', 'project');
create type prompt_target_kind as enum ('shot', 'scene', 'episode', 'movie-part', 'project', 'chat');
create type asset_kind as enum ('video', 'image', 'audio', 'subtitle', 'document');
create type asset_status as enum ('generating', 'ready', 'failed', 'cancelled', 'draft');
create type job_stage as enum (
        'draft', 'validating', 'queued', 'preparing', 'generating', 'upscaling',
        'encoding', 'quality-checking', 'completed', 'failed', 'cancelled'
);
create type reference_kind as enum ('character', 'environment', 'prop', 'style', 'other');
create type share_target_kind as enum ('project', 'folder', 'series', 'season', 'episode', 'asset');
create type share_level as enum ('view', 'edit');
create type render_target_kind as enum ('scene', 'episode', 'movie-part', 'project', 'season');

-- ---------------------------------------------------------------------------
-- Folders — recursive tree with cycle prevention
-- ---------------------------------------------------------------------------

create table folders (
        id          text primary key,
        owner_id    uuid not null references auth.users (id) on delete cascade,
        project_id  text,
        parent_id   text references folders (id) on delete cascade,
        name        text not null check (length(trim(name)) > 0),
        sort_order  integer not null default 0,
        pinned      boolean not null default false,
        archived    boolean not null default false,
        created_at  timestamptz not null default now(),
        updated_at  timestamptz not null default now()
);

create index folders_owner_idx on folders (owner_id);
create index folders_project_idx on folders (project_id);
create index folders_parent_idx on folders (parent_id);
create unique index folders_sibling_name_idx on folders (owner_id, project_id, parent_id, lower(name));

-- Reject a folder that would become its own ancestor. Walks the proposed parent
-- chain; if the row's own id appears, the new relationship is a cycle.
create or replace function folders_prevent_cycle() returns trigger
language plpgsql as $$
declare
        ancestor text := new.parent_id;
        hops     integer := 0;
begin
        if new.parent_id is null then
                return new;
        end if;
        if new.parent_id = new.id then
                raise exception 'folder % cannot be its own parent', new.id;
        end if;
        while ancestor is not null loop
                if ancestor = new.id then
                        raise exception 'folder % cannot become its own descendant', new.id;
                end if;
                hops := hops + 1;
                if hops > 100 then
                        raise exception 'folder hierarchy exceeds the supported depth';
                end if;
                select parent_id into ancestor from folders where id = ancestor;
        end loop;
        return new;
end;
$$;

create trigger folders_cycle_guard
        before insert or update of parent_id on folders
        for each row execute function folders_prevent_cycle();

-- ---------------------------------------------------------------------------
-- Projects, series, seasons, episodes, movie parts
-- ---------------------------------------------------------------------------

create table projects (
        id                    text primary key,
        owner_id              uuid not null references auth.users (id) on delete cascade,
        name                  text not null check (length(trim(name)) > 0),
        kind                  project_kind not null default 'project',
        description           text not null default '',
        folder_id             text references folders (id) on delete set null,
        default_aspect_ratio  text not null default '16:9',
        default_resolution    text not null default '1080p',
        default_frame_rate    integer not null default 24,
        default_style_id      text,
        language              text not null default 'en',
        audio_preferences     jsonb not null default '{}'::jsonb,
        instructions          text not null default '',
        cover_asset_id        text,
        pinned                boolean not null default false,
        archived              boolean not null default false,
        created_at            timestamptz not null default now(),
        updated_at            timestamptz not null default now()
);

create index projects_owner_idx on projects (owner_id);
create index projects_folder_idx on projects (folder_id);
create index projects_archived_idx on projects (owner_id, archived);

create table series (
        id               text primary key,
        owner_id         uuid not null references auth.users (id) on delete cascade,
        project_id       text not null references projects (id) on delete cascade,
        title            text not null check (length(trim(title)) > 0),
        description      text not null default '',
        genre            text not null default '',
        premise          text not null default '',
        audience         text not null default '',
        language         text not null default 'en',
        tone             text not null default '',
        style_id         text,
        aspect_ratio     text not null default '16:9',
        frame_rate       integer not null default 24,
        continuity_rules text not null default '',
        audio_preferences jsonb not null default '{}'::jsonb,
        target_seasons   integer,
        target_episodes  integer,
        created_at       timestamptz not null default now(),
        updated_at       timestamptz not null default now()
);

create index series_owner_idx on series (owner_id);
create index series_project_idx on series (project_id);

create table seasons (
        id             text primary key,
        owner_id       uuid not null references auth.users (id) on delete cascade,
        series_id      text not null references series (id) on delete cascade,
        number         integer not null,
        title          text not null default '',
        description    text not null default '',
        arc            text not null default '',
        notes          text not null default '',
        cover_asset_id text,
        pinned         boolean not null default false,
        created_at     timestamptz not null default now(),
        updated_at     timestamptz not null default now(),
        unique (series_id, number)
);

create index seasons_series_idx on seasons (series_id);

create table episodes (
        id                      text primary key,
        owner_id                uuid not null references auth.users (id) on delete cascade,
        series_id               text not null references series (id) on delete cascade,
        season_id               text not null references seasons (id) on delete cascade,
        number                  integer not null,
        title                   text not null default '',
        synopsis                text not null default '',
        script                  text not null default '',
        target_duration_seconds numeric,
        notes                   text not null default '',
        created_at              timestamptz not null default now(),
        updated_at              timestamptz not null default now(),
        unique (season_id, number)
);

create index episodes_season_idx on episodes (season_id);

create table movie_parts (
        id                      text primary key,
        owner_id                uuid not null references auth.users (id) on delete cascade,
        project_id              text not null references projects (id) on delete cascade,
        number                  integer not null,
        title                   text not null default '',
        synopsis                text not null default '',
        script                  text not null default '',
        target_duration_seconds numeric,
        notes                   text not null default '',
        created_at              timestamptz not null default now(),
        updated_at              timestamptz not null default now(),
        unique (project_id, number)
);

create index movie_parts_project_idx on movie_parts (project_id);

-- ---------------------------------------------------------------------------
-- Scenes and shots
-- ---------------------------------------------------------------------------

create table scenes (
        id                      text primary key,
        owner_id                uuid not null references auth.users (id) on delete cascade,
        project_id              text not null references projects (id) on delete cascade,
        parent_kind             scene_parent_kind not null,
        parent_id               text not null,
        number                  integer not null,
        title                   text not null default '',
        description             text not null default '',
        target_duration_seconds numeric,
        notes                   text not null default '',
        created_at              timestamptz not null default now(),
        updated_at              timestamptz not null default now()
);

create index scenes_owner_idx on scenes (owner_id);
create index scenes_project_idx on scenes (project_id);
create index scenes_parent_idx on scenes (parent_kind, parent_id);

create table shots (
        id                      text primary key,
        owner_id                uuid not null references auth.users (id) on delete cascade,
        scene_id                text not null references scenes (id) on delete cascade,
        number                  integer not null,
        title                   text not null default '',
        prompt                  text not null default '',
        style_id                text,
        aspect_ratio            text not null default '16:9',
        resolution              text not null default '1080p',
        frame_rate              integer not null default 24,
        target_duration_seconds numeric not null default 0,
        camera_movement         text not null default '',
        notes                   text not null default '',
        created_at              timestamptz not null default now(),
        updated_at              timestamptz not null default now(),
        unique (scene_id, number)
);

create index shots_scene_idx on shots (scene_id);

-- ---------------------------------------------------------------------------
-- Prompt versions — immutable, so an approved prompt is never lost
-- ---------------------------------------------------------------------------

create table prompt_versions (
        id                      text primary key,
        owner_id                uuid not null references auth.users (id) on delete cascade,
        project_id              text not null references projects (id) on delete cascade,
        target_kind             prompt_target_kind not null,
        target_id               text not null,
        original_prompt         text not null default '',
        composed_prompt         text not null default '',
        negative_prompt         text,
        style_id                text,
        aspect_ratio            text not null default '16:9',
        resolution              text not null default '1080p',
        frame_rate              integer not null default 24,
        target_duration_seconds numeric not null default 0,
        settings                jsonb not null default '{}'::jsonb,
        note                    text,
        created_at              timestamptz not null default now()
);

create index prompt_versions_target_idx on prompt_versions (target_kind, target_id);
create index prompt_versions_project_idx on prompt_versions (project_id);

-- ---------------------------------------------------------------------------
-- Media assets — a reference to object storage, never the bytes
-- ---------------------------------------------------------------------------

create table media_assets (
        id                       text primary key,
        owner_id                 uuid not null references auth.users (id) on delete cascade,
        project_id               text not null references projects (id) on delete cascade,
        scene_id                 text references scenes (id) on delete set null,
        shot_id                  text references shots (id) on delete set null,
        folder_id                text references folders (id) on delete set null,
        kind                     asset_kind not null,
        name                     text not null default '',
        status                   asset_status not null default 'draft',
        -- Private bucket path. Bytes live in Storage, not in this row.
        storage_path             text,
        mime_type                text,
        -- MEASURED values from the produced file. Distinct from requested ones.
        produced_duration_seconds numeric,
        frame_count              integer,
        width                    integer,
        height                   integer,
        frame_rate               numeric,
        bytes                    bigint,
        prompt_version_id        text references prompt_versions (id) on delete set null,
        style_id                 text,
        approved                 boolean not null default false,
        draft                    boolean not null default false,
        error                    text,
        created_at               timestamptz not null default now(),
        updated_at               timestamptz not null default now()
);

create index media_assets_owner_idx on media_assets (owner_id);
create index media_assets_project_idx on media_assets (project_id);
create index media_assets_folder_idx on media_assets (folder_id);
create index media_assets_status_idx on media_assets (project_id, status);

-- ---------------------------------------------------------------------------
-- Generation jobs and their event log
-- ---------------------------------------------------------------------------

create table generation_jobs (
        id                         text primary key,
        owner_id                   uuid not null references auth.users (id) on delete cascade,
        project_id                 text not null references projects (id) on delete cascade,
        series_id                  text references series (id) on delete set null,
        season_id                  text references seasons (id) on delete set null,
        episode_id                 text references episodes (id) on delete set null,
        movie_part_id              text references movie_parts (id) on delete set null,
        scene_id                   text references scenes (id) on delete set null,
        shot_id                    text references shots (id) on delete set null,
        prompt_version_id          text not null references prompt_versions (id) on delete restrict,
        style_id                   text,
        pipeline                   text not null default '',
        -- Requested output, as asked for by the user.
        requested_duration_seconds numeric not null default 0,
        requested_resolution       text not null default '1080p',
        requested_aspect_ratio     text not null default '16:9',
        requested_frame_rate       integer not null default 24,
        stage                      job_stage not null default 'draft',
        progress                   integer check (progress between 0 and 100),
        priority                   integer not null default 0,
        retry_count                integer not null default 0,
        max_retries                integer not null default 2,
        -- Unique per owner so a page refresh cannot enqueue the same job twice.
        idempotency_key            text not null,
        asset_ids                  text[] not null default '{}',
        message                    text,
        error                      text,
        created_at                 timestamptz not null default now(),
        updated_at                 timestamptz not null default now(),
        started_at                 timestamptz,
        finished_at                timestamptz,
        unique (owner_id, idempotency_key)
);

create index generation_jobs_owner_idx on generation_jobs (owner_id);
create index generation_jobs_project_idx on generation_jobs (project_id);
create index generation_jobs_stage_idx on generation_jobs (owner_id, stage);

create table generation_job_events (
        id         text primary key,
        job_id     text not null references generation_jobs (id) on delete cascade,
        stage      job_stage not null,
        message    text not null default '',
        progress   integer check (progress between 0 and 100),
        created_at timestamptz not null default now()
);

create index generation_job_events_job_idx on generation_job_events (job_id, created_at);

-- ---------------------------------------------------------------------------
-- Render / assembly jobs and exports
-- ---------------------------------------------------------------------------

create table render_jobs (
        id              text primary key,
        owner_id        uuid not null references auth.users (id) on delete cascade,
        project_id      text not null references projects (id) on delete cascade,
        target_kind     render_target_kind not null,
        target_id       text not null,
        asset_ids       text[] not null default '{}',
        stage           job_stage not null default 'draft',
        progress        integer check (progress between 0 and 100),
        output_asset_id text references media_assets (id) on delete set null,
        error           text,
        created_at      timestamptz not null default now(),
        updated_at      timestamptz not null default now()
);

create index render_jobs_project_idx on render_jobs (project_id);

create table export_jobs (
        id              text primary key,
        owner_id        uuid not null references auth.users (id) on delete cascade,
        project_id      text not null references projects (id) on delete cascade,
        asset_id        text not null references media_assets (id) on delete cascade,
        format          text not null,
        stage           job_stage not null default 'draft',
        output_asset_id text references media_assets (id) on delete set null,
        error           text,
        created_at      timestamptz not null default now(),
        updated_at      timestamptz not null default now()
);

create index export_jobs_asset_idx on export_jobs (asset_id);

-- ---------------------------------------------------------------------------
-- References / continuity bible
-- ---------------------------------------------------------------------------

create table project_references (
        id          text primary key,
        owner_id    uuid not null references auth.users (id) on delete cascade,
        project_id  text not null references projects (id) on delete cascade,
        kind        reference_kind not null,
        name        text not null,
        description text not null default '',
        rules       text not null default '',
        asset_id    text references media_assets (id) on delete set null,
        created_at  timestamptz not null default now(),
        updated_at  timestamptz not null default now()
);

create index project_references_project_idx on project_references (project_id);

create table character_references (
        id                 text primary key,
        owner_id           uuid not null references auth.users (id) on delete cascade,
        project_id         text not null references projects (id) on delete cascade,
        reference_id       text not null references project_references (id) on delete cascade,
        character_id       text not null,
        name               text not null,
        appearance         text not null default '',
        costume            text not null default '',
        consistency_notes  text not null default '',
        created_at         timestamptz not null default now(),
        updated_at         timestamptz not null default now()
);

create index character_references_project_idx on character_references (project_id);

-- ---------------------------------------------------------------------------
-- Chat turns and saved prompts
-- ---------------------------------------------------------------------------

create table video_chat_messages (
        id              text primary key,
        owner_id        uuid not null references auth.users (id) on delete cascade,
        project_id      text not null references projects (id) on delete cascade,
        role            text not null check (role in ('user', 'assistant')),
        content         text not null default '',
        kind            text check (kind in ('chat', 'enhancement', 'breakdown', 'shot-list', 'note')),
        original_prompt text,
        style_id        text,
        created_at      timestamptz not null default now()
);

create index video_chat_messages_project_idx on video_chat_messages (project_id, created_at);

create table saved_prompts (
        id         text primary key,
        owner_id   uuid not null references auth.users (id) on delete cascade,
        project_id text not null references projects (id) on delete cascade,
        title      text not null,
        prompt     text not null,
        style_id   text,
        created_at timestamptz not null default now()
);

create index saved_prompts_project_idx on saved_prompts (project_id);

-- ---------------------------------------------------------------------------
-- Sharing and audit
-- ---------------------------------------------------------------------------

create table sharing_permissions (
        id          text primary key,
        owner_id    uuid not null references auth.users (id) on delete cascade,
        target_kind share_target_kind not null,
        target_id   text not null,
        grantee_id  uuid references auth.users (id) on delete cascade,
        level       share_level not null default 'view',
        created_at  timestamptz not null default now(),
        unique (target_kind, target_id, grantee_id)
);

create index sharing_permissions_grantee_idx on sharing_permissions (grantee_id);

create table audit_events (
        id          text primary key,
        owner_id    uuid not null references auth.users (id) on delete cascade,
        action      text not null,
        target_kind text not null,
        target_id   text not null,
        detail      text not null default '',
        created_at  timestamptz not null default now()
);

create index audit_events_owner_idx on audit_events (owner_id, created_at desc);

-- ---------------------------------------------------------------------------
-- updated_at maintenance
-- ---------------------------------------------------------------------------

create or replace function touch_updated_at() returns trigger
language plpgsql as $$
begin
        new.updated_at := now();
        return new;
end;
$$;

do $$
declare
        t text;
begin
        foreach t in array array[
                'folders', 'projects', 'series', 'seasons', 'episodes', 'movie_parts',
                'scenes', 'shots', 'media_assets', 'generation_jobs', 'render_jobs',
                'export_jobs', 'project_references', 'character_references'
        ]
        loop
                execute format(
                        'create trigger %I_touch before update on %I
                         for each row execute function touch_updated_at()', t, t
                );
        end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- Row Level Security
--
-- Every table is owner-scoped: a row is visible to its owner and to any granted
-- collaborator at the matching level. Sharing is read through SECURITY DEFINER
-- helpers so the policies stay readable and do not recurse into their own table.
-- ---------------------------------------------------------------------------

-- True when the caller owns the project, or holds an explicit grant on it.
create or replace function can_access_project(p_project_id text, need_edit boolean default false)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
        select exists (
                select 1 from projects p
                where p.id = p_project_id
                  and (
                        p.owner_id = auth.uid()
                        or exists (
                                select 1 from sharing_permissions s
                                where s.target_kind = 'project'
                                  and s.target_id = p_project_id
                                  and s.grantee_id = auth.uid()
                                  and (not need_edit or s.level = 'edit')
                        )
                  )
        );
$$;

-- Enables RLS on a table and adds an owner-only policy set.
create or replace function enable_owner_rls(p_table text) returns void
language plpgsql as $$
begin
        execute format('alter table %I enable row level security', p_table);
        -- Owner has full control of their own rows.
        execute format(
                'create policy %I_owner_all on %I
                 using (owner_id = auth.uid())
                 with check (owner_id = auth.uid())', p_table, p_table
        );
end;
$$;

-- Owner-scoped tables.
do $$
declare
        t text;
begin
        foreach t in array array[
                'folders', 'series', 'seasons', 'episodes', 'movie_parts', 'scenes',
                'shots', 'prompt_versions', 'media_assets', 'generation_jobs',
                'render_jobs', 'export_jobs', 'project_references',
                'character_references', 'video_chat_messages', 'saved_prompts',
                'sharing_permissions', 'audit_events'
        ]
        loop
                perform enable_owner_rls(t);
        end loop;
end;
$$;

-- Projects additionally allow granted collaborators to read (and edit if granted).
alter table projects enable row level security;

create policy projects_owner_all on projects
        using (owner_id = auth.uid())
        with check (owner_id = auth.uid());

create policy projects_shared_read on projects
        for select
        using (can_access_project(id, false));

create policy projects_shared_update on projects
        for update
        using (can_access_project(id, true))
        with check (can_access_project(id, true));

-- Project-scoped children: visible when the parent project is readable, and
-- writable only when the project grants edit. This keeps a collaborator's role
-- consistent across every table without repeating the grant logic.
create or replace function enable_project_child_rls(p_table text) returns void
language plpgsql as $$
begin
        execute format('alter table %I enable row level security', p_table);
        execute format(
                'create policy %I_owner_all on %I
                 using (owner_id = auth.uid())
                 with check (owner_id = auth.uid())', p_table, p_table
        );
        execute format(
                'create policy %I_project_read on %I
                 for select using (can_access_project(project_id, false))', p_table, p_table
        );
        execute format(
                'create policy %I_project_write on %I
                 for all using (can_access_project(project_id, true))
                 with check (can_access_project(project_id, true))', p_table, p_table
        );
end;
$$;

do $$
declare
        t text;
begin
        foreach t in array array[
                'series', 'movie_parts', 'scenes' -- direct project_id columns
        ]
        loop
                execute format('drop policy if exists %I_owner_all on %I', t, t);
                perform enable_project_child_rls(t);
        end loop;
end;
$$;

-- Seasons and episodes hang off a series, not the project directly, so share
-- access is resolved through the series' project.
create or replace function can_access_series(p_series_id text, need_edit boolean default false)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
        select exists (
                select 1 from series s
                where s.id = p_series_id
                  and can_access_project(s.project_id, need_edit)
        );
$$;

-- Seasons: owner full control, collaborators by the series' project grant.
drop policy if exists seasons_owner_all on seasons;
create policy seasons_owner_all on seasons
        using (owner_id = auth.uid())
        with check (owner_id = auth.uid());
create policy seasons_shared_read on seasons
        for select using (can_access_series(series_id, false));
create policy seasons_shared_write on seasons
        for all using (can_access_series(series_id, true))
        with check (can_access_series(series_id, true));

-- Episodes: identical shape, resolved through the series.
drop policy if exists episodes_owner_all on episodes;
create policy episodes_owner_all on episodes
        using (owner_id = auth.uid())
        with check (owner_id = auth.uid());
create policy episodes_shared_read on episodes
        for select using (can_access_series(series_id, false));
create policy episodes_shared_write on episodes
        for all using (can_access_series(series_id, true))
        with check (can_access_series(series_id, true));

-- Job events inherit their parent job's visibility.
alter table generation_job_events enable row level security;

create policy generation_job_events_read on generation_job_events
        for select
        using (exists (
                select 1 from generation_jobs j
                where j.id = generation_job_events.job_id
                  and j.owner_id = auth.uid()
        ));

create policy generation_job_events_write on generation_job_events
        for all
        using (exists (
                select 1 from generation_jobs j
                where j.id = generation_job_events.job_id
                  and j.owner_id = auth.uid()
        ))
        with check (exists (
                select 1 from generation_jobs j
                where j.id = generation_job_events.job_id
                  and j.owner_id = auth.uid()
        ));

-- ---------------------------------------------------------------------------
-- Private storage bucket for video media and references
--
-- Bytes live here; `media_assets.storage_path` references an object. Objects are
-- namespaced by owner id, and the policies only allow an owner to touch their own
-- prefix. This bucket is private: no public URLs are issued.
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('videos', 'videos', false)
on conflict (id) do nothing;

create policy videos_read on storage.objects
        for select to authenticated
        using (
                bucket_id = 'videos'
                and (storage.foldername(name))[1] = auth.uid()::text
        );

create policy videos_write on storage.objects
        for insert to authenticated
        with check (
                bucket_id = 'videos'
                and (storage.foldername(name))[1] = auth.uid()::text
        );

create policy videos_update on storage.objects
        for update to authenticated
        using (
                bucket_id = 'videos'
                and (storage.foldername(name))[1] = auth.uid()::text
        );

create policy videos_delete on storage.objects
        for delete to authenticated
        using (
                bucket_id = 'videos'
                and (storage.foldername(name))[1] = auth.uid()::text
        );
