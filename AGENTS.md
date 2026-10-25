# Instructions for coding agents

CueDone is owned by Cue Anata LLC. Read `PROJECT_CONTEXT.md` before changing product behavior.

## Source of truth

Treat approved product documentation (`PROJECT_CONTEXT.md` and this file) as the source of truth. If a request conflicts with approved scope, stop and flag the conflict instead of silently expanding the product.

## Scope discipline

- Do not add features that have not been requested.
- Do not redesign approved product behavior without approval.
- Do not begin a later phase unless the user explicitly approves it.
- Prefer simple architecture over premature abstraction.
- Preserve existing working functionality.

## Technical guardrails

Never introduce the following without explicit approval:

- Authentication or user accounts
- Cloud storage, sync, or any external backend (including Supabase)
- Payment or subscription systems (including Stripe)
- AI services
- Analytics or tracking

The first milestone is local-only: Chromium extension popup + side panel, shared local task data, create / check off / reorder / delete.

Phase 2 is approved and frozen: keep the current identity and popup/side panel visual direction in Personal mode. Do not restyle Personal View unless the user explicitly asks.

Phase 3A Client View presentation is approved and frozen: Personal/Client switch, Client focus/progress, and Simple/Celebrate as a saved completion-style control.

Phase 3B Client View celebrations and sound are approved: brief randomized Client + Celebrate micro-feedback, a larger final-task celebration with a 1–2s Client-only trail (Random / Balloons / Stars / Cars / Butterflies), a persisted Sound Off/On control that is independent of Celebrate, and a Client Reward selector with a presentation card. The final-task audio checkpoint adds a persisted Final sound choice: Current tone, Yay!, Applause, Trumpet fanfare, or Hurrah!, plus Preview. Final sounds and final-cue timing are approved and frozen. The individual-task audio checkpoint adds a persisted Task sound choice: None, Bubble Pop (default), Soft Click, Wood Tap, or Random, plus Preview. Random selects one of the three audible task cues per non-final completion. The Client Sound Off/On control gates every Client audio path; Off must stop active Client audio and cancel queued playback. Both Client Preview controls respect Off. Simple mode remains visually and audibly simple. Client + Celebrate plays at most one short Task sound for a non-final completion; a final completion plays only the selected Final sound at the existing cue. Task sound None never suppresses the Final sound. Personal never plays Client audio. Bundled audio provenance is recorded in `assets/audio/README.md`. Do not expand the micro pool, sound choices, or trail options, add a mascot library, or begin a later phase unless the user explicitly asks.

The responsive Client layout checkpoint is implemented: compact Top and narrow Side task cards give task text a full row and move reorder/delete controls to a second row. Personal styling is unchanged.

The Start a New List carryover checkpoint is implemented on the active list. It reviews current unfinished tasks in order, selects them by default, lets the user deselect carryover tasks, and replaces that list only after local storage succeeds. Completed and deselected tasks are removed; a fully completed list starts empty. Creation clears completion feedback without replaying it and opens task entry. Reset List remains the separate action that unchecks the same completed active list. There is no automatic rollover, archive, sublist, or template behavior.

The Personal Public/Private lists checkpoint is implemented: Personal Private and Client continue to share the existing local list. Personal Public is a separate local list that starts empty and never receives a copy of existing Private tasks. A collapsed Personal Settings panel chooses Private or Public. Top and Side synchronize the selected Personal presentation and its list. Add, complete, delete, reorder, Reset List, and Start a New List operate only on the active list. Switching lists cancels an open carryover review and any pending task-entry draft, and does not play sounds, animations, or rewards. Client always uses the Private/Client list and keeps its approved settings. Public/Private are presentation choices, not authentication or access controls. Private task text must never appear in Public.

Optional Personal Private audio is implemented inside Personal Settings and is visible only in Private. It reuses the bundled Task and Final assets with a persisted Personal Sound Off/On control (default Off), Task sound (None, Bubble Pop, Soft Click, Wood Tap, Random), Final sound (Current tone, Yay!, Applause, Trumpet fanfare, Hurrah!), and Preview controls that respect Off. Personal audio preferences are stored separately from Client. A non-final Private completion plays one selected Task cue; a final completion plays only the selected Final sound once after the completion save succeeds. Task sound None still permits the Final sound. The same Personal Sound control also gates the implemented break-clock ring and stops it immediately when switched Off. Public stays silent, including previews and break alerts. Switching to Public or Client stops Personal playback. Loading, reopening, synchronization, unchecking, Reset List, and Start a New List never trigger task or final audio. Audio failure never blocks task saving or a visual break prompt.

