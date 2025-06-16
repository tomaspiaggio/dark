export function setTab(url: string) {
    console.log("setting tab to ", url);
    window.electron?.ipcRenderer.once("tabs.set", (arg) => {
        console.log("changed tab to ", arg);
    });

    window.electron?.ipcRenderer.sendMessage("tabs.set", url);
}

export function openTab(url: string) {
    console.log("opening tab to ", url);
    window.electron?.ipcRenderer.once("tabs.open", (arg) => {
        console.log("opened tab to ", arg);
    });

    window.electron?.ipcRenderer.sendMessage("tabs.open", url);
}

export function openTabSearch(query: string) {
    const searchUrl = `https://www.google.com/search?q=${
        encodeURIComponent(query)
    }`;

    openTab(searchUrl);
}

export function openTabAi(query: string) {
    const searchUrl = `https://t3.chat/new?model=gemini-2.0-flash&q=${
        encodeURIComponent(query)
    }`;

    openTab(searchUrl);
}

export function getAllTabs(): Promise<{url: string, id: string, title: string, active: boolean}[]> {
    return new Promise((resolve, reject) => {
        window.electron?.ipcRenderer.once("tabs.getAll", (arg) => {
            console.log("got all tabs", arg);
            resolve(arg as {url: string, id: string, title: string, active: boolean}[]);
        });

        window.electron?.ipcRenderer.sendMessage("tabs.getAll");
    });
}

export function subscribeToTabChanges(callback: (tabs: {url: string, id: string, title: string, active: boolean}[]) => void) {
    // First, remove any existing listeners to prevent duplicates
    window.electron?.ipcRenderer.removeAllListeners("tabs.onChange");
    
    window.electron?.ipcRenderer.on("tabs.onChange", (arg) => {
        console.log("got tabs.onChange event with data:", arg);
        console.log("typeof arg:", typeof arg);
        console.log("Array.isArray(arg):", Array.isArray(arg));
        
        let tabsData: any[] = [];
        
        if (Array.isArray(arg)) {
            tabsData = arg;
        } else if (arg && typeof arg === 'object' && Array.isArray(arg.tabs)) {
            tabsData = arg.tabs;
        } else {
            console.warn("Received invalid tabs data:", arg);
            callback([]);
            return;
        }
        
        callback(tabsData as {url: string, id: string, title: string, active: boolean}[]);
    });
}

export function navigateActiveTab(url: string) {
    console.log("navigating active tab to ", url);
    window.electron?.ipcRenderer.once("tabs.navigateActive", (arg) => {
        console.log("navigated active tab to ", arg);
    });

    window.electron?.ipcRenderer.sendMessage("tabs.navigateActive", url);
}

export function renameTab(tabId: string, newTitle: string) {
    console.log("renaming tab", tabId, "to", newTitle);
    window.electron?.ipcRenderer.once("tabs.rename", (arg) => {
        console.log("renamed tab", arg);
    });

    window.electron?.ipcRenderer.sendMessage("tabs.rename", { tabId, newTitle });
}

export function reorderTab(tabId: string, newIndex: number) {
    console.log("reordering tab", tabId, "to index", newIndex);
    window.electron?.ipcRenderer.once("tabs.reorder", (arg) => {
        console.log("reordered tab", arg);
    });

    window.electron?.ipcRenderer.sendMessage("tabs.reorder", { tabId, newIndex });
}

export function switchToTab(tabId: string) {
    console.log("switching to tab", tabId);
    window.electron?.ipcRenderer.once("tabs.switch", (arg) => {
        console.log("switched to tab", arg);
    });

    window.electron?.ipcRenderer.sendMessage("tabs.switch", tabId);
}

export function closeTab(tabId: string) {
    console.log("closing tab", tabId);
    window.electron?.ipcRenderer.once("tabs.close", (arg) => {
        console.log("closed tab", arg);
    });

    window.electron?.ipcRenderer.sendMessage("tabs.close", tabId);
}