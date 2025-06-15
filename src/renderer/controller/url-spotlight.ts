export function toggleTabsSpotlight(): void {
    window.electron?.ipcRenderer.once("spotlight.toggle", (event, arg) => {
        console.log("spotlight closed", arg);
        
    });

    window.electron?.ipcRenderer.sendMessage("spotlight.toggle");
}