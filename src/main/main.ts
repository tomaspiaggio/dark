/* eslint global-require: off, no-console: off, promise/always-return: off */

/**
 * This module executes inside of electron's main process. You can start
 * electron renderer process from here and communicate with the other processes
 * through IPC.
 *
 * When running `npm run build` or `npm run build:main`, this file is compiled to
 * `./src/main.js` using webpack. This gives us some performance wins.
 */
import {
  app,
  BaseWindow,
  BrowserWindow,
  ipcMain,
  Menu,
  shell,
  WebContentsView,
} from "electron";
import log from "electron-log";
import { autoUpdater } from "electron-updater";
import path from "path";
import { resolveHtmlPath } from "./util";
import { DataStore } from "./controller/store";
import contextMenu from 'electron-context-menu';

class AppUpdater {
  constructor() {
    log.transports.file.level = "info";
    autoUpdater.logger = log;
    autoUpdater.checkForUpdatesAndNotify();
  }
}

// Tab data structure with ordering and history
type TabData = {
  id: string;
  url: string;
  title: string;
  active: boolean;
  order: number;
  customTitle?: string; // For user-renamed tabs
  historyIndex: number; // New: for tracking tab selection history
  thumbnail?: string; // New: base64 screenshot for preview
};

let baseWindow: BaseWindow | null = null;
let tabViews = new Map<string, WebContentsView>();
let tabsData = new Map<string, TabData>(); // New: Backend tab data storage
let activeTabId: string | null = null;
let sidebarView: WebContentsView | null = null;
let overlayWindow: BrowserWindow | null = null;
let isOverlayVisible = false;
let tabCounter = 0;
let historyCounter = 0; // New: for tracking tab selection order
let isSidebarOpen = true; // New: track sidebar visibility state

// Tab switcher state
let switcherWindow: BrowserWindow | null = null;
let isSwitcherVisible = false;
let switcherSelectedIndex = 0;
let switcherTabs: TabData[] = [];
let isControlPressed = false; // Track Control key state

// Add find overlay state variables after other state variables (around line 60)
let findWindow: BrowserWindow | null = null;
let isFindVisible = false;

const INITIAL_WIDTH = 1600;
const INITIAL_HEIGHT = 1000;
const INITIAL_SIDEBAR_WIDTH = 300;

// Helper function to generate unique tab IDs
const generateTabId = (): string => {
  tabCounter++;
  return `tab_${tabCounter}_${Date.now()}`;
};

// Helper function to get tabs in order
const getOrderedTabs = (): TabData[] => {
  return Array.from(tabsData.values()).sort((a, b) => a.order - b.order);
};

// Helper function to update tab data and notify frontend
const updateTabData = (tabId: string, updates: Partial<TabData>) => {
  const existingTab = tabsData.get(tabId);
  if (existingTab) {
    tabsData.set(tabId, { ...existingTab, ...updates });
    sendTabsUpdate();
  }
};

// New: Helper function to update tab history when switching
const updateTabHistory = (tabId: string) => {
  const tabData = tabsData.get(tabId);
  if (tabData) {
    historyCounter++;
    updateTabData(tabId, { historyIndex: historyCounter });
  }
};

// New: Helper function to get the most recently used tab (excluding current)
const getMostRecentTab = (excludeTabId?: string): string | null => {
  const tabs = Array.from(tabsData.values())
    .filter((tab) => excludeTabId ? tab.id !== excludeTabId : true)
    .sort((a, b) => b.historyIndex - a.historyIndex);

  return tabs.length > 0 ? tabs[0].id : null;
};

// New: Helper function to close the active tab
const closeActiveTab = () => {
  if (!activeTabId) return;

  console.log("closing active tab", activeTabId);

  const tabView = tabViews.get(activeTabId);
  if (!tabView) {
    console.warn("Active tab not found:", activeTabId);
    return;
  }

  const closingTabId = activeTabId;

  // Remove the tab view from the base window
  baseWindow?.contentView.removeChildView(tabView);

  // Clean up the tab view and data
  tabViews.delete(closingTabId);
  tabsData.delete(closingTabId);

  // Find the most recently used tab to switch to
  const nextTabId = getMostRecentTab(closingTabId);

  if (nextTabId && tabViews.has(nextTabId)) {
    // Switch to the most recently used tab
    switchToTab(nextTabId);
  } else {
    // No tabs left, create a new one
    const { id: newTabId } = createTabView(
      "https://google.com",
    );
    switchToTab(newTabId);
  }

  // Update tabs in frontend
  sendTabsUpdate();
};

// Function to set up Control key monitoring for a tab view
const setupControlKeyMonitoring = (tabView: WebContentsView) => {
  tabView.webContents.on("before-input-event", (event, input) => {
    if (input.key.toLowerCase() === "control") {
      if (input.type === "keyDown") {
        isControlPressed = true;
      } else if (input.type === "keyUp") {
        isControlPressed = false;
        // Close switcher when Control is released
        if (isSwitcherVisible) {
          hideSwitcherAndSwitch();
        }
      }
    } else if (
      input.key.toLowerCase() === "tab" && input.type === "keyDown" &&
      isControlPressed
    ) {
      // Handle Tab key press while Control is held down
      event.preventDefault();
      if (input.shift) {
        // Control+Shift+Tab - navigate to previous tab
        if (!isSwitcherVisible) {
          showTabSwitcher();
        } else {
          navigateSwitcher("prev");
        }
      } else {
        // Control+Tab - navigate to next tab
        if (!isSwitcherVisible) {
          showTabSwitcher();
        } else {
          navigateSwitcher("next");
        }
      }
    }
  });
};

// New: Helper function to get current sidebar width
const getCurrentSidebarWidth = (): number => {
  return isSidebarOpen ? INITIAL_SIDEBAR_WIDTH : 0;
};

