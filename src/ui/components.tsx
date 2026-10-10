import { useEffect, useId, useRef } from 'react';
import type { ReactNode } from 'react';
import { ArrowUpRight, Check, Coffee, HelpCircle, X } from 'lucide-react';
import { navigate } from '../app/router.tsx';
import type { DayRecord } from '../domain/accountability/types.ts';
import { progress } from '../domain/accountability/rules.ts';
import { categoryProgress } from '../domain/accountability/categories.ts';
export function Link({ to, children, className, label }: {
    to: string;
    children: ReactNode;
    className?: string;
    label?: string;
}) { return <a href={to} className={className} aria-label={label} onClick={e => { if (!e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey && e.button === 0) {
    e.preventDefault();
    navigate(to);
} }}>{children}</a>; }
export function Modal({ title, onClose, children }: {
    title: string;
    onClose: () => void;
    children: ReactNode;
}) {
    const ref = useRef<HTMLDialogElement>(null);
    const id = useId();
    useEffect(() => { const dialog = ref.current!; if (!dialog.open)
        dialog.showModal(); return () => dialog.close(); }, []);
    return <dialog ref={ref} aria-labelledby={id} className="modal" onCancel={e => { e.preventDefault(); onClose(); }} onClick={e => { if (e.target === e.currentTarget)
        onClose(); }}><div className="modal-inner"><header className="modal-heading"><h2 id={id}>{title}</h2><button className="icon-button" aria-label="Close dialog" onClick={onClose}><X size={20}/></button></header>{children}</div></dialog>;
}
export function ErrorMessage({ message }: {
    message: string;
}) { return message ? <p className="error-message" role="alert">{message}</p> : null; }
export function Explain({ action = 'plan' }: {
    action?: 'plan' | 'update' | 'review' | 'rest' | 'carry';
}) {
    const descriptions = {
        plan: 'This practice plan stays in this browser. In Live, your signer approves a public kind 1 note, and the app will wait for a relay to accept it.',
        update: 'This update saves a complete task snapshot locally. Live check-ins are signed kind 1 replies to your plan. Someone else’s reply cannot change your tasks.',
        review: 'Closing is your explicit decision, separate from completion. Live reviews are signed replies. A signature identifies the author; it does not prove the work happened.',
        rest: 'A rest day records an intentional break. It has no completion percentage and is counted separately from reviewed days.',
        carry: 'Selected commitments become new originals in a new draft. Today’s review stays as it was. Nothing is copied or published automatically.',
    };
    return <details className="explain"><summary><HelpCircle size={16}/> What happens on Nostr?</summary><p>{descriptions[action]}</p><Link to="/learn" className="text-link">See the build and protocol guide <ArrowUpRight size={14}/></Link></details>;
}
export function Ring({ day, compact = false, showLabel = !compact }: { day: DayRecord; compact?: boolean; showLabel?: boolean }) {
    const p = progress(day), groups = categoryProgress(day);
    if (p.percent === null) return <div className="rest-emblem"><Coffee size={42} strokeWidth={1.4}/><span>Rest day</span></div>;
    return <div className={`ring ${compact ? 'ring-mini' : ''}`} role="img" aria-label={`${compact ? 'Category rings.' : `${p.count} of ${p.total} original commitments completed, ${p.percent}%.`} ${groups.map(g => `${g.label}: ${g.count} of ${g.total}`).join('; ')}`}>
        <svg viewBox="0 0 240 240" aria-hidden="true">{groups.map((g, i) => {
            const radius = 102 - i * 26, length = 2 * Math.PI * radius;
            return <g key={g.category} className={`category-color-${i}`}><circle cx="120" cy="120" r={radius} className="ring-track"/><circle cx="120" cy="120" r={radius} className="ring-progress" strokeDasharray={`${length * g.percent / 100} ${length}`} strokeDashoffset="0" transform="rotate(-90 120 120)" opacity={g.count ? 1 : 0}/></g>;
        })}</svg>{showLabel && <div className="ring-label"><strong>{p.percent}<small>%</small></strong><span>{p.count}/{p.total}</span></div>}
    </div>;
}
export function CategorySummary({ day }: { day: DayRecord }) { return <div className="category-summary">{categoryProgress(day).map((g, i) => <div className={`category-color-${i}`} key={g.category}><span className="category-dot" aria-hidden="true"/><div><strong>{g.label}</strong><span>{g.count} of {g.total} goals fulfilled</span></div><b>{g.percent}<small>%</small></b></div>)}</div>; }
export function TapSelector<T extends string | number>({ label, value, choices, onChange }: { label: string; value: T; choices: { value: T; label: string; disabled?: boolean }[]; onChange: (value: T) => void }) {
    return <fieldset className="tap-selector"><legend className="sr-only">{label}</legend><div>{choices.map(choice => <button type="button" key={choice.value} aria-pressed={value === choice.value} disabled={choice.disabled} onClick={() => onChange(choice.value)}>{choice.label}</button>)}</div></fieldset>;
}
export function SavedLabel({ saving, temporary }: {
    saving: boolean;
    temporary: boolean;
}) { return <span className={`save-label ${temporary ? 'temporary' : ''}`} role="status">{temporary ? 'Temporary session' : saving ? 'Saving…' : <><Check size={13}/> Saved on this device</>}</span>; }
export function formatDate(date: string, options: Intl.DateTimeFormatOptions = { weekday: 'long', month: 'long', day: 'numeric' }): string { return new Intl.DateTimeFormat('en', { ...options, timeZone: 'UTC' }).format(new Date(`${date}T12:00:00Z`)); }
export function formatTime(seconds: number, timezone: string): string { return new Intl.DateTimeFormat('en', { hour: 'numeric', minute: '2-digit', timeZone: timezone }).format(seconds * 1000); }
