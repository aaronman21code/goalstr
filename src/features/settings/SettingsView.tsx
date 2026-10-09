import { useState } from 'react';
import { ArrowLeft, Check, Plus, Trash2, X } from 'lucide-react';
import { usePractice } from '../../app/context.tsx';
import { navigate } from '../../app/router.tsx';
import type { Preferences } from '../../domain/accountability/types.ts';
import { ErrorMessage, Link, Modal } from '../../ui/components.tsx';
export function SettingsView() {
    const { document, service, persistence } = usePractice();
    const [prefs, setPrefs] = useState<Preferences>(() => structuredClone(document.preferences));
    const [error, setError] = useState('');
    const [saved, setSaved] = useState(false);
    const [clear, setClear] = useState(false);
    function save() { try {
        service.setPreferences(prefs);
        setSaved(true);
        setError('');
    }
    catch (e) {
        setError((e as Error).message);
    } }
    return <><Link to="/profile" className="back-link"><ArrowLeft size={16}/> Profile</Link><div className="page-heading"><div><p className="eyebrow">KEEP IT USEFUL</p><h1>Settings</h1><p className="muted">Local preferences for your practice days.</p></div></div><section className="card"><h2>Timezone</h2><label className="field-label" htmlFor="timezone">IANA timezone</label><input id="timezone" list="timezones" value={prefs.timezone} onChange={e => { setPrefs({ ...prefs, timezone: e.target.value }); setSaved(false); }}/><datalist id="timezones">{['Asia/Kolkata', 'Asia/Calcutta', 'UTC', 'Europe/London', 'Europe/Berlin', 'America/New_York', 'America/Los_Angeles', 'Asia/Tokyo', 'Australia/Sydney'].map(zone => <option key={zone} value={zone}/>)}</datalist><button className="text-button" onClick={() => { setPrefs({ ...prefs, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone }); setSaved(false); }}>Use this device’s timezone</button><p className="caption">Existing days and drafts keep their original date and timezone.</p><div className="divider"/><h2>Check-in prompts</h2><p className="muted compact">Zero to four times. The prompts work while this app is open.</p><div className="time-fields">{prefs.checkinTimes.map((time, index) => <div key={index} className="inline-field"><label className="sr-only" htmlFor={`time-${index}`}>Check-in time {index + 1}</label><input type="time" id={`time-${index}`} value={time} onChange={e => { setPrefs({ ...prefs, checkinTimes: prefs.checkinTimes.map((t, i) => i === index ? e.target.value : t) }); setSaved(false); }}/><button className="icon-button" aria-label={`Remove check-in time ${index + 1}`} onClick={() => { setPrefs({ ...prefs, checkinTimes: prefs.checkinTimes.filter((_, i) => i !== index) }); setSaved(false); }}><X size={18}/></button></div>)}</div>{prefs.checkinTimes.length < 4 && <button className="text-button" onClick={() => { setPrefs({ ...prefs, checkinTimes: [...prefs.checkinTimes, '12:00'] }); setSaved(false); }}><Plus size={16}/> Add a check-in time</button>}<label className="field-label" htmlFor="review-time">Review time <span>optional</span></label><input type="time" id="review-time" value={prefs.reviewTime} onChange={e => { setPrefs({ ...prefs, reviewTime: e.target.value }); setSaved(false); }}/><p className="caption">Schedule changes apply to new plans. No automatic posts or background notifications.</p><ErrorMessage message={error}/><div className="form-actions"><button className="button primary" onClick={save}>Save preferences <Check size={16}/></button>{saved && <span className="caption" role="status">{persistence === 'temporary' ? 'Applied for this session.' : persistence === 'saving' ? 'Saving…' : 'Saved on this device.'}</span>}</div></section><section className="card danger-card"><h2>Practice data</h2><p className="muted">Days and unsent drafts live in this browser. Export a copy from Profile before clearing them.</p><button className="button danger" onClick={() => { setClear(true); setError(''); }}><Trash2 size={16}/> Clear practice data</button></section>{clear && <Modal title="Clear all practice data?" onClose={() => setClear(false)}><p className="muted">This removes practice days, drafts, and settings from this browser. It cannot be undone unless you have an exported backup.</p><ErrorMessage message={error}/><div className="form-actions"><button className="button secondary" onClick={() => setClear(false)}>Keep my data</button><button className="button danger" onClick={async () => { try {
        await service.reset();
        setClear(false);
        navigate('/today');
    }
    catch (e) {
        setError((e as Error).message);
    } }}>Clear all practice data</button></div></Modal>}</>;
}
