// Small original local SVG pictograms. Visible text labels carry the meaning.
export const CLIENT_ACTIVITIES = Object.freeze([
  { id: "listening", label: "Listening", path: "M8 16c-1-2-3-3-3-6a7 7 0 0 1 14 0c0 4-4 4-4 7a4 4 0 0 1-8 0M9 10a3 3 0 0 1 6 0c0 2-3 2-3 4" },
  { id: "answering-questions", label: "Answering Questions", path: "M5 4h14v12H9l-4 4V4m5 4a2 2 0 1 1 3 2c-1 0-1 1-1 2m0 2h.01" },
  { id: "story", label: "Story", path: "M12 5v15M3 4c4-1 7 0 9 1 2-1 5-2 9-1v15c-4-1-7 0-9 1-2-1-5-2-9-1V4" },
  { id: "music", label: "Music", path: "M9 17V5l11-2v12M9 9l11-2M9 17c0 2-5 3-5 0s5-3 5 0m11-2c0 2-5 3-5 0s5-3 5 0" },
  { id: "work-activity", label: "Work Activity", path: "M4 7h16v13H4V7m4 0V4h8v3M4 12h16m-9 0v3h2v-3" },
  { id: "movement", label: "Movement", path: "M14 4a1.5 1.5 0 1 0 3 0 1.5 1.5 0 1 0-3 0M14 8l-4 4 4 3-3 6m3-13 3 4h4m-10-1-4-2-4 3m11 3 4 5" },
  { id: "sensory", label: "Sensory", path: "M6 15v-4a1 1 0 0 1 2 0v3-8a1 1 0 0 1 2 0v7-9a1 1 0 0 1 2 0v9-7a1 1 0 0 1 2 0v8l2-3c1-2 4-1 2 2l-3 6c-2 3-7 3-9-1l-3-4c-1-2 1-3 3 1" },
  { id: "play-time", label: "Structured Play", path: "M3 12h9v9H3v-9m10 2h8v7h-8v-7M8 3l5 8H3l5-8m7 4a3 3 0 1 0 6 0 3 3 0 1 0-6 0" },
  { id: "chat-talk", label: "Chat/Talk", path: "M3 4h15v10H9l-6 5V4m17 4h2v13l-5-4h-5m-6-9h9m-9 3h6" },
  { id: "practice", label: "Practice", path: "M20 9a8 8 0 0 0-14-4L3 8m0-5v5h5m-4 7a8 8 0 0 0 14 4l3-3m0 5v-5h-5" },
  { id: "computer", label: "Computer", path: "M3 3h18v13H3V3m9 13v5m-5 0h10M5 13h14" },
  { id: "greetings", label: "Greetings", path: "M4 14V8m3 7V4m3 11V3m3 12V5m0 9 3-3c2-2 4 0 2 2l-4 7H8l-4-6M18 3l2-1m-2 5h3" },
  { id: "goodbye", label: "Goodbye", path: "M3 3h11v18H3V3m8 9h.01M16 8l5 4-5 4m-2-4h7" },
  { id: "reward", label: "Reward", path: "m12 2 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1 3-6" },
  { id: "reading", label: "Reading", path: "M12 5v15M3 4c4-1 7 0 9 1 2-1 5-2 9-1v15c-4-1-7 0-9 1-2-1-5-2-9-1V4m3 4 3 1m6 0 3-1M6 12l3 1m6 0 3-1" },
  { id: "worksheet", label: "Worksheet", path: "M5 2h14v20H5V2m3 5h8m-8 4h8m-8 4h5m-5 4h8" },
  { id: "flash-cards", label: "Flash Cards", path: "M3 7h14v14H3V7m4-4h14v14M6 12h8m-8 4h5" },
  { id: "free-play", label: "Free Play", path: "M3 13h8v8H3v-8m10-1h8v9h-8v-9M8 3l5 8H3l5-8m8 1h5v5h-5V4" },
  { id: "writing", label: "Writing", path: "m4 16 12-12 4 4L8 20l-5 1 1-5m10-10 4 4M3 23h18" },
  { id: "math", label: "Math", path: "M3 3h18v18H3V3m3 5h5M8 6v5m6-3h4M6 15l4 4m0-4-4 4m8-3h4m-4 3h4" },
  { id: "speech", label: "Speech", path: "M3 4h15v12H9l-6 5V4m4 4v4m3-6v8m3-6v4m8-6v8" },
  { id: "ot", label: "OT", path: "M3 14h7v7H3v-7m11-3h7v10h-7V11M7 3l4 8H3l4-8m10 0v5m-2-3h4" },
  { id: "pt", label: "PT", path: "M12 3a2 2 0 1 0 0 4 2 2 0 1 0 0-4m0 5v7m-7-5 7 2 7-2m-7 5-5 7m5-7 5 7" },
  { id: "outside-play", label: "Outside Play", path: "M3 21h18M7 20v-7m0-10-5 10h10L7 3m9 12 4 6m-4-6-4 6m4-6v-5m-3 3 3-3 4 3M17 3h.01" },
  { id: "special-activity", label: "Special Activity", path: "m12 2 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1 3-6M2 2v3m-1-2h3m17 15v4m-2-2h4" },

  { id: "quiz", label: "Quiz", path: "M5 3h14v18H5V3m4 4a3 3 0 1 1 4 3c-1 0-1 1-1 3m0 3h.01m-4 3h8" },
  { id: "art", label: "Art", path: "M12 3a9 9 0 1 0 0 18h2c2 0 2-3 0-3h-1c-2 0-2-3 0-3h4c6 0 4-12-5-12M7 8h.01m5-2h.01m5 3h.01M5 13h.01m3 4h.01" },
  { id: "puzzles", label: "Puzzles", path: "M3 4h6c-2 4 6 4 4 0h7v6c-4-2-4 6 0 4v7h-7c2-4-6-4-4 0H3v-7c4 2 4-6 0-4V4" },
  { id: "daily-living", label: "Daily Living", path: "m2 11 10-9 10 9M5 9v12h14V9m-10 12v-8h6v8M8 7h.01" },

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

export const CLIENT_ACTIVITY_GROUPS = Object.freeze([
  {label:"Communication & Language", ids:["listening","chat-talk","answering-questions","greetings","goodbye","story","reading","speech","quiz"]},
  {label:"Regulation & Breaks", ids:["movement","sensory","music","ot","pt","outside-play"]},
  {label:"Core Activities", ids:["work-activity","practice","play-time","free-play","computer","worksheet","flash-cards","writing","math","art","puzzles","daily-living"]},
  {label:"Motivation & Personalization", ids:["reward","special-activity",""]},
]);
export const GROUPED_CLIENT_ACTIVITIES = CLIENT_ACTIVITY_GROUPS.flatMap(group => [
  {heading:group.label}, ...group.ids.map(id=>id ? clientActivity(id) : {id:"",label:"Custom"}),
]);
