import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  playCelebrationSound,
  resetCelebrationAudioForTests,
  showCelebration,
  showFinalTrail,
  TRAIL_MS,
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

function installAudio() {
  let created = 0;
  let resumes = 0;
  let htmlPlays = 0;
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
        return Promise.resolve();
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
      this.state = "running";
      resumes += 1;
      return Promise.resolve();
    }

    createOscillator() {
      return {
        type: "sine",
        frequency: { value: 0 },
        connect() {},
        start() {},
        stop() {},
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
  unlockCelebrationAudio();
  assert.equal(audio.created(), 1);
  assert.equal(audio.resumes(), 1);
  assert.equal(playCelebrationSound("micro"), true);
  assert.ok(audio.htmlPlays() >= 1);
  showCelebration({ kind: "micro", playSound: true });
  assert.equal(audio.created(), 1);
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
