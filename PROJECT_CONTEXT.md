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

**Later phases:** Progress themes, additional task-layout options, session-duration timers, connected experiences, accounts, and professional profiles remain out of scope until explicitly approved as a bounded phase. The bounded Personal Private break clock described below is implemented.

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

Personal Settings in **Private** also includes optional audio: **Sound Off/On** (default Off), **Task sound** (None, Bubble Pop, Soft Click, Wood Tap, Random), **Final sound** (Current tone, Yay!, Applause, Trumpet fanfare, Hurrah!), and Preview buttons that respect Off. These preferences are stored separately from Client audio. A non-final Private completion plays one selected Task cue; a final completion plays only the selected Final sound once, immediately after that completion is saved. Task sound None still permits the Final sound. Rapid completions replace rather than overlap Task cues. The same Personal Sound control gates the break-clock ring. Sound Off stops every active Personal playback path and cancels queued sounds. Switching to Public or Client stops Personal playback. **Public stays silent**, including previews and break alerts. Loading, reopening, storage synchronization, unchecking, Reset List, and Start a New List never trigger task or final audio. Audio failure never blocks task saving, completion, or the visual break prompt.

Personal Settings in **Private** also includes optional **Affirmations** (default Off) and two independent session-ending message selectors. When Affirmations are On, one compact accent line appears above the list: a preset, Custom, or Random. Completed and pause endings use distinct, expressive cards. Random chooses once when Affirmations are enabled or after a successful new list, not on every render, reopen, or Top/Side switch. The **all-tasks-completed message** (default None) appears after a successful final completion save and leaves the existing Final sound unchanged. **Finish for now** is available when the Private list is nonempty and has unfinished tasks; it shows the **stopping-with-unfinished-tasks** message (default **Good progress today.**) without changing tasks, checkmarks, order, or carryover selections. The deliberate pause, selected message, and exact task completion state survive closing, reopening, ordinary task edits (including adding tasks), and task synchronization. **Continue list** dismisses only the ending and resumes the saved list. Completing tasks while paused does not replace the pause with a completion card. Closing the popup alone is not a session end. Completion messages clear in the same local storage write whenever Private/Client task data changes and restore only for the exact completed list that produced them. **Reset List** and successful **Start a New List** creation explicitly clear either ending. When the break clock is enabled, Finish for now saves the timer’s remaining time atomically with the ending; Continue list, Reset List, or successful new-list creation resumes that interval. Public task changes neither reveal nor clear Private endings. Legacy pause messages restore as deliberate pauses; unbound legacy completion messages stay hidden. Reopening never replays task/final audio or completion animation. Task data and message preferences remain intact. Custom text is plain text with a 120-character limit. Public shows none of these controls or messages.

Personal Settings in **Private** also includes a persisted **Task layout** choice: **Full list** (default) or **One active task**. One Active Task presents the next unfinished task with an explicit Complete action, completed/total progress, and the number of additional unfinished tasks waiting. **Review full list** temporarily reveals the complete current list in order so tasks can be unchecked, reordered, or deleted; Add task remains available without opening review. This is presentation over the existing Private/Client task data, not a second list or migration. The saved layout synchronizes between Top and Side, while the review expansion is not persisted. Layout changes, review toggles, loading, and synchronization do not produce completion events or replay feedback. Public and Client remain on their existing full-list presentations. First / Then layouts are not part of this checkpoint.

Personal Settings in **Private** also includes a bounded **Break clock** (default Off) with an editable 1–240 minute interval. Turning it On starts a full interval; changing the interval restarts a running interval from the change, or replaces the saved remaining time while paused. At the deadline, CueDone shows a shaking old-fashioned alarm clock. The optional short ring is synthesized locally and uses the existing Personal Sound authority; it has no network or bundled-asset dependency. A persisted **Break suggestions** choice offers **Choose for me** (default), which uses CueDone’s whimsical built-in ideas, or **Custom**, which uses only the user’s saved ideas. **Show** saves and reveals one suggestion from the selected source. **Skip** dismisses the alert without revealing a suggestion, and **Done** dismisses a revealed suggestion; either dismissal starts the next full interval. Custom suggestions are stored as plain text and may be added or removed. Successful Add provides visible confirmation and immediately lists the saved idea. If Custom is selected with no saved ideas, Show is unavailable and CueDone explains that an idea must be added rather than silently using a built-in suggestion.

The break clock stores an absolute local deadline, not a background account or cloud timer. Top and Side read and synchronize one versioned, serializable `cuedone.personalBreakTimer.v1` model containing clock state and custom suggestions. Closing Top does not reset the clock. An open Private view presents the in-app alert at the deadline. An optional **Notify me when CueDone is closed** preference defaults Off and requests Chrome’s optional notification permission only when the user selects On. When enabled, the extension schedules a Chromium alarm and shows one silent system alert only if no CueDone view is visible. The alert says that a break is ready and contains no task text or custom suggestion. Clicking it opens the saved Top/Side view, where Show and Skip remain explicit. Pausing, disabling the clock, or switching to Public or Client clears and suppresses the system alert. If Chrome was not running or the computer slept through the deadline, the overdue state is reconciled when Chrome can next run the extension; operating-system delivery while Chrome itself is fully quit is not promised. Switching to Public or Client does not reset the deadline. Finish for now pauses the saved remaining time; Continue list resumes it. Reset List and successful Start a New List also resume a clock paused by the cleared ending so it cannot remain stranded. A storage failure leaves the previously saved timer model and session state in place and keeps an overdue alert waiting when dismissal cannot be saved.

