import { normalizeVisualTheme, VISUAL_THEME_VALUES } from "./plant-theme.js";

export const RANDOM_VISUAL_THEME_VALUES = Object.freeze(
  VISUAL_THEME_VALUES.filter((value) => value !== "random" && value !== "zen-terrarium")
);

// One bag per working view. Reading the resolved theme never consumes a turn.
export function createVisualThemeSelection(random = Math.random, saved = {}) {
  const valid = (value) => RANDOM_VISUAL_THEME_VALUES.includes(value);
  let bag = Array.isArray(saved.bag) ? [...new Set(saved.bag.filter(valid))] : [];
  let last = valid(saved.last) ? saved.last : null;
  let active = valid(saved.active) ? saved.active : null;
  function draw() {
    if (bag.length === 0) {
      bag = [...RANDOM_VISUAL_THEME_VALUES];
      for (let i = bag.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [bag[i], bag[j]] = [bag[j], bag[i]];
      }
      // Consume from the end; keep the next bag's first draw different.
      const end = bag.length - 1;
      if (bag.length > 1 && bag[end] === last) {
        [bag[0], bag[end]] = [bag[end], bag[0]];
      }
    }
    active = last = bag.pop();
    return active;
  }
  return {
    snapshot() { return { active, last, bag: [...bag], pendingNextList: saved.pendingNextList === true }; },
    resolve(preference) {
      const choice = normalizeVisualTheme(preference);
      return choice === "random" ? (active ?? draw()) : choice;
    },
    next(preference) {
      const choice = normalizeVisualTheme(preference);
      return choice === "random" ? draw() : choice;
    },
  };
}


export function themeSelectionForList(saved, previousTasks, nextTasks, preference, random = Math.random, { reset = false } = {}) {
  if (normalizeVisualTheme(preference) !== "random") return saved;
  const selection = createVisualThemeSelection(random, saved ?? {});
  selection.resolve("random");
  const previousComplete = previousTasks.length > 0 && previousTasks.every(task => task.completed === true);
  const previousIds = new Set(previousTasks.map(task => task.id));
  const newTask = nextTasks.some(task => !previousIds.has(task.id));
  const replacedCompletedList = previousComplete && (newTask || nextTasks.length === 0);
  let pending = saved?.pendingNextList === true || replacedCompletedList || (reset && nextTasks.length > 0);
  if (pending && nextTasks.length > 0) {
    selection.next("random");
    pending = false;
  }
  return { ...selection.snapshot(), pendingNextList: pending };
}
