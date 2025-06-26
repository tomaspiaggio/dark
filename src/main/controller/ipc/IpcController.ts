import { ipcMain } from "electron";

export abstract class IpcController {
    protected abstract registerIpcListeners(): void | Promise<void>;

    protected registerIpcListener(channel: string, listener: (event: Electron.IpcMainInvokeEvent, ...args: any[]) => Promise<any> | any): void {
        ipcMain.on(channel, listener);
    }
}