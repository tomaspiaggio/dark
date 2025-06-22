// Dynamic permission requests (e.g. host-access prompts).

// declare namespace chrome.permissions {
//     interface Permissions { permissions?: string[]; origins?: string[] }

//     function contains(perm: Permissions): Promise<boolean>
//     function request(perm: Permissions): Promise<boolean>
//     function remove(perm: Permissions): Promise<boolean>

//     const onAdded: chrome.events.Event<(perm: Permissions) => void>
//     const onRemoved: chrome.events.Event<(perm: Permissions) => void>
//   }

import { existsSync } from "fs";
import { readFile } from "fs/promises";
import { EventEmitter } from "events";

export class Permissions extends EventEmitter {

    private permissions: Set<string> = new Set();

    private constructor() {
        super();
    }

    static async new(permissionsDataPath: string): Promise<Permissions> {
        const permissions = new Permissions();
        permissions.permissions = await permissions.loadPermissionsData(permissionsDataPath);
        return permissions;
    }

    contains(permission: string): boolean {
        return this.permissions.has(permission);
    }

    request(permission: string): Promise<boolean> {
        return new Promise<boolean>((resolve, reject) => {
            this.emit("request", permission, resolve);
        });
    }

    remove(permission: string): boolean {
        this.permissions.delete(permission);
        return true;
    }

    on(event: "request", listener: (permission: string, resolve: (granted: boolean) => void) => void): this {
        this.on(event, listener);
        return this;
    }

    emit(event: "request", permission: string, resolve: (granted: boolean) => void): boolean {
        return this.emit(event, permission, resolve);
    }

    private async loadPermissionsData(path: string): Promise<Set<string>> {
        if (!existsSync(path)) {
            return new Set();
        }

        const permissionsData = await readFile(path, "utf8");
        return new Set(JSON.parse(permissionsData).permissions);
    }
}
