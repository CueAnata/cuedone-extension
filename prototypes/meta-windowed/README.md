# CueDone windowed companion experiment

This separate local package explores a Personal-only CueDone panel that can
reflow among compact, expanded, and planning views. It is not the immersive
IWSDK contest prototype and does not change the Chrome/Edge extension.

The experiment imports CueDone's pure task operations from
`../../src/shared/tasks.js` and list carryover behavior from
`../../src/shared/list-lifecycle.js`. Its own versioned browser storage lives at
`cuedone.vr.windowed.tasks.v1`. It never reads or writes the immersive
prototype key (`cuedone.vr.personal.tasks.v1`) or extension storage.

Implemented locally:

- Compact: current task, Complete, progress, and waiting count.
- Expanded: current task, Complete, progress, waiting count, Add, and New List.
- Planning: the full list with reorder/delete controls plus the expanded tools.
- New List: carry every unfinished task in order, start empty, or Cancel.
- Save-before-apply behavior with explicit load, save, and Add feedback.

## Local development

```sh
cd prototypes/meta-windowed
npm install
npm run dev
```

The local preview uses `http://localhost:8082/`.

## Checks

```sh
npm test
npm run typecheck
npm run build
```

Use isolated browser data when testing. Packaging, sideloading, deployment,
Meta Store upload, hardware coexistence, cloud sync, accounts, handoff, Client
View, Work Group, rewards, audio, and celebrations are outside this experiment.
