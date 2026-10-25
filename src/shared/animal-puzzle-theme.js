import { normalizeProgress } from "./progress.js";
import {
  KITE_STAGE_COUNT as ANIMAL_PUZZLE_STAGE_COUNT,
  kiteStageFromProgress as animalPuzzleStageFromProgress,
  kiteStageForTasks as animalPuzzleStageForTasks,
  kiteStageLabel as animalPuzzleStageLabel,
  formatKiteAccessibleText as formatAnimalPuzzleAccessibleText,
  describeKiteStage as describeAnimalPuzzleStage,
} from "./kite-theme.js";

export {
  ANIMAL_PUZZLE_STAGE_COUNT,
  animalPuzzleStageFromProgress,
  animalPuzzleStageForTasks,
  animalPuzzleStageLabel,
  formatAnimalPuzzleAccessibleText,
  describeAnimalPuzzleStage,
};
