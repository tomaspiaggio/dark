export function popState() {
    window.electron?.ipcRenderer.once("popstate-history.pop", (event, arg) => {
        console.log("popstate-history.pop", arg);
    });

    window.electron?.ipcRenderer.sendMessage("popstate-history.pop");
}

export function pushState() {
    window.electron?.ipcRenderer.once("popstate-history.push", (event, arg) => {
        console.log("popstate-history.push", arg);
    });

    window.electron?.ipcRenderer.sendMessage("popstate-history.push");
}

export function refreshState() {
    window.electron?.ipcRenderer.once("popstate-history.refresh", (event, arg) => {
        console.log("popstate-history.refresh", arg);
    });

    window.electron?.ipcRenderer.sendMessage("popstate-history.refresh");
}