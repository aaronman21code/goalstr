> Stage 4 approved amendment (10 October 2026): original plans allow up to three active categories and five goals per category, superseding earlier one-to-three-total-goal wording. Use category rings plus weighted overall original completion; bonus/slots/closure remain separate. Preserve existing days with explicit Practice schema 1 → 2 migration and public v1/v2 contracts. Fitness-inspired dark surfaces, mini week rings and everyday tap selectors are the current UI direction.

# Goalstr Prototype Product Requirements

Version 1.1 | 9 October 2026 | Product and implementation specification

We will build a mobile web prototype in which people publish one daily plan, post short updates, and close the day with an honest review. Each day appears as one card with commitments, a completion ring, check-ins, and conversation. The prototype must work with real Nostr identities and relays, while providing a clearly labeled local practice mode for people who want to try it first.

The architecture separates daily accountability rules from protocol implementation. NIPs provide identity access, event transport, threading, profiles, follows, reactions, relay discovery, and deletion requests. A documented app schema supplies commitments, task outcomes, check-in slots, and day reconstruction. The schema is an application convention, not an existing NIP.

This document defines the prototype to build, the behaviors to verify, the module boundaries, and the conditions for a small pilot. Product targets are proposed test criteria, not evidence of established demand. Protocol references are the official Nostr specifications reviewed for this PRD. The chosen product name is Goalstr; package and repository naming use `goalstr`.

## 1 Product objective

People working on self-directed goals often have a plan in the morning and an unclear account of what happened by evening. We want to make the plan small enough to act on and the review easy enough to finish. Public updates add encouragement and a visible record, without turning every check-in into a separate feed card.

The core user promise is to make a small commitment, keep people posted, and close the loop. The prototype tests whether people understand this ritual, return to it, and find the social layer helpful. Completion is always self-reported. A signed event identifies its author and protects the signed content from alteration; it does not prove that the work happened or establish an independently verified publication time. [S1]

### Primary audience

The first pilot is for independent builders, students, writers, and people developing a health or learning habit. Users may already have a Nostr identity or may first explore through practice mode. The app must be useful before anyone they know joins.

### User stories

- As a builder, I want to publish a few concrete commitments so that I know what I intend to finish today.
- As a busy user, I want a quick update form so that keeping people posted does not become another large task.
- As someone whose plans changed, I want to explain the change while keeping my original plan visible.
- As a follower, I want one readable card per person per day so that I can encourage them without reading a fragmented feed.
- As a returning user, I want my previous plans and reviews to help me choose tomorrow's commitments.
- As a Nostr user, I want another compatible client to read my plan and replies, and this app to reconstruct my day after its local cache is cleared.

## 2 Prototype boundary

P0 is required for the working prototype and pilot. P1 is the next product increment, implemented through the extension points defined here. P2 requires separate product and security design.

| Priority | Included capability |
| --- | --- |
| P0 | Local practice mode and read-only public browsing |
| P0 | Browser signer and remote signer connection |
| P0 | Public plans with one to three original commitments |
| P0 | Task statuses, revisions, bonus accomplishments, and check-ins |
| P0 | Completion ring, update markers, evening review, and carry-forward suggestions |
| P0 | Following and Public feeds, public profiles, follow and unfollow |
| P0 | Encouragement reactions, text replies, mute and hide controls |
| P0 | History calendar, recap details, rest days, and days closed this week |
| P0 | Local reminder preferences and prompts while the app is open |
| P0 | Draft recovery, event outbox, honest publication states, and deletion requests |
| P1 | Photos and links as supporting material, recurring plan templates, weekly review |
| P1 | Zaps through NIP-57 and wallet payments through a separate NIP-47 adapter |
| P1 | Reliable background reminders, encrypted preference sync, lightweight achievements |
| P2 | Private circles, challenges, monetary commitments, native apps |
| P2 | Google, Apple, or email account creation linked to a managed Nostr identity |

The prototype has no leaderboard, weighted tasks, automated accomplishment verification, AI coach, internal wallet balance, or payment requirement. It will not generate or accept a user's identity private key. People without a signer can practice locally and receive a short explanation of how to connect an external signer before publishing.

Practice data is never mixed with real relay data. It uses its own store and a persistent Practice label. Switching into live mode requires an explicit choice of which practice commitments to copy into a new draft. Nothing is automatically published or backdated.

## 3 Pilot and success criteria

Run an initial moderated usability test with five people, then a seven-day pilot with approximately ten to twenty people. Include people using mobile remote signers and people unfamiliar with Nostr. These are proposed pilot sizes, not a committed launch schedule.

| Measure | Prototype target | Measurement |
| --- | --- | --- |
| Understand the ritual | At least 4 of 5 testers can explain plan, update, and review | Ask after opening an example day |
| First plan | At least 4 of 5 complete a practice plan in 3 minutes | Moderated task with no coaching |
| Routine check-in | Median form completion within 20 seconds | Exclude external signer approval and network delay; record those separately |
| Explain progress | At least 4 of 5 correctly interpret 2 of 3 completed | Ask what changes the ring |
| Return during pilot | At least half of activated users close 3 days in 7 | Activated means first live plan acknowledged by a relay |
| Recover signed data | Every scripted cache-clear scenario reconstructs the same accepted day | Compare normalized projections |
| Publication honesty | Zero scripted failures labeled Published without relay acknowledgment | Exercise relay rejection and timeout |

Task completion rate is descriptive, not the main product success metric. A person who completes nothing but honestly closes a day still completes the core ritual. Small pilot results inform the next build; they do not establish general demand.

Collect minimal operational events: mode selected, signer connected, plan acknowledged, check-in acknowledged, review acknowledged, relay failure, and draft recovered. Store no commitment text, private connection URI, wallet secret, or raw signer message in analytics. Guest measurement can stay local or be observed during testing. Any server analytics use opt-in pseudonymous sessions with a proposed thirty-day retention period.

## 4 Information architecture

The bottom navigation contains Today, People, History, and Profile. Settings open from Profile. Public day and profile links work without signing in. Connect appears when an unsigned visitor attempts a live write.

