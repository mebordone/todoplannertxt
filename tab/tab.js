/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const api = typeof browser !== "undefined" ? browser : chrome;

function showError(msg) {
  const el = document.getElementById("error");
  if (el) {
    el.textContent = msg || "";
    el.style.display = msg ? "block" : "none";
  }
}

function renderTask(item) {
  const div = document.createElement("div");
  div.className = "task" + (item.isCompleted ? " completed" : "");
  div.dataset.id = item.id;
  const cb = document.createElement("input");
  cb.type = "checkbox";
  cb.checked = !!item.isCompleted;
  cb.addEventListener("change", () => toggleTask(item));
  const title = document.createElement("span");
  title.className = "task-title";
  title.textContent = item.title || "";
  const meta = document.createElement("div");
  meta.className = "task-meta";
  const parts = [];
  if (item.priority) parts.push("Priority " + item.priority);
  if (item.dueDate) parts.push("Due: " + item.dueDate);
  if (item.categories && item.categories.length) parts.push(item.categories.join(", "));
  meta.textContent = parts.join(" · ");
  div.appendChild(cb);
  div.appendChild(title);
  if (parts.length) div.appendChild(meta);
  div.addEventListener("dblclick", () => editTask(item));
  return div;
}

async function loadItems() {
  const listEl = document.getElementById("list");
  listEl.innerHTML = "<div class=\"empty\">Loading…</div>";
  showError("");
  const res = await api.runtime.sendMessage({ command: "getItems", refresh: true });
  if (res && res.error) {
    listEl.innerHTML = "";
    showError(res.error);
    return;
  }
  const items = (res && res.items) || [];
  listEl.innerHTML = "";
  if (items.length === 0) {
    listEl.innerHTML = "<div class=\"empty\">No tasks. Configure todo.txt/done.txt in Options.</div>";
    return;
  }
  items.forEach((item) => listEl.appendChild(renderTask(item)));
}

async function toggleTask(item) {
  const newItem = { ...item, isCompleted: !item.isCompleted };
  const res = await api.runtime.sendMessage({ command: "modifyItem", oldItem: item, newItem });
  if (res && res.error) {
    showError(res.error);
    loadItems();
    return;
  }
  loadItems();
}

function editTask(item) {
  const title = prompt("Edit task:", item.title);
  if (title === null) return;
  const newItem = { ...item, title: title.trim() || item.title };
  api.runtime.sendMessage({ command: "modifyItem", oldItem: item, newItem }).then((res) => {
    if (res && res.error) showError(res.error);
    loadItems();
  });
}

function addTask() {
  const input = document.getElementById("new-task");
  if (!input) return;
  const raw = input.value;
  const title = raw && raw.trim();
  if (!title) return;
  api.runtime.sendMessage({ command: "addItem", item: { title, isCompleted: false } }).then((res) => {
    if (res && res.error) showError(res.error);
    else {
      input.value = "";
      loadItems();
    }
  });
}

document.getElementById("refresh").addEventListener("click", () => loadItems());
document.getElementById("add-task").addEventListener("click", addTask);
document.getElementById("new-task").addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    addTask();
  }
});
const actionApi = api.browserAction || api.action;
if (actionApi && typeof actionApi.openPopup === "function") {
  document.getElementById("quick-view").addEventListener("click", () => {
    actionApi.openPopup().catch(() => {});
  });
} else {
  const qv = document.getElementById("quick-view");
  if (qv) {
    qv.style.display = "none";
  }
  const hint = document.getElementById("toolbar-hint");
  if (hint) {
    hint.textContent = "The Todo.txt icon appears in the toolbar when you are on the Mail tab.";
  }
}

document.getElementById("open-options").addEventListener("click", (e) => {
  e.preventDefault();
  const url = api.runtime.getURL("options/options.html");
  if (api.tabs && api.tabs.create) {
    api.tabs.create({ url });
  } else {
    api.runtime.openOptionsPage?.();
  }
});

loadItems();
