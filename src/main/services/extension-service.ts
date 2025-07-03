import { session, app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import fs from 'fs/promises';

import { Action } from '../controller/extensions/action';
import { ContextMenus } from '../controller/extensions/contextMenus';
import { Cookies } from '../controller/extensions/cookies';
import { Extension as ExtensionController } from '../controller/extensions/extension';
import { I18n } from '../controller/extensions/i18n';
import { Management } from '../controller/extensions/management';
import { Notifications } from '../controller/extensions/notifications';
import { Permissions } from '../controller/extensions/permissions';
import { Runtime, Manifest } from '../controller/extensions/runtime';
import { Scripting } from '../controller/extensions/scripting';
import { Storage } from '../controller/extensions/storage';
import { ITabManager, Tabs } from '../controller/extensions/tabs';
import { WebRequest } from '../controller/extensions/webRequest';
import { Windows } from '../controller/extensions/windows';
import { Tab } from '@/types/tab';

class Extension {
    public id: string;
    public path: string;
    public manifest: Manifest;
    public apis: any = {};

    constructor(id: string, manifest: Manifest, extensionPath: string) {
        this.id = id;
        this.manifest = manifest;
        this.path = extensionPath;
    }

    public async loadAPIs(
        tabManager: ITabManager,
        browserWindow: BrowserWindow
    ) {
        const windows = new Windows();
        this.apis.storage = new Storage(this.id);
        this.apis.runtime = new Runtime(this.id, this.manifest, tabManager.createTab);
        this.apis.tabs = new Tabs(tabManager);
        this.apis.windows = windows;
        this.apis.action = new Action(this.path, browserWindow, windows);
        this.apis.cookies = new Cookies();
        this.apis.contextMenus = new ContextMenus();
        this.apis.notifications = new Notifications();
        this.apis.scripting = new Scripting();
        this.apis.webRequest = new WebRequest();
        this.apis.i18n = new I18n(this.path);
        this.apis.permissions = await Permissions.new(path.join(this.path, 'permissions.json'));
        this.apis.extension = new ExtensionController(this.id, this.path);
    }
}

export class ExtensionService {
    private extensions = new Map<string, Extension>();
    private management: Management;
    private tabManager: ITabManager;
    private browserWindow: BrowserWindow;

    constructor(
        tabManager: ITabManager,
        browserWindow: BrowserWindow,
    ) {
        this.management = new Management();
        this.tabManager = tabManager;
        this.browserWindow = browserWindow;
        this.registerIpcHandler();
    }

    private registerIpcHandler() {
        ipcMain.handle('extension-api', async (event, api, prop, extensionId, ...args) => {
            const extension = this.extensions.get(extensionId);
            if (!extension) {
                throw new Error(`Extension not found: ${extensionId}`);
            }

            const [apiName, subName] = api.split('.');
            let apiObject = extension.apis[apiName];
            if (subName) {
                apiObject = apiObject[subName];
            }

            if (apiObject && typeof apiObject[prop] === 'function') {
                return await apiObject[prop](...args);
            } else {
                throw new Error(`API not found: ${api}.${prop}`);
            }
        });
    }

    private async loadBackgroundScript(extension: Extension) {
        if (extension.manifest.background && extension.manifest.background.scripts) {
            const preloadPath = path.join(__dirname, 'extension-preload.js');

            const backgroundWindow = new BrowserWindow({
                show: false,
                webPreferences: {
                    preload: preloadPath,
                    nodeIntegration: false,
                    contextIsolation: true,
                    additionalArguments: [`--extension-id=${extension.id}`]
                }
            });

            const scriptPath = path.join(extension.path, extension.manifest.background.scripts[0]);
            const script = await fs.readFile(scriptPath, 'utf-8');
            await backgroundWindow.loadURL(`data:text/html;charset=utf-8,<script>${script}</script>`);
        }
    }

    public async loadExtensions() {
        try {
            // Electron automatically loads extensions from the default session's Extensions directory
            // We can get the list of loaded extensions directly from Electron
            const loadedExtensions = session.defaultSession.getAllExtensions();

            for (const electronExtension of loadedExtensions) {
                const manifestPath = path.join(electronExtension.path, 'manifest.json');
                try {
                    const manifestContent = await fs.readFile(manifestPath, 'utf-8');
                    const manifest = JSON.parse(manifestContent);
                    const extension = new Extension(electronExtension.id, manifest, electronExtension.path);
                    await extension.loadAPIs(this.tabManager, this.browserWindow);
                    this.extensions.set(electronExtension.id, extension);
                    
                    console.log(`Loaded extension: ${manifest.name} (ID: ${electronExtension.id})`);
                } catch (error) {
                    console.error(`Failed to load extension ${electronExtension.id}:`, error);
                }
            }
        } catch (error) {
            console.error('Failed to read extensions directory:', error);
        }
    }

    public async install(extId: string): Promise<void> {
        const installedExtension = await this.management.install(extId);
        if (installedExtension) {
            const manifestPath = path.join(installedExtension.path, 'manifest.json');
            console.log(`Attempting to load manifest for newly installed extension from: ${manifestPath}`);
            try {
                const fileExists = await fs.access(manifestPath, fs.constants.F_OK).then(() => true).catch(() => false);
                if (!fileExists) {
                    console.error(`Manifest file not found for newly installed extension at: ${manifestPath}`);
                    return; // Stop processing this extension
                }
                const manifestContent = await fs.readFile(manifestPath, 'utf-8');
                const manifest = JSON.parse(manifestContent);
                const extension = new Extension(installedExtension.id, manifest, installedExtension.path);
                await extension.loadAPIs(this.tabManager, this.browserWindow);
                this.extensions.set(installedExtension.id, extension);
                console.log(`Installed and loaded new extension: ${manifest.name} (ID: ${installedExtension.id})`);
            } catch (error) {
                console.error(`Failed to load newly installed extension ${installedExtension.id}:`, error);
            }
        }
    }

    public getAPI(extensionId: string) {
        return this.extensions.get(extensionId)?.apis;
    }
}