| Destination | Main content | Primary action |
| --- | --- | --- |
| Today before a plan | Date, planning prompt, commitment fields, optional note | Publish today's plan |
| Today during the day | Day ring, commitments, next reminder, update timeline | Check in |
| Today near review time | Current outcomes and review prompt | Close today |
| Today after closing | Daily recap and optional carry-forward suggestions | Prepare tomorrow |
| People | Following and Public tabs with one card per day | Encourage, reply, or follow |
| History | Calendar and day list; recap detail | Review a previous day |
| Profile | Existing Nostr profile, public day history, follow state | Share or follow |
| Settings | Timezone, reminders, signer, relay diagnostics, local data | Save preferences or disconnect |

Proposed routes are `/today`, `/people`, `/history`, `/profile/:npub`, `/day/:nevent`, and `/settings`. Route handling accepts validated NIP-19 identifiers and shares compatible `nostr:` identifiers under NIP-21. Event references and transport filters use hex IDs, not npub or nevent strings. [S5, S6]

## 5 Onboarding and daily flows

### First visit

1. Show one concise explanation: "Plan a few things. Post quick updates. Review your day."
2. Offer View an example, Try a practice day, and Connect Nostr.
3. Practice mode starts with an empty local plan; optional sample cards remain clearly labeled examples.
4. Connecting offers Browser signer when detected, or Remote signer using a connection URI or supported QR flow.
5. Load the public profile and follow list. Profile load failure does not block a plan; show a shortened npub fallback.
6. Confirm the detected IANA timezone and suggest reminder times.
7. Before the first live publication, show "Your plan and updates will be public. Other Nostr apps may display them." Require acknowledgment once per connected identity.
8. Open the morning composer. Skip follower suggestions until after the first plan.

Connecting is a signer session, not an email account. An npub alone is a public identity for browsing and cannot authorize writes. Never present a Paste private key field.

### Morning planning

Ask "What would make today a good day?" Provide one commitment field, Add another up to three, an optional category, and an optional opening note. Each title must describe an assessable action. Category options are Work, Learning, Health, and Personal; category is optional.

Save a local draft as the person types. Preview shows the exact readable text and public visibility. Publish obtains a signature and sends the same signed event to the chosen write relays. The committed day appears only after a relay accepts it; a visibly pending card can appear earlier with its publication label.

After a failed publication, keep the draft and signed event. A repeated tap retries the same signed bytes. Publishing a second root for the same local day is blocked in the ordinary UI while an existing or uncertain root is being resolved.

### During the day

Check in opens task rows with Not started, In progress, Done, and Changed plans. The user can add a short optional update, record a revision, or add a bonus accomplishment. Preview and Post update produce one signed reply with a complete state snapshot.

The ring updates provisionally in the local view while publication is pending and carries a Pending label. Public feeds and confirmed History use only accepted events. A declined signature leaves the composer intact and does not create a public event.

### Evening review

Close today opens current tasks, asks the user to confirm outcomes, and offers three optional fields: "What went well?", "What got in the way?", and "What will you carry forward?" None is mandatory. An explicit Close today action is mandatory.

The review is a signed author reply. After acknowledgment, the card shows Closed, its original completion fraction, final task outcomes, and review text. Completing every task earlier does not close the day automatically.

### Tomorrow and late work

Tomorrow's draft can select unfinished original commitments from a previous day, using their latest visible titles. Each becomes a new original commitment with a new task ID and optional source reference. The user chooses what to carry; no automatic repost occurs.

At midnight, a new Today date becomes available. Yesterday's open day remains accessible through a "Yesterday is still open" prompt and History. Check-ins selected from yesterday's card remain attached to yesterday. Closing it after midnight is labeled Late review. Today's plan may coexist with yesterday's open card.

### Social visit

Open People to Following by default. If it is empty, show "Follow someone to see their days here" with Public and Enter npub options. Public contains compatible live app plans found on the configured relay set. It is labeled as a partial view, never the entire Nostr network.

A day card shows the author, local day, original completion fraction, a few task rows, last update time, and closed status. Expand to see revisions and the timeline. Encourage publishes a reaction; Reply publishes a normal threaded note. Someone else's reply can never update task status.

## 6 Functional requirements

### F01 Identity and signer connection

Support NIP-07 browser signing and NIP-46 remote signing behind one interface. Discover the actual user public key after remote connection; it may differ from the remote signer's transport public key. Verify every returned signed event before publishing. Handle unavailable signers, denial, timeout, disconnect, and identity change. [S3, S4]

Acceptance: Both signer paths can publish a plan and reply on tested devices. Denial preserves the draft. Changing identity clears subscriptions and isolates caches. Logout deletes remote session credentials and offers a choice to keep or clear local drafts for that identity.

### F02 Plan composer

Require one to three nonempty original titles, each at most 160 Unicode code points. Opening notes are at most 1,000 code points. Reject whitespace-only fields and show the affected field. Drafts persist after refresh and browser restart when local storage remains available. Rest day is a separate action with zero commitments.

Acceptance: Empty plans cannot publish. Three tasks remain editable without horizontal scrolling on a 360-pixel viewport. Refresh restores the same draft. A plan date and timezone cannot silently change between preview and signing.

### F03 Day card and task updates

Show original and current titles where they differ. Task IDs remain stable throughout one day. Original tasks cannot be removed from the denominator. Updates preserve all original task IDs and carry a complete current snapshot. Up to ten bonus accomplishments may be recorded per day.

Acceptance: A third party's plausible-looking update is displayed as conversation only. A duplicate event does not duplicate a timeline row. A revision visibly retains the original wording. Bonus completion changes only the bonus count.

### F04 Check-in schedule

Suggest 08:00 planning, 11:00, 14:30, and 18:00 check-ins, and 21:30 review. Users may choose zero to four check-in slots and edit times. Check-in slots must be ordered, distinct, and within the plan's local calendar date. Schedule changes in Settings apply to future plans; a published plan retains its schedule.

An update may select one scheduled slot or be Unscheduled. Default to the most recent due slot that has not been used. The same slot can be selected again, but its marker counts once. Early updates are allowed and labeled with their actual time. Reminders never post automatically and missing a slot never blocks review.

Acceptance: Four updates assigned to one slot produce one filled marker. Done tasks with no slot update can yield 100% completion and zero check-in markers. Prompts work while the app is open; the UI states that background notifications are not part of P0.

### F05 Revision and changed plans

Before closing, the author can revise a current title and provide an optional reason. Revision records are permanent within the event history unless a valid deletion request affects an event. Changed plans retains the task and records that its original outcome is unfulfilled.

