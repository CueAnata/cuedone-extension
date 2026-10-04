import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  celebrationAudioEnabledForTests,
  clearCelebrationFeedback,
  FINAL_SOUND_ASSETS,
  playCelebrationSound,
  playTaskSound,
  resetCelebrationAudioForTests,
  resolveTaskSound,
  setCelebrationAudioEnabled,
  showCelebration,
  showFinalTrail,
  TRAIL_MS,
  TASK_SOUND_ASSETS,
  unlockCelebrationAudio,
} from "../src/shared/celebrations.js";

function createNode() {
  const classSet = new Set();
  const node = {
    childNodes: [],
    textContent: "",
    dataset: {},
    attrs: {},
    style: {
      setProperty() {},
    },
    classList: {
      add(...names) {
        names.forEach((name) => classSet.add(name));
      },
      remove(...names) {
        names.forEach((name) => classSet.delete(name));
      },
      contains(name) {
        return classSet.has(name);
      },
      toggle(name, force) {
        if (force === true || (force !== false && !classSet.has(name))) {
          classSet.add(name);
          return;
        }
        classSet.delete(name);
      },
    },
    setAttribute(name, value) {
      node.attrs[name] = value;
    },
    append(...children) {
      node.childNodes.push(...children);
    },
    replaceChildren(...children) {
      node.childNodes = [...children];
    },
    querySelector(selector) {
      const name = String(selector).replace(/^\./, "");
      return (
        node.childNodes.find((child) => child.classList?.contains(name)) || null
      );
    },
  };

  Object.defineProperty(node, "className", {
    get() {
      return [...classSet].join(" ");
    },
    set(value) {
      classSet.clear();
      String(value)
        .split(/\s+/)
        .filter(Boolean)
        .forEach((name) => classSet.add(name));
    },
  });

  return node;
}

function installDom({ reducedMotion = false } = {}) {
  const body = createNode();
  globalThis.document = {
    body,
    createElement() {
      return createNode();
    },
    querySelector(selector) {
      if (selector === ".celebration-layer") {
        return (
          body.childNodes.find((node) =>
            node.classList.contains("celebration-layer")
          ) || null
        );
      }
      return null;
    },
  };
  globalThis.matchMedia = (query) => ({
    matches: reducedMotion && String(query).includes("prefers-reduced-motion"),
  });
}

function collectText(node) {
  const values = [];
  const walk = (current) => {
    if (current.textContent) {
      values.push(current.textContent);
    }
    for (const child of current.childNodes || []) {
      walk(child);
    }
  };
  walk(node);
  return values;
}

function installAudio({ rejectHtml = false, deferResume = false } = {}) {
  let created = 0;
  let resumes = 0;
  let htmlPlays = 0;
  let pauses = 0;
  let oscillatorStarts = 0;
  let oscillatorStops = 0;
  const playedSources = [];
  const resumeResolvers = [];
  resetCelebrationAudioForTests();
  globalThis.URL = globalThis.URL || {};
  globalThis.URL.createObjectURL = () => "blob:cuedone-chime";
  globalThis.URL.revokeObjectURL = () => {};
  const originalCreate = globalThis.document?.createElement;
  if (globalThis.document) {
    globalThis.document.createElement = () => {
      const node = createNode();
      node.play = () => {
        htmlPlays += 1;
        playedSources.push(node.src || "");
        return rejectHtml
          ? Promise.reject(new Error("audio failed"))
          : Promise.resolve();
      };
      node.pause = () => {
        pauses += 1;
      };
      node.preload = "auto";
      return node;
    };
    if (originalCreate) {
      // Keep querySelector working for the celebration overlay.
    }
  }
  globalThis.AudioContext = class {
    constructor() {
      created += 1;
      this.state = "suspended";
      this.currentTime = 0;
      this.destination = {};
    }

    resume() {
      resumes += 1;
      if (!deferResume) {
        this.state = "running";
        return Promise.resolve();
      }

      return new Promise((resolve) => {
        resumeResolvers.push(() => {
          this.state = "running";
          resolve();
        });
      });
    }

    suspend() {
      this.state = "suspended";
      return Promise.resolve();
    }

    createOscillator() {
      return {
        type: "sine",
        frequency: { value: 0 },
        connect() {},
        disconnect() {},
        start() {
          oscillatorStarts += 1;
        },
        stop() {
          oscillatorStops += 1;
        },
      };
    }

    createGain() {
      return {
        gain: {
          value: 0,
          setValueAtTime() {},
          exponentialRampToValueAtTime() {},
          linearRampToValueAtTime() {},
        },
        connect() {},
      };
    }

    close() {
      this.state = "closed";
      return Promise.resolve();
    }
  };

  return {
    created: () => created,
    resumes: () => resumes,
    htmlPlays: () => htmlPlays,
    pauses: () => pauses,
    oscillatorStarts: () => oscillatorStarts,
    oscillatorStops: () => oscillatorStops,
    playedSources: () => [...playedSources],
    resolveResumes() {
      resumeResolvers.splice(0).forEach((resolve) => resolve());
    },
  };
}

