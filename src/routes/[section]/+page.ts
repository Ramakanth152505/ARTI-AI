import { error } from '@sveltejs/kit';
import { PRIMARY_NAV, SETTINGS_NAV } from '#lib/data/navigation';
import type { PageLoad } from './$types';

/**
 * Every non-Home section route resolves its label and icon from the single
 * navigation source of truth, so an unknown path is a real 404 rather than a
 * silently invented page.
 */
export const load: PageLoad = ({ params }) => {
	const all = [...PRIMARY_NAV, SETTINGS_NAV];
	const match = all.find((item) => item.href === `/${params.section}`);

	if (!match) {
		error(404, 'Section not found');
	}

	return { title: match.label, icon: match.icon };
};
