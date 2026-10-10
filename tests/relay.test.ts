import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { RelayPool, matchesFilter, validateFilters } from '../src/infrastructure/relays/pool.ts';
import type { SocketPort } from '../src/infrastructure/relays/pool.ts';
import { boundedRelays, relayUrl } from '../src/infrastructure/relays/urls.ts';
import { RelayInformation } from '../src/infrastructure/relays/information.ts';
import { parseRelayInfo } from '../src/protocol/nips/11/information.ts';
import { encodePublic, decodePublic } from '../src/protocol/nips/19/identifiers.ts';
import { parsePublicInput, parsePublicRoute, publicPath } from '../src/protocol/nips/21/links.ts';
import { authorWriteRelays } from '../src/protocol/nips/65/relay-list.ts';
import { profileFrom, latestReplaceable } from '../src/protocol/nips/01/profiles.ts';
import { PublicService } from '../src/public/service.ts';
import type { PublicTarget, ReadResult, RelayFilter, RelayInfoPort, RelayReaderPort } from '../src/public/types.ts';
import type { SignedEvent, UnsignedEvent } from '../src/domain/ports/index.ts';
import { schnorr } from '../vendor/noble-secp256k1/compiled/index.js';
import { eventHash, hexToBytes, bytesToHex } from '../src/protocol/nips/01/events.ts';
import { progress } from '../src/domain/accountability/rules.ts';

const corpus = JSON.parse(fs.readFileSync('src/learning/fixtures/corpus.json', 'utf8'));
const events = corpus.events as Record<string, SignedEvent>, now = corpus.referenceNow;
const relay = 'wss://relay.damus.io';
class FakeSocket extends EventTarget implements SocketPort {
    readyState = 0; sent: unknown[][] = []; closed = 0;
    respond: (frame: unknown[], socket: FakeSocket) => void;
    constructor(respond: (frame: unknown[], socket: FakeSocket) => void = () => {}) { super(); this.respond = respond; queueMicrotask(() => { if (!this.closed) { this.readyState = 1; this.dispatchEvent(new Event('open')); } }); }
    send(data: string): void { const frame = JSON.parse(data); this.sent.push(frame); this.respond(frame, this); }
    message(frame: unknown[]): void { this.dispatchEvent(Object.assign(new Event('message'), { data: JSON.stringify(frame) })); }
    close(): void { this.closed++; this.readyState = 3; this.dispatchEvent(new Event('close')); }
}
const controller = () => new AbortController();
function poolFor(reply: FakeSocket['respond'], options: ConstructorParameters<typeof RelayPool>[0] = {}) {
    const sockets: FakeSocket[] = []; const pool = new RelayPool({ timeoutMs: 1000, socket: () => { const s = new FakeSocket(reply); sockets.push(s); return s; }, ...options }); return { pool, sockets };
}
const eose = (frame: unknown[], socket: FakeSocket) => { if (frame[0] === 'REQ') socket.message(['EOSE', frame[1]]); };

