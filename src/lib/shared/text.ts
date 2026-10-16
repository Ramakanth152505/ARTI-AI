/**
 * Pure text and formatting helpers shared by the Chats and Images modules.
 * Free of DOM and storage so they are directly unit-testable.
 */

/** Relative time such as "just now", "5m", "3h", "2d", else a short date. */
export function relativeTime(iso: string, now: number = Date.now()): string {
        const then = new Date(iso).getTime();
        if (Number.isNaN(then)) return '';
        const diff = Math.max(0, now - then);
        const minute = 60_000;
        const hour = 60 * minute;
        const day = 24 * hour;

        if (diff < minute) return 'just now';
        if (diff < hour) return `${Math.floor(diff / minute)}m ago`;
        if (diff < day) return `${Math.floor(diff / hour)}h ago`;
        if (diff < 7 * day) return `${Math.floor(diff / day)}d ago`;
        return new Date(then).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/** Formats a byte count for attachment metadata. */
export function formatBytes(bytes: number): string {
        if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
        const units = ['B', 'KB', 'MB', 'GB'];
        const index = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
        const value = bytes / Math.pow(1024, index);
        // One decimal is useful below 10 (e.g. 1.5 MB) but noise for whole values.
        const rounded = value >= 10 || index === 0 ? String(Math.round(value)) : value.toFixed(1).replace(/\.0$/, '');
        return `${rounded} ${units[index]}`;
}

/** Formats a count with a singular/plural noun, e.g. "1 image" / "4 images". */
export function formatCount(count: number, singular: string, plural = `${singular}s`): string {
        return `${count} ${count === 1 ? singular : plural}`;
}

/** Collapses whitespace and truncates on a word-ish boundary with an ellipsis. */
export function truncate(input: string, max = 80): string {
        const flat = (input ?? '').replace(/\s+/g, ' ').trim();
        if (flat.length <= max) return flat;
        return `${flat.slice(0, max - 1).trimEnd()}…`;
}
