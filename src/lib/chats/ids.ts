/**
 * Identifier helpers re-exported from the shared module.
 *
 * The implementation lives in `#lib/shared/ids` so Chats and Images mint ids the
 * same way. This re-export keeps the existing `#lib/chats/ids` import path valid,
 * so no Chats component or test had to change.
 */
export { newId, newRequestId } from '#lib/shared/ids';