test("showCelebration ignores invalid kinds", () => {
  installDom();
  assert.equal(showCelebration({ kind: "simple" }), null);
  assert.equal(showCelebration({}), null);
});

test("micro celebrations render a non-blocking overlay without audio by default", () => {
  installDom();
  const audio = installAudio();
  const name = showCelebration({ kind: "micro", playSound: false });
  const layer = document.querySelector(".celebration-layer");
  assert.equal(typeof name, "string");
  assert.equal(layer.classList.contains("is-visible"), true);
  assert.equal(layer.dataset.kind, "micro");
  assert.equal(layer.attrs["aria-hidden"], "true");
  assert.equal(audio.created(), 0);
});

test("sound off means no celebration audio", () => {
  installDom();
  const audio = installAudio();
  showCelebration({ kind: "final", playSound: false });
  assert.equal(audio.created(), 0);
  assert.equal(audio.resumes(), 0);
});

test("sound-on path plays from the user gesture and resumes AudioContext", () => {
  installDom();
  const audio = installAudio();
  setCelebrationAudioEnabled(true);
  unlockCelebrationAudio();
  assert.equal(audio.created(), 1);
  assert.equal(audio.resumes(), 1);
  assert.equal(playCelebrationSound("micro"), true);
  assert.ok(audio.htmlPlays() >= 1);
  showCelebration({ kind: "micro", playSound: true });
  assert.equal(audio.created(), 1);
});

test("selected final and task sounds use their separate bundled assets", () => {
  installDom();
  const audio = installAudio();
  setCelebrationAudioEnabled(true);
  assert.equal(playCelebrationSound("final", "yay"), true);
  assert.equal(audio.playedSources().at(-1), FINAL_SOUND_ASSETS.yay);
  assert.equal(playCelebrationSound("micro", "current", "soft-click"), true);
  assert.equal(audio.playedSources().at(-1), TASK_SOUND_ASSETS["soft-click"]);
});

test("bundled final sounds match the recorded CC0 assets", () => {
  const expected = {
    yay: "0ae92efea5724ce221063e7785f0067443b2d844922961ad8931ba2766a680a9",
    applause:
      "6246082e4722e0eaa9b3cfeefdec86ed0effc20afe6da3e744cff4dd54db66f3",
    "trumpet-fanfare":
      "d9ac11b54eb00bfeecbcaba90051940c92a0dfa9f9d915373e3759962bf1cd82",
    hurrah:
      "1b99fd8bd1353aee4de95274b869795f127eff68f78f73a599ae6455d86b4f23",
  };

  for (const [name, hash] of Object.entries(expected)) {
    const bytes = readFileSync(fileURLToPath(FINAL_SOUND_ASSETS[name]));
    assert.equal(createHash("sha256").update(bytes).digest("hex"), hash);
  }
});

test("original task sounds match provenance hashes and stay under 0.2 seconds", () => {
  const expected = {
    "bubble-pop":
      "c0607ed6ca8efc5c26d254c979de928e85eb1fb3e5a4d64ab7194a21a36384ad",
    "soft-click":
      "aab4480fb0ec3c36d7fc8489639ef3c18f2f559b470d95559fa602f6a87e05b6",
    "wood-tap":
      "5590e771610b3c1f55fbb3895b18d16211ce9a38fb4ad8f927631d8caaa09d79",
  };

  for (const [name, hash] of Object.entries(expected)) {
    const bytes = readFileSync(fileURLToPath(TASK_SOUND_ASSETS[name]));
    const sampleRate = bytes.readUInt32LE(24);
    const dataBytes = bytes.readUInt32LE(40);
    const duration = dataBytes / 2 / sampleRate;
    assert.equal(createHash("sha256").update(bytes).digest("hex"), hash);
    assert.ok(duration > 0 && duration < 0.2);
  }
});

