import { createContext, useContext, useSyncExternalStore } from 'react';
import type { ReactNode } from 'react';
import type { LiveService } from '../live/service.ts';
const LiveContext = createContext<LiveService | null>(null);
export function LiveProvider({ service, children }: { service: LiveService; children: ReactNode }) { return <LiveContext.Provider value={service}>{children}</LiveContext.Provider>; }
export function useLive() { const service=useContext(LiveContext); if (!service) throw new Error('Missing Live service.'); return { service,...useSyncExternalStore(service.subscribe,service.getSnapshot) }; }
