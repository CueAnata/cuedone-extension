import assert from "node:assert/strict";
import test from "node:test";
import {
  addTask,
  createTask,
  deleteTask,
  isTaskList,
  normalizeTaskText,
  reorderTasks,
  toggleTask,
} from "../src/shared/tasks.js";

test("normalizeTaskText trims and caps length", () => {
  assert.equal(normalizeTaskText("  Buy milk  "), "Buy milk");
  assert.equal(normalizeTaskText("x".repeat(250)).length, 200);
  assert.equal(normalizeTaskText(""), "");
  assert.equal(normalizeTaskText(null), "");
});

test("createTask builds a local task record", () => {
  const task = createTask("  Call Sam ", 1700000000000, "task-1");
  assert.deepEqual(task, {
    id: "task-1",
    text: "Call Sam",
    completed: false,
    createdAt: 1700000000000,
  });
});

test("createTask rejects empty text", () => {
  assert.throws(() => createTask("   "), /required/);
});

test("addTask appends a new task and ignores blanks", () => {
  const existing = [createTask("First", 1, "a")];
  const next = addTask(existing, " Second ", 2, "b");

  assert.equal(next.length, 2);
  assert.equal(next[1].id, "b");
  assert.equal(next[1].text, "Second");
  assert.equal(addTask(existing, "   "), existing);
});

test("toggleTask flips completed for the matching id", () => {
  const tasks = [createTask("One", 1, "a"), createTask("Two", 2, "b")];
  const toggled = toggleTask(tasks, "b");

  assert.equal(toggled[0].completed, false);
  assert.equal(toggled[1].completed, true);
  assert.equal(toggleTask(toggled, "b")[1].completed, false);
});

test("deleteTask removes only the matching task", () => {
  const tasks = [createTask("One", 1, "a"), createTask("Two", 2, "b")];
  const next = deleteTask(tasks, "a");

  assert.equal(next.length, 1);
  assert.equal(next[0].id, "b");
});

test("reorderTasks moves an item to a new index", () => {
  const tasks = [
    createTask("One", 1, "a"),
    createTask("Two", 2, "b"),
    createTask("Three", 3, "c"),
  ];

  assert.deepEqual(
    reorderTasks(tasks, 0, 2).map((task) => task.id),
    ["b", "c", "a"]
  );
  assert.equal(reorderTasks(tasks, 1, 1), tasks);
  assert.equal(reorderTasks(tasks, -1, 1), tasks);
  assert.equal(reorderTasks(tasks, 0, 99), tasks);
});

test("isTaskList validates persisted shape", () => {
  const valid = [createTask("One", 1, "a")];
  assert.equal(isTaskList(valid), true);
  assert.equal(isTaskList([]), true);
  assert.equal(isTaskList(null), false);
  assert.equal(isTaskList([{ id: "a" }]), false);
});
