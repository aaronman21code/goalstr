import { GoalstrMark } from '../../ui/GoalstrMark.tsx';
import { useRef, useState } from 'react';
import { ArrowRight, BookOpen, Download, Settings, Upload } from 'lucide-react';
import { usePractice } from '../../app/context.tsx';
import { current } from '../../domain/accountability/rules.ts';
import { parseDocument } from '../../infrastructure/storage/document-schema.ts';
import { downloadJson } from '../../infrastructure/download.ts';
import type { AppDocument } from '../../practice/document.ts';
import { ErrorMessage, Link, Modal } from '../../ui/components.tsx';
export function ProfileView() {
    const { service, document } = usePractice();
    const input = useRef<HTMLInputElement>(null);
    const [error, setError] = useState('');
    const [incoming, setIncoming] = useState<AppDocument | null>(null);
    const days = Object.values(document.days);
    return <><div className="page-heading"><div><p className="eyebrow">A PLACE TO PRACTICE</p><h1>Your corner.</h1><p className="muted">Local for now. Your Nostr identity comes in a later stage.</p></div></div><section className="card profile-card"><div className="profile-avatar" aria-hidden="true"><GoalstrMark size={40}/></div><div><h2>You, in Practice</h2><p className="muted compact">No account or private key needed.</p></div><div className="profile-stats"><div><strong>{days.filter(d => d.mode === 'plan' && current(d).closed).length}</strong><span>days closed</span></div><div><strong>{days.filter(d => d.mode === 'rest').length}</strong><span>rest days</span></div></div></section><div className="menu-list"><Link to="/protocol" className="menu-row"><BookOpen size={19}/><div><strong>Inspect the event format</strong><span>Signed examples, progress, and conflicting versions</span></div><ArrowRight size={17}/></Link><Link to="/settings" className="menu-row"><Settings size={19}/><div><strong>Settings</strong><span>Timezone and reminder times</span></div><ArrowRight size={17}/></Link><Link to="/learn" className="menu-row"><BookOpen size={19}/><div><strong>How Goalstr is being built</strong><span>Protocol blocks, lessons, and next stages</span></div><ArrowRight size={17}/></Link><button className="menu-row" onClick={() => downloadJson(document, 'goalstr-practice-backup.json')}><Download size={19}/><div><strong>Export practice data</strong><span>Download your days and unsent drafts</span></div><ArrowRight size={17}/></button><button className="menu-row" onClick={() => input.current?.click()}><Upload size={19}/><div><strong>Restore a backup</strong><span>Replace local practice data from an export</span></div><ArrowRight size={17}/></button><input type="file" className="sr-only" ref={input} accept="application/json,.json" aria-label="Practice backup file" onChange={async (e) => { const file = e.target.files?.[0]; if (!file)
        return; try {
        if (file.size > 5 * 1024 * 1024)
            throw new Error('Choose a backup smaller than 5 MB.');
        setIncoming(parseDocument(JSON.parse(await file.text())));
        setError('');
    }
    catch {
        setError('This backup is not a valid Stage 1 practice export. Your current data has not changed.');
    }
    finally {
        e.target.value = '';
    } }}/></div><ErrorMessage message={error}/><p className="caption profile-footer">Goalstr · Stage 2 · v0.2.0<br />Practice data is stored separately from future live Nostr data.</p>{incoming && <Modal title="Restore this practice backup?" onClose={() => setIncoming(null)}><p className="muted">This replaces all current practice days, drafts, and settings with {Object.keys(incoming.days).length} saved days from the backup.</p><div className="form-actions"><button className="button secondary" onClick={() => setIncoming(null)}>Keep current data</button><button className="button primary" onClick={() => { service.restore(incoming); setIncoming(null); }}>Restore backup</button></div></Modal>}</>;
}