test("task sound None stays silent without disabling the selected final sound", () => {
  installDom();
  const audio = installAudio();
  setCelebrationAudioEnabled(true);
  assert.equal(playTaskSound("none"), false);
  assert.equal(audio.htmlPlays(), 0);
  assert.equal(playCelebrationSound("final", "hurrah"), true);
  assert.equal(audio.playedSources().at(-1), FINAL_SOUND_ASSETS.hurrah);
});

test("Random selects Pop, Click, or Tap for each task completion", () => {
  assert.equal(resolveTaskSound("random", () => 0), "bubble-pop");
  assert.equal(resolveTaskSound("random", () => 0.4), "soft-click");
  assert.equal(resolveTaskSound("random", () => 0.99), "wood-tap");
  assert.equal(resolveTaskSound("unknown"), "bubble-pop");
});

test("rapid task sounds replace active playback instead of overlapping", () => {
  installDom();
  const audio = installAudio();
  setCelebrationAudioEnabled(true);
  playTaskSound("bubble-pop");
  playTaskSound("wood-tap");
  assert.deepEqual(audio.playedSources().slice(-2), [
    TASK_SOUND_ASSETS["bubble-pop"],
    TASK_SOUND_ASSETS["wood-tap"],
  ]);
  assert.ok(audio.pauses() >= 1);
});

test("master Sound Off immediately stops an active task sound", () => {
  installDom();
  const audio = installAudio();
  setCelebrationAudioEnabled(true);
  playTaskSound("soft-click");
  const pausesBeforeOff = audio.pauses();
  setCelebrationAudioEnabled(false);
  assert.ok(audio.pauses() > pausesBeforeOff);
  assert.equal(playTaskSound("wood-tap"), false);
});

test("sound off stops active audio and blocks every playback path", () => {
  installDom();
  const audio = installAudio();
  setCelebrationAudioEnabled(true);
  playCelebrationSound("final", "applause");
  setCelebrationAudioEnabled(false);
  assert.equal(celebrationAudioEnabledForTests(), false);
  assert.ok(audio.pauses() >= 1);
  assert.equal(playTaskSound("bubble-pop"), false);
  assert.equal(playCelebrationSound("final", "hurrah"), false);
});

test("sound off cancels queued Web Audio before it can start", async () => {
  installDom();
  const audio = installAudio({ rejectHtml: true, deferResume: true });
  setCelebrationAudioEnabled(true);
  playCelebrationSound("final", "current");
  await Promise.resolve();
  setCelebrationAudioEnabled(false);
  audio.resolveResumes();
  await Promise.resolve();
  await Promise.resolve();
  assert.equal(audio.oscillatorStarts(), 0);
});

test("audio failure never throws or blocks final visual feedback", async () => {
  installDom();
  installAudio({ rejectHtml: true });
  setCelebrationAudioEnabled(true);
  assert.doesNotThrow(() => playCelebrationSound("final", "hurrah"));
  const name = showCelebration({
    kind: "final",
    playSound: true,
    finalSound: "hurrah",
    rewardText: "REWARD: MUSIC!",
  });
  await Promise.resolve();
  assert.equal(typeof name, "string");
  assert.equal(
    collectText(document.querySelector(".celebration-layer")).includes(
      "REWARD: MUSIC!"
    ),
    true
  );
});

