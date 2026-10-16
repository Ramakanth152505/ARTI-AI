/**
 * Video output formats: aspect ratios, resolutions, frame rates, duration
 * planning, export containers and languages.
 *
 * These are pure data and pure helpers, so they are directly unit-testable and
 * the UI never hard-codes a dimension. Two honesty rules are built in:
 *
 *  1. A resolution target is a pair of real pixel dimensions, not a marketing
 *     label. `resolutionDimensions()` returns the actual width/height for a named
 *     target, and `nearestSupportedResolution()` reports which target is actually
 *     generatable rather than silently mislabelling a lower-resolution file.
 *  2. A duration is a PLAN. `planDuration()` splits any requested length into
 *     generatable clip-sized segments; it never claims one request produces a
 *     multi-hour video.
 */

// --- Aspect ratios ---------------------------------------------------------

export type Orientation = 'landscape' | 'portrait' | 'square';

export interface AspectRatioOption {
        /** Literal "w:h" id stored on a project/shot/job. */
        value: string;
        label: string;
        /** Numeric width/height, used for layout and validation. */
        ratio: number;
        orientation: Orientation;
        /** Intended use, shown in the selector. */
        usage: string;
}

/**
 * The aspect ratios the product offers. `custom` is not listed here: a custom
 * width/height is accepted through `customAspectRatio()` and validated.
 */
export const ASPECT_RATIOS: AspectRatioOption[] = [
        { value: '9:16', label: 'Vertical', ratio: 9 / 16, orientation: 'portrait', usage: 'Short-form, stories, reels' },
        { value: '16:9', label: 'Widescreen', ratio: 16 / 9, orientation: 'landscape', usage: 'Standard video, YouTube' },
        { value: '1:1', label: 'Square', ratio: 1, orientation: 'square', usage: 'Social feed, product' },
        { value: '4:5', label: 'Portrait Social', ratio: 4 / 5, orientation: 'portrait', usage: 'Instagram, editorial' },
        { value: '5:4', label: 'Landscape Print', ratio: 5 / 4, orientation: 'landscape', usage: 'Large-format, print' },
        { value: '4:3', label: 'Classic Video', ratio: 4 / 3, orientation: 'landscape', usage: 'Archive, broadcast' },
        { value: '3:2', label: 'Photographic', ratio: 3 / 2, orientation: 'landscape', usage: 'Photography, DSLR' },
        { value: '2:3', label: 'Portrait Photo', ratio: 2 / 3, orientation: 'portrait', usage: 'Poster, book' },
        { value: '3:4', label: 'Portrait Classic', ratio: 3 / 4, orientation: 'portrait', usage: 'Portrait video, print' },
        { value: '21:9', label: 'Ultrawide', ratio: 21 / 9, orientation: 'landscape', usage: 'Ultrawide cinematic' },
        { value: '2.39:1', label: 'Anamorphic Scope', ratio: 2.39, orientation: 'landscape', usage: 'Feature-film scope' },
        { value: '2.35:1', label: 'CinemaScope', ratio: 2.35, orientation: 'landscape', usage: 'Classic widescreen film' },
        { value: '17:9', label: 'DCI 4K', ratio: 17 / 9, orientation: 'landscape', usage: 'Digital cinema' },
        { value: '9:3', label: 'Panoramic', ratio: 3, orientation: 'landscape', usage: 'Panoramic banner' }
];

export const DEFAULT_ASPECT_RATIO = '16:9';

export function findAspectRatio(value: string | null | undefined): AspectRatioOption {
        return ASPECT_RATIOS.find((a) => a.value === value) ?? ASPECT_RATIOS[1];
}

function orientationFor(w: number, h: number): Orientation {
        if (w === h) return 'square';
        return w > h ? 'landscape' : 'portrait';
}

export interface AspectRatioValidation {
        ok: boolean;
        reason?: string;
        value?: AspectRatioOption;
}

/**
 * Validates a custom width/height and returns it as an aspect-ratio option.
 *
 * Bounds are generous but finite, because a nonsensical ratio cannot be rendered:
 * each edge must be a whole number of pixels within 1–32768, and the ratio must
 * be between 1:10 and 10:1.
 */
export function customAspectRatio(width: number, height: number): AspectRatioValidation {
        if (!Number.isFinite(width) || !Number.isFinite(height)) {
                return { ok: false, reason: 'Enter whole numbers for width and height.' };
        }
        const w = Math.round(width);
        const h = Math.round(height);
        if (w < 1 || h < 1) return { ok: false, reason: 'Width and height must be at least 1 pixel.' };
        if (w > 32768 || h > 32768) return { ok: false, reason: 'Width and height cannot exceed 32768 pixels.' };
        const ratio = w / h;
        if (ratio > 10 || ratio < 0.1) {
                return { ok: false, reason: 'The ratio is too extreme; keep it between 1:10 and 10:1.' };
        }
        const gcd = greatestCommonDivisor(w, h);
        const label = `${w / gcd}:${h / gcd}`;
        return {
                ok: true,
                value: {
                        value: `${w}:${h}`,
                        label: `Custom ${label}`,
                        ratio,
                        orientation: orientationFor(w, h),
                        usage: `Custom ${w} × ${h} aspect`
                }
        };
}

