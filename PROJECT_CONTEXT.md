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

Client View can save a completion style: **Simple** (check, strike-through, dim only) or **Celebrate** (brief randomized visual feedback on completion, with a larger cue when the last unfinished task is done). **Sound: Off | On** is a separate Client View control. It defaults to Off, is persisted locally, and governs every CueDone audio path, including Preview. Turning Sound Off stops active audio and cancels queued playback. Celebrate can be selected while Sound is Off, so completion visuals still run silently. Simple completion never triggers celebration visuals or task-completion audio. Personal View never plays Client celebrations or sounds.

Client View also saves a **Final sound** preference: Current tone (default), Yay!, Applause, Trumpet fanfare, or Hurrah!. Preview plays the selected choice only while Sound is On. The selected choice replaces the existing three-note final tone once at the same final-completion cue. These final sounds and their timing are frozen.

To keep Client View focused, **Add task**, progress, and the master **Sound: Off | On** control remain visible. A clearly labeled, keyboard-accessible **Settings** button in the progress area opens an inline panel that is collapsed by default. The panel contains Simple/Celebrate, Task sound and Preview, Final sound and Preview, and Final celebration. Its open/closed state is presentation-only: toggling it does not save or reset preferences, modify tasks, play sound, or replay animation. Reward controls remain outside this panel in their existing location.

The saved **Task sound** preference controls non-final Client + Celebrate completions: None, Bubble Pop (default), Soft Click, Wood Tap, or Random. Random chooses one of the three audible task cues for each completion. Each cue is a single original bundled one-shot under 0.2 seconds; starting another cue stops the previous playback so rapid checks do not overlap. Task sound Preview respects master Sound Off. None silences non-final completions only and never suppresses the selected final sound. A final completion plays only the Final sound, without a Task sound underneath it.

Reopening CueDone, switching Top/Side, storage synchronization, loading an already completed list, unchecking, and Reset List do not create a forward completion event and therefore do not play Task or Final sounds. Bundled sources, licenses, original-asset provenance, durations, and hashes are recorded in `assets/audio/README.md`; no runtime audio service is used.

Client View also has a **Reward** selector: None, Your Choice, Game Time, Music, Drawing, Reading, Surprise, and Custom. Custom reveals a text field. The chosen reward is stored locally and shown as a clean card during Client View. If a reward is set, the final Celebrate cue prominently reveals it (for example, “REWARD: GAME TIME!”). Personal View does not show this control.

## Implemented feature boundary

**Foundation:** Create → check off → reorder → delete tasks, persisted locally, shared by popup and side panel. When every task is complete, **Reset List** can uncheck the whole list after a brief confirmation. In Client + Celebrate, Reset List appears after the final celebration finishes and the reward is shown. It does not delete tasks, change order, or clear the selected reward or other preferences. Per-task Delete stays separate. Do not show Reset List before the list is fully complete.

**Start a New List (implemented):** Personal and Client use the same shared action. It opens an inline review of current unfinished tasks in their existing order, selected by default. Users may deselect tasks, then **Create New List** replaces the current list with only the selected unfinished tasks, all unchecked and in order. Completed and deselected tasks are removed; if everything was complete or nothing is selected, the new list is empty. Cancel changes nothing. CueDone rechecks current local task storage before saving so a review cannot overwrite newer task changes from another view, and a failed save leaves the current list visible and unchanged. After a successful save, task entry opens and prior completion audio/animation/reward-reveal state is cleared without replay. Presentation mode, Top/Side preference, sound choices, final celebration, and reward remain unchanged. The new list stays as created until the user edits it. This does not add automatic daily rollover, history, archives, sublists, or templates, and **Reset List** remains a separate action.

**Phase 2 (approved):** CueDone identity and equal Top/Side working views, last-used view restore, and setup/work-mode task entry.

**Phase 3A (approved and frozen):** Client View presentation mode on the same local task list: Personal/Client switch, larger Client task focus, progress, an optional end motivator, and a saved Simple/Celebrate completion-style control.

