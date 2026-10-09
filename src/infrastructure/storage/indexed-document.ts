import type { DocumentStore } from '../../domain/ports/index.ts';
import type { AppDocument } from '../../practice/document.ts';
import { parseDocument } from './document-schema.ts';
// Stable database/key names are part of the staged-release migration contract.
export class IndexedDocumentStore implements DocumentStore<AppDocument> {
    private database: IDBDatabase | null = null;
    private opening: Promise<IDBDatabase> | null = null;
    private open(): Promise<IDBDatabase> {
        if (this.database)
            return Promise.resolve(this.database);
        if (this.opening)
            return this.opening;
        this.opening = new Promise((resolve, reject) => {
            if (!globalThis.indexedDB) {
                reject(new Error('Browser storage is unavailable.'));
                return;
            }
            const request = indexedDB.open('daily-accountability-practice', 1);
            let settled = false;
            const timer = setTimeout(() => { settled = true; reject(new Error('Browser storage did not open.')); }, 2500);
            request.onupgradeneeded = () => { if (!request.result.objectStoreNames.contains('documents'))
                request.result.createObjectStore('documents'); };
            request.onerror = () => { clearTimeout(timer); if (!settled) {
                settled = true;
                reject(request.error ?? new Error('Browser storage was denied.'));
            } };
            request.onsuccess = () => { clearTimeout(timer); if (settled) {
                request.result.close();
                return;
            } settled = true; this.database = request.result; this.database.onversionchange = () => this.close(); resolve(this.database); };
        });
        return this.opening;
    }
    async load(): Promise<AppDocument | null> {
        const db = await this.open();
        const value = await new Promise<unknown>((resolve, reject) => { const tx = db.transaction('documents', 'readonly'); const request = tx.objectStore('documents').get('practice-v1'); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); });
        return value == null ? null : parseDocument(value);
    }
    async save(document: AppDocument): Promise<void> {
        const db = await this.open();
        await new Promise<void>((resolve, reject) => { const tx = db.transaction('documents', 'readwrite'); tx.objectStore('documents').put(document, 'practice-v1'); tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error ?? new Error('The save failed.')); tx.onabort = () => reject(tx.error ?? new Error('The save was interrupted.')); });
    }
    async clear(): Promise<void> { const db = await this.open(); await new Promise<void>((resolve, reject) => { const tx = db.transaction('documents', 'readwrite'); tx.objectStore('documents').delete('practice-v1'); tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); tx.onabort = () => reject(tx.error); }); }
    close(): void { this.database?.close(); this.database = null; this.opening = null; }
}