The break timer follows CueDone’s established shared-core/platform-adapter boundary. `src/shared/break-clock.js` owns the versioned data model, timing rules, pause/resume transitions, and built-in/custom suggestion data without importing Chrome APIs, DOM, timers, notifications, or XR code. The Chromium adapter owns view wake-up scheduling, optional permission requests, background alarms, system notifications, and visible-view reporting; `src/platform/break-notifications.js` plans those actions from serializable state without calling Chrome. The existing popup/side-panel task-list controller owns extension UI and `preferences.js` owns extension-local persistence. A future Personal VR implementation may reuse the pure timer model through its own clock, storage, and UI adapters. Extension and VR storage remain separate; this phase adds no migration, automatic sync, or handoff.

**Client:** A clearer screen-share presentation for teletherapy, classroom, tutoring, and other supported-learning situations. It uses larger task text, stronger focus on the next unfinished task, quieter completed tasks, a simple progress count, and a locally saved end reward shown as a card. It is not a token economy.

Client View can save a completion style: **Simple** (check, strike-through, dim only) or **Celebrate** (brief randomized visual feedback on completion, with a larger cue when the last unfinished task is done). **Sound: Off | On** is a separate Client View control. It defaults to Off, is persisted locally, and governs every Client audio path, including Client Preview. Turning Client Sound Off stops active Client audio and cancels queued playback. Celebrate can be selected while Sound is Off, so completion visuals still run silently. Simple completion never triggers celebration visuals or Client task-completion audio. Personal View never plays Client celebrations or Client sounds; Personal Private uses its own Sound, Task sound, and Final sound preferences.

Client View also saves a **Final sound** preference: Current tone (default), Yay!, Applause, Trumpet fanfare, or Hurrah!. Preview plays the selected choice only while Sound is On. The selected choice replaces the existing three-note final tone once at the same final-completion cue. These final sounds and their timing are frozen.

To keep Client View focused, **Add task**, progress, and the master **Sound: Off | On** control remain visible. A clearly labeled, keyboard-accessible **Settings** button in the progress area opens an inline panel that is collapsed by default. The panel contains Simple/Celebrate, Task sound and Preview, Final sound and Preview, and Final celebration. Its open/closed state is presentation-only: toggling it does not save or reset preferences, modify tasks, play sound, or replay animation. Reward controls remain outside this panel in their existing location.

The saved **Task sound** preference controls non-final Client + Celebrate completions: None, Bubble Pop (default), Soft Click, Wood Tap, or Random. Random chooses one of the three audible task cues for each completion. Each cue is a single original bundled one-shot under 0.2 seconds; starting another cue stops the previous playback so rapid checks do not overlap. Task sound Preview respects master Sound Off. None silences non-final completions only and never suppresses the selected final sound. A final completion plays only the Final sound, without a Task sound underneath it.

Reopening CueDone, switching Top/Side, storage synchronization, loading an already completed list, unchecking, and Reset List do not create a forward completion event and therefore do not play Task or Final sounds. Bundled sources, licenses, original-asset provenance, durations, and hashes are recorded in `assets/audio/README.md`; no runtime audio service is used.

Client View also has a **Reward** selector: None, Your Choice, Game Time, Music, Drawing, Reading, Surprise, and Custom. Custom reveals a text field. The chosen reward is stored locally and shown as a clean card during Client View. If a reward is set, the final Celebrate cue prominently reveals it (for example, “REWARD: GAME TIME!”). Personal View does not show this control.

## Implemented feature boundary

**Foundation:** Create → check off → reorder → delete tasks, persisted locally, shared by popup and side panel for the active list. When every task on the active list is complete, **Reset List** can uncheck that list after a brief confirmation. In Client + Celebrate, Reset List appears after the final celebration finishes and the reward is shown. It does not delete tasks, change order, or clear the selected reward or other preferences. Per-task Delete stays separate. Do not show Reset List before the active list is fully complete.

**Start a New List (implemented):** The action applies only to the active list. It opens an inline review of that list’s unfinished tasks in their existing order, selected by default. Users may deselect tasks, then **Create New List** replaces the active list with only the selected unfinished tasks, all unchecked and in order. Completed and deselected tasks are removed; if everything was complete or nothing is selected, the new list is empty. Cancel changes nothing. CueDone rechecks current local storage for that same list before saving so a review cannot overwrite newer task changes from another view, and a failed save leaves the current list visible and unchanged. After a successful save, task entry opens and prior completion audio/animation/reward-reveal state is cleared without replay. Presentation mode, Personal Public/Private choice, Top/Side preference, sound choices, final celebration, and reward remain unchanged. The new list stays as created until the user edits it. This does not add automatic daily rollover, history, archives, sublists, or templates, and **Reset List** remains a separate action.