**Phase 3B (approved):** Client + Celebrate plays brief non-blocking completion feedback. Completing a non-final task shows one randomized micro-celebration and, when Sound is On, plays at most one selected Task sound: None, Bubble Pop (default), Soft Click, Wood Tap, or Random. Each audible Task sound is an original bundled cue under 0.2 seconds, and rapid completions replace rather than overlap playback. Completing the last unfinished task does not play a Task sound; it plays only the frozen selected Final sound once at the existing cue, a 1–2s Client View trail (Balloons, Stars, Cars, or Butterflies, or Random), then the larger “You did it!” burst and reward reveal. Persisted **Final celebration**, **Final sound**, and **Task sound** preferences choose the trail and audio. Final sound choices remain Current tone, Yay!, Applause, Trumpet fanfare, and Hurrah!. Both sound selectors have Preview. Sound is an independent, persisted Off/On preference, is silent by default, governs all audio, and stops active or queued playback when switched Off. Audio failure never blocks task completion or visual/reward behavior. Simple mode and Personal View do not celebrate or play task-completion audio. Do not add more trail types or sound choices or begin a later phase unless the user explicitly approves it.

**Client layout checkpoint (complete):** At compact Top and narrow Side widths, Client task cards give task text a full row and place reorder/delete controls on a compact second row. Wider Side panels retain the existing arrangement. This layout change is Client-only; Personal styling remains frozen.

**Meta windowed companion experiment (browser-reviewed October 4, 2026):** The separate local package at `prototypes/meta-windowed` provides compact, expanded, and planning views for Personal productivity. It reuses the shared pure task operations while keeping versioned browser storage isolated at `cuedone.vr.windowed.tasks.v1`; it does not read or write the immersive prototype key or extension storage. Jennie successfully reviewed task entry, clear Add confirmation, waiting count, Complete and progress advancement, planning layout, persistence after reload, and New List with carry unfinished, start empty, and Cancel in local browser testing at narrow and wider widths. Automated checks cover save-before-apply behavior and storage-failure preservation. This review does not verify Quest hand interaction, the Quest system keyboard, Horizon OS placement/resizing/recentering, or cross-app coexistence. The experiment is not packaged, sideloaded, uploaded, or deployed.

Tasks persist locally after the extension or browser is reopened. There is no account, no cloud, and no backend.

## Development roadmap (planned, not implemented)

The CueDone Development Blueprint records the following delivery order. It is planning context only: each roadmap step requires separate, explicit authorization before implementation. Documentation of a step does not approve its code, dependencies, architecture, or external services.

1. **Checkpoint and roadmap (complete):** Commit the user-verified Client layout fix and distinguish the implemented product from planned work in the repository documentation.
2. **Audio (complete):** Added persisted Final sound and Task sound selectors with Preview. Final sound remains Current tone, Yay!, Applause, Trumpet fanfare, or Hurrah! at the existing final cue. Task sound is None, Bubble Pop (default), Soft Click, Wood Tap, or Random for non-final Client + Celebrate completions. The one persisted **Sound: Off | On** control governs both selectors, both Preview controls, and all completion audio; Off stops current playback and cancels queued audio. Final recordings are bundled CC0 assets, Task sounds are original deterministic CueDone assets, and there is no runtime audio dependency. Future audio paths such as a break clock or closing audio are not implemented, but must use the same Sound authority if separately approved.
3. **List lifecycle (in progress):** Start a New List carryover and fresh completion-state clearing are implemented, with Reset List preserved as a separate action. Finished for Today / Session encouragement and any other lifecycle additions remain planned and require separate approval.
4. **Task layouts:** Add an optional one-active-task presentation, First / Then, and First / Then / Next / Last after defining how longer lists remain accessible without silently hiding required steps.
5. **Visual progress:** Build one progress engine that scales by completed tasks divided by total tasks. Candidate themes are plant, animal puzzle, gumball jar, dynamite, animal transformation, builder, battery, constellation, and Random. Initial delivery is planned to start with plant, animal puzzle, and gumball jar.
6. **Personal expansion:** Evolve Personal into Public and Private experiences after resolving their data boundary. Public is a clean, shareable presentation for meeting agendas, conference calls, and short project workflows. Private is the personal experience for optional progress themes, affirmations, timed random breaks, animations, and audio.
7. **Connected Client View:** Consider a laptop/desktop-only professional workflow for teachers, therapists, and similar hosts working with a student or client on another laptop or desktop. Define host/client permissions, session behavior, connection, and retention before implementation. This is not the Meta VR or smart-glasses experience.
8. **Platform expansion and handoff:** A Personal-only IWSDK/WebXR technical prototype is implemented as a separate nested package. Its bounded scope covers local task entry, one active task, explicit completion, local restoration, visible Add/waiting feedback, a manual New List choice that carries all unfinished tasks or starts empty only after a successful local save, and a seated no-locomotion panel. A second local-only `prototypes/meta-windowed` experiment implements compact, expanded, and planning views in an ordinary browser window with separate versioned storage; Jennie's October 4 browser review succeeded. Quest hands-only interaction, the system keyboard, Horizon OS window behavior, and cross-app coexistence remain unverified. Separately, distribute the full desktop CueDone experience, including Personal and Client features, for Microsoft Edge on Windows from the same Chromium extension codebase used by Chrome. Future bidirectional session handoff among Chrome, Edge, and Meta devices remains planned only. One device should own the active session at a time instead of continuously co-editing it. A later Meta smart-glasses experience may reuse the same handoff contract if the hardware and platform support the required interaction and video capabilities.

