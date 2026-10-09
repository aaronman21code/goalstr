export type Category = '' | 'work' | 'learning' | 'health' | 'personal';
export type TaskStatus = 'not_started' | 'in_progress' | 'done' | 'changed_plans';
export interface Commitment {
    id: string;
    title: string;
    category: Category;
}
export interface TaskState {
    id: string;
    currentTitle: string;
    status: TaskStatus;
    originalFulfilled: boolean;
    revisionReason: string;
}
export interface Bonus {
    id: string;
    title: string;
    status: TaskStatus;
}
export interface Reflection {
    wentWell: string;
    gotInWay: string;
    carryForward: string;
}
export interface Slot {
    id: string;
    localTime: string;
    dueAt: number;
}
export type UpdateType = 'checkin' | 'revision' | 'close' | 'correction';
export interface Snapshot {
    id: string;
    type: UpdateType;
    createdAt: number;
    tasks: TaskState[];
    bonus: Bonus[];
    slotId: string;
    note: string;
    closed: boolean;
    reflection: Reflection;
    correctionReason: string;
}
export interface DayRecord {
    id: string;
    date: string;
    timezone: string;
    offsetMinutes: number;
    nextMidnightAt: number;
    createdAt: number;
    mode: 'plan' | 'rest';
    commitments: Commitment[];
    openingNote: string;
    slots: Slot[];
    reviewDueAt: number | null;
    snapshots: Snapshot[];
}
export interface PlanDraft {
    date: string;
    timezone: string;
    commitments: Commitment[];
    note: string;
}
export interface Preferences {
    timezone: string;
    checkinTimes: string[];
    reviewTime: string;
}
export interface UpdateInput {
    type: UpdateType;
    tasks: TaskState[];
    bonus: Bonus[];
    slotId: string;
    note: string;
    reflection: Reflection;
    correctionReason: string;
}
export interface DomainContext {
    now: number;
    id: () => string;
}
export const emptyReflection = (): Reflection => ({ wentWell: '', gotInWay: '', carryForward: '' });
export const statusLabels: Record<TaskStatus, string> = { not_started: 'Not started', in_progress: 'In progress', done: 'Done', changed_plans: 'Changed plans' };
