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

**Later phases:** Progress themes, task-layout options, timed breaks, connected experiences, accounts, and professional profiles remain out of scope until explicitly approved as a bounded phase.

## Display architecture

CueDone has two equal working views of the **active local task list**. Neither view exists only to launch the other. Both support add, complete, reorder, and delete on that active list.

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

Both views must use the same active-list data. Changes in one view are reflected in the other.

### Personal and Client presentation

Personal and Client are presentation modes. Default is Personal.

**Personal Private and Client** share the existing local list (`cuedone.tasks`). **Personal Public** uses a separate local list (`cuedone.publicTasks`) that starts empty. Existing saved tasks stay on the Private/Client list and are never copied into Public automatically.

**Personal:** The approved Phase 2 Top/Side task workflow, plus a collapsed **Settings** panel that chooses **Private** or **Public**. Keep official branding and existing Private styling unchanged. Public is a cleaner, more readable agenda presentation for meetings and short workflows, using the same CueDone visual language. Clearly show which list is active. Switching lists cancels an open carryover review and any pending task-entry draft, and must not play sounds, animations, or rewards. Public/Private are presentation choices, not authentication or access controls. Private task text must never appear in Public, including during loading, switching, reopening, or storage synchronization. Do not add progress or motivator chrome to Personal unless it stays out of this mode.

**Client:** A clearer screen-share presentation for teletherapy, classroom, tutoring, and other supported-learning situations. It uses larger task text, stronger focus on the next unfinished task, quieter completed tasks, a simple progress count, and a locally saved end reward shown as a card. It is not a token economy.

Client View can save a completion style: **Simple** (check, strike-through, dim only) or **Celebrate** (brief randomized visual feedback on completion, with a larger cue when the last unfinished task is done). **Sound: Off | On** is a separate Client View control. It defaults to Off, is persisted locally, and governs every CueDone audio path, including Preview. Turning Sound Off stops active audio and cancels queued playback. Celebrate can be selected while Sound is Off, so completion visuals still run silently. Simple completion never triggers celebration visuals or task-completion audio. Personal View never plays Client celebrations or sounds.

Client View also saves a **Final sound** preference: Current tone (default), Yay!, Applause, Trumpet fanfare, or Hurrah!. Preview plays the selected choice only while Sound is On. The selected choice replaces the existing three-note final tone once at the same final-completion cue. These final sounds and their timing are frozen.

To keep Client View focused, **Add task**, progress, and the master **Sound: Off | On** control remain visible. A clearly labeled, keyboard-accessible **Settings** button in the progress area opens an inline panel that is collapsed by default. The panel contains Simple/Celebrate, Task sound and Preview, Final sound and Preview, and Final celebration. Its open/closed state is presentation-only: toggling it does not save or reset preferences, modify tasks, play sound, or replay animation. Reward controls remain outside this panel in their existing location.

The saved **Task sound** preference controls non-final Client + Celebrate completions: None, Bubble Pop (default), Soft Click, Wood Tap, or Random. Random chooses one of the three audible task cues for each completion. Each cue is a single original bundled one-shot under 0.2 seconds; starting another cue stops the previous playback so rapid checks do not overlap. Task sound Preview respects master Sound Off. None silences non-final completions only and never suppresses the selected final sound. A final completion plays only the Final sound, without a Task sound underneath it.

Reopening CueDone, switching Top/Side, storage synchronization, loading an already completed list, unchecking, and Reset List do not create a forward completion event and therefore do not play Task or Final sounds. Bundled sources, licenses, original-asset provenance, durations, and hashes are recorded in `assets/audio/README.md`; no runtime audio service is used.

Client View also has a **Reward** selector: None, Your Choice, Game Time, Music, Drawing, Reading, Surprise, and Custom. Custom reveals a text field. The chosen reward is stored locally and shown as a clean card during Client View. If a reward is set, the final Celebrate cue prominently reveals it (for example, “REWARD: GAME TIME!”). Personal View does not show this control.

## Implemented feature boundary

**Foundation:** Create → check off → reorder → delete tasks, persisted locally, shared by popup and side panel for the active list. When every task on the active list is complete, **Reset List** can uncheck that list after a brief confirmation. In Client + Celebrate, Reset List appears after the final celebration finishes and the reward is shown. It does not delete tasks, change order, or clear the selected reward or other preferences. Per-task Delete stays separate. Do not show Reset List before the active list is fully complete.

