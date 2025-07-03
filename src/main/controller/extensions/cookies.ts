// Cookie read/write (used by password managers).
import { session } from 'electron';

export class Cookies {
    constructor() {}

    async get(details: { url: string; name: string }): Promise<any | undefined> {
        const cookies = await session.defaultSession.cookies.get({
            url: details.url,
            name: details.name,
        });
        return cookies.length > 0 ? cookies[0] : undefined;
    }

    async getAll(details: { url?: string; name?: string; domain?: string; path?: string; secure?: boolean; session?: boolean }): Promise<any[]> {
        return await session.defaultSession.cookies.get(details);
    }

    async set(details: {
        url: string;
        name?: string;
        value?: string;
        domain?: string;
        path?: string;
        secure?: boolean;
        httpOnly?: boolean;
        expirationDate?: number;
    }): Promise<any> {
        const { url, name, value, domain, path, secure, httpOnly, expirationDate } = details;
        if (!name || !value) {
            throw new Error("Name and value are required for setting a cookie.");
        }
        await session.defaultSession.cookies.set({
            url,
            name,
            value,
            domain,
            path,
            secure,
            httpOnly,
            expirationDate,
        });
        return this.get({ url, name });
    }

    async remove(details: { url: string; name: string }): Promise<{ url: string; name: string }> {
        await session.defaultSession.cookies.remove(details.url, details.name);
        return { url: details.url, name: details.name };
    }

    // The onChanged event needs to be implemented by listening to electron's cookie changes.
    // session.defaultSession.cookies.on('changed', ...)
}