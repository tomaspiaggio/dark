// Create/update/close/query tabs (e.g. for “open new tab” buttons).
import { Tab } from "@/types/tab";
import { BrowserWindow } from "electron";

// This is highly dependent on the application's tab management logic.
// I'm making some assumptions here.
// Let's assume there's a central tab manager.
export interface ITabManager {
    createTab(url: string, window?: BrowserWindow): Promise<Tab>;
    removeTab(tabId: number): Promise<void>;
    getTabById(tabId: number): Promise<Tab | undefined>;
    getCurrentTab(window?: BrowserWindow): Promise<Tab | undefined>;
    updateTab(tabId: number, options: { url?: string, muted?: boolean, active?: boolean }): Promise<Tab>;
    queryTabs(query: { active?: boolean, currentWindow?: boolean, url?: string | string[] }): Promise<Tab[]>;
}

export class Tabs {
    constructor(
        private readonly tabManager: ITabManager
    ) {}

    async create(createInfo: { windowId?: number; url?: string; active?: boolean }): Promise<Tab> {
        if (!createInfo.url) {
            throw new Error("URL is required to create a tab");
        }
        
        const window = createInfo.windowId ? BrowserWindow.fromId(createInfo.windowId) : undefined;
        if (createInfo.windowId && !window) {
            throw new Error(`Window with id ${createInfo.windowId} not found.`);
        }

        const tab = await this.tabManager.createTab(createInfo.url, window || undefined);

        if (createInfo.active) {
            await this.tabManager.updateTab(tab.id, { active: true });
        }

        return tab;
    }

    async remove(tabIds: number | number[]): Promise<void> {
        const ids = Array.isArray(tabIds) ? tabIds : [tabIds];
        if (ids.length === 0) {
            return;
        }
        await Promise.all(ids.map(id => this.tabManager.removeTab(id)));
    }

    async get(tabId: number): Promise<Tab> {
        const tab = await this.tabManager.getTabById(tabId);
        if (!tab) {
            throw new Error(`Tab with id ${tabId} not found.`);
        }
        return tab;
    }

    async getCurrent(): Promise<Tab> {
        const tab = await this.tabManager.getCurrentTab();
        if (!tab) {
            // This can happen if the focused window has no tabs, or no window is focused.
            // The chrome API returns undefined in some cases. Here we throw.
            throw new Error("No active tab found in current window.");
        }
        return tab;
    }

    async update(tabId: number, updateProperties: { url?: string; muted?: boolean; active?: boolean }): Promise<Tab> {
        return this.tabManager.updateTab(tabId, updateProperties);
    }

    async query(queryInfo: { active?: boolean; currentWindow?: boolean; url?: string | string[] }): Promise<Tab[]> {
        return this.tabManager.queryTabs(queryInfo);
    }

    // Other methods like executeScript, insertCSS, sendMessage would also be here.
    // They would typically find the webContents for the tab and call the appropriate electron method.
}