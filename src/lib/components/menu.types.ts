/**
 * Shared menu item contract.
 *
 * Kept in its own module because a generic component's `<script module>` cannot
 * export a type parameter, and callers need to describe their items before
 * passing them to the menu.
 */
import type { IconName } from '#lib/data/icons';

export interface MenuItem {
	/** Stable action id, matched by the caller's `onselect` handler. */
	id: string;
	label: string;
	icon?: IconName;
	/** Renders the item in a destructive tone (delete actions). */
	danger?: boolean;
	disabled?: boolean;
	/** Short trailing note, e.g. "Soon". */
	note?: string;
}
