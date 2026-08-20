import { addTask, deleteTask, reorderTasks, toggleTask } from "./tasks.js";
import { loadTasks, onTasksChanged, saveTasks } from "./task-store.js";

export async function mountTaskList(root) {
  let tasks = [];
  let draggedId = null;

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
    </form>
    <ul class="task-list" role="list"></ul>
    <p class="empty-state">No tasks yet. Add one to get started.</p>
  `;

  const form = root.querySelector(".task-form");
  const input = root.querySelector(".task-input");
  const list = root.querySelector(".task-list");
  const emptyState = root.querySelector(".empty-state");

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
      item.className = `task-item${task.completed ? " is-complete" : ""}`;
      item.dataset.id = task.id;
      item.draggable = true;

      item.innerHTML = `
        <span class="drag-handle" aria-hidden="true">⋮⋮</span>
        <label class="task-label">
          <input class="task-checkbox" type="checkbox" ${task.completed ? "checked" : ""} />
          <span class="task-text"></span>
        </label>
        <button class="icon-button move-up" type="button" aria-label="Move task up" ${index === 0 ? "disabled" : ""}>↑</button>
        <button class="icon-button move-down" type="button" aria-label="Move task down" ${index === tasks.length - 1 ? "disabled" : ""}>↓</button>
        <button class="icon-button delete-button" type="button" aria-label="Delete task">×</button>
      `;

      item.querySelector(".task-text").textContent = task.text;
      list.append(item);
    });
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const next = addTask(tasks, input.value);
    if (next === tasks) {
      return;
    }

    input.value = "";
    input.focus();
    await persist(next);
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
      await persist(deleteTask(tasks, item.dataset.id));
      return;
    }

    if (event.target.closest(".move-up")) {
      await persist(reorderTasks(tasks, fromIndex, fromIndex - 1));
      return;
    }

    if (event.target.closest(".move-down")) {
      await persist(reorderTasks(tasks, fromIndex, fromIndex + 1));
    }
  });

  list.addEventListener("dragstart", (event) => {
    const item = event.target.closest(".task-item");
    if (!item) {
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

  tasks = await loadTasks();
  render();
  input.focus();
}
