import { FINAL_TRAILS, pickCelebration } from "./client-view.js";

const MICRO_MS = 1300;
const FINAL_MS = 1900;
export const TRAIL_MS = 1600;
const TRAIL_REDUCED_MS = 400;
const TRAIL_MARKS = {
  balloons: ["🎈", "🎈", "🎈"],
  stars: ["✦", "✧", "★"],
  cars: ["🚗", "🚙", "🚕"],
  butterflies: ["🦋", "🦋"],
};
const MARKS = {
  clap: "👏",
  thumbs: "👍",
  yay: "Yay!",
  "you-did-it": "You did it!",
  buddy: "👍",
};

let lastPick = null;
let lastTrail = null;
let hideTimer = 0;
let trailTimer = 0;
let audioContext = null;
let chimeElement = null;
let chimeUrl = "";

function prefersReducedMotion() {
  return Boolean(
    globalThis.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches
  );
}

function trailLayer(container) {
  const root =
    container ||
    document.querySelector(".app-main") ||
    document.body;
  let node = root.querySelector(".final-trail-layer");
  if (node) {
    return node;
  }

  node = document.createElement("div");
  node.className = "final-trail-layer";
  node.setAttribute("aria-hidden", "true");
  root.append(node);
  return node;
}

function trailBits(trail) {
  const marks = TRAIL_MARKS[trail] || TRAIL_MARKS.stars;
  const count = trail === "cars" ? 6 : 10;
  const bits = [];
  for (let index = 0; index < count; index += 1) {
    const bit = document.createElement("span");
    bit.className = `final-trail-bit is-${trail}`;
    bit.textContent = marks[index % marks.length];
    bit.style.setProperty("--x", `${10 + ((index * 17) % 78)}%`);
    bit.style.setProperty("--y", `${18 + (index % 3) * 22}%`);
    bit.style.setProperty("--delay", `${(index % 8) * 70}ms`);
    bit.style.setProperty("--travel", `${-220 - (index % 5) * 24}px`);
    bit.style.setProperty("--zoom", `${240 + (index % 4) * 36}px`);
    bits.push(bit);
  }
  return bits;
}

export function showFinalTrail({
  trail,
  container,
  onDone,
} = {}) {
  const name = FINAL_TRAILS.includes(trail) ? trail : null;
  if (!name || typeof document === "undefined") {
    if (typeof onDone === "function") {
      onDone();
    }
    return null;
  }

  lastTrail = name;
  const reducedMotion = prefersReducedMotion();
  const host = trailLayer(container);
  host.replaceChildren();
  host.classList.add("is-visible");
  host.dataset.trail = name;
  host.classList.toggle("is-static", reducedMotion);

  if (reducedMotion) {
    const mark = document.createElement("span");
    mark.className = `final-trail-bit is-${name} is-static`;
    mark.textContent = (TRAIL_MARKS[name] || ["✦"])[0];
    host.append(mark);
  } else {
    host.append(...trailBits(name));
  }

  globalThis.clearTimeout(trailTimer);
  trailTimer = globalThis.setTimeout(
    () => {
      host.classList.remove("is-visible");
      host.replaceChildren();
      if (typeof onDone === "function") {
        onDone();
      }
    },
    reducedMotion ? TRAIL_REDUCED_MS : TRAIL_MS
  );

  return name;
}

export function lastFinalTrailForTests() {
  return lastTrail;
}

function layer() {
  let node = document.querySelector(".celebration-layer");
  if (node) {
    return node;
  }

  node = document.createElement("div");
  node.className = "celebration-layer";
  node.setAttribute("aria-hidden", "true");
  document.body.append(node);
  return node;
}