// New: Function to toggle sidebar visibility
const toggleSidebar = () => {
  if (!baseWindow || !sidebarView) return;

  isSidebarOpen = !isSidebarOpen;
  const [width, height] = baseWindow.getSize();
  const targetSidebarWidth = getCurrentSidebarWidth();

  let initial = performance.now();

  const loop = () => {
    const now = performance.now();
    const elapsed = now - initial;
    const progress = Math.min(elapsed / 100, 1);
    const currentWidth = Math.floor(
      targetSidebarWidth * progress +
        (isSidebarOpen ? 0 : INITIAL_SIDEBAR_WIDTH * (1 - progress)),
    );

    // Update all tab view bounds
    tabViews.forEach((tabView) => {
      tabView.setBounds({
        x: currentWidth,
        y: 0,
        width: width - (currentWidth - 50),
        height: height,
      });
    });

    // Update sidebar bounds
    sidebarView?.setBounds({
      x: 0,
      y: 0,
      width: (currentWidth + 50),
      height: height,
    });

    if (progress >= 0.95) { // Removed the && isSidebarOpen condition
      // Final positioning
      sidebarView?.setBounds({
        x: 0,
        y: 0,
        width: targetSidebarWidth,
        height: height,
      });

      // Update all tab view bounds
      tabViews.forEach((tabView) => {
        tabView.setBounds({
          x: targetSidebarWidth,
          y: 0,
          width: width - targetSidebarWidth,
          height: height,
        });
      });

      // Set visibility after animation completes
      sidebarView?.setVisible(isSidebarOpen);
    } else {
      setImmediate(loop);
    }
  };

  // Start the animation - but handle initial visibility for opening
  if (isSidebarOpen) {
    sidebarView?.setVisible(true); // Show immediately when opening
  }

  setImmediate(loop);
};

// Add helper function to get current window dimensions
const getCurrentWindowSize = (): { width: number; height: number } => {
  if (!baseWindow) {
    return { width: INITIAL_WIDTH, height: INITIAL_HEIGHT };
  }
  const [width, height] = baseWindow.getSize();
  return { width, height };
};

// Update the createTabView function to use current window size
const createTabView = (url?: string): { id: string; view: WebContentsView } => {
  const id = generateTabId();
  const view = new WebContentsView();
  view.webContents.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');

  const sidebarWidth = getCurrentSidebarWidth();
  const { width, height } = getCurrentWindowSize();
  
  view.setBounds({
    x: sidebarWidth,
    y: 0,
    width: width - sidebarWidth,
    height: height,
  });

  // Create tab data entry with history
  const tabData: TabData = {
    id,
    url: url || "",
    title: "",
    active: false,
    order: tabsData.size,
    historyIndex: 0,
  };
  tabsData.set(id, tabData);

  // Set up context menu for this tab
  contextMenu({
    window: view.webContents,
    showInspectElement: true,
    showCopyImageAddress: true,
    showSaveImageAs: true,
    prepend: (defaultActions, params) => [
      {
        label: `Search Google for "${params.selectionText}"`,
        visible: params.selectionText && params.selectionText.trim().length > 0,
        click: () => {
          shell.openExternal(
            `https://www.google.com/search?q=${encodeURIComponent(params.selectionText.trim())}`
          );
        }
      },
      {
        label: `Open "${params.linkURL}" in New Tab`,
        visible: !!params.linkURL,
        click: () => {
          const { id: newTabId } = createTabView(params.linkURL);
          switchToTab(newTabId);
          sendTabsUpdate();
        }
      },
      {
        label: 'Copy Link Address',
        visible: !!params.linkURL,
        click: () => {
          require('electron').clipboard.writeText(params.linkURL);
        }
      },
      {
        type: 'separator',
        visible: (params.selectionText && params.selectionText.trim().length > 0) || !!params.linkURL
      },
      {
        label: 'Back',
        enabled: view.webContents.navigationHistory.canGoBack(),
        click: () => {
          view.webContents.navigationHistory.goBack();
        }
      },
      {
        label: 'Forward',
        enabled: view.webContents.navigationHistory.canGoForward(),  
        click: () => {
          view.webContents.navigationHistory.goForward();
        }
      },
      {
        label: 'Reload',
        click: () => {
          view.webContents.reload();
        }
      },
      {
        type: 'separator'
      }
    ],
    append: (defaultActions, params) => [
      {
        type: 'separator'
      },
      {
        label: 'View Page Source',
        click: () => {
          // Create a new tab with view-source: prefix
          const sourceUrl = `view-source:${view.webContents.getURL()}`;
          const { id: newTabId } = createTabView(sourceUrl);
          switchToTab(newTabId);
          sendTabsUpdate();
        }
      }
    ]
  });

  // Helper function to check if URL is Chrome Web Store
  const isChromeWebStore = (url: string): boolean => {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname === 'chromewebstore.google.com' || 
             urlObj.hostname === 'chrome.google.com';
    } catch {
      return false;
    }
  };

  // Inject browser fingerprinting avoidance and extensions API very early
  view.webContents.on("did-start-loading", () => {
    const currentUrl = view.webContents.getURL();
    
    // Always inject browser fingerprinting avoidance code
    view.webContents.executeJavaScript(`
      // Browser fingerprinting avoidance
      (() => {
        // 1) navigator.vendor / platform
        Object.defineProperty(navigator, 'vendor', {
          get: () => 'Google Inc.'
        });
        Object.defineProperty(navigator, 'platform', {
          get: () => 'MacIntel'  // Using MacIntel since you're on macOS
        });

        // 2) window.chrome stub
        window.chrome = window.chrome || {};
        window.chrome.runtime = window.chrome.runtime || { 
          onMessage: { addListener: () => {} } 
        };

        // 3) Fake plugins
        Object.defineProperty(navigator, 'plugins', {
          get: () => [
            { name: 'Chrome PDF Plugin' }, 
            { name: 'Chrome PDF Viewer' },
            { name: 'Native Client' }
          ]
        });

        // 4) UA Client Hints
        if (navigator.userAgentData) {
          navigator.userAgentData.brands = [
            { brand: 'Chromium', version: '124' },
            { brand: 'Google Chrome', version: '124' }
          ];
          navigator.userAgentData.mobile = false;
        }
      })();
    `).catch(console.error);
    
    // Additionally inject Chrome Web Store API if on Chrome Web Store
    if (isChromeWebStore(currentUrl)) {
      console.log('Injecting Chrome webstore API for:', currentUrl);
      
      view.webContents.executeJavaScript(`
        // Chrome webstore API for extension installation
        (() => {
          if (typeof window !== 'undefined') {
            window.chrome = window.chrome || {};
            window.chrome.webstore = window.chrome.webstore || {
              install: async function(url, onSuccess, onFailure) {
                try {
                  console.log('Chrome webstore install called with:', url);
                  // Send request to main process
                  const result = await window.electron?.ipcRenderer.invoke('extensions.install', { url });
                  console.log('Extension install result:', result);
                  if (result && result.success) {
                    if (onSuccess) onSuccess();
                  } else {
                    if (onFailure) onFailure(result?.error || 'Installation failed');
                  }
                } catch (error) {
                  console.error('Extension install error:', error);
                  if (onFailure) onFailure(error);
                }
              }
            };
            
            console.log('Chrome webstore API injected');
          }
        })();
      `).catch(console.error);
    }
  });

  // Also inject on URL changes (navigation)
  view.webContents.on("did-navigate", (event, navigationUrl) => {
    updateTabData(id, { url: navigationUrl });
    
    // Always inject browser fingerprinting avoidance code
    view.webContents.executeJavaScript(`
      // Browser fingerprinting avoidance
      (() => {
        // 1) navigator.vendor / platform
        Object.defineProperty(navigator, 'vendor', {
          get: () => 'Google Inc.'
        });
        Object.defineProperty(navigator, 'platform', {
          get: () => 'MacIntel'
        });

        // 2) window.chrome stub
        window.chrome = window.chrome || {};
        window.chrome.runtime = window.chrome.runtime || { 
          onMessage: { addListener: () => {} } 
        };

        // 3) Fake plugins
        Object.defineProperty(navigator, 'plugins', {
          get: () => [
            { name: 'Chrome PDF Plugin' }, 
            { name: 'Chrome PDF Viewer' },
            { name: 'Native Client' }
          ]
        });

        // 4) UA Client Hints
        if (navigator.userAgentData) {
          navigator.userAgentData.brands = [
            { brand: 'Chromium', version: '124' },
            { brand: 'Google Chrome', version: '124' }
          ];
          navigator.userAgentData.mobile = false;
        }
      })();
    `).catch(console.error);
    
    // Additionally inject Chrome Web Store API if navigating to Chrome Web Store
    if (isChromeWebStore(navigationUrl)) {
      console.log('Re-injecting Chrome webstore API after navigation to:', navigationUrl);
      
      view.webContents.executeJavaScript(`
        // Chrome webstore API for extension installation
        (() => {
          if (typeof window !== 'undefined' && !window.chrome?.webstore?.install) {
            window.chrome = window.chrome || {};
            window.chrome.webstore = window.chrome.webstore || {
              install: async function(url, onSuccess, onFailure) {
                try {
                  console.log('Chrome webstore install called with:', url);
                  const result = await window.electron?.ipcRenderer.invoke('extensions.install', { url });
                  console.log('Extension install result:', result);
                  if (result && result.success) {
                    if (onSuccess) onSuccess();
                  } else {
                    if (onFailure) onFailure(result?.error || 'Installation failed');
                  }
                } catch (error) {
                  console.error('Extension install error:', error);
                  if (onFailure) onFailure(error);
                }
              }
            };
            
            console.log('Chrome webstore API re-injected after navigation');
          }
        })();
      `).catch(console.error);
    }
  });

  if (url) {
    view.webContents.loadURL(url);
  }

  // Listen for title changes
  view.webContents.on("page-title-updated", (event, title) => {
    updateTabData(id, { title });
  });

  // Set up window open handler for new tabs
  view.webContents.setWindowOpenHandler((edata) => {
    shell.openExternal(edata.url);
    return { action: "deny" };
  });

  // Set up Control key monitoring for this tab
  setupControlKeyMonitoring(view);

  tabViews.set(id, view);
  baseWindow?.contentView.addChildView(view);

  return { id, view };
};

