import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ServiceProvider } from './app/context.tsx';
import { PracticeService } from './practice/service.ts';
import { IndexedDocumentStore } from './infrastructure/storage/indexed-document.ts';
import { App } from './app/App.tsx';
import './ui/global.css';
const service = new PracticeService(new IndexedDocumentStore(), { now: () => Math.floor(Date.now() / 1000), id: () => crypto.randomUUID() }, Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC');
createRoot(document.getElementById('root')!).render(<StrictMode><ServiceProvider service={service}><App /></ServiceProvider></StrictMode>);