**Start a New List (implemented):** The action applies only to the active list. It opens an inline review of that list’s unfinished tasks in their existing order, selected by default. Users may deselect tasks, then **Create New List** replaces the active list with only the selected unfinished tasks, all unchecked and in order. Completed and deselected tasks are removed; if everything was complete or nothing is selected, the new list is empty. Cancel changes nothing. CueDone rechecks current local storage for that same list before saving so a review cannot overwrite newer task changes from another view, and a failed save leaves the current list visible and unchanged. After a successful save, task entry opens and prior completion audio/animation/reward-reveal state is cleared without replay. Presentation mode, Personal Public/Private choice, Top/Side preference, sound choices, final celebration, and reward remain unchanged. The new list stays as created until the user edits it. This does not add automatic daily rollover, history, archives, sublists, or templates, and **Reset List** remains a separate action.

**Personal Public/Private lists (implemented):** Personal Settings, collapsed by default, contains a Private/Public presentation selector. Top and Side synchronize the selected Personal presentation and its list. Client always uses the existing Private/Client list and retains its approved settings and behavior. A failed preference or list save must not silently lose tasks or show a switch as successful.

**Phase 2 (approved):** CueDone identity and equal Top/Side working views, last-used view restore, and setup/work-mode task entry.

**Phase 3A (approved and frozen):** Client View presentation mode on the same local task list: Personal/Client switch, larger Client task focus, progress, an optional end motivator, and a saved Simple/Celebrate completion-style control.

**Phase 3B (approved):** Client + Celebrate plays brief non-blocking completion feedback. Completing a non-final task shows one randomized micro-celebration and, when Sound is On, plays at most one selected Task sound: None, Bubble Pop (default), Soft Click, Wood Tap, or Random. Each audible Task sound is an original bundled cue under 0.2 seconds, and rapid completions replace rather than overlap playback. Completing the last unfinished task does not play a Task sound; it plays only the frozen selected Final sound once at the existing cue, a 1–2s Client View trail (Balloons, Stars, Cars, or Butterflies, or Random), then the larger “You did it!” burst and reward reveal. Persisted **Final celebration**, **Final sound**, and **Task sound** preferences choose the trail and audio. Final sound choices remain Current tone, Yay!, Applause, Trumpet fanfare, and Hurrah!. Both sound selectors have Preview. Sound is an independent, persisted Off/On preference, is silent by default, governs all audio, and stops active or queued playback when switched Off. Audio failure never blocks task completion or visual/reward behavior. Simple mode and Personal View do not celebrate or play task-completion audio. Do not add more trail types or sound choices or begin a later phase unless the user explicitly approves it.

**Client layout checkpoint (complete):** At compact Top and narrow Side widths, Client task cards give task text a full row and place reorder/delete controls on a compact second row. Wider Side panels retain the existing arrangement. This layout change is Client-only; Personal styling remains frozen.

Tasks persist locally after the extension or browser is reopened. There is no account, no cloud, and no backend.

## Development roadmap (planned, not implemented)

The CueDone Development Blueprint records the following delivery order. It is planning context only: each roadmap step requires separate, explicit authorization before implementation. Documentation of a step does not approve its code, dependencies, architecture, or external services.

1. **Checkpoint and roadmap (complete):** Commit the user-verified Client layout fix and distinguish the implemented product from planned work in the repository documentation.
2. **Audio (complete):** Added persisted Final sound and Task sound selectors with Preview. Final sound remains Current tone, Yay!, Applause, Trumpet fanfare, or Hurrah! at the existing final cue. Task sound is None, Bubble Pop (default), Soft Click, Wood Tap, or Random for non-final Client + Celebrate completions. The one persisted **Sound: Off | On** control governs both selectors, both Preview controls, and all completion audio; Off stops current playback and cancels queued audio. Final recordings are bundled CC0 assets, Task sounds are original deterministic CueDone assets, and there is no runtime audio dependency. Future audio paths such as a break clock or closing audio are not implemented, but must use the same Sound authority if separately approved.
3. **List lifecycle (in progress):** Start a New List carryover and fresh completion-state clearing are implemented, with Reset List preserved as a separate action. Finished for Today / Session encouragement and any other lifecycle additions remain planned and require separate approval.
4. **Task layouts:** Add an optional one-active-task presentation, First / Then, and First / Then / Next / Last after defining how longer lists remain accessible without silently hiding required steps.
5. **Visual progress:** Build one progress engine that scales by completed tasks divided by total tasks. Candidate themes are plant, animal puzzle, gumball jar, dynamite, animal transformation, builder, battery, constellation, and Random. Initial delivery is planned to start with plant, animal puzzle, and gumball jar.
6. **Personal expansion (lists complete):** Separate Public and Private lists are implemented. Optional Private themes, affirmations, timed random breaks, animations, and audio remain planned and require separate approval. Sharing remains unauthorized.
7. **Connected Client View:** Consider a laptop/desktop-only professional workflow for teachers, therapists, and similar hosts working with a student or client on another laptop or desktop. Define host/client permissions, session behavior, connection, and retention before implementation. This is not the Meta VR or smart-glasses experience.
8. **Platform expansion and handoff:** Distribute the full desktop CueDone experience, including Personal and Client features, for Microsoft Edge on Windows from the same Chromium extension codebase used by Chrome. Plan Meta VR as a Personal productivity surface only, without Client View or Connected Client View, with explicit bidirectional session handoff among Chrome, Edge, and Meta devices. One device should own the active session at a time instead of continuously co-editing it. A later Meta smart-glasses experience may reuse the same handoff contract if the hardware and platform support the required interaction and video capabilities.