/** Greatest common divisor, used to present a custom ratio in lowest terms. */
export function greatestCommonDivisor(a: number, b: number): number {
        let x = Math.abs(Math.round(a));
        let y = Math.abs(Math.round(b));
        while (y) {
                [x, y] = [y, x % y];
        }
        return x || 1;
}

/** Whether a ratio string is one of the named catalogue ratios. */
export function isKnownAspectRatio(value: string): boolean {
        return ASPECT_RATIOS.some((a) => a.value === value);
}

/** Reads a ratio string ("16:9" or "16:9 custom px") back into numbers. */
export function aspectRatioNumbers(value: string): { width: number; height: number } {
        const [w, h] = value.split(':').map((part) => Number.parseFloat(part));
        if (Number.isFinite(w) && Number.isFinite(h) && w > 0 && h > 0) return { width: w, height: h };
        const fallback = findAspectRatio(value);
        return { width: fallback.ratio > 1 ? fallback.ratio : 1, height: fallback.ratio > 1 ? 1 : 1 / fallback.ratio };
}

// --- Resolutions -----------------------------------------------------------

export interface ResolutionOption {
        /** Id stored on a project/shot/job. */
        value: string;
        label: string;
        /** Long edge in pixels for a 16:9 frame; the reference dimension. */
        longEdge: number;
        /** Actual dimensions for the 16:9 reference frame. */
        width: number;
        height: number;
}

/**
 * Resolution targets.
 *
 * The 16K target is an explicit definition — 15360 × 8640 for 16:9 — recorded
 * here once and used everywhere, rather than being a vague marketing word. The
 * definition is documented in `docs` and surfaced in Settings.
 */
export const RESOLUTIONS: ResolutionOption[] = [
        { value: '480p', label: '480p SD', longEdge: 854, width: 854, height: 480 },
        { value: '720p', label: '720p HD', longEdge: 1280, width: 1280, height: 720 },
        { value: '1080p', label: '1080p Full HD', longEdge: 1920, width: 1920, height: 1080 },
        { value: '1440p', label: '1440p / 2K', longEdge: 2560, width: 2560, height: 1440 },
        { value: '2160p', label: '2160p / 4K UHD', longEdge: 3840, width: 3840, height: 2160 },
        { value: '4320p', label: '4320p / 8K UHD', longEdge: 7680, width: 7680, height: 4320 },
        { value: '16k', label: '16K (15360 × 8640)', longEdge: 15360, width: 15360, height: 8640 }
];

export const DEFAULT_RESOLUTION = '1080p';

export function findResolution(value: string | null | undefined): ResolutionOption {
        return RESOLUTIONS.find((r) => r.value === value) ?? RESOLUTIONS[2];
}

/**
 * The actual pixel dimensions for a resolution target at a given aspect ratio.
 *
 * Dimensions are rounded to even numbers, because most encoders reject odd
 * dimensions. A custom ratio is respected exactly rather than being snapped to a
 * named one.
 */
export function resolutionDimensions(resolution: string, aspectRatio: string): { width: number; height: number } {
        const target = findResolution(resolution);
        const ratio = aspectRatioNumbers(aspectRatio);
        const even = (n: number) => Math.max(2, Math.round(n / 2) * 2);
        return ratio.width >= ratio.height
                ? { width: even(target.longEdge), height: even((target.longEdge * ratio.height) / ratio.width) }
                : { width: even((target.longEdge * ratio.width) / ratio.height), height: even(target.longEdge) };
}

/** Human-readable "1920 × 1080" for a resolution + ratio pair. */
export function describeDimensions(resolution: string, aspectRatio: string): string {
        const { width, height } = resolutionDimensions(resolution, aspectRatio);
        return `${width} × ${height}`;
}

/**
 * The largest resolution target that is actually generatable by the configured
 * pipeline, given the highest long edge the model supports natively.
 *
 * This is the honesty guard for 16K: if the model tops out at 1080p, the caller
 * is told 1080p is the native target and an upscale is a separate, explicitly
 * labelled stage — never a file relabelled as native 16K.
 */
export function nearestSupportedResolution(nativeLongEdge: number): ResolutionOption {
        const supported = RESOLUTIONS.filter((r) => r.longEdge <= nativeLongEdge);
        if (supported.length === 0) return RESOLUTIONS[0];
        return supported[supported.length - 1];
}