// New: Helper function to capture tab thumbnail
const captureTabThumbnail = async (tabId: string): Promise<string | null> => {
  const tabView = tabViews.get(tabId);
  if (!tabView || !tabView.webContents) return null;

  try {
    // Capture screenshot with smaller dimensions for thumbnail
    const image = await tabView.webContents.capturePage({
      x: 0,
      y: 0,
      width: 320, // Small thumbnail width
      height: 180, // Small thumbnail height (16:9 aspect ratio)
    });

    // Convert to base64 with JPEG compression for smaller file size
    const buffer = image.resize({ width: 320, height: 180 }).toJPEG(60);
    return `data:image/jpeg;base64,${buffer.toString("base64")}`;
  } catch (error) {
    console.warn(`Failed to capture thumbnail for tab ${tabId}:`, error);
    return null;
  }
};

// New: Helper function to clean up old thumbnails (keep only last 5)
const cleanupOldThumbnails = () => {
  const tabs = Array.from(tabsData.values())
    .sort((a, b) => b.historyIndex - a.historyIndex);

  // Keep thumbnails for top 5 most recent tabs only
  tabs.forEach((tab, index) => {
    if (index >= 5 && tab.thumbnail) {
      updateTabData(tab.id, { thumbnail: undefined });
    }
  });
};

// Update switchToTab to ensure proper sizing
const switchToTab = async (tabId: string) => {
  if (!tabViews.has(tabId)) return;

  // Close find overlay when switching tabs
  if (isFindVisible && findWindow) {
    isFindVisible = false;
    findWindow.hide();
    // Clear any active find
    const activeTabView = getActiveTabView();
    if (activeTabView) {
      activeTabView.webContents.stopFindInPage("clearSelection");
    }
  }

  // Capture thumbnail of current active tab before switching
  if (activeTabId && activeTabId !== tabId && tabViews.has(activeTabId)) {
    const thumbnail = await captureTabThumbnail(activeTabId);
    if (thumbnail) {
      updateTabData(activeTabId, { thumbnail });
      // Clean up old thumbnails after adding new one
      cleanupOldThumbnails();
    }
  }

  // Update history for the tab we're switching to
  updateTabHistory(tabId);

  // Update active status in tab data
  tabsData.forEach((tab, id) => {
    updateTabData(id, { active: id === tabId });
  });

  // Hide current active tab
  if (activeTabId && tabViews.has(activeTabId)) {
    const currentTab = tabViews.get(activeTabId);
    currentTab?.setVisible(false);
  }

  // Show the new active tab and ensure it's properly sized
  const newTab = tabViews.get(tabId);
  if (newTab) {
    // Update bounds to match current window size before showing
    const sidebarWidth = getCurrentSidebarWidth();
    const { width, height } = getCurrentWindowSize();
    
    newTab.setBounds({
      x: sidebarWidth,
      y: 0,
      width: width - sidebarWidth,
      height: height,
    });
    
    newTab.setVisible(true);
    activeTabId = tabId;
  }
};

