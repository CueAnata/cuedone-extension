import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SAMPLE_RATE = 44100;
const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = resolve(SCRIPT_DIR, "../assets/audio");

function fadeEnvelope(time, duration, attack, decay) {
  const fadeIn = Math.min(1, time / attack);
  const fadeOut = Math.min(1, (duration - time) / 0.012);
  return fadeIn * fadeOut * Math.exp(-time / decay);
}

function normalize(samples, peak = 0.45) {
  const currentPeak = samples.reduce(
    (largest, sample) => Math.max(largest, Math.abs(sample)),
    0
  );
  if (currentPeak === 0) {
    return samples;
  }
  const scale = peak / currentPeak;
  return samples.map((sample) => sample * scale);
}

function seededNoise() {
  let state = 0x1f2e3d4c;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return (state / 0xffffffff) * 2 - 1;
  };
}

function bubblePop(duration = 0.145) {
  const length = Math.floor(SAMPLE_RATE * duration);
  let phase = 0;
  const samples = Array.from({ length }, (_, index) => {
    const time = index / SAMPLE_RATE;
    const progress = time / duration;
    const frequency = 430 + 760 * progress * progress;
    phase += (2 * Math.PI * frequency) / SAMPLE_RATE;
    const body = Math.sin(phase) + 0.22 * Math.sin(phase * 0.5);
    return body * fadeEnvelope(time, duration, 0.0045, 0.052);
  });
  return normalize(samples, 0.42);
}

function softClick(duration = 0.065) {
  const length = Math.floor(SAMPLE_RATE * duration);
  const noise = seededNoise();
  let smoothedNoise = 0;
  const samples = Array.from({ length }, (_, index) => {
    const time = index / SAMPLE_RATE;
    smoothedNoise = smoothedNoise * 0.72 + noise() * 0.28;
    const tone = Math.sin(2 * Math.PI * 980 * time);
    const body = smoothedNoise * 0.62 + tone * 0.38;
    return body * fadeEnvelope(time, duration, 0.0025, 0.014);
  });
  return normalize(samples, 0.3);
}

function woodTap(duration = 0.12) {
  const length = Math.floor(SAMPLE_RATE * duration);
  const samples = Array.from({ length }, (_, index) => {
    const time = index / SAMPLE_RATE;
    const body =
      Math.sin(2 * Math.PI * 310 * time) +
      0.48 * Math.sin(2 * Math.PI * 655 * time) +
      0.16 * Math.sin(2 * Math.PI * 1120 * time);
    return body * fadeEnvelope(time, duration, 0.0035, 0.028);
  });
  return normalize(samples, 0.38);
}

function wavBuffer(samples) {
  const buffer = Buffer.alloc(44 + samples.length * 2);
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + samples.length * 2, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(SAMPLE_RATE, 24);
  buffer.writeUInt32LE(SAMPLE_RATE * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(samples.length * 2, 40);
  samples.forEach((sample, index) => {
    const clamped = Math.max(-1, Math.min(1, sample));
    buffer.writeInt16LE(Math.round(clamped * 0x7fff), 44 + index * 2);
  });
  return buffer;
}

mkdirSync(OUTPUT_DIR, { recursive: true });
for (const [name, samples] of [
  ["task-bubble-pop.wav", bubblePop()],
  ["task-soft-click.wav", softClick()],
  ["task-wood-tap.wav", woodTap()],
]) {
  writeFileSync(resolve(OUTPUT_DIR, name), wavBuffer(samples));
}
