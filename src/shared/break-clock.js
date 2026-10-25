export const DEFAULT_BREAK_INTERVAL_MINUTES = 30;
export const BREAK_TIMER_MODEL_VERSION = 1;
export const MIN_BREAK_INTERVAL_MINUTES = 1;
export const MAX_BREAK_INTERVAL_MINUTES = 240;
export const BREAK_SUGGESTION_MAX_LENGTH = 120;
export const MAX_CUSTOM_BREAK_SUGGESTIONS = 24;
export const DEFAULT_BREAK_SUGGESTION_SOURCE = "choose-for-me";

export const BUILT_IN_BREAK_SUGGESTIONS = Object.freeze([
  "Reach up high, then gently roll your shoulders.",
  "Take a few sips of water.",
  "Stand up and shake out your hands and feet.",
  "Look away from the screen and find three calming colors.",
  "Take ten slow steps and come back.",
  "Do a tiny victory dance.",
]);

function finiteNumber(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export function normalizeBreakInterval(value) {
  const number = finiteNumber(value);
  if (number === null) {
    return DEFAULT_BREAK_INTERVAL_MINUTES;
  }

  return Math.min(
    MAX_BREAK_INTERVAL_MINUTES,
    Math.max(MIN_BREAK_INTERVAL_MINUTES, Math.round(number))
  );
}

export function normalizeBreakSuggestionText(value) {
  return typeof value === "string"
    ? value.trim().slice(0, BREAK_SUGGESTION_MAX_LENGTH)
    : "";
}

export function normalizeBreakSuggestionSource(value) {
  return value === "custom" ? "custom" : DEFAULT_BREAK_SUGGESTION_SOURCE;
}

export function normalizeCustomBreakSuggestions(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  const seen = new Set();
  const normalized = [];
  for (const candidate of value) {
    const item = candidate && typeof candidate === "object" ? candidate : {};
    const id = typeof item.id === "string" ? item.id.trim().slice(0, 80) : "";
    const text = normalizeBreakSuggestionText(item.text);
    if (!id || !text || seen.has(id)) {
      continue;
    }
    seen.add(id);
    normalized.push({ id, text });
    if (normalized.length === MAX_CUSTOM_BREAK_SUGGESTIONS) {
      break;
    }
  }
  return normalized;
}

export function addCustomBreakSuggestion(
  suggestions,
  text,
  id = `break-${Date.now()}-${Math.random().toString(16).slice(2)}`
) {
  const current = normalizeCustomBreakSuggestions(suggestions);
  const nextText = normalizeBreakSuggestionText(text);
  const nextId = typeof id === "string" ? id.trim().slice(0, 80) : "";
  if (
    !nextText ||
    !nextId ||
    current.length >= MAX_CUSTOM_BREAK_SUGGESTIONS
  ) {
    return current;
  }

  return normalizeCustomBreakSuggestions([
    ...current,
    { id: nextId, text: nextText },
  ]);
}

export function removeCustomBreakSuggestion(suggestions, id) {
  return normalizeCustomBreakSuggestions(suggestions).filter(
    (item) => item.id !== id
  );
}

export function normalizeBreakClock(value) {
  const stored = value && typeof value === "object" ? value : {};
  const enabled = stored.enabled === true;
  const intervalMinutes = normalizeBreakInterval(stored.intervalMinutes);
  if (!enabled) {
    return {
      enabled: false,
      intervalMinutes,
      dueAt: null,
      pausedRemainingMs: null,
      revealedSuggestion: "",
    };
  }

  const dueAt = finiteNumber(stored.dueAt);
  const pausedRemaining = finiteNumber(stored.pausedRemainingMs);
  const pausedRemainingMs =
    pausedRemaining === null ? null : Math.max(0, Math.round(pausedRemaining));

  return {
    enabled: true,
    intervalMinutes,
    dueAt:
      pausedRemainingMs === null && dueAt !== null && dueAt > 0
        ? Math.round(dueAt)
        : null,
    pausedRemainingMs,
    revealedSuggestion: normalizeBreakSuggestionText(
      stored.revealedSuggestion
    ),
  };
}

export function breakIntervalMs(value) {
  return normalizeBreakInterval(value) * 60 * 1000;
}

export function enableBreakClock(clock, now = Date.now()) {
  const current = normalizeBreakClock(clock);
  return normalizeBreakClock({
    ...current,
    enabled: true,
    dueAt: now + breakIntervalMs(current.intervalMinutes),
    pausedRemainingMs: null,
    revealedSuggestion: "",
  });
}

export function disableBreakClock(clock) {
  return normalizeBreakClock({
    ...normalizeBreakClock(clock),
    enabled: false,
  });
}

export function changeBreakInterval(clock, intervalMinutes, now = Date.now()) {
  const current = normalizeBreakClock(clock);
  const interval = normalizeBreakInterval(intervalMinutes);
  if (!current.enabled) {
    return normalizeBreakClock({ ...current, intervalMinutes: interval });
  }

  if (current.pausedRemainingMs !== null) {
    return normalizeBreakClock({
      ...current,
      intervalMinutes: interval,
      pausedRemainingMs: breakIntervalMs(interval),
      revealedSuggestion: "",
    });
  }

  return normalizeBreakClock({
    ...current,
    intervalMinutes: interval,
    dueAt: now + breakIntervalMs(interval),
    revealedSuggestion: "",
  });
}

export function pauseBreakClock(clock, now = Date.now()) {
  const current = normalizeBreakClock(clock);
  if (!current.enabled || current.pausedRemainingMs !== null) {
    return current;
  }

  return normalizeBreakClock({
    ...current,
    dueAt: null,
    pausedRemainingMs: Math.max(0, (current.dueAt ?? now) - now),
  });
}

export function resumeBreakClock(clock, now = Date.now()) {
  const current = normalizeBreakClock(clock);
  if (!current.enabled || current.pausedRemainingMs === null) {
    return current;
  }

  return normalizeBreakClock({
    ...current,
    dueAt: now + current.pausedRemainingMs,
    pausedRemainingMs: null,
  });
}

export function breakClockStatus(clock, now = Date.now()) {
  const current = normalizeBreakClock(clock);
  if (!current.enabled) {
    return { phase: "off", remainingMs: null, clock: current };
  }
  if (current.pausedRemainingMs !== null) {
    return {
      phase: "paused",
      remainingMs: current.pausedRemainingMs,
      clock: current,
    };
  }

  const remainingMs = Math.max(0, (current.dueAt ?? now) - now);
  return {
    phase: remainingMs === 0 ? "due" : "running",
    remainingMs,
    clock: current,
  };
}

export function formatBreakClockStatus(clock, now = Date.now()) {
  const status = breakClockStatus(clock, now);
  if (status.phase === "off") {
    return "Break clock is off.";
  }
  if (status.phase === "paused") {
    return "Break clock paused with this session.";
  }
  if (status.phase === "due") {
    return "Break time is ready.";
  }

  const minutes = Math.max(1, Math.ceil(status.remainingMs / 60000));
  return `Next break in about ${minutes} ${minutes === 1 ? "minute" : "minutes"}.`;
}

export function revealBreakSuggestion(
  clock,
  customSuggestions = [],
  suggestionSource = DEFAULT_BREAK_SUGGESTION_SOURCE,
  random = Math.random,
  now = Date.now()
) {
  const current = normalizeBreakClock(clock);
  if (breakClockStatus(current, now).phase !== "due") {
    return current;
  }
  if (current.revealedSuggestion) {
    return current;
  }

  const source = normalizeBreakSuggestionSource(suggestionSource);
  const customPool = normalizeCustomBreakSuggestions(customSuggestions).map(
    (item) => item.text
  );
  const pool =
    source === "custom" ? customPool : BUILT_IN_BREAK_SUGGESTIONS;
  if (pool.length === 0) {
    return current;
  }
  const index = Math.min(
    pool.length - 1,
    Math.max(0, Math.floor(random() * pool.length))
  );
  return normalizeBreakClock({
    ...current,
    revealedSuggestion: pool[index] ?? BUILT_IN_BREAK_SUGGESTIONS[0],
  });
}

export function dismissBreak(clock, now = Date.now()) {
  const current = normalizeBreakClock(clock);
  if (!current.enabled) {
    return current;
  }
  return normalizeBreakClock({
    ...current,
    dueAt: now + breakIntervalMs(current.intervalMinutes),
    pausedRemainingMs: null,
    revealedSuggestion: "",
  });
}

export function normalizeBreakTimerModel(value) {
  const stored =
    value &&
    typeof value === "object" &&
    value.version === BREAK_TIMER_MODEL_VERSION
      ? value
      : {};

  return {
    version: BREAK_TIMER_MODEL_VERSION,
    clock: normalizeBreakClock(stored.clock),
    suggestionSource: normalizeBreakSuggestionSource(stored.suggestionSource),
    customSuggestions: normalizeCustomBreakSuggestions(
      stored.customSuggestions
    ),
  };
}

export function withBreakClock(model, clock) {
  return normalizeBreakTimerModel({
    ...normalizeBreakTimerModel(model),
    clock,
  });
}

export function withBreakSuggestions(model, customSuggestions) {
  return normalizeBreakTimerModel({
    ...normalizeBreakTimerModel(model),
    customSuggestions,
  });
}

export function withBreakSuggestionSource(model, suggestionSource) {
  return normalizeBreakTimerModel({
    ...normalizeBreakTimerModel(model),
    suggestionSource,
  });
}

export function serializeBreakTimerModel(model) {
  return JSON.stringify(normalizeBreakTimerModel(model));
}

export function deserializeBreakTimerModel(serialized) {
  if (typeof serialized !== "string") {
    return normalizeBreakTimerModel();
  }

  try {
    return normalizeBreakTimerModel(JSON.parse(serialized));
  } catch {
    return normalizeBreakTimerModel();
  }
}

export function breakClockAlarmDelay(clock, now = Date.now()) {
  const status = breakClockStatus(clock, now);
  if (status.phase === "due") {
    return 0;
  }
  return status.phase === "running" ? status.remainingMs : null;
}
