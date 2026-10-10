# Goalstr day event contract v1

Frozen in Stage 2, application version 0.2.0. This is Goalstr's application convention, not a NIP. Exact field shapes are in [goalstr-v1.schema.json](goalstr-v1.schema.json); executable validation is in `src/protocol/accountability/v1/schema.ts`.

## Nostr envelope and discovery

All day roots and author state updates are kind 1 plaintext notes. The codec emits these tags, each containing strings:

```ts
['t', 'goalstr']
['t', 'goalstr-v1']
['accountability', '1', eventType, JSON.stringify(payload)]
```

There is exactly one `accountability` tag. The supported event types are `plan`, `rest`, `checkin`, `revision`, `close`, `correction`, and `resolve`. Unknown versions/types remain readable but cannot change state. Duplicate application tags, malformed JSON, extra payload fields, invalid field types, and contradictory readable content are rejected. The versioned `t` tag is required for v1; both discovery tags are emitted. Never assume that relays index the multi-letter application tag.

The envelope is validated strictly and verified before payload decoding. ID is SHA-256 of NIP-01's UTF-8 JSON array `[0,pubkey,created_at,kind,tags,content]`; the Schnorr signature is checked against that ID and key by maintained upstream noble code. Do not trust a mutable object's cached `verified` flag. Identity, root/parent IDs, and signatures use lowercase hex. No app-owned identity keys are generated.

The full signed event must be at most **16,384 UTF-8 bytes**, or a stricter destination limit. The unsigned estimate includes fixed-length ID/signature overhead; verify actual signed bytes too. Unicode text limits count code points. Strings are trimmed, never silently truncated. Field limits do not guarantee that the whole event fits.

## Root payload

Every listed field is required, including empty arrays/strings and nullable reminders. Payload order is the codec's generated object order; decoding validates fields independently of object-key order.

| Field | Shape | Constraint |
| --- | --- | --- |
| `local_date` | YYYY-MM-DD | Real calendar date, pinned |
| `timezone` | IANA string | Valid timezone, pinned |
| `utc_offset_minutes` | integer | -840 to 840; actual offset at root `created_at` |
| `mode` | `plan` / `rest` | Must match event type |
| `commitments` | `{id,title,category}[]` | 1–3 for plan; 0 for rest; unique UUIDs; immutable wording; title 1–160 code points |
| `category` | string | `''`, `work`, `learning`, `health`, `personal` |
| `slots` | `{id,due_at}[]` | 0–4; unique IDs and UTC instants; reminder date matches local date |
| `review_due_at` | Unix seconds / null | Reminder must match local date |
| `opening_note` | string | 0–1,000 code points |
| `carry_forward_from` | `{root_id,commitment_id,new_commitment_id}[]` | 0–3; public source root/original UUID and distinct new UUID present in this root |

Slot IDs contain 1–64 ASCII letters/digits/underscore/hyphen. `due_at` is a safe nonnegative Unix-second integer. The UI derives wall time from the pinned timezone. Rest roots have no commitments, slots, review reminder, or carry-forward references. Their label is Rest, not Reviewed; no percentage is invented.

A root has no `e` reply references. Its signed event ID is the canonical day identity; the date only groups independent roots. For one author/date, choose the earliest known compatible nondeleted root, then the lexically lowest event ID. Display the others separately.

## Full state payload

| Field | Shape | Constraint |
| --- | --- | --- |
| `root_id` / `prev_id` | 64 hex | Root identity and actual causal parent |
| `sequence` | positive safe integer | Parent sequence + 1; root sequence is 0 |
| `tasks` | full array | Exactly the root UUIDs, no additions/removals |
| task `current_title` | string | 1–160 code points |
| task `status` | enum | `not_started`, `in_progress`, `done`, `changed_plans` |
| task `original_fulfilled` | Boolean | True only with Done; unchanged Done must be true; revised Done needs explicit author confirmation |
| task `revision_reason` | string | 0–500; retain the parent's latest reason until another wording revision |
| `bonus` | `{id,title,status}[]` | 0–10 UUIDs; earlier IDs/titles retained; title 1–160; outside original ring |
| `slot_id` | string | Empty except optional checkin claim of a root slot |
| `note` | string | 0–1,000; nonempty for resolve |
| `closed` | Boolean | True on close/correction; cannot reopen; resolve retains canonical parent flag |
| `reflection` | object | Required `went_well`, `got_in_way`, `carry_forward`, each 0–1,000 code points |
| `correction_reason` | string | Nonempty 1–500 for correction; empty for other types |
| `resolves` | hex ID array | 1–16 distinct known competing versions for resolve; empty otherwise |

