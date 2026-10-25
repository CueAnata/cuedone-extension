import { normalizeVisualTheme } from "./plant-theme.js";
import { createVisualThemeSelection, themeSelectionForList } from "./random-visual-theme.js";

export const CLIENT_VISUAL_PROGRESS_KEY = "cuedone.clientVisualProgress.v1";
export function normalizeClientVisualProgress(value) {
  return {version:1,enabled:value?.enabled === true,theme:normalizeVisualTheme(value?.theme),
    randomState:createVisualThemeSelection(Math.random,value?.randomState ?? {}).snapshot()};
}
export function clientVisualSettings(value, changes) {
  const next=normalizeClientVisualProgress({...normalizeClientVisualProgress(value),...changes});
  if(next.enabled && next.theme === "random") {
    const selection=createVisualThemeSelection(Math.random,next.randomState);
    selection.resolve("random");next.randomState=selection.snapshot();
  }
  return next;
}
export function clientVisualForList(value, previous, tasks, random = Math.random, options = {}) {
  const next=normalizeClientVisualProgress(value);
  if(next.enabled && next.theme === "random") next.randomState=themeSelectionForList(next.randomState,previous,tasks,"random",random,options);
  return next;
}
export function clientCompletionStyle(savedStyle, visualProgress) {
  // Progression owns the visuals; sound remains an independently gated cue.
  return visualProgress ? "celebrate" : savedStyle;
}
