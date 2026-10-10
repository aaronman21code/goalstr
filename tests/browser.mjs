import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { matchesFilter } from '../src/infrastructure/relays/pool.ts';
import { encodePublic } from '../src/protocol/nips/19/identifiers.ts';
const require = createRequire(import.meta.url);
let playwright;
try { playwright = require('playwright'); } catch { if (process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES) playwright = require(path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES, 'playwright')); else throw new Error('Install browser tooling first: npm install --no-save --package-lock=false playwright@1.62.1'); }
const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:4175';
const server = process.env.TEST_BASE_URL ? null : spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', '4175', '--strictPort'], { stdio: 'pipe' });
const errors = []; let browser;
const output = process.env.TEST_OUTPUT_DIR || 'test-results'; await fs.mkdir(output, { recursive: true });
async function visible(locator) { await locator.waitFor({ state: 'visible', timeout: 10000 }); }
async function saved(page) { await page.waitForFunction(() => document.querySelector('.save-label')?.textContent?.includes('Saved on this device'), { timeout: 10000 }); }
async function checkWidth(page) { assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'No horizontal overflow'); }
async function newPage(options = {}) { const context = await browser.newContext({ viewport: { width: 360, height: 800 }, timezoneId: 'Asia/Kolkata', reducedMotion: 'reduce', ...options }); const page = await context.newPage(); page.on('pageerror', error => errors.push(error.message)); await page.clock.install({ time: new Date('2026-10-09T10:00:00Z') }); return { page, context }; }
try {
  for (let i = 0; i < 100; i++) { try { const res = await fetch(base); if (res.ok) break; } catch {} if (i === 99) throw new Error('Preview server did not start.'); await new Promise(resolve => setTimeout(resolve, 100)); }
  browser = await playwright.chromium.launch({ headless: true, args: ['--no-sandbox'] });
  {
    const { page, context } = await newPage(); const external = []; page.on('request', req => { if (!req.url().startsWith(base)) external.push(req.url()); });
    await page.goto(base + '/today'); await visible(page.getByRole('button', { name: 'Try a practice day' })); await checkWidth(page); await page.screenshot({ path: path.join(output, 'welcome-mobile.png'), fullPage: true });
    await page.getByRole('button', { name: 'Try a practice day' }).click(); await page.getByLabel('Commitment 1', { exact: true }).fill('Publish the landing page'); await saved(page); await page.reload(); assert.equal(await page.getByLabel('Commitment 1', { exact: true }).inputValue(), 'Publish the landing page');
    await page.getByRole('button', { name: 'Add a commitment' }).click(); await page.getByLabel('Commitment 2', { exact: true }).fill('Walk for 30 minutes'); await page.getByRole('button', { name: 'Add a commitment' }).click(); await page.getByLabel('Commitment 3', { exact: true }).fill('Read chapter four'); await checkWidth(page);
    await page.getByRole('button', { name: 'Review my plan' }).click(); await page.getByRole('button', { name: 'Start my practice day' }).click(); await visible(page.getByRole('img', { name: '0 of 3 original commitments completed, 0%' }));
    await page.getByRole('button', { name: 'Check in', exact: true }).click(); await page.getByLabel('Status for commitment 2', { exact: true }).selectOption('done'); await page.getByLabel('Status for commitment 3', { exact: true }).selectOption('done'); await page.getByLabel('Status for commitment 1', { exact: true }).selectOption('in_progress'); await page.getByRole('button', { name: 'Add a bonus' }).click(); await page.getByLabel('Bonus accomplishment 1', { exact: true }).fill('Helped review a CV'); await page.getByLabel('Check-in slot', { exact: true }).selectOption('slot-1'); await page.getByRole('button', { name: 'Review update' }).click(); await page.getByRole('button', { name: 'Save check-in' }).click(); await visible(page.getByRole('img', { name: '2 of 3 original commitments completed, 67%' }));
    await page.getByRole('button', { name: 'Revise plan', exact: true }).click(); await page.getByText('Revise commitment wording', { exact: true }).first().click(); await page.getByLabel('Current wording', { exact: true }).first().fill('Finish the landing-page draft'); await page.getByLabel('Status for commitment 1', { exact: true }).selectOption('done'); await visible(page.getByText('Did this also fulfill your original commitment?', { exact: true })); await page.getByRole('button', { name: 'Review update' }).click(); await page.getByRole('button', { name: 'Save revision' }).click(); await visible(page.getByRole('img', { name: '2 of 3 original commitments completed, 67%' }));
    await page.getByRole('button', { name: 'Close today', exact: true }).click(); await page.getByLabel('What went well?', { exact: false }).fill('Finished the walk and chapter.'); await page.getByRole('button', { name: 'Review day' }).click(); await page.getByRole('button', { name: 'Close practice day' }).click(); await saved(page); await page.reload(); await visible(page.getByText('Day reviewed', { exact: true })); await checkWidth(page); await page.screenshot({ path: path.join(output, 'closed-day-mobile.png'), fullPage: true });
    await page.getByRole('button', { name: 'Prepare tomorrow' }).click(); await page.getByLabel('Finish the landing-page draft', { exact: true }).check(); await page.getByRole('button', { name: 'Create tomorrow’s draft' }).click(); await visible(page.getByText('Tomorrow’s draft', { exact: true })); assert.equal(await page.getByLabel('Commitment 1', { exact: true }).inputValue(), 'Finish the landing-page draft'); await saved(page); await page.reload(); assert.equal(await page.getByLabel('Commitment 1', { exact: true }).inputValue(), 'Finish the landing-page draft');
    await page.getByRole('link', { name: 'Back to today' }).click(); await page.getByRole('button', { name: 'Correct review' }).click(); await page.getByLabel('Yes, the original commitment was fulfilled', { exact: true }).check(); await page.getByLabel('Reason for correction', { exact: false }).fill('The page was also published.'); await page.getByRole('button', { name: 'Review day' }).click(); await page.getByRole('button', { name: 'Save correction' }).click(); await visible(page.getByRole('img', { name: '3 of 3 original commitments completed, 100%' })); await visible(page.getByText('Review corrected', { exact: true })); await visible(page.getByText('Day closed', { exact: true }));
    await page.getByRole('link', { name: 'History', exact: true }).first().click(); await visible(page.getByText('Recent days', { exact: true })); await checkWidth(page); await page.screenshot({ path: path.join(output, 'history-mobile.png'), fullPage: true });
    await page.goto(base + '/profile'); await page.getByRole('button', { name: 'Export practice data', exact: false }).click();
    assert.deepEqual(external, [], 'Practice performs no external network requests');
    console.log('PASS mobile ritual, persistent drafts, revisions, bonus, close, correction, carry-forward, History, isolation'); await context.close();
  }
  {
    const { page, context } = await newPage(); await page.goto(base); await page.getByRole('button', { name: 'Try a practice day' }).click(); await page.getByRole('button', { name: 'Taking a break?', exact: false }).click(); await page.getByRole('button', { name: 'Make a rest day', exact: true }).click(); await visible(page.getByText('No tasks. No score.', { exact: true })); assert.equal(await page.getByRole('img').count(), 0); await saved(page); await page.reload(); await visible(page.getByText('A deliberate rest day.', { exact: true })); console.log('PASS rest day and reload'); await context.close();
  }
  {
    const { page, context } = await newPage(); await page.addInitScript(() => Object.defineProperty(window, 'indexedDB', { get() { throw new Error('Denied for test'); }, configurable: true })); await page.goto(base); await page.getByRole('button', { name: 'Try a practice day' }).click(); await visible(page.locator('.storage-notice')); assert.match(await page.locator('.storage-notice').innerText(), /Temporary session/); await page.getByLabel('Commitment 1', { exact: true }).fill('Session-only work'); await page.getByRole('button', { name: 'Review my plan' }).click(); await page.getByRole('button', { name: 'Start my practice day' }).click(); await visible(page.getByText('Session-only work', { exact: true })); console.log('PASS denied storage: temporary session, no false save'); await context.close();
  }
  {
    const { page, context } = await newPage({ viewport: { width: 1280, height: 900 } }); await page.goto(base); await page.keyboard.press('Tab'); assert.equal(await page.evaluate(() => document.activeElement?.textContent), 'Skip to content'); await page.keyboard.press('Tab'); await page.goto(base + '/example'); await visible(page.getByRole('img', { name: '2 of 3 original commitments completed, 67%' })); await page.screenshot({ path: path.join(output, 'example-desktop.png'), fullPage: true }); await page.goto(base + '/learn'); await visible(page.getByText('NIP cheat sheet', { exact: true })); await page.emulateMedia({ media: 'print' }); await page.pdf({ path: path.join(output, 'learning-guide-print.pdf'), format: 'A4', printBackground: false }); await checkWidth(page); console.log('PASS desktop example, keyboard entry, direct routes, printable guide'); await context.close();
  }
  {
    const { page, context } = await newPage();
    await page.goto(base + '/protocol');
    await visible(page.getByRole('heading', { name: 'A day, built from events.', exact: true }));
    await visible(page.getByRole('img', { name: '3 of 3 original commitments completed, 100%' }));
    await checkWidth(page);
    await page.getByLabel('Example scenario', { exact: true }).selectOption('conflict');
    await visible(page.getByRole('img', { name: '2 of 3 original commitments completed, 67%' }));
    await visible(page.getByRole('heading', { name: 'Competing versions', exact: true }));
    await page.getByLabel('Choose a full version', { exact: true }).selectOption({ index: 2 });
    await page.getByRole('button', { name: 'Preview unsigned resolution', exact: false }).click();
    await visible(page.getByText('Unsigned example · not published', { exact: true }));
    await page.screenshot({ path: path.join(output, 'protocol-conflict-mobile.png'), fullPage: true });
    await page.getByLabel('Example scenario', { exact: true }).selectOption('resolved');
    await visible(page.getByRole('img', { name: '1 of 3 original commitments completed, 33%' }));
    assert.equal(await page.getByRole('heading', { name: 'Competing versions', exact: true }).count(), 0);
    await page.getByLabel('Example scenario', { exact: true }).selectOption('missing');
    await visible(page.getByText('Missing dependencies · retrieval intent', { exact: true }));
    await visible(page.getByRole('img', { name: '0 of 3 original commitments completed, 0%' }));
    await page.getByLabel('Example scenario', { exact: true }).selectOption('future');
    await visible(page.getByRole('button', { name: 'Advance example clock by 10 minutes', exact: false }));
    await page.getByRole('button', { name: 'Advance example clock by 10 minutes', exact: false }).click();
    await visible(page.getByRole('img', { name: '1 of 3 original commitments completed, 33%' }));
    await page.getByLabel('Example scenario', { exact: true }).selectOption('rest');
    await visible(page.getByText('No completion score.', { exact: true }));
    assert.equal(await page.getByRole('img').count(), 0);
    await checkWidth(page);
    console.log('PASS protocol lab: signed reconstruction, conflicts, unsigned resolution, missing parent, future-clock policy, rest');
    await context.close();
  }
  {
    const { page, context } = await newPage();
    await page.clock.setFixedTime(new Date('2026-10-10T05:00:00Z'));
    const corpus = JSON.parse(await fs.readFile('src/learning/fixtures/corpus.json', 'utf8'));
    const data = ['plan','checkin','revision','close','correction','conversation'].map(name => corpus.events[name]);
    const frames = [];
    await page.route(/^https:\/\/(relay\.damus\.io|nos\.lol)\/?$/, route => route.fulfill({ status: 200, contentType: 'application/nostr+json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ name: 'Browser test relay', supported_nips: [1,11,65] }) }));
    await page.routeWebSocket(/^wss:\/\//, ws => ws.onMessage(message => {
      const frame = JSON.parse(String(message)); frames.push(frame);
      if (frame[0] !== 'REQ') return;
      const events = data.filter(event => frame.slice(2).some(filter => matchesFilter(event, filter))).sort((a,b) => b.created_at - a.created_at || a.id.localeCompare(b.id));
      for (const event of events) { ws.send(JSON.stringify(['EVENT', frame[1], event])); ws.send(JSON.stringify(['EVENT', frame[1], event])); }
      ws.send(JSON.stringify(['EOSE', frame[1]]));
    }));
    await page.goto(base + '/people');
    await visible(page.getByRole('heading', { name: 'Small plans, shared openly.', exact: true }));
    await visible(page.getByRole('img', { name: '3 of 3 original commitments completed, 100%' }));
    assert.equal(await page.getByRole('img').count(), 1, 'Duplicate relay arrivals yield one day card');
    await checkWidth(page);
    await page.screenshot({ path: path.join(output, 'public-feed-mobile.png'), fullPage: true });
    await page.getByRole('link', { name: 'Open public day', exact: true }).click();
    await visible(page.getByRole('img', { name: '3 of 3 original commitments completed, 100%' }));
    assert.ok(new URL(page.url()).pathname.startsWith('/public/day/note1'));
    await page.reload();
    await visible(page.getByRole('img', { name: '3 of 3 original commitments completed, 100%' }));
    const npub = encodePublic('npub', corpus.events.plan.pubkey);
    await page.getByLabel('Public identifier', { exact: true }).fill(npub);
    await page.getByRole('button', { name: 'Open', exact: true }).click();
    await visible(page.getByText(npub, { exact: true }));
    await visible(page.getByRole('img', { name: '3 of 3 original commitments completed, 100%' }));
    await page.getByLabel('Public identifier', { exact: true }).fill('nsec1never-enter-private-keys');
    await page.getByRole('button', { name: 'Open', exact: true }).click();
    await visible(page.getByRole('alert'));
    await page.getByRole('link', { name: 'Today', exact: true }).first().click();
    await visible(page.getByRole('button', { name: 'Try a practice day', exact: true }));
    assert.ok(frames.some(frame => frame[0] === 'CLOSE'), 'Stored-response subscriptions are closed');
    assert.ok(!frames.some(frame => frame[0] === 'EVENT' || frame[0] === 'AUTH'), 'Public browsing never signs/publishes/authenticates');
    console.log('PASS public read UI: mocked signed relays, deduplication, day/profile deep links, no-login isolation, secret rejection');
    await context.close();
  }
  {
    const { page, context } = await newPage();
    await page.clock.setFixedTime(new Date('2026-10-10T05:00:00Z'));
    const corpus = JSON.parse(await fs.readFile('src/learning/fixtures/corpus.json', 'utf8'));
    const data = [corpus.events.plan, corpus.events.missingParent];
    await page.route(/^https:\/\/(relay\.damus\.io|nos\.lol)\/?$/, route => route.fulfill({ status: 503, body: 'Unavailable' }));
    await page.routeWebSocket(/^wss:\/\//, ws => ws.onMessage(message => {
      const frame = JSON.parse(String(message)); if (frame[0] !== 'REQ') return;
      for (const event of data.filter(event => frame.slice(2).some(filter => matchesFilter(event, filter)))) ws.send(JSON.stringify(['EVENT', frame[1], event]));
      ws.send(JSON.stringify(['EOSE', frame[1]]));
    }));
    await page.goto(base + '/people');
    await visible(page.getByText('Partial results · some queries or history are incomplete.', { exact: true }));
    await visible(page.getByRole('img', { name: '0 of 3 original commitments completed, 0%' }));
    await checkWidth(page);
    console.log('PASS public incomplete ancestry: no invented progress, metadata failure does not disable WSS');
    await context.close();
  }
  assert.deepEqual(errors, [], 'No uncaught browser errors');
  console.log('All browser scenarios passed.');
} finally { await browser?.close(); server?.kill(); }
