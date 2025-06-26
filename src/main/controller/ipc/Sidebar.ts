import { app, BrowserWindow, WebContentsView } from "electron";
import { Manager } from "src/main/main";
import { IpcController } from "./IpcController";
import { resolveHtmlPath } from "src/main/util";
import path from "path";

export class Sidebar extends IpcController {
    private isSidebarOpen: boolean = true;
    private readonly sidebarView: WebContentsView;

    constructor(
        private readonly manager: Manager,
        private readonly baseWindow: BrowserWindow,
    ) {
        super();
        this.sidebarView = this.createSidebarView();
    }

    toggleSidebar() {
        if (!this.baseWindow) return;

        this.isSidebarOpen = !this.isSidebarOpen;
        const [width, height] = this.baseWindow.getSize();
        const targetSidebarWidth = this.getCurrentSidebarWidth();

        let initial = performance.now();

        const loop = () => {
            const now = performance.now();
            const elapsed = now - initial;
            const progress = Math.min(elapsed / 100, 1);
            const currentWidth = Math.floor(
                targetSidebarWidth * progress +
                    (this.isSidebarOpen
                        ? 0
                        : this.manager.initialSidebarWidth * (1 - progress)),
            );

            // Update all tab view bounds
            this.manager.tabViews.forEach((tabView) => {
                tabView.setBounds({
                    x: currentWidth,
                    y: 0,
                    width: width - (currentWidth - 50),
                    height: height,
                });
            });

            // Update sidebar bounds
            this.sidebarView?.setBounds({
                x: 0,
                y: 0,
                width: (currentWidth + 50),
                height: height,
            });

            if (progress >= 0.95) { // Removed the && isSidebarOpen condition
                // Final positioning
                this.sidebarView.setBounds({
                    x: 0,
                    y: 0,
                    width: targetSidebarWidth,
                    height: height,
                });

                // Update all tab view bounds
                this.manager.tabViews.forEach((tabView) => {
                    tabView.setBounds({
                        x: targetSidebarWidth,
                        y: 0,
                        width: width - targetSidebarWidth,
                        height: height,
                    });
                });

                // Set visibility after animation completes
                this.sidebarView?.setVisible(this.isSidebarOpen);
            } else {
                setImmediate(loop);
            }
        };

        // Start the animation - but handle initial visibility for opening
        if (this.isSidebarOpen) {
            this.sidebarView.setVisible(true); // Show immediately when opening
        }

        setImmediate(loop);
    }

    private createSidebarView(): WebContentsView {
        const sidebarView = new WebContentsView({
            webPreferences: {
                preload: app.isPackaged
                    ? path.join(__dirname, "preload.js")
                    : path.join(__dirname, "../../.erb/dll/preload.js"),
            },
        });

        sidebarView.setBounds({
            x: 0,
            y: 0,
            width: this.manager.initialSidebarWidth,
            height: this.manager.initialSidebarHeight,
        });

        sidebarView.webContents.loadURL(resolveHtmlPath("/"));
        // Remove or comment out the automatic DevTools opening:
        setTimeout(() => {
            sidebarView?.webContents.openDevTools({
                mode: "detach",
            });
        }, 1000);

        return sidebarView;
    }

    private getCurrentSidebarWidth(): number {
        return this.isSidebarOpen ? this.manager.initialSidebarWidth : 0;
    }

    protected registerIpcListeners(): void {
        this.registerIpcListener("sidebar.toggle", (event, arg) => this.toggleSidebar());
    }
}