test("clearing completion feedback stops audio and removes active visuals", () => {
  installDom();
  const audio = installAudio();
  setCelebrationAudioEnabled(true);
  playTaskSound("bubble-pop");
  const container = createNode();
  document.body.append(container);
  showFinalTrail({ trail: "stars", container });
  showCelebration({ kind: "final", rewardText: "REWARD: MUSIC!" });

  const celebration = document.querySelector(".celebration-layer");
  const trail = container.querySelector(".final-trail-layer");
  assert.equal(celebration.classList.contains("is-visible"), true);
  assert.equal(trail.classList.contains("is-visible"), true);

  clearCelebrationFeedback(container);

  assert.equal(celebration.classList.contains("is-visible"), false);
  assert.equal(trail.classList.contains("is-visible"), false);
  assert.equal(celebration.childNodes.length, 0);
  assert.equal(trail.childNodes.length, 0);
  assert.ok(audio.pauses() >= 1);
  assert.equal(celebrationAudioEnabledForTests(), true);
});

test("final celebration prominently reveals the chosen reward", () => {
  installDom();
  showCelebration({
    kind: "final",
    playSound: false,
    rewardText: "REWARD: GAME TIME!",
  });
  const layer = document.querySelector(".celebration-layer");
  assert.equal(layer.dataset.kind, "final");
  assert.equal(collectText(layer).includes("You did it!"), true);
  assert.equal(collectText(layer).includes("REWARD: GAME TIME!"), true);
});

test("final celebration omits a reward line when none is selected", () => {
  installDom();
  showCelebration({ kind: "final", playSound: false, rewardText: "" });
  const layer = document.querySelector(".celebration-layer");
  assert.equal(collectText(layer).includes("REWARD:"), false);
});

test("final trail stays inside CueDone and only uses the four approved types", () => {
  installDom();
  const main = createNode();
  main.classList.add("app-main");
  document.body.append(main);
  const name = showFinalTrail({ trail: "balloons", container: main, onDone() {} });
  const layer = main.querySelector(".final-trail-layer");
  assert.equal(name, "balloons");
  assert.equal(layer.classList.contains("is-visible"), true);
  assert.equal(layer.dataset.trail, "balloons");
  assert.ok(layer.childNodes.length > 0);
  assert.equal(showFinalTrail({ trail: "micro", container: main }), null);
  assert.ok(TRAIL_MS >= 1000 && TRAIL_MS <= 2000);
});

test("reduced motion still shows a fade acknowledgement", () => {
  installDom({ reducedMotion: true });
  const name = showCelebration({ kind: "micro", playSound: false });
  const layer = document.querySelector(".celebration-layer");
  assert.equal(name, "yay");
  assert.equal(layer.childNodes[0].classList.contains("is-static"), true);
  assert.equal(layer.childNodes[0].childNodes[0].textContent, "Yay!");
});

test("celebration visuals stay out of the shared task model", () => {
  const tasksJs = readFileSync("src/shared/tasks.js", "utf8");
  const storeJs = readFileSync("src/shared/task-store.js", "utf8");
  const celebrationsJs = readFileSync("src/shared/celebrations.js", "utf8");
  const css = readFileSync("src/shared/styles.css", "utf8");
  assert.equal(tasksJs.includes("showCelebration"), false);
  assert.equal(storeJs.includes("showCelebration"), false);
  assert.equal(celebrationsJs.includes("chrome."), false);
  assert.match(css, /\.celebration-layer\s*\{[\s\S]*?pointer-events:\s*none/);
  assert.match(
    css,
    /body\[data-presentation="client"\] \.celebration-layer\.is-visible/
  );
  assert.match(css, /\.celebration-mark\s*\{[\s\S]*?font-size:\s*3\.15rem/);
  assert.match(
    css,
    /\[data-kind="final"\] \.celebration-message\s*\{[\s\S]*?font-size:\s*1\.9rem/
  );
  assert.equal(css.includes("celebration-flip"), false);
  assert.match(css, /\.client-reward-setup\[hidden\][\s\S]*display:\s*none/);
  assert.match(css, /\.final-trail-layer\s*\{[\s\S]*?position:\s*absolute/);
  assert.match(css, /\.final-trail-layer\s*\{[\s\S]*?pointer-events:\s*none/);
  assert.match(css, /\.final-trail-bit\.is-balloons/);
  assert.match(css, /\.final-trail-bit\.is-stars/);
  assert.match(css, /\.final-trail-bit\.is-cars/);
  assert.match(css, /\.final-trail-bit\.is-butterflies/);
  assert.equal(css.includes(".final-trail-bit.is-confetti"), false);
});
