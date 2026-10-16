/**
 * Workspace scope and repository selection.
 *
 * ARTI AI is intended as a two-person workspace (Ramakanth and Tejasree). That
 * needs real authentication and per-user authorization, neither of which exists
 * yet. Rather than inventing identities, this module exposes one explicit,
 * replaceable scope object:
 *
 *   - `workspaceId` is a fixed local workspace marker.
 *   - `userId` is `null` until an auth session supplies a real user id.
 *
 * When authentication lands, `currentScope()` reads the authenticated session
 * and a Supabase-backed repository is returned by `getChatRepository()`. Until
 * then the browser-local repository is used and the UI says so plainly.
 */

import { isSupabaseConfigured } from './config';
import { LocalChatRepository } from './persistence/localRepository';
import { currentScope, WORKSPACE_ID, type WorkspaceScope } from '#lib/shared/scope';
import type { ChatRepository } from './persistence/repository';

export { currentScope, WORKSPACE_ID };
export type { WorkspaceScope };

/**
 * Selects the persistence implementation.
 *
 * There is deliberately no second client and no direct database access from the
 * browser: the Supabase path is wired when a repository implementation exists,
 * and until then the honest local fallback is used so the module still works
 * without pretending to be shared storage.
 */
export function getChatRepository(): ChatRepository {
	if (isSupabaseConfigured()) {
		// A Supabase-backed repository would be returned here. It is not
		// implemented, so falling through keeps behaviour honest instead of
		// silently writing conversation data to an unknown place.
		console.warn(
			'[arti] Supabase is configured but no shared ChatRepository is implemented; using browser-local storage.'
		);
	}
	return new LocalChatRepository(currentScope());
}
