# CueDone Personal VR prototype


## Keyboard task-entry fix — October 22, 2026

Add Task only opens and focuses entry, including on repeated clicks; it never
submits or toggles the field closed. Enter/Return saves a task and clears the
field after a successful save, keeping entry open and focused. Browser and
spatial inputs share a keyboard binder attached to the actual HTML keyboard
element. It handles keydown, soft-keyboard line-break beforeinput, and the browser
form's submit fallback, prevents default navigation/submission, ignores held-key
repeats and IME composition, and removes listeners at teardown. Both keyboard
elements use the Enter hint rather than asking the keyboard to dismiss with Done.

The Done button beside the input saves a remaining nonempty draft, then closes
entry and dismisses its keyboard. An empty/whitespace draft closes without adding
a task. Failed saves keep the field open and retain the draft. New text typed
while an add is saving is never cleared or hidden by that older save. The input
stays enabled during its own task save; duplicate saves remain guarded by the
session state. The separate completed-list Done button retains its prior behavior.

Validation: 73 tests, TypeScript, production build, and isolated browser checks
for opening/refocusing, consecutive Enter saves, retained focus, clearing, Done
with a final draft, and empty Enter/Done. Native Quest system-keyboard behavior
still requires headset verification. No commit, push or deployment is included.

## Browser card wrapper refinement — October 22, 2026

The user-supplied wrapper styling now supersedes the earlier 448 px card width
and 8 px card padding: the browser card is centered at 320 px maximum width,
shrinks to the available width, and uses 12 px padding, a 90% white background,
8 px backdrop blur, 16 px corners and a large soft shadow. The 2 px page gutter
and existing inner-section spacing remain. Spatial panel size and dragging are
unchanged.

## Tight card and movable companion — October 22, 2026

The browser card now has 2 px page padding and 8 px card/inner-section padding,
with its centered 448 px maximum retained. At a 320 px viewport the card measures
316 px wide with no horizontal page overflow.

In immersive AR, aim a tracked-hand ray at **Hold pinch here to move**, pinch and
hold, move the hand ray, then release to place the panel. The header captures
that ray; a second hand cannot take over. The panel preserves the grab offset
and orientation, damps ray jitter, and holds its last displayed position on
release. The task list, garden margins and finale move together. The gesture
never completes tasks or moves the camera. Pointer cancellation, loss of hand
tracking, suspension, Recenter and session exit cancel an active move and restore
its starting position. No handheld-controller fallback is introduced.

New preferences default to Room anchor; existing saved placement choices remain
respected. A successful drop saves Room placement and creates its new anchor on
a fresh XR frame, skipping restoration of the previous handle. Older pending
anchor work is invalidated at grab time. Restored durable handles are reused
without requesting another handle or rewriting local storage. Failed preference
saves retain the dropped position for the current session and report that it
could not be saved. Unsupported anchors similarly retain session-local placement.
Restoration across sessions requires persistent-anchor support in the same
browser profile and origin on the same device. This is an active WebXR companion,
not an OS overlay over other apps.

Validation: 69 tests (including movement math, single-pointer ownership,
cancellation, bounded frame steps, stale anchors and handle reuse), TypeScript,
production build and wide/320 px browser layout checks. Native Quest ray-pinch
capture, perceived smoothing and durable physical-room restoration still require
headset verification. No commit, push or deployment is included.

## Current AR companion — October 22, 2026

The current prototype requests **immersive-ar** for Quest passthrough, with an
optional `dom-overlay` feature and a transparent overlay root containing Exit AR.
The overlay is enabled when supported; unsupported overlays do not force a VR
fallback or prevent hands-only spatial controls. IWSDK creates an alpha renderer
for AR; the authored sky dome has been removed so only local garden objects and
the task board cover the passthrough view. Automatic SDK session offers are off;
Enter AR uses `src/ar-session.ts` to add the DOM overlay while retaining the SDK
feature builder and reference-space fallbacks. Permission/setup failure remains
on the browser card with a retryable message. Duplicate entry is guarded, and XR
exit restores the browser camera and hides the overlay.

Zen Garden is the permanent environment. The Constellation scene, particle
transfer, space audio and theme selector have been removed. Saved legacy theme
choices resolve to Zen in memory without losing tasks, size, placement, motion,
or sound preferences; the next explicit preference save records Zen.

