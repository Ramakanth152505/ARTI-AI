/**
 * The two people the Home UI exposes in the profile switcher.
 *
 * This is presentation-level selection state only. It is NOT an authentication
 * mechanism and does not isolate data between accounts — those require real
 * auth and server-side boundaries that are out of scope for the Home UI.
 */
export interface Profile {
	id: string;
	name: string;
	/** Short, text-only descriptor shown under the name. */
	role: string;
}

export const PROFILES: Profile[] = [
	{ id: 'ramakanth', name: 'Ramakanth', role: 'Owner' },
	{ id: 'tejasree', name: 'Tejasree', role: 'Member' }
];
