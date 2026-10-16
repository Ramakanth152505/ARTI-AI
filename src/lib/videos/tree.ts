/**
 * Recursive folder-tree logic.
 *
 * All functions are pure, so the rules that matter most — no cycles, stable
 * ordering, correct breadcrumbs, clear deletion impact — are unit-testable without
 * a DOM or a database.
 *
 * The cycle rule is the important one: a folder must never become its own
 * descendant. `canMove` is the single gate for that, and it is used by every move
 * path (drag-and-drop and the accessible menu) and mirrored by a database trigger
 * in the migration, because hiding a menu item is not a security control.
 */

import type { Folder } from './types';

/** Builds a `parentId → children` index, sorted by `order` then name. */
export function childrenIndex(folders: Folder[]): Map<string | null, Folder[]> {
        const index = new Map<string | null, Folder[]>();
        for (const folder of folders) {
                const list = index.get(folder.parentId) ?? [];
                list.push(folder);
                index.set(folder.parentId, list);
        }
        for (const list of index.values()) list.sort(byOrderThenName);
        return index;
}

function byOrderThenName(a: Folder, b: Folder): number {
        if (a.order !== b.order) return a.order - b.order;
        return a.name.localeCompare(b.name);
}

/** Direct children of a folder (null = root), in display order. */
export function childFolders(folders: Folder[], parentId: string | null): Folder[] {
        return folders.filter((f) => f.parentId === parentId).sort(byOrderThenName);
}

/**
 * Every ancestor id of a folder, nearest first. Returns an empty array for a root
 * folder or an unknown id.
 */
export function ancestorsOf(folders: Folder[], id: string): string[] {
        const byId = new Map(folders.map((f) => [f.id, f]));
        const result: string[] = [];
        const seen = new Set<string>([id]);
        let current = byId.get(id)?.parentId ?? null;
        while (current) {
                if (seen.has(current)) break; // corrupt data: stop rather than loop forever
                seen.add(current);
                result.push(current);
                current = byId.get(current)?.parentId ?? null;
        }
        return result;
}

/** Whether `candidate` is a descendant of `id` (or is `id` itself). */
export function isDescendant(folders: Folder[], id: string, candidate: string): boolean {
        if (id === candidate) return true;
        return ancestorsOf(folders, candidate).includes(id);
}

export interface MoveCheck {
        ok: boolean;
        reason?: string;
}

/**
 * Whether a folder may be moved under `newParentId`.
 *
 * Rejects: moving a folder into itself, into its own descendant (the cycle case),
 * into an unknown parent, or into an archived parent.
 */
export function canMove(folders: Folder[], id: string, newParentId: string | null): MoveCheck {
        const folder = folders.find((f) => f.id === id);
        if (!folder) return { ok: false, reason: 'That folder no longer exists.' };
        if (newParentId === id) return { ok: false, reason: 'A folder cannot be moved into itself.' };
        if (newParentId === null) return { ok: true };
        const parent = folders.find((f) => f.id === newParentId);
        if (!parent) return { ok: false, reason: 'The destination folder no longer exists.' };
        if (parent.archived) return { ok: false, reason: 'The destination folder is archived.' };
        if (ancestorsOf(folders, newParentId).includes(id)) {
                return { ok: false, reason: 'That move would put a folder inside its own subfolder.' };
        }
        return { ok: true };
}

/** Whether a project/folder pair can form a parent relationship without a cycle. */
export function canAssignParent(folders: Folder[], id: string, parentId: string | null): MoveCheck {
        return canMove(folders, id, parentId);
}

/** Depth of a folder from the root (a root folder is depth 0). */
export function depthOf(folders: Folder[], id: string): number {
        return ancestorsOf(folders, id).length;
}

/** Maximum depth across the tree, used to guard the UI's indentation. */
export function maxDepth(folders: Folder[]): number {
        return folders.reduce((max, f) => Math.max(max, depthOf(folders, f.id)), 0);
}

export interface Crumb {
        id: string | null;
        name: string;
}

/**
 * Breadcrumb path from the root to a folder. Always starts with the root label
 * supplied by the caller, and includes the folder itself last.
 */
export function breadcrumb(folders: Folder[], id: string | null, rootLabel: string): Crumb[] {
        const crumbs: Crumb[] = [{ id: null, name: rootLabel }];
        if (!id) return crumbs;
        const byId = new Map(folders.map((f) => [f.id, f]));
        const chain = ancestorsOf(folders, id).reverse();
        for (const ancestorId of chain) {
                const folder = byId.get(ancestorId);
                if (folder) crumbs.push({ id: folder.id, name: folder.name });
        }
        const self = byId.get(id);
        if (self) crumbs.push({ id: self.id, name: self.name });
        return crumbs;
}

/**
 * A flattened, render-ready view of the tree from a root down, with depth for
 * indentation. Bounded by `limit` so a huge tree cannot be rendered at once.
 */
export interface FlatFolder {
        folder: Folder;
        depth: number;
        hasChildren: boolean;
}