**Personal Public/Private lists (implemented):** Personal Settings, collapsed by default, contains a Private/Public presentation selector. Top and Side synchronize the selected Personal presentation and its list. Client always uses the existing Private/Client list and retains its approved settings and behavior. A failed preference or list save must not silently lose tasks or show a switch as successful.

**Personal Private audio (implemented):** Optional audio controls appear in Personal Settings only while Private is active. They reuse the bundled Task and Final assets and persist separately from Client (`cuedone.personalCompletionSound`, `cuedone.personalTaskSound`, `cuedone.personalFinalSound`). Public remains silent. Client Simple/Celebrate behavior and Client audio settings are unchanged.

**Personal Private affirmations and session endings (implemented):** Private Settings include Affirmations plus independent completed-list and unfinished-pause message choices, persisted as `cuedone.personalAffirmation`, `cuedone.personalCompleteMessage`, `cuedone.personalPauseMessage`, and `cuedone.personalEnding`. The unfinished choice defaults to **Good progress today.** A deliberate pause persists with the existing task checks and order across closing and reopening until Continue list, Reset List, or successful new-list creation clears it. Top and Side synchronize selections, custom text, and the current message. Public and Client do not show these controls or messages. Storage failures keep the previous state and show an error.

**Personal Private One Active Task (implemented):** Private Settings persist `cuedone.personalTaskLayout` as Full list (default) or One active task. The focused presentation derives its active task, progress, and waiting count from the existing ordered Private list. Its temporary full-list review exposes all tasks and existing controls without changing storage. Completing uses the same saved completion path as the full list; a failed save restores the prior task and reports the existing storage error. Public and Client bypass this preference and retain full-list behavior.

**Personal Private break clock (implemented):** Private Settings persist the versioned `cuedone.personalBreakTimer.v1` model. The clock defaults Off, supports a 1–240 minute interval, displays a local old-fashioned alarm animation when due, and optionally rings through the Personal Sound gate. Choose for me uses only CueDone’s built-in playful suggestions; Custom uses only saved custom suggestions. Show reveals one saved random suggestion from that selected source; Skip does not reveal one; Done or Skip begins the next interval. Top and Side synchronize the clock, source, custom ideas, and the separate `cuedone.personalBreakNotifications` opt-in. Selecting notification On requests Chrome’s optional permission; when granted, a silent task-free alert may appear at the deadline while no CueDone view is visible. Finish for now pauses remaining time, and Continue list resumes it. Public and Client do not expose or receive the feature. Storage failures preserve the last saved state. Its shared core is platform-neutral; Chromium UI, persistence, permissions, alarms, and notification delivery stay extension-specific, and VR data is neither read nor migrated.

**Phase 2 (approved):** CueDone identity and equal Top/Side working views, last-used view restore, and setup/work-mode task entry.

**Phase 3A (approved and frozen):** Client View presentation mode on the same local task list: Personal/Client switch, larger Client task focus, progress, an optional end motivator, and a saved Simple/Celebrate completion-style control.

**Phase 3B (approved):** Client + Celebrate plays brief non-blocking completion feedback. Completing a non-final task shows one randomized micro-celebration and, when Sound is On, plays at most one selected Task sound: None, Bubble Pop (default), Soft Click, Wood Tap, or Random. Each audible Task sound is an original bundled cue under 0.2 seconds, and rapid completions replace rather than overlap playback. Completing the last unfinished task does not play a Task sound; it plays only the frozen selected Final sound once at the existing cue, a 1–2s Client View trail (Balloons, Stars, Cars, or Butterflies, or Random), then the larger “You did it!” burst and reward reveal. Persisted **Final celebration**, **Final sound**, and **Task sound** preferences choose the trail and audio. Final sound choices remain Current tone, Yay!, Applause, Trumpet fanfare, and Hurrah!. Both sound selectors have Preview. Sound is an independent, persisted Off/On preference, is silent by default, governs all audio, and stops active or queued playback when switched Off. Audio failure never blocks task completion or visual/reward behavior. Simple mode does not celebrate or play Client task-completion audio. Personal View does not celebrate; Personal Private may play its own Task and Final sounds when Personal Sound is On. Do not add more trail types or sound choices or begin a later phase unless the user explicitly approves it.

**Client layout checkpoint (complete):** At compact Top and narrow Side widths, Client task cards give task text a full row and place reorder/delete controls on a compact second row. Wider Side panels retain the existing arrangement. This layout change is Client-only; Personal styling remains frozen.

Tasks persist locally after the extension or browser is reopened. There is no account, no cloud, and no backend.

## Chrome checkpoint — October 5, 2026

