# CueDone — Project Context

CueDone is a lightweight visual task-support Chrome extension owned by Cue Anata LLC.

## Brand

**Tagline:** See it. Do it. CueDone.

**Logo mark:** A dark green open “C” with a terracotta play triangle in the opening. The official raster is `assets/logo-mark.png`. Toolbar icons are derived from this mark. Do not replace it with a generic checkmark or an invented icon.

**Core philosophy:** External structure → task awareness → increasing independence.

CueDone is intentionally simpler than a project-management app. It helps a person see what comes next, complete a short sequence of tasks, and make progress visible.

## Intended users

**Current MVP:** Adults who want a clean, compact way to see and complete a short personal task list — including people who benefit from external structure for everyday work.

**Later phases (not this build):** Clinicians, educators, and clients/students during teletherapy or classroom screen sharing. Those shared-session workflows are a future use of the Side Panel / Client View, not part of the first milestone.

## Display architecture

CueDone has two complementary, collapsible views that use the **same underlying local task data**.

### 1. Quick Dropdown View

Opened from the Chrome toolbar icon (extension popup).

Purpose:

- Compact personal task list
- Quick glance at what comes next
- Check tasks off
- Add simple tasks
- Collapse/close quickly

This view should feel clean and appropriate for adults.

### 2. Side Panel / Client View

Opened as a Chrome side panel.

Purpose:

- Remain visible beside the user's current webpage/work
- Show tasks more prominently
- Eventually support teletherapy/classroom screen sharing
- Later include larger visual tasks, progress, optional motivators, and optional celebrations

Both views must use the same task data. Changes in one view are reflected in the other.

## MVP feature boundary (this milestone)

Implement only:

**Create → check off → reorder → delete tasks**

Tasks persist locally after the extension or browser is reopened. There is no account, no cloud, and no backend.

## Explicitly out of scope for this build

Do **not** implement:

- User accounts or authentication
- Supabase or any external backend
- Payments, subscriptions, or Stripe
- Cloud synchronization
- Learner profiles
- Large symbol libraries
- Timers
- Data/history dashboards
- Professional tiers
- Elaborate animations
- Reward marketplace
- Complex settings
- Full visual redesign / final branding polish
- AI features
- Analytics or tracking (unless a later phase explicitly requires it for development)

Those belong to later phases and require explicit approval before work begins.

## Technical constraints for the first build

- Chromium extension (Chrome and Edge), Manifest V3
- Toolbar popup and Chromium side panel
- Shared local task data via the platform storage adapter (extension `local` storage)
- Chrome/Edge-specific APIs live only in `src/platform/browser.js`
- Shared task model and UI must not call `chrome.*` or other browser APIs directly
- One app for Chromium browsers; do not fork popup, side panel, or task logic per browser
- No unnecessary dependencies
- No build toolchain required to load the unpacked extension
