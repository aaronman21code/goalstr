import type { ClockPort, DocumentStore } from '../domain/ports/index.ts';
import type { PlanDraft, Preferences, UpdateInput } from '../domain/accountability/types.ts';
import { appendSnapshot, carryDraft, makeDay, validatePreferences } from '../domain/accountability/rules.ts';
import { initialDocument } from './document.ts';
import type { AppDocument } from './document.ts';
export interface PracticeSnapshot {
    document: AppDocument;
    persistence: 'loading' | 'saving' | 'saved' | 'temporary';
    message: string;
}
export class PracticeService {
    private snapshot: PracticeSnapshot;
    private listeners = new Set<() => void>();
    private queue = Promise.resolve();
    private temporary = false;
    private initialized: Promise<void> | null = null;
    private revision = 0;
    private store: DocumentStore<AppDocument>;
    public clock: ClockPort;
    constructor(store: DocumentStore<AppDocument>, clock: ClockPort, zone: string) { this.store = store; this.clock = clock; this.snapshot = { document: initialDocument(zone), persistence: 'loading', message: '' }; }
    subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
    getSnapshot = () => this.snapshot;
    private emit(next: PracticeSnapshot): void { this.snapshot = next; this.listeners.forEach(l => l()); }
    initialize(): Promise<void> {
        if (this.initialized)
            return this.initialized;
        this.initialized = (async () => { try {
            const loaded = await this.store.load();
            this.emit({ document: loaded ?? this.snapshot.document, persistence: 'saved', message: '' });
        }
        catch {
            this.temporary = true;
            this.store.close();
            this.emit({ ...this.snapshot, persistence: 'temporary', message: 'Temporary session. Saved data could not be opened. New work will not survive closing this tab.' });
        } })();
        return this.initialized;
    }
    private commit(document: AppDocument): void {
        const revision = ++this.revision;
        this.emit({ document, persistence: this.temporary ? 'temporary' : 'saving', message: this.snapshot.message });
        if (this.temporary)
            return;
        this.queue = this.queue.then(async () => { if (this.temporary)
            return; try {
            await this.store.save(document);
            if (revision === this.revision)
                this.emit({ ...this.snapshot, persistence: 'saved' });
        }
        catch {
            this.temporary = true;
            this.store.close();
            this.emit({ ...this.snapshot, persistence: 'temporary', message: 'Temporary session. The latest changes could not be saved. Keep this tab open or export your practice data.' });
        } });
    }
    async settled(): Promise<void> { await this.queue; }
    start(): void { this.commit({ ...this.snapshot.document, started: true }); }
    blankDraft(date: string): PlanDraft { return { date, timezone: this.snapshot.document.preferences.timezone, commitments: [{ id: this.clock.id(), title: '', category: '' }], note: '' }; }
    saveDraft(draft: PlanDraft): void { this.commit({ ...this.snapshot.document, drafts: { ...this.snapshot.document.drafts, [draft.date]: draft } }); }
    saveUpdateDraft(dayId: string, draft: UpdateInput): void { this.commit({ ...this.snapshot.document, updateDrafts: { ...this.snapshot.document.updateDrafts, [dayId]: draft } }); }
    startDay(draft: PlanDraft, rest = false): string {
        const document = this.snapshot.document;
        if (document.days[draft.date])
            throw new Error('A practice day already exists for this date.');
        const day = makeDay(draft, document.preferences, { now: this.clock.now(), id: this.clock.id }, rest);
        const drafts = { ...document.drafts };
        delete drafts[draft.date];
        this.commit({ ...document, started: true, days: { ...document.days, [day.date]: day }, drafts });
        return day.id;
    }
    update(dayId: string, input: UpdateInput): void {
        const document = this.snapshot.document;
        const day = Object.values(document.days).find(d => d.id === dayId);
        if (!day)
            throw new Error('This practice day could not be found.');
        const next = appendSnapshot(day, input, { now: this.clock.now(), id: this.clock.id });
        const drafts = { ...document.updateDrafts };
        delete drafts[dayId];
        this.commit({ ...document, days: { ...document.days, [day.date]: next }, updateDrafts: drafts });
    }
    prepare(dayId: string, ids: string[], date: string): void {
        const document = this.snapshot.document;
        const day = Object.values(document.days).find(d => d.id === dayId);
        if (!day)
            throw new Error('The source day could not be found.');
        if (document.drafts[date] || document.days[date])
            throw new Error('A draft or plan already exists for that date. Open it to edit your commitments.');
        this.saveDraft(carryDraft(day, ids, date, document.preferences.timezone, this.clock.id));
    }
    setPreferences(preferences: Preferences): void { validatePreferences(preferences); this.commit({ ...this.snapshot.document, preferences: { ...preferences, checkinTimes: [...preferences.checkinTimes].sort() } }); }
    restore(document: AppDocument): void { this.commit(document); }
    async reset(): Promise<void> { await this.settled(); if (this.temporary)
        throw new Error('Storage is unavailable, so saved data cannot be cleared here. Enable browser storage and reload first.'); await this.store.clear(); this.commit(initialDocument(this.snapshot.document.preferences.timezone)); }
}
