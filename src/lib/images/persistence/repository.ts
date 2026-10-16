/**
 * Persistence boundary for the Images module.
 *
 * Components and state never touch storage directly: they call an
 * `ImageRepository`. Today the only live implementation is browser-local; when
 * Supabase is configured, a `supabaseImageRepository.ts` becomes the
 * implementation and the rest of the module is unchanged. Keeping this interface
 * narrow is what makes that swap safe.
 *
 * Every method is scoped by `WorkspaceScope`, so an implementation is forced to
 * consider ownership rather than returning a global bag of records. Server-side
 * authorization (e.g. Supabase Row Level Security) remains the real enforcement
 * point — the scope passed here is an echo of the authenticated identity, never a
 * substitute for it.
 */

import type {
        ImageAsset,
        ImageConversation,
        ImageConversationPatch,
        ImageMessage,
        ImageMessagePatch
} from '../types';
import type { WorkspaceScope } from '#lib/shared/scope';

export interface ImageRepository {
        /** Short label for the storage backend, shown in the honest storage notice. */
        readonly label: string;
        /** Whether records survive a reload. */
        readonly persistent: boolean;
        /** Whether records may be visible to more than one person (shared storage). */
        readonly shared: boolean;

        listConversations(scope: WorkspaceScope): Promise<ImageConversation[]>;
        createConversation(scope: WorkspaceScope, conversation: ImageConversation): Promise<ImageConversation>;
        updateConversation(
                scope: WorkspaceScope,
                id: string,
                patch: ImageConversationPatch
        ): Promise<ImageConversation | null>;
        deleteConversation(scope: WorkspaceScope, id: string): Promise<void>;

        listMessages(scope: WorkspaceScope, conversationId: string): Promise<ImageMessage[]>;
        appendMessage(scope: WorkspaceScope, message: ImageMessage): Promise<ImageMessage>;
        updateMessage(scope: WorkspaceScope, id: string, patch: ImageMessagePatch): Promise<ImageMessage | null>;
        deleteMessage(scope: WorkspaceScope, id: string): Promise<void>;

        /** Assets the user explicitly saved to their library, newest first. */
        listSavedAssets(scope: WorkspaceScope): Promise<ImageAsset[]>;
        /** Inserts or updates a saved asset. Removal is `removeSavedAsset`. */
        saveAsset(scope: WorkspaceScope, asset: ImageAsset): Promise<ImageAsset>;
        removeSavedAsset(scope: WorkspaceScope, assetId: string): Promise<void>;
}
