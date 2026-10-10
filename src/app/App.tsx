import { Component, Suspense, lazy } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { ArrowLeft, ArrowRight, ArrowUpRight, BookOpen, CalendarDays, CheckCircle2, CircleDot, Coffee, Home, Settings, UserRound, Users } from 'lucide-react';
import { usePractice } from './context.tsx';
import { navigate, useNow, useRoute } from './router.tsx';
import { current } from '../domain/accountability/rules.ts';
import { addDays, localParts, validDate } from '../domain/accountability/time.ts';
import { exampleDay } from '../practice/example.ts';
import { PlanComposer } from '../features/today/PlanComposer.tsx';
import { DayView } from '../features/today/DayView.tsx';
import { HistoryView, WeekStrip } from '../features/history/HistoryView.tsx';
import { ProfileView } from '../features/profile/ProfileView.tsx';
import { SettingsView } from '../features/settings/SettingsView.tsx';
import { LearnView } from '../learning/LearnView.tsx';
import { Link, SavedLabel, formatDate } from '../ui/components.tsx';
import { GoalstrMark } from '../ui/GoalstrMark.tsx';
import styles from './App.module.css';
const LiveView = lazy(() => import('../features/live/LiveView.tsx').then(module => ({ default: module.LiveView })));
const PublicView = lazy(() => import('../features/public/PublicView.tsx').then(module => ({ default: module.PublicView })));
const ProtocolView = lazy(() => import('../learning/ProtocolView.tsx').then(module => ({ default: module.ProtocolView }))); 
function Welcome() { const { service } = usePractice(); return <div className="welcome"><p className="eyebrow">GOALSTR · ONE DAY AT A TIME</p><h1>Small goals.<br />Quick check-ins.<br /><span>An honest review.</span></h1><p className="welcome-copy">Choose a few things to finish. Track what happens.<br />Start with a practice day. No account needed.</p><div className="welcome-actions"><button className="button primary" onClick={() => { service.start(); navigate('/today'); }}>Try a practice day <ArrowRight size={18}/></button><Link to="/example" className="button secondary">View an example <ArrowUpRight size={17}/></Link></div><div className="ritual-cards"><div><CircleDot size={24}/><strong>1. Make a small plan</strong><p>Up to three categories. Five goals each. Start with just a few.</p></div><div><CheckCircle2 size={24}/><strong>2. Check in</strong><p>Mark progress. Explain a change. Keep the original visible.</p></div><div><Coffee size={24}/><strong>3. Review your day</strong><p>Close it honestly, even when nothing got done.</p></div></div><p className="caption">Practice stays local. Connect a browser signer when you’re ready to publish.</p><Link to="/people" className="text-link"><Users size={16}/> Browse public days <ArrowRight size={15}/></Link><Link to="/learn" className="text-link"><BookOpen size={16}/> Follow the build</Link></div>; }
class Boundary extends Component<{
    children: ReactNode;
}, {
    failed: boolean;
}> {
    state = { failed: false };
    static getDerivedStateFromError() { return { failed: true }; }
    componentDidCatch(_error: Error, _info: ErrorInfo) { }
    render() { return this.state.failed ? <div className="fatal"><h1>The view could not open.</h1><p>Your persisted practice data has not been cleared.</p><button className="button primary" onClick={() => location.reload()}>Reload the app</button></div> : this.props.children; }
}
export function App() { return <Boundary><Shell /></Boundary>; }
function Shell() {
    const { document, persistence, message, service } = usePractice();
    const route = useRoute();
    const now = useNow();
    const path = route.split('?')[0];
    const today = localParts(now, document.preferences.timezone).date;
    const queryDate = new URLSearchParams(route.split('?')[1] ?? '').get('date');
    const date = queryDate && validDate(queryDate) ? queryDate : today;
    const isToday = path === '/' || path === '/today';
    const welcome = isToday && !document.started;
    const isLive = path === '/live';
    const isPublic = path === '/people' || path.startsWith('/public/');
    const isLearn = path === '/learn' || path === '/protocol';
    const nav = [['/today', 'Today', Home], ['/people', 'People', Users], ['/history', 'History', CalendarDays], ['/profile', 'Profile', UserRound]] as const;
    const olderOpen = Object.values(document.days).filter(d => d.date < today && d.mode === 'plan' && !current(d).closed).sort((a, b) => b.date.localeCompare(a.date))[0];
    let page: ReactNode;
    if (persistence === 'loading')
        page = <div className="loading" role="status">Opening Goalstr…</div>;
    else if (welcome)
        page = <Welcome />;
    else if (path === '/example')
        page = <><div className="example-toolbar"><Link to={document.started ? '/today' : '/'} className="back-link"><ArrowLeft size={16}/> {document.started ? 'My practice day' : 'Back'}</Link><button className="button secondary" onClick={() => { service.start(); navigate('/today'); }}>Try my own day <ArrowRight size={16}/></button></div><DayView day={exampleDay(now, document.preferences.timezone)} example/></>;
    else if (isLive)
        page = <Suspense fallback={<p role="status">Opening public goals…</p>}><LiveView /></Suspense>;
    else if (isToday)
        page = <>{date !== today && <Link to="/today" className="back-link"><ArrowLeft size={16}/> Back to today</Link>}{date === today && olderOpen && <Link to={`/practice/day/${olderOpen.id}`} className="old-day-prompt"><ClockNotice /> {olderOpen.date === addDays(today, -1) ? 'Yesterday is still open.' : `${formatDate(olderOpen.date, { month: 'short', day: 'numeric' })} is still open.`} Review it when you’re ready. <ArrowRight size={16}/></Link>}{document.days[date] ? <DayView key={document.days[date].id} day={document.days[date]}/> : <PlanComposer key={date} date={date} tomorrow={date > today}/>}<WeekStrip /></>;
    else if (path.startsWith('/practice/day/')) {
        const id = path.slice('/practice/day/'.length);
        const day = Object.values(document.days).find(d => d.id === id);
        page = day ? <><Link to="/history" className="back-link"><ArrowLeft size={16}/> History</Link><DayView key={day.id} day={day}/></> : <section className="empty-state"><h1>This practice day isn’t here.</h1><Link to="/history" className="text-link">Open History <ArrowRight size={15}/></Link></section>;
    }
    else if (path === '/history')
        page = <HistoryView />;
    else if (path === '/profile')
        page = <ProfileView />;
    else if (path === '/settings')
        page = <SettingsView />;
    else if (isPublic)
        page = <Suspense fallback={<p role="status">Opening public Nostr…</p>}><PublicView key={route} route={route}/></Suspense>;
    else if (path === '/protocol')
        page = <Suspense fallback={<p role="status">Opening the protocol lab…</p>}><ProtocolView /></Suspense>;
    else if (path === '/learn')
        page = <LearnView />;
    else
        page = <section className="empty-state"><h1>That page isn’t here yet.</h1><Link to="/today" className="text-link">Go to Today <ArrowRight size={15}/></Link></section>;
    return <div className={styles.shell}><a href="#main" className="skip-link">Skip to content</a><header className={styles.header}><Link to={document.started ? '/today' : '/'} className={styles.brand} label="Goalstr home"><span className={styles.brandMark}><GoalstrMark size={34}/></span>Goalstr</Link><div className={styles.headerRight}><span className="mode-badge">{isLive ? 'Live · public' : isPublic ? 'Public · read-only' : path === '/example' ? 'Example' : 'Practice'}<span className="mode-dot"/></span>{document.started && !isPublic && persistence !== 'loading' && <SavedLabel saving={persistence === 'saving'} temporary={persistence === 'temporary'}/>}<Link to="/live" className="icon-button connect-button" label="Connect Nostr"><UserRound size={18}/></Link><Link to="/settings" className="icon-button" label="Settings"><Settings size={19}/></Link></div></header>{message && <div className="storage-notice" role="status">{message} <Link to="/profile" className="text-link">Export data</Link></div>}{(document.started || isPublic || isLive) && !isLearn && <nav className={styles.navigation} aria-label="Main navigation">{nav.map(([href, label, Icon]) => <Link to={href} className={`${styles.navItem} ${(path === href || (href === '/people' && isPublic) || (href === '/today' && (isToday || isLive || path.startsWith('/practice/day/')))) ? styles.navActive : ''}`} key={href}><Icon size={20}/><span>{label}</span></Link>)}</nav>}<main id="main" className={`${styles.main} ${welcome ? styles.welcomeMain : ''}`} tabIndex={-1}>{(isToday || isLive) && <div className="workspace-switch" aria-label="Goal workspace"><Link to="/today" className={!isLive ? 'active' : ''}>Practice <span>On this device</span></Link><Link to="/live" className={isLive ? 'active' : ''}>Live <span>Public on Nostr</span></Link></div>}{page}</main><footer className={styles.footer}><span>Goalstr · Small goals. Honest progress.</span><Link to="/learn">Stage 4 · how it works <ArrowUpRight size={13}/></Link></footer></div>;
}
function ClockNotice() { return <CircleDot size={17}/>; }
