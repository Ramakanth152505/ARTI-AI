/**
 * Browser-side actions for the Videos workspace: clipboard and file download.
 *
 * Kept separate from components so the fallback behaviour is explicit. Both are
 * honest about failure: if the clipboard or a download cannot be performed, the
 * caller is told rather than silently doing nothing.
 */

/** Copies text to the clipboard. Returns whether it actually succeeded. */
export async function copyText(text: string): Promise<boolean> {
        try {
                if (navigator.clipboard?.writeText) {
                        await navigator.clipboard.writeText(text);
                        return true;
                }
        } catch {
                // Fall through to the legacy path.
        }
        try {
                const area = document.createElement('textarea');
                area.value = text;
                area.setAttribute('readonly', '');
                area.style.position = 'fixed';
                area.style.opacity = '0';
                document.body.appendChild(area);
                area.select();
                const ok = document.execCommand('copy');
                document.body.removeChild(area);
                return ok;
        } catch {
                return false;
        }
}

/** Triggers a download of generated text (e.g. exported metadata). */
export function downloadText(text: string, filename: string, mimeType = 'text/plain'): boolean {
        try {
                const blob = new Blob([text], { type: mimeType });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = filename;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                // Revoke on the next tick so the download has started.
                setTimeout(() => URL.revokeObjectURL(url), 1000);
                return true;
        } catch {
                return false;
        }
}

/** Triggers a download of an existing asset URL (a real, service-provided file). */
export function downloadUrl(url: string, filename: string): boolean {
        try {
                const link = document.createElement('a');
                link.href = url;
                link.download = filename;
                link.rel = 'noopener';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                return true;
        } catch {
                return false;
        }
}
