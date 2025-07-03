// Local data persistence (e.g. settings, caches).
import { app } from "electron";
import path from "path";
import fs from "fs/promises";
import { EventEmitter } from "events";

const STORAGE_DIR = path.join(app.getPath("userData"), "extension-storage");

// Ensure the storage directory exists
fs.mkdir(STORAGE_DIR, { recursive: true });

class StorageArea {
  private data: Record<string, any> = {};
  private onChanged = new EventEmitter();

  constructor(private storagePath: string) {
    this.load();
  }

  private async load() {
    try {
      const content = await fs.readFile(this.storagePath, "utf-8");
      this.data = JSON.parse(content);
    } catch (error) {
      // File might not exist yet, which is fine.
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        console.error("Failed to load extension storage:", error);
      }
    }
  }

  private async persist() {
    try {
      await fs.writeFile(this.storagePath, JSON.stringify(this.data, null, 2));
    } catch (error) {
      console.error("Failed to save extension storage:", error);
    }
  }

  get(keys: string | string[] | Record<string, any> | null): Promise<Record<string, any>> {
    return new Promise((resolve) => {
      if (keys === null) {
        resolve(this.data);
        return;
      }

      const result: Record<string, any> = {};
      let keyList: string[] = [];

      if (typeof keys === 'string') {
        keyList = [keys];
      } else if (Array.isArray(keys)) {
        keyList = keys;
      } else if (typeof keys === 'object') {
        keyList = Object.keys(keys);
        Object.assign(result, keys); // Copy default values
      }

      for (const key of keyList) {
        if (key in this.data) {
          result[key] = this.data[key];
        }
      }
      resolve(result);
    });
  }

  set(items: Record<string, any>): Promise<void> {
    return new Promise((resolve) => {
      const changes: Record<string, { oldValue?: any; newValue?: any }> = {};
      for (const key in items) {
        const oldValue = this.data[key];
        const newValue = items[key];
        if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
            changes[key] = { oldValue, newValue };
            this.data[key] = newValue;
        }
      }
      
      if (Object.keys(changes).length > 0) {
        this.persist();
        this.onChanged.emit("changed", changes);
      }

      resolve();
    });
  }

  remove(keys: string | string[]): Promise<void> {
    return new Promise((resolve) => {
      const keyList = typeof keys === 'string' ? [keys] : keys;
      const changes: Record<string, { oldValue?: any; newValue?: any }> = {};

      for (const key of keyList) {
        if (key in this.data) {
          changes[key] = { oldValue: this.data[key] };
          delete this.data[key];
        }
      }

      if (Object.keys(changes).length > 0) {
        this.persist();
        this.onChanged.emit("changed", changes);
      }
      
      resolve();
    });
  }

  clear(): Promise<void> {
    return new Promise((resolve) => {
      const changes: Record<string, { oldValue?: any; newValue?: any }> = {};
      for(const key in this.data) {
        changes[key] = { oldValue: this.data[key] };
      }
      this.data = {};

      if (Object.keys(changes).length > 0) {
        this.persist();
        this.onChanged.emit("changed", changes);
      }

      resolve();
    });
  }
}

export class Storage {
  public local: StorageArea;
  public sync: StorageArea; // Not truly syncing, just another local area for now.
  public managed: StorageArea; // Read-only, not implemented.
  public onChanged = new EventEmitter();

  constructor(extensionId: string) {
    const localPath = path.join(STORAGE_DIR, `${extensionId}.local.json`);
    this.local = new StorageArea(localPath);

    const syncPath = path.join(STORAGE_DIR, `${extensionId}.sync.json`);
    this.sync = new StorageArea(syncPath); // Shim for sync

    this.managed = new StorageArea(""); // Empty, read-only storage.

    this.local['onChanged'].on('changed', (changes) => {
        this.onChanged.emit('changed', changes, 'local');
    });
    this.sync['onChanged'].on('changed', (changes) => {
        this.onChanged.emit('changed', changes, 'sync');
    });
  }
}