Standard seated placement is 0.7 m right, 0.15 m below eye level, and **1.8 m
forward**, stationary until session entry or Recenter. Panel scale is **0.792**,
10% above the previous 0.72 baseline, including existing readability multipliers.
The browser card is centered at a maximum width of **448 px**, responsive to its
available width. The full task list, bee/pollen completion feedback, settings
gear, Reset, Clear All confirmation, Add Task, Done, local synchronization and
Garden sound gate remain intact.

Validation: 63 tests pass, including real SDK session-init construction with
mocked native AR adoption, denial/duplicate/failure/exit recovery, legacy theme
normalization, and fixed-budget garden rendering. TypeScript and the production
build also pass. Quest passthrough composition, DOM-overlay availability, native
keyboard, readability/comfort at 1.8 m and hardware frame pacing require headset
verification. No commit, push or deployment is part of this change.

The older checkpoint sections below are historical; this section supersedes their
one-active-task layout, VR entry, theme choices, distances and scale descriptions.

This nested package is the first local-only CueDone prototype built with Meta's
Immersive Web SDK (IWSDK). It deliberately contains only the Personal
productivity loop: enter a short task, add it, see one active task, and complete
tasks in order. A local **New List** review can carry every unfinished task
forward in order or start empty; completed tasks never carry forward, and the
old list remains visible if saving fails. Client View, Work Group, accounts,
cloud sync, handoff, rewards, and Client celebrations are not included. Optional
local Garden sound is described below.

The prototype imports CueDone's pure task schema and operations from
`../../src/shared/tasks.js`. Its persistence adapter is separate from the
extension and stores a versioned envelope under
`cuedone.vr.personal.tasks.v1` in the origin's local storage.

The panel displays one NOW task, a persistent waiting-task count, and explicit
saved feedback after Add. New List changes use only the same prototype-local
store and are applied to the display only after that store accepts the update.

## Local development

Requires Node.js 20.19+, 22.12+, or 24+.

```sh
cd prototypes/meta-iwsdk
npm install
npm run dev
```

The IWSDK CLI opens its managed browser at `https://localhost:8081` and provides
the IWER browser-based XR emulator. Use the Runtime view, choose **Enter VR**,
then use IWER's hand emulation to aim and select controls. Desktop keyboard input
is the simulator path for the spatial task input.

Useful checks:

```sh
npm test
npm run typecheck
npm run build
```

## Quest 3 development URL

With the development server running, `npm run dev:status` lists HTTPS runtime
URLs. A Quest 3 on the same network can open the listed network URL in Meta Quest
Browser. The first visit may require accepting the local development certificate.
If the network path is unavailable, use the official IWSDK ADB-reverse workflow
from Meta's Testing Your Experience guide.

Quest hardware must verify that selecting the spatial `Input` with tracked hands
opens a usable system keyboard and that the full entry/Add/Complete flow works
without paired controllers. If that system-keyboard path is not reliable, the
next bounded change is a minimal in-scene keyboard; simulator keyboard input is
not evidence that the Quest system keyboard works hands-only.

## Bounded spatial themes and recovery — October 19, 2026

The Personal-only immersive prototype now includes Constellation and Zen Garden.
Constellation reuses the approved seven Big Dipper positions and edges as a
spatial node graph. Zen Garden uses procedural sand rings, a five-stone stack,
and 96 bounded ambient points. Exact saved completed/total progress drives a
0.6-second smoothstep tween over opacity, scale, and stone transforms. Empty
lists show no progress geometry or finale; the neutral trellis frame remains visible. Adding tasks or creating a new list snaps to the new
saved ratio. Loading, resuming, changing themes, and changing appearance restore
progress without replaying a completion tween. No camera locomotion is enabled.

The spatial panel and accessible browser controls offer:

- Theme: Constellation / Zen Garden.
- Panel size: Standard / Large / Extra large (1× / 1.25× / 1.5×).
- Panel placement: Head relative / Hand relative / Room anchor.
- Ambient motion: On / Off; the OS reduced-motion preference also disables it.
- Garden sound: Off / On (default Off), independent of motion.
- Recenter panel, plus Retry appearance when saved preferences cannot be read.