// Helper function to get the active tab view
const getActiveTabView = (): WebContentsView | null => {
  if (!activeTabId || !tabViews.has(activeTabId)) return null;
  return tabViews.get(activeTabId) || null;
};

// Function to toggle overlay visibility (needs to be accessible globally)
let toggleOverlay: () => void;

// Function to toggle find overlay visibility (add after toggleOverlay declaration)
let toggleFind: () => void;

ipcMain.on("ipc-example", async (event, arg) => {
  const msgTemplate = (pingPong: string) => `IPC test: ${pingPong}`;
  console.log(msgTemplate(arg));
  event.reply("ipc-example", msgTemplate("pong"));
});

function fixRawUrl(url: string) {
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }
  return `https://${url}`;
}

// Create a helper function to safely send tabs data
const sendTabsUpdate = () => {
  const tabs = getOrderedTabs().map((tab) => ({
    id: tab.id,
    url: tab.url,
    title: tab.customTitle || tab.title,
    active: tab.active,
    icon: "", // You can implement favicon logic here
    thumbnail: tab.thumbnail, // Include thumbnail in tabs data
  }));

  DataStore.saveTabs(tabs);

  if (sidebarView?.webContents && !sidebarView.webContents.isDestroyed()) {
    console.log("Sending tabs.onChange to renderer");
    sidebarView.webContents.send("tabs.onChange", tabs);
  } else {
    console.warn(
      "Cannot send tabs update - sidebarView not ready or destroyed",
    );
  }
};

ipcMain.on("tabs.set", async (event, arg) => {
  console.log("setting tab to ", arg);
  const activeTab = getActiveTabView();
  if (activeTab) {
    activeTab.webContents.loadURL(fixRawUrl(arg));
  }
  const tabs = Array.from(tabViews.entries()).map(([id, view]) => ({
    url: view.webContents.getURL(),
    id,
    title: view.webContents.getTitle(),
    active: id === activeTabId,
  }));
  activeTab?.webContents.on("did-finish-load", () => {
    const tabs = Array.from(tabViews.entries()).map(([id, view]) => ({
      url: view.webContents.getURL(),
      id,
      title: view.webContents.getTitle(),
      active: id === activeTabId,
    }));
    console.log(
      "Sending tabs.onChange with data:",
      JSON.stringify(tabs, null, 2),
    );
    sendTabsUpdate();
  });
  console.log("about to emit tabs.onChange", tabs);
  console.log(
    "Sending tabs.onChange with data:",
    JSON.stringify(tabs, null, 2),
  );
  sendTabsUpdate();
  event.reply("tabs.set", arg);
});

ipcMain.on("tabs.open", async (event, arg) => {
  console.log("opening new tab with ", arg);
  const { id } = createTabView(fixRawUrl(arg));
  switchToTab(id);
  const activeTab = getActiveTabView();
  const tabs = Array.from(tabViews.entries()).map(([id, view]) => ({
    url: view.webContents.getURL(),
    id,
    title: view.webContents.getTitle(),
    active: id === activeTabId,
  }));
  activeTab?.webContents.on("did-finish-load", () => {
    const tabs = Array.from(tabViews.entries()).map(([id, view]) => ({
      url: view.webContents.getURL(),
      id,
      title: view.webContents.getTitle(),
      active: id === activeTabId,
    }));
    console.log(
      "Sending tabs.onChange with data:",
      JSON.stringify(tabs, null, 2),
    );
    sendTabsUpdate();
  });
  console.log("about to emit tabs.onChange", tabs);
  console.log(
    "Sending tabs.onChange with data:",
    JSON.stringify(tabs, null, 2),
  );
  sendTabsUpdate();
  event.reply("tabs.open", { tabId: id, url: fixRawUrl(arg) });
});

ipcMain.on("tabs.getAll", async (event, arg) => {
  console.log("getting all tabs");
  const tabs = Array.from(tabViews.entries()).map(([id, view]) => ({
    url: view.webContents.getURL(),
    id,
    title: view.webContents.getTitle(),
    active: id === activeTabId,
  }));
  event.reply("tabs.getAll", tabs);
});

ipcMain.on("popstate-history.pop", async (event, arg) => {
  const activeTab = getActiveTabView();
  activeTab?.webContents.navigationHistory.goBack();
  event.reply("popstate-history.pop", arg);
});

ipcMain.on("popstate-history.push", async (event, arg) => {
  const activeTab = getActiveTabView();
  activeTab?.webContents.navigationHistory.goForward();
  event.reply("popstate-history.push", arg);
});

ipcMain.on("popstate-history.refresh", async (event, arg) => {
  const activeTab = getActiveTabView();
  activeTab?.webContents.reload();
  event.reply("popstate-history.refresh", arg);
});

// New IPC handlers for tab management
ipcMain.on("tabs.navigateActive", async (event, url) => {
  console.log("navigating active tab to ", url);
  const activeTab = getActiveTabView();
  if (activeTab) {
    activeTab.webContents.loadURL(fixRawUrl(url));
  }
  event.reply("tabs.navigateActive", url);
});

ipcMain.on("tabs.rename", async (event, { tabId, newTitle }) => {
  console.log("renaming tab", tabId, "to", newTitle);
  updateTabData(tabId, { customTitle: newTitle });
  event.reply("tabs.rename", { tabId, newTitle });
});

ipcMain.on("tabs.reorder", async (event, { tabId, newIndex }) => {
  console.log("reordering tab", tabId, "to index", newIndex);

  const tabs = getOrderedTabs();
  const tabToMove = tabs.find((tab) => tab.id === tabId);

  if (tabToMove) {
    // Remove the tab from its current position
    const filteredTabs = tabs.filter((tab) => tab.id !== tabId);

    // Insert it at the new position
    filteredTabs.splice(newIndex, 0, tabToMove);

    // Update all order values
    filteredTabs.forEach((tab, index) => {
      updateTabData(tab.id, { order: index });
    });
  }

  event.reply("tabs.reorder", { tabId, newIndex });
});

