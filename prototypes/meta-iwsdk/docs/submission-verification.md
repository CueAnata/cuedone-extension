# CueDone Personal VR — final submission verification

Prepared October 19, 2026. WebXR/IWSDK Personal-only, local-first prototype.
This is a web distribution, not an Android APK. Nothing has been uploaded or submitted.

## Completed verification

- [x] 63 automated tests pass; TypeScript (`tsc --noEmit`) passes.
- [x] Production build succeeds. Existing dependency-comment and large-bundle warnings remain non-blocking.
- [x] All 15 production files are inventoried and SHA-256 hashed; total uncompressed size: 8,264,916 bytes.
- [x] 73 extracted local HTML/CSS/JavaScript asset references resolve inside `dist`.
- [x] Scene JSON and spatial UIKitML are included; fonts/WASM are embedded in local JS. Space/bird audio is generated locally; there are no downloaded recordings.
- [x] No unresolved JavaScript bare imports remain in the distributed files. The SDK's unused default MSDF worker originally imported bare `comlink`; the build now replaces it using the SDK's bundled worker with embedded WASM. No dependency files were edited.
- [x] Fresh isolated production browser startup works at `/` and `/nested/`, with 14 requests each including a direct fallback-worker test. External HTTP(S) was blocked; no external requests, HTTP failures or JavaScript console errors occurred.
- [x] The default font fallback worker initializes its embedded WASM without a CDN, import map or separately fetched `.wasm` file.
- [x] ZIP CRC/integrity and its exact runtime file list are checked by the packaging script. `index.html` is at the archive root. No source code, dependencies, `.env`, browser profile or saved tasks enter the runtime ZIP.
- [x] Distribution and archive checksums are included alongside the ZIP.

`asset-audit.json` records the reference checks, runtime requests, file hashes and scope.
The production smoke check covers companion startup and fonts/workers; it does not execute every XR-only branch. SDK documentation/default-service URLs may exist as inert strings in bundled library code; none were requested in the smoke check.

## Audio and animation behavior verified by automated checks

- [x] Both themes share task identities and completion ratios; switching themes does not reset tasks.
- [x] Bezier vines use `uGrowthProgress`; CPU draw/contact ranges exclude unrevealed segments.
- [x] A successful nonempty final completion arms Constellation's finale; it emits once after its completion streams finish. Partial tasks, restored completed lists, duplicate synchronization, replacements/resets and cancellation do not replay it.
- [x] Living Trellis alone plays birds at its joined-vine/butterfly finale. Constellation alone plays plasma/pulsar-like buffers at its finished finale. No individual-star or theme-selection chimes remain.
- [x] Finale audio requires sound already On at the final saved completion and activation in the rendering document. Enabling sound later never replays a missed cue; Off, theme changes, hiding and XR exit stop playback.
- [x] Positional space audio has bounded voices, smooth sample edges, conservative gain and a dedicated compressor. Browser offline mixing produced finite, non-silent output below clipping (peak 0.056 in a conservative stress fixture).

Space buffers are original procedural sonification-inspired audio, **not NASA/Voyager/pulsar recordings**.

## Physical Meta Quest checklist — NOT YET VERIFIED

Use a disposable headset-browser test origin/profile and synthetic tasks. Record headset model, Quest OS/Browser versions, build ZIP SHA-256, HTTPS URL, room/boundary mode, date and tester. Do not overwrite an existing CueDone list.

### 72/90Hz performance

- [ ] Confirm which refresh rates the actual XR session supports; request 72Hz and 90Hz separately where supported. Record the accepted rate; unsupported modes are not passes.
- [ ] Run at least 10 minutes per supported mode, including both themes, repeated theme changes, all panel sizes, partial growth and final completion effects.
- [ ] Capture device frame timing (not just reported refresh rate or desktop callbacks): median/p95/p99, dropped frames, longest stalls, CPU/GPU time where available and thermal behavior.
- [ ] Compare against 13.89ms/frame at 72Hz and 11.11ms/frame at 90Hz. Confirm sustained target pacing without recurring stalls through finales; record failures and the exact trace.
- [ ] Check seated readability, reach, head/hand/room placement, boundary behavior, motion Off and OS reduced motion. Stop if uncomfortable; record findings.

Desktop IWER previously ran near 60Hz even when asked for 72/90Hz. That is **not** evidence of passing headset performance.

### Spatial audio panning and finale exclusivity

- [ ] Enter VR using a local gesture; enable the current theme's sound control. Verify no sound from enabling it, changing themes or completing a non-final task.
- [ ] In Constellation, complete the last task. Verify silence until the completion streams finish, then exactly one space cue at the aligned dome-star location; no birds.
- [ ] Turn/translate the tracked head during playback and compare stars on opposite sides. Verify stable left/right and depth panning that follows the actual scene node, without pops, clipping or excessive level.
- [ ] In Living Trellis, complete the last task. Verify birds only at the joined-vine/butterfly finale, with no space cue or individual-star sound.
- [ ] Switch Sound Off during playback, switch themes, hide/suspend and exit XR. Verify immediate silence and no delayed playback after resuming or enabling sound.
- [ ] Restore an already completed list; test empty list, reset/new list and a failed save. Verify no finale audio or replay. Verify reduced-motion completion remains comfortable.

### Hands-only keyboard entry

- [ ] Disconnect/put away handheld controllers; confirm they cannot activate UI.
- [ ] Pinch and touch the spatial task input. Confirm Quest's system keyboard opens and the typed text reaches the intended field.
- [ ] Add several tasks, including spaces, punctuation and longer text; dismiss/reopen the keyboard and confirm readable input, saved feedback and correct order.
- [ ] Complete tasks using both pinch and direct touch; verify one completion per action, correct progress and finale timing.
- [ ] Verify tracking loss/recovery cannot cause accidental completion, duplicate Add or loss of an unsaved draft.
- [ ] Verify entry, Add and Complete work end-to-end without a desktop keyboard. Emulator typing does not pass this check. If the system keyboard path fails, document it as an unresolved usability blocker; do not claim headset entry is complete.

### Recovery and final sign-off

- [ ] Verify same-device reload/suspend/resume restores local tasks/preferences without replay; check room-anchor support and fallback on that headset.
- [ ] Confirm the production HTTPS host returns correct MIME types for JS/CSS/JSON/UIKitML and permits required local workers, Blob workers and embedded WASM under its actual CSP.
- [ ] Test the exact hosted ZIP contents on Quest, not the development server. Attach screenshots/video and device traces to the report.
- [ ] Review the current competition portal's delivery/eligibility/material requirements separately. No official competition-rule or submission-format certification is claimed here.

Hardware result: **pending**. Tester/date/build/URL: ____________________
72Hz: ______ 90Hz: ______ Audio: ______ Keyboard: ______ Overall: ______

## Distribution status

The web ZIP, manifest, checksums, reference-audit evidence and this report are prepared locally. Physical Quest checks, hosted HTTPS deployment, headset demo media and portal submission remain outstanding. The package has not been represented as hardware-certified or uploaded.
