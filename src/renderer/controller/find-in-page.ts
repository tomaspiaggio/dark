export function findInPage(query: string): Promise<number> {
    return new Promise((resolve) => {
        // Remove timeout since we'll get results via stream
        window.electron?.ipcRenderer.once("find-in-page.find", (arg) => {
            console.log("find-in-page.find result:", arg);
            const matches = arg as number;
            resolve(matches);
        });

        console.log("Sending find request:", { query });
        window.electron?.ipcRenderer.sendMessage("find-in-page.find", {
            query,
        });
    });
}

// Listen for find results stream
export function onFindResults(
    callback: (
        results: {
            matches: number;
            activeMatchOrdinal: number;
            finalUpdate: boolean;
        },
    ) => void,
): () => void {
    const handler = (results: any) => {
        callback(results);
    };

    window.electron?.ipcRenderer.on("find-in-page.results", handler);

    // Return cleanup function
    return () => {
        window.electron?.ipcRenderer.removeListener(
            "find-in-page.results",
            handler,
        );
    };
}

// Simple command functions - no state management
export function searchInPage(query: string): void {
    console.log("Sending search request:", { query });
    window.electron?.ipcRenderer.sendMessage("find-in-page.search", { query });
}

export function findNext(query: string): void {
    console.log("Sending find next request", { query });
    window.electron?.ipcRenderer.sendMessage("find-in-page.next", { query });
}

export function findPrevious(query: string): void {
    console.log("Sending find previous request", { query });
    window.electron?.ipcRenderer.sendMessage("find-in-page.previous", { query });
}

export function dismissFindInPage(): void {
    console.log("Dismissing find in page");
    window.electron?.ipcRenderer.sendMessage("find-in-page.dismiss");
}
