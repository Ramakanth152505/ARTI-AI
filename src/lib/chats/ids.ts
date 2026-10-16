/** Stable identifier generation shared by conversations, messages and folders. */

/** Random UUID when the platform exposes `crypto`, with a safe fallback. */
export function newId(): string {
	if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
		return crypto.randomUUID();
	}

	if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
		const bytes = crypto.getRandomValues(new Uint8Array(16));
		return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
	}

	return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Collision-resistant key for one streamed request, used to ignore stale events. */
export function newRequestId(): string {
	return `req_${newId()}`;
}
