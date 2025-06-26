import { Manager, TabData } from "src/main/main";
import { IpcController } from "./IpcController";
import { app, BrowserWindow } from "electron";
import path from "path";
import { resolveHtmlPath } from "src/main/util";

export class Switcher extends IpcController {
    private switcherTabs: TabData[] = [];
    private switcherSelectedIndex = 0;
    private isSwitcherVisible = false;
    private switcherWindow: BrowserWindow | undefined;
    private isControlPressed = false;

    constructor(
        private readonly manager: Manager,
        private readonly baseWindow: BrowserWindow,
    ) {
        super();
    }

    // select(event: Electron.IpcMainInvokeEvent, tabId: string) {
    //     const tab = this.switcherTabs.find((t) => t.id === tabId);
    //     if (tab) {
    //         const index = this.switcherTabs.indexOf(tab);
    //         this.switcherSelectedIndex = index;
    //         this.hideSwitcherAndSwitch();
    //     }
    //     event.reply("switcher.select", tabId);
    // }

    // private hideSwitcherAndSwitch() {
    //     console.log(
    //         "hiding switcher and switching to tab",
    //         this.switcherTabs[this.switcherSelectedIndex].id,
    //     );
    //     if (!this.isSwitcherVisible || !this.baseWindow) return;

    //     // Clear the control key checker interval if it exists
    //     if ((this.switcherWindow as any).controlKeyChecker) {
    //         clearInterval((this.switcherWindow as any).controlKeyChecker);
    //         (this.switcherWindow as any).controlKeyChecker = null;
    //     }

    //     this.isSwitcherVisible = false;
    //     // Don't reset isControlPressed here - let the key events handle it
    //     this.switcherWindow.hide();

    //     // Switch to selected tab
    //     if (this.switcherTabs[this.switcherSelectedIndex]) {
    //         this.manager.switchToTab(
    //             this.switcherTabs[this.switcherSelectedIndex].id,
    //         );
    //     }
    // }

    // private createSwitcherWindow() {
    //     // Create tab switcher window
    //     const switcherWidth = 800;
    //     const switcherHeight = 148;

    //     this.switcherWindow = new BrowserWindow({
    //         parent: this.baseWindow,
    //         modal: false,
    //         show: false,
    //         width: switcherWidth,
    //         height: switcherHeight,
    //         resizable: false,
    //         frame: false,
    //         transparent: true,
    //         alwaysOnTop: true,
    //         webPreferences: {
    //             preload: app.isPackaged
    //                 ? path.join(__dirname, "preload.js")
    //                 : path.join(__dirname, "../../.erb/dll/preload.js"),
    //         },
    //     });

    //     this.switcherWindow.loadURL(`${resolveHtmlPath("/switcher")}`);

    //     // Monitor Control key state using before-input-event on the switcher window
    //     this.switcherWindow.webContents.on(
    //         "before-input-event",
    //         (event, input) => {
    //             if (input.key.toLowerCase() === "control") {
    //                 if (input.type === "keyDown") {
    //                     this.isControlPressed = true;
    //                 } else if (input.type === "keyUp") {
    //                     this.isControlPressed = false;
    //                     // Close switcher when Control is released
    //                     if (this.isSwitcherVisible) {
    //                         this.hideSwitcherAndSwitch();
    //                     }
    //                 }
    //             } else if (
    //                 input.key.toLowerCase() === "tab" &&
    //                 input.type === "keyDown" &&
    //                 this.isControlPressed
    //             ) {
    //                 // Handle Tab key press while Control is held down
    //                 event.preventDefault();
    //                 if (input.shift) {
    //                     // Control+Shift+Tab - navigate to previous tab
    //                     if (!this.isSwitcherVisible) {
    //                         this.showTabSwitcher();
    //                     } else {
    //                         this.navigateSwitcher("prev");
    //                     }
    //                 } else {
    //                     // Control+Tab - navigate to next tab
    //                     if (!isSwitcherVisible) {
    //                         showTabSwitcher();
    //                     } else {
    //                         navigateSwitcher("next");
    //                     }
    //                 }
    //             }
    //         },
    //     );
    // }

    // private showTabSwitcher() {
    //     if (!this.switcherWindow) return;

    //     // Get tabs sorted by history (most recent first)
    //     this.switcherTabs = this.manager.getTabsByHistory();

    //     if (this.switcherTabs.length <= 1) return; // No point showing switcher with 1 or 0 tabs

    //     // Start with index 1 (second most recent tab)
    //     this.switcherSelectedIndex = 1;

    //     this.isSwitcherVisible = true;
    //     this.switcherWindow.show();
    //     this.switcherWindow.focus();

    //     // Send initial data to switcher
    //     this.sendSwitcherUpdate();

    //     // Set up a timer to periodically check if Control is still pressed
    //     // This is a more reliable fallback than relying on event handlers
    //     const controlKeyChecker = setInterval(() => {
    //         if (isSwitcherVisible) {
    //             if (!isControlPressed) {
    //                 clearInterval(controlKeyChecker);
    //                 hideSwitcherAndSwitch();
    //             }
    //         } else {
    //             clearInterval(controlKeyChecker);
    //         }
    //     }, 50); // Check every 100ms for better reliability

    //     // Store the interval so we can clear it if needed
    //     (switcherWindow as any).controlKeyChecker = controlKeyChecker;
    // }

    protected registerIpcListeners(): void {
    }
}
