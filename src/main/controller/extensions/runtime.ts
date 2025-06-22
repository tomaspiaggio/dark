// Fundamental messaging, manifest, background page, lifecycle hooks.
// Electron: ✔️ Partial support
// Supported natively:
// Properties: runtime.lastError, runtime.id
// Methods: getBackgroundPage, getManifest, getPlatformInfo, getURL, connect, sendMessage, reload
// Events: onStartup, onInstalled, onSuspend, onSuspendCanceled, onConnect, onMessage
// Not supported natively: openOptionsPage (must shim), long-lived Port messaging beyond connect/onConnect, onSuspendCanceled details.

import { Tab } from "@/types/tab";
import { assert } from "console";

export type Manifest = {options_page: string}

export class Runtime {

    constructor(
        private readonly manifest: Manifest,
        private readonly openTab: (url: string) => Promise<Tab>
    ) {
        assert(this.manifest.options_page, "Options page not found in manifest");
    }

    async openOptionsPage(): Promise<Tab> {
        return this.openTab(this.manifest.options_page);
    }
}