Picture-plus-text tasks and theme previews are candidate enhancements, not requirements for the first release. There is no planned automatic daily rollover, saved-list archive, or sublist system.

## Unresolved roadmap decisions

These decisions are deliberately open and must be resolved before their affected roadmap phase is authorized:

- **Personal Public/Private boundary:** Public and Private are planned experiences within Personal mode, not replacements for Client View. Public should present a clean agenda or short workflow suitable for screen sharing during a conference call or meeting. Private may include the optional playful and motivational enhancements. The current extension has one task list shared by Personal and Client presentation modes, and visual presentation alone is not privacy. Decide whether Public and Private use separate lists or explicit per-task visibility, then define migration, switching, and sharing behavior. Private content must never appear in Public through a default, transition, restore, or handoff mistake.
- **Connected host/student behavior:** This feature is limited to laptop/desktop use for teachers, therapists, and similar professional hosts and their student/client display. Decide whether a student or client can complete tasks or only the host can; define the interface, connection method, session expiry and access, disconnect/reconnect behavior, concurrent edits, animation ownership, and data retention. A session code is only one possibility. The roadmap does not authorize accounts, cloud sync, or an external backend.
- **Meta VR delivery beyond the prototypes:** Meta VR is limited to Personal productivity; Client View and Connected Client View remain desktop-only. IWSDK/WebXR remains the selected contest-prototype approach. The separately implemented windowed companion has passed Jennie's local browser review but is not evidence of Quest interaction or Horizon OS coexistence. Production hosting, accessibility details, hand and system-keyboard behavior, placement/resizing/recentering, background/suspension behavior, persistence durability, packaging, and cross-app visibility remain unresolved. Both prototypes intentionally use distinct versioned origin-local storage namespaces. Neither adds selective per-task carryover, archives, accounts, cloud sync, rewards, audio, or cross-device handoff. Do not assume the Chromium extension UI or APIs can be reused unchanged.
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
- Shared local task data via the platform storage adapter (extension `local` storage)
- Chrome/Edge-specific APIs live only in `src/platform/browser.js`
- Shared task model and UI must not call `chrome.*` or other browser APIs directly
- One app for Chromium browsers; do not fork popup, side panel, or task logic per browser
- Chrome and Edge desktop versions include Personal and Client features; Edge on Windows must continue to use the shared Chromium adapter and product code, and package/store differences must not create a second task model or UI implementation
- The Personal IWSDK/WebXR prototype imports the shared pure task schema and operations while isolating IWSDK, WebXR, and versioned origin-local persistence inside `prototypes/meta-iwsdk`; Client and Connected Client features do not carry into Meta VR
- The local windowed companion imports the shared pure task operations while keeping its UI and `cuedone.vr.windowed.tasks.v1` storage adapter inside `prototypes/meta-windowed`; it does not share storage automatically with the immersive prototype or extension
- No unnecessary dependencies
- No build toolchain required to load the unpacked extension

