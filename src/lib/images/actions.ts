/**
 * Browser-side asset actions: copying text and downloading a generated image.
 *
 * Both report honest outcomes. A download that cannot be completed (expired URL,
 * missing asset, cross-origin read failure, permission denial) returns a reason
 * instead of appearing to succeed, and a copy that the clipboard refuses returns
 * false so the caller can say so.
 */

/** Copies text to the clipboard. Returns false when the browser refuses. */
export async function copyText(text: string): Promise<boolean> {
        if (!text) return false;
        try {
                if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
                        await navigator.clipboard.writeText(text);
                        return true;
                }
        } catch {
                // Fall through to the legacy path below.
        }
        return legacyCopy(text);
}

/** Legacy `execCommand` copy for browsers without the async clipboard API. */
function legacyCopy(text: string): boolean {
        if (typeof document === 'undefined') return false;
        try {
                const area = document.createElement('textarea');
                area.value = text;
                area.setAttribute('readonly', '');
                area.style.position = 'fixed';
                area.style.top = '-1000px';
                document.body.appendChild(area);
                area.select();
                const ok = document.execCommand('copy');
                document.body.removeChild(area);
                return ok;
        } catch {
                return false;
        }
}

export interface DownloadResult {
        ok: boolean;
        /** User-facing reason when `ok` is false. */
        reason?: string;
}

/** Derives a safe file name for a downloaded asset from its URL and mime type. */
export function filenameFor(url: string, mimeType?: string, fallback = 'arti-image'): string {
        let ext = 'png';
        if (mimeType === 'image/jpeg') ext = 'jpg';
        else if (mimeType === 'image/webp') ext = 'webp';
        else if (mimeType === 'image/png') ext = 'png';
        else {
                const match = /\.(png|jpe?g|webp|gif)(?:\?|#|$)/i.exec(url);
                if (match) ext = match[1].toLowerCase().replace('jpeg', 'jpg');
        }
        return `${fallback}.${ext}`;
}

/**
 * Downloads a generated image.
 *
 * Fetches the asset as a blob so the browser downloads the real bytes rather than
 * navigating away, then hands it to an object URL. Any failure (network, CORS,
 * expired link, revoked permission) is reported rather than silently ignored.
 */
export async function downloadAsset(url: string, filename: string): Promise<DownloadResult> {
        if (!url) return { ok: false, reason: 'This image has no downloadable file.' };
        if (typeof document === 'undefined') return { ok: false, reason: 'Downloads are unavailable here.' };

        try {
                const response = await fetch(url, { credentials: 'omit' });
                if (!response.ok) {
                        return {
                                ok: false,
                                reason:
                                        response.status === 403 || response.status === 401
                                                ? 'You do not have permission to download this image.'
                                                : 'The image could not be downloaded. The link may have expired.'
                        };
                }
                const blob = await response.blob();
                const objectUrl = URL.createObjectURL(blob);
                const anchor = document.createElement('a');
                anchor.href = objectUrl;
                anchor.download = filename;
                anchor.rel = 'noopener';
                document.body.appendChild(anchor);
                anchor.click();
                document.body.removeChild(anchor);
                // Revoke on the next tick so the click has started the download.
                setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
                return { ok: true };
        } catch {
                return { ok: false, reason: 'The image could not be downloaded. The link may have expired.' };
        }
}
