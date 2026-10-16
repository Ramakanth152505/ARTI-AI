/**
 * Workspace scope and repository selection for the Videos module.
 *
 * One explicit, replaceable scope object is shared with Chats and Images:
 *
 *   - `workspaceId` is a fixed local workspace marker.
 *   - `userId` is `null` until an auth session supplies a real user id.
 *
 * When authentication lands, `getVideoRepository()` returns a Supabase-backed
 * repository. Until then the browser-local repository is used and the UI says so.
 */

import { isSupabaseConfigured } from './config';
import { LocalVideoRepository } from './persistence/localRepository';
import { currentScope, WORKSPACE_ID, type WorkspaceScope } from '#lib/shared/scope';
import type { VideoRepository } from './persistence/repository';

export { currentScope, WORKSPACE_ID };
export type { WorkspaceScope };

/** The active workspace scope for the Videos module. */
export function videoScope(userId: string | null = null): WorkspaceScope {
        return currentScope(userId);
}

/**
 * Selects the persistence implementation.
 *
 * There is deliberately no second client and no direct database access from the
 * browser: the Supabase path is wired when a repository implementation exists, and
 * until then the honest local fallback is used so the module still works without
 * pretending to be shared storage.
 */
export function getVideoRepository(): VideoRepository {
        if (isSupabaseConfigured()) {
                console.warn(
                        '[arti] Supabase is configured but no shared VideoRepository is implemented; using browser-local storage.'
                );
        }
        return new LocalVideoRepository(videoScope());
}