If a revised task is completed, ask "Did this also fulfill your original commitment?" Ring credit requires an explicit Yes. For an unchanged task, Done sets original fulfillment automatically. A title typo that changes the text also uses the revision mechanism; the author can confirm that the original was fulfilled.

Acceptance: Dropping or weakening a goal cannot silently inflate completion. Completing a revised goal without confirming original fulfillment leaves its original ring credit at zero. The final review explains revised completion separately.

### F06 Closing and correcting a day

A close snapshot resolves every original task's outcome. Unfinished tasks can remain Not started, In progress, or Changed plans and are recorded as unfulfilled. After closing, ordinary check-ins are disabled. The author may publish a Correction with a required reason, updating outcomes or reflection while retaining the original close time and previous review.

Close today is available at any time after publication. At the configured review_due_at instant, Today makes it the primary action; before then, it remains available as a secondary action. Users can close early or continue checking in after the reminder without a penalty.

Acceptance: A zero-completion day can be closed. An update after closing is rejected as a task mutation unless it is a valid correction or conflict resolution. Corrections are visibly labeled and the ring is recalculated from the corrected state.

### F07 Feeds and profiles

Group compatible plans by author and local day. Sort cards by root publication time, newest first; check-ins update a card without repeatedly moving it to the top. Show at most twenty cards initially with Load more. Fetch task updates for visible cards first. Profiles show existing public metadata and this app's public days; profile editing is deferred.

Acceptance: Four check-ins produce one day card. A profile with no metadata has a safe fallback avatar and npub. Deleted or muted content is consistently hidden across feeds, profiles, links, and History on that device.

### F08 Follow and unfollow

Read and write NIP-02 kind 3 through the social adapter. A follow operation starts from the latest known complete list and preserves unrelated entries and legacy content. Never replace the user's list with only people discovered in this app. Refetch before signing and warn if the list changed. [S7]

Acceptance: Following one pilot participant preserves existing follows. A failed list fetch leaves the operation disabled with Retry; it is not treated as an empty list. The app explains that following is public and affects compatible Nostr clients. Concurrent writes from other clients cannot be made transactional; detected conflicts are shown for review.

### F09 Encouragement and conversation

Use one Encouragement button that publishes NIP-25 kind 7 with content `+`. Count one active encouragement per author and target; duplicate reactions cannot inflate the visible count. Removing an encouragement sends a deletion request for this app's known reaction events. Ordinary replies are readable kind 1 notes and have no accountability payload. [S8]

Replies are at most 1,000 code points. Replies to the plan use a marked root reference; replies to a particular check-in carry root and direct-parent references. Inherit thread participants as appropriate. No notification inbox is required in P0.

Acceptance: A reply to a check-in opens under that update. An emoji reaction from another client can be displayed separately; it is not silently counted as a `+` encouragement. All reply and reaction timestamps reflect actual signed events.

### F10 History and rest days

Provide calendar and list views, day details, a completed fraction, and a closed indicator. The weekly summary counts completed plan-and-review rituals, not task completion. A published rest day is immediately a deliberate Rest day record with no ring percentage; show it separately from days closed. An unplanned date is empty, not a failed day.

Acceptance: A week with three reviewed plans and two rest days shows "3 days closed · 2 rest days." A locally cached month works offline with a Cached label. History signals when relay retrieval is incomplete instead of filling missing days with zero completion.

### F11 Publication and recovery

Every write has a visible state: Draft, Awaiting approval, Signed, Sending, Published, Partly replicated, or Not confirmed. One positive relay acknowledgment establishes Published; fewer acknowledgments than the chosen destination count also shows Partly replicated. A timeout without acknowledgment is Not confirmed, since delivery may have happened. [S1]

Acceptance: Double taps share one operation and signed event ID. Retry never generates a new event for the same operation. Offline drafts survive reload. Signed operations can retry after reload with the same bytes when the user selected Publish; the app does not sign new content in the background.

### F12 Local controls and deletion

Offer Hide this card and Mute this person as device-local controls. Offer Request deletion for the author's live day, listing the root and known author updates. The request uses kind 5 and does not include other people's replies. Publish requests to known destinations and respect valid same-author deletion requests when reading. [S9]

Acceptance: The action states "Copies may remain on other relays or devices." A forged deletion from another author has no effect. Root deletion hides the day. Deletion of a state-bearing update causes an Incomplete record indicator; the app does not claim a complete audit history.

## 7 Progress and time rules

### Completion

For a normal day, let N be the count of original commitments in the root event, from one to three. Let C be the count whose current accepted original outcome is fulfilled. The ring is round(100 × C / N), shown alongside the exact C of N fraction. In progress earns no partial credit. Every original commitment has equal weight.

| Example | Ring | Other indicators |
| --- | --- | --- |
| Two of three original goals fulfilled | 67% | 2 of 3 |
| Four check-ins and no goals fulfilled | 0% | Up to four filled slot markers |
| One of two originals fulfilled and one canceled | 50% | Changed plans remains visible |
| Three original goals fulfilled and two bonus tasks | 100% | 2 bonus accomplishments |
| A revised goal completed but original not fulfilled | No original credit for that task | Revised accomplishment visible |
| Rest day | No percentage | Rest day label |

The closed indicator is independent of completion and slot markers. No score combines these measures.

### Day identity

A root fixes `local_date`, the IANA `timezone`, UTC offset at planning, and scheduled slot instants. Its logical day key is `author_pubkey + local_date`. A timezone preference change affects future plans and does not move existing cards into a different date. Cards show their original timezone when it differs from the viewer's current zone.

For daylight-saving transitions, resolve an ambiguous reminder time to its earlier occurrence and a nonexistent time to the next valid local instant. Store the resolved UTC instants in the root so other clients reconstruct the same schedule. The week begins Monday in the current account preference, using the cards' pinned date labels rather than rebucketing timestamps.

Any close posted after the root's next local midnight is labeled Late review. The scheduled review time controls reminders, not lateness. A late morning start uses the actual publication time. Author-supplied event time is never described as independent proof of timing.

### Duplicate day roots

The UI checks local outbox and discovered roots before creating a plan. If separate devices still create two accepted roots with the same author and local date, select the earliest `created_at`, then the lexically lowest event ID, as the main card. Show Other plan found and allow viewing the alternate. Never merge unrelated root task IDs or erase the alternate silently. Main-card selection is computed over all known compatible nondeleted roots and may change as missing roots arrive.

