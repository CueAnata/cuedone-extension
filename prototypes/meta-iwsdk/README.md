# CueDone Personal VR prototype

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
