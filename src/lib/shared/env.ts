/**
 * Environment readers shared by the Chats and Images modules.
 *
 * `import.meta.env` is read lazily inside each function so the values are
 * resolved at runtime (and can be absent during a plain Node unit-test run)
 * rather than captured once at module load.
 */

/** Reads a Vite environment value as a trimmed string, or an empty string. */
export function readEnv(name: string): string {
        const env = (import.meta as unknown as { env?: Record<string, unknown> }).env;
        const value = env?.[name];
        return typeof value === 'string' ? value.trim() : '';
}

/**
 * Whether the hosted intelligence service is configured.
 *
 * There is intentionally no default endpoint: ARTI's model service is privately
 * hosted, so its address is deployment configuration, not source code.
 */
export function isChatModelConfigured(): boolean {
        return readEnv('VITE_ARTI_CHAT_ENDPOINT').length > 0;
}

/** Whether a Supabase project is configured for shared storage. */
export function isSupabaseConfigured(): boolean {
        return readEnv('VITE_SUPABASE_URL').length > 0 && readEnv('VITE_SUPABASE_ANON_KEY').length > 0;
}
