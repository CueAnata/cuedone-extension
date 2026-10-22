# Distribution ZIP instructions

Run from the repository root:

```sh
cd prototypes/meta-iwsdk
npm ci
npm test
npm run typecheck
npm run package:submission
unzip -t submission/CueDone-Personal-VR-WebXR.zip
cd submission
shasum -a 256 -c SHA256SUMS-zip.txt
```

`package:submission` builds the production application, makes the SDK's default font worker self-contained, creates a fresh ZIP (without stale files from older archives), verifies its entry list/CRC, and writes the manifest, checksums and reports to `submission/`. It requires Node matching `package.json`, npm, and the system `zip`/`unzip` tools. The ZIP contains only the contents of `dist/`, with `index.html` at its root.

Output:

- `CueDone-Personal-VR-WebXR.zip`: deployable static WebXR runtime.
- `VERIFICATION.md`: completed checks and pending physical Quest checklist.
- `DISTRIBUTION.md`: these instructions.
- `build-manifest.json`, `SHA256SUMS-dist.txt`, `SHA256SUMS-zip.txt`: exact file and archive integrity records.
- `asset-audit.json`: separately captured production browser/reference audit, when provided. Re-run the asset audit after any source/dependency/build change; packaging alone does not rerun a browser or certify headset behavior.

To host, extract the ZIP contents to an HTTPS static site's document root or a subdirectory, retaining `assets/`, `scenes/` and `ui/`. Do not submit the source folder or `node_modules` as the web runtime. Opening `index.html` via `file://` is not a valid Quest WebXR test. Check production MIME types and CSP for module/Blob workers and embedded WASM. No backend, cloud task sync or cross-device pairing is required or included.

Verify the ZIP checksum before uploading. Test the hosted build on Quest and complete `VERIFICATION.md` before claiming hardware readiness. Follow the current competition portal's required delivery format; this archive is a web build, not an APK or an automatic portal submission.
