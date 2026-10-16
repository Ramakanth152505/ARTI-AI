/**
 * Single source of truth for the Home navigation.
 *
 * Order and labels are fixed by the approved reference. Each item links to
 * `/` for Home and to a not-yet-built section route otherwise; those pages
 * render an honest "coming soon" state rather than pretending to be complete.
 */

export interface NavItem {
	/** Sidebar label, exactly as specified by the reference. */
	label: string;
	/** Route the item navigates to. */
	href: string;
	/** Identifier used to select the inline SVG icon. */
	icon: NavIconName;
}

export type NavIconName =
	| 'home'
	| 'chat'
	| 'image'
	| 'video'
	| 'project'
	| 'document'
	| 'research'
	| 'coding'
	| 'software'
	| 'apps'
	| 'games'
	| 'websites'
	| 'music'
	| 'learning'
	| 'agents'
	| 'tools'
	| 'knowledge'
	| 'marketplace'
	| 'settings';

/** The primary navigation group, in the exact reference order. */
export const PRIMARY_NAV: NavItem[] = [
	{ label: 'Home', href: '/', icon: 'home' },
	{ label: 'Chats', href: '/chats', icon: 'chat' },
	{ label: 'Images', href: '/images', icon: 'image' },
	{ label: 'Videos', href: '/videos', icon: 'video' },
	{ label: 'Projects', href: '/projects', icon: 'project' },
	{ label: 'Documents', href: '/documents', icon: 'document' },
	{ label: 'Research', href: '/research', icon: 'research' },
	{ label: 'Coding', href: '/coding', icon: 'coding' },
	{ label: 'Software', href: '/software', icon: 'software' },
	{ label: 'Apps', href: '/apps', icon: 'apps' },
	{ label: 'Games', href: '/games', icon: 'games' },
	{ label: 'Websites', href: '/websites', icon: 'websites' },
	{ label: 'Music', href: '/music', icon: 'music' },
	{ label: 'Learning', href: '/learning', icon: 'learning' },
	{ label: 'Agents', href: '/agents', icon: 'agents' },
	{ label: 'Tools', href: '/tools', icon: 'tools' },
	{ label: 'Knowledge Base', href: '/knowledge-base', icon: 'knowledge' },
	{ label: 'Marketplace', href: '/marketplace', icon: 'marketplace' }
];

/** Settings sits in its own group at the bottom of the sidebar. */
export const SETTINGS_NAV: NavItem = {
	label: 'Settings',
	href: '/settings',
	icon: 'settings'
};