## 8 Visual and interaction requirements

Use a mobile-first layout with dark charcoal surfaces, a colorful single completion ring, clear task rows, and a quiet timeline. Borrow the legibility and satisfaction of activity interfaces while creating original typography, icons, spacing, and motion. Use solid surfaces rather than decorative gradients.

Proposed tokens are background `#111318`, card `#1C2027`, text `#F4F5F7`, secondary text `#B5BDC9`, and a green completion accent. Category colors may distinguish Work, Learning, Health, and Personal, but the status must also have text and an icon. Validate contrast before finalizing tokens.

Tap targets are at least 44 by 44 CSS pixels. Forms work at 360 pixels wide and remain centered with a comfortable maximum width on desktop. Support keyboard navigation, screen-reader labels, focus visibility, text scaling to 200%, reduced motion, and textual progress such as "2 of 3 commitments completed." Aim for WCAG 2.2 AA on the core flow.

The update form opens as a mobile sheet or a desktop dialog with retained draft state. A primary action is always visible. Destructive controls appear in a menu and explain their effect. Success motion is brief and can be disabled. No compulsory celebration or judgmental copy appears for an unfinished day.

### Required copy

| Context | Copy |
| --- | --- |
| Morning prompt | What would make today a good day? |
| Update prompt | What moved forward? |
| Review prompt | How did today go? |
| Empty Following | Follow someone to see their days here. |
| No completion at review | You can close the day as it is. |
| Not confirmed | We haven't confirmed this post. Your update is saved. |
| Guest mode | Practice day · saved on this device |
| Public visibility | Your plan and updates will be public. |

## 9 Architecture and dependency rules

Use a modular monolith: one frontend application with independently testable packages. P0 can operate directly between the browser and relays, with IndexedDB for local storage and a static HTTPS host. It does not require a proprietary account database, a custom relay, or a microservice for each NIP.

The feature layer owns screens and orchestration. The domain layer owns commands, validation, task outcomes, ring calculations, and deterministic day reconstruction. The protocol layer converts domain commands to Nostr events and parses events into domain facts. Infrastructure implements signers, relay connections, storage, and optional telemetry.

Dependencies point inward. Domain code cannot import a relay SDK, browser signer, React, or wallet library. NIP adapters cannot import feature screens. UI components receive domain view models and call use cases. Shared transport and signature validation are reused rather than reimplemented by each NIP module.

| Module | Responsibility | Public boundary |
| --- | --- | --- |
| features today | Plan, check-in, review, and recap screens | Calls DayService |
| features people | Feed, profiles, reactions, replies | Calls FeedService and SocialService |
| features history | Calendar and recaps | Calls HistoryService |
| domain accountability | Commands, invariants, deterministic reducer | Plain types and pure functions |
| protocol accountability v1 | Custom tags, snapshots, readable text | Encode and decode day events |
| protocol nip01 | Event validation and wire messages | Shared event and transport contracts |
| protocol nip07 and nip46 | Browser and remote signer implementations | SignerPort |
| protocol nip10 | Note threading | ThreadCodec |
| protocol nip02 and nip25 | Follows and encouragement | SocialPort |
| protocol nip19 and nip21 | IDs, routes, and compatible links | IdentityCodec |
| protocol nip65 and nip11 | Relay routing and capabilities | RelayDirectory |
| protocol nip09 and nip42 | Deletion and relay authentication | DeleteCodec and AuthHandler |
| infrastructure storage | Cache, drafts, outbox, preferences | StoragePort |
| infrastructure relay pool | Subscriptions, retries, destination results | RelayPort |
| extensions payments | Future zap and wallet behavior | ZapPort and WalletPort |

The NIP-44 implementation used by remote signing is a shared crypto dependency. It does not make the public accountability data private. Wallet encryption and any future private-circle encryption require their own scopes and tests.

### Proposed module layout

`src/features/{today,people,history,profile,settings}` contains UI and orchestration. `src/domain/accountability` contains types, commands, validation, and reconstruction. `src/protocol/accountability/v1` contains the app event codec. `src/protocol/nips/{01,02,07,09,10,11,19,21,25,42,44,46,65}` contains adapters. `src/infrastructure/{relays,storage,telemetry}` implements ports. `src/app` creates adapters and feature services. `src/extensions/{zaps,wallet,preferences}` holds later modules.

### Minimum interfaces

```typescript
interface SignerPort {
  connect(): Promise<SignerSession>;
  getPublicKey(): Promise<HexPubkey>;
  signEvent(event: UnsignedEvent): Promise<SignedEvent>;
  disconnect(): Promise<void>;
}

interface RelayPort {
  query(filters: NostrFilter[], relays: RelayUrl[]):
    Promise<QueryResult>;
  subscribe(filters: NostrFilter[], relays: RelayUrl[],
    onEvent: (event: SignedEvent) => void): () => void;
  publish(event: SignedEvent, relays: RelayUrl[]):
    Promise<PublishResult>;
}

interface AccountabilityCodec {
  encode(command: DayCommand, context: DayContext):
    UnsignedEvent;
  decode(event: SignedEvent): DecodeResult;
}
```

QueryResult includes retrieved events and per-relay completion or failure. PublishResult contains one status per destination; it is not a single Boolean. DecodeResult distinguishes compatible state, ordinary conversation, unknown schema, and invalid payload.

Signing follows domain validation, exact-text preview, encoding, and an explicit publish action. Returned signatures must match the active user, expected event fields, and calculated ID. The relay pool receives only validated signed bytes.

## 10 NIP implementation map

NIP support is capability-specific. We implement the subset required by this product and document it in each module. Reading one NIP does not imply implementing every optional operation or acting as a relay server.

