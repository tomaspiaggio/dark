import Store from "electron-store";
import { randomUUID } from "crypto";
import { Tab } from "@/types/tab";

// Type definitions
export interface BookmarkData {
    id: string;
    title: string;
    url: string;
    folder?: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface SpaceData {
    id: string;
    name: string;
    color: string;
    icon?: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface PersistedTabData {
    id: string;
    url: string;
    title: string;
    spaceId: string;
    customTitle?: string;
    order: number;
    createdAt: Date;
    updatedAt: Date;
}

export interface StoreSchema {
    tabs: PersistedTabData[];
    bookmarks: BookmarkData[];
    spaces: SpaceData[];
    settings: {
        activeSpaceId: string;
        sidebarWidth: number;
        lastWindowBounds?: {
            x: number;
            y: number;
            width: number;
            height: number;
        };
    };
}

// Initialize store with type annotation
const store = new Store<StoreSchema>({
    defaults: {
        tabs: [],
        bookmarks: [],
        spaces: [
            {
                id: "default",
                name: "Personal",
                color: "#3b82f6",
                createdAt: new Date(),
                updatedAt: new Date(),
            },
        ],
        settings: {
            activeSpaceId: "default",
            sidebarWidth: 300,
        },
    },
});

// Store management functions
export class DataStore {
    static get<K extends keyof StoreSchema>(key: K): StoreSchema[K] {
        return store.get(key);
    }

    static set<K extends keyof StoreSchema>(
        key: K,
        value: StoreSchema[K],
    ): void {
        store.set(key, value);
    }

    // Tab management
    static saveTabs(tabs: Tab[]): void {
        const activeSpaceId = DataStore.getActiveSpaceId();
        store.set(
            "tabs",
            tabs.map((tab) => ({
                ...tab,
                spaceId: activeSpaceId,
            })),
        );
    }

    static getTabs(): PersistedTabData[] {
        return store.get("tabs");
    }

    static getTabsForSpace(spaceId: string): PersistedTabData[] {
        return store.get("tabs").filter((tab: PersistedTabData) =>
            tab.spaceId === spaceId
        );
    }

    // Bookmark management
    static getBookmarks(): BookmarkData[] {
        return store.get("bookmarks");
    }

    static addBookmark(
        bookmark: Omit<BookmarkData, "id" | "createdAt" | "updatedAt">,
    ): BookmarkData {
        const newBookmark: BookmarkData = {
            ...bookmark,
            id: randomUUID(),
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        const bookmarks = store.get("bookmarks");
        bookmarks.push(newBookmark);
        store.set("bookmarks", bookmarks);

        return newBookmark;
    }

    static updateBookmark(
        id: string,
        updates: Partial<Omit<BookmarkData, "id" | "createdAt">>,
    ): boolean {
        const bookmarks = store.get("bookmarks");
        const index = bookmarks.findIndex((b: BookmarkData) => b.id === id);

        if (index === -1) return false;

        bookmarks[index] = {
            ...bookmarks[index],
            ...updates,
            updatedAt: new Date(),
        };

        store.set("bookmarks", bookmarks);
        return true;
    }

    static deleteBookmark(id: string): boolean {
        const bookmarks = store.get("bookmarks");
        const filteredBookmarks = bookmarks.filter((b: BookmarkData) =>
            b.id !== id
        );

        if (filteredBookmarks.length === bookmarks.length) return false;

        store.set("bookmarks", filteredBookmarks);
        return true;
    }

    // Space management
    static getSpaces(): SpaceData[] {
        return store.get("spaces");
    }

    static addSpace(
        space: Omit<SpaceData, "id" | "createdAt" | "updatedAt">,
    ): SpaceData {
        const newSpace: SpaceData = {
            ...space,
            id: randomUUID(),
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        const spaces = store.get("spaces");
        spaces.push(newSpace);
        store.set("spaces", spaces);

        return newSpace;
    }

    static deleteSpace(id: string): boolean {
        if (id === "default") return false; // Can't delete default space

        const spaces = store.get("spaces");
        const filteredSpaces = spaces.filter((s: SpaceData) => s.id !== id);

        if (filteredSpaces.length === spaces.length) return false;

        // Move tabs from deleted space to default
        const tabs = store.get("tabs");
        const updatedTabs = tabs.map((tab: PersistedTabData) =>
            tab.spaceId === id ? { ...tab, spaceId: "default" } : tab
        );

        store.set("spaces", filteredSpaces);
        store.set("tabs", updatedTabs);

        return true;
    }

    // Settings management
    static getActiveSpaceId(): string {
        return store.get("settings.activeSpaceId");
    }

    static setActiveSpaceId(spaceId: string): void {
        store.set("settings.activeSpaceId", spaceId);
    }
}

export default store;