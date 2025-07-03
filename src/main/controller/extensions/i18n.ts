// Localization lookups.
import path from 'path';
import fs from 'fs/promises';

export class I18n {
    private messages: Record<string, { message: string, description?: string }> = {};

    constructor(private extensionPath: string, private locale: string = 'en') {
        this.loadMessages();
    }

    private async loadMessages() {
        const messagesPath = path.join(this.extensionPath, '_locales', this.locale, 'messages.json');
        try {
            const content = await fs.readFile(messagesPath, 'utf-8');
            this.messages = JSON.parse(content);
        } catch (error) {
            // It's fine if messages don't exist for a locale.
            if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
                console.error(`Failed to load messages for locale ${this.locale}:`, error);
            }
        }
    }

    getMessage(messageName: string, substitutions?: any): string {
        const message = this.messages[messageName];
        if (!message) {
            return '';
        }

        let messageText = message.message;

        if (substitutions) {
            if (Array.isArray(substitutions)) {
                for (let i = 0; i < substitutions.length; i++) {
                    messageText = messageText.replace(`$${i + 1}`, substitutions[i]);
                }
            } else {
                for (const key in substitutions) {
                    messageText = messageText.replace(`$${key}$`, substitutions[key]);
                }
            }
        }

        return messageText;
    }
}
