/**
 * Honest status strings for features whose backend is intentionally not wired up
 * yet. Centralised so the Home route and the composer never drift apart and no
 * surface accidentally implies that unimplemented AI/upload/voice work exists.
 */
export const NOT_CONNECTED = {
        chat: 'Message not sent — the ARTI chat backend is not connected yet.',
        upload: 'Not uploaded — file uploads are not connected yet.',
        voice: 'Voice input is not connected yet.',
        profile: 'Interface preference only — profiles are not separate accounts yet.'
} as const;
