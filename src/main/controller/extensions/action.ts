// Toolbar icon, popups, click handlers.
import { ipcMain, Menu, nativeImage, BrowserWindow } from 'electron';
import path from 'path';
import { Windows } from './windows'; // Assuming this is now implemented

// This class will manage the state for a single extension's browser action.
export class Action {
  private icon: string | Record<string, string> | undefined;
  private title: string | undefined;
  private popup: string | undefined;
  private extensionPath: string;
  private windows: Windows;

  // We need a way to communicate with the renderer process to update the UI.
  // This would typically be done via IPC. Let's assume a channel 'update-action-state'.
  private browserWindow: BrowserWindow;

  constructor(extensionPath: string, browserWindow: BrowserWindow, windows: Windows) {
    this.extensionPath = extensionPath;
    this.browserWindow = browserWindow;
    this.windows = windows;

    // Listen for clicks from the renderer process
    ipcMain.on(`action-clicked-${this.getExtensionId()}`, () => this.onClicked());
  }

  private getExtensionId(): string {
    // A bit of a hack, assumes path is .../extensions/extensionId
    const parts = this.extensionPath.split(path.sep);
    return parts[parts.length - 1];
  }

  private sendStateUpdate() {
    // This would send the current state to the renderer process to update the UI.
    this.browserWindow.webContents.send(`update-action-state-${this.getExtensionId()}`, {
        icon: this.icon,
        title: this.title,
        popup: this.popup,
    });
  }

  async setIcon(details: { path?: string | Record<string, string>; imageData?: ImageData | Record<string, ImageData>; tabId?: number }): Promise<void> {
    // tabId is not supported yet.
    if (details.path) {
        this.icon = details.path;
    } else {
        // imageData is not supported yet, it would require converting ImageData to NativeImage.
        console.warn('action.setIcon with imageData is not implemented.');
    }
    this.sendStateUpdate();
  }

  async setTitle(details: { title: string; tabId?: number }): Promise<void> {
    // tabId is not supported yet.
    this.title = details.title;
    this.sendStateUpdate();
  }

  async setPopup(details: { popup: string; tabId?: number }): Promise<void> {
    // tabId is not supported yet.
    this.popup = details.popup;
    this.sendStateUpdate();
  }

  async openPopup(): Promise<void> {
    if (!this.popup) {
      return;
    }

    const popupUrl = `file://${path.join(this.extensionPath, this.popup)}`;
    
    // This needs to open a small window positioned relative to the action button.
    // The exact position is hard to get from the main process.
    // This is a simplified implementation.
    await this.windows.create({
        url: popupUrl,
        type: 'popup',
        width: 400,
        height: 300,
        focused: true,
    });
  }

  private onClicked() {
    if (this.popup) {
      this.openPopup();
    } else {
      // emit onClicked event for the extension's background script to hear.
      // This requires an event bus for extensions.
      // e.g., extensionEventEmitter.emit(`action.onClicked-${this.getExtensionId()}`);
    }
  }
}