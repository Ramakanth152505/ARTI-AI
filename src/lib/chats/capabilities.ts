/**
 * Capability (tool) registry.
 *
 * The composer's Tools menu renders from this list and nothing else, so the UI
 * can never advertise a tool the application does not actually have. Every entry
 * ships `available: false` because no tool execution service is connected yet;
 * enabling one is a deliberate change here plus a real backing service, not a
 * styling tweak. Selection state is real, execution is honestly reported as
 * unavailable.
 */

import type { IconName } from '#lib/data/icons';

export interface Capability {
	id: string;
	label: string;
	description: string;
	icon: IconName;
	/** True only when a backing service exists and can actually run this tool. */
	available: boolean;
	/** True when the user must confirm before each run. */
	requiresApproval: boolean;
	/** Why it is unavailable, shown verbatim so the state is never a mystery. */
	unavailableReason?: string;
}

const NOT_CONNECTED_REASON = 'No tool execution service is connected yet.';

export const CAPABILITIES: Capability[] = [
	{
		id: 'web-research',
		label: 'Web research',
		description: 'Search the web and cite public sources.',
		icon: 'research',
		available: false,
		requiresApproval: true,
		unavailableReason: NOT_CONNECTED_REASON
	},
	{
		id: 'file-analysis',
		label: 'File analysis',
		description: 'Read attached documents and data files.',
		icon: 'document',
		available: false,
		requiresApproval: false,
		unavailableReason: NOT_CONNECTED_REASON
	},
	{
		id: 'knowledge-retrieval',
		label: 'Knowledge base',
		description: 'Retrieve from ARTI knowledge sources.',
		icon: 'knowledge',
		available: false,
		requiresApproval: false,
		unavailableReason: NOT_CONNECTED_REASON
	},
	{
		id: 'code-execution',
		label: 'Code execution',
		description: 'Run code in a sandbox and return output.',
		icon: 'coding',
		available: false,
		requiresApproval: true,
		unavailableReason: NOT_CONNECTED_REASON
	},
	{
		id: 'data-analysis',
		label: 'Data analysis',
		description: 'Summarise and chart tabular data.',
		icon: 'tools',
		available: false,
		requiresApproval: false,
		unavailableReason: NOT_CONNECTED_REASON
	}
];

/** Ids the registry currently marks runnable. */
export function availableCapabilityIds(): string[] {
	return CAPABILITIES.filter((c) => c.available).map((c) => c.id);
}

export function findCapability(id: string): Capability | undefined {
	return CAPABILITIES.find((c) => c.id === id);
}
