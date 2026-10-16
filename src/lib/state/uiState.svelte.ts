/**
 * Transient UI state shared between the sidebar and the top bar's menu button.
 * Svelte 5 runes give module-level reactive state without a store.
 */
class UiState {
	/** Whether the sidebar is shown as an overlay drawer (small screens only). */
	sidebarOpen = $state(false);

	/** Whether the sidebar is collapsed to its icon rail (desktop only). */
	sidebarCollapsed = $state(false);

	openSidebar(): void {
		this.sidebarOpen = true;
	}

	closeSidebar(): void {
		this.sidebarOpen = false;
	}

	toggleSidebar(): void {
		this.sidebarOpen = !this.sidebarOpen;
	}

	toggleCollapsed(): void {
		this.sidebarCollapsed = !this.sidebarCollapsed;
	}
}

export const ui = new UiState();