The Chrome checkout remains on `chrome-personal-public-private`. Today's scoped fixes prevent outdated loads from replacing the active list during rapid switching, restore the last saved setting with a visible error when a settings save fails, and distinguish deliberate pause state from completion feedback. Adding or editing tasks preserves a deliberate pause across reopening until **Continue list** is selected. An old completion message clears when unfinished work is added; completion feedback is bound to the completed task data that produced it. **Reset List** and **Start a New List** explicitly clear either ending.

Jennie reported successful native Chrome checks for Top/Side switching and Public/Private separation, followed by a successful final manual check of the intended pause flow: pause the list, add a task, close and reopen CueDone, then use **Continue list**. The list reopens paused with the added task retained; Continue dismisses the pause without resetting task progress.

Automated verification passed **144 tests with zero failures**, plus isolated browser checks for rapid switching, settings-save recovery, pause/completion persistence, partial-save failure, Public/Private separation, Top/Side synchronization, and audio boundaries. Native manual results above are user-reported; isolated browser adapter checks do not substitute for native Chrome verification. Existing saved tasks, `layout-preview.html`, and separate VR work were preserved. The reliability checkpoint was committed locally before integration; it was not pushed, published, or deployed. No later phase was started.

## Personal Private One Active Task verification — October 11, 2026

The One Active Task implementation was verified against the actual shared MV3 popup and side-panel modules with fresh synthetic extension storage. Full list remains the default; selecting One active task persists in Private and synchronizes between Top and Side. The focused view advances only after a successful task save and reports completed/total progress plus the additional unfinished-task count. Its keyboard-accessible Review full list control exposes every task and the existing uncheck, reorder, and delete controls, while Show current task returns to the focused presentation.

Isolated interaction checks covered successful and failed Complete saves, uncheck, reorder, delete, add, empty and all-complete states, Reset List, New List carryover and save failure, deliberate pause/Continue list, reopening, Public/Private isolation, Client full-list behavior, and layout-setting failure recovery. Layout and review changes did not alter tasks or produce audio, animation, celebration, or session-ending feedback. Top plus narrow and wide Side viewports remained within their available width with keyboard-operable native controls. The corrected `layout-preview.html` now uses direct-file-safe relative CSS and logo paths and opens as a synthetic Private One Active Task example; it remains a visual review aid and does not read or write saved extension tasks. Automated browser checks use isolated sample data and do not substitute for a final manual unpacked-extension review in Chrome.

## Personal Private break clock implementation — October 11, 2026

The bounded break-clock phase adds no task schema, backend, account, runtime service, or dependency. Its version-one serializable model and pure transitions live in `src/shared/break-clock.js`; Top and Side continue to mount the same extension task-list UI. `src/platform/browser.js` owns Chromium scheduling, optional permission requests, silent system notifications, view visibility, and view-resume hooks, while `src/platform/break-notifications.js` keeps the background decision rules independently testable. The saved deadline uses epoch time, so elapsed closed-popup, browser-restart, and sleeping-computer time counts toward the interval. An open Private view schedules the established visual cue. With the separately persisted notification opt-in enabled and Chrome permission granted, a closed or hidden CueDone view may instead receive one privacy-safe system alert. This applies the same shared-core/platform-adapter decision already used by the VR prototype; extension and VR storage stay isolated and no timer data is migrated or synchronized.

Focused isolated checks cover interval deadlines and changes, restoration after elapsed time, pause/resume, Show/Skip/Done, built-in and custom suggestions, Top/Side storage synchronization, atomic lifecycle writes, storage rejection, Private-only rendering, responsive controls, reduced motion, and the Personal master audio gate. The full suite passes 176 tests, including independent shared-model boundary tests and Chromium scheduler-adapter coverage. An isolated browser rerun confirmed the versioned timer model still renders the due prompt and saves a revealed suggestion in Top and Side without reading extension user data. A final unpacked-extension interaction review remains required before this uncommitted phase is approved.

## Personal Private closed-view break notification — October 11, 2026

The separately authorized notification opt-in adds the required Chromium alarms permission and keeps notifications optional. Chrome requests notification permission only from the user’s **Notify me when CueDone is closed: On** click. The system alert is silent and contains only generic break-ready copy—never task text, list state, a selected custom suggestion, or other Private content. The service worker schedules against the existing saved deadline and records delivery per deadline so one due interval cannot stack duplicate alerts. A visible Top or Side view keeps the established in-app alarm behavior; a hidden or closed view allows the system alert. Finish for now, Break clock Off, Notify Off, Public, and Client clear and suppress it. Clicking the alert restores the saved Top/Side view without revealing a suggestion or dismissing the waiting break.

The portable timer model is unchanged by this phase. Pure notification planning is independently tested in `src/platform/break-notifications.js`, while Chrome permissions, alarms, notification delivery, and open-view reporting remain in the Chromium adapter. The full suite passes 187 tests. Service-worker integration checks simulate a due Private timer with no connected CueDone view, verify exactly one privacy-safe notification, confirm no permission request occurs in the background, verify Public clears it, and cover a Top popup being destroyed while Chrome completes the permission grant. Controller tests separately cover pause, clock Off, notification Off, Public, Client, denied permission, visible view, retained-but-unfocused views, and duplicate-delivery suppression.

