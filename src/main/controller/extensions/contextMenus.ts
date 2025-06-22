// Right-click menu items (used by many productivity extensions).
// TODO: need to implement all of these. none are supported by electron.
// declare namespace chrome.contextMenus {
//     interface OnClickData { menuItemId: string|number; linkUrl?: string; selectionText?: string; frameUrl?: string; pageUrl?: string; }

//     function create(props: {
//       id?: string|number; title: string; contexts?: string[]; documentUrlPatterns?: string[]; onclick?: (info: OnClickData, tab: chrome.tabs.Tab) => void
//     }): string|number
//     function update(id: string|number, updateProps: { title?: string; contexts?: string[]; visible?: boolean }): void
//     function remove(id: string|number): void
//     function removeAll(): void

//     const onClicked: chrome.events.Event<(info: OnClickData, tab: chrome.tabs.Tab) => void>
//   }

export class ContextMenus {
    constructor(
        
    ) {}

    create(props: {
        id?: string | number;
        title: string;
        contexts?: string[];
        documentUrlPatterns?: string[];
        // TODO: implement this
        // onclick?: (info: OnClickData, tab: chrome.tabs.Tab) => void;
    }): string | number {
        throw new Error("Not implemented");
    }

    update(
        id: string | number,
        updateProps: { title?: string; contexts?: string[]; visible?: boolean },
    ): void {
        throw new Error("Not implemented");
    }

    remove(id: string | number): void {
        throw new Error("Not implemented");
    }

    removeAll(): void {
        throw new Error("Not implemented");
    }
}
