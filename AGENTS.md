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

Phase 3A Client View presentation is approved and frozen, including a saved Simple/Celebrate completion-style control. Do not implement celebration animations or sounds unless the user explicitly approves Phase 3B. Sound must stay a separate preference from visual completion style.

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

## Reporting

When work is done, clearly report:

1. Files changed
2. Tests run (and results)
3. Any unresolved issues or decisions that need human approval
