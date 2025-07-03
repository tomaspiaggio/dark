import { session } from "electron";
import installExtension from 'electron-devtools-installer';

export class Management {
    async install(extId: string): Promise<{ id: string; path: string } | undefined> {
        try {
            const result = await installExtension(extId, {
                loadExtensionOptions: { allowFileAccess: true },
            });
            console.log(`Extension ${result.name} installed successfully. ID: ${result.id}, Path: ${result.path}`);
            return { id: result.id, path: result.path };
        } catch (err: any) {
            console.error(`Extension install error for ${extId}:`, err);
            return undefined;
        }
    }

    async setEnabled(id: string, enabled: boolean): Promise<void> {
        console.warn(`management.setEnabled(${id}, ${enabled}) is not fully implemented.`);
        if (!enabled) {
            const ext = session.defaultSession.getExtension(id);
            if (ext) {
                await session.defaultSession.removeExtension(ext.id);
            }
        } else {
            // To re-enable, the user would typically have to reinstall.
            // A more advanced implementation could store the path and reload it.
        }
    }

    async uninstall(id: string): Promise<void> {
        const ext = session.defaultSession.getExtension(id);
        if (ext) {
            await session.defaultSession.removeExtension(ext.id);
            console.log(`Extension ${ext.name} uninstalled.`);
        }
        // Note: Electron does not provide a direct way to remove the unpacked files
        // after removeExtension. This would require manual deletion if desired.
    }

    async getAll(): Promise<any[]> {
        return session.defaultSession.getAllExtensions().map(ext => ({
            id: ext.id,
            name: ext.name,
            description: ext.manifest.description || '',
            version: ext.version,
            enabled: true, // All loaded extensions are enabled.
            type: 'extension',
        }));
    }
}