The first native Chrome test exposed a Side-panel lifecycle defect: Chrome created and fired the saved one-minute alarms, but a retained Side-panel runtime port still reported the closed panel as visible, so the service worker deliberately suppressed `notifications.create()` and marked the deadline handled. The Chromium adapter now listens for Chrome’s authoritative `sidePanel.onClosed` event and lets that closed state override a stale port; Top also reports `pagehide` and `beforeunload`. A regression test reproduces the retained-port condition. Alarm scheduling now reads the created alarm back from Chrome, and privacy-safe service-worker diagnostics report scheduling, alarm wake-up, the selected plan, and successful notification creation. Native Chrome notification-center, minimized-window, and click-to-restore behavior require the documented retest after reloading the unpacked extension; automated adapter simulation is not operating-system notification verification.

A second native Top-popup test exposed a separate optional-permission lifecycle failure. Chrome granted the Notifications permission, but opening the permission prompt closed the toolbar popup before its awaited continuation could save `cuedone.personalBreakNotifications`; with no persisted opt-in, the service worker correctly created no later alarm. The On action now dispatches the preference save and permission request together from the initiating user gesture, with the save issued first. This preserves the explicit opt-in even if Chrome destroys the popup while its permission prompt is open, while a rejected storage write still leaves the prior setting in place. An ordering regression test covers the popup-close failure mechanism. Native delivery still requires retesting after reloading the unpacked extension.

The next native retest confirmed that the opt-in persisted and Chrome created and fired its alarm, but a retained Side-panel document continued reporting `visibilityState: visible` after CueDone was no longer active. The background therefore selected its visible-view suppression path and never called `notifications.create()`. View reporting now requires both a visible document and browser focus, listens for focus and blur changes, and still honors Chrome’s authoritative Side-panel close event. This prevents a retained, collapsed, background, or unfocused CueDone document from suppressing the requested system alert. A focused visible CueDone view continues to use the in-app alarm instead.

Native review also clarified that Chrome system notifications are delivered through the operating system rather than as an indicator inside Chrome’s extension toolbar. A due opted-in break now also places a privacy-safe `!` badge on the CueDone toolbar icon, including when a retained view receives the in-app due state. The badge contains no task or suggestion content and clears when the break advances, the timer or notification preference is disabled, the session is paused, or CueDone switches to Public or Client. The system-notification path remains in place.

## Local Client sequence groups — October 18, 2026 (implemented, awaiting review)

The separately requested Client-only First / Then workflow is optional and defaults Off for existing lists. Client Settings offers 2, 3, or 4 parts: First, Then, Next, Last (using the first two or three labels when fewer parts are selected). Parts are groups over the existing Private/Client task list, with no task-count limit per group. Creators choose an optional activity from each part’s arrow button and enter any number of their own tasks. The compact picker uses original local pictograms with visible labels: Listening, Answering Questions, Story, Music, Work Activity, Movement, Sensory, Game Time, Play Time, Chat/Talk, Free Choice, Practice, Reward. Custom tasks only clears the optional activity. Opening a part selects its Add to context; task cards offer Move to… for reassignment instead of repeating an always-visible group selector. All parts and tasks remain accessible; the current part is the earliest group with unfinished tasks. Completing every task in that group advances focus to the next unfinished group, skipping empty groups. Empty lists never have a current part or completion state. Unchecking or reassigning an earlier task can return focus to an earlier unfinished part.

Versioned local metadata lives in `cuedone.clientSequence.v1`, separate from task text/checks/order. Task writes reconcile assignments in the same local storage write; add, reorder, delete, Reset, carryover, reopening, and Top/Side synchronization preserve relevant assignments. Disabling the feature retains assignments and selected part activities. Reducing the part count presents later assignments in the last visible part without discarding their original values, so re-expansion restores them. Public list writes do not touch Client sequence metadata; Personal views render their existing layouts without sequence controls. Group/configuration edits use no completion event. When a sequence is active, its parts replace the separate Reward panel and its legacy reward reveal text; Reward is an optional activity for the final part and is never forced. The saved legacy reward stays untouched and its established panel/reveal behavior returns when the sequence is Off. Client Simple/Celebrate, sound, and final-animation timing remain unchanged. This authorizes no Personal First/Then layout, remote host/client display, networking, accounts, backend, or later roadmap phase. Implementation remains uncommitted for review.

## Local animation checkpoint — October 18, 2026

Local feature commit: `2ea727c` (`2ea727ced5fb7bc5ce78f32cde08cea56fa503a4`) — **Complete per-list Random selection, Submarine registration, and animation polish**. This checkpoint includes 15 intended source/test files. All 228 tests passed, along with JavaScript syntax and Git whitespace checks. Existing Clear List/Clear All wiring was preserved. Nothing was pushed.

Verified location:

