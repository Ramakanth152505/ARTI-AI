/**
 * Transient UI state shared between the sidebar and the top bar controls.
 * Svelte 5 runes give module-level reactive state without a store.
 */
class UiState {
        /** Whether the sidebar is shown as an overlay drawer (small screens only). */
        sidebarOpen = $state(false);

        /** Whether the sidebar is collapsed to an icon rail (desktop only). */
        sidebarCollapsed = $state(false);

        /**
         * Magic Mode preference. This is a UI toggle only: no AI behaviour is
         * implemented, so it is never presented as a working model mode.
         */
        magicMode = $state(false);

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

        toggleMagicMode(): void {
                this.magicMode = !this.magicMode;
        }
}

export const ui = new UiState();