| NIP | Phase | Product use and implementation subset |
| --- | --- | --- |
| 01 | P0 | Signed event structure, validation, profiles kind 0, relay queries, subscriptions, publication results |
| 02 | P0 | Read full kind 3 follow list; preserve existing entries on follow or unfollow |
| 07 | P0 | Browser public-key access and event signing |
| 09 | P0 | Own kind 5 deletion requests and validation of incoming requests |
| 10 | P0 | Kind 1 public plans, author updates, reviews, and normal threaded replies |
| 11 | P0 | Read relay limits where available; missing metadata does not break transport |
| 19 and 21 | P0 | Public identifiers, day links, profile links, and nostr URI handling |
| 25 | P0 | Kind 7 encouragement and reaction parsing |
| 42 | P0 | Authenticate only selected relays when required; handle denial and retry |
| 44 | P0 dependency | Versioned encryption for NIP-46 transport using a tested library |
| 46 | P0 | Remote signer connect, key discovery, signing, timeout, and session teardown |
| 65 | P0 | Read kind 10002 and route reads and writes; editing relay lists is deferred |
| 57 | P1 | Zap request and receipt lifecycle with validated recipient and receipt |
| 47 | P1 | Optional wallet connection and invoice payment; separate from identity signing |
| 78 | P1 candidate | App preference storage with explicit encryption and device-recovery design |
| 22 | Extension | Comments if a future product object uses a kind other than 1 |
| 51 and 56 | Extension | Synced mute lists and interoperable reports |
| 58 | Extension | Portable badge issuance, acceptance, and display if achievements warrant it |

We choose kind 1 roots and kind 1 replies for P0 so ordinary Nostr clients can read the complete daily narrative. NIP-10 is appropriate for kind 1 threads; its current specification directs replies to other event kinds to NIP-22. This choice must be revisited if we change the root kind. [S2, S13]

NIP-65 discovery informs author write-relay reads and routing to tagged recipients' read relays. NIP-11 documents capabilities and limits but cannot guarantee acceptance or complete historical retrieval. Runtime results remain authoritative for the local connection state. [S10, S11]

## 11 Application event contract

### Encoding convention

Every app state event is a standard kind 1 note with readable plaintext content. Use discoverable tags `['t','goalstr']` and `['t','goalstr-v1']`, plus exactly one custom tag `['accountability','1',type,JSON.stringify(payload)]`. All entries are strings. The custom tag is an app convention; do not claim relays index its multi-letter key.

P0 types are `plan`, `rest`, `checkin`, `revision`, `close`, `correction`, and `resolve`. Unknown major versions display as readable posts with Unsupported day format and never mutate a known projection. Schema validation rejects duplicate app tags, invalid fields, oversize payloads, and missing original task IDs.

Use a single indexed `t` filter for discovery and indexed `e` references for thread retrieval. Keep the serialized signed event below 16 KiB, or a stricter selected relay limit. Validate before signing and explain which input exceeds the limit. Copy generation is deterministic and includes enough task information for another client to read without the custom tag.

### Root payload

| Field | Type | Rule |
| --- | --- | --- |
| local_date | YYYY-MM-DD string | Valid calendar date fixed at publication |
| timezone | IANA string | Fixed for this day |
| utc_offset_minutes | Integer | Offset at planning |
| mode | plan or rest | Rest has no commitments or scheduled check-ins |
| commitments | Array of original records | One to three for plan; zero for rest |
| commitment id | UUID string | Unique within the root |
| commitment title | String | Original immutable wording; maximum 160 code points |
| commitment category | Optional enum | work, learning, health, personal |
| slots | Array | Zero to four unique IDs and resolved UTC due_at seconds |
| review_due_at | Optional Unix seconds | Same local calendar date; reminder only |
| opening_note | Optional string | Maximum 1,000 code points |

The signed root event ID is the canonical identity of a specific day record. The date groups records in the UI but cannot replace this event ID for threading.

### Update payload

| Field | Type | Rule |
| --- | --- | --- |
| root_id | Hex event ID | Must equal the marked root reference |
| prev_id | Hex event ID | Root or previous compatible author state event |
| sequence | Integer | Parent sequence plus one; root sequence is zero |
| tasks | Full task snapshot | Exactly the root's original IDs, no removals |
| task current_title | String | Latest wording; original stays in root |
| task status | Enum | not_started, in_progress, done, changed_plans |
| task original_fulfilled | Boolean | Determines original ring credit |
| task revision_reason | Optional string | Maximum 500 code points |
| bonus | Array | Up to ten stable-ID bonus records, outside ring |
| slot_id | Optional string | One root slot; only checkin may claim it |
| note | Optional string | Maximum 1,000 code points |
| closed | Boolean | False until close; stays true thereafter |
| reflection | Optional object | Three optional fields, each at most 1,000 code points |
| correction_reason | Optional string | Required for correction; maximum 500 code points |
| resolves | Optional event ID array | Resolve only; references known competing branch heads |

An unchanged task marked Done must set original_fulfilled true; other unchanged statuses set it false. For a revised task, true records the author's explicit confirmation that the original was fulfilled. Resolve is an author-selected full snapshot, with a required explanatory note, based on the current canonical head and competing versions. It cannot reopen a closed canonical day.

An original_fulfilled value of true requires status done. Revision badges and history are derived by comparing each accepted snapshot with its parent; later snapshots must retain the latest revision reason until another revision replaces it. Bonus records have an immutable UUID, a title of at most 160 code points, and status not_started, in_progress, done, or changed_plans. Only completed bonus records count as bonus accomplishments.

Check-ins may include a revision and optional reason; a separate revision event serves a deliberate edit outside a check-in. Close confirms outcomes and reflection while retaining current task titles. Corrections require their reason and remain closed. Resolve chooses task outcomes and reflection from the versions presented to the author, retaining the canonical parent's closed flag; closing an open day remains a separate explicit action. Rest roots have no state updates in P0 and are displayed as Rest day rather than Closed.

The event ID is the network deduplication key. A separate local operation ID connects composer state, signing, outbox retries, and UI acknowledgment. It is not required to be public.

### Thread encoding

A direct author update replies to the root with a single marked `e` tag of type `root`, including the root author and a relay hint. Its `prev_id` is a custom causal pointer, independent of its visible direct-root threading. A normal reply to a check-in includes marked root and reply tags plus appropriate participant `p` tags. Do not place custom revision references into unmarked `e` tags that clients could misinterpret as thread ancestry. [S2]

### Readable content example

```text
Plan for 9 October 2026
1. Publish the landing page
2. Walk for 30 minutes
3. Read chapter four
Check-ins: 11:00, 14:30, 18:00 Asia/Kolkata
```

```text
Afternoon update
Done: Walk for 30 minutes
In progress: Publish the landing page
Not started: Read chapter four
Original commitments completed: 1 of 3
The first draft is ready. Reviewing the copy next.
```

Root and reply unsigned-event examples with full metadata belong in the codec's fixture files during implementation. Tests compare readable content and typed payloads so they cannot drift into contradictory task outcomes.