Optional Personal Private affirmations and session-ending messages are implemented inside Personal Settings and are visible only in Private. Affirmations default Off and may show one compact accent line above the list: a preset, Custom, or Random. Completed and pause endings use distinct, expressive cards. Random chooses once when Affirmations are turned On or after a successful new list, not on every render, reopen, or Top/Side switch. An all-tasks-completed message (default None) appears after a successful final completion save and does not add a second sound. **Finish for now** is available for a nonempty Private list with unfinished tasks and shows the independent pause message (default **Good progress today.**) without changing tasks, checks, order, or carryover. The deliberate pause and exact task completion state survive closing, reopening, ordinary task edits, and task synchronization until **Continue list** dismisses the ending. Completing tasks while paused does not replace the pause with a completion card. Closing the popup alone is not a session end. Completion messages clear atomically when task data changes and restore only for the exact completed list that produced them. Reset List and successful new-list creation explicitly clear either ending. When the break clock is enabled, Finish for now saves its remaining time with the pause; Continue list, Reset List, or successful new-list creation resumes that saved interval. Reopening never replays task/final audio or completion animation. Public shows none of these controls or messages, and Public list writes never clear or reveal the Private pause. Legacy pause messages restore as deliberate pauses; unbound legacy completion messages remain hidden. Client behavior is unchanged.

The Personal Private **One Active Task** layout checkpoint is implemented. Full list remains the default. A persisted Private-only layout control may show the next unfinished task with a clear Complete action, progress, and a waiting-task count. **Review full list** temporarily exposes every task in its existing order for unchecking, reordering, and deleting; it never copies, removes, or migrates task data. Adding tasks remains available in either layout. The preference synchronizes between Top and Side, while the review expansion itself is temporary presentation state. Public and Client always retain their approved full-list presentations. Switching layouts or opening review must not change tasks or trigger audio, animation, celebrations, rewards, or endings. First / Then and First / Then / Next / Last remain unimplemented and require separate approval.

The bounded Personal Private **Break clock** checkpoint is implemented inside Personal Settings. It defaults Off, persists a 1–240 minute interval, and uses an absolute local deadline shared by Top and Side. At the deadline, an old-fashioned clock shakes; its short synthesized ring plays only when Personal Sound is On. The persisted suggestion source is **Choose for me** (default), which uses CueDone’s whimsical built-in ideas, or **Custom**, which uses only saved user ideas. **Show** saves and reveals one suggestion from the selected source, while **Skip** schedules the next interval without revealing one; **Done** dismisses a revealed suggestion and schedules the next interval. Custom with no saved ideas must explain what is missing instead of silently falling back. Users may add or remove plain-text custom suggestions and receive visible save feedback. Closing Top does not reset the deadline. The optional **Notify me when CueDone is closed** setting defaults Off and requests Chrome’s optional notification permission only from its On action. When enabled, a Chromium alarm may show one silent, privacy-safe system alert if the deadline arrives with no visible CueDone view; the alert contains no task or custom-suggestion text. Opening CueDone keeps the established visual/ring behavior. Pausing, disabling the clock, or switching to Public or Client clears and suppresses the alert. Finish for now pauses the remaining interval; Continue list resumes it. Public and Client neither show nor ring the clock. Storage failures retain the last saved clock, ending, source, suggestions, and notification preference. The versioned timer state, timing rules, pause/resume transitions, and suggestion data live in the platform-neutral `src/shared/break-clock.js`; Chromium permissions, alarms, notifications, persistence, view visibility, and UI wiring stay extension-only. Extension and VR timer storage remain separate, with no migration or automatic sync. Do not add session-duration timers or other timed/notification features without separate approval.

## Roadmap is not implementation authority

The CueDone Development Blueprint is planning context. Recording a roadmap item in this file or `PROJECT_CONTEXT.md` does not authorize implementing it. Work on one explicitly requested, bounded phase at a time.

The audio checkpoints, Start a New List carryover, Personal Public/Private separate lists, optional Personal Private audio, Personal Private affirmations and session-ending messages, Personal Private One Active Task, and the bounded Personal Private break clock are implemented. Remaining Personal enhancement work, including First / Then layouts, session-duration timers, and progress animations, plus later phases such as Connected Client View, Edge distribution on Windows, Meta VR, and cross-device handoff remain unimplemented and unauthorized by roadmap documentation alone.

## Roadmap decision gates

