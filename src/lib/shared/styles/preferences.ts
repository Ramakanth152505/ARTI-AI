/**
 * Style-library preferences shared by Images and Videos.
 *
 * Favourites, recently used styles and user-created custom styles are per-browser
 * preferences, not shared project data. They are stored browser-locally and the UI
 * never implies otherwise. The same store serves both workspaces, so favouriting a
 * style in Images shows it favourited in Videos.
 *
 * Custom styles are validated on read: a hand-edited localStorage payload cannot
 * inject an object with a missing id, name or template into the catalogue view.
 */

import { ALL_STYLES, STYLE_CATEGORIES } from './catalog';
import { newId } from '#lib/shared/ids';
import type { MediaType, Style } from './types';

const PREF_KEY = 'arti.styles.prefs.v1';
const CUSTOM_KEY = 'arti.styles.custom.v1';
const RECENT_LIMIT = 12;

interface Prefs {
        favorites: string[];
        recent: string[];
}

function available(): boolean {
        try {
                const probe = '__arti_styles_probe__';
                window.localStorage.setItem(probe, '1');
                window.localStorage.removeItem(probe);
                return true;
        } catch {
                return false;
        }
}

function readJson<T>(key: string, fallback: T): T {
        if (typeof window === 'undefined' || !available()) return fallback;
        try {
                const raw = window.localStorage.getItem(key);
                if (!raw) return fallback;
                return JSON.parse(raw) as T;
        } catch {
                return fallback;
        }
}

function writeJson(key: string, value: unknown): void {
        if (typeof window === 'undefined' || !available()) return;
        try {
                window.localStorage.setItem(key, JSON.stringify(value));
        } catch {
                // Quota or revocation: preferences simply do not persist this session.
        }
}

function asStringArray(value: unknown): string[] {
        return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : [];
}

/** Reads the current favourites and recent list. */
export function readPrefs(): Prefs {
        const raw = readJson<Partial<Prefs>>(PREF_KEY, {});
        return { favorites: asStringArray(raw.favorites), recent: asStringArray(raw.recent) };
}

export function isFavorite(id: string): boolean {
        return readPrefs().favorites.includes(id);
}

/** Toggles a style's favourite state and returns the new value. */
export function toggleFavorite(id: string): boolean {
        const prefs = readPrefs();
        const next = prefs.favorites.includes(id)
                ? prefs.favorites.filter((f) => f !== id)
                : [id, ...prefs.favorites];
        writeJson(PREF_KEY, { ...prefs, favorites: next });
        return next.includes(id);
}

/** Records a style as recently used, most-recent first, bounded in length. */
export function markRecent(id: string): void {
        const prefs = readPrefs();
        const next = [id, ...prefs.recent.filter((r) => r !== id)].slice(0, RECENT_LIMIT);
        writeJson(PREF_KEY, { ...prefs, recent: next });
}

/** Resolves the recent ids onto catalogue records, dropping ids that no longer exist. */
export function recentStyles(): Style[] {
        return readPrefs()
                .recent.map((id) => ALL_STYLES.find((s) => s.id === id))
                .filter((s): s is Style => s !== undefined);
}

/** Resolves favourite ids onto catalogue records. */
export function favoriteStyles(): Style[] {
        const favorites = new Set(readPrefs().favorites);
        return ALL_STYLES.filter((s) => favorites.has(s.id));
}

function normaliseCustom(raw: unknown): Style | null {
        if (typeof raw !== 'object' || raw === null) return null;
        const record = raw as Record<string, unknown>;
        const id = typeof record.id === 'string' ? record.id : '';
        const name = typeof record.name === 'string' ? record.name : '';
        const promptTemplate = typeof record.promptTemplate === 'string' ? record.promptTemplate : '';
        if (!id || !name || !promptTemplate) return null;
        const categoryId =
                typeof record.categoryId === 'string' && STYLE_CATEGORIES.some((c) => c.id === record.categoryId)
                        ? record.categoryId
                        : 'design-graphics';
        const mediaTypes = Array.isArray(record.mediaTypes)
                ? (record.mediaTypes.filter((m): m is MediaType => m === 'image' || m === 'video') as MediaType[])
                : (['image', 'video'] as MediaType[]);
        return {
                id,
                name,
                categoryId,
                summary: typeof record.summary === 'string' ? record.summary : '',
                promptTemplate,
                videoTemplate: typeof record.videoTemplate === 'string' ? record.videoTemplate : undefined,
                negativeTemplate: typeof record.negativeTemplate === 'string' ? record.negativeTemplate : undefined,
                mediaTypes: mediaTypes.length ? mediaTypes : (['image', 'video'] as MediaType[]),
                // A user style is prompt guidance until a model is verified against it.
                execution: 'prompt-only',
                keywords: asStringArray(record.keywords),
                tags: asStringArray(record.tags),
                custom: true
        };
}

/** Every user-created style, newest first, with invalid records dropped. */
export function customStyles(): Style[] {
        const raw = readJson<unknown[]>(CUSTOM_KEY, []);
        if (!Array.isArray(raw)) return [];
        return raw.map(normaliseCustom).filter((s): s is Style => s !== null);
}

export interface CustomStyleInput {
        name: string;
        summary: string;
        categoryId: string;
        promptTemplate: string;
        mediaTypes: MediaType[];
}

/** Creates a custom style from user input. Returns null when the input is unusable. */
export function createCustomStyle(input: CustomStyleInput): Style | null {
        const name = input.name.trim();
        const promptTemplate = input.promptTemplate.trim();
        if (!name || !promptTemplate) return null;
        const style: Style = {
                id: `custom-${newId()}`,
                name,
                categoryId: input.categoryId,
                summary: input.summary.trim() || 'User-created style.',
                promptTemplate,
                mediaTypes: input.mediaTypes.length ? input.mediaTypes : ['image', 'video'],
                execution: 'prompt-only',
                custom: true
        };
        const existing = customStyles();
        writeJson(CUSTOM_KEY, [style, ...existing]);
        return style;
}

/** Removes a custom style. Catalogue styles cannot be removed. */
export function removeCustomStyle(id: string): void {
        writeJson(
                CUSTOM_KEY,
                customStyles().filter((s) => s.id !== id)
        );
}