Head-relative placement keeps a 0.65m forward distance for seated touch, with a
small downward offset. Hand-relative placement follows a tracked wrist with a
0.25m forward and 0.12m upward offset, falling back to head placement when hands
are unavailable. Legacy controller-relative preferences normalize to hand-relative
in memory without rewriting saved data.
Room mode initializes from the current seated view, then restores or creates
an optional WebXR anchor. Recenter explicitly creates a new placement from the
current head pose rather than restoring the old room anchor. Session entry,
resume, and explicit recenter use a brief black fade; the camera itself never
animates. Bounded-floor reference space is preferred, with local-floor/local
fallback. Quest's system boundary remains authoritative; the app does not scan
or store room geometry. Stay seated or inside the configured Quest boundary.

Persistence is origin-local and split by purpose:

- Existing `cuedone.vr.personal.tasks.v1`: tasks; unchanged schema and save rules.
- `cuedone.vr.personal.spatial.v1`: versioned theme, size, placement, motion and Garden sound.
- `cuedone.vr.personal.anchor.v1`: opaque same-device persistent-anchor handle.

Preferences save before the displayed appearance changes. Corrupt preferences
stay intact with an explicit retry action. Anchors save spatial placement only;
they never store task state. Persistent anchors are optional and runtime
dependent: unsupported anchors, stale handles, missing room setup, or a rejected
anchor save retain the task list and use seated/session placement. If restoration
fails, creation waits for a fresh XR frame. Ending XR cancels stale asynchronous
work and deletes live session anchors; late callbacks cannot replace saved state.
There is no extension-storage access, migration, network sync, or handoff.

Initial spatial checkpoint validation: `npm test` (28 tests), `npm run typecheck`, and `npm run build`.
An isolated headless Chrome/IWER check covers browser task entry, appearance
restoration and failed saves, immersive panel placement, theme selection,
completion, placement modes, recenter, XR exit/reload, corrupt-preference retry,
and a 360px browser viewport. Synthetic test data never accesses saved user tasks.
Vite reports dependency annotation and large-chunk warnings from the existing
SDK bundle. Quest hardware is still required to verify hands/pinch and fingertip
selection, system keyboard, spatial readability/comfort at each size, actual
72/90Hz performance, boundary behavior, suspend/resume, and durable same-device
anchor restoration. Emulator results are not hardware certification.

## Living Trellis Garden and companion synchronization — October 19, 2026

**Zen Garden** now includes a rectangular organic wooden lattice surrounding the
actual floating task board. It follows the selected head/hand/room
placement and fits the board's live dimensions, including readability size and
expanded New List controls. Two procedural flowering vines rise from opposite
bottom corners, wind along the side rails, and intertwine at the exact top
center. Saved task progress sets their visible tube length and flower growth;
a short bounded tween smooths forward completion. Existing ambient particles,
sand rings and stones remain part of the Zen scene.

Only a successful new final completion of the same nonempty list arms a finale.
When the vine tips join, twelve batched butterflies fly outward for two seconds
and an optional spatial bird-chirp cue sounds from the join. Both companion and
VR task saves can trigger it. Reopening, resuming, restoring an already completed
list, changing themes/settings, task removal, New List, empty lists, and rejected
saves cannot create a finale. Ambient motion Off or OS reduced motion restores
the completed flowering trellis immediately and suppresses butterfly flight.
Sound is independent and never blocks visual feedback or persistence.

**Garden sound** defaults Off and is saved with the VR appearance preference.
On allows four gentle synthesized bird chirps only at a new Living Trellis
final completion, once its vine tips join. Theme selection stays silent. These are original local Web
Audio oscillators routed through a 3D HRTF panner, not downloaded recordings.
AudioContext activation requires a gesture in the rendering document: Enter VR
or Garden sound supplies one. A companion storage event cannot grant that
activation. If blocked, the VR status explains how to enable sound there rather
than queuing a sound for later. Off, leaving Zen, hiding/suspending VR and XR exit
stop all active and scheduled Garden sources. Loading and reopening stay silent.

Two-way synchronization uses native `storage` events in other windows and
immediate saved state in the initiating window. Every listener rereads current
storage, filters the VR keys/storage area, and never writes an echo. Visibility
and pageshow refreshes reconcile suspended views without replaying feedback.
Setting patches merge with the latest saved preferences under a Web Lock where
available. Task saves check their expected list under the same kind of lock;
stale edits are rejected visibly and the latest list is restored for review.
Without Web Locks, stale-list checks still apply but cannot guarantee atomic
simultaneous multi-window writes. An incoming task change cancels an open New
List review while retaining an unsaved task-entry draft.

