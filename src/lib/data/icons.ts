/**
 * Inline stroke icons used across the ARTI AI interface.
 *
 * These are generic UI glyphs (navigation, controls), deliberately NOT brand
 * emblems: the phoenix and crest are supplied artwork and are never drawn here.
 * Each entry is a list of SVG path `d` strings rendered on a 24x24 grid.
 */

export interface IconDef {
	/** Path data, drawn with a single stroked style. */
	paths: string[];
	/** Set for icons whose parts should be filled rather than stroked. */
	filled?: boolean;
}

export const ICONS: Record<string, IconDef> = {
	home: { paths: ['M3 10.5 12 3l9 7.5', 'M5.5 9.8V19a1 1 0 0 0 1 1h3.2v-5.2h4.6V20h3.2a1 1 0 0 0 1-1V9.8'] },
	chat: { paths: ['M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H9l-5 4V6Z'] },
	image: {
		paths: [
			'M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z',
			'M3.4 16.5 9 11l3.6 3.5L16 11l4.6 5',
			'M8.5 7.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Z'
		]
	},
	video: {
		paths: [
			'M4 6h11a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1Z',
			'M16 10l5-3v10l-5-3'
		]
	},
	project: { paths: ['M3 7.5A2 2 0 0 1 5 5.5h4l2 2h8a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7.5Z'] },
	document: { paths: ['M6 3.5h7.5L18 8v12.5H6V3.5Z', 'M13.2 3.6V8.3h4.7', 'M9 12h6M9 15.5h6M9 8.5h2'] },
	research: { paths: ['M10.5 4a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13Z', 'M15.4 15.4 21 21'] },
	coding: { paths: ['M9 8l-4 4 4 4', 'M15 8l4 4-4 4', 'M13 6l-2 12'] },
	software: { paths: ['M3.5 5.5h17v13h-17z', 'M3.5 9.5h17', 'M7.5 13.5l2 2-2 2', 'M12.5 17.5h4'] },
	apps: { paths: ['M4 4h6v6H4z', 'M14 4h6v6h-6z', 'M4 14h6v6H4z', 'M14 14h6v6h-6z'] },
	games: {
		paths: [
			'M8 8h8a5 5 0 0 1 5 5v1.2a2.8 2.8 0 0 1-5.1 1.5L14.6 14H9.4l-1.3 1.7A2.8 2.8 0 0 1 3 14.2V13a5 5 0 0 1 5-5Z',
			'M7.5 10.5v3M6 12h3',
			'M16.5 11h.01M18 13h.01'
		]
	},
	websites: {
		paths: [
			'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z',
			'M3.2 12h17.6',
			'M12 3c2.4 2.6 3.5 6 3.5 9s-1.1 6.4-3.5 9c-2.4-2.6-3.5-6-3.5-9S9.6 5.6 12 3Z'
		]
	},
	music: {
		paths: [
			'M9 17.5V6.2l10-2v11.3',
			'M9 17.5a2.6 2.6 0 1 1-5.2 0 2.6 2.6 0 0 1 5.2 0Z',
			'M19 15.5a2.6 2.6 0 1 1-5.2 0 2.6 2.6 0 0 1 5.2 0Z'
		]
	},
	learning: { paths: ['M12 4 2.5 9 12 14l9.5-5L12 4Z', 'M6.5 11v4.5c0 1.6 2.9 3 5.5 3s5.5-1.4 5.5-3V11'] },
	agents: {
		paths: [
			'M6 8.5h12a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1Z',
			'M12 4.5v4',
			'M9.2 13h.01M14.8 13h.01',
			'M9.5 19v2M14.5 19v2',
			'M3.5 12.5v3M20.5 12.5v3'
		]
	},
	tools: {
		paths: ['M4 7.5h8M18 7.5h2M4 16.5h4M14 16.5h6', 'M15 7.5a2 2 0 1 0 0-.01', 'M11 16.5a2 2 0 1 0 0-.01']
	},
	knowledge: { paths: ['M12 6.2C10 4.7 7.5 4.2 4 4.2v13.6c3.5 0 6 .5 8 2 2-1.5 4.5-2 8-2V4.2c-3.5 0-6 .5-8 2Z', 'M12 6.2v13.6'] },
	marketplace: { paths: ['M5.5 8h13l1 12.5h-15L5.5 8Z', 'M9 8a3 3 0 1 1 6 0'] },
	settings: {
		paths: [
			'M12 9.2a2.8 2.8 0 1 0 0 5.6 2.8 2.8 0 0 0 0-5.6Z',
			'M12 2.8v2.6M12 18.6v2.6M2.8 12h2.6M18.6 12h2.6M5.5 5.5l1.9 1.9M16.6 16.6l1.9 1.9M18.5 5.5l-1.9 1.9M7.4 16.6l-1.9 1.9'
		]
	},
	bell: { paths: ['M18 9.5a6 6 0 1 0-12 0c0 4.6-1.8 5.8-1.8 5.8h15.6S18 14.1 18 9.5Z', 'M10.4 19.2a1.9 1.9 0 0 0 3.2 0'] },
	bolt: { paths: ['M13.4 2.5 5 13.6h5.4l-1.1 7.9L19 9.9h-5.4l1.1-7.4Z'] },
	send: { paths: ['M7.5 16.5 16.5 7.5', 'M8.5 7.5h8v8'] },
	paperclip: {
		paths: [
			'M8.5 12.5l5.8-5.8a3.2 3.2 0 0 1 4.5 4.5l-7.5 7.5a5 5 0 0 1-7.1-7.1l7.3-7.3'
		]
	},
	mic: { paths: ['M12 4a2.6 2.6 0 0 1 2.6 2.6v5a2.6 2.6 0 0 1-5.2 0v-5A2.6 2.6 0 0 1 12 4Z', 'M6.5 11.5a5.5 5.5 0 0 0 11 0', 'M12 17v3M9 20h6'] },
	more: { paths: ['M6.2 12h.01M12 12h.01M17.8 12h.01'] },
	'chevron-down': { paths: ['M6 9.5l6 5.5 6-5.5'] },
	menu: { paths: ['M4 7h16M4 12h16M4 17h16'] },
	close: { paths: ['M6 6l12 12M18 6 6 18'] },
	lock: { paths: ['M6 11h12v9.2H6z', 'M9 11V8a3 3 0 0 1 6 0v3'] },
	shield: { paths: ['M12 3 5 6v6c0 4 3 7 7 9 4-2 7-5 7-9V6l-7-3Z', 'M9 12.2l2.2 2.2 3.9-4.3'] },
	check: { paths: ['M5 12.8l4.4 4.4L19 6.4'] },
	sparkle: { paths: ['M12 3.2l1.9 5.4 5.4 1.9-5.4 1.9L12 17.8l-1.9-5.4-5.4-1.9 5.4-1.9L12 3.2Z', 'M18.5 16l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8.8-2.2Z'] },
        search: { paths: ['M10.5 4a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13Z', 'M15.4 15.4 21 21'] },
        plus: { paths: ['M12 5v14M5 12h14'] },
        pin: { paths: ['M9 4h6l-1 6 3.5 3H6.5L10 10 9 4Z', 'M12 13v7'] },
        folder: { paths: ['M3 7.5A2 2 0 0 1 5 5.5h4l2 2h8a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7.5Z'] },
        'folder-plus': { paths: ['M3 7.5A2 2 0 0 1 5 5.5h4l2 2h8a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7.5Z', 'M12 11v6M9 14h6'] },
        archive: { paths: ['M3.5 5.5h17v4h-17z', 'M5 9.5v9a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-9', 'M10 13h4'] },
        trash: { paths: ['M4.5 6.5h15', 'M9.5 6.5V4.8h5v1.7', 'M6.5 6.5l1 12.7h9l1-12.7', 'M10.2 10v6M13.8 10v6'] },
        edit: { paths: ['M4 20h4L19 9l-4-4L4 16v4Z', 'M14.5 5.5l4 4'] },
        'panel-right': { paths: ['M4 5h16v14H4z', 'M14.5 5v14'] },
        stop: { paths: ['M7.5 7.5h9v9h-9z'] },
        copy: { paths: ['M9 9h11v11H9z', 'M15 9V4H4v11h5'] },
        refresh: { paths: ['M20 12a8 8 0 1 1-2.4-5.7', 'M20 4v4.5h-4.5'] },
        alert: { paths: ['M12 4 2.6 20h18.8L12 4Z', 'M12 10v4.5M12 17.4h.01'] },
        clock: { paths: ['M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17Z', 'M12 7.5V12l3 2'] },
        'chevron-right': { paths: ['M9.5 6 15 12l-5.5 6'] },
        filter: { paths: ['M4 5.5h16l-6.2 7.4v5.6l-3.6-1.8v-3.8L4 5.5Z'] },
        link: { paths: ['M10 14a3.5 3.5 0 0 0 5 0l3-3a3.5 3.5 0 0 0-5-5l-1 1', 'M14 10a3.5 3.5 0 0 0-5 0l-3 3a3.5 3.5 0 0 0 5 5l1-1'] },
        upload: { paths: ['M12 16V5', 'M7.5 9.5 12 5l4.5 4.5', 'M4.5 18.5h15'] },
        brain: { paths: ['M9.5 4.5a2.8 2.8 0 0 0-2.8 2.8A2.6 2.6 0 0 0 5 13a2.6 2.6 0 0 0 2.4 3.8A2.7 2.7 0 0 0 12 18.4V6.6a2.8 2.8 0 0 0-2.5-2.1Z', 'M14.5 4.5a2.8 2.8 0 0 1 2.8 2.8A2.6 2.6 0 0 1 19 13a2.6 2.6 0 0 1-2.4 3.8A2.7 2.7 0 0 1 12 18.4'] },
        info: { paths: ['M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17Z', 'M12 11v5M12 7.8h.01'] }
};

export type IconName = keyof typeof ICONS;