// ... existing code ...

ipcMain.on("tabs.switch", async (event, tabId) => {
  console.log("switching to tab", tabId);
  switchToTab(tabId);
  event.reply("tabs.switch", tabId);
});

ipcMain.on("tabs.close", async (event, tabId) => {
  console.log("closing tab", tabId);

  const tabView = tabViews.get(tabId);
  if (!tabView) {
    console.warn("Tab not found:", tabId);
    event.reply("tabs.close", { error: "Tab not found" });
    return;
  }

  // Remove the tab view from the base window
  baseWindow?.contentView.removeChildView(tabView);

  // Clean up the tab view and data
  tabViews.delete(tabId);
  tabsData.delete(tabId);

  // If this was the active tab, switch to the most recently used tab
  if (activeTabId === tabId) {
    const nextTabId = getMostRecentTab(tabId);

    if (nextTabId && tabViews.has(nextTabId)) {
      // Switch to the most recently used tab
      switchToTab(nextTabId);
    } else {
      // No tabs left, create a new one
      const { id: newTabId } = createTabView(
        "https://google.com",
      );
      switchToTab(newTabId);
    }
  }

  // Update tabs in frontend
  sendTabsUpdate();

  event.reply("tabs.close", { tabId });
});

// Helper function to get tabs sorted by history (most recent first)
const getTabsByHistory = (): TabData[] => {
  return Array.from(tabsData.values())
    .sort((a, b) => b.historyIndex - a.historyIndex);
};

// Helper function to show tab switcher
const showTabSwitcher = () => {
  if (!switcherWindow) return;

  // Get tabs sorted by history (most recent first)
  switcherTabs = getTabsByHistory();

  if (switcherTabs.length <= 1) return; // No point showing switcher with 1 or 0 tabs

  // Start with index 1 (second most recent tab)
  switcherSelectedIndex = 1;

  isSwitcherVisible = true;
  switcherWindow.show();
  switcherWindow.focus();

  // Send initial data to switcher
  sendSwitcherUpdate();

  // Set up a timer to periodically check if Control is still pressed
  // This is a more reliable fallback than relying on event handlers
  const controlKeyChecker = setInterval(() => {
    if (isSwitcherVisible) {
      if (!isControlPressed) {
        clearInterval(controlKeyChecker);
        hideSwitcherAndSwitch();
      }
    } else {
      clearInterval(controlKeyChecker);
    }
  }, 50); // Check every 100ms for better reliability

  // Store the interval so we can clear it if needed
  (switcherWindow as any).controlKeyChecker = controlKeyChecker;
};

// Helper function to hide tab switcher
const hideSwitcherAndSwitch = () => {
  console.log(
    "hiding switcher and switching to tab",
    switcherTabs[switcherSelectedIndex].id,
  );
  if (!isSwitcherVisible || !switcherWindow) return;

  // Clear the control key checker interval if it exists
  if ((switcherWindow as any).controlKeyChecker) {
    clearInterval((switcherWindow as any).controlKeyChecker);
    (switcherWindow as any).controlKeyChecker = null;
  }

  isSwitcherVisible = false;
  // Don't reset isControlPressed here - let the key events handle it
  switcherWindow.hide();

  // Switch to selected tab
  if (switcherTabs[switcherSelectedIndex]) {
    switchToTab(switcherTabs[switcherSelectedIndex].id);
  }
};

// Helper function to navigate switcher
const navigateSwitcher = (direction: "next" | "prev") => {
  if (!isSwitcherVisible || switcherTabs.length === 0) return;

  if (direction === "next") {
    switcherSelectedIndex = (switcherSelectedIndex + 1) % switcherTabs.length;
  } else {
    switcherSelectedIndex = (switcherSelectedIndex - 1 + switcherTabs.length) %
      switcherTabs.length;
  }

  sendSwitcherUpdate();
};

// Helper function to send switcher data to renderer
const sendSwitcherUpdate = () => {
  if (
    !switcherWindow?.webContents || switcherWindow.webContents.isDestroyed()
  ) return;

  const switcherData = switcherTabs.map((tab, index) => ({
    id: tab.id,
    url: tab.url,
    title: tab.customTitle || tab.title || "Untitled",
    active: index === switcherSelectedIndex,
    thumbnail: tab.thumbnail || "",
    icon: "", // You can implement favicon logic here
  }));

  switcherWindow.webContents.send("switcher.update", {
    tabs: switcherData,
    selectedIndex: switcherSelectedIndex,
    isVisible: isSwitcherVisible,
  });
};

if (process.env.NODE_ENV === "production") {
  const sourceMapSupport = require("source-map-support");
  sourceMapSupport.install();
}

const isDebug = process.env.NODE_ENV === "development" ||
  process.env.DEBUG_PROD === "true";

if (isDebug) {
  require("electron-debug").default();
}

const installExtensions = async () => {
  const installer = require("electron-devtools-installer");
  const forceDownload = !!process.env.UPGRADE_EXTENSIONS;
  const extensions = ["REACT_DEVELOPER_TOOLS"];

  return installer
    .default(
      extensions.map((name) => installer[name]),
      forceDownload,
    )
    .catch(console.log);
};

