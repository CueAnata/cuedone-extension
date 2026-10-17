import { startPresentationMode } from "../shared/mode-switch.js";
import { wireViewSwitch } from "../shared/view-switch.js";
import {
  loadPreferredView,
  savePreferredView,
  shouldRestoreSideFromPopup,
} from "../shared/preferences.js";
import {
  closeSideView,
  getLocal,
  openSideView,
  setLocal,
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

const clearAllBtn = document.getElementById('clear-all-btn');
if (clearAllBtn) {
  clearAllBtn.addEventListener('click', async () => {
    await setLocal({ 
      tasks: [], 
      'cuedone.personalPrivateTasks': [], 
      'cuedone.personalPublicTasks': [] 
    });

    // Re-render the active view with the empty task list
    if (typeof window.mountTopView === 'function') {
      await window.mountTopView();
    } else if (typeof renderTaskList === 'function') {
      await renderTaskList([]);
    } else {
      // Dispatch storage-change notification so task-list controller redraws
      window.dispatchEvent(new Event('storage'));
      document.dispatchEvent(new CustomEvent('cuedone:tasks-changed', { detail: { tasks: [] } }));
    }

    if (window.renderActiveVisualProgress) {
      window.renderActiveVisualProgress();
    }
  });
}

const resetBtn = document.getElementById('reset-btn');
if (resetBtn) {
  resetBtn.addEventListener('click', () => {
    document.querySelector('.reset-list-button')?.click();
  });
}

const startNewListBtn = document.getElementById('start-new-list-btn');
if (startNewListBtn) {
  startNewListBtn.addEventListener('click', () => {
    document.querySelector('.new-list-toggle')?.click();
  });
}

function mountTopView() {
  (globalThis.mountTaskList || window.mountTaskList)(document.getElementById("app"));
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
