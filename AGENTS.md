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

The first milestone is local-only: Chrome extension popup + side panel, shared `chrome.storage.local` task data, create / check off / reorder / delete.

## Implementation expectations

- Keep the UI basic but clean unless a visual pass is explicitly requested.
- Use the approved CueDone logo mark in `assets/logo-mark.png`. Do not invent a replacement icon.
- Reuse the shared task module for both views. Do not fork task state per view.
- Avoid unnecessary dependencies and build tooling.
- Test changes before declaring them complete.

## Reporting

When work is done, clearly report:

1. Files changed
2. Tests run (and results)
3. Any unresolved issues or decisions that need human approval
