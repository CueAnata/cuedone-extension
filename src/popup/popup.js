import { mountTaskList } from "../shared/task-list.js";
import { openSidePanel } from "../platform/browser.js";

const app = document.getElementById("app");
const openSidePanelButton = document.getElementById("open-side-panel");

mountTaskList(app);

openSidePanelButton.addEventListener("click", () => {
  openSidePanel();
});