## Bounded Personal VR spatial extension — October 19, 2026

The user explicitly authorized extending the existing `vr-personal-prototype`
IWSDK/WebXR package with Constellation, Zen Garden ambient nodes, readable panel
scaling, stationary/seated comfort behavior, and persistent-anchor/local-storage
recovery. This approval applies only to `prototypes/meta-iwsdk`, with independent
origin-local storage; Chrome/Edge presentation and task storage are unchanged.

The prototype now provides two procedural spatial themes driven by saved task
progress, three panel sizes, head-relative/controller-relative/room-anchor
placement, Recenter, and ambient-motion control that honors reduced motion.
Locomotion remains disabled. It prefers bounded-floor tracking and falls back to
local-floor/local; the Quest system boundary remains authoritative. A brief fade
covers session entry/resume and recentering. The existing pure task operations
and save-before-display behavior remain shared and unchanged.

Tasks retain `cuedone.vr.personal.tasks.v1`. Versioned appearance preferences use
`cuedone.vr.personal.spatial.v1`; an opaque same-device anchor handle uses
`cuedone.vr.personal.anchor.v1`. Anchors restore spatial placement only. Unsupported
or rejected anchors fall back to seated/session placement without changing task
data. Corrupt preferences offer Retry instead of overwriting saved settings;
failed saves preserve the displayed saved appearance. Session end invalidates
pending anchor work, and restoration failures create anchors only on a fresh XR
frame. Loading and resuming do not replay progress tweens. Empty lists show no
progress scene or finale.

Validation passes 28 prototype tests, TypeScript checking, a production build,
and an isolated headless Chrome/IWER interaction check with synthetic data.
Emulator checks cover entry/completion, appearance persistence/failure, immersive
panel placement, theme selection, placement modes, recenter, exit/reload,
corrupt-preference retry and narrow browser layout. Actual Quest comfort,
hands/controller targeting, keyboard, 72/90Hz performance, boundary/suspension
behavior, and persistent-anchor restoration across headset sessions remain
hardware verification items. No accounts, backend, sync, handoff, Client View,
audio, or deployment is added. See `prototypes/meta-iwsdk/README.md` for controls
and storage details.


## Living Trellis Garden and local companion integration — October 19, 2026

The user explicitly authorized two-way local companion/VR synchronization and the
Living Trellis Garden MVP. Inside the existing Personal-only IWSDK package, Zen
Garden now frames the board with an organic rectangular wooden lattice. Two
flowering vines grow with saved completed/total task progress and meet at the
top center. A new final completion of the same nonempty list triggers twelve
outward-flying butterflies and optional local synthesized spatial bird chirps
once the tips join. Failed saves, loading, reopening, suspension recovery,
settings/theme changes, list replacement, task removal and empty lists never
create a finale. Reduced motion or Ambient motion Off suppresses flight and
restores the flowering completed state directly.

Garden sound has its own persisted VR-only Off/On gate, default Off, in the
existing spatial preference envelope. On permits a soft arrival chime when Zen
is deliberately selected and bird chirps at a new final completion. Sound never
blocks task saving. It requires local browser activation in the rendering
window; storage events cannot grant it. Off, leaving Zen, hiding/suspending VR,
and XR exit stop active/scheduled sources. No recordings, network audio service,
extension sound preference, or general task-completion audio is added.

Same-origin windows in one browser profile now synchronize the VR task and
appearance keys with storage events, reread current storage without echo writes,
and reconcile on visibility/pageshow without replay. Preference patches merge
with current saved state; task writes reject stale expected lists and restore
the latest list for review. Cooperating writers use Web Locks where available;
without locks the optimistic check is not a guarantee against truly simultaneous
writes. Incoming task changes cancel stale New List reviews. Constellation binds
actual task identities and active/completed status to batched nodes and links.
All data stays separate from extension and windowed-experiment storage.

