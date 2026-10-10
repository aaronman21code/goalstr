import type { Category, Commitment, DayRecord } from './types.ts';
export const MAX_CATEGORIES = 3;
export const GOALS_PER_CATEGORY = 5;
export const categoryChoices: { value: Category; label: string }[] = [
    { value: '', label: 'General' }, { value: 'work', label: 'Work' },
    { value: 'learning', label: 'Learning' }, { value: 'health', label: 'Health' },
    { value: 'personal', label: 'Personal' },
];
export function validateCategories(goals: Commitment[]): void {
    const groups = new Map<Category, number>();
    for (const goal of goals) {
        if (!categoryChoices.some(c => c.value === goal.category)) throw new Error('Choose a valid goal category.');
        groups.set(goal.category, (groups.get(goal.category) ?? 0) + 1);
    }
    if (groups.size > MAX_CATEGORIES) throw new Error('Choose up to three categories for this day.');
    if ([...groups.values()].some(count => count > GOALS_PER_CATEGORY)) throw new Error('Keep up to five goals in each category.');
}
export function categoryProgress(day: DayRecord): { category: Category; label: string; count: number; total: number; percent: number }[] {
    if (day.mode === 'rest') return [];
    const fulfilled = new Set(day.snapshots.at(-1)?.tasks.filter(t => t.originalFulfilled).map(t => t.id) ?? []);
    return categoryChoices.flatMap(c => {
        const goals = day.commitments.filter(t => t.category === c.value);
        if (!goals.length) return [];
        const count = goals.filter(t => fulfilled.has(t.id)).length;
        return [{ category: c.value, label: c.label, count, total: goals.length, percent: Math.round(100 * count / goals.length) }];
    });
}
