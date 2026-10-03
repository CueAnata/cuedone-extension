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

Phase 3B Client View celebrations and sound are approved: brief randomized Client + Celebrate micro-feedback, a larger final-task celebration with a 1–2s Client-only trail (Random / Balloons / Stars / Cars / Butterflies), a persisted Sound Off/On control that is independent of Celebrate, and a Client Reward selector with a presentation card. Do not expand the micro pool or trail options, add a mascot library, or begin a later phase unless the user explicitly asks.

The responsive Client layout checkpoint is implemented: compact Top and narrow Side task cards give task text a full row and move reorder/delete controls to a second row. Personal styling is unchanged.

## Roadmap is not implementation authority

The CueDone Development Blueprint is planning context. Recording a roadmap item in this file or `PROJECT_CONTEXT.md` does not authorize implementing it. Work on one explicitly requested, bounded phase at a time.

The next proposed phase is **final-task sound choices**: current tone, Yay!, applause, trumpet fanfare, and Hurrah!, using original or properly licensed bundled assets. The single persisted Sound Off/On control must govern all current and future CueDone audio. Visual behavior must remain complete when sound is off. This phase is documented but must not be implemented until the user explicitly authorizes it.

Later planned phases are list lifecycle, alternate task layouts, visual progress themes, Personal Public/Private expansion, and Connected Client View. They remain unimplemented and unauthorized by the blueprint alone.

## Roadmap decision gates

- **Public/Private content:** The current app has one task list shared across presentation modes. Before any Public/Private work, decide between separate lists and explicit per-task visibility, including migration and switching behavior. Do not treat visual mode changes as privacy controls.
- **Connected Client View:** Before any host/student networking, decide who may complete tasks, the student interface, connection and access model, session expiry, reconnect and concurrent-edit behavior, animation ownership, and data retention. A session code is only a possibility. Do not infer approval for accounts, cloud sync, or an external backend.
- **Alternate layouts:** Define behavior for lists longer than the visible First/Then or First/Then/Next/Last slots. Never silently discard or hide required tasks.
- **Visual progress and lifecycle:** Define add/remove/uncheck/reset/carryover behavior, prevent empty-list finales, and decide how future theme finales coexist with existing final celebrations.

## Chromium platform boundary

- Keep Chrome/Edge-specific APIs in `src/platform/browser.js` only.
- Do not call `chrome.*` from `src/shared`, popup UI wiring, or side panel UI wiring.
- Chrome and Edge share this one Chromium adapter and the same app. Do not duplicate task model, storage, or views per browser.
- A future non-Chromium browser would get a new adapter, not a second copy of CueDone.

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