The companion designation covers the existing responsive 2D surface and does
not authorize desktop/phone-to-Quest networking or handoff: localStorage does not
cross devices, profiles or origins. No accounts, pairing infrastructure, cloud
service, Client View, deployment, or extension behavior change is included.

Validation passes 45 unit tests, TypeScript checking, production build, and
isolated Chrome/IWER checks of two-way settings/tasks, completion in either
view, growth/finale lifecycle, failed-save silence and remote Sound Off.
Desktop callback measurements stayed near 60Hz even when IWER reported a 72Hz or
90Hz target. Stable 72/90fps, native hands/controllers, comfort, spatial audio,
suspension and durable anchors remain Quest hardware verification items. See
`prototypes/meta-iwsdk/README.md` for controls, boundaries and validation details.


### VR hands-only input checkpoint — October 19, 2026
The bounded Personal VR prototype now requires tracked hands and excludes handheld
controller input and visuals. Pinch rays and direct fingertip touch share the
existing UI interaction path. Trellis contact highlights without task mutation.
Head-relative distance is 0.65m; hand-relative replaces controller-relative
placement, including silent in-memory normalization of old preferences. Missing
tracking never falls back to controllers. The emulator defaults to hands.
Garden collision checks exclude hidden instances and unrevealed vine segments.
Emulator interaction verification uses isolated data; real Quest comfort,
tracking loss, keyboard behavior and performance remain hardware checks.

### Explicit Bezier/constellation activation checkpoint — October 19, 2026
The user authorized cubic Bezier vine geometry and vertex-shader growth uniforms,
completion-event particle transfer from trellis nodes to background dome stars,
and spatial alignment cues. Both themes continue to share task completion state.
Particle transfer is bounded to 32 simultaneous twelve-particle streams. New
forward saved completions may emit; loading, duplicate sync, replacement and
reset never replay. Theme changes, reduced motion and suspension cancel streams.
The existing default-Off VR sound preference gates theme-exclusive finale audio.
Individual-star and theme-selection sounds have been removed. Local gesture
activation is required in the rendering document. No backend or extension behavior
is added. Physical Quest audio/comfort/performance verification remains pending.


### Theme-exclusive finale sonification — October 19, 2026
The user refined audio scope: garden birds play only at the Living Trellis
completion animation; no individual star activation or theme-selection sounds
remain. Constellation plays procedural plasma/pulsar-like buffered audio only
after a successful nonempty final task completion AND completion of its particle
streams. Restore, duplicate sync, reset, replacement and cancellation never replay.
Reduced motion completes visuals immediately before one optional finale cue.
A Three.js PositionalAudio manager follows the star coordinates and tracked-head
AudioListener. Bounded voices, soft sample edges, conservative gain and a local
compressor provide headroom. These are original synthesized buffers, not actual
NASA/Voyager/pulsar recordings. The existing preference is labeled Garden sound
or Space sound by theme, defaults Off, and is separate from extension audio.
Theme changes, Sound Off, hiding/suspension and XR exit stop both audio paths.
63 tests, TypeScript and production build pass; offline browser audio mixing is
non-clipping. Audible Quest playback/comfort/performance remain unverified.

### Local competition distribution preparation — October 19, 2026
The requested web distribution now has a reproducible package:submission script,
asset/checksum manifest, ZIP integrity checks and a physical Quest verification
report. A build post-step makes IWSDK's otherwise unbundled default font worker
self-contained by reusing the SDK's bundled worker and inline WASM; dependencies
and product behavior are unchanged. Production browser startup is verified at
root and subdirectory paths with external HTTP(S) blocked. Physical Quest
72/90Hz performance, perceived spatial audio and hands-only system keyboard
entry remain pending. No deployment, upload, portal submission or hardware
certification is implied.


### Permanent Zen Garden AR companion — October 22, 2026

