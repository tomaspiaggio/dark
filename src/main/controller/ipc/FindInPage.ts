import { app, BrowserWindow } from "electron";
import path from "path";
import { Manager } from "src/main/main";
import { resolveHtmlPath } from "src/main/util";
import { IpcController } from "./IpcController";

export class FindInPage extends IpcController {
    private findWindow: BrowserWindow | undefined;

    constructor(
        private readonly manager: Manager,
        private readonly baseWindow: BrowserWindow,
    ) {
        super();
        this.findWindow = this.createFindWindow();
    }

    search(query: string): void {
        console.log(`Received search request: "${query}"`);

        const activeTabView = this.manager.getActiveTabView();
        if (!activeTabView) {
            console.log("No active tab view");
            return;
        }

        // If query is empty, clear everything
        if (!query) {
            console.log("Empty query, clearing find state");
            activeTabView.webContents.stopFindInPage("clearSelection");
            return;
        }

        console.log(`Starting search for: "${query}"`);

        try {
            activeTabView.webContents.findInPage(query, {
                forward: true,
                findNext: false,
                matchCase: false,
            });
        } catch (error) {
            console.error("Search error:", error);
        }
    }

    next(query: string): void {
        console.log("Find next requested");

        const activeTabView = this.manager.getActiveTabView();
        if (!activeTabView || !query) {
            console.log("No active tab, query, or matches for next");
            return;
        }

        try {
            // Set up one-time listener - found-in-page DOES fire for next/previous
            activeTabView.webContents.once(
                "found-in-page",
                (_event, result) => {
                    console.log("Found in page (next) result:", result);
                    if (
                        this.findWindow?.webContents &&
                        !this.findWindow.webContents.isDestroyed()
                    ) {
                        this.findWindow.webContents.send(
                            "find-in-page.results",
                            result,
                        );
                    }
                },
            );

            activeTabView.webContents.findInPage(query, {
                forward: true,
                findNext: true,
                matchCase: false,
            });
        } catch (error) {
            console.error("Find next error:", error);
        }
    }

    previous(query: string): void {
        console.log("Find previous requested");

        const activeTabView = this.manager.getActiveTabView();
        if (!activeTabView || !query) {
            console.log("No active tab, query, or matches for previous");
            return;
        }

        try {
            // Set up one-time listener - found-in-page DOES fire for next/previous
            activeTabView.webContents.once(
                "found-in-page",
                (_event, result) => {
                    console.log("Found in page (previous) result:", result);
                    if (
                        this.findWindow?.webContents &&
                        !this.findWindow.webContents.isDestroyed()
                    ) {
                        this.findWindow.webContents.send(
                            "find-in-page.results",
                            result,
                        );
                    }
                },
            );

            activeTabView.webContents.findInPage(query, {
                forward: false,
                findNext: true,
                matchCase: false,
            });
        } catch (error) {
            console.error("Find previous error:", error);
        }
    }

    dismiss(): void {
        console.log("Dismissing find");

        const activeTabView = this.manager.getActiveTabView();
        if (activeTabView != null) {
            activeTabView.webContents.stopFindInPage("clearSelection");
        }
    }

    protected registerIpcListeners(): void {
        this.registerIpcListener(
            "find-in-page.search",
            (event, { query }) => this.search(query),
        );
        this.registerIpcListener(
            "find-in-page.next",
            (event, { query }) => this.next(query),
        );
        this.registerIpcListener(
            "find-in-page.previous",
            (event, { query }) => this.previous(query),
        );
        this.registerIpcListener("find-in-page.dismiss", () => this.dismiss());
    }

    private createFindWindow(): BrowserWindow {
        const findWidth = 300;
        const findHeight = 50;

        const findWindow = new BrowserWindow({
            parent: this.baseWindow,
            modal: false,
            show: false,
            width: findWidth,
            height: findHeight,
            resizable: false,
            frame: false,
            transparent: true,
            alwaysOnTop: true,
            webPreferences: {
                preload: app.isPackaged
                    ? path.join(__dirname, "preload.js")
                    : path.join(__dirname, "../../.erb/dll/preload.js"),
            },
        });

        findWindow.loadURL(`${resolveHtmlPath("/find-in-page")}`);

        return findWindow;
    }
}
