export function validTimezone(zone: string): boolean { try {
    new Intl.DateTimeFormat('en', { timeZone: zone }).format(0);
    return true;
}
catch {
    return false;
} }
export function localParts(seconds: number, zone: string): {
    date: string;
    time: string;
} {
    const parts = new Intl.DateTimeFormat('en-CA', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(seconds * 1000);
    const get = (name: string) => parts.find(p => p.type === name)?.value ?? '';
    return { date: `${get('year')}-${get('month')}-${get('day')}`, time: `${get('hour')}:${get('minute')}` };
}
export function validDate(value: string): boolean { return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(`${value}T12:00:00Z`).toISOString().slice(0, 10) === value; }
export function addDays(date: string, count: number): string { if (!validDate(date))
    throw new Error('Choose a valid calendar date.'); const d = new Date(`${date}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + count); return d.toISOString().slice(0, 10); }
export function offsetAt(seconds: number, zone: string): number { const p = localParts(seconds, zone); return Math.round((Date.parse(`${p.date}T${p.time}:00Z`) / 1000 - Math.floor(seconds / 60) * 60) / 60); }
// Select the earlier occurrence of an ambiguous wall time; a gap advances to the next valid wall minute.
export function resolveLocal(date: string, time: string, zone: string): number {
    if (!validDate(date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time) || !validTimezone(zone))
        throw new Error('Choose a valid date, time, and timezone.');
    const target = Date.parse(`${date}T${time}:00Z`) / 1000;
    const offsets = new Set([-36, -24, -12, 0, 12, 24, 36].map(h => offsetAt(target + h * 3600, zone)));
    for (let minute = 0; minute <= 1440; minute++) {
        const wall = target + minute * 60;
        const expected = new Date(wall * 1000).toISOString().slice(0, 16);
        const matches = [...offsets].map(o => wall - o * 60).filter(candidate => { const p = localParts(candidate, zone); return `${p.date}T${p.time}` === expected; });
        if (matches.length)
            return Math.min(...matches);
    }
    throw new Error('This local time could not be resolved. Choose another time.');
}
export function monday(date: string): string { const weekday = new Date(`${date}T12:00:00Z`).getUTCDay(); return addDays(date, -(weekday === 0 ? 6 : weekday - 1)); }
