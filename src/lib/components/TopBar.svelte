<script lang="ts">
        import Icon from './Icon.svelte';
        import ProfileDropdown from './ProfileDropdown.svelte';
        import { ui } from '#lib/state/uiState.svelte';

        /**
         * Notifications: no notification service is wired up yet, so the bell
         * renders a neutral state and never displays an invented unread count.
         */
        const hasNotifications = false;
</script>

<svelte:window
        onkeydown={(event) => {
                if (event.key === 'Escape' && ui.sidebarOpen) ui.closeSidebar();
        }}
/>

<header class="topbar">
        <button
                class="icon-btn menu-btn"
                aria-label="Toggle sidebar"
                onclick={() =>
                        window.matchMedia('(max-width: 900px)').matches ? ui.toggleSidebar() : ui.toggleCollapsed()}
        >
                <Icon name="menu" size={20} />
        </button>

        <div class="topbar-spacer"></div>

        <!-- Magic Mode: toggles a preference only. No AI behaviour is implemented,
             so the pressed state is a UI preference, not a claim of a working mode. -->
        <button
                type="button"
                class="magic"
                class:on={ui.magicMode}
                aria-pressed={ui.magicMode}
                title="Magic Mode (preference only — AI behaviour not implemented yet)"
                onclick={() => ui.toggleMagicMode()}
        >
                <Icon name="bolt" size={16} />
                <span>Magic Mode</span>
        </button>

        <button
                type="button"
                class="icon-btn bell"
                aria-label={hasNotifications ? 'Notifications' : 'Notifications (none)'}
                title="No notifications yet"
        >
                <Icon name="bell" size={20} />
                {#if hasNotifications}
                        <span class="badge" aria-hidden="true">•</span>
                {/if}
        </button>

        <ProfileDropdown />
</header>

<style>
        .topbar {
                position: relative;
                z-index: var(--z-topbar);
                display: flex;
                align-items: center;
                gap: var(--space-3);
                height: var(--topbar-height);
                padding: 0 var(--space-5);
                border-bottom: 1px solid var(--border-hair);
                background: rgba(8, 8, 7, 0.72);
                backdrop-filter: blur(10px);
        }

        .topbar-spacer {
                flex: 1;
        }

        .icon-btn {
                position: relative;
                display: grid;
                place-items: center;
                width: 38px;
                height: 38px;
                border-radius: var(--radius-pill);
                border: 1px solid var(--border-hair);
                color: var(--text-secondary);
                transition: color 160ms ease, border-color 160ms ease, background 160ms ease;
        }

        .icon-btn:hover {
                color: var(--gold-bright);
                border-color: var(--border-gold);
                background: rgba(201, 154, 54, 0.08);
        }

        .badge {
                position: absolute;
                top: -3px;
                right: -3px;
                display: grid;
                place-items: center;
                width: 17px;
                height: 17px;
                border-radius: var(--radius-pill);
                background: var(--gold-bright);
                color: var(--text-on-gold);
                font-size: 11px;
                font-weight: 700;
        }

        .magic {
                display: flex;
                align-items: center;
                gap: var(--space-2);
                padding: 8px 16px;
                border-radius: var(--radius-pill);
                border: 1px solid var(--border-gold);
                background: linear-gradient(180deg, rgba(201, 154, 54, 0.14), rgba(201, 154, 54, 0.04));
                color: var(--gold-bright);
                font-size: 13px;
                font-weight: 600;
                letter-spacing: 0.02em;
                transition: background 160ms ease, box-shadow 160ms ease;
        }

        .magic:hover {
                background: linear-gradient(180deg, rgba(201, 154, 54, 0.22), rgba(201, 154, 54, 0.08));
        }

        .magic.on {
                background: linear-gradient(180deg, rgba(229, 193, 106, 0.28), rgba(201, 154, 54, 0.12));
                box-shadow: var(--glow-gold);
        }

        @media (max-width: 560px) {
                .magic span {
                        display: none;
                }

                .magic {
                        padding: 8px 12px;
                }
        }
</style>
