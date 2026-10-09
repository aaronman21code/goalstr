import { createContext, useContext, useEffect, useSyncExternalStore } from 'react';
import type { ReactNode } from 'react';
import type { PracticeService } from '../practice/service.ts';
const ServiceContext = createContext<PracticeService | null>(null);
export function ServiceProvider({ service, children }: {
    service: PracticeService;
    children: ReactNode;
}) { useEffect(() => { void service.initialize(); }, [service]); return <ServiceContext.Provider value={service}>{children}</ServiceContext.Provider>; }
export function usePractice() { const service = useContext(ServiceContext); if (!service)
    throw new Error('Missing practice service.'); const snapshot = useSyncExternalStore(service.subscribe, service.getSnapshot); return { service, ...snapshot }; }