The user explicitly authorized changing only `prototypes/meta-iwsdk` to request
immersive-ar passthrough with DOM overlay, remove Constellation entirely, move
the seated panel to z = -1.8 m, increase its base scale by 10% (0.72 to 0.792),
and center the 2D companion at a responsive 448 px maximum width. This supersedes
earlier VR-only entry, Constellation choice, and distance/scale descriptions.
Zen Garden is permanent; legacy saved Constellation choices normalize to Zen
without changing task storage or other appearance preferences. No automatic
rewrite occurs on load. Constellation geometry, particle-transfer and audio
modules and their controls are removed from this prototype. Extension themes
and Chrome/Edge behavior are unchanged.

AR entry preserves required hand tracking, optional anchors, and reference-space
fallbacks. A transparent DOM overlay with Exit AR is requested as an optional
feature so headset support limitations do not prevent passthrough or spatial hand
controls. Unsupported AR is reported; it never silently falls back to immersive
VR. The renderer is alpha-enabled and the authored sky dome is removed. The
prototype-local launcher guards duplicate requests, handles failed setup, and
restores the browser camera on exit. No backend, accounts, networking, handoff,
commit, push or deployment is authorized by this implementation request.

Automated validation covers 63 tests, TypeScript and production build; native
Quest passthrough, DOM-overlay support, hands/keyboard, audio, comfort and frame
pacing remain physical-headset verification items.


### Movable AR companion and tight browser card — October 22, 2026

The user authorized tighter browser-card spacing, a ray/pinch draggable spatial
header, and stable environment placement in `prototypes/meta-iwsdk`. Page padding
is 2 px; card and inner-section padding is 8 px, with the centered 448 px maximum
retained. The immersive header captures one tracked-hand ray and applies a
bounded, damped translation to the board and garden together. Release retains
the displayed pose and saves Room placement before creating an anchor on a fresh
XR frame. Dragging does not change task data, camera position, or panel size.
Cancellation, tracking loss, suspension, Recenter and exit cancel an active drag
and restore its starting position.

Room anchor is the default for new preferences; existing saved choices remain
valid. Stale anchor work is cancelled before moving. A restored persistent handle
is reused without minting or rewriting it on every entry. Storage/anchor failures
retain session-local placement with visible status; cross-session restoration
remains conditional on same-device/browser persistent-anchor support. This does
not add an OS-level cross-app overlay, networking, cloud sync or handoff.

Validation: 69 prototype tests, TypeScript, production build, and wide/320 px
browser spacing checks. Native Quest hand capture, smoothing, suspend/resume and
durable room restoration remain headset checks. Extension behavior is unchanged;
no commit, push or deployment is part of this implementation request.


### Browser wrapper styling refinement — October 22, 2026
The user supplied an explicit 320 px centered browser-card wrapper with 12 px
padding, 90% white background, backdrop blur, rounded corners and shadow. This
supersedes the previous 448 px maximum and 8 px card padding for the prototype's
2D card only. The implementation shrinks to narrower available widths; spatial
panel sizing, task behavior and extension styling remain unchanged.


### Prototype task-entry flow — October 22, 2026
The user authorized correcting task entry in `prototypes/meta-iwsdk`. Add Task
only opens/focuses the field, including on repeated clicks. Enter/Return saves
and clears after success while keeping entry active. A separate Done button next
to the input saves any remaining nonempty draft and closes entry; empty Done adds
nothing. Failed saves preserve the draft and open field, and a newer draft typed
during an older save is retained. The completed-list Done remains separate.
Browser form defaults and physical/soft-keyboard Enter actions are prevented and
handled explicitly on both actual keyboard elements, with repeat and IME guards.
The input remains enabled during its own add save to avoid dismissing the keyboard.
73 tests, TypeScript, production build and isolated browser interaction checks
pass; native Quest keyboard verification remains pending. Extension behavior is
unchanged. No commit, push or deployment is included in this implementation.


