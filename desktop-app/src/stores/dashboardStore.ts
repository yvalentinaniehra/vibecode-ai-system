/**
 * Dashboard Store - Zustand state management
 * Centralizes Dashboard state for cleaner component architecture
 */
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

// Notification type
export interface Notification {
    id: string;
    message: string;
    type: 'success' | 'error' | 'info';
    timestamp: number;
}

// View mode types
export type ViewMode = 'overview' | 'accounts' | 'cache';
export type GaugeStyle = 'semi-arc' | 'classic-donut';
export type GridViewMode = 'grid' | 'list';

// Dashboard state interface
interface DashboardState {
    // View state
    activeView: ViewMode;
    viewMode: GridViewMode;
    gaugeStyle: GaugeStyle;

    // Search & filters
    searchValue: string;
    filter: string;

    // Toggles
    autoAcceptEnabled: boolean;

    // Notifications
    notifications: Notification[];

    // Modal states
    showAddAccountModal: boolean;

    // Stats
    stats: string;

    // Actions
    setActiveView: (view: ViewMode) => void;
    setViewMode: (mode: GridViewMode) => void;
    setGaugeStyle: (style: GaugeStyle) => void;
    toggleGaugeStyle: () => void;

    setSearchValue: (value: string) => void;
    setFilter: (filter: string) => void;

    toggleAutoAccept: () => void;

    // Notifications
    showNotification: (message: string, type: 'success' | 'error' | 'info') => void;
    dismissNotification: (id: string) => void;
    clearNotifications: () => void;

    // Modals
    openAddAccountModal: () => void;
    closeAddAccountModal: () => void;

    // Stats
    setStats: (stats: string) => void;

    // Reset
    reset: () => void;
}

// Initial state
const initialState = {
    activeView: 'overview' as ViewMode,
    viewMode: 'grid' as GridViewMode,
    gaugeStyle: 'semi-arc' as GaugeStyle,
    searchValue: '',
    filter: '15',
    autoAcceptEnabled: false,
    notifications: [] as Notification[],
    showAddAccountModal: false,
    stats: '',
};

// Create store with devtools and persistence
export const useDashboardStore = create<DashboardState>()(
    devtools(
        persist(
            (set, get) => ({
                ...initialState,

                // View actions
                setActiveView: (view) => set({ activeView: view }),
                setViewMode: (mode) => set({ viewMode: mode }),
                setGaugeStyle: (style) => set({ gaugeStyle: style }),
                toggleGaugeStyle: () => set((state) => ({
                    gaugeStyle: state.gaugeStyle === 'semi-arc' ? 'classic-donut' : 'semi-arc'
                })),

                // Search & filter actions
                setSearchValue: (value) => set({ searchValue: value }),
                setFilter: (filter) => set({ filter }),

                // Toggle actions
                toggleAutoAccept: () => set((state) => ({
                    autoAcceptEnabled: !state.autoAcceptEnabled
                })),

                // Notification actions
                showNotification: (message, type) => {
                    const notification: Notification = {
                        id: `notif-${Date.now()}`,
                        message,
                        type,
                        timestamp: Date.now(),
                    };

                    set((state) => ({
                        notifications: [...state.notifications, notification]
                    }));

                    // Auto-dismiss after 3 seconds
                    setTimeout(() => {
                        get().dismissNotification(notification.id);
                    }, 3000);
                },

                dismissNotification: (id) => set((state) => ({
                    notifications: state.notifications.filter(n => n.id !== id)
                })),

                clearNotifications: () => set({ notifications: [] }),

                // Modal actions
                openAddAccountModal: () => set({ showAddAccountModal: true }),
                closeAddAccountModal: () => set({ showAddAccountModal: false }),

                // Stats
                setStats: (stats) => set({ stats }),

                // Reset
                reset: () => set(initialState),
            }),
            {
                name: 'vibecode-dashboard',
                partialize: (state) => ({
                    // Only persist these fields
                    gaugeStyle: state.gaugeStyle,
                    viewMode: state.viewMode,
                    autoAcceptEnabled: state.autoAcceptEnabled,
                    filter: state.filter,
                }),
            }
        ),
        { name: 'DashboardStore' }
    )
);

// Selector hooks for better performance
export const useActiveView = () => useDashboardStore((state) => state.activeView);
export const useNotifications = () => useDashboardStore((state) => state.notifications);
export const useSearchValue = () => useDashboardStore((state) => state.searchValue);
export const useGaugeStyle = () => useDashboardStore((state) => state.gaugeStyle);

// Actions hook (stable reference)
export const useDashboardActions = () => useDashboardStore((state) => ({
    setActiveView: state.setActiveView,
    setViewMode: state.setViewMode,
    toggleGaugeStyle: state.toggleGaugeStyle,
    setSearchValue: state.setSearchValue,
    setFilter: state.setFilter,
    toggleAutoAccept: state.toggleAutoAccept,
    showNotification: state.showNotification,
    openAddAccountModal: state.openAddAccountModal,
    closeAddAccountModal: state.closeAddAccountModal,
    setStats: state.setStats,
}));
