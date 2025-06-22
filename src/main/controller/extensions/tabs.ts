// Create/update/close/query tabs (e.g. for “open new tab” buttons).
// Electron: ✔️ Partial support
// Supported natively: sendMessage, reload, executeScript, query (only properties url, title, audible, active, muted), update (only url, muted)
// Not supported natively: create, remove, all events—you must shim those.

import { Tab } from "@/types/tab";

export class Tabs {

    constructor(
        private readonly openTab: (url: string) => Promise<Tab>,
        private readonly removeTab: (tabId: number) => Promise<void>,
        private readonly getTab: (tabId: number) => Promise<Tab>,
        private readonly getCurrentTab: () => Promise<Tab>,
    ) {}

    create(createInfo: { windowId?: number; url?: string; active?: boolean }): Promise<Tab> {
        if (!createInfo.url) {
            throw new Error("URL is required to create a tab");
        }

        return this.openTab(createInfo.url);
    }

    async remove(tabIds: number | number[]): Promise<void> {
        if (Array.isArray(tabIds)) {
            if (tabIds.length === 0) {
                throw new Error("No tabs to remove");
            }

            await Promise.all(tabIds.map(this.removeTab));
            return;
        }

        return this.removeTab(tabIds);
    }

    get(tabId: number): Promise<Tab> {
        return this.getTab(tabId);
    }

    getCurrent(): Promise<Tab> {
        return this.getCurrentTab();
    }

}