/**
 * The workspace scope shared by the Chats and Images modules.
 *
 * `userId` is null until real authentication exists. It is deliberately NOT
 * derived from the presentation-only profile switcher, because that control is a
 * UI preference and not an identity — deriving it would imply an authorization
 * boundary the application does not yet have.
 *
 * Server-side authorization (e.g. Supabase Row Level Security) remains the real
 * enforcement point; the scope passed to a repository is an echo of the
 * authenticated identity, never a substitute for it.
 */

export interface WorkspaceScope {
        workspaceId: string;
        userId: string | null;
}

/** Fixed local workspace marker. Replaced by a real workspace id once auth lands. */
export const WORKSPACE_ID = 'arti-home';

/** Builds a scope for the given (currently absent) authenticated user. */
export function currentScope(userId: string | null = null): WorkspaceScope {
        return { workspaceId: WORKSPACE_ID, userId };
}
