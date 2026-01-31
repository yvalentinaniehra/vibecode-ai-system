/**
 * NotificationToast - Extracted notification component
 * Displays toast notifications from Zustand store
 */
import React from 'react';
import { useNotifications, useDashboardStore } from '../../../stores';

const NotificationToast: React.FC = () => {
    const notifications = useNotifications();
    const dismissNotification = useDashboardStore((s) => s.dismissNotification);

    if (notifications.length === 0) return null;

    // Show only the most recent notification
    const notification = notifications[notifications.length - 1];

    const bgClass = notification.type === 'success'
        ? 'bg-success/10 text-success border-success/30'
        : notification.type === 'error'
            ? 'bg-error/10 text-error border-error/30'
            : 'bg-info/10 text-info border-info/30';

    const icon = notification.type === 'success' ? '✓'
        : notification.type === 'error' ? '❌'
            : 'ℹ️';

    return (
        <div
            className={`fixed top-4 right-4 p-4 rounded-lg shadow-xl z-50 animate-fade-in border ${bgClass}`}
            onClick={() => dismissNotification(notification.id)}
        >
            <div className="flex items-center gap-2 cursor-pointer">
                <span>{icon}</span>
                <span className="font-medium">{notification.message}</span>
            </div>
        </div>
    );
};

export default NotificationToast;