const createWindow = async () => {
  if (isDebug) {
    await installExtensions();
  }

  const RESOURCES_PATH = app.isPackaged
    ? path.join(process.resourcesPath, "assets")
    : path.join(__dirname, "../../assets");

  const getAssetPath = (...paths: string[]): string => {
    return path.join(RESOURCES_PATH, ...paths);
  };

  baseWindow = new BaseWindow({
    show: false,
    width: 1600,
    height: 1000,
    icon: getAssetPath("icon.png"),
    frame: false,
  });

  baseWindow.setTitle("Dark");

  // Set up application menu with all keyboard shortcuts
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: "Application",
      submenu: [
        {
          label: "New Tab",
          accelerator: "CommandOrControl+T",
          click: () => {
            if (toggleOverlay) toggleOverlay();
          },
        },
        {
          label: "Close Tab",
          accelerator: "CommandOrControl+W",
          click: () => {
            closeActiveTab();
          },
        },
        {
          label: "Toggle Sidebar",
          accelerator: "CommandOrControl+S",
          click: () => {
            toggleSidebar();
          },
        },
        {
          label: "Next Tab",
          accelerator: "Control+Tab",
          click: () => {
            isControlPressed = true;
            if (!isSwitcherVisible) {
              showTabSwitcher();
            } else {
              navigateSwitcher("next");
            }
          },
        },
        {
          label: "Previous Tab",
          accelerator: "Control+Shift+Tab",
          click: () => {
            isControlPressed = true;
            if (!isSwitcherVisible) {
              showTabSwitcher();
            } else {
              navigateSwitcher("prev");
            }
          },
        },
        {
          label: "Back",
          accelerator: "CommandOrControl+Left",
          click: () => {
            const activeTab = getActiveTabView();
            if (activeTab?.webContents && activeTab.webContents.navigationHistory.canGoBack()) {
              activeTab.webContents.navigationHistory.goBack();
            }
          },
        },
        {
          label: "Back",
          accelerator: "CommandOrControl+[",
          click: () => {
            const activeTab = getActiveTabView();
            if (activeTab?.webContents && activeTab.webContents.navigationHistory.canGoBack()) {
              activeTab.webContents.navigationHistory.goBack();
            }
          },
        },
        {
          label: "Forward",
          accelerator: "CommandOrControl+Right",
          click: () => {
            const activeTab = getActiveTabView();
            if (activeTab?.webContents && activeTab.webContents.navigationHistory.canGoForward()) {
              activeTab.webContents.navigationHistory.goForward();
            }
          },
        },
        {
          label: "Forward",
          accelerator: "CommandOrControl+]",
          click: () => {
            const activeTab = getActiveTabView();
            if (activeTab?.webContents && activeTab.webContents.navigationHistory.canGoForward()) {
              activeTab.webContents.navigationHistory.goForward();
            }
          },
        },
        { type: "separator" },
        {
          label: "Quit",
          accelerator: "CommandOrControl+Q",
          click: () => {
            app.quit();
          },
        },
      ],
    },
    {
      label: "File",
      role: "fileMenu",
    },
    {
      label: "Edit",
      role: "editMenu",
      submenu: [
        {
          role: "cut",
        },
        {
          role: "copy",
        },
        {
          role: "paste",
        },
        {
          role: "selectAll",
        },
        {
          role: "delete",
        },
        {
          role: "undo",
        },
        {
          role: "redo",
        },
        {
          role: "pasteAndMatchStyle",
        },
        {
          label: "Find in Page",
          accelerator: "CommandOrControl+F",
          click: () => {
            if (toggleFind) toggleFind();
          },
        },
      ],
    },
    {
      label: "View",
      role: "viewMenu",
    },
    {
      label: "Window",
      role: "windowMenu",
    },
    {
      label: "Share",
      role: "shareMenu",
    },
    {
      label: "Help",
      role: "help",
    },
    // {
    //   label: "View",
    //   submenu: [
    //     { role: "toggleDevTools" },
    //     { role: "zoom" },
    //     { role: "resetZoom" },
    //     { role: "zoomIn" },
    //     { role: "zoomOut" },
    //     { role: "togglefullscreen" },
    //     { role: "window" },
    //     { role: "minimize" },
    //     { role: "close" },
    //     { role: "hide" },
    //     { role: "hideOthers" },
    //     { role: "unhide" },
    //     { role: "quit" },
    //   ],
    // },
    {
      label: "Tools",
      submenu: [
        { role: "toggleDevTools" },
        {
          label: "Open Dev Tools",
          accelerator: "CommandOrControl+Option+I",
          click: (item, focusedWindow, event) => {
            const activeTab = getActiveTabView();
            if (activeTab?.webContents) {
              activeTab.webContents.toggleDevTools();
            } else {
              console.log("No active tab");
            }
          },
        },
        {
          role: "reload",
          accelerator: "CommandOrControl+R",
          click: () => {
            const activeTab = getActiveTabView();
            if (activeTab?.webContents) {
              activeTab.webContents.reload();
            }
          },
        },
        {
          role: "forceReload",
          accelerator: "CommandOrControl+Shift+R",
          click: () => {
            const activeTab = getActiveTabView();
            if (activeTab?.webContents) {
              activeTab.webContents.reloadIgnoringCache();
            }
          },
        },
        { role: "toggleSpellChecker" },
        { role: "showSubstitutions" },
        { role: "toggleSmartQuotes" },
        { role: "toggleSmartDashes" },
        { role: "toggleTextReplacement" },
        { role: "startSpeaking" },
        { role: "stopSpeaking" },
      ],
    },
    {
      label: "Help",
      submenu: [
        { role: "help" },
        { role: "about" },
        { role: "services" },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);

  sidebarView = new WebContentsView({
    webPreferences: {
      preload: app.isPackaged
        ? path.join(__dirname, "preload.js")
        : path.join(__dirname, "../../.erb/dll/preload.js"),
    },
  });

  sidebarView.setBounds({
    x: 0,
    y: 0,
    width: INITIAL_SIDEBAR_WIDTH,
    height: INITIAL_HEIGHT,
  });

  sidebarView.webContents.loadURL(resolveHtmlPath("/"));
  // Remove or comment out the automatic DevTools opening:
  setTimeout(() => {
    sidebarView?.webContents.openDevTools({
      mode: "detach",
    });
  }, 1000);

  // Create initial tab instead of single mainView
  const { id: initialTabId } = createTabView("https://google.com");
  switchToTab(initialTabId);

  // Create modal overlay window instead of WebContentsView
  const overlayWidth = 600;
  const overlayHeight = 328;

  const spaces = DataStore.getSpaces();
  if (spaces.length === 0) {
    const defaultSpace = DataStore.addSpace({
      name: "default",
      color: "#3b82f6",
    });
    DataStore.setActiveSpaceId(defaultSpace.id);
  }
  const activeSpaceId = DataStore.getActiveSpaceId();
  const activeSpace = spaces.find((space) => space.id === activeSpaceId);

  console.log("activeSpace", activeSpace);

  // const tabs = DataStore.getTabsForSpace(activeSpaceId);
  // console.log("tabs", tabs);

  // tabs.forEach((tab) => {
  //   // TODO: support custom title
  //   const { id, url, title, customTitle } = tab;
  //   const tabView = createTabView(url);
  //   tabViews.set(id, tabView.view);
  //   baseWindow?.contentView.addChildView(tabView.view);
  // });

  // if (tabs.length === 0) {
  //   // Create initial tab instead of single mainView
  //   const { id: initialTabId } = createTabView(
  //     "https://kzmo4l6a1wwtjqq6q0rw.lite.vusercontent.net/",
  //   );
  //   switchToTab(initialTabId);
  // }

  overlayWindow = new BrowserWindow({
    parent: baseWindow,
    modal: true,
    show: false,
    width: overlayWidth,
    height: overlayHeight,
    resizable: false,
    frame: false,
    transparent: true,
    // TODO: add traffic lights
    // titleBarStyle: 'hiddenInset',
    // trafficLightPosition: {
    //   x: 10,
    //   y: 10,
    // },
    webPreferences: {
      partition: `persist:${activeSpace?.id}`,
      preload: app.isPackaged
        ? path.join(__dirname, "preload.js")
        : path.join(__dirname, "../../.erb/dll/preload.js"),
    },
  });

  overlayWindow.loadURL(`${resolveHtmlPath("/change-tab")}`);

  // Create tab switcher window
  const switcherWidth = 800;
  const switcherHeight = 148;

  switcherWindow = new BrowserWindow({
    parent: baseWindow,
    modal: false,
    show: false,
    width: switcherWidth,
    height: switcherHeight,
    resizable: false,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    webPreferences: {
      preload: app.isPackaged
        ? path.join(__dirname, "preload.js")
        : path.join(__dirname, "../../.erb/dll/preload.js"),
    },
  });

  switcherWindow.loadURL(`${resolveHtmlPath("/switcher")}`);

  baseWindow.contentView.addChildView(sidebarView);

  // switcherWindow.show();

  // Function to toggle overlay visibility
  toggleOverlay = () => {
    if (!overlayWindow) return;

    isOverlayVisible = !isOverlayVisible;

    if (isOverlayVisible) {
      overlayWindow.show();
      overlayWindow.focus();
    } else {
      overlayWindow.hide();
    }
  };

  // Monitor Control key state using before-input-event on the switcher window
  switcherWindow.webContents.on("before-input-event", (event, input) => {
    if (input.key.toLowerCase() === "control") {
      if (input.type === "keyDown") {
        isControlPressed = true;
      } else if (input.type === "keyUp") {
        isControlPressed = false;
        // Close switcher when Control is released
        if (isSwitcherVisible) {
          hideSwitcherAndSwitch();
        }
      }
    } else if (
      input.key.toLowerCase() === "tab" && input.type === "keyDown" &&
      isControlPressed
    ) {
      // Handle Tab key press while Control is held down
      event.preventDefault();
      if (input.shift) {
        // Control+Shift+Tab - navigate to previous tab
        if (!isSwitcherVisible) {
          showTabSwitcher();
        } else {
          navigateSwitcher("prev");
        }
      } else {
        // Control+Tab - navigate to next tab
        if (!isSwitcherVisible) {
          showTabSwitcher();
        } else {
          navigateSwitcher("next");
        }
      }
    }
  });

  // Remove the baseWindow.webContents monitoring - BaseWindow doesn't have webContents
  // The existing monitors on tab views and sidebar should handle key events

  // Monitor on the sidebar view as well
  sidebarView.webContents.on("before-input-event", (event, input) => {
    if (input.key.toLowerCase() === "control") {
      if (input.type === "keyDown") {
        isControlPressed = true;
      } else if (input.type === "keyUp") {
        isControlPressed = false;
        // Close switcher when Control is released
        if (isSwitcherVisible) {
          hideSwitcherAndSwitch();
        }
      }
    } else if (
      input.key.toLowerCase() === "tab" && input.type === "keyDown" &&
      isControlPressed
    ) {
      // Handle Tab key press while Control is held down
      event.preventDefault();
      if (input.shift) {
        // Control+Shift+Tab - navigate to previous tab
        if (!isSwitcherVisible) {
          showTabSwitcher();
        } else {
          navigateSwitcher("prev");
        }
      } else {
        // Control+Tab - navigate to next tab
        if (!isSwitcherVisible) {
          showTabSwitcher();
        } else {
          navigateSwitcher("next");
        }
      }
    }
  });

  ipcMain.on("spotlight.toggle", async (event, arg) => {
    toggleOverlay();
    event.reply("spotlight.toggle", arg);
  });

  // Function to hide overlay
  const hideOverlay = () => {
    if (!overlayWindow || !isOverlayVisible) return;

    isOverlayVisible = false;
    overlayWindow.hide();
  };

  // Handle overlay window events
  overlayWindow.webContents.on("before-input-event", (event, input) => {
    if (input.key === "Escape") {
      hideOverlay();
    } else if (input.key.toLowerCase() === "control") {
      if (input.type === "keyDown") {
        isControlPressed = true;
      } else if (input.type === "keyUp") {
        isControlPressed = false;
        // Close switcher when Control is released
        if (isSwitcherVisible) {
          hideSwitcherAndSwitch();
        }
      }
    }
  });

  overlayWindow.on("blur", () => {
    hideOverlay();
  });

  // Add resize event handler
  baseWindow.on("resize", () => {
    if (!baseWindow || !sidebarView) return;

    const [width, height] = baseWindow.getSize();
    const sidebarWidth = getCurrentSidebarWidth();

    // Update sidebar bounds
    sidebarView.setBounds({
      x: 0,
      y: 0,
      width: sidebarWidth,
      height: height,
    });

    // Update all tab view bounds
    tabViews.forEach((tabView) => {
      tabView.setBounds({
        x: sidebarWidth,
        y: 0,
        width: width - sidebarWidth,
        height: height,
      });
    });

    // Modal window will automatically center itself relative to parent
  });

  setTimeout(() => {
    baseWindow?.show();
  }, 1000);

  // Remove this if your app does not use auto updates
  // eslint-disable-next-line
  new AppUpdater();

  // Create find overlay window
  const findWidth = 300;
  const findHeight = 50;

  findWindow = new BrowserWindow({
    parent: baseWindow,
    modal: false,
    show: false,
    width: findWidth,
    height: findHeight,
    resizable: false,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    webPreferences: {
      preload: app.isPackaged
        ? path.join(__dirname, "preload.js")
        : path.join(__dirname, "../../.erb/dll/preload.js"),
    },
  });

  findWindow.loadURL(`${resolveHtmlPath("/find-in-page")}`);

  // Function to toggle find overlay visibility
  toggleFind = () => {
    if (!findWindow) return;

    isFindVisible = !isFindVisible;

    if (isFindVisible) {
      // Position the find window at the top-right of the main window
      if (baseWindow) {
        const [mainX, mainY] = baseWindow.getPosition();
        const [mainWidth] = baseWindow.getSize();
        findWindow.setPosition(mainX + mainWidth - findWidth - 20, mainY + 60);
      }
      findWindow.show();
      findWindow.focus();
      setTimeout(() => {
        findWindow?.webContents.openDevTools({
          mode: "detach",
        });
      }, 1000);
    } else {
      findWindow.hide();
      // Clear any active find when hiding
      const activeTabView = getActiveTabView();
      if (activeTabView) {
        activeTabView.webContents.stopFindInPage("clearSelection");
      }
    }
  };

  // Handle find window events
  findWindow.webContents.on("before-input-event", (event, input) => {
    if (input.key === "Escape") {
      if (isFindVisible) {
        isFindVisible = false;
        findWindow?.hide();
        // Clear any active find
        const activeTabView = getActiveTabView();
        if (activeTabView) {
          activeTabView.webContents.stopFindInPage("clearSelection");
        }
      }
    }
  });

  findWindow.on("blur", () => {
    // Don't auto-hide find window like overlay - let user keep it open
  });
};