/** Whether a resolution target needs an upscale beyond the native long edge. */
export function requiresUpscale(resolution: string, nativeLongEdge: number): boolean {
        return findResolution(resolution).longEdge > nativeLongEdge;
}

// --- Frame rates -----------------------------------------------------------

export interface FrameRateOption {
        value: number;
        label: string;
        usage: string;
}

export const FRAME_RATES: FrameRateOption[] = [
        { value: 24, label: '24 fps', usage: 'Cinematic film' },
        { value: 25, label: '25 fps', usage: 'PAL broadcast' },
        { value: 30, label: '30 fps', usage: 'Web, streaming' },
        { value: 48, label: '48 fps', usage: 'High frame rate cinema' },
        { value: 50, label: '50 fps', usage: 'PAL high frame rate' },
        { value: 60, label: '60 fps', usage: 'Smooth motion, sport' },
        { value: 120, label: '120 fps', usage: 'Slow-motion source' }
];

export const DEFAULT_FRAME_RATE = 24;

export function findFrameRate(value: number | null | undefined): FrameRateOption {
        return FRAME_RATES.find((f) => f.value === value) ?? FRAME_RATES[0];
}

/** Whether a frame rate is one of the offered options. */
export function isKnownFrameRate(value: number): boolean {
        return FRAME_RATES.some((f) => f.value === value);
}

// --- Durations -------------------------------------------------------------

/**
 * Duration presets spanning the product's range from one second to multi-hour
 * projects. A preset is a PLANNING shortcut: the production pipeline still splits
 * anything beyond a single clip into multiple jobs.
 */
export interface DurationPreset {
        id: string;
        label: string;
        seconds: number;
        note: string;
}

export const DURATION_PRESETS: DurationPreset[] = [
        { id: '1s', label: '1 second', seconds: 1, note: 'Single-shot micro clip' },
        { id: '5s', label: '5 seconds', seconds: 5, note: 'Social hook' },
        { id: '10s', label: '10 seconds', seconds: 10, note: 'Short clip' },
        { id: '30s', label: '30 seconds', seconds: 30, note: 'Advert, reel' },
        { id: '1m', label: '1 minute', seconds: 60, note: 'Short-form video' },
        { id: '10m', label: '10 minutes', seconds: 600, note: 'Explainer, short film' },
        { id: '1h', label: '1 hour', seconds: 3600, note: 'Feature-length' },
        { id: '3h', label: '3 hours', seconds: 10_800, note: 'Extended production' },
        { id: '10h', label: '10 hours', seconds: 36_000, note: 'Course, series block' },
        { id: '100h', label: '100 hours', seconds: 360_000, note: 'Long-form series' },
        { id: '1000h', label: '1000+ hours', seconds: 3_600_000, note: 'Project collection' }
];

/** One segment of a duration plan. */
export interface DurationSegment {
        index: number;
        /** Duration of this segment in seconds. */
        seconds: number;
        /** Start offset within the whole production, in seconds. */
        startSeconds: number;
}

export interface DurationPlan {
        /** Total requested duration in seconds. */
        totalSeconds: number;
        /** Clip length each generation job targets, in seconds. */
        clipSeconds: number;
        /** Number of segments/jobs the production needs. */
        segments: DurationSegment[];
        /** Whether the total exceeds a single clip and therefore needs assembly. */
        needsAssembly: boolean;
}

export const DEFAULT_CLIP_SECONDS = 5;
/** A single generation job is never longer than this; longer work is segmented. */
export const MAX_SINGLE_CLIP_SECONDS = 60;

/**
 * Plans a requested duration as clip-sized segments.
 *
 * This is the function that keeps a "1000-hour project" honest: it reports how
 * many clips must actually be generated and assembled rather than implying one
 * request renders the whole thing. `clipSeconds` is clamped to the realistic range
 * so a caller cannot request a one-hour single clip.
 */
export function planDuration(totalSeconds: number, clipSeconds = DEFAULT_CLIP_SECONDS): DurationPlan {
        const total = Math.max(0, Number.isFinite(totalSeconds) ? totalSeconds : 0);
        const clip = Math.min(MAX_SINGLE_CLIP_SECONDS, Math.max(1, Number.isFinite(clipSeconds) ? clipSeconds : DEFAULT_CLIP_SECONDS));
        const count = total > 0 ? Math.ceil(total / clip) : 0;
        const segments: DurationSegment[] = [];
        for (let i = 0; i < count; i += 1) {
                const startSeconds = i * clip;
                const seconds = Math.min(clip, total - startSeconds);
                segments.push({ index: i, seconds, startSeconds });
        }
        return { totalSeconds: total, clipSeconds: clip, segments, needsAssembly: total > clip };
}

