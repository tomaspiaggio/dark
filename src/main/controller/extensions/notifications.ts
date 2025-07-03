// Desktop notifications.
import { Notification } from 'electron';

interface NotificationOptions {
    type?: 'basic' | 'image' | 'list' | 'progress';
    iconUrl?: string;
    title: string;
    message: string;
    contextMessage?: string;
    priority?: number;
    buttons?: Array<{ title: string; iconUrl?: string }>;
}

const notifications = new Map<string, Notification>();

export class Notifications {
    async create(notificationId: string = Math.random().toString(36).substr(2, 9), options: NotificationOptions): Promise<string> {
        const notification = new Notification({
            title: options.title,
            body: options.message,
            // icon: options.iconUrl, // Needs to be a NativeImage
            // buttons: options.buttons?.map(b => b.title), // Simplified
        });

        notification.on('click', () => {
            // emit onClicked event
        });
        notification.on('close', () => {
            notifications.delete(notificationId);
            // emit onClosed event
        });
        // 'action' event for buttons

        notification.show();
        notifications.set(notificationId, notification);

        return notificationId;
    }

    async update(notificationId: string, options: NotificationOptions): Promise<boolean> {
        // Electron notifications cannot be updated once shown.
        // We can close the old one and show a new one.
        await this.clear(notificationId);
        await this.create(notificationId, options);
        return true;
    }

    async clear(notificationId: string): Promise<boolean> {
        const notification = notifications.get(notificationId);
        if (notification) {
            notification.close();
            notifications.delete(notificationId);
            return true;
        }
        return false;
    }

    async getAll(): Promise<Record<string, NotificationOptions>> {
        // This is not possible with Electron's Notification API as we can't get the options back.
        // We would need to store the options ourselves.
        return {};
    }
}
