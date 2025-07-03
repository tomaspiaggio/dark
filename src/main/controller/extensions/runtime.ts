// Fundamental messaging, manifest, background page, lifecycle hooks.
import { Tab } from "@/types/tab";
import { assert } from "console";
import { app } from "electron";
import { EventEmitter } from "events";
import path from "path";

export type Manifest = {
    name: string;
    version: string;
    manifest_version: number;
    description?: string;
    options_page?: string;
    background?: {
        scripts?: string[];
        page?: string;
        persistent?: boolean;
    };
    permissions?: string[];
};

// A simple event bus for messaging between extension components.
export const extensionEvents = new EventEmitter();

export class Runtime {
    public lastError: { message: string } | undefined;

    constructor(
        private readonly extensionId: string,
        private readonly manifest: Manifest,
        private readonly openTab: (url: string) => Promise<Tab>
    ) {
        assert(this.manifest, "Manifest is required");
    }

    getManifest(): Manifest {
        return this.manifest;
    }

    getURL(location: string): string {
        // This needs the base path of the extension.
        // Assuming we can get it from the extensionId.
        const extensionPath = `file://${path.join(app.getPath("userData"), "extensions", this.extensionId)}`;
        return `${extensionPath}/${location}`;
    }

    async openOptionsPage(): Promise<Tab | void> {
        if (this.manifest.options_page) {
            const url = this.getURL(this.manifest.options_page);
            return this.openTab(url);
        }
    }

    sendMessage(message: any, responseCallback?: (response: any) => void): void {
        // This sends a message to all parts of the extension (content scripts, popups, etc.)
        // The receiving end will use runtime.onMessage.
        const channel = `runtime-onMessage-${this.extensionId}`;
        extensionEvents.emit(channel, message, {
            // This is a mock sender object.
            // A real implementation would have more details.
            id: this.extensionId,
            url: `chrome-extension://${this.extensionId}`,
            tab: undefined, // This would be populated if sent from a content script
        }, responseCallback);
    }

    // onMessage, onConnect, etc. would be handled by having the extension's background script
    // add listeners to the `extensionEvents` emitter.
}
