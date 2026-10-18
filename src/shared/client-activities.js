// Small original local SVG pictograms. Visible text labels carry the meaning.
export const CLIENT_ACTIVITIES = Object.freeze([
  { id: "listening", label: "Listening", path: "M8 16c-1-2-3-3-3-6a7 7 0 0 1 14 0c0 4-4 4-4 7a4 4 0 0 1-8 0M9 10a3 3 0 0 1 6 0c0 2-3 2-3 4" },
  { id: "answering-questions", label: "Answering Questions", path: "M5 4h14v12H9l-4 4V4m5 4a2 2 0 1 1 3 2c-1 0-1 1-1 2m0 2h.01" },
  { id: "story", label: "Story", path: "M12 5v15M3 4c4-1 7 0 9 1 2-1 5-2 9-1v15c-4-1-7 0-9 1-2-1-5-2-9-1V4" },
  { id: "music", label: "Music", path: "M9 17V5l11-2v12M9 9l11-2M9 17c0 2-5 3-5 0s5-3 5 0m11-2c0 2-5 3-5 0s5-3 5 0" },
  { id: "work-activity", label: "Work Activity", path: "M4 7h16v13H4V7m4 0V4h8v3M4 12h16m-9 0v3h2v-3" },
  { id: "movement", label: "Movement", path: "M14 4a1.5 1.5 0 1 0 3 0 1.5 1.5 0 1 0-3 0M14 8l-4 4 4 3-3 6m3-13 3 4h4m-10-1-4-2-4 3m11 3 4 5" },
  { id: "sensory", label: "Sensory", path: "M6 15v-4a1 1 0 0 1 2 0v3-8a1 1 0 0 1 2 0v7-9a1 1 0 0 1 2 0v9-7a1 1 0 0 1 2 0v8l2-3c1-2 4-1 2 2l-3 6c-2 3-7 3-9-1l-3-4c-1-2 1-3 3 1" },
  { id: "play-time", label: "Play", path: "M3 12h9v9H3v-9m10 2h8v7h-8v-7M8 3l5 8H3l5-8m7 4a3 3 0 1 0 6 0 3 3 0 1 0-6 0" },
  { id: "chat-talk", label: "Chat/Talk", path: "M3 4h15v10H9l-6 5V4m17 4h2v13l-5-4h-5m-6-9h9m-9 3h6" },
  { id: "practice", label: "Practice", path: "M20 9a8 8 0 0 0-14-4L3 8m0-5v5h5m-4 7a8 8 0 0 0 14 4l3-3m0 5v-5h-5" },
  { id: "computer", label: "Computer", path: "M3 3h18v13H3V3m9 13v5m-5 0h10M5 13h14" },
  { id: "greetings", label: "Greetings", path: "M4 14V8m3 7V4m3 11V3m3 12V5m0 9 3-3c2-2 4 0 2 2l-4 7H8l-4-6M18 3l2-1m-2 5h3" },
  { id: "goodbye", label: "Goodbye", path: "M3 3h11v18H3V3m8 9h.01M16 8l5 4-5 4m-2-4h7" },
  { id: "reward", label: "Reward", path: "m12 2 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1 3-6" },
]);

// Keep previously saved choices readable without offering them in new pickers.
const LEGACY_CLIENT_ACTIVITIES = [
  { id: "game-time", label: "Game Time", path: "M7 7h10c3 0 5 10 3 12-2 1-4-4-5-4H9c-1 0-3 5-5 4-2-2 0-12 3-12m0 3v5m-2-2h4m7-2h.01m2 3h.01" },
  { id: "free-choice", label: "Free Choice", path: "M3 3h7v7H3V3m11 0h7v7h-7V3M3 14h7v7H3v-7m11 3 2 3 5-6" },
];

export function clientActivity(value) {
  return [...CLIENT_ACTIVITIES, ...LEGACY_CLIENT_ACTIVITIES].find(activity => activity.id === value) ?? null;
}
export function clientActivityIconMarkup(value) {
  const activity = clientActivity(value);
  if (!activity) return "";
  return `<svg class="client-activity-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="${activity.path}" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" /></svg>`;
}