The desktop/mobile browser surface serves as the companion form; open the same
URL in another window of the **same browser profile and origin** for live control.
Desktop, mobile and Quest devices each retain their own local storage. There is
no cross-device connection, pairing, account, backend, cloud sync or handoff.
The URL's scheme, hostname and port must match between local windows.

Constellation also binds one batched colored point to every actual task identity,
highlights the next unfinished task, and connects the task nodes into clusters
over the existing Big Dipper scaffold. Task changes replace and dispose only the
changed node/link buffers; per-frame rendering does not allocate scene assets.
The trellis uses fixed-budget instanced wood, leaves, flower petals and butterfly
wings/bodies plus two reusable vine tubes. Theme switches reuse these objects.

Validation: **45 unit tests**, TypeScript, production build, and isolated
Chrome/IWER two-window interaction checks. Checks cover both directions of
setting/task sync, half-progress vine length, VR and companion final saves,
failed final saves, a single butterfly/bird finale, remote Sound Off cancellation,
and no replay on theme change or reopening. All test data uses a disposable
browser profile. The SDK's existing build warnings remain.

Frame-pacing check: requesting 72Hz and 90Hz in the desktop emulator still yielded
roughly 16.7ms median callbacks (about 60Hz), with approximately 18ms p95 during
repeated companion theme switches. This does **not** pass a stable 72/90fps
hardware criterion. The measured scene used about 60 stereo draw calls and 46
geometries after repeated switches; these are diagnostic observations, not Quest
performance guarantees. Verify real Quest 72Hz/90Hz timing, hand input,
readability, comfort, HRTF audio, suspend/resume and durable anchors on hardware.

Implementation files: `src/local-sync.ts`, `src/garden-progress.ts`,
`src/trellis-garden.ts`, `src/zen-audio.ts`, their tests, and the existing task
session/store/controller, spatial state/themes/presentation, and UI entry files.