export function flattenTree(folders: Folder[], rootId: string | null = null, limit = 2000): FlatFolder[] {
        const index = childrenIndex(folders);
        const out: FlatFolder[] = [];
        const seen = new Set<string>();

        function walk(parentId: string | null, depth: number): void {
                if (out.length >= limit) return;
                for (const folder of index.get(parentId) ?? []) {
                        // Defensive: corrupt data with a repeated id cannot loop.
                        if (seen.has(folder.id)) continue;
                        seen.add(folder.id);
                        const children = index.get(folder.id) ?? [];
                        out.push({ folder, depth, hasChildren: children.length > 0 });
                        walk(folder.id, depth + 1);
                }
        }

        walk(rootId, 0);
        return out;
}

/** Whether `name` is already used by a sibling of `parentId`. */
export function isDuplicateName(folders: Folder[], parentId: string | null, name: string, exceptId?: string): boolean {
        const flat = name.replace(/\s+/g, ' ').trim().toLowerCase();
        return folders.some(
                (f) =>
                        f.parentId === parentId &&
                        f.id !== exceptId &&
                        f.name.replace(/\s+/g, ' ').trim().toLowerCase() === flat
        );
}

/** A suggested unique sibling name, appending " (2)", " (3)" … as needed. */
export function uniqueName(folders: Folder[], parentId: string | null, name: string): string {
        const base = name.replace(/\s+/g, ' ').trim() || 'Untitled folder';
        if (!isDuplicateName(folders, parentId, base)) return base;
        let n = 2;
        while (isDuplicateName(folders, parentId, `${base} (${n})`)) n += 1;
        return `${base} (${n})`;
}

export interface DeleteImpact {
        /** Total subfolders that would also be removed. */
        subfolders: number;
        /** Projects filed directly in the folder or its subfolders. */
        projects: number;
        /** Media assets filed in the folder or its subfolders. */
        assets: number;
        /** Whether the operation removes anything besides the folder itself. */
        destructive: boolean;
}

/**
 * Describes exactly what deleting a folder would remove, so the confirmation can
 * state the impact instead of asking a bare "are you sure?".
 */
export function deleteImpact(
        folders: Folder[],
        id: string,
        counts: { projectsByFolder: Map<string | null, number>; assetsByFolder: Map<string | null, number> }
): DeleteImpact {
        const subtree = [id, ...descendantsOf(folders, id)];
        let subfolders = 0;
        let projects = 0;
        let assets = 0;
        subtree.forEach((folderId, index) => {
                if (index > 0) subfolders += 1;
                projects += counts.projectsByFolder.get(folderId) ?? 0;
                assets += counts.assetsByFolder.get(folderId) ?? 0;
        });
        return { subfolders, projects, assets, destructive: subfolders > 0 || projects > 0 || assets > 0 };
}

/** All descendant folder ids of a folder, excluding the folder itself. */
export function descendantsOf(folders: Folder[], id: string): string[] {
        const index = childrenIndex(folders);
        const out: string[] = [];
        const seen = new Set<string>([id]);
        const stack = [...(index.get(id) ?? [])];
        while (stack.length) {
                const folder = stack.pop()!;
                if (seen.has(folder.id)) continue;
                seen.add(folder.id);
                out.push(folder.id);
                stack.push(...(index.get(folder.id) ?? []));
        }
        return out;
}

/** Next sibling order value for a new folder under `parentId`. */
export function nextOrder(folders: Folder[], parentId: string | null): number {
        const siblings = folders.filter((f) => f.parentId === parentId);
        if (siblings.length === 0) return 0;
        return Math.max(...siblings.map((f) => f.order)) + 1;
}

/**
 * Reorders sibling folders by swapping the two given folders' order values.
 * Returns the two patches to persist, or null when they are not siblings.
 */
export function reorderSiblings(
        folders: Folder[],
        id: string,
        direction: 'up' | 'down'
): { id: string; order: number }[] | null {
        const folder = folders.find((f) => f.id === id);
        if (!folder) return null;
        const siblings = childFolders(folders, folder.parentId);
        const index = siblings.findIndex((f) => f.id === id);
        if (index === -1) return null;
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= siblings.length) return null;

        // Normalise all sibling orders first, so duplicate/irregular stored values
        // cannot make a single swap ambiguous.
        const normalised = siblings.map((f, i) => ({ id: f.id, order: i }));
        const a = normalised[index];
        const b = normalised[targetIndex];
        const swap = new Map([
                [a.id, b.order],
                [b.id, a.order]
        ]);
        return normalised.map((entry) => (swap.has(entry.id) ? { id: entry.id, order: swap.get(entry.id)! } : entry));
}

/** Whether a folder is hidden because it or any ancestor is archived. */
export function isHiddenByArchive(folders: Folder[], id: string): boolean {
        const folder = folders.find((f) => f.id === id);
        if (!folder) return true;
        if (folder.archived) return true;
        const byId = new Map(folders.map((f) => [f.id, f]));
        return ancestorsOf(folders, id).some((ancestorId) => byId.get(ancestorId)?.archived === true);
}

/** Filters a folder list to one project, for the tree view. */
export function foldersForProject(folders: Folder[], projectId: string | null): Folder[] {
        return folders.filter((f) => f.projectId === projectId);
}
