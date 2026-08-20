import { mountTaskList } from "../shared/task-list.js";

const app = document.getElementById("app");
const openSidePanelButton = document.getElementById("open-side-panel");

mountTaskList(app);

openSidePanelButton.addEventListener("click", async () => {
  const currentWindow = await chrome.windows.getCurrent();
  await chrome.sidePanel.open({ windowId: currentWindow.id });
});