- Repository root and active linked worktree: `/Users/truthbetold/Desktop/CueDone/cuedone-chrome-personal-lists`.
- Current branch containing the feature commit: `chrome-personal-public-private`.
- Shared repository and Git object storage: `/Users/truthbetold/Desktop/CueDone/cuedone-extension/.git` (main worktree: `/Users/truthbetold/Desktop/CueDone/cuedone-extension`, currently on the separate `vr-personal-prototype` branch).
- Linked-worktree Git metadata: `/Users/truthbetold/Desktop/CueDone/cuedone-extension/.git/worktrees/cuedone-chrome-personal-lists`.

To locate the feature again, open the linked worktree above and run `git show 2ea727c`. The feature commit was HEAD when this checkpoint was recorded; this documentation is saved in a separate subsequent local commit without amending the feature commit. The untracked `/Users/truthbetold/Desktop/CueDone/cuedone-chrome-personal-lists/cuedone-extension-copy.js` remains untouched and outside both commits.

## Development roadmap (planned, not implemented)

The CueDone Development Blueprint records the following delivery order. It is planning context only: each roadmap step requires separate, explicit authorization before implementation. Documentation of a step does not approve its code, dependencies, architecture, or external services.

1. **Checkpoint and roadmap (complete):** Commit the user-verified Client layout fix and distinguish the implemented product from planned work in the repository documentation.
2. **Audio (complete):** Added persisted Final sound and Task sound selectors with Preview. Final sound remains Current tone, Yay!, Applause, Trumpet fanfare, or Hurrah! at the existing final cue. Task sound is None, Bubble Pop (default), Soft Click, Wood Tap, or Random for non-final Client + Celebrate completions. The persisted Client Sound control governs Client audio, while the separate Personal Sound control governs Private completion audio and the implemented synthesized break-clock ring. Off stops current playback and cancels queued audio. Final recordings are bundled CC0 assets, Task sounds are original deterministic CueDone assets, and there is no runtime audio dependency.
3. **List lifecycle (carryover and session messages complete):** Start a New List carryover, Reset List, and Personal Private session-ending messages (**Finish for now** / completed-list message) are implemented. Any later lifecycle additions still require separate approval.
4. **Task layouts (One Active Task complete):** Personal Private now offers Full list or One active task, with a temporary full-list review that keeps every task accessible. First / Then and First / Then / Next / Last remain planned and require a separate bounded phase after defining overflow behavior.
5. **Visual progress / progress animations (remaining):** Build one progress engine that scales by completed tasks divided by total tasks. Candidate themes are plant, animal puzzle, gumball jar, dynamite, animal transformation, builder, battery, constellation, and Random. Initial delivery is planned to start with plant, animal puzzle, and gumball jar. This remains unauthorized until explicitly approved.
6. **Personal expansion (break clock complete):** Separate Public and Private lists, optional Personal Private audio, affirmations, session-ending messages, and the bounded interval-based break clock are implemented. **Session-duration timers**, other timer types, and **progress animations** remain planned and require separate approval. Sharing remains unauthorized.
7. **Connected Client View:** Consider a laptop/desktop-only professional workflow for teachers, therapists, and similar hosts working with a student or client on another laptop or desktop. Define host/client permissions, session behavior, connection, and retention before implementation. This is not the Meta VR or smart-glasses experience.
8. **Platform expansion and handoff:** Distribute the full desktop CueDone experience, including Personal and Client features, for Microsoft Edge on Windows from the same Chromium extension codebase used by Chrome. Plan Meta VR as a Personal productivity surface only, without Client View or Connected Client View, with explicit bidirectional session handoff among Chrome, Edge, and Meta devices. One device should own the active session at a time instead of continuously co-editing it. A later Meta smart-glasses experience may reuse the same handoff contract if the hardware and platform support the required interaction and video capabilities.

Picture-plus-text tasks and theme previews are candidate enhancements, not requirements for the first release. There is no planned automatic daily rollover, saved-list archive, or sublist system.

## Unresolved roadmap decisions

These decisions are deliberately open and must be resolved before their affected roadmap phase is authorized:

