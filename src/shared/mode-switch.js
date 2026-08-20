import {
  loadPresentationMode,
  normalizePresentationMode,
  onPresentationModeChanged,
  savePresentationMode,
} from "./preferences.js";

export function nextModeAction(requestedMode) {
  if (requestedMode !== "personal" && requestedMode !== "client") {
    return null;
  }

  return requestedMode;
}

export function applyPresentationMode(mode, root = document.body) {
  root.dataset.presentation = normalizePresentationMode(mode);
}

export function wireModeSwitch(root, { currentMode, onPersonal, onClient }) {
  const buttons = root.querySelectorAll("[data-mode]");

  function paint(mode) {
    const current = normalizePresentationMode(mode);
    for (const button of buttons) {
      const isCurrent = button.dataset.mode === current;
      button.classList.toggle("is-current", isCurrent);
      button.setAttribute("aria-pressed", String(isCurrent));
    }
  }

  paint(currentMode);

  for (const button of buttons) {
    button.addEventListener("click", () => {
      const action = nextModeAction(button.dataset.mode);
      if (action === "personal") {
        onPersonal();
      } else if (action === "client") {
        onClient();
      }
    });
  }

  return { paint };
}

export async function startPresentationMode(switchRoot) {
  const mode = await loadPresentationMode();
  applyPresentationMode(mode);
  const { paint } = wireModeSwitch(switchRoot, {
    currentMode: mode,
    async onPersonal() {
      applyPresentationMode("personal");
      paint("personal");
      await savePresentationMode("personal");
    },
    async onClient() {
      applyPresentationMode("client");
      paint("client");
      await savePresentationMode("client");
    },
  });

  onPresentationModeChanged((next) => {
    applyPresentationMode(next);
    paint(next);
  });
}
