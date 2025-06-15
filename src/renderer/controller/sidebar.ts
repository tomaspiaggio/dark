export function toggleSidebar(): Promise<{ isSidebarOpen: boolean }> {
    return new Promise((resolve) => {
        window.electron?.ipcRenderer.once("sidebar.toggle", (event, result) => {
            resolve(result as { isSidebarOpen: boolean });
        });

        window.electron?.ipcRenderer.sendMessage("sidebar.toggle");
    });
}