function burst(kind, count, className) {
  const marks =
    kind === "stars" || kind === "stars-big"
      ? ["✦", "✧", "★"]
      : kind === "fireworks"
        ? ["✸", "✦", "✧"]
        : kind.includes("confetti")
          ? ["•", "▸", "◆"]
          : ["✦"];
  const reach = className.includes("is-final") ? 22 : 16;
  const bits = [];
  for (let index = 0; index < count; index += 1) {
    const bit = document.createElement("span");
    bit.className = className;
    bit.textContent = marks[index % marks.length];
    bit.style.setProperty("--dx", `${(index % 8) * reach - reach * 3.5}px`);
    bit.style.setProperty("--dy", `${-48 - (index % 5) * (reach - 4)}px`);
    bit.style.setProperty("--delay", `${(index % 6) * 40}ms`);
    bits.push(bit);
  }
  return bits;
}

function buddyContent() {
  const character = document.createElement("div");
  character.className = "celebration-buddy";
  const face = document.createElement("span");
  face.className = "celebration-buddy-face";
  face.textContent = "😊";
  const thumb = document.createElement("span");
  thumb.className = "celebration-mark celebration-buddy-thumb";
  thumb.textContent = "👍";
  character.append(face, thumb);
  return character;
}

function contentFor(name, reducedMotion, kind, rewardText = "") {
  const wrap = document.createElement("div");
  wrap.className = `celebration-burst is-${name}${
    reducedMotion ? " is-static" : ""
  }`;

  if (kind === "final") {
    const label = document.createElement("p");
    label.className = "celebration-message";
    label.textContent = "You did it!";
    wrap.append(label);
    if (rewardText) {
      const reward = document.createElement("p");
      reward.className = "celebration-reward";
      reward.textContent = rewardText;
      wrap.append(reward);
    }
    if (!reducedMotion) {
      const burstName = name === "you-did-it" ? "fireworks" : name;
      wrap.append(...burst(burstName, 28, "celebration-bit is-final"));
    }
    return wrap;
  }

  if (name === "yay" || reducedMotion) {
    const label = document.createElement("p");
    label.className = "celebration-message";
    label.textContent = MARKS[name] || "Nice!";
    wrap.append(label);
    return wrap;
  }

  if (name === "buddy") {
    wrap.append(buddyContent());
    return wrap;
  }

  if (MARKS[name]) {
    const mark = document.createElement("p");
    mark.className = "celebration-mark";
    mark.textContent = MARKS[name];
    wrap.append(mark);
  }

  if (name === "stars" || name === "confetti") {
    wrap.append(...burst(name, 12, "celebration-bit"));
  }

  return wrap;
}

export function resetCelebrationAudioForTests() {
  audioContext = null;
  chimeElement = null;
  if (chimeUrl && globalThis.URL?.revokeObjectURL) {
    globalThis.URL.revokeObjectURL(chimeUrl);
  }
  chimeUrl = "";
}

function writeString(view, offset, value) {
  for (let index = 0; index < value.length; index += 1) {
    view.setUint8(offset + index, value.charCodeAt(index));
  }
}

function encodeWav(samples, sampleRate) {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(view, 8, "WAVE");
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(view, 36, "data");
  view.setUint32(40, samples.length * 2, true);
  let offset = 44;
  for (const sample of samples) {
    const clamped = Math.max(-1, Math.min(1, sample));
    view.setInt16(
      offset,
      clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff,
      true
    );
    offset += 2;
  }
  return buffer;
}

function chimeSamples(kind, sampleRate = 22050) {
  const notes = kind === "final" ? [523.25, 659.25, 783.99] : [659.25, 783.99];
  const noteSamples = Math.floor(sampleRate * 0.11);
  const samples = [];
  for (const frequency of notes) {
    for (let index = 0; index < noteSamples; index += 1) {
      const attack = Math.min(1, index / 180);
      const release = Math.min(1, (noteSamples - index) / 420);
      samples.push(
        0.42 *
          attack *
          release *
          Math.sin((2 * Math.PI * frequency * index) / sampleRate)
      );
    }
  }
  return samples;
}

