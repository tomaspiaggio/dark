// Cookie read/write (used by password managers).
// declare namespace chrome.cookies {
//     interface Cookie { name: string; value: string; domain: string; path: string; secure: boolean; httpOnly: boolean; session: boolean; expirationDate?: number }
//     function get(details: { url: string; name: string }): Promise<Cookie|undefined>
//     function getAll(details?: { url?: string; name?: string; domain?: string; path?: string; secure?: boolean; session?: boolean }): Promise<Cookie[]>
//     function set(details: { url: string; name?: string; value: string; domain?: string; path?: string; secure?: boolean; httpOnly?: boolean; expirationDate?: number }): Promise<Cookie>
//     function remove(details: { url: string; name: string }): Promise<{url:string;name:string}>
//     const onChanged: chrome.events.Event<(changeInfo: { removed: boolean; cookie: Cookie; cause: string }, domain?: string) => void>
//   }

