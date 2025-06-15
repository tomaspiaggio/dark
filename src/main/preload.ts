// Disable no-unused-vars, broken for spread args
/* eslint no-unused-vars: off */
import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';

export type Channels = 'ipc-example' | 
// set tab url
'tabs.set' | 
// open a new tab with the specified url
'tabs.open' |
// get all tabs
'tabs.getAll' |
// subscribe to tab changes
'tabs.onChange' |
// navigate active tab
'tabs.navigateActive' |
// rename tab
'tabs.rename' |
// reorder tab
'tabs.reorder' |
// switch to tab
'tabs.switch' |
// close tab
'tabs.close' |
// go back on page
'popstate-history.pop' |
// go forward on page
'popstate-history.push' |
// refresh page
'popstate-history.refresh' |
// close spotlight
'spotlight.toggle' | 
// open switcher
'switcher.open' |
// close switcher
'switcher.close' |
// select tab
'switcher.select' |
// update switcher
'switcher.update' |
// toggle sidebar
'sidebar.toggle' |
// find in page
'find-in-page.find' |
// find next
'find-in-page.next' |
// find previous
'find-in-page.previous' |
// find results
'find-in-page.results' |
// dismiss find in page
'find-in-page.dismiss' |
// find state update
'find-in-page.find-state-update' |
// find ready
'find-in-page.ready' | 
// find search
'find-in-page.search' |
// install extension
'extensions.install'
;

const electronHandler = {
  ipcRenderer: {
    sendMessage(channel: Channels, ...args: unknown[]) {
      ipcRenderer.send(channel, ...args);
    },
    on(channel: Channels, func: (...args: unknown[]) => void) {
      const subscription = (_event: IpcRendererEvent, ...args: unknown[]) =>
        func(...args);
      ipcRenderer.on(channel, subscription);

      return () => {
        ipcRenderer.removeListener(channel, subscription);
      };
    },
    once(channel: Channels, func: (...args: unknown[]) => void) {
      ipcRenderer.once(channel, (_event, ...args) => func(...args));
    },
    removeAllListeners(channel: Channels) {
      ipcRenderer.removeAllListeners(channel);
    },
  },
};

contextBridge.exposeInMainWorld('electron', electronHandler);

export type ElectronHandler = typeof electronHandler;