function chimeElementNode() {
  if (chimeElement) {
    return chimeElement;
  }

  chimeElement = document.createElement("audio");
  chimeElement.className = "cuedone-chime";
  chimeElement.setAttribute("aria-hidden", "true");
  chimeElement.preload = "auto";
  document.body.append(chimeElement);
  return chimeElement;
}

function playHtmlChime(kind) {
  if (typeof document === "undefined" || !globalThis.URL?.createObjectURL) {
    return Promise.reject(new Error("html audio unavailable"));
  }

  const node = chimeElementNode();
  const wav = new Blob([encodeWav(chimeSamples(kind), 22050)], {
    type: "audio/wav",
  });
  if (chimeUrl) {
    globalThis.URL.revokeObjectURL(chimeUrl);
  }
  chimeUrl = globalThis.URL.createObjectURL(wav);
  node.src = chimeUrl;
  node.volume = 0.82;
  if (typeof node.play !== "function") {
    return Promise.reject(new Error("html audio play unavailable"));
  }
  return node.play();
}

function startOscillators(context, kind) {
  const notes = kind === "final" ? [523.25, 659.25, 783.99] : [659.25, 783.99];
  const now = context.currentTime;
  notes.forEach((frequency, index) => {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = frequency;
    oscillator.connect(gain);
    gain.connect(context.destination);
    const start = now + index * 0.1;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.linearRampToValueAtTime(0.24, start + 0.02);
    gain.gain.linearRampToValueAtTime(0.0001, start + 0.16);
    oscillator.start(start);
    oscillator.stop(start + 0.18);
  });
}

export function unlockCelebrationAudio() {
  const AudioCtx = globalThis.AudioContext || globalThis.webkitAudioContext;
  if (!AudioCtx) {
    return null;
  }

  if (!audioContext || audioContext.state === "closed") {
    audioContext = new AudioCtx();
  }

  if (audioContext.state === "suspended" && audioContext.resume) {
    audioContext.resume().catch(() => {});
  }

  return audioContext;
}

function playWebAudio(kind) {
  const context = unlockCelebrationAudio();
  if (!context) {
    return false;
  }

  const start = () => {
    if (!context || context.state !== "running") {
      return;
    }

    try {
      startOscillators(context, kind);
    } catch {
      // Audio is optional.
    }
  };

  if (context.state === "running") {
    start();
    return true;
  }

  if (context.resume) {
    context.resume().then(start).catch(() => {});
  }
  return true;
}

export function playCelebrationSound(kind) {
  const context = unlockCelebrationAudio();
  try {
    const played = playHtmlChime(kind);
    if (played?.catch) {
      played.catch(() => {
        playWebAudio(kind);
      });
    }
  } catch {
    playWebAudio(kind);
  }

  return Boolean(context || typeof document !== "undefined");
}

export function showCelebration({
  kind,
  playSound = false,
  rewardText = "",
  onDone,
} = {}) {
  if (kind !== "micro" && kind !== "final") {
    return null;
  }

  const reducedMotion = prefersReducedMotion();
  const name = pickCelebration(kind, reducedMotion, lastPick);
  lastPick = name;
  const host = layer();
  host.replaceChildren(contentFor(name, reducedMotion, kind, rewardText));
  host.classList.add("is-visible");
  host.dataset.kind = kind;
  host.dataset.celebration = name;
  host.dataset.reward = rewardText;

  if (playSound) {
    try {
      playCelebrationSound(kind);
    } catch {
      // Audio is optional; visual feedback still shows.
    }
  }

  globalThis.clearTimeout(hideTimer);
  hideTimer = globalThis.setTimeout(
    () => {
      host.classList.remove("is-visible");
      host.replaceChildren();
      if (typeof onDone === "function") {
        onDone();
      }
    },
    kind === "final" ? FINAL_MS : MICRO_MS
  );

  return name;
}
