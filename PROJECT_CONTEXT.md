# CueDone — Project Context

CueDone is a lightweight visual task-support Chrome extension owned by Cue Anata LLC.

## Brand

**Tagline:** See it. Do it. CueDone.

**Logo mark:** The official CueDone favicon/extension mark is the current treatment in `icons/icon16.png`, `icons/icon32.png`, `icons/icon48.png`, and `icons/icon128.png`: a **black C**, **cream background**, and **orange/amber forward arrow**. Keep those files exactly as approved. Do not redesign, recolor, recrop, regenerate, or reinterpret this mark. Do not replace it with a generic checkmark or an invented icon.

The original full-size raster is `assets/logo-mark.png`. Toolbar/favicon icons are the approved small-size treatment of this brand, not a new design.

**Phase 2 visual direction (approved and frozen):** The current popup and side panel treatment is the official CueDone look. It uses black, warm cream, and orange/amber; the official C + forward-arrow mark; and the tagline “See it. Do it. CueDone.” Do not restyle, recolor, or visually reinterpret this interface unless the user explicitly asks.

**Core philosophy:** External structure → task awareness → increasing independence.

CueDone is intentionally simpler than a project-management app. It helps a person see what comes next, complete a short sequence of tasks, and make progress visible.

## Intended users

**Current MVP:** Adults who want a clean, compact way to see and complete a short personal task list — including people who benefit from external structure for everyday work.

**Later phases (not this build):** Clinicians, educators, and clients/students during teletherapy or classroom screen sharing. Those shared-session workflows are a future use of the Side Panel / Client View, not part of the first milestone.

## Display architecture

CueDone has two equal working views of the **same local task list**. Neither view exists only to launch the other. Both support add, complete, reorder, and delete.

A compact **Top / Side** control in the header switches views. CueDone stores the last selected view in local extension storage and restores it when the toolbar icon is used, if the browser can do so.

### 1. Quick Dropdown View (Top)

The compact toolbar popup.

Purpose:

- Compact personal task list
- Quick glance at what comes next
- Add, complete, reorder, and delete tasks
- Collapse/close quickly

When Top is the saved view, the toolbar icon opens this popup directly. Choosing Top in the header also assigns Top as the saved view.

### 2. Side Panel View (Side)

Opened as a Chromium side panel, from the header control, from a restored toolbar click, or from the browser side panel UI.

Purpose:

- Remain visible beside the user's current webpage/work until the user collapses or closes it, or chooses Top
- Show the same task list more prominently
- Add, complete, reorder, and delete tasks
- Eventually support teletherapy/classroom screen sharing (later Client View work)

When Side is the saved view, the toolbar icon opens Side directly when the browser allows it. Older Chromium keeps the popup fallback: the toolbar may still open Top, which then restores Side if that was last used.

Choosing Top in the header closes Side so it is not left open. Side otherwise stays open until the user collapses or closes it.

Both views must use the same task data. Changes in one view are reflected in the other.

## MVP feature boundary

**Foundation:** Create → check off → reorder → delete tasks, persisted locally, shared by popup and side panel.

**Phase 2 (approved):** Apply CueDone identity and polish core task UX in both views. Top and Side are equal working views with a compact header view control, a saved last-used view restored from the toolbar when the browser allows it, and a setup/work-mode task entry (Done collapses entry; + Add task reopens it). Do not add Client View rewards or other Phase 3 features.

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
- Full visual redesign beyond the approved Phase 2 identity
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