test('NIP-19 matches official npub and nprofile examples', () => {
    const key = '3bf0c63fcb93463407af97a5e5ee64fa883d107ef9e558472c4eb9aaaefa459d';
    const npub = 'npub180cvv07tjdrrgpa0j7j7tmnyl2yr6yr7l8j4s3evf6u64th6gkwsyjh6w6';
    assert.equal(encodePublic('npub', key), npub); assert.deepEqual(decodePublic(npub), { type: 'profile', pubkey: key, relays: [] });
    const example = 'nprofile1qqsrhuxx8l9ex335q7he0f09aej04zpazpl0ne2cgukyawd24mayt8gpp4mhxue69uhhytnc9e3k7mgpz4mhxue69uhkg6nzv9ejuumpv34kytnrdaksjlyr9p';
    assert.deepEqual(decodePublic(example), { type: 'profile', pubkey: key, relays: ['wss://r.x.com','wss://djbas.sadkb.com'] });
    const other = '7e7e9c42a91bfef19fa929e5fda1b72e0ebc1a4c1141673e2794234d86addf4e';
    assert.equal(encodePublic('npub', other), 'npub10elfcs4fr0l0r8af98jlmgdh9c8tcxjvz9qkw038js35mp4dma8qzvjptg');
});
test('public IDs reject checksum errors, mixed case, malformed data and secrets', () => {
    const note = encodePublic('note', events.plan.id); assert.equal((decodePublic(note) as { id: string }).id, events.plan.id);
    assert.throws(() => decodePublic(note.slice(0,-1) + (note.endsWith('q') ? 'p' : 'q')), /checksum/);
    assert.throws(() => decodePublic('N' + note.slice(1)), /Invalid/);
    assert.throws(() => parsePublicInput('nsec1anything'), /private key/);
    assert.throws(() => parsePublicInput('bunker://anything?secret=never-log'), /private key/);
    assert.throws(() => decodePublic('npub1' + 'q'.repeat(6000)), /Invalid/);
});
test('NIP-21 routes round-trip public links, preserve bounded hints and reject route type mismatch', () => {
    const target: PublicTarget = { type: 'event', id: events.plan.id, author: events.plan.pubkey, hints: [relay,'wss://nos.lol'] };
    assert.deepEqual(parsePublicRoute(publicPath(target)), target);
    assert.equal(parsePublicInput('nostr:' + encodePublic('note', events.plan.id)).type, 'event');
    assert.throws(() => parsePublicRoute('/public/profile/' + encodePublic('note', events.plan.id)), /different type/);
    assert.equal(parsePublicRoute('/people').type, 'feed');
});
test('relay URLs reject credentials, insecure/local endpoints and oversized destination sets', () => {
    for (const url of ['ws://relay.damus.io','wss://localhost','wss://127.0.0.1','wss://192.168.1.1','wss://[::1]','wss://10.0.0.1','wss://user:pass@relay.damus.io','wss://relay.damus.io?secret=x','wss://relay.damus.io#x','wss://relay.damus.io:8443']) assert.equal(relayUrl(url), null, url);
    assert.equal(relayUrl(relay + '/'), relay); assert.equal(boundedRelays(Array.from({length:20},(_,i)=>`wss://relay${i}.public.net`)).length, 8);
});
test('NIP-65 routes author reads to write relays and ignores invalid/read-only tags', () => {
    const event = { ...events.plan, kind: 10002, tags: [['r',relay],['r','wss://nos.lol','read'],['r','wss://relay.primal.net','write'],['r','wss://127.0.0.1'],['r',relay]] };
    assert.deepEqual(authorWriteRelays(event), [relay,'wss://relay.primal.net']);
});
test('profiles use safe text/fallbacks and deterministic replaceable selection', () => {
    const a = { ...events.plan, kind: 0, content: JSON.stringify({ name: '<script>text</script>', about: 'a'.repeat(600), picture: 'https://tracker.test/x' }) };
    const b = { ...a, id: '0'.repeat(64) };
    assert.equal(latestReplaceable([a,b], 0, a.pubkey, now)!.id, b.id);
    assert.equal(profileFrom(a,a.pubkey).name, '<script>text</script>'); assert.equal(profileFrom(a,a.pubkey).about.length, 500);
    assert.equal(profileFrom({ ...a, content: 'bad JSON' },a.pubkey).about, '');
    assert.equal(latestReplaceable([{ ...a, created_at: now + 301 }],0,a.pubkey,now), null);
});
test('filter contract requires bounds, exact hex IDs, and client-side matching', () => {
    assert.throws(() => validateFilters([{ kinds:[1], limit: 1000 }]), /limit/);
    assert.throws(() => validateFilters([{ authors:['npub123'], limit: 20 }]), /hex/);
    assert.equal(matchesFilter(events.plan,{ kinds:[1], '#t':['goalstr-v1'], authors:[events.plan.pubkey], limit:20 }),true);
    assert.equal(matchesFilter(events.plan,{ ids:[events.rest.id], limit:1 }),false);
});
test('relay pool verifies arrivals, rejects mismatches, deduplicates and drains crypto before EOSE', async () => {
    const {pool,sockets} = poolFor((frame,s) => { if (frame[0] !== 'REQ') return; s.message(['EVENT','wrong-sub',events.plan]); s.message(['EVENT',frame[1],events.checkin]); s.message(['EVENT',frame[1],events.plan]); s.message(['EVENT',frame[1],events.plan]); s.message(['EVENT',frame[1],events.badSignature]); s.message(['EOSE',frame[1]]); });
    const result = await pool.query([{ ids:[events.plan.id], limit:1 }],[relay],controller().signal);
    assert.equal(result.events.length,1); assert.equal(result.observations[0].status,'eose'); assert.equal(result.observations[0].rejected,2); assert.ok(sockets[0].sent.some(f=>f[0]==='CLOSE')); pool.dispose();
});
test('one websocket is shared across concurrent subscriptions and sightings merge across relays', async () => {
    const {pool,sockets} = poolFor((frame,s) => { if(frame[0]==='REQ'){s.message(['EVENT',frame[1],events.plan]);s.message(['EOSE',frame[1]]);} });
    const signal = controller().signal;
    const [a,b] = await Promise.all([pool.query([{ ids:[events.plan.id],limit:1 }],[relay],signal),pool.query([{ ids:[events.plan.id],limit:1 }],[relay,'wss://nos.lol'],signal)]);
    assert.equal(sockets.length,2); assert.equal(a.events.length,1); assert.equal(b.events[0].relays.length,2); pool.dispose();
});
test('no EOSE times out and preserves observed verified events', async () => {
    const {pool} = poolFor((frame,s)=>{if(frame[0]==='REQ')s.message(['EVENT',frame[1],events.plan]);},{timeoutMs:45});
    const result=await pool.query([{ ids:[events.plan.id],limit:1 }],[relay],controller().signal);
    assert.equal(result.observations[0].status,'timeout');assert.equal(result.events.length,1);pool.dispose();
});
test('relay refusal/authentication are explicit and raw connection secrets are redacted', async () => {
    for(const frameType of ['AUTH','CLOSED']){
        const {pool}=poolFor((frame,s)=>{if(frame[0]==='REQ')s.message(frameType==='AUTH'?['AUTH','challenge']:['CLOSED',frame[1],'bunker://server?secret=do-not-log']);});
        const result=await pool.query([{kinds:[1],limit:20}],[relay],controller().signal);
        assert.equal(result.observations[0].status,frameType==='AUTH'?'auth_required':'closed');assert.ok(!result.observations[0].reason.includes('do-not-log'));pool.dispose();
    }
});
test('disconnect gets at most one jittered retry within the original query deadline', async () => {
    let count=0; const sockets:FakeSocket[]=[];
    const pool=new RelayPool({timeoutMs:500,random:()=>0,socket:()=>{const attempt=++count;const s=new FakeSocket((frame,s)=>{if(frame[0]==='REQ'){if(attempt===1)s.close();else s.message(['EOSE',frame[1]]);}});sockets.push(s);return s;}});
    const result=await pool.query([{kinds:[1],limit:20}],[relay],controller().signal);
    assert.equal(count,2);assert.equal(result.observations[0].status,'eose');pool.dispose();
});
test('cancellation/unmount closes queries and prevents delayed verifier ingestion', async () => {
    const {pool,sockets}=poolFor((frame,s)=>{if(frame[0]==='REQ')s.message(['EVENT',frame[1],events.plan]);},{verify:async()=>{await new Promise(r=>setTimeout(r,25));return {event:events.plan,reason:''};}});
    const control=controller(),work=pool.query([{ids:[events.plan.id],limit:1}],[relay],control.signal);
    await new Promise(r=>setTimeout(r,2)); control.abort(); pool.dispose(); const result=await work;
    assert.equal(result.observations[0].status,'cancelled');assert.equal(result.events.length,0);assert.equal(sockets[0].readyState,3);
});
test('relay caps stop verification work and disclose partial retrieval', async () => {
    const {pool}=poolFor((frame,s)=>{if(frame[0]==='REQ'){s.message(['EVENT',frame[1],events.plan]);s.message(['EVENT',frame[1],events.rest]);s.message(['EOSE',frame[1]]);}},{maxEvents:1});
    const result=await pool.query([{kinds:[1],limit:20}],[relay],controller().signal);assert.equal(result.events.length,1);assert.equal(result.observations[0].status,'capped');pool.dispose();
});
test('the pool never opens more than eight active sockets and rejects unrequested large frames', async () => {
    const {pool,sockets}=poolFor((frame,s)=>{if(frame[0]==='REQ'){s.dispatchEvent(Object.assign(new Event('message'),{data:'x'.repeat(100000)}));s.message(['EOSE',frame[1]]);}});
    const result=await pool.query([{kinds:[1],limit:20}],Array.from({length:12},(_,i)=>`wss://relay${i}.public.net`),controller().signal);
    assert.equal(sockets.length,8);assert.equal(result.observations.length,8);assert.equal(result.events.length,0);pool.dispose();
});
test('NIP-11 parses optional metadata and honors omission/size/CORS failures without blocking transport', async () => {
    const parsed=parseRelayInfo({name:'A relay',supported_nips:[1,11,'wrong'],limitation:{max_message_length:4096,auth_required:true}},relay);
    assert.deepEqual(parsed.supportedNips,[1,11]);assert.equal(parsed.maxMessageLength,4096);assert.equal(parsed.authRequired,true);
    const failing=new RelayInformation(async()=>{throw new Error('CORS');});assert.equal((await failing.read(relay,controller().signal)).available,false);
    let options:RequestInit|undefined;
    const good=new RelayInformation(async(_url,init)=>{options=init;return new Response(JSON.stringify({name:'Test'}));});assert.equal((await good.read(relay,controller().signal)).name,'Test');assert.equal(options!.credentials,'omit');assert.equal(options!.redirect,'error');
    const huge=new RelayInformation(async()=>new Response('x'.repeat(65537)));assert.equal((await huge.read(relay,controller().signal)).available,false);
});

