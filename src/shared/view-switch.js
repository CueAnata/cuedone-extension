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

    button.addEventListener("click", () => {
      const action = nextViewAction(currentView, button.dataset.view);
      if (action === "top") {
        onTop();
      } else if (action === "side") {
        onSide();
      }
    });
  }
}
