import { addTask, deleteTask, reorderTasks, toggleTask } from "./tasks.js";
import {
  loadTaskEntryOpen,
  onTaskEntryOpenChanged,
  saveTaskEntryOpen,
  taskEntryVisibility,
} from "./preferences.js";
import { loadTasks, onTasksChanged, saveTasks } from "./task-store.js";

export async function mountTaskList(root) {
  let tasks = [];
  let draggedId = null;
  let restoreFocus = null;
  let entryOpen = true;

  root.innerHTML = `
    <form class="task-form">
      <label class="sr-only" for="new-task">New task</label>
      <input
        id="new-task"
        class="task-input"
        type="text"
        maxlength="200"
        placeholder="Add a task"
        autocomplete="off"
      />
      <button class="add-button" type="submit">Add</button>
      <button class="done-button" type="button">Done</button>
    </form>
    <button class="add-task-toggle" type="button" hidden>+ Add task</button>
    <ul class="task-list" aria-label="Tasks"></ul>
    <p class="empty-state">No tasks yet. Add one to get started.</p>
  `;

  const form = root.querySelector(".task-form");
  const input = root.querySelector(".task-input");
  const doneButton = root.querySelector(".done-button");
  const addToggle = root.querySelector(".add-task-toggle");
  const list = root.querySelector(".task-list");
  const emptyState = root.querySelector(".empty-state");

  function applyEntryMode(isOpen) {
    const visibility = taskEntryVisibility(isOpen);
    entryOpen = visibility.showEntryForm;
    root.dataset.entryMode = visibility.showEntryForm ? "entry" : "work";
    root.classList.toggle("is-entry-collapsed", visibility.showAddTaskToggle);
    form.hidden = !visibility.showEntryForm;
    addToggle.hidden = !visibility.showAddTaskToggle;
    form.style.display = visibility.showEntryForm ? "flex" : "none";
    addToggle.style.display = visibility.showAddTaskToggle
      ? "inline-flex"
      : "none";
  }

  async function persist(nextTasks) {
    tasks = nextTasks;
    render();
    await saveTasks(tasks);
  }

  function render() {
    emptyState.hidden = tasks.length > 0;
    list.replaceChildren();

    tasks.forEach((task, index) => {
      const item = document.createElement("li");
      const checkboxId = `task-${task.id.replace(/[^a-zA-Z0-9_-]/g, "")}`;
      item.className = `task-item${task.completed ? " is-complete" : ""}`;
      item.dataset.id = task.id;

      item.innerHTML = `
        <span class="drag-handle" draggable="true" title="Drag to reorder" aria-label="Drag to reorder">⋮⋮</span>
        <label class="task-label" for="${checkboxId}">
          <input
            id="${checkboxId}"
            class="task-checkbox"
            type="checkbox"
            ${task.completed ? "checked" : ""}
          />
          <span class="task-text"></span>
        </label>
        <div class="task-actions">
          <button class="icon-button move-up" type="button" aria-label="Move task up" ${index === 0 ? "disabled" : ""}>↑</button>
          <button class="icon-button move-down" type="button" aria-label="Move task down" ${index === tasks.length - 1 ? "disabled" : ""}>↓</button>
          <button class="icon-button delete-button" type="button" aria-label="Delete task">×</button>
        </div>
      `;

      item.querySelector(".task-text").textContent = task.text;
      list.append(item);
    });

    if (!restoreFocus) {
      return;
    }

    const targetItem = list.querySelector(`[data-id="${restoreFocus.id}"]`);
    const target = targetItem?.querySelector(restoreFocus.selector);
    target?.focus();
    restoreFocus = null;
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const next = addTask(tasks, input.value);
    if (next === tasks) {
      return;
    }

    input.value = "";
    restoreFocus = null;
    await persist(next);
    input.focus();
  });

  doneButton.addEventListener("click", async () => {
    applyEntryMode(false);
    await saveTaskEntryOpen(false);
    addToggle.focus();
  });

  addToggle.addEventListener("click", async () => {
    applyEntryMode(true);
    await saveTaskEntryOpen(true);
    input.focus();
  });

  list.addEventListener("change", async (event) => {
    const checkbox = event.target.closest(".task-checkbox");
    if (!checkbox) {
      return;
    }

    const id = event.target.closest(".task-item")?.dataset.id;
    if (!id) {
      return;
    }

    restoreFocus = { id, selector: ".task-checkbox" };
    await persist(toggleTask(tasks, id));
  });

  list.addEventListener("click", async (event) => {
    const item = event.target.closest(".task-item");
    if (!item) {
      return;
    }

    const fromIndex = tasks.findIndex((task) => task.id === item.dataset.id);
    if (fromIndex === -1) {
      return;
    }

    if (event.target.closest(".delete-button")) {
      restoreFocus = null;
      await persist(deleteTask(tasks, item.dataset.id));
      (entryOpen ? input : addToggle).focus();
      return;
    }

    if (event.target.closest(".move-up")) {
      restoreFocus = { id: item.dataset.id, selector: ".move-up" };
      await persist(reorderTasks(tasks, fromIndex, fromIndex - 1));
      return;
    }

    if (event.target.closest(".move-down")) {
      restoreFocus = { id: item.dataset.id, selector: ".move-down" };
      await persist(reorderTasks(tasks, fromIndex, fromIndex + 1));
    }
  });

  list.addEventListener("dragstart", (event) => {
    const handle = event.target.closest(".drag-handle");
    const item = event.target.closest(".task-item");
    if (!handle || !item) {
      event.preventDefault();
      return;
    }

    draggedId = item.dataset.id;
    item.classList.add("is-dragging");
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", draggedId);
  });

  list.addEventListener("dragend", (event) => {
    event.target.closest(".task-item")?.classList.remove("is-dragging");
    draggedId = null;
  });

  list.addEventListener("dragover", (event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  });

  list.addEventListener("drop", async (event) => {
    event.preventDefault();
    const target = event.target.closest(".task-item");
    if (!target || !draggedId) {
      return;
    }

    const fromIndex = tasks.findIndex((task) => task.id === draggedId);
    const toIndex = tasks.findIndex((task) => task.id === target.dataset.id);
    draggedId = null;

    if (fromIndex === -1 || toIndex === -1) {
      return;
    }

    await persist(reorderTasks(tasks, fromIndex, toIndex));
  });

  onTasksChanged((nextTasks) => {
    tasks = nextTasks;
    render();
  });

  onTaskEntryOpenChanged((isOpen) => {
    applyEntryMode(isOpen);
  });

  applyEntryMode(true);
  tasks = await loadTasks();
  applyEntryMode(await loadTaskEntryOpen());
  render();
  if (entryOpen) {
    input.focus();
  }
}
