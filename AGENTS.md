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

Phase 3B Client View celebrations and sound are approved: brief randomized Client + Celebrate micro-feedback, a larger final-task celebration with a 1–2s Client-only trail (Random / Balloons / Stars / Cars / Butterflies), a persisted Sound Off/On control that is independent of Celebrate, and a Client Reward selector with a presentation card. The final-task audio checkpoint adds a persisted Final sound choice: Current tone, Yay!, Applause, Trumpet fanfare, or Hurrah!, plus Preview. Final sounds and final-cue timing are approved and frozen. The individual-task audio checkpoint adds a persisted Task sound choice: None, Bubble Pop (default), Soft Click, Wood Tap, or Random, plus Preview. Random selects one of the three audible task cues per non-final completion. The one Sound Off/On control gates every audio path; Off must stop active audio and cancel queued playback. Both Preview controls respect Off. Simple mode remains visually and audibly simple. Client + Celebrate plays at most one short Task sound for a non-final completion; a final completion plays only the selected Final sound at the existing cue. Task sound None never suppresses the Final sound. Personal never plays Client audio. Bundled audio provenance is recorded in `assets/audio/README.md`. Do not expand the micro pool, sound choices, or trail options, add a mascot library, or begin a later phase unless the user explicitly asks.

The responsive Client layout checkpoint is implemented: compact Top and narrow Side task cards give task text a full row and move reorder/delete controls to a second row. Personal styling is unchanged.

The Start a New List carryover checkpoint is implemented in the shared Personal/Client task list. It reviews current unfinished tasks in order, selects them by default, lets the user deselect carryover tasks, and replaces the list only after local storage succeeds. Completed and deselected tasks are removed; a fully completed list starts empty. Creation clears completion feedback without replaying it and opens task entry. Reset List remains the separate action that unchecks the same completed list. There is no automatic rollover, archive, sublist, or template behavior.

## Roadmap is not implementation authority

The CueDone Development Blueprint is planning context. Recording a roadmap item in this file or `PROJECT_CONTEXT.md` does not authorize implementing it. Work on one explicitly requested, bounded phase at a time.

The audio checkpoints and Start a New List carryover are implemented. A separate IWSDK/WebXR prototype now exists under `prototypes/meta-iwsdk`; it is Personal-only and does not change the Chrome/Edge extension product. In addition to its first-milestone task loop, the prototype has an explicitly approved local New List review that can carry all unfinished tasks or start empty after storage succeeds. Remaining list-lifecycle work, alternate task layouts, visual progress themes, Personal Public/Private expansion, Connected Client View, Edge distribution on Windows, later Meta VR work, and cross-device handoff remain unimplemented and unauthorized by roadmap documentation alone.

## Roadmap decision gates

- **Personal Public/Private content:** Public and Private are planned experiences within Personal mode. Public is a clean, shareable agenda or short workflow for meetings and conference calls; Private is where optional themes, affirmations, timed breaks, animations, and audio belong. The current app has one task list shared across presentation modes. Before implementation, decide between separate lists and explicit per-task visibility, including migration, switching, restore, sharing, and handoff behavior. Do not treat a visual mode change as a privacy control, and never allow Private content to leak into Public.
- **Connected Client View:** This is a laptop/desktop-only professional workflow for teachers, therapists, and similar hosts and their student/client display. It is separate from Meta VR and smart-glasses work. Before networking, decide who may complete tasks, the client interface, connection and access model, session expiry, reconnect and concurrent-edit behavior, animation ownership, and data retention. A session code is only a possibility. Do not infer approval for accounts, cloud sync, or an external backend.
- **Meta VR:** Meta VR is a Personal productivity experience only; it does not include Client View or Connected Client View. The contest prototype uses IWSDK/WebXR as a separate nested package with isolated local persistence. Its implemented scope covers hands-first task entry, one active task, explicit completion, local restoration, seated use, visible waiting/Add feedback, and the bounded New List choice described above. Simulator results do not count as Quest hardware verification. Do not assume the Chromium extension interface or APIs transfer unchanged or expand the prototype into handoff, accounts, cloud sync, rewards, audio, or Client features without explicit approval.
- **Cross-device handoff:** Treat handoff as single-user productivity continuity, separate from Connected Client View. The planned direction is explicit session-ownership transfer between Chrome/Edge and Meta VR, not continuous multi-device co-editing. Before implementation, define transferred state, confirmations and recovery, conflicts, offline/reconnect behavior, expiry, security, privacy, and retention. Future Meta smart glasses may reuse the handoff contract only if supported. Do not infer authorization for accounts, pairing infrastructure, cloud sync, or a backend.
- **Alternate layouts:** Define behavior for lists longer than the visible First/Then or First/Then/Next/Last slots. Never silently discard or hide required tasks.
- **Visual progress and lifecycle:** Define add/remove/uncheck/reset/carryover behavior, prevent empty-list finales, and decide how future theme finales coexist with existing final celebrations.

## Chromium platform boundary

- Keep Chrome/Edge-specific APIs in `src/platform/browser.js` only.
- Do not call `chrome.*` from `src/shared`, popup UI wiring, or side panel UI wiring.
- Chrome and Edge share this one Chromium adapter and the same app. Do not duplicate task model, storage, or views per browser.
- Chrome and Edge desktop versions include the existing Personal and Client features. Microsoft Edge on Windows remains a distribution target for this same Chromium codebase; store packaging must not fork product behavior.
- A future non-Chromium browser would get a new adapter, not a second copy of CueDone.
- The Meta VR Personal prototype must preserve shared task semantics while keeping IWSDK, WebXR, and origin-local persistence inside `prototypes/meta-iwsdk`; the extension must remain build-tool-free and unaware of those platform APIs.

## Implementation expectations

- Keep the current Phase 2 visual direction exactly as approved for Personal View. Do not restyle the popup, side panel, or shared Personal UI unless the user explicitly asks. Client View presentation may use larger type and stronger focus while staying on the same CueDone identity.
- Keep the official CueDone favicon/extension mark exactly as approved: black C, cream background, orange/amber forward arrow.
- Do not edit, regenerate, restyle, or reinterpret files in `icons/`. Do not invent a replacement icon.
- `assets/logo-mark.png` is the original brand raster; do not use it as a reason to change the approved toolbar icons.
- Reuse the shared task module for both views. Do not fork task state per view.
- Treat Top (Quick Dropdown) and Side (side panel) as equal working views of the same list. Do not turn the popup into a launcher for the side panel; if the popup still opens while Side is saved, restore Side as a fallback only.
- Personal and Client are presentation modes for that same list. Do not duplicate task data.
- The toolbar icon restores the last-used view when the browser allows it. Older Chromium keeps the popup fallback. Choosing Top in the header closes Side so it is not left open. Side View otherwise stays open until the user closes it.
- Avoid unnecessary dependencies and build tooling.
- Test changes before declaring them complete.
- Use isolated test data for behavior verification. Never overwrite the user's saved tasks.

## Reporting

When work is done, clearly report:

1. Files changed
2. Tests run (and results)
3. Any unresolved issues or decisions that need human approval
