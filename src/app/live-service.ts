import { BrowserSigner } from '../protocol/nips/07/browser-signer.ts';
import { RelayPool } from '../infrastructure/relays/pool.ts';
import { IndexedLiveStore } from '../infrastructure/storage/live-document.ts';
import { LiveService } from '../live/service.ts';
export function createLiveService(): LiveService { const pool=new RelayPool(); return new LiveService(new IndexedLiveStore(),new BrowserSigner(),pool,pool,{ now:()=>Math.floor(Date.now()/1000),id:()=>crypto.randomUUID() }); }