/** Total seconds across a set of media assets, using MEASURED durations only. */
export function sumMeasuredSeconds(assets: { producedDurationSeconds?: number }[]): number {
        return assets.reduce((total, a) => total + (a.producedDurationSeconds ?? 0), 0);
}

/** Sum of planned (requested) seconds across a set of jobs. */
export function sumPlannedSeconds(jobs: { requestedDurationSeconds: number }[]): number {
        return jobs.reduce((total, j) => total + j.requestedDurationSeconds, 0);
}

/** Clamps a clip duration to the configured ceiling, never below one second. */
export function clampToMaxClip(seconds: number, maxSeconds: number): number {
        if (!Number.isFinite(seconds)) return 1;
        return Math.max(1, Math.min(maxSeconds, Math.round(seconds)));
}

/** Formats seconds as a compact human duration ("1h 12m", "48s", "0s"). */
export function formatDuration(seconds: number): string {
        if (!Number.isFinite(seconds) || seconds <= 0) return '0s';
        const whole = Math.round(seconds);
        const hours = Math.floor(whole / 3600);
        const minutes = Math.floor((whole % 3600) / 60);
        const secs = whole % 60;
        const parts: string[] = [];
        if (hours) parts.push(`${hours}h`);
        if (minutes) parts.push(`${minutes}m`);
        if (secs || parts.length === 0) parts.push(`${secs}s`);
        return parts.join(' ');
}

/** Formats seconds as a timecode "HH:MM:SS" for a player. */
export function formatTimecode(seconds: number): string {
        const whole = Math.max(0, Math.floor(Number.isFinite(seconds) ? seconds : 0));
        const h = Math.floor(whole / 3600);
        const m = Math.floor((whole % 3600) / 60);
        const s = whole % 60;
        const pad = (n: number) => String(n).padStart(2, '0');
        return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

/**
 * Frames implied by a duration and frame rate. Used to report a planned frame
 * count; a realised frame count comes from the file's measured metadata.
 */
export function frameCount(seconds: number, frameRate: number): number {
        if (!Number.isFinite(seconds) || !Number.isFinite(frameRate)) return 0;
        return Math.round(Math.max(0, seconds) * Math.max(1, frameRate));
}

// --- Export formats --------------------------------------------------------

export interface ExportFormat {
        id: string;
        label: string;
        extension: string;
        mimeType: string;
        /**
         * Whether the encoding pipeline is implemented. Until an encoder exists and
         * has been tested, this stays false and the UI does not advertise the format
         * as available.
         */
        implemented: boolean;
        note: string;
}

export const EXPORT_FORMATS: ExportFormat[] = [
        {
                id: 'mp4-h264',
                label: 'MP4 (H.264)',
                extension: 'mp4',
                mimeType: 'video/mp4',
                implemented: false,
                note: 'Requires the encoding worker; not implemented yet.'
        },
        {
                id: 'webm-vp9',
                label: 'WebM (VP9)',
                extension: 'webm',
                mimeType: 'video/webm',
                implemented: false,
                note: 'Requires the WebM encoder; not implemented yet.'
        },
        {
                id: 'mov-prores',
                label: 'MOV (ProRes)',
                extension: 'mov',
                mimeType: 'video/quicktime',
                implemented: false,
                note: 'Requires the ProRes encoder; not implemented yet.'
        },
        {
                id: 'source',
                label: 'Original generated source',
                extension: '',
                mimeType: '',
                implemented: false,
                note: 'Passes through whatever the generation service produced.'
        },
        {
                id: 'subtitles-srt',
                label: 'Subtitles (SRT)',
                extension: 'srt',
                mimeType: 'text/plain',
                implemented: false,
                note: 'Requires transcription/generation output; not implemented yet.'
        },
        {
                id: 'metadata-json',
                label: 'Project metadata (JSON)',
                extension: 'json',
                mimeType: 'application/json',
                implemented: true,
                note: 'Exports the production metadata held in this workspace.'
        }
];

export function findExportFormat(id: string): ExportFormat | undefined {
        return EXPORT_FORMATS.find((f) => f.id === id);
}

// --- Languages -------------------------------------------------------------

export const LANGUAGES: { id: string; label: string }[] = [
        { id: 'en', label: 'English' },
        { id: 'es', label: 'Spanish' },
        { id: 'fr', label: 'French' },
        { id: 'de', label: 'German' },
        { id: 'it', label: 'Italian' },
        { id: 'pt', label: 'Portuguese' },
        { id: 'hi', label: 'Hindi' },
        { id: 'ar', label: 'Arabic' },
        { id: 'ja', label: 'Japanese' },
        { id: 'ko', label: 'Korean' },
        { id: 'zh', label: 'Chinese' }
];

export function languageLabel(id: string): string {
        return LANGUAGES.find((l) => l.id === id)?.label ?? id;
}