## 12 Day reconstruction and conflicts

The reducer consumes verified signed events and produces a DayProjection containing root facts, canonical task state, canonical timeline, competing branches, discussion, ring value, slot markers, closed state, and completeness warnings. It must return the same result for the same event set regardless of arrival order.

1. Validate the event signature and schema, and deduplicate by event ID.
2. Identify a compatible root. Fetch a missing root by its ID before applying updates.
3. Admit state updates only when the author matches the root, root tags match, the parent belongs to this root, sequence increments correctly, created_at is later than the parent's time, and all domain invariants pass.
4. Build the parent graph. An update with a missing parent is pending reconstruction, not applied provisionally to the confirmed card.
5. Starting at the root, select one child at each fork by greatest `created_at`, then lexically lowest event ID. Continue along that path. Validate transitions, including closure, against each actual parent.
6. The final snapshot on that path supplies current task outcomes. All competing valid snapshots remain viewable as Conflicting updates; no automatic field merging occurs.
7. Derive check-in markers from canonical check-in events, and Closed from the first canonical close. Corrections retain that close time.

Two devices may both update the same parent. The app presents both versions to the author and offers Resolve updates. The resolution reply uses the current canonical head as prev_id, names the other known heads, and publishes the chosen full state. A later competing event can create a new conflict; the app must not imply permanent distributed locking.

Choose monotonic outgoing event times as max(current Unix second, parent time plus one). Reject incoming app state events more than five minutes in the future relative to the device clock and flag obvious clock problems. This is an app policy, not a Nostr consensus rule. It limits accidental skew and does not make signed timestamps trustworthy evidence.

Replay valid deletion requests before presenting data. If a known state update is removed or a parent is unavailable, show Incomplete record and the last reconstructable state. Avoid confidently presenting a final percentage as the whole story when known dependencies are missing. Retrieval over public relays can never prove that no undiscovered event exists.

## 13 Relay routing and publication

Use a small configurable bootstrap set to locate profiles and NIP-65 lists. Choose the pilot relay endpoints during implementation by exercising actual reads, writes, retention, and browser connectivity. This PRD does not assume a named relay's current reliability or policies.

For the prototype, cap the active relay pool at eight and ordinary writes at four destinations. Prefer the author's advertised write relays; include a configured app discovery relay when permitted. For targeted social replies and reactions, route to the recipient's read relays within the cap. If an existing advertised destination cannot be included, show that routing is limited rather than claiming complete NIP-65 distribution.

Public discovery queries kind 1 with `#t: ['goalstr-v1']`, a bounded date window, and a limit, then keeps compatible roots rather than treating every discovered update as a card. Following discovery adds author filters. Fetch a visible card's kind 1 replies by `#e: [root_id]`; parse author state and ordinary replies separately. Fetch reactions against the root and displayed update IDs. Fetch deletion requests against known root, update, reply, and reaction IDs using their respective kinds and indexed event references. Unknown replies require no app payload to display.

EOSE marks the end of a relay's current stored response, not proof that the network history is complete. Cache events by ID, batch profile and relay-list lookups, close subscriptions when views unmount, and reconnect with backoff and jitter. Pagination overlaps timestamp boundaries and deduplicates IDs; capped same-second results may remain incomplete and must retain a retrieval warning. [S1]

### Publication transaction

Persist the validated unsigned command and its local operation ID before requesting approval. After signing, persist the exact signed event before sending. Track each destination as pending, accepted, rejected, or timed out. Positive duplicate acknowledgment counts as accepted when it identifies the same event.

After one positive acknowledgment, show Published with replication status. Retry only unsuccessful destinations with the same event. If no relay acknowledges, keep Not confirmed and query by event ID before offering another root. Fetching a valid event later can confirm observed availability, labeled as recovered confirmation rather than an invented earlier acknowledgment.

Show brief error copy with Retry and preserve the input. Relay diagnostics may expose destination-level reasons in Settings; the everyday composer should not require understanding WebSocket codes.

## 14 Storage and application state

IndexedDB stores raw verified public events, per-relay observations, reconstructed projections, account-scoped drafts, a signed-event outbox, preferences, and local mute/hide lists. Projections are disposable and recomputable. User drafts and pending operations are not treated as disposable cache.

| Store | Key | Retention and recovery |
| --- | --- | --- |
| events | Event ID | Cache; rebuild from reachable relays |
| observations | Event ID and relay URL | Acceptance and retrieval facts; never treated as global consensus |
| projections | Root ID and schema version | Invalidate and replay after codec changes |
| drafts | Mode, public key, local date | Keep until published or explicitly discarded |
| outbox | Local operation ID and event ID | Keep until confirmed; retain unsuccessful destinations for retry |
| preferences | Public key or practice namespace | Local in P0; no public reminder schedule outside root |
| local controls | Mode and public key | Device-local; export or sync deferred |

On storage denial or quota exhaustion, switch to a clearly labeled temporary session and explain that unsent work will not survive closing the tab. Do not claim a saved draft until the write succeeds. Account switches cannot show another identity's drafts. Disconnecting a signer does not delete public posts.

A cache-clear recovery restores accepted public plans, compatible updates, profiles, and follows from available relays. It cannot restore unsent drafts, local reminders, or local controls. Explain these limits in Settings. No P0 backend stores identity keys.

## 15 Security and privacy requirements

Published plan content and app metadata are public. Following is a viewing filter, not an access rule. Opening a public day link does not require login. Reminders, draft text, remote session credentials, and future wallet connection secrets must not be sent to analytics or placed in URLs used for sharing.

Use a tested Nostr and cryptographic library pinned at implementation time. Do not implement Schnorr signing, NIP-44 encryption, or Bech32 encoding from scratch. Check official package documentation and maintain an adapter so a library change does not rewrite domain logic.

Remote signer traffic uses its own client session key. In P0 keep session credentials in memory and require reconnection after reload; drafts and signed outbox entries still persist. Logout destroys the session key and connection token. Request only event kinds needed for enabled features. Distinguish user identity, remote signer transport identity, and later NWC connection identity. [S4]

Treat all event content, profile names, relay notices, and metadata as untrusted. Render text safely; do not inject HTML. Validate link schemes and media URLs, disable executable content, use a restrictive content security policy, and avoid automatic loading of unknown third-party media. P0 profile pictures can use HTTPS with fallbacks and referrer restrictions.