### Quest bare-hand targets and collapsible header — October 24, 2026
The requested prototype refinement retains the existing Add Task focus-only,
Enter/Return save-and-clear, and adjacent Done flow. Browser interactive targets
are at least 56px high; spatial buttons and task rows are at least 10 UIKit units
high with separated header targets. Zen Garden remains the only approved theme;
its existing appearance/motion/sound controls use the same enlarged targets.
A dedicated chevron collapses the body, settings and move handle, leaving the
CueDone™ — See it. Do it. CueDone. header and expand control. Collapse releases
the keyboard while preserving the draft and task state; expansion is presentation
only and never submits text. This temporary state is shared between browser and
immersive presentations within the open page.
For adjacent desktop windows, leave CueDone in the normal Quest browser spatial
window and use Horizon OS placement/pinning. Enter AR remains an explicit optional
immersive-ar action; the page cannot pin OS windows or guarantee their visibility
inside an immersive session. Existing required hand tracking and controller
exclusion remain unchanged. Physical Quest pinch, native keyboard, window
coexistence and comfort require headset verification. No extension UI, icons,
backend, task storage namespace, deployment or sync behavior is changed.


### Fixed centered spatial layout — October 24, 2026
The requested expanded immersive panel is exactly 0.8 m wide by 1.0 m high:
80 x 100 UIKit centimeters, intrinsic document sizing and world scale 1.
World position is (0, 0, -1.5), with identity world orientation. A local
viewer-origin XR reference space replaces floor-origin placement so y=0 is near
initial eye height. This is a fixed world pose, not continuous viewer following.
The same ECS-parent-compensated transform drives the UIKit visuals, inputs,
Done and hand-ray/poke hit tests. Saved scale, wrist placement and room anchors
no longer alter spatial geometry; their stored preferences remain intact.
Manual dragging and anchor restoration are inactive; Restore fixed panel reapplies
the exact pose. Browser text scaling and garden motion/sound remain independent.
Collapse still shows only the header with natural height; expansion restores the
exact 0.8 x 1.0 m card. Overflow scrolls without growing the card or losing tasks.
No panel idle animation or viewer-facing rotation is applied. Session entry,
resume, keyboard activity and head/hand movement never reposition the panel.
Alpha passthrough and hands-only input remain in the existing IWSDK renderer.
This does not control placement or visibility of Horizon OS browser windows.
Physical Quest keyboard, targeting, tracking stability and coexistence remain
hardware verification items. No extension UI, task data, commit or deployment
is included in this layout change.


### Quest live feedback follow-up — October 24, 2026
The user clarified that CueDone MUST remain a real immersive AR floating board
beside existing multitasked workspace windows. A browser-only replacement does
not satisfy the product requirement. WebXR still requests immersive-ar with
transparent composition; no claim is made that alpha controls OS window visibility.
Meta documents Seamless Multitasking for system windows during immersive apps:
https://www.meta.com/help/quest/172903867975450/
Actual coexistence with the user's specific browser/workstation app and Horizon OS
version is a required hardware check and remains unresolved.

The expanded 0.8 x 1.0 m card starts face-centered 1.5 m away. Its restored top
pinch bar permits manual placement alongside the workspace; release holds that
pose for the session, and Recenter to face restores tracking of the viewing pose.
There is no idle drift. Tracking loss, system-focus changes and suspension cancel
an active drag. Task visuals and ray targets share the same transformed panel.
Visible-blurred keeps the board/garden visible while stopping audio and gestures.

The body is the single immersive scroll region, with large explicit Scroll up /
Scroll down controls. Task input and its Done button are pinned siblings outside
the scroll region, so five or more tasks cannot push Done out of reach. The
browser companion uses the same pinned-entry arrangement. Collapse hides entry
without discarding a draft. Task rows center text vertically beside enlarged
checkbox visuals (8 UIKit units spatially / 40px in browser); the whole row
remains the completion hit target. Bee/pollen duration is now 2.4s instead of
1.1s, and their track belongs to the task label area rather than the full row.
Wrapped browser labels also have text-level strike-through. All task persistence,
Enter/Done save behavior, controller exclusion and reduced-motion rules remain.
These are local changes; no new native app, backend, commit or deployment is implied.

