export function installByUrl(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
        window.electron?.ipcRenderer.once(
            "extensions.install",
            (event, arg) => {
                console.log("extensions.install", arg);
                resolve();
            },
        );

        window.electron?.ipcRenderer.sendMessage("extensions.install", { url });
    });
}

export function configure() {
    // @ts-ignore
    window.chrome = window.chrome || {};
    // @ts-ignore
    window.chrome.webstore = {
        // @ts-ignore
        install: async (url, onSuccess, onFailure) => {
            try {
                await installByUrl(url);
                onSuccess();
            } catch (error) {
                onFailure(error);
            }
        },
    };
}