- **Personal Public/Private later enhancements:** Separate lists, optional Private audio, affirmations, session-ending messages, and the bounded break clock are implemented. Public remains a clean, silent agenda presentation; Private remains the existing shared Personal/Client list. Visual presentation is not privacy or authentication. Sharing, accounts, themes, session-duration timers, other timed features, **progress animations**, and handoff remain unauthorized. Private content must never appear in Public through a default, transition, restore, or later handoff mistake.
- **Connected host/student behavior:** This feature is limited to laptop/desktop use for teachers, therapists, and similar professional hosts and their student/client display. Decide whether a student or client can complete tasks or only the host can; define the interface, connection method, session expiry and access, disconnect/reconnect behavior, concurrent edits, animation ownership, and data retention. A session code is only one possibility. The roadmap does not authorize accounts, cloud sync, or an external backend.
- **Meta VR product form:** Meta VR is limited to Personal productivity; Client View and Connected Client View remain desktop-only. Decide whether Meta support is a browser experience, installed VR application, or another supported delivery model. Define VR interaction, accessibility, comfort, background/suspension behavior, and which Personal concepts carry over. Do not assume the Chromium extension UI or APIs can be reused unchanged.
- **Cross-device handoff:** The planned direction is explicit transfer of session ownership, not continuous mirrored control: start on Chrome or Edge, continue in Meta VR for a bounded work period, then return the updated session to desktop. Define exactly what transfers (for example, the current list, active task, completion state, presentation mode, or preferences), confirmation and recovery behavior, and how conflicts, offline use, reconnect, expiry, security, privacy, and retention work. Handoff may require pairing, identity, sync, or a backend; none is authorized by this roadmap entry alone.
- **Task-layout overflow:** One Active Task keeps all tasks reachable through Review full list. Define how lists longer than two or four tasks behave before First / Then or First / Then / Next / Last is authorized. Required steps must never be silently dropped or hidden.
- **Visual-progress lifecycle:** Define what happens when tasks are added, removed, unchecked, reset, or carried into a new list; an empty list must never trigger a finale. Decide how a future theme finale combines with the existing final trail without creating an overly long ending.
- **Additional timing behavior:** The bounded Personal Private break clock is implemented: changing the interval restarts it, Finish for now pauses it, Continue/Reset/New List resume a pause cleared by those actions, elapsed sleep and browser-closed time count, and an overdue prompt appears when Private is next available. Its separately enabled, silent closed-view notification is also implemented. Any session-duration timer, additional notification type, or other timed behavior remains unauthorized.

## Explicitly out of scope for the current build

Do **not** implement:

- User accounts or authentication
- Supabase or any external backend
- Payments, subscriptions, or Stripe
- Cloud synchronization
- Learner profiles
- Large symbol libraries
- Additional timers or system/background notifications beyond the implemented Private break-clock opt-in
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

Client activity picker review update: Settings confirmation reads **Save**, distinct from task-entry **Done**. New activity choices omit Game Time and Free Choice, label structured play **Play**, and include Computer, Greetings, and Goodbye. Previously saved activity IDs remain readable. Regular Client task cards also offer the pictogram picker, stored as Client-only metadata without replacing custom task text or checks; sequence part activities and legacy sequence-Off rewards remain independent.

Client sequence activity labels alone do not count as tasks. Each selected part activity now has an explicit **Add [activity] task** action that saves a normal unchecked task in that part. These tasks use the existing completion, advancement, and final-celebration flow; custom task entry and any number of tasks per part remain supported.

Client Clear All also clears sequence activity selections and task activity metadata in the same successful storage write as task removal, while keeping sequence mode and part count. Personal clearing behavior is unchanged.

Client sequence correction: selecting a part activity creates one normal task only when that part is empty. Re-selecting never appends duplicates to a populated part. The repeated Add activity buttons are removed. Client task cards have explicit Complete buttons using the existing checkbox completion path; older saved activity-only empty parts offer Complete [activity] to save and complete their task. Existing tasks are never deduplicated or removed automatically.

Client Settings Save waits for pending settings writes, closes Settings and task entry, and returns to the list. Part category dropdowns live in section headers; Custom reveals one inline task prompt in that part. Reset List is available for partially completed Client lists and only unchecks tasks. Clear All removes tasks and selected activities; sequence layout preference is retained.

Client sequence card correction: each part is one visible card containing its category dropdown and normal task checkboxes. Matching activity text is not repeated; multiple custom tasks remain individually reachable inside the same part. Completed rows fade. Settings has only the top Save, hides the working list while open, and returns to that list on Save. Clear All uses the current mounted view button and waits for pending sequence settings writes.

Empty Client lists now reopen with Add a task / Add / Done visible, regardless of a previously collapsed entry preference. Settings Save also opens task entry when the Client list is empty, for both full-list and sequence layouts; populated-list behavior is unchanged.

Client sequence mode hides the global Add a task / Add / Done / Add to row and Add task toggle. Tasks are chosen or entered with Custom inside the part cards. Turning sequence Off restores normal full-list task entry without changing tasks or the saved entry preference. Personal is unchanged.

Final sound expansion approved: Random plus Party horn, Cracking whip, Cash register ding, Chiptune blip, Rimshot (ba-dum-dish), Jackpot coins, and Gong hit. Shared Client and optional Personal Private final-sound selectors use bundled original synthesized clips; existing Sound Off gating, Simple behavior and final timing remain unchanged. Random samples uniformly from all 12 actual cues at playback, including previews, without changing the saved selection.

Final sound default update: Random is first in both Client and Personal Private final-sound dropdowns and is the fallback for missing/invalid preferences. Explicit saved sound choices, including Current tone, remain unchanged.

Task sound default update: Random is first and the missing/invalid-preference default in both Client and Personal Private task-sound dropdowns. Explicit saved choices, including None and Bubble Pop, remain unchanged. Random still selects among the three existing audible task cues; sound gating and Simple/Celebrate behavior are unchanged.

Client List layout now offers Full list — Custom tasks (default, no activity picker), Full list — Activity choices, and First / Then sequence. Parts (2–4) appears only for the sequence. Layout switching preserves all tasks, completion state, task activity metadata and part assignments. Client task cards use the checkbox as their single completion control; the redundant Complete button is removed. Personal layouts are unchanged.