The current acceptance target is Quest Browser workspace windows. The user also
wants coexistence with Windows desktop applications and Steam/macOS desktop
workspaces if feasible. Those are compatibility targets, not authorization for
new desktop streaming, a native app, handoff, remote networking or a backend.
Browser app windows and desktop-streaming hosts must be verified separately;
coexistence is not yet established by the local interaction fixes.
Validation: 77 unit tests, TypeScript and production build pass. Isolated browser
checks confirm five tasks with entry focused, 40px checkbox visuals, and Done
outside the scroll region. Quest-only drag/scroll, keyboard and OS multitasking
verification is still pending; no live coexistence success is claimed.


### Quest Enter/Return repair — October 24, 2026
Task entry must add immediately on an explicit Enter/Return action, clear only
after saving, and remain open/focused for another task. Add Task only focuses;
ordinary typing never saves. The native event adapter now accepts Enter/Return,
NumpadEnter and legacy keycode 13, including keyup-only keyboard actions. New
non-repeat keydowns are never locked behind a missing soft-keyboard keyup.
Composition stays guarded, and duplicate follow-up events remain suppressed.
The immersive UIKit native input is explicitly associated with its own native
form and submit control, matching the browser input's form-submit fallback.
Native keyboard listeners run in capture phase. Done keeps its existing explicit
finish flow, while storage failure retains the draft. This repair is local until
committed and deployed; physical Quest keyboard validation remains required.


### Dual-mode Garden Trellis completion — October 25, 2026
The user explicitly requested a default standard windowed DOM task panel with
short immersive-ar celebrations, superseding the previous requirement to work
continuously in an immersive board alongside workspace apps. There is no automatic
XR entry on load. A local unchecked-to-checked task gesture synchronously requests
immersive-ar before awaiting storage (WebXR user-activation requirement), while
completion still saves through the existing task session. Only a successfully
saved forward completion may animate. Entry rejection/unavailability never undoes
a saved task and leaves the standard UI usable with a visible explanation.

The Garden Trellis animation starts on the first visible, tracked XR frame after
both saving and session adoption. It animates from the prior exact task ratio to
the new ratio, using the existing climbing vines, blooming flowers and final-task
butterflies. The task label gets a winding green vine strike-through; the existing
bee shares that task's spatial reveal. Exactly 4500ms after this animation start,
a timeout ends that specific XR session and returns to the standard DOM panel.
Manual exit cancels its timer; late session adoption after cancellation closes
itself. Duplicate completion/entry is guarded; stale task snapshots do not replay.
The timer is identical for ordinary and final tasks; no additional finale delay
is added. Existing motion/reduced-motion and separate Garden sound gating remain.

Settings includes the saved checkbox “Immersive 3D Celebration on Task Completion”,
default checked for both new and legacy spatial preferences. Off completes tasks
in the standard view without requesting XR. The boolean lives in the existing
origin-local spatial preference envelope and synchronizes between same-origin
windows. A failed preference save retains the previous saved choice. No task
storage namespace, extension behavior, accounts, backend or handoff is added.

The user's clarified overflow requirement means up to five minimum-height rows
before vertical scrolling, not a five-second scrolling animation. Browser rows
remain at least 78px high with vertically centered labels and 40px checkbox marks;
the whole row remains a generous completion target. The list caps at 430px for
five rows plus gaps/padding. Spatial rows include 8-unit checkbox marks and cap
at five rows (64 UIKit units). Entry and explicit Done remain outside scrolling;
spatial scroll buttons target the overflowing list or settings body as appropriate.
Enter/Return still saves, clears after success and retains entry focus. Manual
Enter AR and Exit AR controls and the temporary input diagnostic are retained.

This uses a temporary immersive WebXR SESSION, not an OS-owned shared-space layer.
Quest may request AR permission or transition confirmation. The app ends its
session; exact OS window restoration, instant input availability and native
keyboard/transition timing still require physical Quest 3 / Horizon OS 2.7 checks.
No native app migration, desktop streaming work, commit or deployment is included
in this implementation request.
