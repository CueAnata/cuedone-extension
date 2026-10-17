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
    try {
      const data = await getLocal(['cuedone.personalPrivateTasks', 'cuedone.personalPublicTasks']);
      const isPublic = document.body.dataset.presentation === 'personal' && document.body.dataset.personalPresentation === 'public';
      // Clear the active list; also ensure both stores cleared when invoked from footer for privacy safety
      await setLocal({ tasks: [] });
      if (isPublic) {
        await setLocal({ 'cuedone.personalPublicTasks': [] });
      } else {
        await setLocal({ 'cuedone.personalPrivateTasks': [] });
      }
      // Also clear the other store if present to fully reset as spec footer expects
      try { await setLocal({ 'cuedone.personalPrivateTasks': [], 'cuedone.personalPublicTasks': [], tasks: [] }); } catch {}
    } catch {}
    try {
      const root = document.getElementById('app');
      if (root && typeof window.mountTaskList === 'function') {
        // Re-render via task-list's render path by triggering storage change; fallback direct
        root.dispatchEvent(new CustomEvent('clear-all'));
      }
    } catch {}
    if (window.renderActiveVisualProgress) {
      try { window.renderActiveVisualProgress(); } catch {}
    }
    // Ensure visual refresh even without task-list hook
    try { const ev = new Event('clearAll'); document.dispatchEvent(ev); } catch {}
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
