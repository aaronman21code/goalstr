# Goalstr · Stage 1 lesson: the ritual before the network

## Concept

Product rules should work independently of a signer, relay, or view library. Practice implements the complete day locally. Live stages will replace transport/persistence boundaries while retaining the rules and clearly separating local versus public state.

## Working increment

Plan one to three commitments, post a practice check-in, revise wording without erasing the original, add a bonus, close the day, correct its review, and choose unfinished work for tomorrow's draft. History distinguishes closed plans, rest days, and empty dates.

## Illustrative command

```ts
const nextDay = appendSnapshot(day, {
  type: 'checkin',
  tasks: completeTaskSnapshot,
  bonus: [],
  slotId: 'slot-1',
  note: 'The first draft is ready.',
  reflection: emptyReflection(),
  correctionReason: '',
}, context);
```

This is a local domain command. It is not a signed Nostr event. The live codec, event ID, parent graph, and per-relay delivery evidence arrive in later stages.

## Tradeoff

Local Practice is useful without a network, but it does not provide public accountability or cross-device relay recovery. A saved browser draft is also not a published event. Temporary-session labels and backup export make that boundary visible.

## Exercise

Create three commitments. Complete two, add a bonus, then close the day. Expect 67% and 2 of 3 originals fulfilled, separately from the bonus and Closed label. Revise an original into a smaller task and complete it without confirming original fulfillment. Expect no additional original credit. Finally correct the review with a reason and inspect the preserved first close.

## Checkpoint

**Question:** Does posting four check-ins or closing the day make the ring 100%?

**Answer:** No. Only fulfilled original commitments change the ring. Check-in slot markers, bonus accomplishments, and closure are independent.

## Read the code

- `domain/accountability/rules.ts`: credit, validation, closure, correction, carry-forward.
- `domain/accountability/time.ts`: pinned calendar dates and DST resolution.
- `practice/service.ts`: operations, queued saves, storage failure handling.
- `infrastructure/storage`: transaction adapter and validated saved/imported data.
- `tests/domain.test.ts`: 23 verified rule/storage scenarios.

Open `/learn` to print a light guide using the browser's Print / Save as PDF. The guide distinguishes working local behavior from planned NIPs. The browser-rendered layout still needs verification on the deployed candidate.

## Stage 2 lesson: the event set, not arrival order

Open `/protocol`. Start with a Complete day, then compare Two competing updates. Inspect `id`, `pubkey`, `created_at`, `kind`, `e`/`p` tags, readable `content`, and the app-defined `accountability` payload. Nostr standardizes the envelope; Goalstr supplies the task schema.

Try Missing parent: a valid signature does not provide the absent causal event. Try Deleted ancestor: an authorized deletion makes the reconstruction incomplete. Try Future timestamp: the signed bytes remain valid while app clock policy delays admission. Advance the example clock to re-evaluate. Try a resolution preview; it has no signature and does not update the saved day.

Checkpoint: If two relays deliver the same events in opposite orders, should the ring differ? No. IDs deduplicate arrivals; parent graphs and deterministic fork selection decide the same result. A reply by another author cannot change your task state.

Read `docs/contracts/GOALSTR_V1.md` for the exact contract and `docs/STAGE_02.md` for update instructions. The source includes 26 protocol tests in addition to the 23 Practice tests.
