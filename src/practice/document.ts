import type { DayRecord, PlanDraft, Preferences, UpdateInput } from '../domain/accountability/types.ts';
export interface AppDocument {
    schemaVersion: 2;
    started: boolean;
    days: Record<string, DayRecord>;
    drafts: Record<string, PlanDraft>;
    updateDrafts: Record<string, UpdateInput>;
    preferences: Preferences;
}
export function initialDocument(timezone: string): AppDocument { return { schemaVersion: 2, started: false, days: {}, drafts: {}, updateDrafts: {}, preferences: { timezone, checkinTimes: ['11:00', '14:30', '18:00'], reviewTime: '21:30' } }; }
