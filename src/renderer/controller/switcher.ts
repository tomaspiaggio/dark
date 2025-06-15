export function openSwitcher() {
    window.electron?.ipcRenderer.once("switcher.open", (event, arg) => {
        console.log("switcher.open", arg);
    });

    window.electron?.ipcRenderer.sendMessage("switcher.open");
}

export function closeSwitcher() {
    window.electron?.ipcRenderer.once("switcher.close", (event, arg) => {
        console.log("switcher.close", arg);
    });

    window.electron?.ipcRenderer.sendMessage("switcher.close");
}

export function selectTab(tabId: string) {
    window.electron?.ipcRenderer.once("switcher.select", (event, arg) => {
        console.log("switcher.select", arg);
    });

    window.electron?.ipcRenderer.sendMessage("switcher.select", tabId);
}

// Listen for switcher updates from main process
export function setupSwitcherListener(callback: (data: any) => void) {
    window.electron?.ipcRenderer.on("switcher.update", callback);
}

export function removeSwitcherListener() {
    window.electron?.ipcRenderer.removeAllListeners("switcher.update");
}