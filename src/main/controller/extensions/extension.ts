// Core extension metadata (getURL, lastError, getBackgroundPage).
import path from 'path';

// This class provides properties and methods related to the extension itself,
// similar to chrome.extension API (which is mostly deprecated in favor of chrome.runtime).
export class Extension {
    public lastError: { message: string } | undefined;

    constructor(
        private readonly extensionId: string,
        private readonly extensionPath: string,
    ) {}

    getURL(urlPath: string): string {
        return `file://${path.join(this.extensionPath, urlPath)}`;
    }

    // getBackgroundPage() is tricky. It would return the Window object for the background page.
    // In Electron, this is often not a visible window.
    getBackgroundPage(): any | null {
        // This would require tracking the background page's webContents or window.
        console.warn('extension.getBackgroundPage() is not implemented.');
        return null;
    }
}