Picture-plus-text tasks and theme previews are candidate enhancements, not requirements for the first release. There is no planned automatic daily rollover, saved-list archive, or sublist system.

## Unresolved roadmap decisions

These decisions are deliberately open and must be resolved before their affected roadmap phase is authorized:

- **Personal Public/Private later enhancements:** Separate lists are implemented. Public remains a clean agenda presentation; Private remains the existing shared Personal/Client list. Visual presentation is not privacy or authentication. Sharing, accounts, themes, affirmations, timers, and handoff remain unauthorized. Private content must never appear in Public through a default, transition, restore, or later handoff mistake.
- **Connected host/student behavior:** This feature is limited to laptop/desktop use for teachers, therapists, and similar professional hosts and their student/client display. Decide whether a student or client can complete tasks or only the host can; define the interface, connection method, session expiry and access, disconnect/reconnect behavior, concurrent edits, animation ownership, and data retention. A session code is only one possibility. The roadmap does not authorize accounts, cloud sync, or an external backend.
- **Meta VR product form:** Meta VR is limited to Personal productivity; Client View and Connected Client View remain desktop-only. Decide whether Meta support is a browser experience, installed VR application, or another supported delivery model. Define VR interaction, accessibility, comfort, background/suspension behavior, and which Personal concepts carry over. Do not assume the Chromium extension UI or APIs can be reused unchanged.
- **Cross-device handoff:** The planned direction is explicit transfer of session ownership, not continuous mirrored control: start on Chrome or Edge, continue in Meta VR for a bounded work period, then return the updated session to desktop. Define exactly what transfers (for example, the current list, active task, completion state, presentation mode, or preferences), confirmation and recovery behavior, and how conflicts, offline use, reconnect, expiry, security, privacy, and retention work. Handoff may require pairing, identity, sync, or a backend; none is authorized by this roadmap entry alone.
- **Task-layout overflow:** Define how lists longer than two or four tasks behave in First / Then and First / Then / Next / Last. Required steps must never be silently dropped or hidden.
- **Visual-progress lifecycle:** Define what happens when tasks are added, removed, unchecked, reset, or carried into a new list; an empty list must never trigger a finale. Decide how a future theme finale combines with the existing final trail without creating an overly long ending.
- **Session and break timing:** Define whether Finished for Today / Session pauses future timed breaks (the current recommendation is yes), plus interval restart, sleeping-computer, and closed-panel behavior.

## Explicitly out of scope for the current build

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

Those remain outside the implemented product. Some appear in the planning roadmap, but each still requires a separately authorized phase before work begins.

## Technical constraints for the first build

- Chromium extension (Chrome and Edge), Manifest V3
- Toolbar popup and Chromium side panel
- Shared local task data via the platform storage adapter (extension `local` storage): Personal Private and Client use `cuedone.tasks`; Personal Public uses `cuedone.publicTasks`
- Chrome/Edge-specific APIs live only in `src/platform/browser.js`
- Shared task model and UI must not call `chrome.*` or other browser APIs directly
- One app for Chromium browsers; do not fork popup, side panel, or task logic per browser
- Chrome and Edge desktop versions include Personal and Client features; Edge on Windows must continue to use the shared Chromium adapter and product code, and package/store differences must not create a second task model or UI implementation
- A future Meta VR Personal client must preserve shared task semantics while isolating platform-specific APIs behind an explicit adapter or client boundary; Client and Connected Client features do not carry into Meta VR
- No unnecessary dependencies
- No build toolchain required to load the unpacked extension
