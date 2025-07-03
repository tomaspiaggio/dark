// Dynamic permission requests (e.g. host-access prompts).
import { existsSync } from "fs";
import { readFile, writeFile } from "fs/promises";
import { EventEmitter } from "events";

export interface PermissionsData {
    permissions: string[];
    origins: string[];
}

export class Permissions extends EventEmitter {
    private permissions: Set<string> = new Set();
    private origins: Set<string> = new Set();
    private permissionsDataPath: string;

    private constructor(permissionsDataPath: string) {
        super();
        this.permissionsDataPath = permissionsDataPath;
    }

    static async new(permissionsDataPath: string): Promise<Permissions> {
        const permissions = new Permissions(permissionsDataPath);
        await permissions.loadPermissionsData();
        return permissions;
    }

    private async loadPermissionsData(): Promise<void> {
        if (!existsSync(this.permissionsDataPath)) {
            this.permissions = new Set();
            this.origins = new Set();
            return;
        }

        const permissionsData = await readFile(this.permissionsDataPath, "utf8");
        const data: PermissionsData = JSON.parse(permissionsData);
        this.permissions = new Set(data.permissions || []);
        this.origins = new Set(data.origins || []);
    }

    private async savePermissionsData(): Promise<void> {
        const data: PermissionsData = {
            permissions: Array.from(this.permissions),
            origins: Array.from(this.origins),
        };
        await writeFile(this.permissionsDataPath, JSON.stringify(data, null, 2));
    }

    contains(perm: { permissions?: string[]; origins?: string[] }): Promise<boolean> {
        const hasPerms = perm.permissions?.every(p => this.permissions.has(p)) ?? true;
        const hasOrigins = perm.origins?.every(o => this.origins.has(o)) ?? true;
        return Promise.resolve(hasPerms && hasOrigins);
    }

    request(perm: { permissions?: string[]; origins?: string[] }): Promise<boolean> {
        return new Promise<boolean>((resolve) => {
            // In a real implementation, this would show a prompt to the user.
            // For now, we'll auto-grant and save.
            let granted = false;
            if (perm.permissions) {
                perm.permissions.forEach(p => {
                    this.permissions.add(p);
                    granted = true;
                });
            }
            if (perm.origins) {
                perm.origins.forEach(o => {
                    this.origins.add(o);
                    granted = true;
                });
            }

            if (granted) {
                this.savePermissionsData();
                super.emit("onAdded", perm);
            }
            resolve(granted);
        });
    }

    remove(perm: { permissions?: string[]; origins?: string[] }): Promise<boolean> {
        let removed = false;
        if (perm.permissions) {
            perm.permissions.forEach(p => {
                if (this.permissions.delete(p)) {
                    removed = true;
                }
            });
        }
        if (perm.origins) {
            perm.origins.forEach(o => {
                if (this.origins.delete(o)) {
                    removed = true;
                }
            });
        }

        if (removed) {
            this.savePermissionsData();
            super.emit("onRemoved", perm);
        }
        return Promise.resolve(removed);
    }
}