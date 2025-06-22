// Window creation & management (popups, panels).
// TODO: need to implement all of these. none are supported by electron (nor by Dark yet).

// declare namespace chrome.windows {
//     interface Window { id: number; focused: boolean; left: number; top: number; width: number; height: number; tabs?: chrome.tabs.Tab[]; }
  
//     function create(createData: { url?: string|string[]; left?: number; top?: number; width?: number; height?: number; focused?: boolean; state?: string; type?: string }): Promise<Window>
//     function update(windowId: number, updateInfo: { left?: number; top?: number; width?: number; height?: number; focused?: boolean; state?: string }): Promise<Window>
//     function remove(windowId: number): Promise<void>
//     function get(windowId: number, getInfo?: { populate?: boolean }): Promise<Window>
//     function getCurrent(getInfo?: { populate?: boolean }): Promise<Window>
//     function getLastFocused(getInfo?: { populate?: boolean }): Promise<Window>
//     function getAll(getInfo?: { populate?: boolean }): Promise<Window[]>
  
//     const onCreated: chrome.events.Event<(window: Window) => void>
//     const onRemoved: chrome.events.Event<(windowId: number) => void>
//     const onFocusChanged: chrome.events.Event<(windowId: number) => void>
//   }
  