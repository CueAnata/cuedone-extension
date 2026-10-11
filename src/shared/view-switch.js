export function nextViewAction(_currentView, requestedView) {
  if (requestedView !== "top" && requestedView !== "side") {
    return null;
  }

  return requestedView;
}

export function wireViewSwitch(root, { currentView, onTop, onSide }) {
  const buttons = root.querySelectorAll("[data-view]");

  for (const button of buttons) {
    const isCurrent = button.dataset.view === currentView;
    button.classList.toggle("is-current", isCurrent);
    button.setAttribute("aria-pressed", String(isCurrent));

    button.addEventListener("click", async () => {
      const action = nextViewAction(currentView, button.dataset.view);
      try {
        if (action === "top") {
          await onTop();
        } else if (action === "side") {
          await onSide();
        }
      } catch {
        const alert = document.querySelector(".personal-list-error");
        if (alert) {
          alert.textContent = "CueDone could not switch views. Please try again.";
          alert.hidden = false;
        }
      }
    });
  }
}
