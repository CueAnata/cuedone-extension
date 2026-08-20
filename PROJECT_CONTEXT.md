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

**Later phases:** Symbol libraries, timers, accounts, and professional profiles remain out of scope until explicitly approved.

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

### Personal and Client presentation

Personal and Client are presentation modes for the **same task list**, not separate lists. Default is Personal.

**Personal:** The approved Phase 2 Top/Side task workflow. Do not add progress or motivator chrome unless it stays out of this mode.

**Client:** A clearer screen-share presentation for teletherapy, classroom, tutoring, and other supported-learning situations. It uses larger task text, stronger focus on the next unfinished task, quieter completed tasks, a simple progress count, and a locally saved end reward shown as a card. It is not a token economy.

Client View can save a completion style: **Simple** (check, strike-through, dim only) or **Celebrate** (brief randomized visual feedback on completion, with a larger cue when the last unfinished task is done). **Sound: Off | On** is a separate Client View control. It defaults to Off, is persisted locally, and only affects celebration audio. Celebrate can be On while Sound is Off. Personal View never plays these celebrations or sounds.

Client View also has a **Reward** selector: None, Your Choice, Game Time, Music, Drawing, Reading, Surprise, and Custom. Custom reveals a text field. The chosen reward is stored locally and shown as a clean card during Client View. If a reward is set, the final Celebrate cue prominently reveals it (for example, “REWARD: GAME TIME!”). Personal View does not show this control.

## MVP feature boundary

**Foundation:** Create → check off → reorder → delete tasks, persisted locally, shared by popup and side panel. When every task is complete, **Reset List** can uncheck the whole list after a brief confirmation. In Client + Celebrate, Reset List appears after the final celebration finishes and the reward is shown. It does not delete tasks, change order, or clear the selected reward or other preferences. Per-task Delete stays separate. Do not show Reset List before the list is fully complete.

**Phase 2 (approved):** CueDone identity and equal Top/Side working views, last-used view restore, and setup/work-mode task entry.

**Phase 3A (approved and frozen):** Client View presentation mode on the same local task list: Personal/Client switch, larger Client task focus, progress, an optional end motivator, and a saved Simple/Celebrate completion-style control.

**Phase 3B (approved):** Client + Celebrate plays brief non-blocking completion feedback. Completing a non-final task shows one randomized micro-celebration; completing the last unfinished task plays a 1–2s Client View trail (Balloons, Stars, Cars, or Butterflies, or Random), then the larger “You did it!” burst and reward reveal. A persisted **Final celebration** preference chooses that trail. Sound is an independent Off/On preference and is silent by default. Simple mode and Personal View do not celebrate. Do not add more trail types or begin a later phase unless the user explicitly approves it.

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
- Additional mascots, symbol libraries, or animation frameworks beyond the approved Phase 3B Client completion cues
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
