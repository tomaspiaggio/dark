// Right-click menu items (used by many productivity extensions).
import { Tab } from '@/types/tab';
import { BrowserWindow, ipcMain, Menu, MenuItem, WebContents } from 'electron';

interface OnClickData {
    menuItemId: string | number;
    linkUrl?: string;
    selectionText?: string;
    frameUrl?: string;
    pageUrl?: string;
}

// This will hold the menu items created by extensions.
const menuItems = new Map<string | number, MenuItem>();
let contextMenu: Menu | null = null;

export class ContextMenus {
    constructor() {
        ipcMain.on('context-menu-show', (event, params) => {
            this.buildAndShowMenu(event.sender, params);
        });
    }

    private buildAndShowMenu(contents: WebContents, params: any) {
        // Filter menuItems based on context (params.linkURL, etc.)
        // and documentUrlPatterns. This is a simplified version.
        const itemsToShow = Array.from(menuItems.values());

        if (itemsToShow.length > 0) {
            contextMenu = Menu.buildFromTemplate(itemsToShow);
            const win = BrowserWindow.fromWebContents(contents);
            if (win) {
                contextMenu.popup({ window: win });
            }
        }
    }

    create(props: {
        id?: string | number;
        title: string;
        contexts?: string[];
        documentUrlPatterns?: string[];
        onclick?: (info: OnClickData, tab: Tab) => void;
    }): string | number {
        const id = props.id || Math.random().toString(36).substr(2, 9);

        const menuItem = new MenuItem({
            id: id.toString(),
            label: props.title,
            click: (menuItem, browserWindow, event) => {
                // The `event` object here is an Electron event, not the extension's onClickData.
                // We need to construct the onClickData and find the tab.
                // This is a complex part to get right.
                if (props.onclick) {
                    // props.onclick(onClickData, tab);
                }
                // Also need to emit the global onClicked event.
            }
        });

        menuItems.set(id, menuItem);
        return id;
    }

    update(
        id: string | number,
        updateProps: { title?: string; contexts?: string[]; visible?: boolean }
    ): void {
        const menuItem = menuItems.get(id);
        if (menuItem) {
            if (updateProps.title) {
                menuItem.label = updateProps.title;
            }
            if (updateProps.visible !== undefined) {
                menuItem.visible = updateProps.visible;
            }
        }
    }

    remove(id: string | number): void {
        menuItems.delete(id);
    }

    removeAll(): void {
        menuItems.clear();
    }
}