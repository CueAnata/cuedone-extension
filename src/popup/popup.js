import { mountTaskList } from "../shared/task-list.js";
import { startPresentationMode } from "../shared/mode-switch.js";
import { wireViewSwitch } from "../shared/view-switch.js";
import {
  loadPreferredView,
  savePreferredView,
  shouldRestoreSideFromPopup,
} from "../shared/preferences.js";
import {
  closeSideView,
  openSideView,
  setToolbarPopup,
} from "../platform/browser.js";

const preferredView = await loadPreferredView();

if (shouldRestoreSideFromPopup(preferredView)) {
  try {
    await openSideView();
    await setToolbarPopup(false);
    window.close();
  } catch {
    mountTopView();
  }
} else {
  mountTopView();
}

function mountTopView() {
  mountTaskList(document.getElementById("app"));
  startPresentationMode(document.querySelector(".mode-switch"));

  wireViewSwitch(document.querySelector(".view-switch"), {
    currentView: "top",
    async onTop() {
      await savePreferredView("top");
      await setToolbarPopup(true);
      await closeSideView();
    },
    async onSide() {
      await savePreferredView("side");
      try {
        await openSideView();
        await setToolbarPopup(false);
        window.close();
      } catch {
        await setToolbarPopup(true);
      }
    },
  });
}