Only authenticate a configured or user-selected relay under NIP-42 after signer approval. Never broadcast relay-authentication events as normal notes. Do not automatically follow arbitrary relay hints without URL validation and pool limits. [S12]

Local mute controls, bounded queries, reply limits, and safe rendering are required before a public pilot. A comprehensive network moderation or abuse-reporting system is outside P0; a larger launch needs an explicit moderation and operator policy.

## 16 Quality and performance requirements

Performance targets are acceptance budgets for the pilot environment, not guarantees about third-party signers or relays. Test on a representative mid-range mobile device and an agreed network profile.

- A cached Today card should appear within one second of navigation.
- Local task interactions should respond within 100 milliseconds, excluding signing and network work.
- Initial app content should appear within three seconds on the agreed test network; profile hydration may continue afterward.
- Every long-running signer or network operation exposes a pending state promptly, with a configurable timeout and retry path.
- The app supports 360-pixel mobile screens, modern Chrome, Safari, and Firefox, plus at least one actual mobile remote-signer flow.
- All critical forms preserve input through expected navigation and failures.
- Subscription counts, relay count, event sizes, and query windows are bounded.
- Core domain code and codecs compile independently of the UI and concrete SDK adapters.

Monitor operation counts, rejection rates, pending outbox age, reconstruction errors, signer cancellation, and load timing without logging private draft content or credentials. Developer diagnostics identify the schema version and reason an event was excluded.

## 17 Acceptance test matrix

These tests exercise product invariants and interoperability; they should be implemented alongside the relevant modules. At minimum, the domain reducer and codec require automated tests, and the live signing/relay paths require integration and device checks.

| ID | Scenario | Required result |
| --- | --- | --- |
| A01 | Publish three tasks and complete two | Confirmed card displays 67% and 2 of 3 |
| A02 | Check in four times without completion | Ring remains 0%; markers reflect distinct selected slots |
| A03 | Cancel one of two tasks | Denominator remains two |
| A04 | Complete a bonus task | Bonus count changes; original ring does not |
| A05 | Complete a weakened revision | No original credit until explicitly confirmed |
| A06 | Another author copies valid-looking state tags | Conversation only; no state mutation |
| A07 | Events arrive out of order from two relays | Same final projection once dependencies arrive |
| A08 | Same signed event arrives ten times | One timeline item and one operation acknowledgment |
| A09 | Signer rejects or changes event fields | Preserve draft; do not publish modified or invalid event |
| A10 | One relay accepts and two fail | Published with partial replication and exact-event retries |
| A11 | Relay timeout after possible delivery | Not confirmed; retry and recovery reuse the same event ID |
| A12 | Close with no tasks fulfilled | Closed at 0%; tomorrow remains available |
| A13 | Midnight and timezone preference change | Original date remains; late review attaches correctly |
| A14 | Clear public cache and reconstruct | Same accepted day from reachable relay data |
| A15 | Two devices create conflicting snapshots | Deterministic chosen branch; alternate visible; resolve works |
| A16 | Follow someone with 100 existing follows | Preserve all existing entries; do not write on fetch failure |
| A17 | Forged or valid author deletion request | Forgery ignored; valid request handled with completeness warning |
| A18 | Practice mode then connect | No sample data publishes without an explicit live draft action |
| A19 | Malicious HTML, links, or oversize app tags | No execution; invalid state rejected; safe fallback text |
| A20 | Reduced motion, keyboard, screen reader | Core ritual works without motion, pointer, or color reliance |
| A21 | Two roots for one author and date | Main-card rule applied; alternate available; no task merging |
| A22 | Correct a closed day | Original review preserved; correction labeled; ring recalculated |
| A23 | Rest day and empty dates | Rest has no 100% claim; empty dates are not failures |
| A24 | Storage unavailable | Temporary-session label; no false draft-save claim |

Interoperability checks must verify that a separate Nostr client can display the plan, check-ins, and review as a readable thread. A second compatible app instance must reconstruct the same tasks from published metadata. The first check tests generic readability; the second tests the documented app schema.

## 18 Build sequence and exit criteria

Build in increments that each produce a reviewable working result. Avoid attaching fixed dates until the signer and relay integration spike has been completed.

### Stage 1 Daily loop in practice mode

Implement domain types, task outcomes, progress rules, schedules, draft storage, and Today/History screens. Provide plan, update, revision, review, correction, rest day, and carry-forward flows. Exit when users can complete a whole practice day and A01 through A05, A12, A13, A22, A23, and A24 pass locally.

### Stage 2 Event contract and reconstruction

Implement the version 1 codec, readable text, event fixtures, signature-validation boundary, reducer, missing dependency handling, conflict resolution, and schema migration rules. Exit when shuffle/duplicate tests produce identical projections and invalid-author, fork, correction, and deletion cases are defined and tested.

### Stage 3 Live identity and publication

Implement NIP-07 and NIP-46 adapters, NIP-44 dependency, relay pool, outbox, NIP-11 limits, NIP-65 routing, and NIP-42 authentication handling. Publish and recover a full day on test relays. Exit when two tested signer paths work and relay failure, timeout, retry, and cache-clear recovery pass.

### Stage 4 Social and public navigation

Implement profile hydration, Following/Public feeds, follow preservation, reactions, threaded replies, shared links, local mute/hide, and deletion requests. Exit when generic-client thread readability and the complete social test matrix pass. Confirm that guest browsing and live data are visibly distinct.

### Stage 5 Pilot preparation

Complete mobile usability, accessibility, safe rendering, performance budgets, error copy, and minimal telemetry. Run five moderated tasks, fix blocking issues, and begin the small pilot. Exit when the launch checklist below passes and no critical data-loss, identity, or publication-state defects remain.

## 19 Definition of done

The prototype is complete when a participant can connect on a tested desktop or mobile path, publish a plan, post updates, revise honestly, close the day, view it from another instance, follow someone, encourage or reply, and review History. All P0 functions must use their real persistence and transport paths in live mode.

