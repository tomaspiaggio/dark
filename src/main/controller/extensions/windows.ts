// Window creation & management (popups, panels).
import { BrowserWindow, screen } from 'electron';
import { Tab } from '@/types/tab'; // Assuming Tab has an id property

// This is a simplified representation. We'll need a way to manage our windows.
const windows = new Map<number, BrowserWindow>();
let nextWindowId = 1;

// A helper to get our Tab representation from a BrowserWindow
// This is highly dependent on the rest of the app structure.
// For now, I'll assume a function `getTabsForWindow` exists.
declare function getTabsForWindow(windowId: number): Promise<Tab[]>;


export class Windows {
  // This will need access to the main window or a way to create new windows.
  constructor() {}

  async create(createData: {
    url?: string | string[];
    left?: number;
    top?: number;
    width?: number;
    height?: number;
    focused?: boolean;
    state?: 'normal' | 'minimized' | 'maximized' | 'fullscreen';
    type?: 'normal' | 'popup' | 'panel';
  }): Promise<any> { // Should be chrome.windows.Window
    const { url, left, top, width, height, focused, type, state } = createData;

    const win = new BrowserWindow({
      x: left,
      y: top,
      width: width || 800,
      height: height || 600,
      show: false, // Show after content is loaded
      frame: type !== 'popup', // Popups usually don't have frames
      webPreferences: {
        // Extensions need nodeIntegration and contextIsolation to be carefully managed.
        // For a popup, we might need to preload a script that provides chrome.* APIs.
        nodeIntegration: false,
        contextIsolation: true,
        // preload: path.join(__dirname, 'preload.js') // A specific preload for extension popups
      },
    });

    const windowId = win.id;
    windows.set(windowId, win);
    nextWindowId = Math.max(nextWindowId, windowId + 1);

    win.on('closed', () => {
      windows.delete(windowId);
      // TODO: emit onRemoved event
    });
    
    win.on('focus', () => {
        // TODO: emit onFocusChanged event
    });

    if (url) {
      const urls = Array.isArray(url) ? url : [url];
      // The browser logic should handle opening URLs in a new window.
      // This is a placeholder for that logic.
      if (urls.length > 0) {
        win.loadURL(urls[0]);
      }
    }

    if (state) {
        if (state === 'maximized') win.maximize();
        if (state === 'minimized') win.minimize();
        if (state === 'fullscreen') win.setFullScreen(true);
    }

    if (focused) {
      win.focus();
    }
    win.show();

    return this.get(windowId, { populate: true });
  }

  async update(
    windowId: number,
    updateInfo: {
      left?: number;
      top?: number;
      width?: number;
      height?: number;
      focused?: boolean;
      state?: 'normal' | 'minimized' | 'maximized' | 'fullscreen';
    }
  ): Promise<any> {
    const win = windows.get(windowId);
    if (!win) {
      throw new Error(`Window with id ${windowId} not found.`);
    }

    if (updateInfo.left !== undefined || updateInfo.top !== undefined || updateInfo.width !== undefined || updateInfo.height !== undefined) {
        const bounds = win.getBounds();
        win.setBounds({
            x: updateInfo.left ?? bounds.x,
            y: updateInfo.top ?? bounds.y,
            width: updateInfo.width ?? bounds.width,
            height: updateInfo.height ?? bounds.height,
        });
    }

    if (updateInfo.state) {
        if (updateInfo.state === 'maximized') win.maximize();
        if (updateInfo.state === 'minimized') win.minimize();
        if (updateInfo.state === 'fullscreen') win.setFullScreen(true);
        if (updateInfo.state === 'normal') {
            if (win.isMaximized()) win.unmaximize();
            if (win.isMinimized()) win.restore();
            if (win.isFullScreen()) win.setFullScreen(false);
        }
    }
    
    if (updateInfo.focused) {
        win.focus();
    }

    return this.get(windowId);
  }

  async remove(windowId: number): Promise<void> {
    const win = windows.get(windowId);
    if (win) {
      win.close();
    }
  }

  async get(windowId: number, getInfo?: { populate?: boolean }): Promise<any> {
    const win = windows.get(windowId);
    if (!win) {
      throw new Error(`Window with id ${windowId} not found.`);
    }
    const bounds = win.getBounds();
    const tabs = getInfo?.populate ? await getTabsForWindow(windowId) : undefined;

    return {
      id: windowId,
      focused: win.isFocused(),
      left: bounds.x,
      top: bounds.y,
      width: bounds.width,
      height: bounds.height,
      state: win.isMaximized() ? 'maximized' : win.isMinimized() ? 'minimized' : win.isFullScreen() ? 'fullscreen' : 'normal',
      type: 'normal', // TODO: distinguish between normal/popup/panel
      tabs,
    };
  }

  async getCurrent(getInfo?: { populate?: boolean }): Promise<any> {
    const win = BrowserWindow.getFocusedWindow();
    if (!win) {
        // As per chrome docs, if no window is focused, the one most recently focused is returned.
        // We don't track that yet, so we'll just throw. A better implementation would track last focused.
        throw new Error("No focused window");
    }
    return this.get(win.id, getInfo);
  }

  async getLastFocused(getInfo?: { populate?: boolean }): Promise<any> {
    // This requires tracking window focus events.
    // For now, it's the same as getCurrent.
    return this.getCurrent(getInfo);
  }

  async getAll(getInfo?: { populate?: boolean }): Promise<any[]> {
    const allWindows = BrowserWindow.getAllWindows();
    return Promise.all(allWindows.map(win => this.get(win.id, getInfo)));
  }
}