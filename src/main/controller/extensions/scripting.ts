// Programmatic script/CSS injection (MV3 equivalent of executeScript/insertCSS).
import { webContents } from 'electron';

export class Scripting {

    constructor() {}

    async executeScript(details: {
        target: { tabId: number };
        files?: string[];
        func?: (...args: any[]) => void;
        args?: any[];
    }): Promise<any> {
        const contents = webContents.getAllWebContents().find(wc => wc.id === details.target.tabId);
        if (!contents) {
            throw new Error(`No webContents found for tabId ${details.target.tabId}`);
        }

        if (details.files) {
            for (const file of details.files) {
                // This assumes files are relative to the extension's root.
                // We need the extension path here. This is a simplification.
                // await contents.executeJavaScript(fs.readFileSync(filePath, 'utf8'));
                console.warn('scripting.executeScript with files is not fully implemented.');
            }
        }

        if (details.func) {
            const source = `(${details.func.toString()})(...${JSON.stringify(details.args || [])})`;
            return await contents.executeJavaScript(source, true);
        }
    }

    async insertCSS(details: {
        target: { tabId: number };
        files?: string[];
        css?: string;
    }): Promise<void> {
        const contents = webContents.getAllWebContents().find(wc => wc.id === details.target.tabId);
        if (!contents) {
            throw new Error(`No webContents found for tabId ${details.target.tabId}`);
        }

        if (details.files) {
            // Similar to executeScript, needs extension path.
            console.warn('scripting.insertCSS with files is not fully implemented.');
        }

        if (details.css) {
            await contents.insertCSS(details.css);
        }
    }
}