## Grouped Client activities and local routines — October 18, 2026

The approved two-step enhancement groups both Client activity pickers under Communication & Language; Regulation & Breaks; Core Activities; and Motivation & Personalization. Listening and Work Activity remain available; Play is labeled Structured Play while retaining its stored ID. Existing local pictograms and visible labels remain; no badges or external images were added.

Client Settings offers an explicit named Save as Routine, saved-routine selection, Load routine, and Delete routine. Routines use local `cuedone.clientRoutines.v1` storage and contain layout, 2–4 part configuration, activity choices, task text/order, and part assignments. They never retain completion checks or task identities; loading creates fresh unchecked tasks. Replacing a nonempty Private/Client list requires inline confirmation, with Cancel and a stale-list check. Empty lists load directly. Deleting a routine never changes the active task list. Routines do not save audio preferences or rewards, play completion feedback, keep automatic history, or introduce remote viewing, networking, accounts, or sync. Both Top and Side expose the same controls; opening Settings refreshes saved routines. Personal UI remains unchanged. This checkpoint is approved for local commit.

Client activity catalog expansion: retain Work Activity (not Word Activity) and add Worksheet, Flash Cards, Free Play, Writing, Math, Speech, OT, PT, Outside Play, and Special Activity. Each has a local pictogram and visible label in both Client activity pickers and is supported by saved routines. Work Activity is grouped with Core Activities; Speech with Communication & Language; OT, PT, and Outside Play with Regulation & Breaks; Special Activity with Motivation & Personalization.

Reading is also available under Communication & Language, with its own labeled local pictogram and routine persistence.

Additional requested activity choices: Quiz under Communication & Language; Art, Puzzles, and Daily Living under Core Activities. Custom remains in Motivation & Personalization with its existing inline task entry. All new choices retain labeled local pictograms and routine support.

Personal message selectors now put Random first and use it for missing/invalid affirmation, completion-message and pause-message choices. Affirmations remain Off by default; explicit saved None, Off, presets and Custom values are retained. The CSS Plant visual has a specific 96px minimum canvas height in both views, overriding the SVG-oriented edge-to-edge wrapper rule that collapsed it to its pot height in Side. Direct and per-list Random Plant selections use the same fix.

Side visual lifecycle correction: hidden scene wrappers must remain display:none even after Fisherman, whose theme-specific display:flex rule previously revived hidden wrappers and exposed a collapsed fallback pot after Clear All or Visual progress Off. Inactive entry wrappers clear their old theme attribute. Fisherman/Zen now obey the same Visual progress On/Off gate as other animations. Theme changes still save through Personal Settings Save and preserve task state.

Personal animation Save correction: capture the pending dropdown selection before waiting for queued writes, and ignore unchanged visual-theme synchronization notices so they cannot erase the local pending selection. Ordinary unchecking retains the current per-list Random theme; completion followed by a new list consumes the next shuffled theme. Verified explicit theme switching after Reset and full-bag coverage across successive completed lists.

Personal Settings now hides the working task list, One Active Task summary, empty-list prompt and list actions while open, in both Private and Public. Save restores the home presentation without copying or modifying tasks. Client retains its existing equivalent Settings/list separation.

## Optional Client visual progress — October 18, 2026

Client Settings now offers List layout (with conditional sequence Parts), Visual progress Off/On, and the exact animation choices from Personal Private, including per-list shuffled Random. Existing Client lists default Off. Client visual preferences and shuffle state use separate local `cuedone.clientVisualProgress.v1` storage; Personal animation settings remain independent. Routines remain task-only and their controls appear at the bottom of Client Settings.

The active Client animation appears above the full list or sequence cards, reusing the existing scene node, renderers, stage mapping, continuous fill/movement, physics, and reduced-motion rules. Exact completed/total progress drives it; no graphic or finale appears for an empty list. Random keeps one theme through checks, ordinary unchecks and reopening, then advances its shuffled bag when a completed list is replaced and a new list starts. Client shuffle transitions are saved atomically with the shared Private/Client task list, while Public writes do not touch them.

With visual progress On, progression owns the visual feedback and finale: the existing Client celebration overlay/trail is suppressed, and Simple/Celebrate and Final celebration controls hide while retaining their saved values. Task/Final sound choices and Sound Off/On remain independent, including when the retained completion style is Simple. With visual progress Off, the original saved Simple/Celebrate behavior returns. Theme/settings changes and routine loading do not invoke Client completion effects. Top and Side share these controls and synchronize the saved state. No remote Client viewing, networking, or backend is added. This checkpoint is approved for local commit.

Random visual progression Reset update: explicitly confirming Reset List draws the next shuffled theme for Personal and enabled Client Random progression, saved atomically with the unchecked tasks. Task identities, text, order and preferences remain intact. Ordinary unchecking and reopening retain the theme; fixed themes remain fixed. Public resets do not change Private/Client shuffle state. Failed saves retain tasks and shuffle state.
