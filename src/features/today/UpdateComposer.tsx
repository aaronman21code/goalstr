import { useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Plus, X } from 'lucide-react';
import { usePractice } from '../../app/context.tsx';
import { appendSnapshot, codePoints, current, suggestedSlot } from '../../domain/accountability/rules.ts';
import type { DayRecord, TaskStatus, UpdateInput, UpdateType } from '../../domain/accountability/types.ts';
import { emptyReflection, statusLabels } from '../../domain/accountability/types.ts';
import { ErrorMessage, Explain, SavedLabel } from '../../ui/components.tsx';
const submitLabels: Record<UpdateType, string> = { checkin: 'Save check-in', revision: 'Save revision', close: 'Close practice day', correction: 'Save correction' };
export function UpdateComposer({ day, type, onDone }: {
    day: DayRecord;
    type: UpdateType;
    onDone: () => void;
}) {
    const { service, document, persistence } = usePractice();
    const existing = current(day);
    const [draft, setDraft] = useState<UpdateInput>(() => { const saved = document.updateDrafts[day.id]; return { type, tasks: structuredClone(saved?.tasks ?? existing.tasks), bonus: structuredClone(saved?.bonus ?? existing.bonus), slotId: type === 'checkin' ? saved?.type === type ? saved.slotId : suggestedSlot(day, service.clock.now()) : '', note: saved?.note ?? '', reflection: saved?.reflection ?? (type === 'correction' ? structuredClone(existing.reflection) : emptyReflection()), correctionReason: saved?.correctionReason ?? '' }; });
    const [preview, setPreview] = useState(false);
    const [error, setError] = useState('');
    const change = (next: UpdateInput) => { setDraft(next); service.saveUpdateDraft(day.id, next); setError(''); };
    const setTask = (id: string, values: Partial<UpdateInput['tasks'][number]>) => change({ ...draft, tasks: draft.tasks.map(t => t.id === id ? { ...t, ...values } : t) });
    function review() { try {
        appendSnapshot(day, draft, { now: service.clock.now(), id: () => 'preview-only' });
        setPreview(true);
        setError('');
    }
    catch (e) {
        setError((e as Error).message);
    } }
    function submit() { try {
        service.update(day.id, draft);
        onDone();
    }
    catch (e) {
        setError((e as Error).message);
    } }
    const reviewMode = type === 'close' || type === 'correction';
    return <form onSubmit={e => { e.preventDefault(); if (preview)
        submit();
    else
        review(); }}>
    {!preview ? <>
      <p className="muted compact">{type === 'close' ? 'Confirm where things stand. It’s fine to leave tasks unfinished.' : type === 'correction' ? 'Your first review stays in the timeline. Explain what changed.' : 'Where are your commitments now?'}</p>
      <div className="update-tasks">{draft.tasks.map((task, i) => { const original = day.commitments[i]; const revised = task.currentTitle.trim() !== original.title; const newlyRevised = task.currentTitle !== existing.tasks[i].currentTitle; return <section className="update-task" key={task.id}><h3><span className="task-number">{i + 1}</span>{task.currentTitle || original.title}</h3><label className="sr-only" htmlFor={`status-${i}`}>Status for commitment {i + 1}</label><select id={`status-${i}`} value={task.status} onChange={e => setTask(task.id, { status: e.target.value as TaskStatus, originalFulfilled: e.target.value === 'done' ? task.originalFulfilled : false })}>{Object.entries(statusLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select><details className="revision-editor" open={newlyRevised || undefined}><summary>Revise commitment wording</summary><label htmlFor={`revision-${i}`}>Current wording</label><input id={`revision-${i}`} value={task.currentTitle} onChange={e => setTask(task.id, { currentTitle: e.target.value, originalFulfilled: false })}/><p className="original-copy">Original: {original.title}</p>{newlyRevised && <><label htmlFor={`reason-${i}`}>Why the change? <span>optional</span></label><input id={`reason-${i}`} value={task.revisionReason} onChange={e => setTask(task.id, { revisionReason: e.target.value })}/></>}</details>{revised && task.status === 'done' && <div className="fulfillment-question"><p>Did this also fulfill your original commitment?</p><label className="checkbox-label"><input type="checkbox" checked={task.originalFulfilled} onChange={e => setTask(task.id, { originalFulfilled: e.target.checked })}/> Yes, the original commitment was fulfilled</label><p className="caption">{task.originalFulfilled ? 'This counts toward your original completion ring.' : 'The revised task is done. The original does not count as fulfilled.'}</p></div>}</section>; })}</div>
      <section className="bonus-editor"><div className="section-heading"><h3>Bonus accomplishments</h3><span className="caption">Outside the ring</span></div>{draft.bonus.map((bonus, i) => <div className="bonus-field" key={bonus.id}>{existing.bonus.some(b => b.id === bonus.id) ? <p>{bonus.title}</p> : <div className="inline-field"><input aria-label={`Bonus accomplishment ${i + 1}`} placeholder="Something else you did" value={bonus.title} onChange={e => change({ ...draft, bonus: draft.bonus.map(b => b.id === bonus.id ? { ...b, title: e.target.value } : b) })}/><button className="icon-button" type="button" aria-label={`Remove new bonus ${i + 1}`} onClick={() => change({ ...draft, bonus: draft.bonus.filter(b => b.id !== bonus.id) })}><X size={16}/></button></div>}<select aria-label={`Status for bonus ${i + 1}`} value={bonus.status} onChange={e => change({ ...draft, bonus: draft.bonus.map(b => b.id === bonus.id ? { ...b, status: e.target.value as TaskStatus } : b) })}>{Object.entries(statusLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></div>)}{draft.bonus.length < 10 && <button type="button" className="text-button" onClick={() => change({ ...draft, bonus: [...draft.bonus, { id: service.clock.id(), title: '', status: 'done' }] })}><Plus size={16}/> Add a bonus</button>}</section>
      {type === 'checkin' && <><label className="field-label" htmlFor="slot">Check-in slot</label><select id="slot" value={draft.slotId} onChange={e => change({ ...draft, slotId: e.target.value })}><option value="">Unscheduled</option>{day.slots.map(s => <option value={s.id} key={s.id}>{s.localTime}</option>)}</select><p className="caption">A slot counts once, even if you check in again.</p></>}
      <label className="field-label" htmlFor="update-note">{reviewMode ? 'Review note' : 'Update note'} <span>optional</span></label><textarea id="update-note" rows={2} placeholder="A short note, if you have one." value={draft.note} onChange={e => change({ ...draft, note: e.target.value })}/><span className="counter align-right">{codePoints(draft.note)}/1000</span>
      {reviewMode && <div className="reflection-fields">{([['wentWell', 'What went well?'], ['gotInWay', 'What got in the way?'], ['carryForward', 'What will you carry forward?']] as const).map(([key, label]) => <div key={key}><label className="field-label" htmlFor={`reflection-${key}`}>{label} <span>optional</span></label><textarea id={`reflection-${key}`} rows={2} value={draft.reflection[key]} onChange={e => change({ ...draft, reflection: { ...draft.reflection, [key]: e.target.value } })}/></div>)}</div>}
      {type === 'correction' && <><label className="field-label" htmlFor="correction-reason">Reason for correction <span>required</span></label><textarea id="correction-reason" rows={2} value={draft.correctionReason} onChange={e => change({ ...draft, correctionReason: e.target.value })}/></>}
    </> : <div className="update-preview"><p className="eyebrow">{type.toUpperCase()} PREVIEW · PRACTICE</p><ul className="preview-statuses">{draft.tasks.map((t, i) => <li key={t.id}><strong>{t.currentTitle.trim()}</strong><span>{statusLabels[t.status]}{t.status === 'done' && t.currentTitle.trim() !== day.commitments[i].title && !t.originalFulfilled ? ' · original unfulfilled' : ''}</span></li>)}</ul>{draft.bonus.filter(b => b.status === 'done').length > 0 && <p className="caption">{draft.bonus.filter(b => b.status === 'done').length} bonus accomplishments · outside the ring</p>}{draft.note.trim() && <p className="pre-line">{draft.note.trim()}</p>}{reviewMode && Object.entries(draft.reflection).filter(([, value]) => value.trim()).map(([key, value]) => <p key={key} className="pre-line">{value.trim()}</p>)}{draft.correctionReason && <p>Correction: {draft.correctionReason}</p>}<p className="visibility-note">{type === 'close' ? 'This closes the practice day at its current completion. ' : ''}Saved locally. Nothing is published.</p></div>}
    <SavedLabel saving={persistence === 'saving'} temporary={persistence === 'temporary'}/><ErrorMessage message={error}/><Explain action={reviewMode ? 'review' : 'update'}/><div className="form-actions sticky-actions"><button type="button" className="button secondary" onClick={preview ? () => setPreview(false) : onDone}>{preview ? <><ArrowLeft size={15}/> Edit</> : 'Keep draft'}</button><button type="submit" className="button primary">{preview ? <>{submitLabels[type]} <Check size={17}/></> : <>Review {reviewMode ? 'day' : 'update'} <ArrowRight size={17}/></>}</button></div>
  </form>;
}
