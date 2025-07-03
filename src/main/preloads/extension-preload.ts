import { ipcRenderer } from 'electron';

const extensionIdArg = process.argv.find(arg => arg.startsWith('--extension-id='));
const extensionId = extensionIdArg ? extensionIdArg.split('=')[1] : undefined;

if (!extensionId) {
    throw new Error('Extension ID not provided');
}

const getApi = (api: string) => {
    return new Proxy({}, {
        get: (target, prop) => {
            // Handle event listeners
            if (prop === 'addListener' && (api.includes('.on') || api.includes('onClicked'))) {
                return (callback: (...args: any[]) => void) => {
                    ipcRenderer.on(api, (event, ...args) => {
                        callback(...args);
                    });
                };
            }
            // Handle API method calls
            return (...args: any[]) => ipcRenderer.invoke('extension-api', api, prop, extensionId, ...args);
        }
    });
}

// Check if chrome object already exists
if (!window.chrome) {
    window.chrome = {
        runtime: getApi('runtime'),
        storage: {
            local: getApi('storage.local'),
            sync: getApi('storage.sync'),
            managed: getApi('storage.managed'),
            onChanged: getApi('storage.onChanged'),
        },
        tabs: getApi('tabs'),
        windows: getApi('windows'),
        action: getApi('action'),
        browserAction: getApi('action'), // Alias for action
        cookies: getApi('cookies'),
        contextMenus: getApi('contextMenus'),
        notifications: getApi('notifications'),
        scripting: getApi('scripting'),
        webRequest: {
            onBeforeRequest: getApi('webRequest.onBeforeRequest'),
            onBeforeSendHeaders: getApi('webRequest.onBeforeSendHeaders'),
            onHeadersReceived: getApi('webRequest.onHeadersReceived'),
            onCompleted: getApi('webRequest.onCompleted'),
            onErrorOccurred: getApi('webRequest.onErrorOccurred'),
        },
        i18n: getApi('i18n'),
        permissions: getApi('permissions'),
        extension: getApi('extension'),
    };
}