- **Personal Public/Private content:** Public and Private are presentation choices within Personal mode, not authentication or access controls. Private remains the existing list shared with Client. Public is a separate local agenda list. Do not copy Private tasks into Public, treat a visual mode change as a privacy control, or allow Private content to leak into Public. Sharing, accounts, themes, session-duration timers, progress animations, and handoff remain unauthorized. Private audio, affirmations, session-ending messages, and the bounded break clock are implemented for Private only.
- **Connected Client View:** This is a laptop/desktop-only professional workflow for teachers, therapists, and similar hosts and their student/client display. It is separate from Meta VR and smart-glasses work. Before networking, decide who may complete tasks, the client interface, connection and access model, session expiry, reconnect and concurrent-edit behavior, animation ownership, and data retention. A session code is only a possibility. Do not infer approval for accounts, cloud sync, or an external backend.
- **Meta VR:** Meta VR is a Personal productivity experience only; it does not include Client View or Connected Client View. Define whether the target is a browser experience, installed VR app, or another supported Meta delivery model. Do not assume the Chromium extension interface or APIs transfer unchanged. Define VR interaction, accessibility, comfort, and suspension behavior first.
- **Cross-device handoff:** Treat handoff as single-user productivity continuity, separate from Connected Client View. The planned direction is explicit session-ownership transfer between Chrome/Edge and Meta VR, not continuous multi-device co-editing. Before implementation, define transferred state, confirmations and recovery, conflicts, offline/reconnect behavior, expiry, security, privacy, and retention. Future Meta smart glasses may reuse the handoff contract only if supported. Do not infer authorization for accounts, pairing infrastructure, cloud sync, or a backend.
- **Alternate layouts:** One Active Task is implemented with full-list review so every task remains reachable. Before First / Then or First / Then / Next / Last, define behavior for lists longer than the visible slots. Never silently discard or hide required tasks.
- **Visual progress and lifecycle:** Define add/remove/uncheck/reset/carryover behavior, prevent empty-list finales, and decide how future theme finales coexist with existing final celebrations.

## Chromium platform boundary

- Keep Chrome/Edge-specific APIs in `src/platform/browser.js` only.
- Do not call `chrome.*` from `src/shared`, popup UI wiring, or side panel UI wiring.
- Keep break-clock scheduling, optional notification permission, system notifications, view visibility, and view-resume hooks in `src/platform/browser.js`. `src/shared/break-clock.js` must remain a platform-neutral, independently tested state machine: no Chrome APIs, DOM, timers, notifications, or XR imports.
- Persist the extension break timer as the versioned serializable `cuedone.personalBreakTimer.v1` model. A future VR clock may reuse the pure transitions through its own storage, clock, and UI adapters, but must not read, migrate, or automatically synchronize extension timer data.
- Chrome and Edge share this one Chromium adapter and the same app. Do not duplicate task model, storage, or views per browser.
- Chrome and Edge desktop versions include the existing Personal and Client features. Microsoft Edge on Windows remains a distribution target for this same Chromium codebase; store packaging must not fork product behavior.
- A future non-Chromium browser would get a new adapter, not a second copy of CueDone.
- A future Meta VR Personal client must preserve shared task semantics and isolate Meta-specific APIs behind an explicit platform boundary; its exact architecture remains unresolved.

## Implementation expectations

- Keep the current Phase 2 visual direction exactly as approved for Personal View. Do not restyle the popup, side panel, or shared Personal UI unless the user explicitly asks. Client View presentation may use larger type and stronger focus while staying on the same CueDone identity.
- Keep the official CueDone favicon/extension mark exactly as approved: black C, cream background, orange/amber forward arrow.
- Do not edit, regenerate, restyle, or reinterpret files in `icons/`. Do not invent a replacement icon.
- `assets/logo-mark.png` is the original brand raster; do not use it as a reason to change the approved toolbar icons.
- Reuse the shared task module for both views. Do not fork task state per view.
- Treat Top (Quick Dropdown) and Side (side panel) as equal working views of the same list. Do not turn the popup into a launcher for the side panel; if the popup still opens while Side is saved, restore Side as a fallback only.
- Personal Private and Client share the existing local list. Personal Public uses a separate local list. Do not copy Private tasks into Public or render Private task text in Public.
- The toolbar icon restores the last-used view when the browser allows it. Older Chromium keeps the popup fallback. Choosing Top in the header closes Side so it is not left open. Side View otherwise stays open until the user closes it.
- Avoid unnecessary dependencies and build tooling.
- Test changes before declaring them complete.
- Use isolated test data for behavior verification. Never overwrite the user's saved tasks.

## Reporting

When work is done, clearly report:

1. Files changed
2. Tests run (and results)
3. Any unresolved issues or decisions that need human approval