API references: [storage events](https://developer.mozilla.org/en-US/docs/Web/API/Window/storage_event),
[Web Audio activation](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Best_practices),
and [Meta WebXR frame-rate control](https://developers.meta.com/vr/documentation/web/webxr-frames/).

## Hands-only interaction — October 19, 2026

Immersive sessions require hand tracking. The prototype filters controller input
sources before IWSDK pointer processing and hides controller models. Aim and
pinch or use direct index-fingertip touch on the task panel and lattice/vines/flowers.
Trellis contact gives brief visual feedback only; task controls remain the source
of task completion. Missing hand tracking shows guidance without controller fallback.
The development emulator defaults to hands with both controllers disconnected.

Garden contact tests use actual instance transforms and revealed vine segments,
avoiding phantom bounds that previously intercepted panel touches. Butterflies
are decorative and do not block UI. Emulator checks verified hand-pinch theme
selection, fingertip-touch theme selection, trellis pinch, and controller-trigger
rejection using isolated data. Physical Quest hand occlusion, keyboard entry,
reach/readability, and sustained frame pacing still require hardware verification.

## Bezier growth and constellation transfer — October 19, 2026

Both themes consume the same saved-task completion ratio and bounded 0.6s tween.
The trellis uses piecewise cubic Bezier curves with a vertex-shader
`uGrowthProgress` uniform that tapers the growing tip. CPU draw ranges continue
to limit rendering and hand contacts to revealed segments.

A newly saved forward task completion emits an activation event. Up to 32
simultaneous streams of 12 particles travel from the corresponding trellis-side
node to deterministic star coordinates on a background dome. On arrival, an
alignment event updates visual completion without an individual-star sound.
Stars restore completed state silently.
Switches, list replacement/reset, suspension and reduced motion cancel streams;
loading and duplicate synchronization never replay activation. Garden butterflies and bird audio remain exclusive to Living Trellis.

The existing VR sound preference gates finale audio (default Off). The button
reads Garden sound in Living Trellis and Space sound in Constellation, using the
same saved setting. Enter VR or the sound control must activate audio in the
rendering window; remote storage cannot unlock audio or queue future cues.
Individual task/star activations and theme selection are silent. No external
audio recordings, services, or cross-device synchronization are added.
Real Quest audio activation, HRTF perception and frame timing require hardware
validation; automated checks do not establish audible headset playback.

Validation for this checkpoint: 59 tests passed, TypeScript passed, and production
build passed. An isolated IWER scene rendered fully grown GPU vines with no
reported shader errors. Dependency annotation and bundle-size warnings remain.

## Theme-exclusive finale audio — October 19, 2026

Living Trellis alone plays synthesized bird chirps at its vine-join completion
animation. Constellation alone plays a short plasma- or pulsar-like procedural
buffer after a newly saved final task completes AND all completion streams have
finished. No individual-star or theme-selection chime remains. Reduced motion
resolves the visual state immediately and permits one optional finale sound.
Restore, duplicate sync, task deletion, replacement, reset, and empty lists do
not arm a finale. Cancellation, theme change, hiding and XR exit discard pending
streams/cues, and Sound Off stops active voices immediately.

`src/space-audio.ts` owns a lazy Three.js AudioListener following the tracked head
and up to three PositionalAudio voices under the constellation dome. Star
positions remain attached to the scene as it moves. Two generated mono 1.6s
buffers use smooth attack/release, low gain and a dedicated compressor. They are
original sonification-inspired synthesis, **not NASA, Voyager or pulsar data**.
There are no downloads, licensed recordings or new external assets. Space audio
never starts/stops the garden graph; theme transitions stop both paths.

Validation: 63 tests, TypeScript and production build. Real browser OfflineAudioContext
rendering of three space voices plus a conservative legacy chime/bird stress mix
produced non-silent finite output with peak 0.056 (below the 1.0 clipping boundary).
The actual application routes space and birds exclusively by theme. Physical
Quest playback, perceived level/HRTF and performance remain hardware checks.

Finale audio is armed only when sound is already On at the final saved completion.
Turning sound On later never replays that completion; Off cancels the armed cue
without interrupting the visible particle streams.

## Competition distribution

Run `npm run package:submission` to rebuild and create the static WebXR ZIP,
checksums, manifest and verification report under `submission/`. The build also
makes the SDK's default font fallback worker self-contained using its existing
bundled worker/embedded WASM, without editing dependencies. See
[distribution instructions](docs/distribution.md) and the
[verification checklist](docs/submission-verification.md). Physical Quest
72/90Hz, spatial audio and hands-only keyboard checks remain pending.


## Quest compact companion update — October 22, 2026

The default seated placement now puts the upright board 0.7 m to the right,
0.15 m below eye level and 2.5 m forward. It stays stationary until Recenter or
session entry, rather than following every head turn. Standard width is about
0.58 m (roughly one quarter of a 2.3 m virtual desktop); saved larger size and
hand/room placement options remain available. This is a sizing target, not a
hardware comfort claim.

Every task has a visible row and can be completed independently. Long lists
scroll within the bounded board instead of dropping tasks or growing above the
headset view. A new saved completion gets a brief bee pass and glowing pollen
strike-out; restored completions show the strike-out without replay. Motion Off,
reduced motion and suspension suppress bee motion. Living Trellis vines still
grow along the margins when the garden theme is selected. Side scenery is smaller
to stay close to the compact board.

Settings start closed behind the gear button in VR and the browser companion.
The list action bar offers Reset (unchecks, keeps tasks), Clear All (confirmation,
then saved deletion), and Add Task (opens task entry). Done appears only for a
nonempty completed list; it acknowledges completion and exits immersive VR while
retaining the saved list. Existing New List carryover remains available.

Garden sound On now permits quiet repeating procedural bird phrases during
visible immersive garden use, after activation in that window. Existing saved
sound choices and the default Off remain respected. No background timer is used;
sound stops on Off, theme change, hidden/suspended VR, or exit. The garden finale
can replace an ambient phrase without overlapping it. Constellation sound remains
its existing separate theme-specific finale.

Validation: 66 unit tests, TypeScript, production build, and browser interaction
checks on isolated localhost test data (multiple rows, out-of-order completion,
Done visibility, Reset, settings, Clear All cancellation and confirmation).
Quest 3 readability, pinch targets at 2.5 m, native keyboard, finale clipping,
perceived audio and comfort still require physical headset verification.


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