Every task contains `id`, `current_title`, `status`, `original_fulfilled`, and `revision_reason`; every bonus contains `id`, `title`, and `status`. All fields are required. A snapshot is never a partial patch. Full-state semantics are validated against its actual parent, not whichever event happened to arrive last.

Direct state updates use one marked NIP-10 root tag, `['e',root_id,relay_hint,'root',root_author]`, and the root author `p` tag. `prev_id` is a separate application causal pointer; it is not a visible reply marker. Ordinary conversation nested under an update uses both marked root/reply tags. A different author’s state-shaped note stays conversation only. Positional legacy threading is read for ordinary replies, never admitted as v1 state ancestry.

`close` retains current task wording and confirms outcomes/reflection. `correction` requires a reason and preserves the first close. Non-review updates retain prior reflection. `resolve` chooses an explicit full snapshot, names known competing versions, and does not close/reopen a day. The preview command uses the current canonical head and validates retained originals/bonus records. A chosen old version that would remove a canonical bonus is refused instead of silently merging fields.

## Reconstruction and completeness

Verify, decode, deduplicate by signed ID, and quarantine timestamps more than five minutes ahead of the supplied clock. Re-evaluate quarantine as the clock advances. Require the root author, matching root, available valid parent, increasing timestamp, correct sequence, full task set, and valid closure transition. Outgoing time is `max(floor(now),parent_time+1)`.

At each fork choose greatest `created_at`, then lowest lexical ID; continue down that path. Retain other valid branch heads. Canonical resolutions acknowledge the named versions and their ancestors. A new descendant on an acknowledged branch is a new conflict. No distributed locking or global completeness is claimed.

Missing root/parent/resolution dependencies produce pending state and exact event-ID fetch intent. Never apply a child without its parent. Invalid known parents do not become trusted through a retry. Kind 5 `e` deletion requests affect only known kind 1 targets with the same author key. Deleting an ancestor yields Incomplete record and the last reconstructable snapshot. Deleting a root suppresses that day. Deleting a deletion request does not undo it. Addressable `a` deletion semantics and publication controls remain later-stage work.

Nostr signatures attest to the approving key and signed bytes, not completed work, trusted time, relay retention, or global event discovery.

## Fixture corpus and inspector

`src/learning/fixtures/corpus.json` contains 30 signed or deliberately damaged **public test fixtures**. Fixture identity keys exist solely in the generator under `scripts/`; official vector keys remain test-only under `tests/fixtures`. No app import reaches either. Regenerate with `npm run fixtures:generate`. Run `npm test` to validate the contract, projection invariants, and official BIP-340 vectors.

`/protocol` is an opt-in local lab. It does not connect to relays or signers. It verifies imported public events, displays decoded fields and escaped plaintext, distinguishes rejected signatures from rejected payloads, and previews unsigned Practice/resolution templates. Imports are in-memory, limited to 128 events / 512 KiB, and refuse private key/connection data. Future-clock examples use a fixed example clock. This route does not write Practice state.

Primary references reviewed 9 October 2026: [NIP-01](https://github.com/nostr-protocol/nips/blob/master/01.md), [NIP-10](https://github.com/nostr-protocol/nips/blob/master/10.md), [NIP-09](https://github.com/nostr-protocol/nips/blob/master/09.md), [noble source](https://raw.githubusercontent.com/paulmillr/noble-secp256k1/main/index.ts), [BIP-340 vectors](https://raw.githubusercontent.com/bitcoin/bips/master/bip-0340/test-vectors.csv). These links identify the reviewed documents; no exact NIP Git commit was available from retrieval. Freeze reviewed references/SDK revisions again before live integration.