const info: RelayInfoPort={read:async r=>({relay:r,available:false,name:'',description:'',supportedNips:[],maxMessageLength:null,authRequired:false,paymentRequired:false,reason:'Unavailable'})};
class FakeReader implements RelayReaderPort {
    calls:{filters:RelayFilter[];relays:string[]}[]=[];disposed=false;data:SignedEvent[];status:'eose'|'timeout'='eose';
    constructor(data:SignedEvent[]){this.data=data;}
    async query(filters:RelayFilter[],relays:string[],signal:AbortSignal):Promise<ReadResult>{this.calls.push({filters,relays});const data=this.data.filter(e=>filters.some(f=>matchesFilter(e,f))).sort((a,b)=>b.created_at-a.created_at||a.id.localeCompare(b.id)).slice(0,Math.max(...filters.map(f=>f.limit)));return {events:signal.aborted?[]:data.map(event=>({event,relays})),observations:relays.map(relay=>({relay,status:signal.aborted?'cancelled':this.status,received:data.length,rejected:0,reason:''}))};}
    dispose(){this.disposed=true;}
}
async function metadata(kind:number,content:string,tags:string[][]=[]):Promise<SignedEvent>{
    // Public fixture identity, test-only; never a runtime signer.
    const unsigned:UnsignedEvent={pubkey:events.plan.pubkey,kind,created_at:now-10,content,tags};const id=await eventHash(unsigned);return {...unsigned,id,sig:bytesToHex(await schnorr.signAsync(hexToBytes(id),hexToBytes('0'.repeat(63)+'3'),new Uint8Array(32)))};
}
test('public service fetches roots omitted by recent-update discovery and reconstructs full history',async()=>{
    class UpdatesFirst extends FakeReader { override async query(filters:RelayFilter[],relays:string[],signal:AbortSignal){const result=await super.query(filters,relays,signal);return filters[0]['#t']?{...result,events:result.events.filter(r=>r.event.id!==events.plan.id)}:result;} }
    const reader=new UpdatesFirst([events.plan,events.checkin,events.revision,events.close,events.correction]);const service=new PublicService(reader,info,()=>now);
    await service.start('/people',[relay]);const state=service.getSnapshot();assert.equal(state.cards.length,1);assert.equal(progress(state.cards[0].projection!.day!).percent,100);assert.ok(reader.calls.some(c=>c.filters.some(f=>!!f['#e'])));assert.equal(state.phase,'ready');service.dispose();assert.equal(reader.disposed,true);
    assert.ok(reader.calls.some(c=>c.filters.some(f=>f.ids?.includes(events.plan.id))));
});
test('public service opens update note links without login and resolves their root',async()=>{
    const reader=new FakeReader([events.plan,events.checkin,events.revision]);const service=new PublicService(reader,info,()=>now);
    await service.start(publicPath({type:'event',id:events.revision.id,hints:[]}),[relay]);assert.equal(service.getSnapshot().cards[0].id,events.plan.id);assert.equal(service.getSnapshot().cards[0].projection!.head!.record.event.id,events.revision.id);service.dispose();
});
test('public profile hydration uses signed metadata and author write relay routing',async()=>{
    const meta=await metadata(0,JSON.stringify({name:'Goalstr test author',about:'Public profile'}));const list=await metadata(10002,'',[['r','wss://relay.primal.net','write'],['r','wss://nos.lol','read']]);
    const reader=new FakeReader([events.plan,meta,list]);const service=new PublicService(reader,info,()=>now);
    await service.start(publicPath({type:'profile',pubkey:events.plan.pubkey,hints:[]}),[relay]);assert.equal(service.getSnapshot().targetProfile!.name,'Goalstr test author');assert.ok(reader.calls.some(c=>c.relays.includes('wss://relay.primal.net')));assert.ok(!service.getSnapshot().routedRelays.includes('wss://nos.lol'));service.dispose();
});
test('missing ancestry, deleted ancestors and competing updates stay visible in live projections',async()=>{
    for(const names of [['plan','missingParent'],['plan','checkin','revision','close','correction','deleteClose'],['plan','branchA','branchB']]){
        const service=new PublicService(new FakeReader(names.map(n=>events[n])),info,()=>now);await service.start('/people',[relay]);const state=service.getSnapshot();
        if(names.includes('missingParent')){assert.equal(state.phase,'partial');assert.ok(state.missingIds.includes('a'.repeat(64)));}
        if(names.includes('deleteClose')){assert.ok(state.cards[0].projection!.deletedIds.includes(events.close.id));assert.equal(state.phase,'partial');}
        if(names.includes('branchA'))assert.equal(state.cards[0].projection!.branches.length,1);service.dispose();
    }
});
test('unsupported formats show readable fallback; invalid payload never changes progress',async()=>{
    const service=new PublicService(new FakeReader([events.plan,events.contradictoryText,events.unsupported]),info,()=>now);await service.start('/people',[relay]);const state=service.getSnapshot();assert.equal(progress(state.cards.find(c=>c.id===events.plan.id)!.projection!.day!).percent,0);assert.ok(state.rejected>=1);service.dispose();
});
test('empty/disconnected states are honest and invalid public inputs make no network calls',async()=>{
    const reader=new FakeReader([]),service=new PublicService(reader,info,()=>now);await service.start('/people',[relay]);assert.equal(service.getSnapshot().phase,'ready');assert.equal(service.getSnapshot().cards.length,0);
    reader.status='timeout';await service.start('/people',[relay]);assert.equal(service.getSnapshot().phase,'disconnected');const count=reader.calls.length;await service.start('/public/profile/nsec1anything',[relay]);assert.equal(service.getSnapshot().phase,'error');assert.equal(reader.calls.length,count);service.dispose();
});
test('updates without any retrievable root remain explicitly partial instead of inventing a day',async()=>{
    const service=new PublicService(new FakeReader([events.checkin]),info,()=>now);await service.start('/people',[relay]);assert.equal(service.getSnapshot().phase,'partial');assert.ok(service.getSnapshot().missingIds.includes(events.plan.id));assert.equal(service.getSnapshot().cards.length,0);service.dispose();
});
test('an author-deleted root is suppressed on a direct public day link',async()=>{
    const service=new PublicService(new FakeReader([events.plan,events.deleteRoot]),info,()=>now);await service.start(publicPath({type:'event',id:events.plan.id,hints:[]}),[relay]);const card=service.getSnapshot().cards[0];assert.equal(card.projection!.day,null);assert.ok(card.projection!.warnings.some(w=>/deletion of this root/.test(w)));service.dispose();
});
test('same-second page limits stop without silently skipping history',async()=>{
    const data=await Promise.all(Array.from({length:20},(_,i)=>metadata(1,`Future format ${i}`,[['t','goalstr'],['accountability','3','plan','{}']])));
    const service=new PublicService(new FakeReader(data),info,()=>now);await service.start('/people',[relay]);assert.equal(service.getSnapshot().cards.length,20);assert.equal(service.getSnapshot().canLoadMore,true);await service.loadMore();assert.equal(service.getSnapshot().cards.length,20);assert.equal(service.getSnapshot().canLoadMore,false);assert.ok(service.getSnapshot().warnings.some(w=>/crowded timestamp/.test(w)));service.dispose();
});
test('dispose aborts in-flight work and suppresses stale view updates',async()=>{
    class Waiting extends FakeReader{override query(_f:RelayFilter[],relays:string[],signal:AbortSignal):Promise<ReadResult>{return new Promise(resolve=>signal.addEventListener('abort',()=>resolve({events:[],observations:[{relay:relays[0],status:'cancelled',received:0,rejected:0,reason:''}]}),{once:true}));}}
    const reader=new Waiting([]),service=new PublicService(reader,info,()=>now);let updates=0;service.subscribe(()=>updates++);const work=service.start('/people',[relay]);service.dispose();const before=updates;await work;assert.equal(updates,before);assert.equal(reader.disposed,true);
});