/**
 * Add event listeners...
 */

app.on("window-all-closed", () => {
  // Remove globalShortcut cleanup since we're not using it

  // Respect the OSX convention of having the application in memory even
  // after all windows have been closed
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app
  .whenReady()
  .then(() => {
    createWindow();
    app.on("activate", () => {
      // On macOS it's common to re-create a window in the app when the
      // dock icon is clicked and there are no other windows open.
      if (tabViews.size === 0) createWindow();
    });
  })
  .catch(console.log);

// Add IPC handlers for switcher
ipcMain.on("switcher.open", async (event, arg) => {
  showTabSwitcher();
  event.reply("switcher.open", arg);
});

ipcMain.on("switcher.close", async (event, arg) => {
  hideSwitcherAndSwitch();
  event.reply("switcher.close", arg);
});

ipcMain.on("switcher.select", async (event, tabId) => {
  const tab = switcherTabs.find((t) => t.id === tabId);
  if (tab) {
    const index = switcherTabs.indexOf(tab);
    switcherSelectedIndex = index;
    hideSwitcherAndSwitch();
  }
  event.reply("switcher.select", tabId);
});

// Add IPC handler for sidebar toggle (so frontend can also trigger it)
ipcMain.on("sidebar.toggle", async (event, arg) => {
  toggleSidebar();
  event.reply("sidebar.toggle", { isSidebarOpen });
});

// Handle find-in-page IPC - WITHOUT found-in-page event
ipcMain.on("find-in-page.search", async (event, { query }) => {
  console.log(`Received search request: "${query}"`);

  const activeTabView = getActiveTabView();
  if (!activeTabView) {
    console.log("No active tab view");
    return;
  }

  // If query is empty, clear everything
  if (!query) {
    console.log("Empty query, clearing find state");
    activeTabView.webContents.stopFindInPage("clearSelection");
    return;
  }

  console.log(`Starting search for: "${query}"`);

  try {
    activeTabView.webContents.findInPage(query, {
      forward: true,
      findNext: false,
      matchCase: false,
    });
  } catch (error) {
    console.error("Search error:", error);
  }
});

ipcMain.on("find-in-page.next", async (event, { query }) => {
  console.log("Find next requested");

  const activeTabView = getActiveTabView();
  if (!activeTabView || !query) {
    console.log("No active tab, query, or matches for next");
    return;
  }

  try {
    // Set up one-time listener - found-in-page DOES fire for next/previous
    activeTabView.webContents.once("found-in-page", (_event, result) => {
      console.log("Found in page (next) result:", result);
      if (findWindow?.webContents && !findWindow.webContents.isDestroyed()) {
        findWindow.webContents.send("find-in-page.results", result);
      }
    });

    activeTabView.webContents.findInPage(query, {
      forward: true,
      findNext: true,
      matchCase: false,
    });
  } catch (error) {
    console.error("Find next error:", error);
  }
});

ipcMain.on("find-in-page.previous", async (event, { query }) => {
  console.log("Find previous requested");

  const activeTabView = getActiveTabView();
  if (!activeTabView || !query) {
    console.log("No active tab, query, or matches for previous");
    return;
  }

  try {
    // Set up one-time listener - found-in-page DOES fire for next/previous
    activeTabView.webContents.once("found-in-page", (_event, result) => {
      console.log("Found in page (previous) result:", result);
      if (findWindow?.webContents && !findWindow.webContents.isDestroyed()) {
        findWindow.webContents.send("find-in-page.results", result);
      }
    });

    activeTabView.webContents.findInPage(query, {
      forward: false,
      findNext: true,
      matchCase: false,
    });
  } catch (error) {
    console.error("Find previous error:", error);
  }
});

ipcMain.on("find-in-page.dismiss", async (event) => {
  console.log("Dismissing find");

  const activeTabView = getActiveTabView();
  if (activeTabView) {
    activeTabView.webContents.stopFindInPage("clearSelection");
  }
});

ipcMain.on("extensions.install", async (event, { url }) => {
  console.log("Installing extension", url);
// main.js
// const { app, session, ipcMain } = require('electron');
// const installExtension = require('electron-extension-installer');

// ipcMain.handle('install-extension', async (event, installUrl) => {
//   // you can parse out the ID from installUrl, or just hard-code it
//   const extensionId = 'aapocclcgogkmnckokdopfmhonfmgoek';

//   try {
//     const extensionPath = await installExtension(extensionId);
//     await session.defaultSession.loadExtension(extensionPath);
//     return { success: true, path: extensionPath };
//   } catch (error) {
//     console.error('Install failed:', error);
//     return { success: false, error: error.message };
//   }
// });
  event.reply("extensions.install", { success: true });
});
