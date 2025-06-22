// Desktop notifications.
// declare namespace chrome.notifications {
//     interface NotificationOptions {
//       type?: 'basic'|'image'|'list'|'progress'
//       iconUrl?: string
//       title: string
//       message: string
//       contextMessage?: string
//       priority?: number
//       buttons?: Array<{ title: string; iconUrl?: string }>
//     }
  
//     function create(notificationId: string, options: NotificationOptions): Promise<string>
//     function update(notificationId: string, options: NotificationOptions): Promise<boolean>
//     function clear(notificationId: string): Promise<boolean>
//     function getAll(): Promise<Record<string, NotificationOptions>>
  
//     const onClicked: chrome.events.Event<(notificationId: string) => void>
//     const onButtonClicked: chrome.events.Event<(notificationId: string, buttonIndex: number) => void>
//     const onClosed: chrome.events.Event<(notificationId: string, byUser: boolean) => void>
//   }

import { Notification } from "electron";

// TODO: finish implementing this.
export class Notifications {
    create(title: string, message: string): Promise<string> {
        const notification = new Notification({
            title,
            body: message,
        });
        notification.show();

        return Promise.resolve(title);
    }
}