/**
 * Workspace scope and repository selection for the Images module.
 *
 * There is one explicit, replaceable scope object shared with the Chats module:
 *
 *   - `workspaceId` is a fixed local workspace marker.
 *   - `userId` is `null` until an auth session supplies a real user id.
 *
 * When authentication lands, `getImageRepository()` returns a Supabase-backed
 * repository. Until then the browser-local repository is used and the UI says so.
 */

import { isSupabaseConfigured } from './config';
import { LocalImageRepository } from './persistence/localRepository';
import { currentScope, WORKSPACE_ID, type WorkspaceScope } from '#lib/shared/scope';
import type { ImageRepository } from './persistence/repository';

export { currentScope, WORKSPACE_ID };
export type { WorkspaceScope };

/**
 * The active workspace scope for the Images module.
 *
 * `userId` stays null: the profile dropdown is a presentation preference, so
 * deriving ownership from it would imply account isolation that does not exist.
 */
export function imageScope(userId: string | null = null): WorkspaceScope {
        return currentScope(userId);
}

/**
 * Selects the persistence implementation.
 *
 * There is deliberately no second client and no direct database access from the
 * browser: the Supabase path is wired when a repository implementation exists,
 * and until then the honest local fallback is used so the module still works
 * without pretending to be shared storage.
 */
export function getImageRepository(): ImageRepository {
        if (isSupabaseConfigured()) {
                // A Supabase-backed repository would be returned here. It is not
                // implemented, so falling through keeps behaviour honest instead of
                // silently writing image data to an unknown place.
                console.warn(
                        '[arti] Supabase is configured but no shared ImageRepository is implemented; using browser-local storage.'
                );
        }
        return new LocalImageRepository(imageScope());
}
