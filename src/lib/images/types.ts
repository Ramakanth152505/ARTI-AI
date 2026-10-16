/**
 * Data contracts for the ARTI AI Images module.
 *
 * These types are the single description of an image conversation, its messages,
 * its generated assets and its reference attachments. The persistence layer, the
 * generation service and every component import them from here so the schema
 * exists in exactly one place.
 *
 * A hard distinction is kept between:
 *  - `ImageAttachment` — a file the *user* supplied (a reference image).
 *  - `ImageAsset`      — an image the *generation service* returned.
 * A user-provided file is never promoted into a generated asset, and a generated
 * asset only ever carries a URL the service actually returned.
 */

import type { AspectRatio } from './styles';

export type ImageMessageRole = 'user' | 'assistant';

/**
 * `streaming` is an in-flight job. `stopped` records a user cancellation (the
 * client stopped reading; it cannot prove the remote job halted). `error` means
 * the request failed and any content present is partial.
 */
export type ImageMessageStatus = 'complete' | 'streaming' | 'stopped' | 'error';

/** Lifecycle of a generated asset, mirroring the backend job states. */
export type ImageAssetStatus = 'generating' | 'ready' | 'failed' | 'cancelled';

/** Lifecycle of a user-supplied reference file. Nothing reaches `ready` without a real store. */
export type ImageAttachmentStatus = 'selected' | 'failed' | 'rejected';

/**
 * A reference image the user selected. `previewUrl` is a browser object URL used
 * only for local display — it is never sent to the generation service and is
 * never treated as a generated result.
 */
export interface ImageAttachment {
        id: string;
        /** Original file name, kept for display only — never used as a path. */
        name: string;
        size: number;
        /** Browser-declared MIME type, treated as a hint and re-validated server-side. */
        mimeType: string;
        status: ImageAttachmentStatus;
        detail?: string;
        /** Local-only preview URL, revoked when the attachment is removed. */
        previewUrl?: string;
        /** Identifier returned by the storage service once it confirms an upload. */
        storageRef?: string;
}

export interface ImageAsset {
        id: string;
        messageId: string;
        conversationId: string;
        /** The exact final prompt sent to the service. */
        prompt: string;
        negativePrompt?: string;
        styleId: string | null;
        styleName?: string;
        aspectRatio: AspectRatio;
        /** Intrinsic pixel size reported by the service, used to reserve layout space. */
        width?: number;
        height?: number;
        status: ImageAssetStatus;
        /**
         * Real asset URL returned by the generation service. Absent until the
         * service confirms an image — never populated with a placeholder.
         */
        url?: string;
        mimeType?: string;
        /** Service job identifier, when the backend is asynchronous. */
        jobId?: string;
        /** The reference attachment this result was derived from, when applicable. */
        referenceAttachmentId?: string;
        /** Whether the user marked this result as kept in their library. */
        saved: boolean;
        createdAt: string;
        updatedAt: string;
        /** Sanitised, user-safe failure text. Never a raw server exception. */
        error?: string;
}

export interface ImageMessage {
        id: string;
        conversationId: string;
        role: ImageMessageRole;
        /** Prompt text for a user message; explanation or enhanced prompt for an assistant one. */
        content: string;
        status: ImageMessageStatus;
        createdAt: string;
        updatedAt: string;
        /** For assistant messages: the user message this attempt answers. */
        replyTo?: string;
        /** Assets produced by this message. Empty for a plain text turn. */
        assets: ImageAsset[];
        attachments: ImageAttachment[];
        /** Style used for the request, if any. */
        styleId?: string | null;
        styleName?: string;
        aspectRatio?: AspectRatio;
        negativePrompt?: string;
        /**
         * The prompt as the user wrote it, before enhancement. Kept so the user can
         * compare the enhanced version against their original intent.
         */
        originalPrompt?: string;
        /** Marks an assistant message that carries an enhanced prompt suggestion. */
        kind?: 'enhancement' | 'note';
        error?: string;
}

export interface ImageConversation {
        id: string;
        ownerId: string;
        /** Always non-empty; starts as the "New image" placeholder. */
        title: string;
        /** True while the title is still the automatic placeholder. */
        titleIsAuto: boolean;
        createdAt: string;
        updatedAt: string;
        pinned: boolean;
        archived: boolean;
        /** Style remembered for this conversation, so reopening restores it. */
        styleId: string | null;
        /** Output shape remembered for this conversation. */
        aspectRatio: AspectRatio;
}

/** Patch accepted by the conversation update call. */
export interface ImageConversationPatch {
        title?: string;
        titleIsAuto?: boolean;
        pinned?: boolean;
        archived?: boolean;
        styleId?: string | null;
        aspectRatio?: AspectRatio;
}

/** Patch accepted by the message update call. */
export interface ImageMessagePatch {
        content?: string;
        status?: ImageMessageStatus;
        assets?: ImageAsset[];
        attachments?: ImageAttachment[];
        error?: string | null;
}
