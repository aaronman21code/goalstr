import { useState } from 'react';
import { ArrowLeft, ArrowRight, Coffee, Plus, X } from 'lucide-react';
import { usePractice } from '../../app/context.tsx';
import { navigate } from '../../app/router.tsx';
import { bounded, codePoints, makeDay } from '../../domain/accountability/rules.ts';
import type { PlanDraft, Preferences } from '../../domain/accountability/types.ts';
import { ErrorMessage, Explain, Modal, SavedLabel, TapSelector, formatDate } from '../../ui/components.tsx';
import { categoryChoices, validateCategories } from '../../domain/accountability/categories.ts';
export interface LivePlanEditor { draft?: PlanDraft; preferences: Preferences; onDraft(draft: PlanDraft): void; onReview(draft: PlanDraft, rest: boolean): Promise<void>; }
export function PlanComposer({ date, tomorrow = false, live }: {
    date: string;
    tomorrow?: boolean;
    live?: LivePlanEditor;
}) {
    const practice = usePractice();
    const { service, persistence } = practice;
    const document = live ? { ...practice.document, preferences: live.preferences, drafts: { [date]: live.draft } } : practice.document;
    const [draft, setDraft] = useState<PlanDraft>(() => document.drafts[date] ?? service.blankDraft(date));
    const [preview, setPreview] = useState(false);
    const [rest, setRest] = useState(false);
    const [error, setError] = useState('');
    const change = (next: PlanDraft) => { setDraft(next); if (live) live.onDraft(next); else service.saveDraft(next); setError(''); };
    async function review() { try {
        makeDay(draft, document.preferences, { now: service.clock.now(), id: () => 'preview-only' });
        if (live) await live.onReview(draft, false); else setPreview(true);
        setError('');
    }
    catch (e) {
        setError((e as Error).message);
    } }
    async function start(isRest = false) { try {
        if (live) { await live.onReview(draft, isRest); setRest(false); return; }
        service.startDay(draft, isRest);
        navigate('/today');
        setRest(false);
    }
    catch (e) {
        setError((e as Error).message);
    } }
    return <>
    <div className="page-heading"><div><p className="eyebrow">{tomorrow ? 'A LITTLE HEAD START' : 'MAKE ROOM FOR WHAT MATTERS'}</p><h1>{tomorrow ? 'Tomorrow’s draft' : 'A small plan for today.'}</h1><p className="muted">{formatDate(date)} · {draft.timezone}</p></div></div>
    <section className="card composer-card">
      {!preview ? <>
        <div className="section-heading"><h2>What would make {tomorrow ? 'tomorrow' : 'today'} a good day?</h2><span className="tiny-badge">3 categories · 5 goals each</span></div>
        <p className="muted compact">Choose finishable actions. Start small; five per category is a limit, not a target.</p>
        <form onSubmit={e => { e.preventDefault(); review(); }}>
          <div className="plan-fields">{draft.commitments.map((task, index) => <div className="plan-field" key={task.id}><div className="field-top"><label htmlFor={`commitment-${index}`}>Commitment {index + 1}</label>{draft.commitments.length > 1 && <button className="icon-button" type="button" aria-label={`Remove commitment ${index + 1}`} onClick={() => change({ ...draft, commitments: draft.commitments.filter(t => t.id !== task.id) })}><X size={16}/></button>}</div><input id={`commitment-${index}`} placeholder={['Finish a first draft', 'Walk for 30 minutes', 'Read one chapter'][index % 3]} value={task.title} onChange={e => change({ ...draft, commitments: draft.commitments.map(t => t.id === task.id ? { ...t, title: e.target.value } : t) })} maxLength={320} aria-describedby={`counter-${index}`} aria-label={`Commitment ${index + 1}`}/><div className="field-bottom"><TapSelector label={`Category for commitment ${index + 1}`} value={task.category} choices={categoryChoices.map(c => ({ ...c, disabled: (() => { const remaining = draft.commitments.filter(t => t.id !== task.id); return remaining.filter(t => t.category === c.value).length >= 5 || new Set([...remaining.map(t => t.category), c.value]).size > 3; })() }))} onChange={category => change({ ...draft, commitments: draft.commitments.map(t => t.id === task.id ? { ...t, category } : t) })}/><span id={`counter-${index}`} className="counter">{codePoints(task.title)}/160</span></div></div>)}</div>
          <div className="add-goals"><span className="caption">Add a goal to</span><div className="goal-add-buttons">{categoryChoices.map(c => { const count = draft.commitments.filter(t => t.category === c.value).length; return <button className="button secondary" type="button" key={c.value} disabled={count >= 5 || new Set([...draft.commitments.map(t => t.category), c.value]).size > 3} onClick={() => change({ ...draft, commitments: [...draft.commitments, { id: service.clock.id(), title: '', category: c.value }] })}><Plus size={15}/>{c.label} <span className="caption">{count}/5</span></button>; })}</div></div>
          <label className="field-label" htmlFor="opening-note">Opening note <span>optional</span></label><textarea id="opening-note" rows={2} placeholder="Anything you want to keep in mind?" value={draft.note} onChange={e => change({ ...draft, note: e.target.value })}/><span className="counter align-right">{codePoints(draft.note)}/1000</span>
          <div className="schedule-strip"><span>Check-ins</span><strong>{document.preferences.checkinTimes.length ? document.preferences.checkinTimes.join(' · ') : 'Unscheduled'}</strong><span>Review</span><strong>{document.preferences.reviewTime || 'Any time'}</strong></div>
          <ErrorMessage message={error}/>
          {tomorrow ? <div className="form-actions"><button className="button primary" type="button" onClick={() => { try {
            validateCategories(draft.commitments);
            draft.commitments.forEach((t, i) => bounded(t.title, 160, `Commitment ${i + 1}`, true));
            service.saveDraft(draft);
            navigate('/today');
        }
        catch (e) {
            setError((e as Error).message);
        } }}>Keep tomorrow’s draft <ArrowRight size={18}/></button></div> : <div className="form-actions"><button className="button primary" type="submit">Review my plan <ArrowRight size={18}/></button></div>}
        </form>
      </> : <><p className="eyebrow">PLAN PREVIEW · PRACTICE</p><h2>{formatDate(date)}</h2><ol className="preview-list">{draft.commitments.map(t => <li key={t.id}>{t.title.trim()}</li>)}</ol>{draft.note.trim() && <p className="pre-line">{draft.note.trim()}</p>}<p className="visibility-note">This plan stays in your browser. Nothing is published.</p><ErrorMessage message={error}/><div className="form-actions"><button className="button secondary" onClick={() => setPreview(false)}><ArrowLeft size={16}/> Edit</button><button className="button primary" onClick={() => start()}>Start my practice day <ArrowRight size={18}/></button></div></>}
      {!live && <SavedLabel saving={persistence === 'saving'} temporary={persistence === 'temporary'}/>}<Explain action="plan"/>
    </section>
    {!tomorrow && !preview && <button className="rest-link" onClick={() => setRest(true)}><Coffee size={17}/> Taking a break? Make this a rest day.</button>}
    {rest && <Modal title="Make today a rest day?" onClose={() => setRest(false)}><p className="muted">An intentional break, with no tasks or completion score. This replaces any unsent plan draft for today.</p><Explain action="rest"/><ErrorMessage message={error}/><div className="form-actions"><button className="button secondary" onClick={() => setRest(false)}>Keep planning</button><button className="button primary" onClick={() => start(true)}>Make a rest day</button></div></Modal>}
  </>;
}
