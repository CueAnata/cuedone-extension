import { startPresentationMode } from "../shared/mode-switch.js";
import { wireViewSwitch } from "../shared/view-switch.js";
import { savePreferredView } from "../shared/preferences.js";
import {
  onCloseSideViewRequest,
  openTopView,
  setToolbarPopup,
} from "../platform/browser.js";

onCloseSideViewRequest(() => {
  window.close();
});

(globalThis.mountTaskList || window.mountTaskList)(document.getElementById("app"));
startPresentationMode(document.querySelector(".mode-switch"));

wireViewSwitch(document.querySelector(".view-switch"), {
  currentView: "side",
  async onTop() {
    await savePreferredView("top");
    try {
      await openTopView();
    } catch {
      // Popup is assigned; the next toolbar click opens Top.
    }
    window.close();
  },
  async onSide() {
    await savePreferredView("side");
    await setToolbarPopup(false);
  },
});