- Every P0 requirement has a passing acceptance result or a documented nonblocking deviation visible to the product owner.
- Core domain and codec tests pass, including deterministic replay and hostile-author cases.
- Both signer adapters and at least two independently operated compatible relays have been exercised end to end.
- Another Nostr client reads the public thread and a fresh app instance reconstructs it.
- Signed operations survive expected retries without duplicate content.
- Public visibility, practice mode, incomplete retrieval, and deletion limits are accurately communicated.
- Follow-list writes preserve unrelated existing follows.
- Core screens pass device, keyboard, screen-reader, contrast, and reduced-motion checks.
- The event schema, adapter capabilities, configured relay policy, and local-storage limits are documented in the repository.
- No credential, private draft, or wallet connection secret appears in operational logs.

## 20 Extension contracts and outstanding decisions

### Zaps and wallets

Add ZapPort for preparing a NIP-57 zap request and validating its receipt, plus WalletPort for paying an invoice through NIP-47 or an external wallet. Wallet connection is optional and independent of login. Payment success and receipt availability are separate states; never invent a zap receipt or equate a wallet request with payment completion. [S14, S15]

Keep wallet secrets and session identities outside accountability snapshots. A zap targets a root or a specific update and cannot change ring progress. Payment errors never block ordinary plans or reviews.

### Reminders and preferences

Add ReminderPort with separate in-app, browser notification, and later server-push implementations. Closed-app delivery requires its own permission, scheduling, timezone, subscription, and mobile-browser verification. NIPs do not by themselves provide dependable background mobile notifications.

NIP-78 can be evaluated for syncing app preferences. Its current specification recommends authenticated owner access for app data, but we cannot assume every relay enforces that access policy. Encrypt sensitive preference content and define key access and device recovery before enabling sync. Local P0 preferences require no additional public event. [S16]

### Media and private circles

Add MediaPort for uploads and attachment references only after deciding storage ownership, acceptable formats, deletion behavior, and relay-readable fallback text. Private circles require an access and encryption design covering membership changes, recipient metadata, and public-versus-private day cards. A Following tab is never used as that privacy mechanism.

### Decisions before implementation

The proposed defaults in this PRD allow development to begin. Before integration, choose and record the frontend host, a maintained SDK and crypto package, tested signer applications, relay endpoints, and the exact version of each NIP implementation used. Confirm event-schema naming before the first shared pilot; treat it as a compatibility contract once others publish.

The first usability test should resolve whether three check-in suggestions feel helpful, whether a single ring is clear, and whether people understand the revised-task fulfillment question. Goalstr is the chosen product name. Badge design, private circles, and social-login custody do not block P0.

## 21 Protocol references

These sources define protocol behavior. Features, progress rules, versioned payloads, conflict policy, performance budgets, and build stages in this PRD are application design decisions. The linked master specifications are living documents; pin reviewed revisions in the implementation repository before writing adapters.

- [S1 NIP-01 Basic protocol flow and event structure](https://github.com/nostr-protocol/nips/blob/master/01.md)
- [S2 NIP-10 Text Notes and Threads](https://github.com/nostr-protocol/nips/blob/master/10.md)
- [S3 NIP-07 Browser signer interface](https://github.com/nostr-protocol/nips/blob/master/07.md)
- [S4 NIP-46 Nostr Remote Signing](https://github.com/nostr-protocol/nips/blob/master/46.md)
- [S5 NIP-19 Bech32 encoded entities](https://github.com/nostr-protocol/nips/blob/master/19.md)
- [S6 NIP-21 nostr URI scheme](https://github.com/nostr-protocol/nips/blob/master/21.md)
- [S7 NIP-02 Follow List](https://github.com/nostr-protocol/nips/blob/master/02.md)
- [S8 NIP-25 Reactions](https://github.com/nostr-protocol/nips/blob/master/25.md)
- [S9 NIP-09 Event Deletion Request](https://github.com/nostr-protocol/nips/blob/master/09.md)
- [S10 NIP-65 Relay List Metadata](https://github.com/nostr-protocol/nips/blob/master/65.md)
- [S11 NIP-11 Relay Information Document](https://github.com/nostr-protocol/nips/blob/master/11.md)
- [S12 NIP-42 Authentication of clients to relays](https://github.com/nostr-protocol/nips/blob/master/42.md)
- [S13 NIP-22 Comment](https://github.com/nostr-protocol/nips/blob/master/22.md)
- [S14 NIP-57 Lightning Zaps](https://github.com/nostr-protocol/nips/blob/master/57.md)
- [S15 NIP-47 Nostr Wallet Connect](https://github.com/nostr-protocol/nips/blob/master/47.md)
- [S16 NIP-78 Application specific data](https://github.com/nostr-protocol/nips/blob/master/78.md)
- [S17 NIP-44 Encrypted Payloads Versioned](https://github.com/nostr-protocol/nips/blob/master/44.md)

## Appendix A Worked day

At 08:15, Mira publishes three original commitments: publish the landing page, walk for thirty minutes, and read chapter four. Her ring starts at 0 of 3. At 11:10 she marks the page In progress and posts a check-in assigned to the 11:00 slot. The ring remains at 0% and one marker fills.

At 14:40 she marks the walk Done, revises the landing page goal to finish the draft, and explains that publication depends on someone else's review. She completes the revised draft but confirms that the original publication commitment was not fulfilled. The ring is 1 of 3, or 33%, and both original and revised wording remain visible.

At 18:20 she finishes chapter four and records an unscheduled bonus accomplishment. The ring reaches 2 of 3, or 67%; the bonus sits outside it. At 21:45 she closes the day, explains the launch delay, and chooses the unfinished publication goal for tomorrow's draft. The card is Closed at 67%, with three scheduled check-in markers only if she actually assigned updates to all three slots.

Tomorrow she may publish the carried commitment as a new goal. Her previous day's result remains 67% unless she explicitly publishes a labeled correction. A follower can encourage either day, reply to the launch update, and read the same plaintext story in another Nostr client.

## Appendix B Implementation handoff checklist

Start with domain and schema fixture files before building relay-dependent screens. Every adapter exposes its supported NIP subset and shares common event validation. Use fixture-driven reconstruction to verify that a mock transport and the live relay transport produce the same domain behavior.

Record implementation decisions for the schema namespace, thread encoding, relay publication threshold, conflict handling, and signer session policy. Keep the app schema version separate from the library package version. Unknown payload versions render safely and remain available for future migration; old signed events are never rewritten during a migration.

The first end-to-end demo should contain one practiced day, one actual live day, one follower reply, one relay failure with retry, and one reconstruction after clearing the public cache. That demonstrates both the product ritual and the modular protocol foundation.
